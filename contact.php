<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_BODY_BYTES = 16384;
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 20;
const MIN_SUBMIT_MS = 3000;
const CONTACT_DEBUG_KEY = 'emara-contact-debug-20260413';
const CONTACT_SUCCESS_MESSAGE = 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.';
const CONTACT_WEBHOOK_URL_FALLBACK = 'https://hooks.zapier.com/hooks/catch/27111467/ujcbawh/';

$validBudgets = ['1M - 1.5M MAD', '2M - 3M MAD', '+3M MAD'];
$blockedTerms = [
    'refonte', 'refondre', 'seo', 'referencement', 'backlink', 'agence web',
    'creation de site', 'site internet', 'marketing digital', 'audit gratuit',
    'devis gratuit', 'visibilite', 'ranking', 'google ads', 'wordpress',
    'shopify', 'web design', 'webdesign', 'traffic', 'trafic', 'lead generation',
    'guest post', 'link building'
];

$env = loadEnv(__DIR__ . '/.env');

// Optional: a missing library must never break lead capture.
if (is_file(__DIR__ . '/meta-private/meta-capi.php')) {
    require_once __DIR__ . '/meta-private/meta-capi.php';
}
if (is_file(__DIR__ . '/lead-private/lead-drafts.php')) {
    require_once __DIR__ . '/lead-private/lead-drafts.php';
}
if (is_file(__DIR__ . '/activity-private/activity.php')) {
    require_once __DIR__ . '/activity-private/activity.php';
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['debug'] ?? '') === CONTACT_DEBUG_KEY) {
    sendJson(200, [
        'php' => PHP_VERSION,
        'env_loaded' => is_file(__DIR__ . '/.env'),
        'smtp_host' => $env['SMTP_HOST'] ?? 'smtp.gmail.com',
        'smtp_user_configured' => trim($env['SMTP_USER'] ?? '') !== '',
        'smtp_pass_configured' => trim($env['SMTP_PASS'] ?? '') !== '',
        'zapier_webhook_configured' => contactWebhookUrl($env) !== '',
        'allow_url_fopen' => (bool) ini_get('allow_url_fopen'),
        // Booleans only (this key is in a public repository).
        'meta' => function_exists('metaDiagnostics') ? metaDiagnostics($env) : ['library_loaded' => false],
        'lead_drafts' => function_exists('leadDraftDiagnostics') ? leadDraftDiagnostics($env) : ['library_loaded' => false],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['message' => 'Méthode non autorisée.']);
}

$input = readJsonInput();
$ip = clientIp();

$formType = sanitizeValue($input['form_type'] ?? '', 40);
if ($formType === 'apport_simulator') {
    handleApportSimulator($input, $env, $ip);
}

[$payload, $errors] = validatePayload($input, $validBudgets, $blockedTerms);

if (shouldSilentlyAccept($payload)) {
    sendJson(200, ['message' => CONTACT_SUCCESS_MESSAGE]);
}

if ($errors) {
    sendJson(422, ['message' => 'Corrigez les champs indiqués.', 'errors' => $errors]);
}

if (isRateLimited($ip)) {
    sendJson(429, ['message' => 'Trop de demandes envoyées. Réessayez plus tard.']);
}

try {
    sendLeadToZapier($payload, $env, $ip);

    try {
        sendLeadEmail($payload, $env);
    } catch (Throwable $emailError) {
        error_log('Contact form email skipped after Zapier success: ' . $emailError->getMessage());
    }
} catch (Throwable $error) {
    error_log('Contact form Zapier error: ' . $error->getMessage());
    sendJson(500, ['message' => 'La demande n’a pas été envoyée vers Zapier. Contactez-nous directement par WhatsApp.']);
}

// The lead is accepted (Zapier answered 2xx): its abandoned-form draft, if the
// form kept one, is closed so it is never reported as abandoned.
contactCloseLeadDraft($input, $env);

// Same moment, same guarantee: the request is counted in today's activity of
// its project (/activity.php). One small local file write; it never throws.
if (function_exists('activityCountLead')) activityCountLead($payload, $env, time());

// The lead is accepted (Zapier answered 2xx). The Meta server event —
// deduplicated with the browser Pixel through the browser's event ID — can no
// longer affect it: metaSendEvents() never throws and its result is ignored.
// One person is one prospect. Someone who already sent a lead for this project
// recently (page reloaded and form filled again, or another device) is passed
// on to the CRM like anyone else, but is not a second Meta Lead: no server
// event, and the browser is told so it does not fire its own.
if (contactIsRepeatLead($payload, $input, $env)) {
    sendJson(200, ['message' => CONTACT_SUCCESS_MESSAGE, 'repeat_lead' => true]);
}
$metaLead = contactMetaLeadEvent($payload, $input, $ip);
if ($metaLead === null) {
    sendJson(200, ['message' => CONTACT_SUCCESS_MESSAGE]);
}
if (contactCanFinishRequest()) {
    // LiteSpeed LSAPI (Hostinger) / PHP-FPM: the response is complete and the
    // connection closed before Meta is called; the SAPI keeps the script running.
    sendJsonAndFinish(200, ['message' => CONTACT_SUCCESS_MESSAGE]);
    metaSendEvents([$metaLead], $env, 5);
    exit;
}
// Any other SAPI gives no guarantee that code runs after the response, so the
// event is sent first, bounded to 3 s (connect + read), then the same success.
metaSendEvents([$metaLead], $env, 3);
sendJson(200, ['message' => CONTACT_SUCCESS_MESSAGE]);

function sendJson(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Marks the draft of this form session `submitted` (see /lead-draft.php). One
 * small local file write; it never throws and never changes the response.
 */
function contactCloseLeadDraft(array $input, array $env): void
{
    if (!function_exists('leadDraftMarkSubmitted')) return;
    try {
        $sessionId = sanitizeValue($input['form_session_id'] ?? '', 64);
        if ($sessionId !== '' && leadDraftEnabled($env)) {
            leadDraftMarkSubmitted(leadDraftDir($env), $sessionId, time());
        }
    } catch (Throwable $error) {
        error_log('Contact form lead draft not closed: ' . $error->getMessage());
    }
}

/** True only where the SAPI documents that the script continues after the response. */
function contactCanFinishRequest(): bool
{
    return function_exists('litespeed_finish_request') || function_exists('fastcgi_finish_request');
}

/** Completes the HTTP response and closes the connection; the script goes on. */
function sendJsonAndFinish(int $status, array $payload): void
{
    ignore_user_abort(true);
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } else {
        fastcgi_finish_request();
    }
}

/**
 * Meta `Lead` for forms that opted in by sending `meta_event_id` (the ID their
 * browser Pixel event carries). Null — and no server event — otherwise, or if
 * the Meta library is missing from the deploy.
 */
function contactMetaLeadEvent(array $payload, array $input, string $ip): ?array
{
    if (!function_exists('metaWebsiteLeadEvent')) return null;
    $eventId = sanitizeValue($input['meta_event_id'] ?? '', 80);
    if (!metaValidBrowserEventId($eventId, 'lead')) return null;

    [$firstName, $lastName] = ($payload['first_name'] ?? '') !== ''
        ? [$payload['first_name'], $payload['last_name'] ?? '']
        : metaSplitName($payload['nom_complet']);

    return metaWebsiteLeadEvent([
        'eventId' => $eventId,
        'email' => $payload['email'],
        'phone' => $payload['phoneFull'],
        'firstName' => $firstName,
        'lastName' => $lastName,
        'fbc' => $payload['fbc'],
        'fbp' => $payload['fbp'],
        'ip' => $ip,
        'userAgent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
        'sourceUrl' => metaEventSourceUrl([
            $_SERVER['HTTP_REFERER'] ?? '',
            $payload['landing_page'] ?? '',
            $payload['source'],
            $payload['landingPageUrl'],
        ]),
        'leadSource' => $payload['leadSource'],
        'contentName' => $payload['projectName'] !== '' ? $payload['projectName'] : ($payload['project'] ?? ''),
    ], time());
}

/** The browser's form session ID (a UUID), or '' when it is absent or malformed. */
function contactFormSessionId(mixed $value): string
{
    $id = sanitizeValue($value, 64);
    return preg_match('/^[A-Za-z0-9-]{16,64}$/', $id) === 1 ? $id : '';
}

/**
 * Whether this lead comes from a person the Meta ledger already knows for this
 * project (see metaLeadIsRepeat). Only for the landing form, and only for the
 * request that creates the lead. Never throws; false when in doubt.
 */
function contactIsRepeatLead(array $payload, array $input, array $env): bool
{
    if (!function_exists('metaLeadIsRepeat') || $payload['form_type'] !== 'honest_signature_7_request') return false;
    if (!metaValidBrowserEventId(sanitizeValue($input['meta_event_id'] ?? '', 80), 'lead')) return false;
    try {
        $project = $payload['projectName'] !== '' ? $payload['projectName'] : ($payload['project'] ?? '');
        return metaLeadIsRepeat($env, (string) $project, (string) $payload['phoneFull'], (string) $payload['email'], time());
    } catch (Throwable $error) {
        error_log('Contact form repeat-lead check failed: ' . $error->getMessage());
        return false;
    }
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
        $value = trim(substr($line, $separator + 1));
        $env[$key] = trim($value, "\"'");
    }
    return $env;
}

