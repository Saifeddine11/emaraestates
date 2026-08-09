<?php
declare(strict_types=1);

/**
 * Dedicated recruitment applications endpoint.
 * POST multipart/form-data → PHP mail() (same delivery method as contact.php email).
 * No SMTP. No Gmail SMTP. No HubSpot. No Zapier.
 * CV is stored privately; the team email includes a non-guessable download link
 * (contact.php mail() does not support attachments).
 */

ob_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_CV_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 8;
const MIN_SUBMIT_MS = 2500;
const RECRUITMENT_DEBUG_KEY = 'emara-recruit-debug-20260809';
const RECRUITMENT_TO_DEFAULT = 'contact@emaraestates.com';
const RECRUITMENT_FROM_DEFAULT = 'contact@emaraestates.com';

$allowedSalesExperience = [
    'Non',
    "Moins d'un an",
    '1 à 3 ans',
    'Plus de 3 ans',
];
$allowedRealEstate = ['Oui', 'Non'];
$allowedSalesClosed = [
    'Aucune',
    '1 à 5',
    '6 à 15',
    'Plus de 15',
];
$allowedClosing = [
    'Débutant',
    'Intermédiaire',
    'Confirmé',
    'Excellent',
];

$env = loadEnv(__DIR__ . '/.env');

if (
    $_SERVER['REQUEST_METHOD'] === 'GET'
    && ($_GET['debug'] ?? '') === RECRUITMENT_DEBUG_KEY
) {
    $cvDir = cvStorageDir();
    $cvCount = 0;
    if (is_dir($cvDir)) {
        foreach (scandir($cvDir) ?: [] as $entry) {
            if (str_ends_with(strtolower($entry), '.pdf')) {
                $cvCount += 1;
            }
        }
    }

    sendJson(200, [
        'success' => true,
        'php' => PHP_VERSION,
        'delivery' => 'php_mail',
        'smtp_used' => false,
        'env_file' => is_file(__DIR__ . '/.env'),
        'recruitment_to' => recruitmentToEmail($env),
        'contact_from' => recruitmentFromEmail($env),
        'cv_storage_writable' => is_writable($cvDir) || is_writable(dirname($cvDir)),
        'cv_stored_count' => $cvCount,
        'upload_max_filesize' => (string) ini_get('upload_max_filesize'),
        'post_max_size' => (string) ini_get('post_max_size'),
        'file_uploads' => (string) ini_get('file_uploads'),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['success' => false, 'error' => 'Méthode non autorisée.']);
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
    error_log('Recruitment apply: empty POST/FILES with CONTENT_LENGTH=' . $contentLength);
    sendJson(413, [
        'success' => false,
        'error' => 'Le fichier est trop volumineux pour le serveur. Utilisez un PDF de 5 MB maximum.',
    ]);
}

$ip = clientIp();
$input = readMultipartInput();

if (sanitizeValue($input['fields']['company_website'] ?? '', 120) !== '') {
    sendJson(200, ['success' => true]);
}

[$payload, $errors] = validateApplication($input['fields'], $input['cv'], [
    'sales_experience' => $allowedSalesExperience,
    'real_estate_experience' => $allowedRealEstate,
    'sales_closed_12m' => $allowedSalesClosed,
    'closing_level' => $allowedClosing,
]);

if (($payload['elapsed_ms'] ?? 0) > 0 && $payload['elapsed_ms'] < MIN_SUBMIT_MS) {
    sendJson(200, ['success' => true]);
}

if ($errors) {
    $first = (string) reset($errors);
    sendJson(422, [
        'success' => false,
        'error' => $first !== '' ? $first : 'Corrigez les champs indiqués.',
        'errors' => $errors,
    ]);
}

if (isRateLimited($ip)) {
    sendJson(429, [
        'success' => false,
        'error' => 'Trop de candidatures envoyées. Réessayez plus tard.',
    ]);
}

try {
    if (($payload['cv_bytes'] ?? '') === '' || ($payload['cv_filename'] ?? '') === '') {
        throw new RuntimeException('CV attachment could not be read.');
    }

    $cvMeta = storeCvPrivately($payload);
    $payload['cv_token'] = $cvMeta['token'];
    $payload['cv_download_url'] = $cvMeta['url'];

    sendRecruitmentEmailsWithPhpMail($payload, $env);

    sendJson(200, [
        'success' => true,
        'first_name' => $payload['first_name'],
    ]);
} catch (Throwable $error) {
    error_log('Recruitment apply error: ' . $error->getMessage());
    sendJson(500, [
        'success' => false,
        'error' => publicRecruitmentError($error),
    ]);
}

function sendJson(int $status, array $payload): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function loadEnv(string $filePath): array
{
    if (!is_file($filePath)) {
        return [];
    }
    $env = [];
    foreach (file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $separator = strpos($line, '=');
        if ($separator === false) {
            continue;
        }
        $key = trim(substr($line, 0, $separator));
        $value = trim(substr($line, $separator + 1));
        $env[$key] = trim($value, "\"'");
    }
    return $env;
}

function publicRecruitmentError(Throwable $error): string
{
    $message = $error->getMessage();
    $normalized = strtolower($message);

    if (str_contains($normalized, 'cv') && str_contains($normalized, 'stor')) {
        return 'CV could not be stored securely';
    }
    if (str_contains($normalized, 'cv')) {
        return 'CV attachment could not be read';
    }
    if (str_contains($normalized, 'mail()')) {
        return 'Server mail() send failed';
    }
    if (str_contains($normalized, 'recruitment_email_to')) {
        return 'RECRUITMENT_EMAIL_TO is invalid';
    }

    return 'Votre candidature n’a pas pu être envoyée. Réessayez dans un moment.';
}

function sanitizeValue(mixed $value, int $maxLength): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) ($value ?? '')) ?? '';
    $value = str_replace(['<', '>'], '', $value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, $maxLength);
}

