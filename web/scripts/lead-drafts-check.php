<?php
declare(strict_types=1);

/**
 * Lead drafts (partial / abandoned form capture) — the seven scenarios of the
 * brief, validation, security limits, e-mail content, concurrency, and the
 * real HTTP behaviour of /lead-draft.php and contact.php together.
 *
 * Runs against a throwaway copy of the PHP files in a temp sandbox: the store
 * it writes, the rate-limit counters and the .env it reads never touch the
 * repo or the system temp directory. Nothing leaves the machine — "Zapier" is
 * a local stub and mail() is diverted to a file.
 *
 * Run: php scripts/lead-drafts-check.php   (from web/)
 */

$repo = dirname(__DIR__, 2);
$sandbox = sys_get_temp_dir() . '/emara-drafts-check-' . bin2hex(random_bytes(4));
$webRoot = $sandbox . '/public_html';
mkdir($webRoot . '/lead-private', 0777, true);
mkdir($webRoot . '/meta-private', 0777, true);
copy($repo . '/lead-private/lead-drafts.php', $webRoot . '/lead-private/lead-drafts.php');
copy($repo . '/lead-draft.php', $webRoot . '/lead-draft.php');
copy($repo . '/contact.php', $webRoot . '/contact.php');
copy($repo . '/meta-private/meta-capi.php', $webRoot . '/meta-private/meta-capi.php');
require $webRoot . '/lead-private/lead-drafts.php';

ini_set('log_errors', '1');
ini_set('error_log', $sandbox . '/php-error.log');

$failures = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures;
    if (!$ok) $failures++;
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . ($detail !== '' && !$ok ? "  — {$detail}" : '') . "\n";
}

$HOST = 'emaraestates.com';
$PAGE = 'https://emaraestates.com/honest-signature-7/?utm_source=facebook';
$T0 = 1_790_000_000;

/** A fresh store, and the helpers every scenario needs. */
$newStore = static function (string $name) use ($sandbox): string {
    $dir = $sandbox . '/store-' . $name;
    mkdir($dir, 0700, true);
    return $dir;
};
$input = static fn (string $session, array $fields = []) => $fields + [
    'form_session_id' => $session,
    'project_name' => 'Honest Signature 7',
    'current_step' => 'coordonnees',
    'utm_source' => 'facebook',
    'utm_campaign' => 'hs7-gueliz',
    'utm_content' => 'creative-a',
    'fbclid' => 'click-123',
    'page_url' => $PAGE,
];
$save = static function (string $dir, array $body, int $now) use ($HOST): array {
    $data = leadDraftNormalize($body, $HOST);
    return $data === null ? ['stored' => false, 'created' => false, 'reason' => 'nothing'] : leadDraftUpsert($dir, $data, $now);
};
$drafts = static fn (string $dir) => array_values(array_map(static fn ($file) => json_decode((string) file_get_contents($file), true), glob($dir . '/d_*.json') ?: []));
/** Records every e-mail instead of sending it. */
$outbox = static function (array &$sent): callable {
    return static function (string $subject, string $body, array $record) use (&$sent): void {
        $sent[] = ['subject' => $subject, 'body' => $body, 'session' => $record['form_session_id']];
    };
};
$subjects = static fn (array $sent) => array_column($sent, 'subject');
$S = static fn (int $n) => sprintf('0b7f7d3c-3b69-4a7e-9d51-%012d', $n);

/* ── A. Types a phone number and leaves ─────────────────────────────────── */
echo "A. Visitor types a phone number and leaves\n";
$dir = $newStore('a');
$sent = [];
$result = $save($dir, $input($S(1), ['name' => 'Yasmine El Idrissi', 'phone' => '+212612345678']), $T0);
check('partial saved, one draft', $result['stored'] && $result['created'] && count($drafts($dir)) === 1);
check('nothing e-mailed at the moment of capture (grace period)', !isset($result['notify']));
$draft = $drafts($dir)[0];
check('status in_progress, only what was typed', $draft['status'] === 'in_progress' && $draft['phone'] === '+212612345678' && $draft['email'] === '' && $draft['fields_completed'] === ['name', 'phone']);
$dirSteps = $newStore('steps');
$sentSteps = [];
$save($dirSteps, $input($S(40), ['phone' => '+212612345678', 'property_type' => 'Appartement 2 chambres', 'budget' => '1,6 M – 2 M MAD']), $T0);
$withSteps = $drafts($dirSteps)[0];
check('the two answers given before the contact step are kept with the draft', $withSteps['property_type'] === 'Appartement 2 chambres' && $withSteps['budget'] === '1,6 M – 2 M MAD' && $withSteps['fields_completed'] === ['property_type', 'budget', 'phone']);
leadDraftSweep($dirSteps, $T0 + 700, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sentSteps));
check('…and shown in the abandonment e-mail', str_contains($sentSteps[0]['body'] ?? '', 'Appartement 2 chambres') && str_contains($sentSteps[0]['body'] ?? '', '1,6 M – 2 M MAD') && str_contains($sentSteps[0]['body'] ?? '', 'Type de bien, Budget, Téléphone'));
check('attribution and landing page kept', $draft['utm_campaign'] === 'hs7-gueliz' && $draft['utm_content'] === 'creative-a' && $draft['fbclid'] === 'click-123' && $draft['page_url'] === $PAGE);
check('no IP, no user agent, nothing the visitor did not enter', !array_intersect(array_keys($draft), ['ip', 'user_agent', 'ua', 'referrer']));
leadDraftSweep($dir, $T0 + 599, [], true, $outbox($sent));
check('9 min 59 s idle: not abandoned yet', $drafts($dir)[0]['status'] === 'in_progress' && !in_array('Lead abandonné — Honest Signature 7', $subjects($sent), true));
$sent = [];
$sweep = leadDraftSweep($dir, $T0 + 601, [], true, $outbox($sent));
$draft = $drafts($dir)[0];
check('10 min idle: abandoned, abandoned_at set', $draft['status'] === 'abandoned' && $draft['abandoned_at'] !== '' && $sweep['abandoned'] === 1);
check('exactly one e-mail: "Lead abandonné — Honest Signature 7"', $subjects($sent) === ['Lead abandonné — Honest Signature 7'], implode(' | ', $subjects($sent)));
$body = $sent[0]['body'] ?? '';
check('e-mail: status, explanation, contact, fields, step, times, URL, UTM', str_contains($body, 'FORMULAIRE NON TERMINÉ') && str_contains($body, 'n’a pas terminé le formulaire') && str_contains($body, 'Yasmine El Idrissi') && str_contains($body, '+212612345678') && str_contains($body, 'Nom, Téléphone') && str_contains($body, 'Coordonnées') && str_contains($body, 'Début du formulaire') && str_contains($body, 'Dernière activité') && str_contains($body, $PAGE) && str_contains($body, 'facebook') && str_contains($body, 'hs7-gueliz') && str_contains($body, 'creative-a'));
$sent = [];
leadDraftSweep($dir, $T0 + 700, [], true, $outbox($sent));
leadDraftSweep($dir, $T0 + 86400, [], true, $outbox($sent));
check('later sweeps: never a second abandonment e-mail', $sent === [] && $drafts($dir)[0]['abandonment_notification_sent_at'] !== '');