function readJsonInput(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
        sendJson(400, ['message' => 'Données invalides.']);
    }
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        sendJson(400, ['message' => 'Données invalides.']);
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

function normalizeText(string $value): string
{
    $value = mb_strtolower($value);
    $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    return trim($transliterated !== false ? $transliterated : $value);
}

function looksLikeEmail(string $value): bool
{
    return (bool) filter_var(trim($value), FILTER_VALIDATE_EMAIL);
}

function looksLikePhone(string $value): bool
{
    $raw = trim($value);
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (strlen($digits) < 8 || strlen($digits) > 15) return false;
    if (!preg_match('/^\+?[0-9][0-9\s().-]{6,}[0-9]$/', $raw)) return false;
    return !preg_match('/^(\d)\1+$/', $digits);
}

function phoneCountryOptions(): array
{
    return [
        'MA' => ['code' => '+212', 'country' => 'Morocco'],
        'FR' => ['code' => '+33', 'country' => 'France'],
        'BE' => ['code' => '+32', 'country' => 'Belgium'],
        'CH' => ['code' => '+41', 'country' => 'Switzerland'],
        'ES' => ['code' => '+34', 'country' => 'Spain'],
        'NL' => ['code' => '+31', 'country' => 'Netherlands'],
        'GB' => ['code' => '+44', 'country' => 'United Kingdom'],
        'DE' => ['code' => '+49', 'country' => 'Germany'],
        'IT' => ['code' => '+39', 'country' => 'Italy'],
        'PT' => ['code' => '+351', 'country' => 'Portugal'],
        'AE' => ['code' => '+971', 'country' => 'United Arab Emirates'],
        'SA' => ['code' => '+966', 'country' => 'Saudi Arabia'],
        'QA' => ['code' => '+974', 'country' => 'Qatar'],
        'KW' => ['code' => '+965', 'country' => 'Kuwait'],
        'US' => ['code' => '+1', 'country' => 'United States / Canada'],
        'CA' => ['code' => '+1', 'country' => 'United States / Canada'],
        'DZ' => ['code' => '+213', 'country' => 'Algeria'],
        'TN' => ['code' => '+216', 'country' => 'Tunisia'],
        'SN' => ['code' => '+221', 'country' => 'Senegal'],
        'CI' => ['code' => '+225', 'country' => 'Cote d Ivoire'],
        'EG' => ['code' => '+20', 'country' => 'Egypt'],
        'TR' => ['code' => '+90', 'country' => 'Turkey'],
        'IE' => ['code' => '+353', 'country' => 'Ireland'],
        'LU' => ['code' => '+352', 'country' => 'Luxembourg'],
        'MC' => ['code' => '+377', 'country' => 'Monaco'],
        'AT' => ['code' => '+43', 'country' => 'Austria'],
        'SE' => ['code' => '+46', 'country' => 'Sweden'],
        'NO' => ['code' => '+47', 'country' => 'Norway'],
        'DK' => ['code' => '+45', 'country' => 'Denmark'],
        'FI' => ['code' => '+358', 'country' => 'Finland'],
        'PL' => ['code' => '+48', 'country' => 'Poland'],
        'GR' => ['code' => '+30', 'country' => 'Greece'],
        'BR' => ['code' => '+55', 'country' => 'Brazil'],
        'MX' => ['code' => '+52', 'country' => 'Mexico'],
        'RU' => ['code' => '+7', 'country' => 'Russia'],
        'CN' => ['code' => '+86', 'country' => 'China'],
        'JP' => ['code' => '+81', 'country' => 'Japan'],
        'IN' => ['code' => '+91', 'country' => 'India'],
        'AU' => ['code' => '+61', 'country' => 'Australia'],
    ];
}