function looksLikeEmail(string $value): bool
{
    return (bool) filter_var(trim($value), FILTER_VALIDATE_EMAIL);
}

function looksLikePhone(string $value): bool
{
    $raw = trim($value);
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if (strlen($digits) < 8 || strlen($digits) > 15) {
        return false;
    }
    if (!preg_match('/^\+?[0-9][0-9\s().-]{6,}[0-9]$/', $raw)) {
        return false;
    }
    return !preg_match('/^(\d)\1+$/', $digits);
}

function looksLikeNamePart(string $value): bool
{
    $raw = trim($value);
    if (mb_strlen($raw) < 2 || mb_strlen($raw) > 60) {
        return false;
    }
    if (looksLikeEmail($raw) || looksLikePhone($raw) || preg_match('/\d/', $raw)) {
        return false;
    }
    return (bool) preg_match("/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/u", $raw);
}

function clientIp(): string
{
    $source = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    return trim(explode(',', (string) $source)[0]);
}

function isRateLimited(string $ip): bool
{
    $dir = sys_get_temp_dir() . '/emara-recruitment-rate';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return false;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $entry = ['count' => 0, 'reset' => $now + RATE_LIMIT_WINDOW];

    if (is_file($file)) {
        $decoded = json_decode((string) file_get_contents($file), true);
        if (is_array($decoded)) {
            $entry = [
                'count' => (int) ($decoded['count'] ?? 0),
                'reset' => (int) ($decoded['reset'] ?? ($now + RATE_LIMIT_WINDOW)),
            ];
        }
    }

    if ($entry['reset'] <= $now) {
        $entry = ['count' => 0, 'reset' => $now + RATE_LIMIT_WINDOW];
    }

    $entry['count'] += 1;
    file_put_contents($file, json_encode($entry), LOCK_EX);

    return $entry['count'] > RATE_LIMIT_MAX;
}

/**
 * @return array{fields: array<string, string>, cv: ?array}
 */
function readMultipartInput(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (!str_contains(strtolower($contentType), 'multipart/form-data')) {
        sendJson(400, ['success' => false, 'error' => 'Format de requête invalide.']);
    }

    $fields = [];
    foreach ($_POST as $key => $value) {
        if (is_string($value)) {
            $fields[(string) $key] = $value;
        }
    }

    $cv = null;
    if (isset($_FILES['cv']) && is_array($_FILES['cv'])) {
        $cv = $_FILES['cv'];
    }

    return ['fields' => $fields, 'cv' => $cv];
}

/**
 * @param array<string, string> $fields
 * @param array<string, list<string>> $enums
 * @return array{0: array<string, mixed>, 1: array<string, string>}
 */
