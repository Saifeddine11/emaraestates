<?php
declare(strict_types=1);

/**
 * Today's activity on Honest Signature 7 — the counting, the public endpoint,
 * and the real path through contact.php, against a throwaway copy of the PHP
 * files in a temp sandbox. Nothing leaves the machine: "Zapier" is a local
 * stub, mail() is diverted to a file, and https is switched off in the server
 * under test. The repo and the system temp directory are never written to.
 *
 * Run: php scripts/activity-check.php   (from web/)
 */

$repo = dirname(__DIR__, 2);
$sandbox = sys_get_temp_dir() . '/emara-activity-check-' . bin2hex(random_bytes(4));
$webRoot = $sandbox . '/public_html';
mkdir($webRoot . '/activity-private', 0777, true);
mkdir($sandbox . '/tmp', 0777, true);
copy($repo . '/activity-private/activity.php', $webRoot . '/activity-private/activity.php');
copy($repo . '/activity.php', $webRoot . '/activity.php');
copy($repo . '/contact.php', $webRoot . '/contact.php');
require $webRoot . '/activity-private/activity.php';

ini_set('log_errors', '1');
ini_set('error_log', $sandbox . '/php-error.log');

$failures = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures;
    if (!$ok) $failures++;
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . ($detail !== '' && !$ok ? "  — {$detail}" : '') . "\n";
}

$zone = new DateTimeZone('Africa/Casablanca');
$at = static fn (string $local): int => (new DateTimeImmutable($local, $zone))->getTimestamp();
$NOW = $at('2026-10-05 10:00:00');
$store = static function (string $name) use ($sandbox): string {
    $dir = $sandbox . '/store-' . $name;
    mkdir($dir, 0700, true);
    return $dir;
};
$count = static fn (string $dir, int $now): int => activityFeed($dir, $now)['requests'];

echo "\nACTIVITY — counting\n\n";

$dir = $store('basic');
$feed = activityFeed($dir, $NOW);
check('Nothing received yet: 0, for today (Casablanca)', $feed === ['ok' => true, 'enabled' => true, 'day' => '2026-10-05', 'requests' => 0], json_encode($feed));

$first = activityRecordRequest($dir, $NOW, '+212612345678', 'yasmine@example.com');
check('One accepted request → 1', $first === ['counted' => true, 'requests' => 1] && $count($dir, $NOW) === 1);
check('The same person again (same phone) → still 1', activityRecordRequest($dir, $NOW + 60, '+212 6 12 34 56 78', 'other@example.com')['counted'] === false && $count($dir, $NOW) === 1);
check('…recognised by e-mail too, whatever the case', activityRecordRequest($dir, $NOW + 90, '+33611111111', 'YASMINE@Example.com')['counted'] === false && $count($dir, $NOW) === 1);
check('…and by the second e-mail they used', activityRecordRequest($dir, $NOW + 95, '+33622222222', 'other@example.com')['counted'] === false && $count($dir, $NOW) === 1);
check('Another person → 2', activityRecordRequest($dir, $NOW + 120, '+212698765432', 'karim@example.com')['requests'] === 2);
check('No usable phone number → not counted, whatever else is sent', activityRecordRequest($dir, $NOW + 130, '', '')['counted'] === false && activityRecordRequest($dir, $NOW + 131, '12', '')['counted'] === false && activityRecordRequest($dir, $NOW + 132, '', 'someone@example.com')['counted'] === false && $count($dir, $NOW) === 2);
check('A made-up e-mail does not hide a repeat, nor create a second person', activityRecordRequest($dir, $NOW + 133, '+212698765432', 'pas-un-email')['counted'] === false && $count($dir, $NOW) === 2);
$raw = (string) file_get_contents($dir . '/activity.json');
check('The store holds no phone number and no e-mail address — salted hashes only', !preg_match('/612345678|698765432|yasmine|karim|example\.com/i', $raw) && str_contains($raw, '"p:') && str_contains($raw, '"e:'));

