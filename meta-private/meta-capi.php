<?php
declare(strict_types=1);

/* =============================================================================
   EMARA ESTATES — Meta Conversions API (server side)

   Shared by:
     - contact.php            website `Lead`, deduplicated with the browser Pixel
                              through the event ID the browser generated;
     - meta-crm-webhook.php   HubSpot qualification events (MQL / SQL / …).

   This file lives in meta-private/, which .htaccess denies, so it can never be
   requested directly.

   Rules:
     - The access token only ever comes from the server environment and is sent
       in the POST body, never in a URL, never logged.
     - Email, phone and names are normalised then SHA-256 hashed. fbp / fbc, IP
       and user agent are sent in clear, as Meta requires. fbc is only ever the
       genuine `_fbc` value — never rebuilt.
     - Logs carry event name, event ID and outcome only — never raw PII.
     - Nothing here throws to the caller: tracking must never break a lead.
   ============================================================================= */

const META_DEFAULT_PIXEL_ID = '1049553054304565';
/** Latest Graph API version on 2026-09-28 (v26.0, released 2026-07-29). */
const META_DEFAULT_GRAPH_VERSION = 'v26.0';
/** Meta rejects events older than 7 days for the action sources we use. */
const META_MAX_EVENT_AGE_SECONDS = 7 * 24 * 3600 - 3600;
/** A ledger claim left `pending` longer than this belongs to a crashed run. */
const META_LEDGER_STALE_SECONDS = 600;
/** Ledger records older than this are pruned (see metaLedgerPrune). */
const META_LEDGER_RETENTION_DAYS = 400;
/** One person asking twice is one prospect: within this window a second website lead is not a new Meta Lead. */
const META_LEAD_REPEAT_DAYS = 30;

/**
 * HubSpot → Meta mapping, on the EXACT stored enumeration values (verified in
 * portal 148182776 on 2026-09-28 — labels and internal values are identical):
 *   repondu         "Oui" | "Non"
 *   interesse       "Oui" | "Non"
 *   hs_lead_status  NEW | OPEN | A_RAPPELER | "Hors Cible" | "Hors Budget" |
 *                   "Vendu" | "Future Prospect" | "Injoignable !"
 *   rdv             "OUI" | "NON"
 *
 * Each rule fires at most once per contact, on the most recent change of
 * `property` from a value outside `values` to a value inside it.
 */
const META_CRM_RULES = [
    ['code' => 'MQL', 'event' => 'MarketingQualifiedLead', 'property' => 'repondu', 'values' => ['Oui']],
    ['code' => 'SQL', 'event' => 'SalesQualifiedLead', 'property' => 'interesse', 'values' => ['Oui']],
    // Diagnostic signal only. "Injoignable !" (unreachable) and "Future
    // Prospect" are deliberately NOT disqualifications.
    ['code' => 'DQ', 'event' => 'LeadDisqualified', 'property' => 'hs_lead_status', 'values' => ['Hors Cible', 'Hors Budget']],
];

/** Off unless META_CRM_SCHEDULE_ENABLED=1 — `rdv = OUI` is not yet confirmed to mean "appointment booked". */
const META_CRM_SCHEDULE_RULE = ['code' => 'RDV', 'event' => 'Schedule', 'property' => 'rdv', 'values' => ['OUI']];

/** Properties read for attribution and matching (in addition to the rule properties). */
const META_HUBSPOT_PROPERTIES = [
    'email', 'phone', 'mobilephone', 'firstname', 'lastname', 'createdate',
    // HubSpot system attribution — set by HubSpot, not by people.
    'hs_analytics_source', 'hs_analytics_source_data_1', 'first_conversion_event_name', 'hs_facebook_click_id',
    // Website attribution. These custom properties do NOT exist in the portal
    // yet (see the Zap mapping in the report); until they do, HubSpot simply
    // omits them and nothing below relies on them being present.
    'meta_fbc', 'meta_fbp', 'utm_source',
];

/** utm_source values that name a Meta surface. Exact match after lowercasing. */
const META_UTM_SOURCES = ['facebook', 'fb', 'instagram', 'ig', 'meta', 'messenger', 'audience_network'];

/* ─────────────────────────────── Environment ─────────────────────────────── */

function metaLoadEnv(string $filePath): array
{
    if (!is_file($filePath)) return [];
    $env = [];
    foreach (file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $separator = strpos($line, '=');
        if ($separator === false) continue;
        $env[trim(substr($line, 0, $separator))] = trim(trim(substr($line, $separator + 1)), "\"'");
    }
    return $env;
}

function metaEnv(array $env, string $key): string
{
    $value = trim((string) ($env[$key] ?? ''));
    if ($value === '') {
        $fromGetenv = getenv($key);
        $value = is_string($fromGetenv) ? trim($fromGetenv) : '';
    }
    return $value;
}

