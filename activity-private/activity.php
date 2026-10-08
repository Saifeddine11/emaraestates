<?php
declare(strict_types=1);

/* =============================================================================
   Today's activity on Honest Signature 7 — the library behind /activity.php
   and the counting done by contact.php. Never served over HTTP (see .htaccess
   in this folder).

   The landing page shows how many requests ("demandes") were received today.
   The number has one source: contact.php adds one when it has accepted a
   Honest Signature 7 lead — validated, not a bot, and confirmed by Zapier. No
   other code path, and no person, can raise it; nothing here generates,
   rounds up or pads a figure.

   Store: one JSON file, outside the web root by default
   (`<parent of public_html>/emara-activity/activity.json`), holding the
   current day, its count, and — to count a person once per day — salted hashes
   of the phone numbers and e-mail addresses already counted. It starts again
   from zero each calendar day (Africa/Casablanca), salt included, so nothing
   links one day to the next. No name, number or address is ever written.
   ============================================================================= */

const ACTIVITY_TIMEZONE = 'Africa/Casablanca';
/** `form_type` of the landing page's lead form — the only requests counted. */
const ACTIVITY_FORM_TYPE = 'honest_signature_7_request';
/** `lead_stage` of the request that creates the lead (the optional follow-up is "qualification"). */
const ACTIVITY_LEAD_STAGE = 'lead';
const ACTIVITY_SEEN_KEPT = 4000;
/** Digits a phone number needs, country code included, to be taken for one. */
const ACTIVITY_MIN_PHONE_DIGITS = 8;

/* ─────────────────────────────── Environment ─────────────────────────────── */

function activityLoadEnv(string $filePath): array
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

function activityEnv(array $env, string $key): string
{
    $value = trim((string) ($env[$key] ?? ''));
    if ($value === '') {
        $fromGetenv = getenv($key);
        $value = is_string($fromGetenv) ? trim($fromGetenv) : '';
    }
    return $value;
}

/** ACTIVITY_DISABLED=1: nothing is counted and the page shows no band. */
function activityEnabled(array $env): bool
{
    return activityEnv($env, 'ACTIVITY_DISABLED') !== '1';
}

/** Outside the web root by default, like the lead drafts: the FTP deploy can neither overwrite nor serve it. */
function activityDir(array $env): string
{
    return rtrim(activityEnv($env, 'ACTIVITY_DIR') ?: dirname(__DIR__, 2) . '/emara-activity', '/');
}

/* ─────────────────────────────────── Day ─────────────────────────────────── */

/** The calendar day of `$nowSeconds` in Casablanca, `YYYY-MM-DD`. */
function activityDay(int $nowSeconds): string
{
    return (new DateTimeImmutable('@' . $nowSeconds))->setTimezone(new DateTimeZone(ACTIVITY_TIMEZONE))->format('Y-m-d');
}

function activityEmpty(string $day): array
{
    return ['day' => $day, 'requests' => 0, 'salt' => bin2hex(random_bytes(16)), 'seen' => []];
}

/* ───────────────────────────────── Storage ───────────────────────────────── */

function activityPath(string $dir): string
{
    return $dir . '/activity.json';
}

/**
 * The store for the day of `$nowSeconds`: what the file holds if it is about
 * that day, an empty day otherwise. A damaged file reads as an empty day —
 * the count can be lost, never invented. Lock-free: the file is only ever
 * replaced whole.
 */
function activityLoad(string $dir, int $nowSeconds): array
{
    $day = activityDay($nowSeconds);
    $path = activityPath($dir);
    $data = is_file($path) ? json_decode((string) @file_get_contents($path), true) : null;
    if (!is_array($data) || ($data['day'] ?? '') !== $day || !is_int($data['requests'] ?? null) || !is_string($data['salt'] ?? null)) {
        return activityEmpty($day);
    }
    $seen = array_values(array_filter(is_array($data['seen'] ?? null) ? $data['seen'] : [], 'is_string'));
    // One hash at least per counted request: the count can never exceed what was recorded.
    return ['day' => $day, 'requests' => max(0, min($data['requests'], count($seen))), 'salt' => $data['salt'], 'seen' => $seen];
}