function normalizePhoneNumber(string $value, string $code): string
{
    $number = preg_replace('/\D+/', '', $value) ?? '';
    $codeDigits = preg_replace('/\D+/', '', $code) ?? '';
    if (str_starts_with($number, '00')) $number = substr($number, 2);
    if ($codeDigits !== '' && str_starts_with($number, $codeDigits) && strlen($number) > strlen($codeDigits) + 3) {
        $number = substr($number, strlen($codeDigits));
    }
    $number = preg_replace('/^0+/', '', $number) ?? '';
    return substr($number, 0, 20);
}

function findPhoneCountry(array $countries, string $phoneCode, string $countryCode): array
{
    $countryCode = strtoupper($countryCode);
    if ($countryCode !== '' && isset($countries[$countryCode])) {
        return [$countryCode, $countries[$countryCode]];
    }
    $phoneCodeAsIso = strtoupper($phoneCode);
    if ($phoneCodeAsIso !== '' && isset($countries[$phoneCodeAsIso])) {
        return [$phoneCodeAsIso, $countries[$phoneCodeAsIso]];
    }
    foreach ($countries as $iso => $country) {
        if ($phoneCode !== '' && $country['code'] === $phoneCode) {
            return [$iso, $country];
        }
    }
    return ['MA', $countries['MA']];
}

function normalizePhonePayload(array $input): array
{
    $countries = phoneCountryOptions();
    $phoneCodeInput = sanitizeValue($input['phoneCode'] ?? '', 8);
    $countryCodeInput = sanitizeValue($input['phoneCountryCode'] ?? '', 3);
    $phoneFullInput = sanitizeValue($input['phoneFull'] ?? '', 40);
    $telephoneInput = sanitizeValue($input['telephone'] ?? '', 40);
    [$phoneCountryCode, $countryMeta] = findPhoneCountry($countries, $phoneCodeInput, $countryCodeInput);
    $phoneCode = $countryMeta['code'];
    $phoneNumber = normalizePhoneNumber(sanitizeValue($input['phoneNumber'] ?? '', 30), $phoneCode);

    if ($phoneNumber === '') {
        $candidate = $phoneFullInput !== '' ? $phoneFullInput : $telephoneInput;
        foreach ($countries as $iso => $country) {
            $candidateDigits = preg_replace('/\D+/', '', $candidate) ?? '';
            $codeDigits = preg_replace('/\D+/', '', $country['code']) ?? '';
            if (str_starts_with(trim($candidate), $country['code']) || ($codeDigits !== '' && str_starts_with($candidateDigits, $codeDigits))) {
                $phoneCountryCode = $iso;
                $countryMeta = $country;
                $phoneCode = $country['code'];
                $phoneNumber = normalizePhoneNumber($candidate, $phoneCode);
                break;
            }
        }
    }

    $phoneCountry = $countryMeta['country'];
    $phoneFull = $phoneNumber !== '' ? $phoneCode . $phoneNumber : '';

    return [
        'telephone' => $phoneFull,
        'phoneFull' => $phoneFull,
        'phoneCode' => $phoneCode,
        'phoneCountry' => $phoneCountry,
        'phoneCountryCode' => $phoneCountryCode,
        'phoneNumber' => $phoneNumber,
    ];
}