// The day: midnight to midnight in Casablanca.
$dir = $store('day');
activityRecordRequest($dir, $at('2026-10-05 23:59:30'), '+212600000001', '');
activityRecordRequest($dir, $at('2026-10-05 23:59:50'), '+212600000002', '');
check('Late evening: 2 for the day', $count($dir, $at('2026-10-05 23:59:55')) === 2);
check('After midnight the count is back to 0, before anything is written', $count($dir, $at('2026-10-06 00:00:05')) === 0 && activityFeed($dir, $at('2026-10-06 00:00:05'))['day'] === '2026-10-06');
$before = (string) file_get_contents($dir . '/activity.json');
$again = activityRecordRequest($dir, $at('2026-10-06 09:00:00'), '+212600000001', '');
$after = json_decode((string) file_get_contents($dir . '/activity.json'), true);
check('A person from yesterday counts again today: each day is counted from its own requests', $again === ['counted' => true, 'requests' => 1] && $after['day'] === '2026-10-06');
check('…and yesterday\'s hashes are gone, with a new salt: days cannot be linked', count($after['seen']) === 1 && !str_contains($before, $after['seen'][0]) && !str_contains($before, $after['salt']));

// The figure can be lost, never invented.
$dir = $store('tamper');
file_put_contents($dir . '/activity.json', json_encode(['day' => '2026-10-05', 'requests' => 500, 'salt' => 'x', 'seen' => []]));
check('A count written by hand with no request behind it reads as 0', $count($dir, $NOW) === 0);
file_put_contents($dir . '/activity.json', json_encode(['day' => '2026-10-05', 'requests' => 40, 'salt' => 'x', 'seen' => ['p:a', 'p:b', 'e:c']]));
check('…and never more than the requests actually recorded', $count($dir, $NOW) === 3);
foreach (['not json', '{"day":"2026-10-05","requests":"beaucoup"}', '{"day":"2026-10-05","requests":-3,"salt":"x","seen":[]}', '[]'] as $index => $rawState) {
    file_put_contents($dir . '/activity.json', $rawState);
    check('Damaged store #' . ($index + 1) . ' → 0, no error', $count($dir, $NOW) === 0);
}

$readOnly = $store('readonly');
chmod($readOnly, 0500);
check('Store not writable: reported, no exception', activityRecordRequest($readOnly, $NOW, '+212612345678', '') === null);
activityCountLead(['form_type' => ACTIVITY_FORM_TYPE, 'lead_stage' => 'lead', 'nom_complet' => 'Yasmine', 'phoneFull' => '+212612345678', 'email' => ''], ['ACTIVITY_DIR' => $readOnly], $NOW);
check('…and the call made by contact.php never throws', true);
chmod($readOnly, 0700);

// Which requests count.
$dir = $store('scope');
$env = ['ACTIVITY_DIR' => $dir];
$lead = static fn (array $over = []) => $over + ['form_type' => 'honest_signature_7_request', 'lead_stage' => 'lead', 'nom_complet' => 'Yasmine El Idrissi', 'phoneFull' => '+212611111111', 'telephone' => '+212611111111', 'email' => 'a@example.com'];
activityCountLead($lead(['form_type' => 'contact_request', 'phoneFull' => '+212622222222', 'email' => 'b@example.com']), $env, $NOW);
activityCountLead($lead(['form_type' => 'simulateur_request', 'phoneFull' => '+212633333333', 'email' => 'c@example.com']), $env, $NOW);
check('Other forms of the site are not counted', $count($dir, $NOW) === 0);
activityCountLead($lead(['lead_stage' => 'qualification']), $env, $NOW);
check('The optional follow-up (qualification) is not a new request', $count($dir, $NOW) === 0);
activityCountLead($lead(), $env + ['ACTIVITY_DISABLED' => '1'], $NOW);
check('ACTIVITY_DISABLED=1: nothing is counted', $count($dir, $NOW) === 0);
activityCountLead($lead(['nom_complet' => '']), $env, $NOW);
activityCountLead($lead(['phoneFull' => '', 'telephone' => '']), $env, $NOW);
check('A request with no name, or no phone number, is not counted', $count($dir, $NOW) === 0);
activityCountLead($lead(), $env, $NOW);
check('The landing page\'s lead request is counted', $count($dir, $NOW) === 1);