/** Null when CAPI is not configured — callers then skip silently. */
function metaConfig(array $env): ?array
{
    $token = metaEnv($env, 'META_ACCESS_TOKEN');
    if ($token === '') return null;
    $pixelId = metaEnv($env, 'META_PIXEL_ID') ?: META_DEFAULT_PIXEL_ID;
    $version = metaEnv($env, 'META_GRAPH_API_VERSION') ?: META_DEFAULT_GRAPH_VERSION;
    if (!preg_match('/^\d{5,20}$/', $pixelId) || !preg_match('/^v\d{1,3}\.\d$/', $version)) {
        metaLog(['stage' => 'config', 'success' => false, 'error' => 'invalid META_PIXEL_ID or META_GRAPH_API_VERSION']);
        return null;
    }
    return [
        'token' => $token,
        'pixelId' => $pixelId,
        'version' => $version,
        'testEventCode' => metaEnv($env, 'META_TEST_EVENT_CODE'),
    ];
}

function metaCrmRules(array $env): array
{
    $rules = META_CRM_RULES;
    if (metaEnv($env, 'META_CRM_SCHEDULE_ENABLED') === '1') $rules[] = META_CRM_SCHEDULE_RULE;
    return $rules;
}

/**
 * Activation point (unix seconds) from META_CRM_START_AT (ISO 8601). CRM changes
 * before it are never sent, so nothing historical — such as the 2026-08-03
 * lifecycle bulk edit — is ever backfilled. Null (unset/invalid) = CRM events off.
 */
function metaCrmStartAt(array $env): ?int
{
    $raw = metaEnv($env, 'META_CRM_START_AT');
    if ($raw === '') return null;
    try {
        return (new DateTimeImmutable($raw))->getTimestamp();
    } catch (Throwable) {
        metaLog(['stage' => 'config', 'success' => false, 'error' => 'invalid META_CRM_START_AT']);
        return null;
    }
}

/* ──────────────────────────── Normalisation ──────────────────────────────── */

function metaHash(string $value): string
{
    return hash('sha256', $value);
}

