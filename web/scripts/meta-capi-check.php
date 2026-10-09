<?php
declare(strict_types=1);

/**
 * Meta Conversions API checks — attribution, normalisation, HubSpot transition
 * logic, activation cutoff, idempotency ledger (including real concurrent
 * processes), webhook authentication, and contact.php behaviour when Meta is
 * unreachable.
 *
 * Runs against a throwaway copy of the PHP files in a temp sandbox, so the
 * ledger it writes and the .env it reads never touch the repo. Nothing is sent
 * to Meta or HubSpot: the only "send" is an injected fake, and every HTTP
 * server started here has the https:// wrapper disabled.
 *
 * Run: php scripts/meta-capi-check.php   (from web/)
 */

$repo = dirname(__DIR__, 2);
$sandbox = sys_get_temp_dir() . '/emara-meta-check-' . bin2hex(random_bytes(4));
mkdir($sandbox . '/public_html/meta-private', 0777, true);
$webRoot = $sandbox . '/public_html';
copy($repo . '/meta-private/meta-capi.php', $webRoot . '/meta-private/meta-capi.php');
copy($repo . '/contact.php', $webRoot . '/contact.php');
copy($repo . '/meta-crm-webhook.php', $webRoot . '/meta-crm-webhook.php');
require $webRoot . '/meta-private/meta-capi.php';

$failures = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures;
    if (!$ok) $failures++;
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . ($detail !== '' && !$ok ? "  — {$detail}" : '') . "\n";
}

ini_set('log_errors', '1');
ini_set('error_log', $sandbox . '/php-error.log');

$h = static fn (array $pairs) => array_map(static fn ($p) => ['value' => $p[0], 'timestamp' => $p[1]], $pairs);
$t = static fn (string $iso) => (int) (new DateTimeImmutable($iso))->format('Uv');

/* ── 1. isMetaAttributedContact ─────────────────────────────────────────── */
echo "Meta attribution (positive evidence only)\n";
$cases = [
    'lead ad: PAID_SOCIAL / Facebook' => [['hs_analytics_source' => 'PAID_SOCIAL', 'hs_analytics_source_data_1' => 'Facebook'], true],
    'PAID_SOCIAL / Instagram' => [['hs_analytics_source' => 'PAID_SOCIAL', 'hs_analytics_source_data_1' => 'Instagram'], true],
    'Zapier-created, first conversion "Facebook Lead Ads: …"' => [['hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION', 'first_conversion_event_name' => 'Facebook Lead Ads: FORMULAIRE V2.2'], true],
    'hs_facebook_click_id present' => [['hs_facebook_click_id' => 'IwAR0abc'], true],
    'website lead with genuine meta_fbc' => [['meta_fbc' => 'fb.1.1727000000000.IwAR0abcdefghij'], true],
    'website lead with utm_source=facebook' => [['utm_source' => 'Facebook'], true],
    'website lead with utm_source=ig' => [['utm_source' => 'ig'], true],
    'PAID_SOCIAL / LinkedIn' => [['hs_analytics_source' => 'PAID_SOCIAL', 'hs_analytics_source_data_1' => 'LinkedIn'], false],
    'source_du_lead = "Meta ADS" alone (manual label)' => [['source_du_lead' => 'Meta ADS', 'hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION'], false],
    'website lead today (Zapier, "Site web ( Organic Traffic )")' => [['source_du_lead' => 'Site web ( Organic Traffic )', 'hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION'], false],
    'Aircall contact' => [['hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION'], false],
    'meta_fbp only (Pixel sets it for everyone)' => [['meta_fbp' => 'fb.1.1727000000000.1234567890'], false],
    'malformed meta_fbc' => [['meta_fbc' => 'fb.1.test-click'], false],
    'utm_source containing "ig" as a substring (digital)' => [['utm_source' => 'digital'], false],
    'direct / organic / unknown' => [['hs_analytics_source' => 'DIRECT_TRAFFIC'], false],
    'no properties at all' => [[], false],
];
foreach ($cases as $name => [$props, $expected]) {
    check(($expected ? 'Meta   ← ' : 'not Meta ← ') . $name, isMetaAttributedContact($props) === $expected);
}

/* ── 2. Normalisation / no fbc reconstruction ───────────────────────────── */
echo "normalisation\n";
check('email trimmed + lowercased before hashing', metaUserData(['email' => '  Client@Example.COM '])['em'][0] === hash('sha256', 'client@example.com'));
check('E.164 phone → digits with country code', metaNormalizePhone('+33 6 12 34 56 78') === '33612345678');
check('national phone without country code is dropped, not guessed', metaNormalizePhone('0755441971') === '');
check('names: lowercase, accents kept, punctuation removed', metaNormalizeName(' Jean-Émile ') === 'jeanémile');
check('fbp / fbc sent in clear, not hashed', metaUserData(['fbp' => 'fb.1.1727000000000.1234567890'])['fbp'] === 'fb.1.1727000000000.1234567890');
check('fbc reconstruction helper no longer exists', !function_exists('metaFbcFromClickId'));