function looksLikeName(string $value): bool
{
    $raw = trim($value);
    $parts = preg_split('/\s+/', $raw, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    if (mb_strlen($raw) < 3 || mb_strlen($raw) > 80) return false;
    if (looksLikeEmail($raw) || looksLikePhone($raw)) return false;
    if (preg_match('/\d/', $raw)) return false;
    if (!preg_match("/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/u", $raw)) return false;
    if (count($parts) < 2) return false;
    foreach ($parts as $part) {
        if (mb_strlen(str_replace(['-', "'"], '', $part)) < 2) return false;
    }
    return true;
}

function isWeakMessage(string $value): bool
{
    $text = preg_replace('/\s+/', ' ', normalizeText($value)) ?? '';
    if (mb_strlen($text) < 20) return true;
    if (preg_match('/^(test|hello|bonjour|salut|aaaa+|12345+|ok|merci)$/i', $text)) return true;
    return (bool) preg_match('/^(.)\1{5,}$/', preg_replace('/\s+/', '', $text) ?? '');
}

function hasSpamContent(array $payload, array $blockedTerms): bool
{
    $text = normalizeText(implode(' ', [
        $payload['nom_complet'],
        $payload['email'],
        $payload['telephone'],
        $payload['budget'],
        $payload['message'],
    ]));
    foreach ($blockedTerms as $term) {
        if (str_contains($text, normalizeText($term))) return true;
    }
    return (bool) preg_match('/(https?:\/\/|www\.|\.ru\b|\.xyz\b|\.top\b|\.click\b)/i', $text);
}

function hasLeadContent(array $payload): bool
{
    return $payload['nom_complet'] !== ''
        || $payload['email'] !== ''
        || $payload['telephone'] !== ''
        || $payload['budget'] !== ''
        || $payload['message'] !== '';
}

function shouldSilentlyAccept(array $payload): bool
{
    if ($payload['company_website'] !== '') return true;
    if ($payload['elapsed_ms'] > 0 && $payload['elapsed_ms'] < MIN_SUBMIT_MS) return true;
    if (!hasLeadContent($payload)) return true;

    return false;
}

function fieldOrDefault(string $value): string
{
    return $value !== '' ? $value : 'Non renseigné';
}

function validatePayload(array $input, array $validBudgets, array $blockedTerms): array
{
    $phonePayload = normalizePhonePayload($input);
    $payload = [
        'form_type' => sanitizeValue($input['form_type'] ?? '', 40),
        'nom_complet' => sanitizeValue($input['nom_complet'] ?? '', 80),
        'email' => sanitizeValue($input['email'] ?? '', 120),
        'telephone' => $phonePayload['telephone'],
        'phoneFull' => $phonePayload['phoneFull'],
        'phoneCode' => $phonePayload['phoneCode'],
        'phoneCountry' => $phonePayload['phoneCountry'],
        'phoneCountryCode' => $phonePayload['phoneCountryCode'],
        'phoneNumber' => $phonePayload['phoneNumber'],
        'budget' => sanitizeValue($input['budget'] ?? '', 30),
        'message' => sanitizeValue($input['message'] ?? '', 1200),
        'source' => sanitizeValue($input['source'] ?? '', 120),
        'company_website' => sanitizeValue($input['company_website'] ?? '', 120),
        'elapsed_ms' => (int) ($input['elapsed_ms'] ?? 0),
        // Optional simulator context. These keys follow the established
        // Guéliz/HubSpot attribution vocabulary and stay empty for every
        // existing contact form submission.
        'projectName' => sanitizeValue($input['projectName'] ?? '', 120),
        'propertyType' => sanitizeValue($input['propertyType'] ?? '', 120),
        'budgetValue' => (int) round(parseSimulatorBudget($input['budgetValue'] ?? 0)),
        'currency' => sanitizeValue($input['currency'] ?? '', 3),
        'reservationAmount' => (int) round(parseSimulatorBudget($input['reservationAmount'] ?? 0)),
        'installmentAmount' => (int) round(parseSimulatorBudget($input['installmentAmount'] ?? 0)),
        'handoverAmount' => (int) round(parseSimulatorBudget($input['handoverAmount'] ?? 0)),
        'leadSource' => sanitizeValue($input['leadSource'] ?? '', 120),
        'adPlatform' => sanitizeValue($input['adPlatform'] ?? '', 120),
        'campaign' => sanitizeValue($input['campaign'] ?? '', 200),
        'adset' => sanitizeValue($input['adset'] ?? '', 200),
        'ad' => sanitizeValue($input['ad'] ?? '', 200),
        'landingPageUrl' => sanitizeValue($input['landingPageUrl'] ?? '', 500),
        'utmSource' => sanitizeValue($input['utmSource'] ?? '', 200),
        'utmMedium' => sanitizeValue($input['utmMedium'] ?? '', 200),
        'utmCampaign' => sanitizeValue($input['utmCampaign'] ?? '', 200),
        'utmContent' => sanitizeValue($input['utmContent'] ?? '', 200),
        'utmTerm' => sanitizeValue($input['utmTerm'] ?? '', 200),
        'campaignId' => sanitizeValue($input['campaignId'] ?? '', 200),
        'adsetId' => sanitizeValue($input['adsetId'] ?? '', 200),
        'adId' => sanitizeValue($input['adId'] ?? '', 200),
        'fbclid' => sanitizeValue($input['fbclid'] ?? '', 255),
        'fbc' => sanitizeValue($input['fbc'] ?? '', 255),
        'fbp' => sanitizeValue($input['fbp'] ?? '', 255),
        'referrer' => sanitizeValue($input['referrer'] ?? '', 500),
        'submissionDate' => sanitizeValue($input['submissionDate'] ?? '', 60),
        // Landing-page lead keys (/honest-signature-7/). Additive: empty for
        // every other form, and no existing key changes meaning.
        'first_name' => sanitizeValue($input['first_name'] ?? '', 40),
        'last_name' => sanitizeValue($input['last_name'] ?? '', 40),
        'purchase_intent' => sanitizeValue($input['purchase_intent'] ?? '', 60),
        'project' => sanitizeValue($input['project'] ?? '', 120),
        'lead_origin' => sanitizeValue($input['lead_origin'] ?? '', 120),
        'landing_name' => sanitizeValue($input['landing_name'] ?? '', 120),
        'landing_page' => sanitizeValue($input['landing_page'] ?? '', 500),
        'utm_source' => sanitizeValue($input['utm_source'] ?? '', 200),
        'utm_medium' => sanitizeValue($input['utm_medium'] ?? '', 200),
        'utm_campaign' => sanitizeValue($input['utm_campaign'] ?? '', 200),
        'utm_content' => sanitizeValue($input['utm_content'] ?? '', 200),
        'utm_term' => sanitizeValue($input['utm_term'] ?? '', 200),
        // Project metadata and post-lead qualification (/honest-signature-7/).
        // Additive: empty for every other form. `lead_stage` is "lead" for
        // the request that creates the lead and "qualification" for the
        // optional follow-up that completes it.
        'project_name' => sanitizeValue($input['project_name'] ?? '', 120),
        'project_location' => sanitizeValue($input['project_location'] ?? '', 120),
        'lead_source' => sanitizeValue($input['lead_source'] ?? '', 120),
        'lead_stage' => sanitizeValue($input['lead_stage'] ?? '', 40),
        // One ID per form session, the same in the lead and in its qualification
        // follow-up, so the CRM side can tie the second hook to the first.
        'form_session_id' => contactFormSessionId($input['form_session_id'] ?? ''),
        'contact_preference' => sanitizeValue($input['contact_preference'] ?? '', 40),
        'visit_preference' => sanitizeValue($input['visit_preference'] ?? '', 120),
        // Snapchat click ID (`ScCid` in the landing URL) — the counterpart of fbclid.
        'sc_click_id' => sanitizeValue($input['sc_click_id'] ?? '', 255),
    ];
    return [$payload, []];
}

function clientIp(): string
{
    $source = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    return trim(explode(',', (string) $source)[0]);
}

function isLocalIp(string $ip): bool
{
    return in_array($ip, ['127.0.0.1', '::1'], true);
}

function isRateLimited(string $ip): bool
{
    $safeIp = preg_replace('/[^A-Za-z0-9_.:-]/', '_', $ip) ?: 'unknown';
    $filePath = sys_get_temp_dir() . '/emara_contact_' . hash('sha256', $safeIp) . '.json';
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

function contactWebhookUrl(array $env): string
{
    return trim($env['CONTACT_WEBHOOK_URL'] ?? '') ?: CONTACT_WEBHOOK_URL_FALLBACK;
}

function contactToEmail(array $env): string
{
    $to = trim($env['CONTACT_TO'] ?? '');
    if ($to === '') {
        $fromEnv = getenv('CONTACT_TO');
        $to = is_string($fromEnv) ? trim($fromEnv) : '';
    }
    return $to !== '' ? $to : 'contact@emaraestates.com';
}

function sendLeadToZapier(array $payload, array $env, string $ip): void
{
    $webhookUrl = contactWebhookUrl($env);
    if ($webhookUrl === '') {
        throw new RuntimeException('Zapier webhook URL missing.');
    }

    $zapierPayload = [
        'form_type' => $payload['form_type'],
        'nom_complet' => $payload['nom_complet'],
        'email' => $payload['email'],
        'telephone' => $payload['telephone'],
        'phoneFull' => $payload['phoneFull'],
        'phoneCode' => $payload['phoneCode'],
        'phoneCountry' => $payload['phoneCountry'],
        'phoneCountryCode' => $payload['phoneCountryCode'],
        'phoneNumber' => $payload['phoneNumber'],
        'budget' => $payload['budget'],
        'message' => $payload['message'],
        'company_website' => $payload['company_website'],
        'elapsed_ms' => $payload['elapsed_ms'],
        'source' => $payload['source'] !== '' ? $payload['source'] : 'emaraestates.com',
        'form_id' => $payload['form_type'] === 'simulateur_request' ? 'simulateurForm' : 'contactForm',
        'submitted_at' => date(DATE_ATOM),
        'ip' => $ip,
        'user_agent' => sanitizeValue($_SERVER['HTTP_USER_AGENT'] ?? '', 300),
        'page_url' => leadPageUrl($payload),
        'projectName' => $payload['projectName'],
        'propertyType' => $payload['propertyType'],
        'budgetValue' => $payload['budgetValue'],
        'currency' => $payload['currency'],
        'reservationAmount' => $payload['reservationAmount'],
        'installmentAmount' => $payload['installmentAmount'],
        'handoverAmount' => $payload['handoverAmount'],
        'leadSource' => $payload['leadSource'],
        'adPlatform' => $payload['adPlatform'],
        'campaign' => $payload['campaign'],
        'adset' => $payload['adset'],
        'ad' => $payload['ad'],
        'landingPageUrl' => $payload['landingPageUrl'],
        'utmSource' => $payload['utmSource'],
        'utmMedium' => $payload['utmMedium'],
        'utmCampaign' => $payload['utmCampaign'],
        'utmContent' => $payload['utmContent'],
        'utmTerm' => $payload['utmTerm'],
        'campaignId' => $payload['campaignId'],
        'adsetId' => $payload['adsetId'],
        'adId' => $payload['adId'],
        'fbclid' => $payload['fbclid'],
        'fbc' => $payload['fbc'],
        'fbp' => $payload['fbp'],
        'referrer' => $payload['referrer'],
        'submissionDate' => $payload['submissionDate'],
        'first_name' => $payload['first_name'],
        'last_name' => $payload['last_name'],
        // The form has one "Téléphone / WhatsApp" field, so both carry it.
        'phone' => $payload['phoneFull'],
        'whatsapp' => $payload['phoneFull'],
        'purchase_intent' => $payload['purchase_intent'],
        'project' => $payload['project'],
        'lead_origin' => $payload['lead_origin'],
        'landing_name' => $payload['landing_name'],
        'landing_page' => $payload['landing_page'],
        'utm_source' => $payload['utm_source'],
        'utm_medium' => $payload['utm_medium'],
        'utm_campaign' => $payload['utm_campaign'],
        'utm_content' => $payload['utm_content'],
        'utm_term' => $payload['utm_term'],
        'project_name' => $payload['project_name'],
        'project_location' => $payload['project_location'],
        'lead_source' => $payload['lead_source'],
        'lead_stage' => $payload['lead_stage'],
        'form_session_id' => $payload['form_session_id'],
        'contact_preference' => $payload['contact_preference'],
        'visit_preference' => $payload['visit_preference'],
        'sc_click_id' => $payload['sc_click_id'],
    ];

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => json_encode($zapierPayload, JSON_UNESCAPED_UNICODE),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ]);
    $response = file_get_contents($webhookUrl, false, $context);
    $statusLine = $http_response_header[0] ?? '';

    if ($response === false || !preg_match('/\s2\d\d\s/', $statusLine)) {
        throw new RuntimeException('Zapier webhook failed: ' . ($statusLine ?: 'no response'));
    }
}

