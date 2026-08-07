<?php
declare(strict_types=1);

/* =============================================================================
   EMARA ESTATES — Landing Ads « Offre Guéliz »
   Endpoint sécurisé (production Apache/PHP). Miroir de handleGuelizLead()
   dans server.js. Aucun token privé n'est exposé côté client.
   Réutilise l'intégration webhook existante et ajoute HubSpot (configurable).
   ============================================================================= */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_BODY_BYTES = 16384;
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 20;
const GUELIZ_LEAD_SOURCE = 'Ads Landing Page';
const GUELIZ_WEBHOOK_FALLBACK = 'https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/';

// Correspondance UNIQUE label métier -> nom interne de propriété HubSpot.
// Adaptez ces valeurs aux noms internes réels de votre portail HubSpot.
const GUELIZ_HUBSPOT_FIELD_MAP = [
    'fullName'       => 'full_name',
    'phone'          => 'phone',
    'projectType'    => 'project_type',
    'apartmentType'  => 'apartment_type',
    'timeframe'      => 'acquisition_timeframe',
    'leadSource'     => 'lead_source',
    'adPlatform'     => 'advertising_platform',
    'campaign'       => 'campaign',
    'adset'          => 'ad_set',
    'ad'             => 'advertisement',
    'landingPageUrl' => 'landing_page_url',
    'utmSource'      => 'utm_source',
    'utmMedium'      => 'utm_medium',
    'utmCampaign'    => 'utm_campaign',
    'utmContent'     => 'utm_content',
    'utmTerm'        => 'utm_term',
    'referrer'       => 'referrer',
    'submissionDate' => 'submission_date',
];

$env = loadEnv(__DIR__ . '/.env');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['success' => false, 'message' => 'Méthode non autorisée.']);
}

$input = readJsonInput();
$ip = clientIp();

// Piège anti-spam : accepté silencieusement, non traité.
if (sanitizeValue($input['company_website'] ?? '', 120) !== '') {
    sendJson(200, ['success' => true, 'message' => 'Votre demande a bien été envoyée.']);
}

$lead = buildGuelizLead($input);

if (mb_strlen(trim($lead['fullName'])) < 2 || !guelizPhoneValid($lead['phone'])) {
    sendJson(422, [
        'success' => false,
        'message' => 'Merci d’indiquer votre nom et un numéro de téléphone valide.',
    ]);
}

if (isRateLimited($ip)) {
    sendJson(429, ['success' => false, 'message' => 'Trop de demandes. Réessayez plus tard.']);
}

$attempted = 0;
$succeeded = 0;

foreach (['hubspotForm', 'hubspotCrm', 'webhook'] as $sink) {
    try {
        $handled = false;
        if ($sink === 'hubspotForm') {
            $handled = submitGuelizToHubspotForm($lead, $env);
        } elseif ($sink === 'hubspotCrm') {
            $handled = submitGuelizToHubspotCrm($lead, $env);
        } else {
            $handled = forwardGuelizWebhook($lead, $env);
        }
        if ($handled) {
            $attempted++;
            $succeeded++;
        }
    } catch (Throwable $error) {
        $attempted++;
        // Journalisation sûre : on ne perd jamais l'information de l'échec.
        error_log('[gueliz-lead] ' . $sink . ' failed: ' . $error->getMessage());
    }
}

if ($attempted === 0) {
    error_log('[gueliz-lead] Aucun connecteur configuré. Lead journalisé : ' . json_encode($lead, JSON_UNESCAPED_UNICODE));
    sendJson(200, ['success' => true, 'message' => 'Votre demande a bien été envoyée.']);
}

if ($succeeded > 0) {
    sendJson(200, ['success' => true, 'message' => 'Votre demande a bien été envoyée.']);
}