echo "website Lead\n";
$lead = metaWebsiteLeadEvent([
    'eventId' => 'lead_0b7f7d3c-3b69-4a7e-9d51-6f0c0f0e2a11',
    'email' => 'Client@Example.com',
    'phone' => '+33612345678',
    'firstName' => 'Client',
    'lastName' => 'Test',
    'fbclid' => 'IwAR0abcdefghij',
    'ip' => '203.0.113.9',
    'userAgent' => 'Mozilla/5.0',
    'sourceUrl' => metaEventSourceUrl(['', 'https://evil.example/x', 'https://emaraestates.com/simulateur/']),
], 1727000000);
check('Lead keeps the browser event ID verbatim', $lead['event_id'] === 'lead_0b7f7d3c-3b69-4a7e-9d51-6f0c0f0e2a11');
check('Lead action_source = website, URL only on emaraestates.com', $lead['action_source'] === 'website' && $lead['event_source_url'] === 'https://emaraestates.com/simulateur/');
check('fbclid without a genuine _fbc → no fbc sent', !isset($lead['user_data']['fbc']));
check('no raw email / phone / name in the payload', !preg_match('/client@|33612345678|"Client"/i', (string) json_encode($lead)));

/* ── 3. Exact stored values ─────────────────────────────────────────────── */
echo "HubSpot transitions (exact stored values)\n";
check('repondu "Non" → "Oui" is a transition', metaLatestTransition($h([['Non', '2026-09-20T10:00:00Z'], ['Oui', '2026-09-21T10:00:00Z']]), ['Oui']) === $t('2026-09-21T10:00:00Z'));
check('"oui" (wrong case) is NOT the stored value', metaLatestTransition($h([['oui', '2026-09-21T10:00:00Z']]), ['Oui']) === null);
check('rdv requires exactly "OUI"', metaLatestTransition($h([['Oui', '2026-09-21T10:00:00Z']]), ['OUI']) === null && metaLatestTransition($h([['OUI', '2026-09-21T10:00:00Z']]), ['OUI']) !== null);
check('re-saving "Oui" is NOT a new transition', metaLatestTransition($h([['Oui', '2026-09-21T10:00:00Z'], ['Oui', '2026-09-25T10:00:00Z']]), ['Oui']) === $t('2026-09-21T10:00:00Z'));
check('current value "Non" → nothing', metaLatestTransition($h([['Oui', '2026-09-21T10:00:00Z'], ['Non', '2026-09-22T10:00:00Z']]), ['Oui']) === null);
check('"Injoignable !" is not a disqualification', metaLatestTransition($h([['Injoignable !', '2026-09-21T10:00:00Z']]), META_CRM_RULES[2]['values']) === null);
check('"Hors Cible" → "Hors Budget" is one disqualification', metaLatestTransition($h([['OPEN', '2026-09-20T10:00:00Z'], ['Hors Cible', '2026-09-21T10:00:00Z'], ['Hors Budget', '2026-09-22T10:00:00Z']]), META_CRM_RULES[2]['values']) === $t('2026-09-21T10:00:00Z'));
check('rules: MQL=repondu/Oui, SQL=interesse/Oui, DQ=hs_lead_status/Hors Cible|Hors Budget', array_map(static fn ($r) => $r['property'] . ':' . implode('|', $r['values']), META_CRM_RULES) === ['repondu:Oui', 'interesse:Oui', 'hs_lead_status:Hors Cible|Hors Budget']);
check('Schedule off unless META_CRM_SCHEDULE_ENABLED=1', count(metaCrmRules([])) === 3 && count(metaCrmRules(['META_CRM_SCHEDULE_ENABLED' => '0'])) === 3 && count(metaCrmRules(['META_CRM_SCHEDULE_ENABLED' => '1'])) === 4);