function smtpRead($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $data;
}

function smtpCommand($socket, string $command, array $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP command failed: ' . $code);
    }
    return $response;
}

function encodeHeader(string $value): string
{
    return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
}

function sendLeadEmail(array $payload, array $env): void
{
    try {
        sendLeadEmailWithPhpMail($payload, $env);
        return;
    } catch (Throwable $error) {
        error_log('PHP mail fallback to SMTP: ' . $error->getMessage());
    }

    sendLeadEmailWithSmtp($payload, $env);
}

function leadPageUrl(array $payload): string
{
    if (($payload['landingPageUrl'] ?? '') !== '') {
        return $payload['landingPageUrl'];
    }
    $referer = sanitizeValue($_SERVER['HTTP_REFERER'] ?? '', 500);
    if ($referer !== '') {
        return $referer;
    }
    if (($payload['source'] ?? '') !== '') {
        return $payload['source'];
    }
    return 'emaraestates.com';
}

function leadEmailBody(array $payload): string
{
    $lines = [
        'Nouvelle demande — Emara Estates',
        '',
        'Nom complet :',
        fieldOrDefault($payload['nom_complet']),
        '',
        'Email :',
        fieldOrDefault($payload['email']),
        '',
        'Téléphone :',
        fieldOrDefault($payload['telephone']),
        '',
        'Budget :',
        fieldOrDefault($payload['budget']),
        '',
        'Message :',
        fieldOrDefault($payload['message']),
        '',
        'Page source :',
        leadPageUrl($payload),
        '',
        'Date :',
        date('d/m/Y H:i'),
    ];

    if (($payload['form_type'] ?? '') === 'simulateur_request') {
        $lines = array_merge($lines, [
            '',
            'Projet :',
            fieldOrDefault($payload['projectName']),
            '',
            'Type de bien :',
            fieldOrDefault($payload['propertyType']),
            '',
            'Échéancier indicatif (' . fieldOrDefault($payload['currency']) . ') :',
            'Réservation 30 % : ' . $payload['reservationAmount'],
            '3 versements de 15 % : ' . $payload['installmentAmount'] . ' chacun',
            'Remise des clés 25 % : ' . $payload['handoverAmount'],
            '',
            'Campagne :',
            fieldOrDefault($payload['utmCampaign']),
        ]);
    }

    return implode("\r\n", $lines);
}