/** Atomic write: temp file in the same directory, then rename(). */
function activitySave(string $dir, array $state): bool
{
    $path = activityPath($dir);
    $temp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($temp, (string) json_encode($state, JSON_UNESCAPED_SLASHES)) === false) return false;
    @chmod($temp, 0600);
    if (!@rename($temp, $path)) {
        @unlink($temp);
        return false;
    }
    return true;
}

/** Salted, truncated hash of one contact detail, valid for the day only. */
function activityFingerprint(string $salt, string $kind, string $value): string
{
    return $kind . ':' . substr(hash_hmac('sha256', $kind . '|' . $value, $salt), 0, 24);
}

/**
 * Counts one accepted request for today. The same person — same phone number
 * or same e-mail address — counts once per day, however many times the form
 * is sent. A request without a usable phone number is not counted (the
 * landing page always asks for one); an e-mail address is used to recognise
 * a repeat only when it is a real one.
 *
 * @return array{counted: bool, requests: int}|null  null when the store cannot be written
 */
function activityRecordRequest(string $dir, int $nowSeconds, string $phone, string $email): ?array
{
    $phone = preg_replace('/\D+/', '', $phone) ?? '';
    $email = strtolower(trim($email));
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) $email = '';
    if (strlen($phone) < ACTIVITY_MIN_PHONE_DIGITS) return ['counted' => false, 'requests' => activityLoad($dir, $nowSeconds)['requests']];
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return null;
    $handle = @fopen($dir . '/.lock', 'c');
    if ($handle === false) return null;
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }
    try {
        $state = activityLoad($dir, $nowSeconds);
        $prints = [activityFingerprint($state['salt'], 'p', $phone)];
        if ($email !== '') $prints[] = activityFingerprint($state['salt'], 'e', $email);
        if (array_intersect($prints, $state['seen']) !== []) {
            // Already counted today: remember any new detail, count nothing.
            $merged = array_values(array_unique(array_merge($state['seen'], $prints)));
            if (count($merged) !== count($state['seen'])) {
                $state['seen'] = array_slice($merged, -ACTIVITY_SEEN_KEPT);
                activitySave($dir, $state);
            }
            return ['counted' => false, 'requests' => $state['requests']];
        }
        $state['requests']++;
        $state['seen'] = array_slice(array_merge($state['seen'], $prints), -ACTIVITY_SEEN_KEPT);
        if (!activitySave($dir, $state)) return null;
        return ['counted' => true, 'requests' => $state['requests']];
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

/**
 * Called by contact.php once a lead is accepted. Counts it when it is the
 * landing page's lead request, with a name and a phone number; ignores every
 * other form and the optional follow-up. contact.php forwards what it is
 * sent without checking the fields: the count has to be stricter than that.
 * Never throws: counting must not be able to affect a lead.
 */
function activityCountLead(array $payload, array $env, int $nowSeconds): void
{
    try {
        if (!activityEnabled($env)) return;
        if (($payload['form_type'] ?? '') !== ACTIVITY_FORM_TYPE || ($payload['lead_stage'] ?? '') !== ACTIVITY_LEAD_STAGE) return;
        if (mb_strlen(trim((string) ($payload['nom_complet'] ?? ''))) < 2) return;
        $outcome = activityRecordRequest(activityDir($env), $nowSeconds, (string) ($payload['phoneFull'] ?? $payload['telephone'] ?? ''), (string) ($payload['email'] ?? ''));
        if ($outcome === null) error_log('[activity] request not counted: store not writable');
    } catch (Throwable $error) {
        error_log('[activity] request not counted: ' . $error->getMessage());
    }
}

/* ─────────────────────────────────── Feed ────────────────────────────────── */

/** What the landing page receives: the day and its count, nothing else. */
function activityFeed(string $dir, int $nowSeconds): array
{
    $state = activityLoad($dir, $nowSeconds);
    return ['ok' => true, 'enabled' => true, 'day' => $state['day'], 'requests' => $state['requests']];
}