/* ── 4. Webhook parsing + signatures ────────────────────────────────────── */
echo "webhook parsing + signatures\n";
check('HubSpot batch → unique contact IDs, deletions/merges ignored', metaHubspotBatchContactIds([
    ['subscriptionType' => 'contact.propertyChange', 'objectId' => 101, 'propertyName' => 'repondu'],
    ['subscriptionType' => 'contact.propertyChange', 'objectId' => 101, 'propertyName' => 'interesse'],
    ['subscriptionType' => 'contact.deletion', 'objectId' => 202],
    ['subscriptionType' => 'contact.merge', 'objectId' => 404],
    ['subscriptionType' => 'contact.propertyChange', 'objectId' => 303],
]) === ['101', '303']);
check('HubSpot parser rejects a Zapier-shaped object', metaHubspotBatchContactIds(['contactId' => '1']) === []);
check('Zapier parser accepts exactly {contactId}', metaZapierContactId(['contactId' => '877992149215']) === '877992149215');
check('Zapier parser rejects a HubSpot batch / other keys / injection', metaZapierContactId([['objectId' => 1]]) === null && metaZapierContactId(['id' => '1']) === null && metaZapierContactId(['contactId' => '1 OR 1=1']) === null);
$now = 1727000000000;
$body = '[{"objectId":101}]';
$uri = 'https://emaraestates.com/meta-crm-webhook.php';
$sign3 = static fn (string $u, string $b, int $ts, string $secret = 'client-secret') => base64_encode(hash_hmac('sha256', 'POST' . $u . $b . $ts, $secret, true));
check('v3 valid', metaHubspotSignatureV3Valid('client-secret', 'POST', $uri, $body, (string) $now, $sign3($uri, $body, $now), $now + 1000));
check('v3 tampered body rejected', !metaHubspotSignatureV3Valid('client-secret', 'POST', $uri, '[{"objectId":102}]', (string) $now, $sign3($uri, $body, $now), $now + 1000));
check('v3 wrong secret rejected', !metaHubspotSignatureV3Valid('client-secret', 'POST', $uri, $body, (string) $now, $sign3($uri, $body, $now, 'other'), $now));
check('v3 older than 5 min rejected (replay window)', !metaHubspotSignatureV3Valid('client-secret', 'POST', $uri, $body, (string) $now, $sign3($uri, $body, $now), $now + 301000));
check('v3 URI decoding per HubSpot spec (%3A → :)', metaHubspotSignatureV3Valid('client-secret', 'POST', $uri . '?a=b%3Ac', $body, (string) $now, $sign3($uri . '?a=b:c', $body, $now), $now));
check('v1 valid (sha256 hex of secret + body)', metaHubspotSignatureV1Valid('client-secret', $body, hash('sha256', 'client-secret' . $body)));
check('v1 tampered rejected', !metaHubspotSignatureV1Valid('client-secret', '[{"objectId":9}]', hash('sha256', 'client-secret' . $body)));
check('no secret → never valid', !metaHubspotSignatureV3Valid('', 'POST', $uri, $body, (string) $now, $sign3($uri, $body, $now, ''), $now) && !metaHubspotSignatureV1Valid('', $body, hash('sha256', $body)));

/* ── 5. CRM orchestration ───────────────────────────────────────────────── */
echo "CRM orchestration\n";
$ledger = $sandbox . '/emara-meta-ledger';
$startAt = '2026-09-26T00:00:00Z';
$env = ['META_LEDGER_DIR' => $ledger, 'META_CRM_START_AT' => $startAt];
$nowS = (int) (new DateTimeImmutable('2026-09-28T12:00:00Z'))->format('U');
$sent = [];
$ok = static function (array $events) use (&$sent) {
    foreach ($events as $event) $sent[] = $event;
    return ['ok' => true, 'skipped' => false, 'status' => 200];
};
$metaContact = static fn (array $history, array $extra = []) => [
    'properties' => $extra + ['email' => 'lead@example.com', 'phone' => '+33612345678', 'firstname' => 'Ali', 'hs_analytics_source' => 'PAID_SOCIAL', 'hs_analytics_source_data_1' => 'Facebook'],
    'propertiesWithHistory' => $history,
];
$contact = $metaContact([
    'repondu' => $h([['Oui', '2026-09-27T10:00:00Z']]),
    'interesse' => $h([['Non', '2026-09-27T10:00:00Z'], ['Oui', '2026-09-28T09:00:00Z']]),
    'hs_lead_status' => $h([['OPEN', '2026-09-26T09:00:00Z']]),
    'rdv' => $h([['OUI', '2026-09-28T09:30:00Z']]),
]);

metaCrmProcessContact('877', $contact, ['META_LEDGER_DIR' => $ledger], $nowS, $ok);
check('META_CRM_START_AT unset → CRM events disabled', $sent === []);

$retry = metaCrmProcessContact('877', $contact, $env, $nowS, $ok);
$names = array_column($sent, 'event_name');
check('CASE B/E: one MarketingQualifiedLead + one SalesQualifiedLead, no Schedule', $names === ['MarketingQualifiedLead', 'SalesQualifiedLead'], implode(',', $names));
check('deterministic event_id from the transition timestamp', ($sent[0]['event_id'] ?? '') === 'hubspot_877_MQL_' . $t('2026-09-27T10:00:00Z'));
check('event_time = transition time', ($sent[1]['event_time'] ?? 0) === intdiv($t('2026-09-28T09:00:00Z'), 1000));
check('action_source system_generated + custom_data.event_source crm', ($sent[0]['action_source'] ?? '') === 'system_generated' && ($sent[0]['custom_data']['event_source'] ?? '') === 'crm');
check('match keys: em, ph, fn, external_id — no invented fbp/fbc', array_keys($sent[0]['user_data'] ?? []) === ['em', 'ph', 'fn', 'external_id']);
check('no retry requested after success', $retry === false);