function validateApplication(array $fields, ?array $cv, array $enums): array
{
    $errors = [];
    $payload = [
        'sales_experience' => sanitizeValue($fields['sales_experience'] ?? '', 80),
        'real_estate_experience' => sanitizeValue($fields['real_estate_experience'] ?? '', 40),
        'sales_closed_12m' => sanitizeValue($fields['sales_closed_12m'] ?? '', 40),
        'closing_level' => sanitizeValue($fields['closing_level'] ?? '', 40),
        'first_name' => sanitizeValue($fields['first_name'] ?? '', 60),
        'last_name' => sanitizeValue($fields['last_name'] ?? '', 60),
        'email' => sanitizeValue($fields['email'] ?? '', 120),
        'telephone' => sanitizeValue($fields['telephone'] ?? ($fields['phone'] ?? ''), 40),
        'utm_source' => sanitizeValue($fields['utm_source'] ?? '', 120),
        'utm_medium' => sanitizeValue($fields['utm_medium'] ?? '', 120),
        'utm_campaign' => sanitizeValue($fields['utm_campaign'] ?? '', 120),
        'utm_content' => sanitizeValue($fields['utm_content'] ?? '', 120),
        'utm_term' => sanitizeValue($fields['utm_term'] ?? '', 120),
        'page_url' => sanitizeValue($fields['page_url'] ?? '', 500),
        'referrer' => sanitizeValue($fields['referrer'] ?? '', 500),
        'source' => 'recruitment_website',
        'elapsed_ms' => (int) ($fields['elapsed_ms'] ?? 0),
        'submitted_at' => date('d/m/Y H:i'),
        'cv_bytes' => '',
        'cv_filename' => '',
        'cv_mime' => 'application/pdf',
    ];

    foreach ($enums as $key => $allowed) {
        if (!in_array($payload[$key], $allowed, true)) {
            $errors[$key] = 'Veuillez sélectionner une option.';
        }
    }

    if (!looksLikeNamePart($payload['first_name'])) {
        $errors['first_name'] = 'Prénom invalide.';
    }
    if (!looksLikeNamePart($payload['last_name'])) {
        $errors['last_name'] = 'Nom invalide.';
    }
    if (!looksLikeEmail($payload['email'])) {
        $errors['email'] = 'Email invalide.';
    }
    if (!looksLikePhone($payload['telephone'])) {
        $errors['telephone'] = 'Téléphone invalide.';
    }

    [$cvOk, $cvError, $cvData] = validateCvUpload($cv, $payload['first_name'], $payload['last_name']);
    if (!$cvOk) {
        $errors['cv'] = $cvError ?? 'CV invalide.';
    } else {
        $payload['cv_bytes'] = $cvData['bytes'];
        $payload['cv_filename'] = $cvData['filename'];
        $payload['cv_mime'] = $cvData['mime'];
    }

    return [$payload, $errors];
}

/**
 * @return array{0: bool, 1: ?string, 2: array{bytes: string, filename: string, mime: string}}
 */
function validateCvUpload(?array $cv, string $firstName, string $lastName): array
{
    $empty = ['bytes' => '', 'filename' => '', 'mime' => 'application/pdf'];
    if ($cv === null) {
        return [false, 'Veuillez joindre votre CV (PDF).', $empty];
    }

    $error = (int) ($cv['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return [false, 'Veuillez joindre votre CV (PDF).', $empty];
    }
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        return [false, 'Le CV ne doit pas dépasser 5 MB.', $empty];
    }
    if ($error !== UPLOAD_ERR_OK) {
        return [false, 'Le CV n’a pas pu être lu.', $empty];
    }

    $tmp = (string) ($cv['tmp_name'] ?? '');
    $size = (int) ($cv['size'] ?? 0);
    $originalName = (string) ($cv['name'] ?? '');
    $reportedType = strtolower((string) ($cv['type'] ?? ''));

    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return [false, 'Le CV n’a pas pu être lu.', $empty];
    }
    if ($size <= 0 || $size > MAX_CV_BYTES) {
        return [false, 'Le CV ne doit pas dépasser 5 MB.', $empty];
    }

    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($extension !== 'pdf') {
        return [false, 'Le CV doit être un fichier PDF.', $empty];
    }

    $bytes = file_get_contents($tmp);
    if ($bytes === false || $bytes === '') {
        return [false, 'Le CV n’a pas pu être lu.', $empty];
    }
    if (!str_starts_with($bytes, '%PDF')) {
        return [false, 'Le fichier CV n’est pas un PDF valide.', $empty];
    }

    $detectedMime = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detectedMime = strtolower((string) finfo_file($finfo, $tmp));
            finfo_close($finfo);
        }
    }

    $allowedMimes = ['application/pdf', 'application/x-pdf', 'application/acrobat'];
    if ($detectedMime !== '' && !in_array($detectedMime, $allowedMimes, true)) {
        return [false, 'Le CV doit être un fichier PDF.', $empty];
    }
    if ($reportedType !== '' && !in_array($reportedType, $allowedMimes, true) && $reportedType !== 'application/octet-stream') {
        return [false, 'Le CV doit être un fichier PDF.', $empty];
    }

    return [true, null, [
        'bytes' => $bytes,
        'filename' => buildCvFilename($firstName, $lastName),
        'mime' => 'application/pdf',
    ]];
}