function metaNormalizeEmail(string $email): string
{
    $email = mb_strtolower(trim($email));
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

/**
 * Digits with country code, no "+" or leading zeros. A national number such as
 * "0612345678" has no country code, and guessing one would hash a wrong phone,
 * so it is dropped instead.
 */
function metaNormalizePhone(string $phone): string
{
    $raw = trim($phone);
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (str_starts_with($raw, '+')) {
        // already international
    } elseif (str_starts_with($digits, '00')) {
        $digits = substr($digits, 2);
    } elseif (str_starts_with($digits, '0')) {
        return '';
    }
    $digits = ltrim($digits, '0');
    return strlen($digits) >= 8 && strlen($digits) <= 15 ? $digits : '';
}

/** Lowercase letters only, accents kept (Meta accepts UTF-8). */
function metaNormalizeName(string $name): string
{
    return preg_replace('/[^\p{L}\p{M}]+/u', '', mb_strtolower(trim($name))) ?? '';
}

/** Splits "Prénom Nom Composé" into first name and the rest. */
function metaSplitName(string $fullName): array
{
    $parts = preg_split('/\s+/u', trim($fullName), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $first = array_shift($parts) ?? '';
    return [$first, implode(' ', $parts)];
}

/** `_fbp`: fb.<subdomainIndex>.<creationTimeMs>.<random>. */
function metaValidFbp(string $value): string
{
    return preg_match('/^fb\.\d\.\d{10,13}\.\d{5,25}$/', $value) ? $value : '';
}

/** `_fbc`: fb.<subdomainIndex>.<creationTimeMs>.<fbclid> — only as set by the Pixel. */
function metaValidFbc(string $value): string
{
    return preg_match('/^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{10,500}$/', $value) ? $value : '';
}

/**
 * Meta `user_data`. Accepts raw values; hashes what Meta requires hashed and
 * drops anything invalid rather than sending garbage.
 *
 * @param array{email?:string,phone?:string,firstName?:string,lastName?:string,
 *   externalId?:string,fbc?:string,fbp?:string,ip?:string,userAgent?:string} $fields
 */
function metaUserData(array $fields): array
{
    $userData = [];
    $email = metaNormalizeEmail((string) ($fields['email'] ?? ''));
    if ($email !== '') $userData['em'] = [metaHash($email)];
    $phone = metaNormalizePhone((string) ($fields['phone'] ?? ''));
    if ($phone !== '') $userData['ph'] = [metaHash($phone)];
    $firstName = metaNormalizeName((string) ($fields['firstName'] ?? ''));
    if ($firstName !== '') $userData['fn'] = [metaHash($firstName)];
    $lastName = metaNormalizeName((string) ($fields['lastName'] ?? ''));
    if ($lastName !== '') $userData['ln'] = [metaHash($lastName)];
    $externalId = trim((string) ($fields['externalId'] ?? ''));
    if ($externalId !== '') $userData['external_id'] = [metaHash($externalId)];

    $fbc = metaValidFbc(trim((string) ($fields['fbc'] ?? '')));
    if ($fbc !== '') $userData['fbc'] = $fbc;
    $fbp = metaValidFbp(trim((string) ($fields['fbp'] ?? '')));
    if ($fbp !== '') $userData['fbp'] = $fbp;
    $ip = trim((string) ($fields['ip'] ?? ''));
    if ($ip !== '' && filter_var($ip, FILTER_VALIDATE_IP)) $userData['client_ip_address'] = $ip;
    $userAgent = trim((string) ($fields['userAgent'] ?? ''));
    if ($userAgent !== '') $userData['client_user_agent'] = mb_substr($userAgent, 0, 500);

    return $userData;
}

/** Meta needs at least one customer identifier it can match on. */
function metaHasMatchKey(array $userData): bool
{
    foreach (['em', 'ph', 'fbc', 'fbp', 'external_id'] as $key) {
        if (!empty($userData[$key])) return true;
    }
    return isset($userData['client_ip_address'], $userData['client_user_agent']);
}

/* ─────────────────────────────── Transport ───────────────────────────────── */

/**
 * @return array{status:int, body:string} status 0 = no response
 *
 * `$timeout` bounds the read; default_socket_timeout is lowered for the call
 * so the TCP/TLS connect is bounded too (the stream option alone is not).
 */
function metaHttp(string $method, string $url, array $headers, ?string $body, int $timeout): array
{
    $options = [
        'method' => $method,
        'header' => implode("\r\n", $headers) . "\r\n",
        'ignore_errors' => true,
        'timeout' => $timeout,
    ];
    if ($body !== null) $options['content'] = $body;
    $previousSocketTimeout = ini_get('default_socket_timeout');
    ini_set('default_socket_timeout', (string) $timeout);
    try {
        $response = @file_get_contents($url, false, stream_context_create(['http' => $options]));
        $statusLine = $http_response_header[0] ?? '';
    } finally {
        ini_set('default_socket_timeout', (string) $previousSocketTimeout);
    }
    $status = preg_match('/\s(\d{3})\s?/', $statusLine, $match) ? (int) $match[1] : 0;
    return ['status' => $response === false ? 0 : $status, 'body' => $response === false ? '' : (string) $response];
}

/** One structured, PII-free line per outcome. */
function metaLog(array $entry): void
{
    error_log('[meta-capi] ' . json_encode(['provider' => 'meta'] + $entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

/**
 * Sends events to the dataset. Never throws.
 *
 * @return array{ok:bool, skipped:bool, status:int}
 */
function metaSendEvents(array $events, array $env, int $timeout = 3): array
{
    $config = metaConfig($env);
    if ($config === null) {
        foreach ($events as $event) {
            metaLog(['eventName' => $event['event_name'] ?? '', 'eventId' => $event['event_id'] ?? '', 'success' => false, 'skipped' => 'META_ACCESS_TOKEN not configured']);
        }
        return ['ok' => false, 'skipped' => true, 'status' => 0];
    }

    try {
        $body = ['data' => array_values($events), 'access_token' => $config['token']];
        if ($config['testEventCode'] !== '') $body['test_event_code'] = $config['testEventCode'];

        $result = metaHttp(
            'POST',
            "https://graph.facebook.com/{$config['version']}/{$config['pixelId']}/events",
            ['Content-Type: application/json', 'Accept: application/json'],
            json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $timeout
        );
        $decoded = json_decode($result['body'], true);
        $ok = $result['status'] >= 200 && $result['status'] < 300
            && is_array($decoded) && (int) ($decoded['events_received'] ?? 0) === count($events);

        foreach ($events as $event) {
            $entry = [
                'eventName' => $event['event_name'] ?? '',
                'eventId' => $event['event_id'] ?? '',
                'actionSource' => $event['action_source'] ?? '',
                'eventTime' => $event['event_time'] ?? 0,
                // Which match keys were sent — names only, never values.
                'matchKeys' => array_keys($event['user_data'] ?? []),
                'success' => $ok,
                'status' => $result['status'],
                'testMode' => $config['testEventCode'] !== '',
            ];
            if (is_array($decoded) && isset($decoded['fbtrace_id'])) $entry['fbtraceId'] = (string) $decoded['fbtrace_id'];
            if (!$ok) {
                $error = is_array($decoded) ? ($decoded['error'] ?? []) : [];
                $entry['error'] = is_array($error) && $error
                    ? mb_substr(trim(($error['type'] ?? '') . ' ' . ($error['code'] ?? '') . '/' . ($error['error_subcode'] ?? '') . ' ' . ($error['message'] ?? '')), 0, 240)
                    : 'no response';
                if (is_array($error) && isset($error['fbtrace_id'])) $entry['fbtraceId'] = (string) $error['fbtrace_id'];
            }
            metaLog($entry);
        }
        return ['ok' => $ok, 'skipped' => false, 'status' => $result['status']];
    } catch (Throwable $error) {
        metaLog(['stage' => 'send', 'success' => false, 'error' => get_class($error)]);
        return ['ok' => false, 'skipped' => false, 'status' => 0];
    }
}

/* ─────────────────────────── Website Lead event ──────────────────────────── */

/** Browser-generated ID, shared by fbq(…, {eventID}) and this server event. */
function metaValidBrowserEventId(string $eventId, string $prefix): bool
{
    return (bool) preg_match('/^' . preg_quote($prefix, '/') . '_[A-Za-z0-9-]{8,64}$/', $eventId);
}

/** First absolute http(s) URL on emaraestates.com among the candidates. */
function metaEventSourceUrl(array $candidates): string
{
    foreach ($candidates as $candidate) {
        $candidate = trim((string) $candidate);
        $host = strtolower((string) parse_url($candidate, PHP_URL_HOST));
        $scheme = strtolower((string) parse_url($candidate, PHP_URL_SCHEME));
        if (in_array($scheme, ['http', 'https'], true) && ($host === 'emaraestates.com' || str_ends_with($host, '.emaraestates.com'))) {
            return mb_substr($candidate, 0, 1000);
        }
    }
    return 'https://emaraestates.com/';
}

/**
 * @param array{eventId:string,email?:string,phone?:string,firstName?:string,
 *   lastName?:string,fbc?:string,fbp?:string,ip?:string,userAgent?:string,
 *   sourceUrl:string,leadSource?:string,contentName?:string} $lead
 */
function metaWebsiteLeadEvent(array $lead, int $nowSeconds): array
{
    $customData = array_filter([
        'lead_source' => (string) ($lead['leadSource'] ?? ''),
        'content_name' => (string) ($lead['contentName'] ?? ''),
    ], static fn ($value) => $value !== '');

    $event = [
        'event_name' => 'Lead',
        'event_time' => $nowSeconds,
        'event_id' => $lead['eventId'],
        'action_source' => 'website',
        'event_source_url' => $lead['sourceUrl'],
        'user_data' => metaUserData([
            'email' => $lead['email'] ?? '',
            'phone' => $lead['phone'] ?? '',
            'firstName' => $lead['firstName'] ?? '',
            'lastName' => $lead['lastName'] ?? '',
            'fbc' => $lead['fbc'] ?? '',
            'fbp' => $lead['fbp'] ?? '',
            'ip' => $lead['ip'] ?? '',
            'userAgent' => $lead['userAgent'] ?? '',
        ]),
    ];
    if ($customData) $event['custom_data'] = $customData;
    return $event;
}

/* ───────────────────────── HubSpot → Meta (CRM) ──────────────────────────── */

/**
 * Positive Meta attribution. A contact qualifies only on evidence that it came
 * from Meta — never because another source is absent. `source_du_lead` is NOT
 * used: it is a hand-maintained label (bulk-edited, missing on many lead-ad
 * contacts), and `_fbp` alone is NOT used: the Pixel sets it for every visitor.
 */
function isMetaAttributedContact(array $properties): bool
{
    $value = static fn (string $key): string => trim((string) ($properties[$key] ?? ''));

    // 1. HubSpot's own original-source attribution: paid social from Facebook/Instagram
    //    (set by HubSpot, e.g. for every contact synced from Meta Lead Ads).
    if ($value('hs_analytics_source') === 'PAID_SOCIAL'
        && in_array($value('hs_analytics_source_data_1'), ['Facebook', 'Instagram'], true)) {
        return true;
    }
    // 2. First conversion recorded by HubSpot's Meta Lead Ads integration.
    if (str_starts_with($value('first_conversion_event_name'), 'Facebook Lead Ads:')) {
        return true;
    }
    // 3. A Meta ad click ID captured by HubSpot (fbclid).
    if ($value('hs_facebook_click_id') !== '') {
        return true;
    }
    // 4. Website leads, once the Zap persists them: a genuine `_fbc` click cookie…
    if (metaValidFbc($value('meta_fbc')) !== '') {
        return true;
    }
    // 5. …or a utm_source that names a Meta surface.
    return in_array(mb_strtolower($value('utm_source')), META_UTM_SOURCES, true);
}

function metaHistoryTimestampMs(mixed $timestamp): ?int
{
    if (is_int($timestamp) || (is_string($timestamp) && ctype_digit($timestamp))) return (int) $timestamp;
    if (!is_string($timestamp) || $timestamp === '') return null;
    try {
        return (int) (new DateTimeImmutable($timestamp))->format('Uv');
    } catch (Throwable) {
        return null;
    }
}

/**
 * Timestamp (ms) of the most recent change INTO one of `$targets` from a value
 * outside them, provided the property still holds a target value now.
 * Null when the current value is not a target or there was never a transition.
 * Values are compared exactly (trimmed) against the stored enumeration values.
 *
 * Deterministic for a given history, so a webhook retry — or any later edit of
 * an unrelated property — always yields the same answer.
 */
function metaLatestTransition(array $history, array $targets): ?int
{
    $entries = [];
    foreach ($history as $entry) {
        if (!is_array($entry)) continue;
        $timestamp = metaHistoryTimestampMs($entry['timestamp'] ?? null);
        if ($timestamp === null) continue;
        $entries[] = ['ts' => $timestamp, 'value' => trim((string) ($entry['value'] ?? ''))];
    }
    usort($entries, static fn ($a, $b) => $a['ts'] <=> $b['ts']);

    $previousMatched = false;
    $latest = null;
    foreach ($entries as $entry) {
        $matches = in_array($entry['value'], $targets, true);
        if ($matches && !$previousMatched) $latest = $entry['ts'];
        $previousMatched = $matches;
    }
    return $previousMatched ? $latest : null;
}

/** Stable across retries: same contact + same transition = same ID. */
function metaCrmEventId(string $contactId, string $code, int $transitionMs): string
{
    return "hubspot_{$contactId}_{$code}_{$transitionMs}";
}

/**
 * `system_generated` + `custom_data.event_source = crm` is Meta's documented
 * shape for CRM funnel stages. The CRM records that a commercial changed a
 * field, not over which channel the conversation happened, so claiming
 * `phone_call` or `business_messaging` here would be a guess.
 */
function metaCrmEvent(array $rule, string $contactId, int $transitionMs, array $properties): array
{
    return [
        'event_name' => $rule['event'],
        'event_time' => intdiv($transitionMs, 1000),
        'event_id' => metaCrmEventId($contactId, $rule['code'], $transitionMs),
        'action_source' => 'system_generated',
        'user_data' => metaUserData([
            'email' => $properties['email'] ?? '',
            'phone' => ($properties['phone'] ?? '') ?: ($properties['mobilephone'] ?? ''),
            'firstName' => $properties['firstname'] ?? '',
            'lastName' => $properties['lastname'] ?? '',
            'externalId' => $contactId,
            // Only values the Pixel genuinely set and the Zap persisted; absent today.
            'fbc' => $properties['meta_fbc'] ?? '',
            'fbp' => $properties['meta_fbp'] ?? '',
        ]),
        'custom_data' => [
            'event_source' => 'crm',
            'lead_event_source' => 'HubSpot',
        ],
    ];
}

/**
 * Contact IDs from a HubSpot webhook batch (a JSON array of events).
 * Deletions, merges and non-contact objects are ignored.
 */
function metaHubspotBatchContactIds(mixed $data, int $limit = 100): array
{
    if (!is_array($data) || !array_is_list($data)) return [];
    $ids = [];
    foreach ($data as $event) {
        if (!is_array($event)) continue;
        $type = (string) ($event['subscriptionType'] ?? '');
        if (str_contains($type, 'deletion') || str_contains($type, 'merge') || str_contains($type, 'restore')) continue;
        $isContact = str_starts_with($type, 'contact.') || (string) ($event['objectTypeId'] ?? '') === '0-1';
        if (!$isContact) continue;
        $ids[] = (string) ($event['objectId'] ?? '');
    }
    $ids = array_values(array_unique(array_filter($ids, static fn ($id) => preg_match('/^\d{1,20}$/', $id) === 1)));
    return array_slice($ids, 0, $limit);
}

/** The single contact ID of a Zapier fallback body: exactly `{"contactId": "123"}`. */
function metaZapierContactId(mixed $data): ?string
{
    if (!is_array($data) || array_is_list($data) || !isset($data['contactId'])) return null;
    $id = (string) $data['contactId'];
    return preg_match('/^\d{1,20}$/', $id) === 1 ? $id : null;
}

/** Decodes the characters HubSpot's v3 spec says to decode in the request URI. */
function metaHubspotDecodeUri(string $uri): string
{
    return strtr($uri, [
        '%3A' => ':', '%2F' => '/', '%3F' => '?', '%40' => '@', '%21' => '!', '%24' => '$',
        '%27' => "'", '%28' => '(', '%29' => ')', '%2A' => '*', '%2C' => ',', '%3B' => ';',
        '%3a' => ':', '%2f' => '/', '%3f' => '?', '%2a' => '*', '%2c' => ',', '%3b' => ';',
    ]);
}

/**
 * HubSpot request signature v3: base64(HMAC-SHA256(clientSecret,
 * method + uri + body + timestamp)), timestamp at most 5 minutes old.
 */
function metaHubspotSignatureV3Valid(
    string $clientSecret,
    string $method,
    string $uri,
    string $body,
    string $timestamp,
    string $signature,
    int $nowMs
): bool {
    if ($clientSecret === '' || $signature === '' || !ctype_digit($timestamp)) return false;
    if (abs($nowMs - (int) $timestamp) > 300000) return false;
    $expected = base64_encode(hash_hmac('sha256', $method . metaHubspotDecodeUri($uri) . $body . $timestamp, $clientSecret, true));
    return hash_equals($expected, $signature);
}

/**
 * HubSpot request signature v1: hex(SHA-256(clientSecret + body)). Only used
 * when HubSpot sends no v3 header. v1 has no timestamp, so a captured request
 * could be replayed — harmless here, because the endpoint re-reads the contact
 * from HubSpot and every event is idempotent.
 */
function metaHubspotSignatureV1Valid(string $clientSecret, string $body, string $signature): bool
{
    if ($clientSecret === '' || $signature === '') return false;
    return hash_equals(hash('sha256', $clientSecret . $body), strtolower($signature));
}

/* ─────────────────────────── Idempotency ledger ──────────────────────────── */

/**
 * Directory of the ledger. Outside the web root by default: on Hostinger
 * `…/domains/emaraestates.com/emara-meta-ledger`, a sibling of public_html,
 * which the FTP deploy (rooted at public_html) can neither overwrite nor
 * delete, and Apache can never serve. META_LEDGER_DIR overrides it.
 */
function metaLedgerDir(array $env): string
{
    return rtrim(metaEnv($env, 'META_LEDGER_DIR') ?: dirname(__DIR__, 2) . '/emara-meta-ledger', '/');
}

function metaLedgerRecordPath(string $dir, string $key): string
{
    return $dir . '/' . preg_replace('/[^A-Za-z0-9_-]/', '_', $key) . '.json';
}

/** @return resource|null  exclusive lock over the whole ledger */
function metaLedgerLock(string $dir)
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return null;
    $handle = @fopen($dir . '/.lock', 'c');
    if ($handle === false) return null;
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }
    return $handle;
}

function metaLedgerUnlock($handle): void
{
    flock($handle, LOCK_UN);
    fclose($handle);
}

/** Atomic write: temp file in the same directory, then rename(). */
function metaLedgerWrite(string $path, array $record): bool
{
    $temp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($temp, (string) json_encode($record)) === false) return false;
    @chmod($temp, 0600);
    if (!@rename($temp, $path)) {
        @unlink($temp);
        return false;
    }
    return true;
}

/**
 * Ledger keys under which a website lead is remembered: one per identifier, so
 * the same phone with another e-mail (or the reverse) is still the same person.
 * Hashes only — the ledger never holds a phone number or an e-mail.
 *
 * @return string[]
 */
function metaLeadPersonKeys(string $project, string $phone, string $email): array
{
    $scope = mb_strtolower(trim($project));
    $keys = [];
    $normalizedPhone = metaNormalizePhone($phone);
    if ($normalizedPhone !== '') $keys[] = 'weblead_p_' . substr(metaHash($scope . '|' . $normalizedPhone), 0, 40);
    $normalizedEmail = metaNormalizeEmail($email);
    if ($normalizedEmail !== '') $keys[] = 'weblead_e_' . substr(metaHash($scope . '|' . $normalizedEmail), 0, 40);
    return $keys;
}

/**
 * True when this person already sent a website lead for this project within
 * META_LEAD_REPEAT_DAYS (they reloaded the page and filled the form again, or
 * came back on another device). Otherwise remembers them and returns false.
 * Fails open: when the ledger cannot be read or written, the lead counts.
 */
function metaLeadIsRepeat(array $env, string $project, string $phone, string $email, int $nowSeconds): bool
{
    $keys = metaLeadPersonKeys($project, $phone, $email);
    if (!$keys) return false;
    $dir = metaLedgerDir($env);
    $lock = metaLedgerLock($dir);
    if ($lock === null) return false;
    try {
        $cutoff = $nowSeconds - META_LEAD_REPEAT_DAYS * 86400;
        $repeat = false;
        $unknown = [];
        foreach ($keys as $key) {
            $record = json_decode((string) @file_get_contents(metaLedgerRecordPath($dir, $key)), true);
            if (is_array($record) && (int) ($record['at'] ?? 0) > $cutoff) $repeat = true;
            else $unknown[] = $key;
        }
        // A new identifier of a known person is remembered too.
        foreach ($unknown as $key) {
            metaLedgerWrite(metaLedgerRecordPath($dir, $key), ['status' => 'lead', 'at' => $nowSeconds]);
        }
        return $repeat;
    } finally {
        metaLedgerUnlock($lock);
    }
}

/**
 * Claims `$key` under an exclusive flock, so concurrent deliveries of the same
 * change can never both send. The network call happens after the lock is
 * released; the `pending` record keeps everyone else out meanwhile.
 *
 * @return 'claimed'|'done'|'busy'|'error'
 */
function metaLedgerClaim(string $dir, string $key, string $eventId, int $nowSeconds): string
{
    $lock = metaLedgerLock($dir);
    if ($lock === null) return 'error';
    try {
        $path = metaLedgerRecordPath($dir, $key);
        if (is_file($path)) {
            $record = json_decode((string) @file_get_contents($path), true);
            if (is_array($record) && ($record['status'] ?? '') === 'sent') return 'done';
            if (is_array($record) && ($record['status'] ?? '') === 'pending'
                && $nowSeconds - (int) ($record['at'] ?? 0) < META_LEDGER_STALE_SECONDS) {
                return 'busy';
            }
            // Stale pending (crashed run) or unreadable record: reclaim. Writes are
            // atomic renames, so an unreadable file means external damage; a resend
            // reuses the same deterministic event ID, which Meta deduplicates.
            if (!is_array($record)) metaLog(['stage' => 'ledger', 'success' => false, 'error' => 'corrupt record reclaimed', 'key' => $key]);
        }
        return metaLedgerWrite($path, ['eventId' => $eventId, 'status' => 'pending', 'at' => $nowSeconds]) ? 'claimed' : 'error';
    } finally {
        metaLedgerUnlock($lock);
    }
}

function metaLedgerComplete(string $dir, string $key, string $eventId, int $nowSeconds): void
{
    $lock = metaLedgerLock($dir);
    if ($lock === null) return;
    try {
        metaLedgerWrite(metaLedgerRecordPath($dir, $key), ['eventId' => $eventId, 'status' => 'sent', 'at' => $nowSeconds]);
    } finally {
        metaLedgerUnlock($lock);
    }
}

function metaLedgerRelease(string $dir, string $key): void
{
    $lock = metaLedgerLock($dir);
    if ($lock === null) return;
    try {
        @unlink(metaLedgerRecordPath($dir, $key));
    } finally {
        metaLedgerUnlock($lock);
    }
}

/**
 * Deletes records older than the retention period (and orphaned temp files).
 * Called on ~1% of webhook requests; bounded per run.
 */
function metaLedgerPrune(string $dir, int $nowSeconds, int $maxFiles = 500): int
{
    $cutoff = $nowSeconds - META_LEDGER_RETENTION_DAYS * 86400;
    $removed = 0;
    foreach (glob($dir . '/*.{json,tmp}', GLOB_BRACE) ?: [] as $file) {
        $isTemp = str_ends_with($file, '.tmp');
        $mtime = (int) @filemtime($file);
        if (($isTemp && $mtime < $nowSeconds - 3600) || (!$isTemp && $mtime < $cutoff)) {
            if (@unlink($file)) $removed++;
        }
        if ($removed >= $maxFiles) break;
    }
    return $removed;
}

/* ─────────────────────────── CRM orchestration ───────────────────────────── */

/** @return array{status:string, contact?:array} status: ok | missing | error */
function metaHubspotFetchContact(string $contactId, string $token, array $historyProperties, int $timeout = 3): array
{
    $query = http_build_query([
        'properties' => implode(',', META_HUBSPOT_PROPERTIES),
        'propertiesWithHistory' => implode(',', $historyProperties),
        'archived' => 'false',
    ]);
    $result = metaHttp(
        'GET',
        'https://api.hubapi.com/crm/v3/objects/contacts/' . rawurlencode($contactId) . '?' . $query,
        ['Authorization: Bearer ' . $token, 'Accept: application/json'],
        null,
        $timeout
    );
    if ($result['status'] === 404) return ['status' => 'missing'];
    $decoded = json_decode($result['body'], true);
    if ($result['status'] < 200 || $result['status'] >= 300 || !is_array($decoded)) {
        metaLog(['stage' => 'hubspot_fetch', 'success' => false, 'status' => $result['status']]);
        return ['status' => 'error'];
    }
    return ['status' => 'ok', 'contact' => $decoded];
}

/**
 * Decides and sends the Meta events one HubSpot contact currently deserves.
 * Pure with respect to `$contact` (fetched by the caller), so it is testable.
 *
 * @param callable(array,array):array $send  defaults to metaSendEvents
 * @return bool  true when a retry could help (a send failed or the ledger was busy/unavailable)
 */
function metaCrmProcessContact(string $contactId, array $contact, array $env, int $nowSeconds, ?callable $send = null): bool
{
    $send ??= static fn (array $events, array $env) => metaSendEvents($events, $env, 3);
    $properties = is_array($contact['properties'] ?? null) ? $contact['properties'] : [];
    $history = is_array($contact['propertiesWithHistory'] ?? null) ? $contact['propertiesWithHistory'] : [];

    $startAt = metaCrmStartAt($env);
    if ($startAt === null) {
        metaLog(['stage' => 'crm', 'contactId' => $contactId, 'skipped' => 'META_CRM_START_AT not set — CRM events disabled']);
        return false;
    }
    if (!isMetaAttributedContact($properties)) {
        metaLog(['stage' => 'crm', 'contactId' => $contactId, 'skipped' => 'not attributable to Meta']);
        return false;
    }

    $ledgerDir = metaLedgerDir($env);
    $retry = false;
    foreach (metaCrmRules($env) as $rule) {
        $transitionMs = metaLatestTransition($history[$rule['property']] ?? [], $rule['values']);
        if ($transitionMs === null) continue;

        $transitionSeconds = intdiv($transitionMs, 1000);
        $eventId = metaCrmEventId($contactId, $rule['code'], $transitionMs);
        // No backfill: only changes made after activation, and inside Meta's window.
        if ($transitionSeconds < $startAt) continue;
        $ageSeconds = $nowSeconds - $transitionSeconds;
        if ($ageSeconds > META_MAX_EVENT_AGE_SECONDS || $ageSeconds < -300) continue;

        // Once per contact and event: a later Non → Oui toggle is a correction,
        // not a second qualification.
        $ledgerKey = "{$contactId}_{$rule['code']}";
        $claim = metaLedgerClaim($ledgerDir, $ledgerKey, $eventId, $nowSeconds);
        if ($claim === 'done') continue;
        if ($claim !== 'claimed') {
            metaLog(['stage' => 'ledger', 'eventName' => $rule['event'], 'eventId' => $eventId, 'success' => false, 'error' => $claim]);
            $retry = true;
            continue;
        }

        $event = metaCrmEvent($rule, $contactId, $transitionMs, $properties);
        if (!metaHasMatchKey($event['user_data'])) {
            metaLog(['stage' => 'crm', 'eventName' => $rule['event'], 'eventId' => $eventId, 'skipped' => 'no match key']);
            metaLedgerComplete($ledgerDir, $ledgerKey, $eventId, $nowSeconds);
            continue;
        }

        $result = $send([$event], $env);
        if ($result['ok']) {
            metaLedgerComplete($ledgerDir, $ledgerKey, $eventId, $nowSeconds);
        } else {
            metaLedgerRelease($ledgerDir, $ledgerKey);
            // Unconfigured CAPI is not transient; retrying cannot help.
            if (!$result['skipped']) $retry = true;
        }
    }
    return $retry;
}

/* ───────────────────────────── Diagnostics ───────────────────────────────── */

/**
 * Booleans only — safe to expose through the existing contact.php debug
 * endpoint (whose key is in a public repository). No values, no paths.
 */
function metaDiagnostics(array $env): array
{
    $ledgerDir = metaLedgerDir($env);
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';
    $lock = metaLedgerLock($ledgerDir);
    $ledgerWritable = false;
    if ($lock !== null) {
        $probe = $ledgerDir . '/.probe-' . bin2hex(random_bytes(4));
        $ledgerWritable = @file_put_contents($probe, '1') !== false && @unlink($probe);
        metaLedgerUnlock($lock);
    }
    $ledgerReal = realpath($ledgerDir) ?: '';
    return [
        'sapi' => PHP_SAPI,
        'finish_request' => function_exists('litespeed_finish_request') ? 'litespeed_finish_request'
            : (function_exists('fastcgi_finish_request') ? 'fastcgi_finish_request' : 'none (synchronous send)'),
        'meta_capi_configured' => metaConfig($env) !== null,
        'meta_test_mode' => metaEnv($env, 'META_TEST_EVENT_CODE') !== '',
        'crm_start_at_set' => metaCrmStartAt($env) !== null,
        'crm_schedule_enabled' => metaEnv($env, 'META_CRM_SCHEDULE_ENABLED') === '1',
        'hubspot_token_configured' => metaEnv($env, 'HUBSPOT_ACCESS_TOKEN') !== '',
        'hubspot_client_secret_configured' => metaEnv($env, 'HUBSPOT_CLIENT_SECRET') !== '',
        'zapier_secret_configured' => metaEnv($env, 'META_CRM_ZAPIER_SECRET') !== '',
        'ledger_writable' => $ledgerWritable,
        'ledger_outside_web_root' => $ledgerReal !== '' && $documentRoot !== '' && !str_starts_with($ledgerReal . '/', rtrim($documentRoot, '/') . '/'),
    ];
}