// Concurrency: 10 different people at the same instant → 10; the same person 10 times → 1.
$worker = $sandbox . '/worker.php';
file_put_contents($worker, '<?php require ' . var_export($webRoot . '/activity-private/activity.php', true) . '; activityRecordRequest($argv[1], (int) $argv[2], $argv[3], "");');
foreach (['different' => 10, 'same' => 1] as $case => $expected) {
    $dir = $store('concurrent-' . $case);
    $children = [];
    for ($i = 0; $i < 10; $i++) {
        $phone = $case === 'different' ? sprintf('+2126000000%02d', $i) : '+212600000099';
        $children[] = proc_open([PHP_BINARY, $worker, $dir, (string) $NOW, $phone], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    }
    foreach ($children as $child) proc_close($child);
    check("Concurrent requests ({$case} people): {$expected} counted, store intact", $count($dir, $NOW) === $expected, (string) $count($dir, $NOW));
}

echo "\nACTIVITY — HTTP, through contact.php\n\n";

file_put_contents($sandbox . '/no-https.php', '<?php stream_wrapper_unregister("https");');
$zapierLog = $sandbox . '/zapier.log';
$zapierMode = $sandbox . '/zapier-mode';
mkdir($sandbox . '/zapier-root');
file_put_contents($sandbox . '/zapier-root/zapier.php', '<?php
if (is_file(' . var_export($zapierMode, true) . ')) { http_response_code(500); echo "{}"; exit; }
file_put_contents(' . var_export($zapierLog, true) . ', "x", FILE_APPEND);
header("Content-Type: application/json"); echo "{\"status\":\"success\"}";');
$port = random_int(20000, 40000);
$zapierPort = $port + 1; // the built-in server is single-threaded: Zapier needs its own
$liveStore = $sandbox . '/live-store';
$writeEnv = static function (array $extra = []) use ($webRoot, $zapierPort, $liveStore): void {
    file_put_contents($webRoot . '/.env', implode("\n", array_merge([
        "CONTACT_WEBHOOK_URL=http://127.0.0.1:{$zapierPort}/zapier.php",
        'CONTACT_TO=team@localhost',
        'ACTIVITY_DIR=' . $liveStore,
    ], $extra)) . "\n");
};
$writeEnv();
$zapierServer = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$zapierPort}", '-t', $sandbox . '/zapier-root'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $zapierPipes);
$server = proc_open(
    [PHP_BINARY, '-d', 'auto_prepend_file=' . $sandbox . '/no-https.php', '-d', 'sendmail_path=/usr/bin/tee -a ' . $sandbox . '/mail.txt', '-d', 'sys_temp_dir=' . $sandbox . '/tmp', '-d', 'error_log=' . $sandbox . '/site-error.log', '-S', "127.0.0.1:{$port}", '-t', $webRoot],
    [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
    $pipes,
);
usleep(700000);

$request = static function (string $method, string $path, string $body = '') use ($port): array {
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => "Content-Type: application/json\r\nReferer: http://127.0.0.1:{$port}/honest-signature-7/\r\n",
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 20,
    ]]);
    $response = (string) @file_get_contents("http://127.0.0.1:{$port}{$path}", false, $context);
    $headers = [];
    foreach ($http_response_header ?? [] as $line) {
        if (str_contains($line, ':')) {
            [$name, $value] = array_map('trim', explode(':', $line, 2));
            $headers[strtolower($name)] = $value;
        }
    }
    return ['status' => (int) substr($http_response_header[0] ?? '', 9, 3), 'headers' => $headers, 'body' => $response];
};
$today = static fn (): int => (int) (json_decode($request('GET', '/activity.php')['body'], true)['requests'] ?? -1);
$post = static fn (array $over = []) => $request('POST', '/contact.php', (string) json_encode($over + [
    'form_type' => 'honest_signature_7_request', 'nom_complet' => 'Yasmine El Idrissi', 'email' => 'yasmine@example.com',
    'telephone' => '+212612345678', 'phoneFull' => '+212612345678', 'phoneCode' => '+212', 'phoneCountryCode' => 'MA', 'phoneNumber' => '612345678',
    'budget' => '', 'message' => 'Demande : prix, plans et disponibilités.', 'source' => 'Meta Ads', 'company_website' => '', 'elapsed_ms' => 9000,
    'projectName' => 'Honest Signature 7', 'project_name' => 'Honest Signature 7', 'lead_stage' => 'lead',
]));
$zapierCalls = static fn (): int => is_file($zapierLog) ? strlen((string) file_get_contents($zapierLog)) : 0;

