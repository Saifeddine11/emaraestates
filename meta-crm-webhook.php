<?php
declare(strict_types=1);

/* =============================================================================
   EMARA ESTATES — HubSpot → Meta Conversions API (qualification events)

   POST /meta-crm-webhook.php

   Two authentication modes, strictly separate — a request must match exactly
   one of them, and each mode only accepts its own body shape:

   1. HubSpot (primary). A HubSpot app webhook subscription delivering a JSON
      array of events. Verified with the app's client secret
      (HUBSPOT_CLIENT_SECRET): signature v3 (X-HubSpot-Signature-v3 +
      X-HubSpot-Request-Timestamp, 5-minute window) whenever HubSpot sends it,
      otherwise signature v1 (X-HubSpot-Signature + X-HubSpot-Signature-Version: v1).

   2. Zapier (fallback only). Body exactly `{"contactId": "123"}`, header
      X-Emara-Webhook-Secret equal to META_CRM_ZAPIER_SECRET. Never accepted
      for a HubSpot-shaped batch, and never combined with HubSpot headers.

   The payload only says WHICH contacts changed. Their state — property
   history included — is always re-read from HubSpot, so a forged or replayed
   payload cannot invent a qualification, and retries derive the same event
   IDs. Rules live in meta-private/meta-capi.php.

   Responds 500 only when a retry could help (HubSpot and Zapier both retry).
   ============================================================================= */

require __DIR__ . '/meta-private/meta-capi.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const WEBHOOK_MAX_BODY_BYTES = 262144;

function webhookRespond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

$env = metaLoadEnv(__DIR__ . '/.env');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    webhookRespond(405, ['ok' => false]);
}

$raw = file_get_contents('php://input', false, null, 0, WEBHOOK_MAX_BODY_BYTES + 1);
if ($raw === false || strlen($raw) > WEBHOOK_MAX_BODY_BYTES) {
    webhookRespond(400, ['ok' => false]);
}

$hasHubspotHeaders = isset($_SERVER['HTTP_X_HUBSPOT_SIGNATURE_V3']) || isset($_SERVER['HTTP_X_HUBSPOT_SIGNATURE']);
$hasZapierHeader = isset($_SERVER['HTTP_X_EMARA_WEBHOOK_SECRET']);
if ($hasHubspotHeaders === $hasZapierHeader) {
    // Neither, or both: never guess which mode was meant.
    metaLog(['stage' => 'webhook', 'success' => false, 'error' => 'unauthorized (ambiguous or missing credentials)']);
    webhookRespond(401, ['ok' => false]);
}

$data = json_decode($raw ?: 'null', true);

if ($hasHubspotHeaders) {
    $clientSecret = metaEnv($env, 'HUBSPOT_CLIENT_SECRET');
    if ($clientSecret === '') {
        metaLog(['stage' => 'webhook', 'mode' => 'hubspot', 'success' => false, 'error' => 'HUBSPOT_CLIENT_SECRET not configured']);
        webhookRespond(503, ['ok' => false]);
    }
    $signatureV3 = (string) ($_SERVER['HTTP_X_HUBSPOT_SIGNATURE_V3'] ?? '');
    if ($signatureV3 !== '') {
        $authorized = metaHubspotSignatureV3Valid(
            $clientSecret,
            'POST',
            'https://' . ($_SERVER['HTTP_HOST'] ?? 'emaraestates.com') . ($_SERVER['REQUEST_URI'] ?? '/meta-crm-webhook.php'),
            $raw,
            (string) ($_SERVER['HTTP_X_HUBSPOT_REQUEST_TIMESTAMP'] ?? ''),
            $signatureV3,
            (int) floor(microtime(true) * 1000)
        );
        $signatureVersion = 'v3';
    } else {
        $authorized = strtolower((string) ($_SERVER['HTTP_X_HUBSPOT_SIGNATURE_VERSION'] ?? '')) === 'v1'
            && metaHubspotSignatureV1Valid($clientSecret, $raw, (string) ($_SERVER['HTTP_X_HUBSPOT_SIGNATURE'] ?? ''));
        $signatureVersion = 'v1';
    }
    if (!$authorized) {
        metaLog(['stage' => 'webhook', 'mode' => 'hubspot', 'signature' => $signatureVersion, 'success' => false, 'error' => 'invalid signature']);
        webhookRespond(401, ['ok' => false]);
    }
    if (!is_array($data) || !array_is_list($data)) webhookRespond(400, ['ok' => false]);
    $contactIds = metaHubspotBatchContactIds($data);
    $mode = 'hubspot-' . $signatureVersion;
} else {
    $zapierSecret = metaEnv($env, 'META_CRM_ZAPIER_SECRET');
    if ($zapierSecret === '') {
        metaLog(['stage' => 'webhook', 'mode' => 'zapier', 'success' => false, 'error' => 'META_CRM_ZAPIER_SECRET not configured']);
        webhookRespond(503, ['ok' => false]);
    }
    if (!hash_equals($zapierSecret, (string) $_SERVER['HTTP_X_EMARA_WEBHOOK_SECRET'])) {
        metaLog(['stage' => 'webhook', 'mode' => 'zapier', 'success' => false, 'error' => 'invalid secret']);
        webhookRespond(401, ['ok' => false]);
    }
    $contactId = metaZapierContactId($data);
    if ($contactId === null) webhookRespond(400, ['ok' => false]);
    $contactIds = [$contactId];
    $mode = 'zapier';
}

// Which authentication actually succeeded (e.g. whether HubSpot sends v3) — no values.
metaLog(['stage' => 'webhook', 'mode' => $mode, 'success' => true, 'contacts' => count($contactIds)]);

if (!$contactIds) {
    webhookRespond(200, ['ok' => true, 'contacts' => 0]);
}

$hubspotToken = metaEnv($env, 'HUBSPOT_ACCESS_TOKEN');
if ($hubspotToken === '') {
    metaLog(['stage' => 'webhook', 'mode' => $mode, 'success' => false, 'error' => 'HUBSPOT_ACCESS_TOKEN not configured']);
    webhookRespond(503, ['ok' => false]);
}

if (random_int(1, 100) === 1) {
    metaLedgerPrune(metaLedgerDir($env), time());
}

$historyProperties = array_values(array_unique(array_column(metaCrmRules($env), 'property')));
$retry = false;
foreach ($contactIds as $contactId) {
    try {
        $fetched = metaHubspotFetchContact($contactId, $hubspotToken, $historyProperties);
        if ($fetched['status'] === 'missing') continue;
        if ($fetched['status'] !== 'ok') {
            $retry = true;
            continue;
        }
        $retry = metaCrmProcessContact($contactId, $fetched['contact'], $env, time()) || $retry;
    } catch (Throwable $error) {
        metaLog(['stage' => 'webhook', 'mode' => $mode, 'contactId' => $contactId, 'success' => false, 'error' => get_class($error)]);
        $retry = true;
    }
}

webhookRespond($retry ? 500 : 200, ['ok' => !$retry, 'contacts' => count($contactIds)]);