function asciiSlug(string $value): string
{
    $value = trim($value);
    $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $value = $transliterated !== false ? $transliterated : $value;
    $value = preg_replace('/[^A-Za-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'Candidat';
}

function buildCvFilename(string $firstName, string $lastName): string
{
    return 'CV-' . asciiSlug($firstName) . '-' . asciiSlug($lastName) . '.pdf';
}

function recruitmentToEmail(array $env): string
{
    $to = trim($env['RECRUITMENT_EMAIL_TO'] ?? '');
    return $to !== '' ? $to : RECRUITMENT_TO_DEFAULT;
}

function recruitmentFromEmail(array $env): string
{
    $from = trim($env['CONTACT_FROM'] ?? '');
    if ($from === '') {
        $from = trim($env['CONTACT_TO'] ?? '');
    }
    return $from !== '' ? $from : RECRUITMENT_FROM_DEFAULT;
}

function encodeHeader(string $value): string
{
    return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
}

function fieldOrDash(string $value): string
{
    return $value !== '' ? $value : '—';
}

function cvStorageDir(): string
{
    return __DIR__ . '/recruitment-private/cvs';
}

function siteBaseUrl(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? 'emaraestates.com'));
    if ($host === '') {
        $host = 'emaraestates.com';
    }
    return ($https ? 'https' : 'http') . '://' . $host;
}

/**
 * @return array{token: string, url: string, path: string}
 */