$sent = [];
metaCrmProcessContact('877', $contact, $env, $nowS, $ok);
check('CASE F: redelivery of the same change sends nothing', $sent === []);
$contact['propertiesWithHistory']['hs_lead_status'] = $h([['OPEN', '2026-09-26T09:00:00Z'], ['A_RAPPELER', '2026-09-28T10:00:00Z']]);
metaCrmProcessContact('877', $contact, $env, $nowS + 60, $ok);
check('CASE C: unrelated edit sends nothing', $sent === []);
$contact['propertiesWithHistory']['repondu'] = $h([['Oui', '2026-09-27T10:00:00Z'], ['Oui', '2026-09-28T10:30:00Z']]);
metaCrmProcessContact('877', $contact, $env, $nowS + 90, $ok);
check('CASE D: re-saving the same value sends nothing', $sent === []);
$contact['propertiesWithHistory']['repondu'] = $h([['Oui', '2026-09-27T10:00:00Z'], ['Non', '2026-09-28T10:00:00Z'], ['Oui', '2026-09-28T11:00:00Z']]);
metaCrmProcessContact('877', $contact, $env, $nowS + 120, $ok);
check('Oui → Non → Oui toggle does not re-qualify', $sent === []);

metaCrmProcessContact('878', $contact, $env + ['META_CRM_SCHEDULE_ENABLED' => '1'], $nowS, $ok);
check('Schedule only when explicitly enabled', in_array('Schedule', array_column($sent, 'event_name'), true));

$sent = [];
$august = $metaContact(['repondu' => $h([['Oui', '2026-08-03T11:55:55.976Z']]), 'interesse' => $h([['Oui', '2026-08-03T11:56:38.814Z']])]);
metaCrmProcessContact('879', $august, $env, (int) (new DateTimeImmutable('2026-08-04T00:00:00Z'))->format('U'), $ok);
check('2026-08-03 bulk-edit transitions are never sent (before activation)', $sent === []);
$preActivation = $metaContact(['repondu' => $h([['Oui', '2026-09-25T23:00:00Z']])]);
metaCrmProcessContact('880', $preActivation, $env, $nowS, $ok);
check('change 1 h before META_CRM_START_AT is not backfilled', $sent === []);

$organic = $metaContact(['repondu' => $h([['Oui', '2026-09-27T10:00:00Z']])], ['hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION', 'source_du_lead' => 'Meta ADS']);
metaCrmProcessContact('881', $organic, $env, $nowS, $ok);
check('non-attributable contact (only a manual "Meta ADS" label) sends nothing', $sent === []);

$website = $metaContact(['repondu' => $h([['Oui', '2026-09-27T10:00:00Z']])], ['hs_analytics_source' => 'OFFLINE', 'hs_analytics_source_data_1' => 'INTEGRATION', 'meta_fbc' => 'fb.1.1727000000000.IwAR0abcdefghij', 'meta_fbp' => 'fb.1.1727000000000.1234567890']);
metaCrmProcessContact('882', $website, $env, $nowS, $ok);
check('future Zap mapping: genuine meta_fbc/meta_fbp are reused as fbc/fbp', ($sent[0]['user_data']['fbc'] ?? '') === 'fb.1.1727000000000.IwAR0abcdefghij' && ($sent[0]['user_data']['fbp'] ?? '') === 'fb.1.1727000000000.1234567890');

$sent = [];
$attempts = 0;
$flaky = static function (array $events) use (&$attempts, &$sent) {
    $attempts++;
    if ($attempts === 1) return ['ok' => false, 'skipped' => false, 'status' => 0];
    foreach ($events as $event) $sent[] = $event;
    return ['ok' => true, 'skipped' => false, 'status' => 200];
};
$single = $metaContact(['repondu' => $h([['Oui', '2026-09-28T11:00:00Z']])]);
check('Meta failure → retry requested, not marked sent', metaCrmProcessContact('883', $single, $env, $nowS, $flaky) === true && $sent === []);
check('the retry sends it exactly once, same event ID', metaCrmProcessContact('883', $single, $env, $nowS + 30, $flaky) === false && count($sent) === 1 && $sent[0]['event_id'] === 'hubspot_883_MQL_' . $t('2026-09-28T11:00:00Z'));
$skipped = static fn () => ['ok' => false, 'skipped' => true, 'status' => 0];
check('unconfigured CAPI: no endless retries, not marked sent', metaCrmProcessContact('884', $single, $env, $nowS, $skipped) === false && metaCrmProcessContact('884', $single, $env, $nowS, $ok) === false && count($sent) === 2);

