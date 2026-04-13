<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_BODY_BYTES = 16384;
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 20;
const TURNSTILE_SECRET_FALLBACK = '0x4AAAAAAC8jSxGLqAltGhC5jvWNSGSMy4c';
const CONTACT_DEBUG_KEY = 'emara-contact-debug-20260413';

$validBudgets = ['1 – 3 M MAD', '3 – 5 M MAD', '5 – 10 M MAD', '10 M+ MAD'];
$blockedTerms = [
    'refonte', 'refondre', 'seo', 'referencement', 'backlink', 'agence web',
    'creation de site', 'site internet', 'marketing digital', 'audit gratuit',
    'devis gratuit', 'visibilite', 'ranking', 'google ads', 'wordpress',
    'shopify', 'web design', 'webdesign', 'traffic', 'trafic', 'lead generation',
    'guest post', 'link building'
];

$env = loadEnv(__DIR__ . '/.env');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['debug'] ?? '') === CONTACT_DEBUG_KEY) {
    sendJson(200, [
        'php' => PHP_VERSION,
        'env_loaded' => is_file(__DIR__ . '/.env'),
        'turnstile_secret_configured' => trim($env['TURNSTILE_SECRET'] ?? '') !== '' || TURNSTILE_SECRET_FALLBACK !== '',
        'smtp_host' => $env['SMTP_HOST'] ?? 'smtp.gmail.com',
        'smtp_user_configured' => trim($env['SMTP_USER'] ?? '') !== '',
        'smtp_pass_configured' => trim($env['SMTP_PASS'] ?? '') !== '',
        'allow_url_fopen' => (bool) ini_get('allow_url_fopen'),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['message' => 'Méthode non autorisée.']);
}

$input = readJsonInput();
$ip = clientIp();

[$payload, $errors] = validatePayload($input, $validBudgets, $blockedTerms);
if ($errors) {
    sendJson(422, ['message' => 'Corrigez les champs indiqués.', 'errors' => $errors]);
}

$turnstileSecret = trim($env['TURNSTILE_SECRET'] ?? '') ?: TURNSTILE_SECRET_FALLBACK;
if (!verifyTurnstile($payload['cf_turnstile_response'], $ip, $turnstileSecret)) {
    sendJson(403, ['message' => 'Vérification anti-robot refusée.']);
}

if (isRateLimited($ip)) {
    sendJson(429, ['message' => 'Trop de demandes envoyées. Réessayez plus tard.']);
}

try {
    sendLeadEmail($payload, $env);
    sendJson(200, ['message' => 'Merci, votre demande a bien été envoyée.']);
} catch (Throwable $error) {
    error_log('Contact form email error: ' . $error->getMessage());
    sendJson(500, ['message' => 'Erreur serveur. Contactez-nous directement par WhatsApp.']);
}

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

function validatePayload(array $input, array $validBudgets, array $blockedTerms): array
{
    $payload = [
        'nom_complet' => sanitizeValue($input['nom_complet'] ?? '', 80),
        'email' => sanitizeValue($input['email'] ?? '', 120),
        'telephone' => sanitizeValue($input['telephone'] ?? '', 30),
        'budget' => sanitizeValue($input['budget'] ?? '', 30),
        'message' => sanitizeValue($input['message'] ?? '', 1200),
        'company_website' => sanitizeValue($input['company_website'] ?? '', 120),
        'form_token' => sanitizeValue($input['form_token'] ?? '', 128),
        'cf_turnstile_response' => sanitizeValue($input['cf-turnstile-response'] ?? $input['cf_turnstile_response'] ?? '', 2048),
        'elapsed_ms' => (int) ($input['elapsed_ms'] ?? 0),
    ];
    $errors = [];

    if ($payload['company_website'] !== '') $errors['form'] = 'Soumission refusée.';
    if (mb_strlen($payload['form_token']) < 16) $errors['form'] = 'Soumission refusée.';
    if ($payload['elapsed_ms'] < 4000) $errors['form'] = 'Soumission trop rapide.';
    if (!looksLikeName($payload['nom_complet'])) $errors['nom_complet'] = 'Indiquez un vrai nom complet, sans email ni numéro.';
    if (!looksLikeEmail($payload['email'])) $errors['email'] = 'Indiquez une adresse email valide.';
    if (looksLikePhone($payload['email'])) $errors['email'] = 'Le téléphone doit être dans le champ Téléphone.';
    if (!looksLikePhone($payload['telephone'])) $errors['telephone'] = 'Indiquez un vrai numéro de téléphone.';
    if (looksLikeEmail($payload['telephone'])) $errors['telephone'] = 'L’email doit être dans le champ Email.';
    if (!in_array($payload['budget'], $validBudgets, true)) $errors['budget'] = 'Choisissez un budget dans la liste.';
    if (isWeakMessage($payload['message'])) $errors['message'] = 'Décrivez votre projet en au moins 20 caractères.';
    if (hasSpamContent($payload, $blockedTerms)) $errors['message'] = 'Ce message ressemble à une prospection ou contient un lien non autorisé.';
    if ($payload['cf_turnstile_response'] === '') $errors['form'] = 'Vérification anti-robot requise.';

    return [$payload, $errors];
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

function verifyTurnstile(string $token, string $ip, string $secret): bool
{
    if ($token === '__local_turnstile_bypass__' && isLocalIp($ip)) return true;
    if ($secret === '') {
        error_log('Turnstile verification failed: missing TURNSTILE_SECRET in .env');
        return false;
    }

    $body = http_build_query([
        'secret' => $secret,
        'response' => $token,
        'remoteip' => $ip,
    ]);
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $body,
            'timeout' => 8,
        ],
    ]);
    $response = file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context);
    if ($response === false) {
        $error = error_get_last();
        error_log('Turnstile verification failed: Cloudflare request failed' . ($error ? ' - ' . $error['message'] : ''));
        return false;
    }
    $result = json_decode($response, true);
    if (!is_array($result)) return false;
    error_log('Turnstile siteverify response: ' . json_encode($result, JSON_UNESCAPED_UNICODE));
    if (empty($result['success'])) {
        $codes = isset($result['error-codes']) && is_array($result['error-codes'])
            ? implode(', ', $result['error-codes'])
            : 'unknown';
        error_log('Turnstile verification failed: ' . $codes);
        return false;
    }
    return true;
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
    $host = $env['SMTP_HOST'] ?? 'smtp.gmail.com';
    $port = (int) ($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? '';
    $pass = $env['SMTP_PASS'] ?? '';
    $to = $env['CONTACT_TO'] ?? 'contact@emaraestates.com';
    $from = $env['CONTACT_FROM'] ?? $user;

    if ($host === '' || $port <= 0 || $user === '' || $pass === '' || $from === '') {
        throw new RuntimeException('SMTP configuration missing.');
    }

    $subject = 'Nouvelle demande Emara Estates';
    $body = implode("\r\n", [
        'Nouvelle demande depuis emaraestates.com',
        '',
        'Nom complet: ' . $payload['nom_complet'],
        'Email: ' . $payload['email'],
        'Téléphone: ' . $payload['telephone'],
        'Budget: ' . $payload['budget'],
        '',
        'Message:',
        $payload['message'],
    ]);
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'To: ' . $to,
        'Reply-To: ' . $payload['nom_complet'] . ' <' . $payload['email'] . '>',
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