function storeCvPrivately(array $payload): array
{
    $dir = cvStorageDir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('CV could not be stored securely (mkdir failed).');
    }

    $token = bin2hex(random_bytes(24));
    $pdfPath = $dir . '/' . $token . '.pdf';
    $metaPath = $dir . '/' . $token . '.json';

    if (file_put_contents($pdfPath, $payload['cv_bytes'], LOCK_EX) === false) {
        throw new RuntimeException('CV could not be stored securely (write failed).');
    }
    @chmod($pdfPath, 0600);

    $meta = [
        'token' => $token,
        'filename' => $payload['cv_filename'],
        'email' => $payload['email'],
        'first_name' => $payload['first_name'],
        'last_name' => $payload['last_name'],
        'created_at' => date('c'),
        'bytes' => strlen($payload['cv_bytes']),
    ];
    file_put_contents($metaPath, json_encode($meta, JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($metaPath, 0600);

    return [
        'token' => $token,
        'url' => siteBaseUrl() . '/recruitment-cv.php?t=' . rawurlencode($token),
        'path' => $pdfPath,
    ];
}

function eHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function isPriorityRecruitmentProfile(array $payload): bool
{
    $salesOk = ($payload['sales_experience'] ?? '') === 'Plus de 3 ans';
    $closedOk = in_array($payload['sales_closed_12m'] ?? '', ['6 à 15', 'Plus de 15'], true);
    $closingOk = in_array($payload['closing_level'] ?? '', ['Confirmé', 'Excellent'], true);
    return $salesOk && $closedOk && $closingOk;
}

function recruitmentSourceLabel(array $payload): string
{
    $utmSource = trim((string) ($payload['utm_source'] ?? ''));
    if ($utmSource !== '') {
        return $utmSource;
    }
    $source = trim((string) ($payload['source'] ?? ''));
    if ($source === 'recruitment_website' || $source === '') {
        return 'Site web Emara Estates';
    }
    return $source;
}

function recruitmentTeamEmailPlainBody(array $payload): string
{
    $fullName = trim($payload['first_name'] . ' ' . $payload['last_name']);
    $badge = isPriorityRecruitmentProfile($payload) ? 'PROFIL À PRIORISER' : 'CANDIDATURE À ÉTUDIER';

    return implode("\r\n", [
        'Emara Estates — Nouvelle candidature commerciale',
        $badge,
        '',
        'CANDIDAT',
        $fullName,
        'Téléphone : ' . $payload['telephone'],
        'Email : ' . $payload['email'],
        '',
        'PROFIL COMMERCIAL',
        'Expérience en vente : ' . $payload['sales_experience'],
        'Expérience dans l’immobilier : ' . $payload['real_estate_experience'],
        'Ventes conclues sur les 12 derniers mois : ' . $payload['sales_closed_12m'],
        'Niveau de closing : ' . $payload['closing_level'],
        '',
        'CV',
        'Voir le CV : ' . ($payload['cv_download_url'] ?? ''),
        '',
        'SOURCE DE LA CANDIDATURE',
        'Source : ' . recruitmentSourceLabel($payload),
        'Campagne : ' . fieldOrDash($payload['utm_campaign'] ?? ''),
        'Contenu / publicité : ' . fieldOrDash($payload['utm_content'] ?? ''),
        'Date : ' . ($payload['submitted_at'] ?? ''),
        '',
        'Candidature reçue via emaraestates.com/recrutement-commercial-marrakech',
    ]);
}

function recruitmentProfileRowHtml(string $label, string $value): string
{
    return ''
        . '<tr>'
        . '<td style="padding:14px 0 4px 0;font-family:Georgia,\'Times New Roman\',serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9b7040;">'
        . eHtml($label)
        . '</td>'
        . '</tr>'
        . '<tr>'
        . '<td style="padding:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:20px;line-height:1.35;font-weight:700;color:#1a1a1a;">'
        . eHtml($value)
        . '</td>'
        . '</tr>';
}

function recruitmentTeamEmailHtmlBody(array $payload): string
{
    $fullName = trim($payload['first_name'] . ' ' . $payload['last_name']);
    $priority = isPriorityRecruitmentProfile($payload);
    $badgeLabel = $priority ? 'PROFIL À PRIORISER' : 'CANDIDATURE À ÉTUDIER';
    $badgeBg = $priority ? '#2d3a2d' : '#9b7040';
    $badgeText = '#ffffff';
    $cvUrl = trim((string) ($payload['cv_download_url'] ?? ''));
    $phone = (string) $payload['telephone'];
    $email = (string) $payload['email'];
    $phoneHref = 'tel:' . preg_replace('/\s+/', '', $phone);
    $mailHref = 'mailto:' . $email;

    $rows = ''
        . recruitmentProfileRowHtml('Expérience en vente', (string) $payload['sales_experience'])
        . recruitmentProfileRowHtml('Expérience dans l’immobilier', (string) $payload['real_estate_experience'])
        . recruitmentProfileRowHtml('Ventes conclues sur les 12 derniers mois', (string) $payload['sales_closed_12m'])
        . recruitmentProfileRowHtml('Niveau de closing', (string) $payload['closing_level']);

    return '<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nouvelle candidature Emara Estates</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f0e8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e6dccb;">
          <tr>
            <td style="padding:28px 28px 18px 28px;border-bottom:3px solid #d2b178;">
              <div style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;color:#2d3a2d;font-weight:700;">Emara Estates</div>
              <div style="margin-top:8px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#7a8b68;letter-spacing:0.04em;">Nouvelle candidature commerciale</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 8px 28px;">
              <span style="display:inline-block;background:' . $badgeBg . ';color:' . $badgeText . ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:10px 14px;">'
        . eHtml($badgeLabel)
        . '</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f4;border:1px solid #e6dccb;">
                <tr>
                  <td style="padding:22px 22px 8px 22px;font-family:Georgia,\'Times New Roman\',serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#2d3a2d;font-weight:700;">Candidat</td>
                </tr>
                <tr>
                  <td style="padding:0 22px 16px 22px;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;line-height:1.25;color:#1a1a1a;font-weight:700;">'
        . eHtml($fullName)
        . '</td>
                </tr>
                <tr>
                  <td style="padding:0 22px 6px 22px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;color:#9b7040;letter-spacing:0.08em;text-transform:uppercase;">Téléphone</td>
                </tr>
                <tr>
                  <td style="padding:0 22px 14px 22px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;">
                    <a href="' . eHtml($phoneHref) . '" style="color:#1a1a1a;text-decoration:none;">' . eHtml($phone) . '</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 22px 6px 22px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;color:#9b7040;letter-spacing:0.08em;text-transform:uppercase;">Email</td>
                </tr>
                <tr>
                  <td style="padding:0 22px 22px 22px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;">
                    <a href="' . eHtml($mailHref) . '" style="color:#1a1a1a;text-decoration:none;">' . eHtml($email) . '</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px 28px;">
              <div style="font-family:Georgia,\'Times New Roman\',serif;font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#2d3a2d;font-weight:700;margin-bottom:8px;">Profil commercial</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6dccb;">'
        . $rows
        . '</table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px 28px;">
              <div style="font-family:Georgia,\'Times New Roman\',serif;font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#2d3a2d;font-weight:700;margin-bottom:12px;">CV</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#2d3a2d;border-radius:2px;">
                    <a href="' . eHtml($cvUrl) . '" style="display:inline-block;padding:14px 22px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;text-decoration:none;">Voir le CV</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;color:#7a8b68;">Lien sécurisé vers le PDF du candidat</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 10px 28px;">
              <div style="font-family:Georgia,\'Times New Roman\',serif;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#2d3a2d;font-weight:700;margin-bottom:12px;">Source de la candidature</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f4;border:1px solid #e6dccb;">
                <tr>
                  <td style="padding:16px 18px 4px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9b7040;">Source</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 12px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#1a1a1a;font-weight:600;">'
        . eHtml(recruitmentSourceLabel($payload))
        . '</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 4px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9b7040;">Campagne</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 12px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#1a1a1a;font-weight:600;">'
        . eHtml(fieldOrDash($payload['utm_campaign'] ?? ''))
        . '</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 4px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9b7040;">Contenu / publicité</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 12px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#1a1a1a;font-weight:600;">'
        . eHtml(fieldOrDash($payload['utm_content'] ?? ''))
        . '</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 4px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9b7040;">Date</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 16px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;color:#1a1a1a;font-weight:600;">'
        . eHtml((string) ($payload['submitted_at'] ?? ''))
        . '</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a8b68;border-top:1px solid #e6dccb;">
              Candidature reçue via emaraestates.com/recrutement-commercial-marrakech
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function candidateConfirmationBody(array $payload): string
{
    return implode("\r\n", [
        'Bonjour ' . $payload['first_name'] . ',',
        '',
        'Nous avons bien reçu votre candidature pour rejoindre l’équipe commerciale Emara Estates à Marrakech.',
        '',
        'Notre équipe va étudier votre profil. Si votre candidature correspond aux profils recherchés, nous vous contacterons prochainement.',
        '',
        'À bientôt,',
        '',
        'L’équipe Emara Estates',
    ]);
}

/**
 * Same delivery method as contact.php → PHP mail().
 * Team email is multipart HTML + plain; candidate confirmation stays simple plain text.
 */
function sendRecruitmentEmailsWithPhpMail(array $payload, array $env): void
{
    $to = recruitmentToEmail($env);
    if (!looksLikeEmail($to)) {
        throw new RuntimeException('RECRUITMENT_EMAIL_TO is invalid.');
    }

    $from = recruitmentFromEmail($env);
    $fullName = trim($payload['first_name'] . ' ' . $payload['last_name']);
    $subject = 'Nouvelle candidature — ' . $fullName . ' — Commercial Marrakech';

    // For multipart bodies, pass headers separately from the MIME body.
    $boundary = 'emara_recruit_' . bin2hex(random_bytes(10));
    $teamHeaders = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . encodeHeader($fullName) . ' <' . $payload['email'] . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];
    $teamBody = implode("\r\n", [
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        recruitmentTeamEmailPlainBody($payload),
        '',
        '--' . $boundary,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        recruitmentTeamEmailHtmlBody($payload),
        '',
        '--' . $boundary . '--',
        '',
    ]);

    $teamSent = mail(
        $to,
        encodeHeader($subject),
        $teamBody,
        implode("\r\n", $teamHeaders),
    );
    if (!$teamSent) {
        throw new RuntimeException('mail() returned false for team email.');
    }

    $candidateHeaders = [
        'From: Emara Estates <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $candidateSent = mail(
        $payload['email'],
        encodeHeader('Votre candidature chez Emara Estates a bien été reçue'),
        candidateConfirmationBody($payload),
        implode("\r\n", $candidateHeaders),
    );
    if (!$candidateSent) {
        // Team mail already accepted — log only; do not fail the application.
        error_log('Recruitment candidate confirmation mail() returned false for ' . $payload['email']);
    }
}
