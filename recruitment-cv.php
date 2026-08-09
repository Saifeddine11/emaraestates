<?php
declare(strict_types=1);

/**
 * Private CV download for recruitment applications.
 * Files live under recruitment-private/cvs/ (blocked by .htaccess).
 * Access only via a non-guessable token: /recruitment-cv.php?t=...
 */

$token = preg_replace('/[^a-f0-9]/i', '', (string) ($_GET['t'] ?? '')) ?? '';
if (strlen($token) < 32) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'CV introuvable.';
    exit;
}

$dir = __DIR__ . '/recruitment-private/cvs';
$pdfPath = $dir . '/' . $token . '.pdf';
$metaPath = $dir . '/' . $token . '.json';

if (!is_file($pdfPath) || !is_readable($pdfPath)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'CV introuvable.';
    exit;
}

$filename = 'CV.pdf';
if (is_file($metaPath)) {
    $meta = json_decode((string) file_get_contents($metaPath), true);
    if (is_array($meta) && is_string($meta['filename'] ?? null) && $meta['filename'] !== '') {
        $candidate = preg_replace('/[^A-Za-z0-9._-]+/', '-', $meta['filename']) ?? 'CV.pdf';
        if (str_ends_with(strtolower($candidate), '.pdf')) {
            $filename = $candidate;
        }
    }
}

header('Content-Type: application/pdf');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
header('Content-Length: ' . (string) filesize($pdfPath));
header('Content-Disposition: attachment; filename="' . $filename . '"');
readfile($pdfPath);
exit;