error_log('[gueliz-lead] Tous les connecteurs ont échoué. Lead : ' . json_encode($lead, JSON_UNESCAPED_UNICODE));
sendJson(502, [
    'success' => false,
    'message' => 'Votre demande n’a pas pu être transmise. Contactez-nous directement sur WhatsApp.',
]);

/* ─────────────────────────────── Helpers ─────────────────────────────── */

function sendJson(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function loadEnv(string $filePath): array
{
    if (!is_file($filePath)) return [];
    $env = [];
    foreach (file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $separator = strpos($line, '=');
        if ($separator === false) continue;
        $key = trim(substr($line, 0, $separator));
        $env[$key] = trim(trim(substr($line, $separator + 1)), "\"'");
    }
    return $env;
}

function envValue(array $env, string $key): string
{
    $value = trim($env[$key] ?? '');
    if ($value === '') {
        $fromGetenv = getenv($key);
        $value = is_string($fromGetenv) ? trim($fromGetenv) : '';
    }
    return $value;
}

function readJsonInput(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
        sendJson(400, ['success' => false, 'message' => 'Données invalides.']);
    }
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        sendJson(400, ['success' => false, 'message' => 'Données invalides.']);
    }
    return $data;
}

function sanitizeValue(mixed $value, int $maxLength): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) ($value ?? '')) ?? '';
    $value = str_replace(['<', '>'], '', $value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, $maxLength);
}

function clientIp(): string
{
    $source = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    return trim(explode(',', (string) $source)[0]);
}

function isRateLimited(string $ip): bool
{
    $safeIp = preg_replace('/[^A-Za-z0-9_.:-]/', '_', $ip) ?: 'unknown';
    $filePath = sys_get_temp_dir() . '/emara_gueliz_' . hash('sha256', $safeIp) . '.json';
    $now = time();
    $entry = ['count' => 0, 'resetAt' => $now + RATE_LIMIT_WINDOW];
    if (is_file($filePath)) {
        $stored = json_decode((string) file_get_contents($filePath), true);
        if (is_array($stored)) $entry = array_merge($entry, $stored);
    }
    if (($entry['resetAt'] ?? 0) <= $now) {
        $entry = ['count' => 0, 'resetAt' => $now + RATE_LIMIT_WINDOW];
    }
    $entry['count'] = (int) $entry['count'] + 1;
    file_put_contents($filePath, json_encode($entry), LOCK_EX);
    return $entry['count'] > RATE_LIMIT_MAX;
}

function guelizPhoneValid(string $phone): bool
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    return strlen($digits) >= 8 && strlen($digits) <= 15;
}

function buildGuelizLead(array $input): array
{
    return [
        'fullName'       => sanitizeValue($input['fullName'] ?? '', 80),
        'phone'          => sanitizeValue($input['phone'] ?? '', 30),
        'phoneCountry'   => sanitizeValue($input['phoneCountry'] ?? '', 40),
        'phoneCountryCode' => sanitizeValue($input['phoneCountryCode'] ?? '', 3),
        'projectType'    => sanitizeValue($input['projectType'] ?? '', 60),
        'apartmentType'  => sanitizeValue($input['apartmentType'] ?? '', 60),
        'timeframe'      => sanitizeValue($input['timeframe'] ?? '', 60),
        'leadSource'     => GUELIZ_LEAD_SOURCE,
        'adPlatform'     => sanitizeValue($input['adPlatform'] ?? '', 40),
        'campaign'       => sanitizeValue($input['campaign'] ?? '', 200),
        'adset'          => sanitizeValue($input['adset'] ?? '', 200),
        'ad'             => sanitizeValue($input['ad'] ?? '', 200),
        'landingPageUrl' => sanitizeValue($input['landingPageUrl'] ?? '', 500),
        'utmSource'      => sanitizeValue($input['utmSource'] ?? '', 200),
        'utmMedium'      => sanitizeValue($input['utmMedium'] ?? '', 200),
        'utmCampaign'    => sanitizeValue($input['utmCampaign'] ?? '', 200),
        'utmContent'     => sanitizeValue($input['utmContent'] ?? '', 200),
        'utmTerm'        => sanitizeValue($input['utmTerm'] ?? '', 200),
        'referrer'       => sanitizeValue($input['referrer'] ?? '', 500),
        'submissionDate' => sanitizeValue($input['submissionDate'] ?? '', 40) ?: date(DATE_ATOM),
    ];
}