echo "A′. Still on the form after the grace period → one \"en cours\" e-mail, then abandonment\n";
$dir = $newStore('a2');
$sent = [];
$save($dir, $input($S(2), ['phone' => '+212612345678']), $T0);
$again = $save($dir, $input($S(2), ['phone' => '+212612345678', 'name' => 'Karim']), $T0 + 20);
check('before 45 s: no "en cours" e-mail', !isset($again['notify']));
$late = $save($dir, $input($S(2), ['phone' => '+212612345678', 'name' => 'Karim']), $T0 + 47);
check('after 45 s, still open: "en cours" claimed for this request', isset($late['notify']));
leadDraftNotifyPartial($dir, $late['notify'], [], $outbox($sent));
$more = $save($dir, $input($S(2), ['phone' => '+212612345678', 'name' => 'Karim B', 'email' => 'karim@example.com']), $T0 + 60);
check('further edits: never a second "en cours" e-mail', !isset($more['notify']) && $subjects($sent) === ['Nouveau prospect en cours — Honest Signature 7']);
$body = $sent[0]['body'] ?? '';
check('"en cours" e-mail: status, contact, date, page, step, campaign, content, fbclid', str_contains($body, 'FORMULAIRE EN COURS') && str_contains($body, 'Karim') && str_contains($body, '+212612345678') && str_contains($body, 'heure de Marrakech') && str_contains($body, $PAGE) && str_contains($body, 'Coordonnées') && str_contains($body, 'hs7-gueliz') && str_contains($body, 'creative-a') && str_contains($body, 'click-123'));
leadDraftSweep($dir, $T0 + 60 + 601, [], true, $outbox($sent));
check('then abandoned: one abandonment e-mail, two e-mails in all', $subjects($sent) === ['Nouveau prospect en cours — Honest Signature 7', 'Lead abandonné — Honest Signature 7']);