$public = $request('GET', '/activity.php');
$data = json_decode($public['body'], true);
check('Endpoint: JSON, today, 0 requests', $public['status'] === 200 && ($data['enabled'] ?? null) === true && $data['requests'] === 0 && $data['day'] === activityDay(time()) && array_keys($data) === ['ok', 'enabled', 'day', 'requests']);
check('Endpoint: short shared cache, not indexed', ($public['headers']['cache-control'] ?? '') === 'public, max-age=5' && str_contains($public['headers']['x-robots-tag'] ?? '', 'noindex'));
check('Endpoint: read-only — POST, PUT and DELETE are refused and change nothing', $request('POST', '/activity.php', '{"requests":50}')['status'] === 405 && $request('PUT', '/activity.php', '{"requests":50}')['status'] === 405 && $request('DELETE', '/activity.php')['status'] === 405 && $today() === 0);
check('Endpoint: a query string cannot set the count', json_decode($request('GET', '/activity.php?requests=50&add=1')['body'], true)['requests'] === 0);
check('The library answers nothing when requested directly', trim($request('GET', '/activity-private/activity.php')['body']) === '');

check('A bot (honeypot filled) gets the usual "success" but is not counted', $post(['company_website' => 'https://spam.example', 'telephone' => '+212655555551', 'phoneFull' => '+212655555551', 'phoneNumber' => '655555551', 'email' => 'bot@example.com'])['status'] === 200 && $today() === 0);
check('A form sent faster than a person can type is not counted', $post(['elapsed_ms' => 400, 'telephone' => '+212655555552', 'phoneFull' => '+212655555552', 'phoneNumber' => '655555552', 'email' => 'fast@example.com'])['status'] === 200 && $today() === 0 && $zapierCalls() === 0);
// contact.php forwards whatever it is sent (it has no field validation): the count must not follow it.
$junk = $post(['nom_complet' => '', 'telephone' => '', 'phoneFull' => '', 'phoneNumber' => '', 'email' => 'pas-un-email']);
check('A request with no name, no phone and a made-up e-mail goes through contact.php as before — and is not counted', $junk['status'] === 200 && $today() === 0, $junk['status'] . ' / ' . $today());
touch($zapierMode);
check('A request that Zapier did not accept (500) is not counted', $post()['status'] === 500 && $today() === 0);
unlink($zapierMode);

$accepted = $post();
check('An accepted request (Zapier 2xx) → counted at once: 1', $accepted['status'] === 200 && $zapierCalls() === 2 && $today() === 1, $accepted['status'] . ' / ' . $today());
check('The same person sends the form again: the lead still goes through, the count stays 1', $post()['status'] === 200 && $zapierCalls() === 3 && $today() === 1);
check('Their optional follow-up (qualification) is not a second request', $post(['lead_stage' => 'qualification', 'contact_preference' => 'WhatsApp'])['status'] === 200 && $today() === 1);
check('A second person → 2', $post(['nom_complet' => 'Karim Benali', 'email' => 'karim@example.com', 'telephone' => '+212698765432', 'phoneFull' => '+212698765432', 'phoneNumber' => '698765432'])['status'] === 200 && $today() === 2);
check('The answer to the visitor is unchanged by the counting', json_decode($accepted['body'], true) === ['message' => 'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.']);

// The count can fail; the lead cannot.
chmod($liveStore, 0500);
check('Activity store not writable: the lead is still accepted', $post(['nom_complet' => 'Salma Idrissi', 'email' => 'salma@example.com', 'telephone' => '+212677777777', 'phoneFull' => '+212677777777', 'phoneNumber' => '677777777'])['status'] === 200 && $zapierCalls() === 6);
chmod($liveStore, 0700);

$writeEnv(['ACTIVITY_DISABLED=1']);
$disabled = json_decode($request('GET', '/activity.php')['body'], true);
check('ACTIVITY_DISABLED=1: the endpoint says disabled, with no figure', ($disabled['enabled'] ?? null) === false && !isset($disabled['requests']));
check('…leads are still accepted, and nothing is counted', $post(['nom_complet' => 'Nadia Alaoui', 'email' => 'nadia@example.com', 'telephone' => '+212688888888', 'phoneFull' => '+212688888888', 'phoneNumber' => '688888888'])['status'] === 200);
$writeEnv();
check('…switched back on: the count is where it was', $today() === 2);

proc_terminate($server);
proc_terminate($zapierServer);
$log = (string) @file_get_contents($sandbox . '/site-error.log') . (string) @file_get_contents($sandbox . '/php-error.log');
check('No PHP warning or notice', !preg_match('/PHP (Warning|Notice|Deprecated|Fatal)/', $log), $log);

exec('chmod -R u+w ' . escapeshellarg($sandbox) . ' && rm -rf ' . escapeshellarg($sandbox));
echo "\n  " . ($failures === 0 ? 'all passed' : "{$failures} failed") . "\n\n";
exit($failures === 0 ? 0 : 1);
