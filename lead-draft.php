<?php
declare(strict_types=1);

/* =============================================================================
   POST /lead-draft.php — partial / abandoned form capture.

   Body (JSON, ≤ 4 KB), from the lead form of an opted-in landing page:
     { "form_session_id": "…", "project_name": "Honest Signature 7",
       "name": "…", "phone": "+212…", "email": "…", "current_step": "coordonnees",
       "utm_source": "…", …, "fbclid": "…", "page_url": "https://…" }
   → the draft of that form session is created or updated (one record per
     session), and the first valid contact method triggers one internal e-mail.

     { "action": "sweep" }
   → carries no data; only gives the abandonment sweep a chance to run.

   The answer never contains stored data: {"ok":true,"captured":bool}.

   A separate endpoint on purpose. contact.php forwards what it receives to
   Zapier; a draft must never reach it, including during a deploy, when a new
   page can briefly meet an older contact.php.

   Cron (recommended, every 5 minutes) — abandonment e-mails then leave on time
   even when no visitor is on the site:
     php /home/…/public_html/lead-draft.php sweep
   ============================================================================= */

require __DIR__ . '/lead-private/lead-drafts.php';

/** Ends the request. Nothing a visitor typed is ever echoed back. */
function leadDraftRespond(int $status, array $payload = []): never
{
    http_response_code($status);
    if ($status !== 204) echo json_encode($payload);
    exit;
}

/** Completes the HTTP response where the SAPI allows it, so e-mails never hold the visitor's request. */
function leadDraftFinishResponse(int $status, array $payload = []): void
{
    ignore_user_abort(true);
    http_response_code($status);
    if ($status !== 204) echo json_encode($payload);
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        @ob_flush();
        flush();
    }
}

$env = leadDraftLoadEnv(__DIR__ . '/.env');

// Cron. An HTTP request always carries REQUEST_METHOD, so this branch cannot be
// reached over the web — including on hosts whose cron runs a CGI-style binary.
if (PHP_SAPI === 'cli' || !isset($_SERVER['REQUEST_METHOD'])) {
    $arguments = $argv ?? ($_SERVER['argv'] ?? []);
    if (($arguments[1] ?? '') !== 'sweep') {
        fwrite(STDERR, "usage: php lead-draft.php sweep\n");
        exit(64);
    }
    $result = leadDraftEnabled($env) ? leadDraftSweep(leadDraftDir($env), time(), $env, true) : ['disabled' => true];
    echo json_encode($result) . "\n";
    exit(isset($result['error']) ? 1 : 0);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') leadDraftRespond(405, ['ok' => false]);
// Disabled: answer as if nothing was worth storing, so the page behaves the same.
if (!leadDraftEnabled($env)) leadDraftRespond(204);
if (!leadDraftSameOrigin($_SERVER)) leadDraftRespond(403, ['ok' => false]);

$raw = (string) file_get_contents('php://input', false, null, 0, LEAD_DRAFT_MAX_BODY_BYTES + 1);
if (strlen($raw) > LEAD_DRAFT_MAX_BODY_BYTES) leadDraftRespond(413, ['ok' => false]);
$input = json_decode($raw, true);
if (!is_array($input)) leadDraftRespond(400, ['ok' => false]);

$now = time();
$source = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$ip = trim(explode(',', (string) $source)[0]);
if (leadDraftRateLimited($ip, 'req', LEAD_DRAFT_REQUESTS_PER_IP, $now)) leadDraftRespond(429, ['ok' => false]);

$dir = leadDraftDir($env);

if (($input['action'] ?? '') === 'sweep') {
    leadDraftFinishResponse(204);
    leadDraftSweep($dir, $now, $env);
    exit;
}

// Honeypot filled, or "typed" faster than a person can: accepted, nothing kept.
$elapsed = (int) ($input['elapsed_ms'] ?? 0);
if (trim((string) ($input['company_website'] ?? '')) !== '' || ($elapsed > 0 && $elapsed < LEAD_DRAFT_MIN_ELAPSED_MS)) {
    leadDraftRespond(204);
}

$host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')) ?? '';
$data = leadDraftNormalize($input, $host);
// No usable phone or e-mail yet (or not a form that opted in): nothing is stored.
if ($data === null) leadDraftRespond(204);

$outcome = leadDraftUpsert(
    $dir,
    $data,
    $now,
    leadDraftPartialEmailEnabled($env),
    static fn (): bool => !leadDraftRateLimited($ip, 'new', LEAD_DRAFT_NEW_PER_IP, $now),
);
if (!$outcome['stored'] && ($outcome['reason'] ?? '') === 'storage') {
    leadDraftLog(['stage' => 'save', 'success' => false, 'error' => 'store not writable']);
}

leadDraftFinishResponse(200, ['ok' => true, 'captured' => $outcome['stored']]);

// After the response: the notification, then a chance for the sweep. Neither
// can affect what the visitor sees, and neither throws.
if (isset($outcome['notify'])) leadDraftNotifyPartial($dir, $outcome['notify'], $env);
leadDraftSweep($dir, $now, $env);
