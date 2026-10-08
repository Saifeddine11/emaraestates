<?php
declare(strict_types=1);

/* =============================================================================
   GET /activity.php — the "Activité aujourd'hui" band of /honest-signature-7/.

   → {"ok":true,"enabled":true,"day":"2026-10-04","requests":7}
     polled by the page every 30 s. `requests` is the number of Honest
     Signature 7 requests accepted by contact.php today (Casablanca time);
     it is back to 0 at midnight.

   Read-only: nothing can be written through this URL. The only writer is
   contact.php, when a lead has been accepted (see activity-private/).
   ACTIVITY_DISABLED=1 stops the counting and hides the band.
   ============================================================================= */

require __DIR__ . '/activity-private/activity.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

$method = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'GET' && $method !== 'HEAD') {
    http_response_code(405);
    header('Cache-Control: no-store');
    echo '{"ok":false}';
    exit;
}

$env = activityLoadEnv(__DIR__ . '/.env');
if (!activityEnabled($env)) {
    header('Cache-Control: public, max-age=60');
    echo '{"ok":true,"enabled":false}';
    exit;
}

// A few seconds of shared caching absorb bursts of visitors; the page polls every 30 s.
header('Cache-Control: public, max-age=5');
echo json_encode(activityFeed(activityDir($env), time()));