/* ── 6. Ledger storage ──────────────────────────────────────────────────── */
echo "ledger storage\n";
$records = glob($ledger . '/*.json') ?: [];
$allContent = implode("\n", array_map('file_get_contents', $records));
check('one small JSON record per contact+event', count($records) > 0 && max(array_map('filesize', $records)) < 200);
check('records hold only eventId/status/at — no email, phone or name', !preg_match('/@|3361234|Ali|lead@/i', $allContent) && array_keys(json_decode((string) file_get_contents($records[0]), true)) === ['eventId', 'status', 'at']);
check('directory 0700, records 0600', (fileperms($ledger) & 0777) === 0700 && (fileperms($records[0]) & 0777) === 0600, decoct(fileperms($ledger) & 0777) . '/' . decoct(fileperms($records[0]) & 0777));
check('no leftover temp files', glob($ledger . '/*.tmp') === []);
file_put_contents(metaLedgerRecordPath($ledger, 'stale_MQL'), json_encode(['eventId' => 'x', 'status' => 'pending', 'at' => $nowS - 3600]));
check('stale pending claim (crashed run) is reclaimed', metaLedgerClaim($ledger, 'stale_MQL', 'x', $nowS) === 'claimed');
file_put_contents(metaLedgerRecordPath($ledger, 'fresh_MQL'), json_encode(['eventId' => 'x', 'status' => 'pending', 'at' => $nowS - 5]));
check('fresh pending claim is "busy"', metaLedgerClaim($ledger, 'fresh_MQL', 'x', $nowS) === 'busy');
file_put_contents(metaLedgerRecordPath($ledger, 'corrupt_MQL'), '{not json');
check('corrupt record is reclaimed (same event ID → Meta dedup)', metaLedgerClaim($ledger, 'corrupt_MQL', 'x', $nowS) === 'claimed');
$old = metaLedgerRecordPath($ledger, 'old_MQL');
file_put_contents($old, '{}');
touch($old, $nowS - (META_LEDGER_RETENTION_DAYS + 1) * 86400);
$recent = metaLedgerRecordPath($ledger, '877_MQL');
check('prune removes records past retention, keeps recent ones', metaLedgerPrune($ledger, $nowS) === 1 && !is_file($old) && is_file($recent));
check('unwritable ledger → claim "error" → retry, never a blind send', metaLedgerClaim('/proc/definitely-not-writable/ledger', 'k', 'x', $nowS) === 'error');