echo "A″. The sweep also sends \"en cours\" for a draft nobody touched again\n";
$dir = $newStore('a3');
$sent = [];
$save($dir, $input($S(3), ['email' => 'visitor@example.com']), $T0);
$sweep = leadDraftSweep($dir, $T0 + 120, [], true, $outbox($sent));
check('2 min, open, not notified → "en cours" from the sweep', $sweep['partial'] === 1 && $subjects($sent) === ['Nouveau prospect en cours — Honest Signature 7']);
$sent = [];
leadDraftSweep($dir, $T0 + 180, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '1'], true, $outbox($sent));
check('…once', $sent === []);
$dir = $newStore('a4');
$sent = [];
$save($dir, $input($S(4), ['phone' => '+212612345678']), $T0);
leadDraftSweep($dir, $T0 + 120, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('LEAD_DRAFTS_PARTIAL_EMAIL=0: no "en cours" e-mail', $sent === []);
leadDraftSweep($dir, $T0 + 700, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('…the abandonment e-mail still goes out', $subjects($sent) === ['Lead abandonné — Honest Signature 7']);

/* ── B. Types a phone number, then submits ──────────────────────────────── */
echo "B. Visitor types a phone number, continues and submits\n";
$dir = $newStore('b');
$sent = [];
$save($dir, $input($S(5), ['name' => 'Client Test', 'phone' => '+33612345678']), $T0);
check('the real lead closes the draft', leadDraftMarkSubmitted($dir, $S(5), $T0 + 12));
$draft = $drafts($dir)[0];
check('same draft: status submitted, submitted_at set, still one record', count($drafts($dir)) === 1 && $draft['status'] === 'submitted' && $draft['submitted_at'] === leadDraftIso($T0 + 12));
$late = $save($dir, $input($S(5), ['name' => 'Client Test', 'phone' => '+33612345678', 'email' => 'late@example.com']), $T0 + 13);
check('a draft request arriving after the submission changes nothing', !$late['stored'] && $late['reason'] === 'submitted' && $drafts($dir)[0]['status'] === 'submitted' && $drafts($dir)[0]['email'] === '');
leadDraftSweep($dir, $T0 + 3600, [], true, $outbox($sent));
check('no abandonment e-mail, no "en cours" e-mail', $sent === [] && $drafts($dir)[0]['status'] === 'submitted');
leadDraftMarkSubmitted($dir, $S(5), $T0 + 90);
check('qualification follow-up (same session): first submission time kept', $drafts($dir)[0]['submitted_at'] === leadDraftIso($T0 + 12));
$dir = $newStore('b2');
leadDraftMarkSubmitted($dir, $S(6), $T0);
$late = $save($dir, $input($S(6), ['phone' => '+33612345678']), $T0 + 1);
check('submitted before any draft was saved: a marker blocks a late draft', !$late['stored'] && count($drafts($dir)) === 1 && !isset($drafts($dir)[0]['phone']));
check('markSubmitted rejects a malformed session ID', !leadDraftMarkSubmitted($dir, '../../etc/passwd', $T0) && count($drafts($dir)) === 1);

/* ── C. Edits the phone number several times ────────────────────────────── */
echo "C. Visitor edits the phone number multiple times\n";
$dir = $newStore('c');
foreach (['+212612345670', '+212612345671', '+212612345672', '+212612345673'] as $i => $phone) {
    $save($dir, $input($S(7), ['phone' => $phone]), $T0 + $i * 3);
}
check('one draft, holding the latest number', count($drafts($dir)) === 1 && $drafts($dir)[0]['phone'] === '+212612345673');
check('created_at fixed, last_activity_at moved', $drafts($dir)[0]['created_at'] === leadDraftIso($T0) && $drafts($dir)[0]['last_activity_at'] === leadDraftIso($T0 + 9));
$save($dir, $input($S(7), ['phone' => '+2126', 'email' => 'now@example.com']), $T0 + 20);
check('a number made invalid while typing does not erase the valid one', $drafts($dir)[0]['phone'] === '+212612345673' && $drafts($dir)[0]['email'] === 'now@example.com');
$save($dir, $input($S(7), ['phone' => '+212612345673', 'utm_campaign' => 'other-campaign', 'page_url' => 'https://emaraestates.com/other']), $T0 + 25);
check('attribution and landing URL are first-touch', $drafts($dir)[0]['utm_campaign'] === 'hs7-gueliz' && $drafts($dir)[0]['page_url'] === $PAGE);

/* ── D. Opens the form, enters no contact information ───────────────────── */
echo "D. Visitor opens the form but enters no contact information\n";
$dir = $newStore('d');
foreach ([
    'name only' => ['name' => 'Yasmine'],
    'nothing' => [],
    'phone still being typed' => ['phone' => '+21261'],
    'phone without a country code' => ['phone' => '0612345678'],
    'e-mail still being typed' => ['email' => 'yasmine@'],
] as $label => $fields) {
    $result = $save($dir, $input($S(8), $fields), $T0);
    check("{$label}: no personal draft", !$result['stored'] && $drafts($dir) === []);
}

/* ── E. Returns before the abandonment timeout ──────────────────────────── */
echo "E. Visitor returns before the abandonment timeout\n";
$dir = $newStore('e');
$sent = [];
$save($dir, $input($S(9), ['phone' => '+212612345678']), $T0);
$save($dir, $input($S(9), ['phone' => '+212612345678']), $T0 + 480);
check('activity at 8 min: last_activity_at updated', $drafts($dir)[0]['last_activity_at'] === leadDraftIso($T0 + 480));
leadDraftSweep($dir, $T0 + 720, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('12 min after the start (4 min idle): still in progress, no e-mail', $drafts($dir)[0]['status'] === 'in_progress' && $sent === []);
leadDraftSweep($dir, $T0 + 480 + 601, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('10 min after the last activity: abandoned, one e-mail', $drafts($dir)[0]['status'] === 'abandoned' && count($sent) === 1);
$save($dir, $input($S(9), ['phone' => '+212612345678', 'name' => 'De retour']), $T0 + 3000);
check('comes back after being marked abandoned: in progress again', $drafts($dir)[0]['status'] === 'in_progress');
leadDraftSweep($dir, $T0 + 3000 + 700, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('abandons again: marked, but no second abandonment e-mail', $drafts($dir)[0]['status'] === 'abandoned' && count($sent) === 1);
leadDraftMarkSubmitted($dir, $S(9), $T0 + 5000);
check('an abandoned draft can still become submitted', $drafts($dir)[0]['status'] === 'submitted');

/* ── F. E-mail failure ──────────────────────────────────────────────────── */
echo "F. E-mail failure\n";
$dir = $newStore('f');
$attempts = 0;
$failing = static function () use (&$attempts): void {
    $attempts++;
    throw new RuntimeException('smtp down');
};
$save($dir, $input($S(10), ['phone' => '+212612345678']), $T0);
$sweep = leadDraftSweep($dir, $T0 + 700, [], true, $failing);
check('delivery failure: sweep returns normally, draft kept as abandoned', $sweep['failed'] === 1 && $sweep['notified'] === 0 && $drafts($dir)[0]['status'] === 'abandoned');
check('failed notification is given back for a retry', $drafts($dir)[0]['abandonment_notification_sent_at'] === '');
leadDraftSweep($dir, $T0 + 800, [], true, $failing);
leadDraftSweep($dir, $T0 + 900, [], true, $failing);
leadDraftSweep($dir, $T0 + 1000, [], true, $failing);
check('retried by later sweeps, three sends at most', $attempts === 3, (string) $attempts);
$dir = $newStore('f2');
$sent = [];
$flaky = 0;
$save($dir, $input($S(11), ['phone' => '+212612345678']), $T0);
$send = static function (string $subject, string $body, array $record) use (&$flaky, &$sent): void {
    if (++$flaky === 1) throw new RuntimeException('temporary');
    $sent[] = $subject;
};
leadDraftSweep($dir, $T0 + 700, [], true, $send);
leadDraftSweep($dir, $T0 + 800, [], true, $send);
leadDraftSweep($dir, $T0 + 900, [], true, $send);
check('fails once, then delivered exactly once', $sent === ['Lead abandonné — Honest Signature 7']);
$unwritable = $sandbox . '/file-not-dir';
file_put_contents($unwritable, 'x');
$data = leadDraftNormalize($input($S(12), ['phone' => '+212612345678']), $HOST);
$result = leadDraftUpsert($unwritable . '/store', $data, $T0);
check('store not writable: reported, nothing thrown', !$result['stored'] && $result['reason'] === 'storage');
check('…sweep and markSubmitted likewise', (leadDraftSweep($unwritable . '/store', $T0, [], true)['error'] ?? '') === 'storage' && leadDraftMarkSubmitted($unwritable . '/store', $S(12), $T0) === false);

/* ── G. Two browser sessions ────────────────────────────────────────────── */
echo "G. Two browser sessions\n";
$dir = $newStore('g');
$sent = [];
$save($dir, $input($S(13), ['phone' => '+212612345678']), $T0);
$save($dir, $input($S(14), ['phone' => '+212612345678']), $T0 + 5);
$ids = array_column($drafts($dir), 'form_session_id');
sort($ids);
check('two form_session_ids → two drafts', $ids === [$S(13), $S(14)] && count(array_unique(array_column($drafts($dir), 'id'))) === 2);
leadDraftMarkSubmitted($dir, $S(13), $T0 + 20);
leadDraftSweep($dir, $T0 + 700, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('one submits, the other is abandoned: one e-mail, for the right session', count($sent) === 1 && $sent[0]['session'] === $S(14));

/* ── Validation and sanitisation ────────────────────────────────────────── */
echo "Server-side validation\n";
check('session ID: UUID accepted', leadDraftValidSessionId($S(1)) && leadDraftValidSessionId('abcDEF0123456789'));
check('session ID: too short / path / spaces / empty refused', !leadDraftValidSessionId('short') && !leadDraftValidSessionId('../../../../etc/passwd') && !leadDraftValidSessionId('a b c d e f g h i j k l') && !leadDraftValidSessionId(''));
check('phone: E.164 normalised', leadDraftPhone('+212 6 12 34 56 78') === '+212612345678' && leadDraftPhone('+33612345678') === '+33612345678');
check('phone: no +, too short, too long, letters, array → refused', leadDraftPhone('0612345678') === '' && leadDraftPhone('+2126') === '' && leadDraftPhone('+1234567890123456') === '' && leadDraftPhone('+abc') === '' && leadDraftPhone(['+212612345678']) === '');
check('e-mail: valid kept; malformed, header injection, array → refused', leadDraftEmail('a@b.co') === 'a@b.co' && leadDraftEmail('a@b') === '' && leadDraftEmail("a@b.co\r\nBcc: x@y.z") === '' && leadDraftEmail(['a@b.co']) === '');
check('unknown project → nothing storable', leadDraftNormalize($input($S(1), ['phone' => '+212612345678', 'project_name' => 'Another Project']), $HOST) === null);
check('malformed session → nothing storable', leadDraftNormalize(['form_session_id' => ['x']] + $input($S(1), ['phone' => '+212612345678']), $HOST) === null);
$data = leadDraftNormalize($input($S(1), ['phone' => '+212612345678', 'name' => "<script>alert(1)</script>  Yas\tmine\r\nBcc: x@y.z", 'page_url' => 'https://evil.example/phish', 'utm_campaign' => str_repeat('x', 900), 'current_step' => 'made-up']), $HOST);
check('name: tags and control characters removed', $data['name'] === 'alert(1) Yas mine Bcc: x@y.z', $data['name']);
check('landing URL on another host is dropped', $data['page_url'] === '');
check('long values are cut, unknown step falls back', strlen($data['attribution']['utm_campaign']) === 200 && $data['current_step'] === 'coordonnees');
$dir = $newStore('fields');
$save($dir, $input($S(15), ['phone' => '+212612345678', 'fields_completed' => ['name', 'email', 'budget'], 'status' => 'submitted', 'partial_notification_sent_at' => 'x']), $T0);
check('fields_completed and status are computed here, never taken from the browser', $drafts($dir)[0]['fields_completed'] === ['phone'] && $drafts($dir)[0]['status'] === 'in_progress' && $drafts($dir)[0]['partial_notification_sent_at'] === '');
check('same-origin: matching Origin', leadDraftSameOrigin(['HTTP_HOST' => 'emaraestates.com', 'HTTP_ORIGIN' => 'https://emaraestates.com']));
check('same-origin: other Origin, no Origin and no Referer → refused', !leadDraftSameOrigin(['HTTP_HOST' => 'emaraestates.com', 'HTTP_ORIGIN' => 'https://evil.example']) && !leadDraftSameOrigin(['HTTP_HOST' => 'emaraestates.com']));
check('same-origin: Referer accepted when Origin is absent; Origin wins when both differ', leadDraftSameOrigin(['HTTP_HOST' => 'emaraestates.com', 'HTTP_REFERER' => 'https://emaraestates.com/honest-signature-7/']) && !leadDraftSameOrigin(['HTTP_HOST' => 'emaraestates.com', 'HTTP_ORIGIN' => 'https://evil.example', 'HTTP_REFERER' => 'https://emaraestates.com/']));

/* ── Limits, retention ──────────────────────────────────────────────────── */
echo "Limits and retention\n";
$dir = $newStore('budget');
$sent = [];
for ($i = 0; $i < LEAD_DRAFT_EMAILS_PER_HOUR + 15; $i++) {
    $save($dir, $input($S(1000 + $i), ['phone' => '+212612345678']), $T0);
}
for ($pass = 0; $pass < 12; $pass++) leadDraftSweep($dir, $T0 + 700, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('e-mails per hour are capped (a flood cannot bury the inbox)', count($sent) === LEAD_DRAFT_EMAILS_PER_HOUR, (string) count($sent));
for ($pass = 0; $pass < 4; $pass++) leadDraftSweep($dir, $T0 + 700 + 3600, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, $outbox($sent));
check('…the rest goes out the next hour: none lost, none twice', count($sent) === LEAD_DRAFT_EMAILS_PER_HOUR + 15 && count(array_unique(array_column($sent, 'session'))) === count($sent), (string) count($sent));
$dir = $newStore('newcap');
$stored = 0;
for ($i = 0; $i < LEAD_DRAFT_NEW_PER_HOUR + 5; $i++) {
    if ($save($dir, $input($S(5000 + $i), ['phone' => '+212612345678']), $T0)['stored']) $stored++;
}
check('new drafts per hour are capped', $stored === LEAD_DRAFT_NEW_PER_HOUR, (string) $stored);
$denied = leadDraftUpsert($newStore('ipcap'), leadDraftNormalize($input($S(16), ['phone' => '+212612345678']), $HOST), $T0, true, static fn () => false);
check('per-IP creation limit refused → nothing stored', !$denied['stored'] && $denied['reason'] === 'rate');
$dir = $newStore('throttle');
leadDraftSweep($dir, $T0, []);
check('visitor-triggered sweeps are throttled; cron (forced) is not', (leadDraftSweep($dir, $T0 + 5, [])['skipped'] ?? false) === true && !isset(leadDraftSweep($dir, $T0 + 5, [], true)['skipped']) && !isset(leadDraftSweep($dir, $T0 + 60, [])['skipped']));
$dir = $newStore('retention');
$save($dir, $input($S(17), ['phone' => '+212612345678']), $T0);
$save($dir, $input($S(18), ['phone' => '+212612345678']), $T0);
leadDraftMarkSubmitted($dir, $S(18), $T0 + 10);
leadDraftSweep($dir, $T0 + 8 * 86400, ['LEAD_DRAFTS_PARTIAL_EMAIL' => '0'], true, static function (): void {});
check('submitted draft deleted after ' . LEAD_DRAFT_SUBMITTED_RETENTION_DAYS . ' days; abandoned one kept', array_column($drafts($dir), 'form_session_id') === [$S(17)]);
$pruned = leadDraftSweep($dir, $T0 + (LEAD_DRAFT_RETENTION_DAYS + 1) * 86400, [], true, static function (): void {});
check('abandoned draft deleted after ' . LEAD_DRAFT_RETENTION_DAYS . ' days', $drafts($dir) === [] && $pruned['pruned'] === 1);
$ip = '203.0.113.' . random_int(1, 250);
$hits = 0;
ini_set('sys_temp_dir', $sandbox);
for ($i = 0; $i < 6; $i++) {
    if (!leadDraftRateLimited($ip, 'test', 4, $T0)) $hits++;
}
check('rate limiter: 4 allowed, then refused, then reset after the window', $hits === 4 && !leadDraftRateLimited($ip, 'test', 4, $T0 + 3601));

/* ── Concurrency: real processes ────────────────────────────────────────── */
echo "Concurrency\n";
$dir = $newStore('race');
$save($dir, $input($S(19), ['phone' => '+212612345678']), time() - 700);
$mailLog = $sandbox . '/race-mail.log';
$worker = $sandbox . '/sweep-worker.php';
file_put_contents($worker, '<?php
require ' . var_export($webRoot . '/lead-private/lead-drafts.php', true) . ';
usleep(max(0, (int) ((float) $argv[3] - microtime(true)) * 1000000));
leadDraftSweep($argv[1], time(), ["LEAD_DRAFTS_PARTIAL_EMAIL" => "0"], true, static function (string $subject) use ($argv): void {
    file_put_contents($argv[2], $subject . "\n", FILE_APPEND | LOCK_EX);
    usleep(150000);
});');
$startAt = (string) (microtime(true) + 0.4);
$children = [];
for ($i = 0; $i < 8; $i++) {
    $children[] = proc_open([PHP_BINARY, $worker, $dir, $mailLog, $startAt], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
}
foreach ($children as $child) proc_close($child);
$lines = is_file($mailLog) ? file($mailLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
check('8 sweeps at the same instant → exactly one abandonment e-mail', count($lines) === 1, count($lines) . ' e-mails');
$dir = $newStore('race-upsert');
$upsertWorker = $sandbox . '/upsert-worker.php';
file_put_contents($upsertWorker, '<?php
require ' . var_export($webRoot . '/lead-private/lead-drafts.php', true) . ';
usleep(max(0, (int) ((float) $argv[3] - microtime(true)) * 1000000));
$data = leadDraftNormalize(["form_session_id" => $argv[2], "project_name" => "Honest Signature 7", "phone" => "+2126123456" . $argv[4]], "emaraestates.com");
leadDraftUpsert($argv[1], $data, time());');
$startAt = (string) (microtime(true) + 0.4);
$children = [];
for ($i = 0; $i < 8; $i++) {
    $children[] = proc_open([PHP_BINARY, $upsertWorker, $dir, $S(20), $startAt, sprintf('%02d', $i)], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
}
foreach ($children as $child) proc_close($child);
check('8 saves of one session at the same instant → one intact draft', count($drafts($dir)) === 1 && is_array($drafts($dir)[0]) && preg_match('/^\+2126123456\d\d$/', $drafts($dir)[0]['phone']) === 1);

/* ── HTTP: /lead-draft.php and contact.php, real requests ───────────────── */
echo "HTTP: /lead-draft.php\n";
file_put_contents($sandbox . '/no-https.php', '<?php stream_wrapper_unregister("https");');
$zapierLog = $sandbox . '/zapier.json';
$zapierMode = $sandbox . '/zapier-mode';
mkdir($sandbox . '/zapier-root');
file_put_contents($sandbox . '/zapier-root/zapier.php', '<?php
if (is_file(' . var_export($zapierMode, true) . ')) { http_response_code(500); echo "{}"; exit; }
file_put_contents(' . var_export($zapierLog, true) . ', file_get_contents("php://input"));
header("Content-Type: application/json"); echo "{\"status\":\"success\"}";');
$port = random_int(20000, 40000);
$zapierPort = $port + 1; // the built-in server is single-threaded: Zapier needs its own
$siteLog = $sandbox . '/site-error.log';
$mailFile = $sandbox . '/mail.txt';
$httpStore = $sandbox . '/http-store';
mkdir($sandbox . '/tmp');
file_put_contents($webRoot . '/.env', implode("\n", [
    "CONTACT_WEBHOOK_URL=http://127.0.0.1:{$zapierPort}/zapier.php",
    'CONTACT_TO=team@localhost',
    'LEAD_DRAFTS_DIR=' . $httpStore,
    'META_LEDGER_DIR=' . $sandbox . '/http-ledger',
]) . "\n");
$zapierServer = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$zapierPort}", '-t', $sandbox . '/zapier-root'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $zapierPipes);
$serverArgs = [PHP_BINARY, '-d', 'auto_prepend_file=' . $sandbox . '/no-https.php', '-d', 'sendmail_path=/usr/bin/tee -a ' . $mailFile, '-d', 'sys_temp_dir=' . $sandbox . '/tmp', '-d', 'error_log=' . $siteLog, '-S', "127.0.0.1:{$port}", '-t', $webRoot];
$server = proc_open($serverArgs, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
usleep(700000);
$origin = "Origin: http://127.0.0.1:{$port}";
$request = static function (string $method, string $path, string $body = '', array $headers = []) use ($port) {
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", array_merge(['Content-Type: application/json'], $headers)) . "\r\n",
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 20,
    ]]);
    $response = file_get_contents("http://127.0.0.1:{$port}{$path}", false, $context);
    return ['status' => (int) substr($http_response_header[0] ?? '', 9, 3), 'body' => (string) $response];
};
$localPage = "http://127.0.0.1:{$port}/honest-signature-7/";
$body = static fn (string $session, array $fields = []) => (string) json_encode($fields + [
    'form_session_id' => $session, 'project_name' => 'Honest Signature 7', 'current_step' => 'coordonnees',
    'utm_source' => 'facebook', 'utm_campaign' => 'hs7-gueliz', 'utm_content' => 'creative-a', 'fbclid' => 'click-123',
    'page_url' => $localPage, 'company_website' => '', 'elapsed_ms' => 9000,
]);
// contact.php's own lead e-mail lands in the same file: count the draft notifications only.
$encoded = static fn (string $subject) => '=?UTF-8?B?' . base64_encode($subject) . '?=';
$abandonedSubject = $encoded('Lead abandonné — Honest Signature 7');
$partialSubject = $encoded('Nouveau prospect en cours — Honest Signature 7');
$mails = static function () use ($mailFile, $abandonedSubject, $partialSubject): int {
    $all = is_file($mailFile) ? (string) file_get_contents($mailFile) : '';
    return substr_count($all, $abandonedSubject) + substr_count($all, $partialSubject);
};
/** The text of the draft notifications only (each runs from its subject to the next message). */
$draftMails = static function () use ($mailFile, $abandonedSubject, $partialSubject): string {
    $all = is_file($mailFile) ? (string) file_get_contents($mailFile) : '';
    $kept = '';
    foreach (preg_split('/(?=^To: )/m', $all) ?: [] as $message) {
        if (str_contains($message, $abandonedSubject) || str_contains($message, $partialSubject)) $kept .= $message;
    }
    return $kept;
};

check('GET → 405', $request('GET', '/lead-draft.php')['status'] === 405);
check('no Origin / Referer → 403', $request('POST', '/lead-draft.php', $body($S(30), ['phone' => '+212612345678']))['status'] === 403);
check('another site\'s Origin → 403', $request('POST', '/lead-draft.php', $body($S(30), ['phone' => '+212612345678']), ['Origin: https://evil.example'])['status'] === 403);
check('body over 4 KB → 413', $request('POST', '/lead-draft.php', $body($S(30), ['phone' => '+212612345678', 'name' => str_repeat('a', 5000)]), [$origin])['status'] === 413);
check('not JSON → 400', $request('POST', '/lead-draft.php', 'phone=+212612345678', [$origin])['status'] === 400);
check('nothing stored by any refused request', !is_dir($httpStore) || glob($httpStore . '/d_*.json') === []);
$none = $request('POST', '/lead-draft.php', $body($S(30), ['name' => 'Sans contact']), [$origin]);
check('D over HTTP: name only → 204, no draft', $none['status'] === 204 && $none['body'] === '' && (glob($httpStore . '/d_*.json') ?: []) === []);
$bot = $request('POST', '/lead-draft.php', $body($S(30), ['phone' => '+212612345678', 'company_website' => 'https://spam.example']), [$origin]);
$fast = $request('POST', '/lead-draft.php', $body($S(30), ['phone' => '+212612345678', 'elapsed_ms' => 300]), [$origin]);
check('honeypot filled / typed in 0.3 s → 204, no draft', $bot['status'] === 204 && $fast['status'] === 204 && (glob($httpStore . '/d_*.json') ?: []) === []);
$saved = $request('POST', '/lead-draft.php', $body($S(30), ['name' => 'Yasmine El Idrissi', 'phone' => '+212612345678']), [$origin]);
check('valid phone → 200 {"ok":true,"captured":true}', $saved['status'] === 200 && json_decode($saved['body'], true) === ['ok' => true, 'captured' => true], $saved['status'] . ' ' . $saved['body']);
check('the answer never echoes what was typed', !preg_match('/Yasmine|612345678/', $saved['body']));
$stored = array_map(static fn ($f) => json_decode((string) file_get_contents($f), true), glob($httpStore . '/d_*.json') ?: []);
check('draft written outside the web root, mode 0600', count($stored) === 1 && $stored[0]['phone'] === '+212612345678' && !str_starts_with(realpath($httpStore), realpath($webRoot)) && (fileperms(glob($httpStore . '/d_*.json')[0]) & 0777) === 0600);
check('no e-mail at capture (grace period), nothing sent to Zapier', $mails() === 0 && !is_file($zapierLog));
check('the library itself outputs nothing when requested directly', $request('GET', '/lead-private/lead-drafts.php')['body'] === '');
check('"sweep" ping → 204, carries and returns nothing', ($ping = $request('POST', '/lead-draft.php', '{"action":"sweep"}', [$origin]))['status'] === 204 && $ping['body'] === '');

echo "HTTP: final submission through contact.php\n";
$lead = static fn (string $session) => (string) json_encode([
    'form_type' => 'honest_signature_7_request', 'nom_complet' => 'Yasmine El Idrissi', 'email' => 'yasmine@example.com',
    'telephone' => '+212612345678', 'phoneFull' => '+212612345678', 'phoneCode' => '+212', 'phoneCountryCode' => 'MA', 'phoneNumber' => '612345678',
    'budget' => '', 'message' => 'Demande : dossier complet du projet.', 'source' => 'Meta Ads', 'company_website' => '', 'elapsed_ms' => 9000,
    'projectName' => 'Honest Signature 7', 'leadSource' => 'Landing Honest Signature 7', 'lead_stage' => 'lead', 'form_session_id' => $session,
]);
$result = $request('POST', '/contact.php', $lead($S(30)), ['Referer: ' . $localPage]);
$stored = json_decode((string) file_get_contents(glob($httpStore . '/d_*.json')[0]), true);
check('B over HTTP: lead accepted (200) and its draft is now submitted', $result['status'] === 200 && $stored['status'] === 'submitted' && $stored['submitted_at'] !== '');
$zapier = json_decode((string) @file_get_contents($zapierLog), true) ?: [];
check('Zapier received the lead as before, plus the form session ID that ties it to its qualification follow-up — no other draft key', ($zapier['email'] ?? '') === 'yasmine@example.com' && ($zapier['form_type'] ?? '') === 'honest_signature_7_request' && ($zapier['form_session_id'] ?? '') === $S(30) && !array_key_exists('status', $zapier));

file_put_contents($zapierMode, '1');
$request('POST', '/lead-draft.php', $body($S(31), ['name' => 'Zapier En Panne', 'phone' => '+212600000031']), [$origin]);
$failed = $request('POST', '/contact.php', $lead($S(31)), ['Referer: ' . $localPage]);
$record = json_decode((string) file_get_contents($httpStore . '/d_' . hash('sha256', $S(31)) . '.json'), true);
check('Zapier down: lead refused (500) and its draft stays in progress — still recoverable', $failed['status'] === 500 && $record['status'] === 'in_progress');
unlink($zapierMode);

// Age the draft instead of waiting ten minutes, then let cron run.
$path = $httpStore . '/d_' . hash('sha256', $S(31)) . '.json';
$record['last_activity_ts'] = time() - 700;
$record['created_ts'] = time() - 800;
file_put_contents($path, json_encode($record));
$cli = static function () use ($webRoot, $sandbox, $mailFile): array {
    exec(escapeshellarg(PHP_BINARY) . ' -d ' . escapeshellarg('sendmail_path=/usr/bin/tee -a ' . $mailFile) . ' -d ' . escapeshellarg('error_log=' . $sandbox . '/cli-error.log') . ' ' . escapeshellarg($webRoot . '/lead-draft.php') . ' sweep 2>/dev/null', $output, $code);
    return [json_decode(end($output) ?: '', true) ?: [], $code];
};
[$swept, $code] = $cli();
$mail = $draftMails();
check('A over cron: `php lead-draft.php sweep` → abandoned, one e-mail to CONTACT_TO', $code === 0 && ($swept['abandoned'] ?? 0) === 1 && ($swept['notified'] ?? 0) === 1 && $mails() === 1 && str_contains($mail, 'To: team@localhost'), json_encode($swept) . ' mails=' . $mails());
check('e-mail: subject and body as specified', str_contains($mail, $abandonedSubject) && str_contains($mail, 'FORMULAIRE NON TERMINÉ') && str_contains($mail, 'Zapier En Panne') && str_contains($mail, '+212600000031'));
[$again] = $cli();
check('cron again: nothing more to send', ($again['notified'] ?? -1) === 0 && $mails() === 1);
check('the submitted draft got no draft e-mail — only the normal lead e-mail', !str_contains($draftMails(), 'Yasmine El Idrissi') && str_contains((string) file_get_contents($mailFile), 'Yasmine El Idrissi'));
check('cron with a wrong argument → usage, exit 64', (static function () use ($webRoot) { exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($webRoot . '/lead-draft.php') . ' 2>/dev/null', $o, $c); return $c; })() === 64);

echo "HTTP: failures never reach the visitor\n";
proc_terminate($server);
proc_close($server);
$serverArgs[4] = 'sendmail_path=/usr/bin/false';
$server = proc_open($serverArgs, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
usleep(700000);
$request('POST', '/lead-draft.php', $body($S(32), ['phone' => '+212600000032']), [$origin]);
$path = $httpStore . '/d_' . hash('sha256', $S(32)) . '.json';
$record = json_decode((string) file_get_contents($path), true);
$record['created_ts'] = time() - 100;
file_put_contents($path, json_encode($record));
$mailDown = $request('POST', '/lead-draft.php', $body($S(32), ['phone' => '+212600000032', 'name' => 'Mail En Panne']), [$origin]);
$record = json_decode((string) file_get_contents($path), true);
check('F over HTTP: mail() and SMTP both fail → still 200, draft saved', $mailDown['status'] === 200 && $record['name'] === 'Mail En Panne');
check('…the "en cours" e-mail is given back for a retry, not lost and not marked sent', $record['partial_notification_sent_at'] === '' && $record['partial_notification_attempts'] === 1);
check('…and the real lead endpoint is unaffected', $request('POST', '/contact.php', $lead($S(32)), ['Referer: ' . $localPage])['status'] === 200);
$siteErrors = (string) @file_get_contents($siteLog);
check('logs: outcome only — no name, phone or e-mail', str_contains($siteErrors, '[lead-drafts]') && !preg_match('/Mail En Panne|Zapier En Panne|Yasmine|6000000\d\d|612345678|@example\.com/', $siteErrors));

file_put_contents($webRoot . '/.env', "LEAD_DRAFTS_DISABLED=1\n", FILE_APPEND);
$off = $request('POST', '/lead-draft.php', $body($S(33), ['phone' => '+212600000033']), [$origin]);
check('LEAD_DRAFTS_DISABLED=1: 204, nothing stored', $off['status'] === 204 && !is_file($httpStore . '/d_' . hash('sha256', $S(33)) . '.json'));
check('…contact.php still accepts leads', $request('POST', '/contact.php', $lead($S(33)), ['Referer: ' . $localPage])['status'] === 200 && !is_file($httpStore . '/d_' . hash('sha256', $S(33)) . '.json'));
file_put_contents($webRoot . '/.env', str_replace("LEAD_DRAFTS_DISABLED=1\n", '', (string) file_get_contents($webRoot . '/.env')));

$limited = 0;
for ($i = 0; $i < LEAD_DRAFT_REQUESTS_PER_IP + 10; $i++) {
    if ($request('POST', '/lead-draft.php', '{"action":"sweep"}', [$origin])['status'] === 429) $limited++;
}
check('rate limit: requests beyond ' . LEAD_DRAFT_REQUESTS_PER_IP . ' per hour and per IP → 429', $limited >= 10, (string) $limited);
check('…a separate allowance: contact.php is not rate-limited by draft traffic', $request('POST', '/contact.php', $lead($S(34)), ['Referer: ' . $localPage])['status'] === 200);

$debugKey = preg_match("/CONTACT_DEBUG_KEY = '([^']+)'/", (string) file_get_contents($webRoot . '/contact.php'), $m) ? $m[1] : '';
$debug = $request('GET', '/contact.php?debug=' . $debugKey);
$diag = json_decode($debug['body'], true)['lead_drafts'] ?? [];
check('diagnostics: booleans only (enabled, store writable, outside the web root)', $diag === ['enabled' => true, 'partial_email' => true, 'store_writable' => true, 'store_outside_web_root' => true], json_encode($diag));
check('diagnostics: no path in the output', !str_contains($debug['body'], 'http-store') && !str_contains($debug['body'], 'emara-drafts-check'));

rename($webRoot . '/lead-private', $webRoot . '/lead-private-gone');
check('library missing from a deploy: contact.php still accepts leads', $request('POST', '/contact.php', $lead($S(35)), ['Referer: ' . $localPage])['status'] === 200);

foreach ([$server, $zapierServer] as $process) {
    proc_terminate($process);
    proc_close($process);
}
exec('rm -rf ' . escapeshellarg($sandbox));

echo $failures === 0 ? "\nall lead-draft checks passed\n" : "\n{$failures} check(s) failed\n";
exit($failures === 0 ? 0 : 1);
