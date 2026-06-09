<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const NEWSLETTER_SUCCESS = 'Merci. Votre inscription à la newsletter Emara Estates a bien été prise en compte.';
const NEWSLETTER_INVALID = 'Veuillez entrer une adresse email valide.';
const NEWSLETTER_ERROR = 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.';

function respond(bool $success, string $message, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function loadEnvFile(string $filePath): array
{
    $env = [];
    if (!is_readable($filePath)) {
        return $env;
    }
    foreach (file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
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
        $value = trim($value, "\"'");
        if ($key !== '') {
            $env[$key] = $value;
        }
    }
    return $env;
}

function sanitizeValue(string $value, int $maxLength): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
    $value = str_replace(['<', '>'], '', $value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    $value = trim($value);
    if (strlen($value) > $maxLength) {
        $value = substr($value, 0, $maxLength);
    }
    return $value;
}

function isValidEmail(string $email): bool
{
    if ($email === '' || strlen($email) > 254) {
        return false;
    }
    if (preg_match('/[\r\n]/', $email)) {
        return false;
    }
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function encodeHeader(string $value): string
{
    return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
}

function newsletterEmailBody(string $email, string $pageUrl): string
{
    return implode("\r\n", [
        'Nouvelle inscription à la newsletter Emara Estates.',
        '',
        'Email abonné :',
        $email,
        '',
        'Page :',
        $pageUrl,
        '',
        'Date :',
        date('d/m/Y H:i'),
    ]);
}

function smtpRead($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
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

function sendNewsletterEmailWithPhpMail(string $email, string $pageUrl, array $env): void
{
    $to = $env['CONTACT_TO'] ?? 'contact@emaraestates.com';
    $from = $env['CONTACT_FROM'] ?? 'contact@emaraestates.com';
    $subject = 'Nouvelle inscription newsletter — Emara Estates';
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . $email,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $sent = mail($to, encodeHeader($subject), newsletterEmailBody($email, $pageUrl), implode("\r\n", $headers));
    if (!$sent) {
        throw new RuntimeException('mail() returned false.');
    }
}

function sendNewsletterEmailWithSmtp(string $email, string $pageUrl, array $env): void
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

    $subject = 'Nouvelle inscription newsletter — Emara Estates';
    $body = newsletterEmailBody($email, $pageUrl);
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'To: ' . $to,
        'Reply-To: ' . $email,
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
        if ((int) substr($greeting, 0, 3) !== 220) {
            throw new RuntimeException('SMTP greeting failed.');
        }
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

function sendNewsletterEmail(string $email, string $pageUrl, array $env): void
{
    try {
        sendNewsletterEmailWithPhpMail($email, $pageUrl, $env);
        return;
    } catch (Throwable $error) {
        error_log('Newsletter PHP mail fallback to SMTP: ' . $error->getMessage());
    }

    sendNewsletterEmailWithSmtp($email, $pageUrl, $env);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, NEWSLETTER_ERROR, 405);
}

$rawBody = file_get_contents('php://input') ?: '';
$input = json_decode($rawBody, true);
if (!is_array($input)) {
    $input = $_POST;
}

$honeypot = sanitizeValue((string) ($input['website'] ?? ''), 120);
if ($honeypot !== '') {
    respond(true, NEWSLETTER_SUCCESS);
}

$email = sanitizeValue((string) ($input['email'] ?? ''), 254);
$pageUrl = sanitizeValue((string) ($input['page_url'] ?? ($_SERVER['HTTP_REFERER'] ?? '')), 500);

if (!isValidEmail($email)) {
    respond(false, NEWSLETTER_INVALID, 422);
}

$env = array_merge($_ENV, loadEnvFile(__DIR__ . '/.env'));

try {
    sendNewsletterEmail($email, $pageUrl !== '' ? $pageUrl : 'emaraestates.com', $env);
    respond(true, NEWSLETTER_SUCCESS);
} catch (Throwable $error) {
    error_log('Newsletter send failed: ' . $error->getMessage());
    respond(false, NEWSLETTER_ERROR, 500);
}