/* ── 7. Concurrency: simultaneous deliveries of the same change ──────────── */
echo "concurrency (real parallel PHP processes)\n";
$worker = $sandbox . '/worker.php';
file_put_contents($worker, '<?php
require ' . var_export($webRoot . '/meta-private/meta-capi.php', true) . ';
ini_set("error_log", ' . var_export($sandbox . '/worker-error.log', true) . ');
[$script, $ledger, $attemptsLog, $startAtUs, $contactId] = $argv;
while (microtime(true) * 1e6 < (float) $startAtUs) { usleep(200); }
$contact = ["properties" => ["email" => "lead@example.com", "hs_analytics_source" => "PAID_SOCIAL", "hs_analytics_source_data_1" => "Facebook"],
            "propertiesWithHistory" => ["repondu" => [["value" => "Oui", "timestamp" => "2026-09-28T11:00:00Z"]]]];
$send = static function (array $events) use ($attemptsLog) {
    $fh = fopen($attemptsLog, "a"); flock($fh, LOCK_EX);
    fwrite($fh, $events[0]["event_id"] . "\n"); flock($fh, LOCK_UN); fclose($fh);
    usleep(400000); // a slow Meta call widens the race window
    return ["ok" => true, "skipped" => false, "status" => 200];
};
$retry = metaCrmProcessContact($contactId, $contact, ["META_LEDGER_DIR" => $ledger, "META_CRM_START_AT" => "2026-09-26T00:00:00Z"], ' . $nowS . ', $send);
echo $retry ? "retry" : "done";
');
$race = static function (int $processes, string $contactId) use ($worker, $sandbox) {
    $ledgerDir = $sandbox . '/race-ledger-' . $contactId;
    $attemptsLog = $sandbox . '/attempts-' . $contactId . '.log';
    $startAtUs = (string) ((microtime(true) + 0.8) * 1e6);
    $children = [];
    for ($i = 0; $i < $processes; $i++) {
        $children[] = proc_open([PHP_BINARY, $worker, $ledgerDir, $attemptsLog, $startAtUs, $contactId], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $outputs[] = $pipes[1];
    }
    $results = [];
    foreach ($children as $i => $child) {
        $results[] = stream_get_contents($outputs[$i]);
        proc_close($child);
    }
    $attempts = is_file($attemptsLog) ? array_values(array_filter(explode("\n", (string) file_get_contents($attemptsLog)))) : [];
    return [$attempts, $results];
};
[$attempts, $results] = $race(2, '901');
check('2 simultaneous deliveries → exactly one Meta attempt', count($attempts) === 1, count($attempts) . ' attempts');
check('…the loser answers "retry" (HubSpot re-delivers later)', count(array_keys($results, 'retry')) === 1 && count(array_keys($results, 'done')) === 1, implode(',', $results));
[$attempts, $results] = $race(8, '902');
check('8 simultaneous deliveries → exactly one Meta attempt', count($attempts) === 1, count($attempts) . ' attempts');
[$attemptsAfter] = $race(2, '902');
check('a later redelivery after completion → no attempt', count($attemptsAfter) === 1);

/* ── 8. HTTP: webhook auth modes + contact.php ──────────────────────────── */
echo "HTTP: webhook authentication modes\n";
file_put_contents($sandbox . '/no-https.php', '<?php stream_wrapper_unregister("https");');
$zapierLog = $sandbox . '/zapier.json';
mkdir($sandbox . '/zapier-root');
file_put_contents($sandbox . '/zapier-root/zapier.php', '<?php file_put_contents(' . var_export($zapierLog, true) . ', file_get_contents("php://input")); header("Content-Type: application/json"); echo "{\"status\":\"success\"}";');
$port = random_int(20000, 40000);
$zapierPort = $port + 1; // the built-in server is single-threaded: Zapier needs its own
$siteLog = $sandbox . '/site-error.log';
file_put_contents($webRoot . '/.env', implode("\n", [
    "CONTACT_WEBHOOK_URL=http://127.0.0.1:{$zapierPort}/zapier.php",
    'META_ACCESS_TOKEN=fake-token-for-tests',
    'CONTACT_TO=nobody@localhost',
    'HUBSPOT_CLIENT_SECRET=client-secret',
    'META_CRM_ZAPIER_SECRET=zapier-secret',
    'META_CRM_START_AT=' . $startAt,
    'META_LEDGER_DIR=' . $sandbox . '/http-ledger',
]) . "\n");
$zapierServer = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$zapierPort}", '-t', $sandbox . '/zapier-root'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $zapierPipes);
@mkdir($sandbox . '/tmp');
$server = proc_open([PHP_BINARY, '-d', 'auto_prepend_file=' . $sandbox . '/no-https.php', '-d', 'sendmail_path=/usr/bin/true', '-d', 'error_log=' . $siteLog, '-d', 'sys_temp_dir=' . $sandbox . '/tmp', '-S', "127.0.0.1:{$port}", '-t', $webRoot], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
usleep(700000);
$request = static function (string $method, string $path, string $body = '', array $headers = []) use ($port) {
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", array_merge(['Content-Type: application/json'], $headers)) . "\r\n",
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 20,
    ]]);
    $started = microtime(true);
    $response = file_get_contents("http://127.0.0.1:{$port}{$path}", false, $context);
    return ['status' => (int) substr($http_response_header[0] ?? '', 9, 3), 'body' => (string) $response, 'ms' => (int) ((microtime(true) - $started) * 1000)];
};
$batch = '[{"objectId":123,"subscriptionType":"contact.propertyChange","propertyName":"repondu"}]';
$ts = (string) (int) floor(microtime(true) * 1000);
$v3 = $sign3("https://127.0.0.1:{$port}/meta-crm-webhook.php", $batch, (int) $ts);
$hubspotV3 = ['X-HubSpot-Signature-v3: ' . $v3, 'X-HubSpot-Request-Timestamp: ' . $ts];
check('no credentials → 401', $request('POST', '/meta-crm-webhook.php', $batch)['status'] === 401);
check('HubSpot + Zapier headers together → 401 (modes never mixed)', $request('POST', '/meta-crm-webhook.php', $batch, [...$hubspotV3, 'X-Emara-Webhook-Secret: zapier-secret'])['status'] === 401);
check('HubSpot v3 bad signature → 401', $request('POST', '/meta-crm-webhook.php', $batch, ['X-HubSpot-Signature-v3: nope', 'X-HubSpot-Request-Timestamp: ' . $ts])['status'] === 401);
check('HubSpot v3 valid → authenticated (then 503: no HubSpot token)', $request('POST', '/meta-crm-webhook.php', $batch, $hubspotV3)['status'] === 503);
check('HubSpot v1 valid (no v3 header) → authenticated', $request('POST', '/meta-crm-webhook.php', $batch, ['X-HubSpot-Signature: ' . hash('sha256', 'client-secret' . $batch), 'X-HubSpot-Signature-Version: v1'])['status'] === 503);
check('HubSpot v1 invalid → 401', $request('POST', '/meta-crm-webhook.php', $batch, ['X-HubSpot-Signature: ' . hash('sha256', 'wrong' . $batch), 'X-HubSpot-Signature-Version: v1'])['status'] === 401);
check('HubSpot-signed but Zapier-shaped body → 400', $request('POST', '/meta-crm-webhook.php', '{"contactId":"123"}', ['X-HubSpot-Signature-v3: ' . $sign3("https://127.0.0.1:{$port}/meta-crm-webhook.php", '{"contactId":"123"}', (int) $ts), 'X-HubSpot-Request-Timestamp: ' . $ts])['status'] === 400);
check('Zapier wrong secret → 401', $request('POST', '/meta-crm-webhook.php', '{"contactId":"123"}', ['X-Emara-Webhook-Secret: nope'])['status'] === 401);
check('Zapier secret with a HubSpot-shaped batch → 400', $request('POST', '/meta-crm-webhook.php', $batch, ['X-Emara-Webhook-Secret: zapier-secret'])['status'] === 400);
check('Zapier valid → authenticated (then 503: no HubSpot token)', $request('POST', '/meta-crm-webhook.php', '{"contactId":"123"}', ['X-Emara-Webhook-Secret: zapier-secret'])['status'] === 503);
check('GET → 405', $request('GET', '/meta-crm-webhook.php')['status'] === 405);