function sendLeadEmailWithPhpMail(array $payload, array $env): void
{
    $to = contactToEmail($env);
    $from = trim($env['CONTACT_FROM'] ?? '') ?: contactToEmail($env);
    $subject = 'Nouvelle demande — Emara Estates';
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . ($payload['email'] !== ''
            ? encodeHeader($payload['nom_complet'] !== '' ? $payload['nom_complet'] : 'Visiteur') . ' <' . $payload['email'] . '>'
            : 'Emara Estates <contact@emaraestates.com>'),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $sent = mail($to, encodeHeader($subject), leadEmailBody($payload), implode("\r\n", $headers));
    if (!$sent) {
        throw new RuntimeException('mail() returned false.');
    }
}

function sendLeadEmailWithSmtp(array $payload, array $env): void
{
    $host = $env['SMTP_HOST'] ?? 'smtp.gmail.com';
    $port = (int) ($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? '';
    $pass = $env['SMTP_PASS'] ?? '';
    $to = contactToEmail($env);
    $from = trim($env['CONTACT_FROM'] ?? '') ?: $user;

    if ($host === '' || $port <= 0 || $user === '' || $pass === '' || $from === '') {
        throw new RuntimeException('SMTP configuration missing.');
    }

    $subject = 'Nouvelle demande — Emara Estates';
    $body = leadEmailBody($payload);
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'To: ' . $to,
        'Reply-To: ' . ($payload['email'] !== ''
            ? encodeHeader($payload['nom_complet'] !== '' ? $payload['nom_complet'] : 'Visiteur') . ' <' . $payload['email'] . '>'
            : 'Emara Estates <contact@emaraestates.com>'),
        'Subject: ' . encodeHeader($subject),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Date: ' . date(DATE_RFC2822),
    ];
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n";

    $socket = stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr);
    }
    stream_set_timeout($socket, 15);

    try {
        $greeting = smtpRead($socket);
        if ((int) substr($greeting, 0, 3) !== 220) throw new RuntimeException('SMTP greeting failed.');
        smtpCommand($socket, 'EHLO emaraestates.com', [250]);
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode($user), [334]);
        smtpCommand($socket, base64_encode($pass), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $from . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        fwrite($socket, str_replace("\r\n.", "\r\n..", $message) . "\r\n.\r\n");
        $dataResponse = smtpRead($socket);
        if (!in_array((int) substr($dataResponse, 0, 3), [250], true)) {
            throw new RuntimeException('SMTP data failed.');
        }
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function formatFrenchNumber(int $value): string
{
    return number_format($value, 0, ',', ' ');
}

function parseSimulatorBudget(mixed $value): float
{
    $normalized = preg_replace('/[^\d.,]/', '', (string) ($value ?? '')) ?? '';
    $normalized = str_replace(',', '.', $normalized);
    if ($normalized === '' || !is_numeric($normalized)) {
        return 0.0;
    }
    $budget = (float) $normalized;
    return $budget > 0 ? $budget : 0.0;
}

function calculateSimulatorApport(float $budget, string $currency): array
{
    if ($currency === 'EUR') {
        $apportEur = (int) round($budget * 0.30);
        $apportMad = (int) round($apportEur * 10);
        return [$apportMad, $apportEur];
    }

    $apportMad = (int) round($budget * 0.30);
    $apportEur = (int) round($apportMad / 10);
    return [$apportMad, $apportEur];
}

function simulatorBudgetDisplay(float $budget, string $currency): string
{
    return formatFrenchNumber((int) round($budget)) . ' ' . $currency;
}

function simulatorSourcePage(array $input): string
{
    $source = sanitizeValue($input['source_page'] ?? '', 500);
    if ($source !== '') {
        return $source;
    }
    $referer = sanitizeValue($_SERVER['HTTP_REFERER'] ?? '', 500);
    return $referer !== '' ? $referer : 'emaraestates.com';
}

function simulatorEmailBody(array $payload): string
{
    return implode("\r\n", [
        'Nouvelle simulation d’apport depuis le site Emara Estates.',
        '',
        'Email client :',
        $payload['email'],
        '',
        'Budget saisi :',
        $payload['budget_display'],
        '',
        'Typologie :',
        fieldOrDefault($payload['typologie']),
        '',
        'Apport estimé :',
        $payload['apport_mad_display'] . ' / ' . $payload['apport_eur_display'],
        '',
        'Page source :',
        $payload['source_page'],
        '',
        'Date :',
        date('d/m/Y H:i'),
    ]);
}

function sendSimulatorEmailWithPhpMail(array $payload, array $env): void
{
    $to = contactToEmail($env);
    $from = trim($env['CONTACT_FROM'] ?? '') ?: contactToEmail($env);
    $subject = 'Nouveau lead simulateur d’apport — Emara Estates';
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . encodeHeader('Visiteur') . ' <' . $payload['email'] . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $sent = mail($to, encodeHeader($subject), simulatorEmailBody($payload), implode("\r\n", $headers));
    if (!$sent) {
        throw new RuntimeException('mail() returned false.');
    }
}

function sendSimulatorEmailWithSmtp(array $payload, array $env): void
{
    $host = $env['SMTP_HOST'] ?? 'smtp.gmail.com';
    $port = (int) ($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? '';
    $pass = $env['SMTP_PASS'] ?? '';
    $to = contactToEmail($env);
    $from = trim($env['CONTACT_FROM'] ?? '') ?: $user;

    if ($host === '' || $port <= 0 || $user === '' || $pass === '' || $from === '') {
        throw new RuntimeException('SMTP configuration missing.');
    }

    $subject = 'Nouveau lead simulateur d’apport — Emara Estates';
    $body = simulatorEmailBody($payload);
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'To: ' . $to,
        'Reply-To: ' . encodeHeader('Visiteur') . ' <' . $payload['email'] . '>',
        'Subject: ' . encodeHeader($subject),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Date: ' . date(DATE_RFC2822),
    ];
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n";

    $socket = stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr);
    }
    stream_set_timeout($socket, 15);

    try {
        $greeting = smtpRead($socket);
        if ((int) substr($greeting, 0, 3) !== 220) throw new RuntimeException('SMTP greeting failed.');
        smtpCommand($socket, 'EHLO emaraestates.com', [250]);
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode($user), [334]);
        smtpCommand($socket, base64_encode($pass), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $from . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        fwrite($socket, str_replace("\r\n.", "\r\n..", $message) . "\r\n.\r\n");
        $dataResponse = smtpRead($socket);
        if (!in_array((int) substr($dataResponse, 0, 3), [250], true)) {
            throw new RuntimeException('SMTP data failed.');
        }
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function sendSimulatorEmail(array $payload, array $env): void
{
    try {
        sendSimulatorEmailWithPhpMail($payload, $env);
        return;
    } catch (Throwable $error) {
        error_log('Apport simulator PHP mail fallback to SMTP: ' . $error->getMessage());
    }

    sendSimulatorEmailWithSmtp($payload, $env);
}

function handleApportSimulator(array $input, array $env, string $ip): never
{
    if (sanitizeValue($input['company_website'] ?? '', 120) !== '') {
        sendJson(200, [
            'message' => 'Estimation calculée.',
            'result' => [
                'budget_display' => '0 MAD',
                'apport_mad_display' => '0 MAD',
                'apport_eur_display' => '0 €',
            ],
        ]);
    }

    if (isRateLimited($ip)) {
        sendJson(429, ['message' => 'Trop de demandes envoyées. Réessayez plus tard.']);
    }

    $email = sanitizeValue($input['email'] ?? '', 120);
    $currency = strtoupper(sanitizeValue($input['currency'] ?? 'MAD', 3));
    if (!in_array($currency, ['MAD', 'EUR'], true)) {
        $currency = 'MAD';
    }

    $budget = parseSimulatorBudget($input['budget_value'] ?? '');
    $typologie = sanitizeValue($input['typologie'] ?? '', 60);

    $errors = [];
    if ($budget <= 0) {
        $errors['budget'] = 'Indiquez votre budget pour calculer l’apport.';
    }
    if ($email === '') {
        $errors['email'] = 'Indiquez votre email pour recevoir votre estimation.';
    } elseif (!looksLikeEmail($email)) {
        $errors['email'] = 'Indiquez une adresse email valide.';
    }

    if ($errors) {
        sendJson(422, ['message' => 'Corrigez les champs indiqués.', 'errors' => $errors]);
    }

    [$apportMad, $apportEur] = calculateSimulatorApport($budget, $currency);
    $payload = [
        'email' => $email,
        'budget_display' => simulatorBudgetDisplay($budget, $currency),
        'typologie' => $typologie,
        'apport_mad_display' => formatFrenchNumber($apportMad) . ' MAD',
        'apport_eur_display' => formatFrenchNumber($apportEur) . ' €',
        'source_page' => simulatorSourcePage($input),
    ];

    try {
        sendSimulatorEmail($payload, $env);
    } catch (Throwable $error) {
        error_log('Apport simulator email error: ' . $error->getMessage());
        sendJson(500, ['message' => 'Une erreur est survenue. Vous pouvez nous contacter directement.']);
    }

    sendJson(200, [
        'message' => 'Estimation calculée.',
        'result' => [
            'budget_display' => $payload['budget_display'],
            'apport_mad' => $apportMad,
            'apport_eur' => $apportEur,
            'apport_mad_display' => $payload['apport_mad_display'],
            'apport_eur_display' => $payload['apport_eur_display'],
            'typologie' => $typologie,
        ],
    ]);
}