function guelizHubspotFields(array $lead): array
{
    $fields = [];
    foreach (GUELIZ_HUBSPOT_FIELD_MAP as $key => $hubspotName) {
        $value = (string) ($lead[$key] ?? '');
        if ($value !== '') {
            $fields[] = ['name' => $hubspotName, 'value' => $value];
        }
    }
    return $fields;
}

function httpPostJson(string $url, array $body, array $extraHeaders = []): array
{
    $headers = "Content-Type: application/json\r\nAccept: application/json\r\n";
    foreach ($extraHeaders as $header) {
        $headers .= $header . "\r\n";
    }
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => $headers,
            'content' => json_encode($body, JSON_UNESCAPED_UNICODE),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    $ok = $response !== false && preg_match('/\s2\d\d\s/', $statusLine) === 1;
    return ['ok' => $ok, 'status' => $statusLine, 'body' => (string) $response];
}

function submitGuelizToHubspotForm(array $lead, array $env): bool
{
    $portalId = envValue($env, 'HUBSPOT_PORTAL_ID');
    $formGuid = envValue($env, 'HUBSPOT_FORM_GUID');
    if ($portalId === '' || $formGuid === '') return false;

    $url = "https://api.hsforms.com/submissions/v3/integration/submit/{$portalId}/{$formGuid}";
    $result = httpPostJson($url, [
        'fields' => guelizHubspotFields($lead),
        'context' => [
            'pageUri' => $lead['landingPageUrl'] ?: 'https://emaraestates.com/offre-gueliz',
            'pageName' => 'Offre Guéliz',
        ],
    ]);
    if (!$result['ok']) {
        throw new RuntimeException('HubSpot Forms API ' . ($result['status'] ?: 'no response'));
    }
    return true;
}

function submitGuelizToHubspotCrm(array $lead, array $env): bool
{
    $token = envValue($env, 'HUBSPOT_ACCESS_TOKEN');
    if ($token === '') return false;

    $nameParts = preg_split('/\s+/', trim($lead['fullName'])) ?: [];
    $firstname = array_shift($nameParts) ?? '';
    $lastname = implode(' ', $nameParts);

    $properties = [
        'firstname' => $firstname,
        'lastname' => $lastname,
        'phone' => $lead['phone'],
    ];
    foreach (GUELIZ_HUBSPOT_FIELD_MAP as $key => $hubspotName) {
        if ($key === 'fullName' || $key === 'phone') continue;
        if (($lead[$key] ?? '') !== '') $properties[$hubspotName] = $lead[$key];
    }

    $result = httpPostJson(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        ['properties' => $properties],
        ['Authorization: Bearer ' . $token]
    );
    if (!$result['ok']) {
        throw new RuntimeException('HubSpot CRM API ' . ($result['status'] ?: 'no response'));
    }
    return true;
}

function forwardGuelizWebhook(array $lead, array $env): bool
{
    $url = envValue($env, 'GUELIZ_WEBHOOK_URL');
    if ($url === '') $url = envValue($env, 'CONTACT_WEBHOOK_URL');
    if ($url === '') $url = GUELIZ_WEBHOOK_FALLBACK;
    if ($url === '') return false;

    $result = httpPostJson($url, array_merge(['form_type' => 'gueliz_landing'], $lead));
    if (!$result['ok']) {
        throw new RuntimeException('Gueliz webhook failed: ' . ($result['status'] ?: 'no response'));
    }
    return true;
}