echo "HTTP: contact.php (cli-server SAPI = no finish_request → synchronous path; Meta unreachable)\n";
$leadBody = json_encode([
    'form_type' => 'simulateur_request', 'nom_complet' => 'Client Test', 'email' => 'client@example.com',
    'telephone' => '+33612345678', 'phoneFull' => '+33612345678', 'phoneCode' => '+33', 'phoneCountryCode' => 'FR', 'phoneNumber' => '612345678',
    'budget' => '180001 EUR', 'message' => 'Intention : Recevoir les plans et prix', 'source' => 'https://emaraestates.com/simulateur/',
    'company_website' => '', 'elapsed_ms' => 9000, 'leadSource' => 'Simulateur budget', 'projectName' => 'Honest Signature 7',
    'fbp' => 'fb.1.1727000000000.1234567890', 'meta_event_id' => 'lead_0b7f7d3c-3b69-4a7e-9d51-6f0c0f0e2a11',
]);
$result = $request('POST', '/contact.php', $leadBody, ['Referer: https://emaraestates.com/simulateur/']);
$logAtResponse = (string) @file_get_contents($siteLog);
check('lead accepted: 200 + success message although Meta is down', $result['status'] === 200 && str_contains($result['body'], 'Votre demande a bien été envoyée'), $result['status'] . ' ' . $result['body']);
check('lead reached Zapier before anything Meta', (json_decode((string) @file_get_contents($zapierLog), true)['email'] ?? '') === 'client@example.com');
check('synchronous path: Meta attempt logged BEFORE the response returned', str_contains($logAtResponse, '"eventName":"Lead"') && str_contains($logAtResponse, 'lead_0b7f7d3c-3b69-4a7e-9d51-6f0c0f0e2a11') && str_contains($logAtResponse, '"success":false'));
check('logs: no raw PII, no token', !preg_match('/client@example\.com|612345678|fake-token-for-tests/', $logAtResponse));
@unlink($zapierLog);
$bot = $request('POST', '/contact.php', (string) json_encode(['company_website' => 'spam'] + json_decode($leadBody, true)));
check('honeypot: silent 200, nothing forwarded, no Meta attempt', $bot['status'] === 200 && !is_file($zapierLog) && substr_count((string) file_get_contents($siteLog), '"eventName":"Lead"') === 1);
$plain = $request('POST', '/contact.php', (string) json_encode(array_diff_key(json_decode($leadBody, true), ['meta_event_id' => 1])));
check('forms without meta_event_id: no server event', $plain['status'] === 200 && substr_count((string) file_get_contents($siteLog), '"eventName":"Lead"') === 1);

echo "HTTP: contact.php — one person, one Lead (/honest-signature-7/)\n";
$hs7Lead = static fn (string $eventId, array $over = []) => (string) json_encode($over + [
    'form_type' => 'honest_signature_7_request', 'nom_complet' => 'Client Deux Fois', 'email' => 'twice@example.com',
    'telephone' => '+33698765432', 'phoneFull' => '+33698765432', 'phoneCode' => '+33', 'phoneCountryCode' => 'FR', 'phoneNumber' => '698765432',
    'budget' => '149 000 – 180 000 €', 'message' => 'Demande', 'source' => 'Meta Ads', 'company_website' => '', 'elapsed_ms' => 9000,
    'leadSource' => 'Landing Honest Signature 7', 'projectName' => 'Honest Signature 7', 'lead_stage' => 'lead', 'meta_event_id' => $eventId,
]);
$hs7Referer = ['Referer: https://emaraestates.com/honest-signature-7/'];
$leadsLogged = static fn (): int => substr_count((string) file_get_contents($siteLog), '"eventName":"Lead"');
$leadsBefore = $leadsLogged();
@unlink($zapierLog);
$first = $request('POST', '/contact.php', $hs7Lead('lead_11111111-1111-4111-8111-111111111111'), $hs7Referer);
check('a person\'s first lead: accepted, server Lead attempted, not flagged as a repeat', $first['status'] === 200 && !str_contains($first['body'], 'repeat_lead') && $leadsLogged() === $leadsBefore + 1, $first['body']);
@unlink($zapierLog);
$again = $request('POST', '/contact.php', $hs7Lead('lead_22222222-2222-4222-8222-222222222222'), $hs7Referer);
check('the same person again (page reloaded, new event ID): still sent to Zapier, flagged repeat_lead, no second server Lead', $again['status'] === 200 && (json_decode($again['body'], true)['repeat_lead'] ?? false) === true && (json_decode((string) @file_get_contents($zapierLog), true)['email'] ?? '') === 'twice@example.com' && $leadsLogged() === $leadsBefore + 1, $again['body']);
$otherMail = $request('POST', '/contact.php', $hs7Lead('lead_33333333-3333-4333-8333-333333333333', ['email' => 'autre@example.com']), $hs7Referer);
check('same phone with another e-mail: the same person', (json_decode($otherMail['body'], true)['repeat_lead'] ?? false) === true && $leadsLogged() === $leadsBefore + 1);
$otherPhone = $request('POST', '/contact.php', $hs7Lead('lead_44444444-4444-4444-8444-444444444444', ['telephone' => '+33611112222', 'phoneFull' => '+33611112222', 'phoneNumber' => '611112222', 'email' => 'autre@example.com']), $hs7Referer);
check('that second e-mail with another phone: still the same person', (json_decode($otherPhone['body'], true)['repeat_lead'] ?? false) === true && $leadsLogged() === $leadsBefore + 1);
$someoneElse = $request('POST', '/contact.php', $hs7Lead('lead_55555555-5555-4555-8555-555555555555', ['telephone' => '+33700000001', 'phoneFull' => '+33700000001', 'phoneNumber' => '700000001', 'email' => 'nouveau@example.com']), $hs7Referer);
check('another person: a new Lead', $someoneElse['status'] === 200 && !str_contains($someoneElse['body'], 'repeat_lead') && $leadsLogged() === $leadsBefore + 2);
$ledgerText = implode('', array_map(static fn (string $path): string => basename($path) . (string) file_get_contents($path), glob($sandbox . '/http-ledger/weblead_*.json') ?: []));
check('the ledger remembers them by hash only — no phone, no e-mail', $ledgerText !== '' && !preg_match('/698765432|611112222|700000001|example\.com|twice|autre|nouveau/', $ledgerText));
check('repeat window: ' . META_LEAD_REPEAT_DAYS . ' days, then the same person counts again', metaLeadIsRepeat(['META_LEDGER_DIR' => $sandbox . '/http-ledger'], 'Honest Signature 7', '+33698765432', '', time() + (META_LEAD_REPEAT_DAYS - 1) * 86400) === true && metaLeadIsRepeat(['META_LEDGER_DIR' => $sandbox . '/http-ledger'], 'Honest Signature 7', '+33698765432', '', time() + (META_LEAD_REPEAT_DAYS + 1) * 86400) === false);
$debugKey = preg_match("/CONTACT_DEBUG_KEY = '([^']+)'/", (string) file_get_contents($webRoot . '/contact.php'), $m) ? $m[1] : '';
$debug = $request('GET', '/contact.php?debug=' . $debugKey);
$diag = json_decode($debug['body'], true)['meta'] ?? [];
check('diagnostics: reports SAPI + finish_request availability', ($diag['sapi'] ?? '') === 'cli-server' && ($diag['finish_request'] ?? '') === 'none (synchronous send)');
check('diagnostics: ledger writable, config booleans', ($diag['ledger_writable'] ?? null) === true && ($diag['meta_capi_configured'] ?? null) === true && ($diag['crm_start_at_set'] ?? null) === true && ($diag['crm_schedule_enabled'] ?? null) === false);
check('diagnostics: no secret, token or path in the output', !preg_match('/fake-token|client-secret|zapier-secret|emara-meta-check|http-ledger/', $debug['body']));

foreach ([$server, $zapierServer] as $process) {
    proc_terminate($process);
    proc_close($process);
}
exec('rm -rf ' . escapeshellarg($sandbox));

echo $failures === 0 ? "\nall Meta CAPI checks passed\n" : "\n{$failures} check(s) failed\n";
exit($failures === 0 ? 0 : 1);
