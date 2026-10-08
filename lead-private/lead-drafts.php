<?php
declare(strict_types=1);

/* =============================================================================
   Lead drafts — partial / abandoned form capture (server only).

   A visitor who types a valid phone number or e-mail into a lead form, then
   leaves without sending it, is kept as a *draft* so the sales team can still
   call back. Used by /lead-draft.php (save + sweep) and by contact.php (which
   only marks a draft `submitted` once the real lead has been accepted).

   Rules this file enforces:
     - One record per `form_session_id` (the record's file name derives from
       it), updated in place: editing a field never creates a second draft.
     - A draft exists only once a usable contact method has been entered. A
       visitor who opens the form and types nothing useful leaves no record.
     - Drafts never go to Zapier, HubSpot or Meta. The submitted lead from
       contact.php stays the only CRM lead; a draft is an internal note.
     - Each notification is sent at most once per form session: the record is
       claimed (timestamp written under the lock) before the e-mail goes out.
       "En cours" is for a draft still open after a short grace period;
       "abandonné" for one left idle for ten minutes. A submitted form gets
       neither, only the normal lead e-mail from contact.php.
     - Nothing here throws to the caller, and no log line carries personal data.

   Storage: there is no database in this project. Records are JSON files in a
   private directory outside the web root, written atomically under an
   exclusive flock — the same discipline as the Meta ledger (meta-capi.php).
   ============================================================================= */

/** No activity for this long, with no submission, means the form was abandoned. */
const LEAD_DRAFT_ABANDON_SECONDS = 600;
/**
 * The "en cours" e-mail waits this long after the first capture. Most visitors
 * submit within seconds of typing their number; without the wait the team
 * would get an "en cours" e-mail just before every ordinary lead e-mail.
 * 0 sends it at once.
 */
const LEAD_DRAFT_PARTIAL_GRACE_SECONDS = 45;
/** Drafts are deleted this long after their last activity. */
const LEAD_DRAFT_RETENTION_DAYS = 90;
/** Once submitted, the CRM holds the lead: the draft only has to outlive late requests. */
const LEAD_DRAFT_SUBMITTED_RETENTION_DAYS = 7;

const LEAD_DRAFT_MAX_BODY_BYTES = 4096;
const LEAD_DRAFT_RATE_WINDOW = 3600;
/** Per IP and per hour. Generous on purpose: mobile carriers put many visitors behind one address. */
const LEAD_DRAFT_REQUESTS_PER_IP = 120;
const LEAD_DRAFT_NEW_PER_IP = 20;
/** All visitors together, per hour: bounds disk use and the team's inbox if the endpoint is abused. */
const LEAD_DRAFT_NEW_PER_HOUR = 300;
const LEAD_DRAFT_EMAILS_PER_HOUR = 40;

/** A sweep triggered by a visitor's request runs at most this often. */
const LEAD_DRAFT_SWEEP_MIN_INTERVAL = 20;
const LEAD_DRAFT_SWEEP_BATCH = 10;
/** A notification whose delivery failed is retried by later sweeps, up to this many sends. */
const LEAD_DRAFT_EMAIL_ATTEMPTS = 3;
/** Submissions faster than this after the form was first touched are not a person typing. */
const LEAD_DRAFT_MIN_ELAPSED_MS = 1500;

/** Only forms that opted in may create drafts. */
const LEAD_DRAFT_PROJECTS = ['Honest Signature 7'];
const LEAD_DRAFT_STEPS = ['coordonnees' => 'Coordonnées', 'qualification' => 'Qualification'];
const LEAD_DRAFT_FIELD_LABELS = ['property_type' => 'Type de bien', 'budget' => 'Budget', 'name' => 'Nom', 'phone' => 'Téléphone', 'email' => 'E-mail', 'intent' => 'Projet'];
const LEAD_DRAFT_ATTRIBUTION = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

/* ─────────────────────────────── Environment ─────────────────────────────── */

function leadDraftLoadEnv(string $filePath): array
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

function leadDraftEnv(array $env, string $key): string
{
    $value = trim((string) ($env[$key] ?? ''));
    if ($value === '') {
        $fromGetenv = getenv($key);
        $value = is_string($fromGetenv) ? trim($fromGetenv) : '';
    }
    return $value;
}

/** LEAD_DRAFTS_DISABLED=1 turns the whole feature off without a code change. */
function leadDraftEnabled(array $env): bool
{
    return leadDraftEnv($env, 'LEAD_DRAFTS_DISABLED') !== '1';
}

/** LEAD_DRAFTS_PARTIAL_EMAIL=0 keeps the abandonment e-mail but drops the "en cours" one. */
function leadDraftPartialEmailEnabled(array $env): bool
{
    return leadDraftEnv($env, 'LEAD_DRAFTS_PARTIAL_EMAIL') !== '0';
}

/**
 * Directory of the drafts. Outside the web root by default: on Hostinger
 * `…/domains/emaraestates.com/emara-lead-drafts`, a sibling of public_html,
 * which the FTP deploy can neither overwrite nor delete and Apache can never
 * serve. LEAD_DRAFTS_DIR overrides it.
 */
function leadDraftDir(array $env): string
{
    return rtrim(leadDraftEnv($env, 'LEAD_DRAFTS_DIR') ?: dirname(__DIR__, 2) . '/emara-lead-drafts', '/');
}

/** One structured, PII-free line per outcome. */
function leadDraftLog(array $entry): void
{
    error_log('[lead-drafts] ' . json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

/* ──────────────────────────────── Validation ─────────────────────────────── */

function leadDraftValidSessionId(string $id): bool
{
    return (bool) preg_match('/^[A-Za-z0-9-]{16,64}$/', $id);
}

/** Single line, no markup, no control characters, bounded length. */
function leadDraftClean(mixed $value, int $maxLength): string
{
    if (!is_scalar($value)) return '';
    $clean = strip_tags((string) $value);
    $clean = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $clean) ?? '';
    return mb_substr(trim(preg_replace('/\s+/u', ' ', $clean) ?? ''), 0, $maxLength);
}

/** E.164 (`+` and 8 to 15 digits), or '' when the value is not a usable number. */
function leadDraftPhone(mixed $value): string
{
    if (!is_scalar($value)) return '';
    $raw = trim((string) $value);
    if ($raw === '' || $raw[0] !== '+') return '';
    $digits = preg_replace('/\D/', '', $raw) ?? '';
    return preg_match('/^[1-9][0-9]{7,14}$/', $digits) ? '+' . $digits : '';
}

function leadDraftEmail(mixed $value): string
{
    if (!is_scalar($value)) return '';
    $email = trim((string) $value);
    if (strlen($email) > 120 || preg_match('/[\r\n]/', $email)) return '';
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

/**
 * The request body reduced to what may be stored, or null when it carries
 * nothing storable: unknown form, malformed session, or no usable contact
 * method yet. Frontend validation is never trusted — everything is re-checked.
 *
 * @return array{form_session_id:string, project_name:string, name:string, phone:string, email:string, property_type:string, budget:string, intent:string, current_step:string, page_url:string, attribution:array<string,string>}|null
 */
function leadDraftNormalize(array $input, string $requestHost): ?array
{
    $sessionId = is_string($input['form_session_id'] ?? null) ? $input['form_session_id'] : '';
    if (!leadDraftValidSessionId($sessionId)) return null;

    $project = leadDraftClean($input['project_name'] ?? '', 120);
    if (!in_array($project, LEAD_DRAFT_PROJECTS, true)) return null;

    $phone = leadDraftPhone($input['phone'] ?? '');
    $email = leadDraftEmail($input['email'] ?? '');
    if ($phone === '' && $email === '') return null;

    $step = leadDraftClean($input['current_step'] ?? '', 40);

    // Only a page of this site may be recorded as the landing URL.
    $pageUrl = leadDraftClean($input['page_url'] ?? '', 500);
    $pageHost = strtolower((string) parse_url($pageUrl, PHP_URL_HOST));
    if ($pageHost === '' || $pageHost !== strtolower($requestHost)) $pageUrl = '';

    $attribution = [];
    foreach (LEAD_DRAFT_ATTRIBUTION as $key) {
        $attribution[$key] = leadDraftClean($input[$key] ?? '', $key === 'fbclid' ? 255 : 200);
    }

    return [
        'form_session_id' => $sessionId,
        'project_name' => $project,
        'name' => leadDraftClean($input['name'] ?? '', 80),
        'phone' => $phone,
        'email' => $email,
        'property_type' => leadDraftClean($input['property_type'] ?? '', 60),
        'budget' => leadDraftClean($input['budget'] ?? '', 60),
        'intent' => leadDraftClean($input['intent'] ?? '', 60),
        'current_step' => isset(LEAD_DRAFT_STEPS[$step]) ? $step : 'coordonnees',
        'page_url' => $pageUrl,
        'attribution' => $attribution,
    ];
}

/**
 * True when the request comes from a page of the host it was sent to. Browsers
 * always send `Origin` on a POST; `Referer` is the fallback.
 */
function leadDraftSameOrigin(array $server): bool
{
    $host = strtolower(preg_replace('/:\d+$/', '', (string) ($server['HTTP_HOST'] ?? '')) ?? '');
    if ($host === '') return false;
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $header) {
        $value = (string) ($server[$header] ?? '');
        if ($value === '') continue;
        return strtolower((string) parse_url($value, PHP_URL_HOST)) === $host;
    }
    return false;
}

/* ─────────────────────────────── Rate limiting ───────────────────────────── */

/**
 * Counts one hit for `$ip` in `$bucket` and reports whether it is over `$max`
 * for the current hour. Separate from contact.php's limiter on purpose: saving
 * drafts must never use up the allowance of the real lead endpoint.
 */
function leadDraftRateLimited(string $ip, string $bucket, int $max, int $nowSeconds): bool
{
    $path = sys_get_temp_dir() . '/emara_draft_' . $bucket . '_' . hash('sha256', $ip) . '.json';
    $entry = ['count' => 0, 'resetAt' => $nowSeconds + LEAD_DRAFT_RATE_WINDOW];
    if (is_file($path)) {
        $stored = json_decode((string) @file_get_contents($path), true);
        if (is_array($stored)) $entry = array_merge($entry, $stored);
    }
    if ((int) $entry['resetAt'] <= $nowSeconds) {
        $entry = ['count' => 0, 'resetAt' => $nowSeconds + LEAD_DRAFT_RATE_WINDOW];
    }
    $entry['count'] = (int) $entry['count'] + 1;
    @file_put_contents($path, json_encode($entry), LOCK_EX);
    return $entry['count'] > $max;
}

/* ───────────────────────────────── Storage ───────────────────────────────── */

function leadDraftPath(string $dir, string $sessionId): string
{
    return $dir . '/d_' . hash('sha256', $sessionId) . '.json';
}

/** @return resource|null  exclusive lock over the whole store */
function leadDraftLock(string $dir)
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return null;
    $handle = @fopen($dir . '/.lock', 'c');
    if ($handle === false) return null;
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }
    return $handle;
}

function leadDraftUnlock($handle): void
{
    flock($handle, LOCK_UN);
    fclose($handle);
}

function leadDraftRead(string $path): ?array
{
    if (!is_file($path)) return null;
    $record = json_decode((string) @file_get_contents($path), true);
    return is_array($record) ? $record : null;
}

/** Atomic write: temp file in the same directory, then rename(). */
function leadDraftWrite(string $path, array $record): bool
{
    $temp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($temp, (string) json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false) return false;
    @chmod($temp, 0600);
    if (!@rename($temp, $path)) {
        @unlink($temp);
        return false;
    }
    return true;
}

/**
 * Takes one unit of an hourly allowance shared by all visitors (`new` drafts,
 * `emails`). Call with the store lock held.
 */
function leadDraftTakeBudget(string $dir, string $kind, int $max, int $nowSeconds): bool
{
    $path = $dir . '/.counters.json';
    $hour = intdiv($nowSeconds, 3600);
    $counters = leadDraftRead($path) ?? [];
    if ((int) ($counters['hour'] ?? -1) !== $hour) $counters = ['hour' => $hour];
    if ((int) ($counters[$kind] ?? 0) >= $max) return false;
    $counters[$kind] = (int) ($counters[$kind] ?? 0) + 1;
    leadDraftWrite($path, $counters);
    return true;
}

function leadDraftIso(int $seconds): string
{
    return gmdate('Y-m-d\TH:i:s\Z', $seconds);
}

function leadDraftHasContact(array $record): bool
{
    return ($record['phone'] ?? '') !== '' || ($record['email'] ?? '') !== '';
}

/** Which fields hold a value — computed from what is stored, never taken from the browser. */
function leadDraftFieldsCompleted(array $record): array
{
    return array_values(array_filter(array_keys(LEAD_DRAFT_FIELD_LABELS), static fn (string $field) => ($record[$field] ?? '') !== ''));
}

/**
 * Creates or updates the draft of one form session.
 *
 * - A newer valid phone / e-mail replaces the stored one; an empty or invalid
 *   value never erases a contact method that was already captured.
 * - Attribution and the landing URL are first-touch: set once, then kept.
 * - A draft already `submitted` is left alone, so a late request cannot turn a
 *   real lead back into a draft.
 * - `$mayCreate` is asked only when a new record is about to be written.
 *
 * @return array{stored:bool, created:bool, reason?:string, notify?:array}
 *         `notify` is the record whose "en cours" e-mail was just claimed for
 *         this request to send (absent when none is due).
 */
function leadDraftUpsert(string $dir, array $data, int $nowSeconds, bool $partialEmail = true, ?callable $mayCreate = null): array
{
    $lock = leadDraftLock($dir);
    if ($lock === null) return ['stored' => false, 'created' => false, 'reason' => 'storage'];
    try {
        $path = leadDraftPath($dir, $data['form_session_id']);
        $record = leadDraftRead($path);
        $created = $record === null;

        if (!$created && ($record['status'] ?? '') === 'submitted') {
            return ['stored' => false, 'created' => false, 'reason' => 'submitted'];
        }
        if ($created) {
            if ($mayCreate !== null && !$mayCreate()) return ['stored' => false, 'created' => false, 'reason' => 'rate'];
            if (!leadDraftTakeBudget($dir, 'new', LEAD_DRAFT_NEW_PER_HOUR, $nowSeconds)) {
                return ['stored' => false, 'created' => false, 'reason' => 'budget'];
            }
            $record = [
                'id' => bin2hex(random_bytes(8)),
                'form_session_id' => $data['form_session_id'],
                'project_name' => $data['project_name'],
                'name' => '', 'phone' => '', 'email' => '', 'property_type' => '', 'budget' => '', 'intent' => '',
                'utm_source' => '', 'utm_medium' => '', 'utm_campaign' => '', 'utm_content' => '', 'utm_term' => '', 'fbclid' => '',
                'page_url' => '',
                'current_step' => 'coordonnees',
                'fields_completed' => [],
                'status' => 'in_progress',
                'created_at' => leadDraftIso($nowSeconds),
                'last_activity_at' => leadDraftIso($nowSeconds),
                'submitted_at' => '',
                'abandoned_at' => '',
                'partial_notification_sent_at' => '',
                'abandonment_notification_sent_at' => '',
                'created_ts' => $nowSeconds,
                'last_activity_ts' => $nowSeconds,
                'partial_notification_attempts' => 0,
                'abandonment_notification_attempts' => 0,
            ];
        }

        foreach (['name', 'phone', 'email', 'property_type', 'budget', 'intent'] as $field) {
            if ($data[$field] !== '') $record[$field] = $data[$field];
        }
        foreach ($data['attribution'] as $key => $value) {
            if ($value !== '' && ($record[$key] ?? '') === '') $record[$key] = $value;
        }
        if ($data['page_url'] !== '' && ($record['page_url'] ?? '') === '') $record['page_url'] = $data['page_url'];
        $record['current_step'] = $data['current_step'];
        $record['fields_completed'] = leadDraftFieldsCompleted($record);
        // A visitor who comes back after being marked abandoned is in progress
        // again; the abandonment e-mail, if already sent, is never sent twice.
        $record['status'] = 'in_progress';
        $record['last_activity_at'] = leadDraftIso($nowSeconds);
        $record['last_activity_ts'] = $nowSeconds;

        // Claimed before sending: a concurrent request sees it as sent.
        $notify = $partialEmail && leadDraftClaimPartial($dir, $record, $nowSeconds) ? $record : null;

        if (!leadDraftWrite($path, $record)) return ['stored' => false, 'created' => false, 'reason' => 'storage'];
        return ['stored' => true, 'created' => $created] + ($notify !== null ? ['notify' => $notify] : []);
    } finally {
        leadDraftUnlock($lock);
    }
}

/**
 * Claims the "en cours" e-mail of `$record` if it is due: not sent yet, the
 * grace period over, attempts and the hourly allowance not exhausted. Call
 * with the store lock held; the caller writes the record and sends afterwards.
 */
function leadDraftClaimPartial(string $dir, array &$record, int $nowSeconds): bool
{
    if (($record['partial_notification_sent_at'] ?? '') !== '') return false;
    if ((int) ($record['partial_notification_attempts'] ?? 0) >= LEAD_DRAFT_EMAIL_ATTEMPTS) return false;
    if ($nowSeconds - (int) ($record['created_ts'] ?? $nowSeconds) < LEAD_DRAFT_PARTIAL_GRACE_SECONDS) return false;
    if (!leadDraftTakeBudget($dir, 'emails', LEAD_DRAFT_EMAILS_PER_HOUR, $nowSeconds)) return false;
    $record['partial_notification_sent_at'] = leadDraftIso($nowSeconds);
    $record['partial_notification_attempts'] = (int) ($record['partial_notification_attempts'] ?? 0) + 1;
    return true;
}

/** Gives a notification back after a failed delivery, so a later run retries it. */
function leadDraftReleaseNotification(string $dir, string $sessionId, string $kind): void
{
    $lock = leadDraftLock($dir);
    if ($lock === null) return;
    try {
        $path = leadDraftPath($dir, $sessionId);
        $record = leadDraftRead($path);
        if ($record === null) return;
        $record[$kind . '_notification_sent_at'] = '';
        leadDraftWrite($path, $record);
    } finally {
        leadDraftUnlock($lock);
    }
}

/**
 * The real lead was accepted (contact.php, after Zapier answered 2xx): the
 * draft of the same form session becomes `submitted` and is never reported as
 * abandoned. If no draft exists, a marker holding only the session ID is
 * written, so a draft request still in flight cannot create one afterwards.
 */
function leadDraftMarkSubmitted(string $dir, string $sessionId, int $nowSeconds): bool
{
    if (!leadDraftValidSessionId($sessionId)) return false;
    $lock = leadDraftLock($dir);
    if ($lock === null) return false;
    try {
        $path = leadDraftPath($dir, $sessionId);
        $existing = leadDraftRead($path);
        // Already closed (the qualification follow-up posts with the same session): keep the first time.
        if ($existing !== null && ($existing['status'] ?? '') === 'submitted') return true;
        $record = $existing ?? [
            'form_session_id' => $sessionId,
            'created_at' => leadDraftIso($nowSeconds),
            'created_ts' => $nowSeconds,
        ];
        $record['status'] = 'submitted';
        $record['submitted_at'] = leadDraftIso($nowSeconds);
        $record['last_activity_at'] = leadDraftIso($nowSeconds);
        $record['last_activity_ts'] = $nowSeconds;
        return leadDraftWrite($path, $record);
    } finally {
        leadDraftUnlock($lock);
    }
}

/* ───────────────────────────── Abandonment sweep ─────────────────────────── */

/**
 * Marks as `abandoned` every draft still `in_progress` after
 * LEAD_DRAFT_ABANDON_SECONDS without activity and sends each one's
 * notification (once); sends the "en cours" e-mail of drafts that are past the
 * grace period and still open; deletes records past their retention.
 *
 * Runs from cron (`php lead-draft.php sweep`, `$force` = true) and, as a
 * fallback, at the end of ordinary draft requests — throttled, so a burst of
 * requests cannot turn into a burst of directory scans.
 *
 * `$send(subject, body, record)` is injectable for tests; it must throw on failure.
 *
 * @return array{skipped?:bool, error?:string, abandoned:int, notified:int, partial:int, failed:int, pruned:int}
 */
function leadDraftSweep(string $dir, int $nowSeconds, array $env, bool $force = false, ?callable $send = null): array
{
    $result = ['abandoned' => 0, 'notified' => 0, 'partial' => 0, 'failed' => 0, 'pruned' => 0];
    $lock = leadDraftLock($dir);
    if ($lock === null) return ['error' => 'storage'] + $result;

    $partialEmail = leadDraftPartialEmailEnabled($env);
    $toNotify = [];
    $partials = [];
    try {
        $stamp = $dir . '/.sweep';
        if (!$force && is_file($stamp) && $nowSeconds - (int) @file_get_contents($stamp) < LEAD_DRAFT_SWEEP_MIN_INTERVAL) {
            return ['skipped' => true] + $result;
        }
        @file_put_contents($stamp, (string) $nowSeconds);

        foreach (glob($dir . '/d_*.{json,tmp}', GLOB_BRACE) ?: [] as $file) {
            if (str_ends_with($file, '.tmp')) {
                if ((int) @filemtime($file) < $nowSeconds - 3600 && @unlink($file)) $result['pruned']++;
                continue;
            }
            $record = leadDraftRead($file);
            if ($record === null) continue;
            $status = (string) ($record['status'] ?? '');
            $idle = $nowSeconds - (int) ($record['last_activity_ts'] ?? 0);

            $expired = $idle > ($status === 'submitted' ? LEAD_DRAFT_SUBMITTED_RETENTION_DAYS : LEAD_DRAFT_RETENTION_DAYS) * 86400;
            if ($expired) {
                if (@unlink($file)) $result['pruned']++;
                continue;
            }

            $changed = false;
            if ($status === 'in_progress' && $idle >= LEAD_DRAFT_ABANDON_SECONDS && leadDraftHasContact($record)) {
                $record['status'] = $status = 'abandoned';
                $record['abandoned_at'] = leadDraftIso($nowSeconds);
                $result['abandoned']++;
                $changed = true;
            }
            if ($status === 'abandoned'
                && ($record['abandonment_notification_sent_at'] ?? '') === ''
                && (int) ($record['abandonment_notification_attempts'] ?? 0) < LEAD_DRAFT_EMAIL_ATTEMPTS
                && count($toNotify) < LEAD_DRAFT_SWEEP_BATCH
                && leadDraftTakeBudget($dir, 'emails', LEAD_DRAFT_EMAILS_PER_HOUR, $nowSeconds)) {
                // Claimed under the lock, before sending: two sweeps can never both send.
                $record['abandonment_notification_sent_at'] = leadDraftIso($nowSeconds);
                $record['abandonment_notification_attempts'] = (int) ($record['abandonment_notification_attempts'] ?? 0) + 1;
                $toNotify[] = $record;
                $changed = true;
            }
            // Still open and past the grace period. An abandoned draft skips
            // this one: its own e-mail says everything "en cours" would.
            if ($status === 'in_progress' && $partialEmail && leadDraftHasContact($record)
                && count($partials) < LEAD_DRAFT_SWEEP_BATCH
                && leadDraftClaimPartial($dir, $record, $nowSeconds)) {
                $partials[] = $record;
                $changed = true;
            }
            if ($changed) leadDraftWrite($file, $record);
        }
    } finally {
        leadDraftUnlock($lock);
    }

    // The network happens outside the lock; the claim keeps everyone else out.
    $send ??= static fn (string $subject, string $body, array $record) => leadDraftSendMail($subject, $body, $record, $env);
    foreach ($toNotify as $record) {
        try {
            [$subject, $body] = leadDraftAbandonedEmail($record);
            $send($subject, $body, $record);
            $result['notified']++;
            leadDraftLog(['stage' => 'abandoned', 'draft' => $record['id'] ?? '', 'success' => true]);
        } catch (Throwable $error) {
            $result['failed']++;
            leadDraftReleaseNotification($dir, (string) $record['form_session_id'], 'abandonment');
            leadDraftLog(['stage' => 'abandoned', 'draft' => $record['id'] ?? '', 'success' => false, 'error' => $error->getMessage()]);
        }
    }
    foreach ($partials as $record) {
        if (leadDraftNotifyPartial($dir, $record, $env, $send)) $result['partial']++;
        else $result['failed']++;
    }
    return $result;
}

/** Sends the "en cours" e-mail claimed by leadDraftUpsert(). Never throws. */
function leadDraftNotifyPartial(string $dir, array $record, array $env, ?callable $send = null): bool
{
    $send ??= static fn (string $subject, string $body, array $draft) => leadDraftSendMail($subject, $body, $draft, $env);
    try {
        [$subject, $body] = leadDraftPartialEmail($record);
        $send($subject, $body, $record);
        leadDraftLog(['stage' => 'partial', 'draft' => $record['id'] ?? '', 'success' => true]);
        return true;
    } catch (Throwable $error) {
        leadDraftReleaseNotification($dir, (string) $record['form_session_id'], 'partial');
        leadDraftLog(['stage' => 'partial', 'draft' => $record['id'] ?? '', 'success' => false, 'error' => $error->getMessage()]);
        return false;
    }
}

/* ────────────────────────────────── E-mails ──────────────────────────────── */

function leadDraftOr(mixed $value): string
{
    $text = is_scalar($value) ? trim((string) $value) : '';
    return $text !== '' ? $text : 'Non renseigné';
}

/** Marrakech time: the team reads these, not the server. */
function leadDraftDisplayTime(mixed $seconds): string
{
    $timestamp = (int) $seconds;
    if ($timestamp <= 0) return 'Non renseigné';
    return (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone('Africa/Casablanca'))->format('d/m/Y H:i') . ' (heure de Marrakech)';
}

function leadDraftStepLabel(array $record): string
{
    return LEAD_DRAFT_STEPS[(string) ($record['current_step'] ?? '')] ?? 'Coordonnées';
}

/** @return array{0:string, 1:string} subject, body */
function leadDraftPartialEmail(array $record): array
{
    $project = leadDraftOr($record['project_name'] ?? '');
    $lines = [
        'Nouveau prospect en cours — ' . $project,
        '',
        'STATUT :',
        'FORMULAIRE EN COURS',
        '',
        'Ce prospect est en train de remplir le formulaire. Il ne l’a pas encore envoyé.',
        '',
        'Nom :', leadDraftOr($record['name'] ?? ''),
        '',
        'Téléphone :', leadDraftOr($record['phone'] ?? ''),
        '',
        'Email :', leadDraftOr($record['email'] ?? ''),
        '',
        'Type de bien :', leadDraftOr($record['property_type'] ?? ''),
        '',
        'Budget :', leadDraftOr($record['budget'] ?? ''),
        '',
        'Date :', leadDraftDisplayTime($record['last_activity_ts'] ?? 0),
        '',
        'Page :', leadDraftOr($record['page_url'] ?? ''),
        '',
        'Étape en cours :', leadDraftStepLabel($record),
        '',
        'Campagne (utm_campaign) :', leadDraftOr($record['utm_campaign'] ?? ''),
        '',
        'Contenu (utm_content) :', leadDraftOr($record['utm_content'] ?? ''),
    ];
    if (($record['fbclid'] ?? '') !== '') array_push($lines, '', 'fbclid :', (string) $record['fbclid']);
    return ['Nouveau prospect en cours — ' . $project, implode("\r\n", $lines)];
}

/** @return array{0:string, 1:string} subject, body */
function leadDraftAbandonedEmail(array $record): array
{
    $project = leadDraftOr($record['project_name'] ?? '');
    $fields = array_map(static fn (string $field) => LEAD_DRAFT_FIELD_LABELS[$field] ?? $field, leadDraftFieldsCompleted($record));
    $lines = [
        'Lead abandonné — ' . $project,
        '',
        'STATUT :',
        'FORMULAIRE NON TERMINÉ',
        '',
        'Ce prospect a saisi ses coordonnées mais n’a pas terminé le formulaire.',
        '',
        'Nom :', leadDraftOr($record['name'] ?? ''),
        '',
        'Téléphone :', leadDraftOr($record['phone'] ?? ''),
        '',
        'Email :', leadDraftOr($record['email'] ?? ''),
        '',
        'Type de bien :', leadDraftOr($record['property_type'] ?? ''),
        '',
        'Budget :', leadDraftOr($record['budget'] ?? ''),
        '',
        'Champs remplis :', $fields ? implode(', ', $fields) : 'Non renseigné',
        '',
        'Dernière étape :', leadDraftStepLabel($record),
        '',
        'Début du formulaire :', leadDraftDisplayTime($record['created_ts'] ?? 0),
        '',
        'Dernière activité :', leadDraftDisplayTime($record['last_activity_ts'] ?? 0),
        '',
        'Page :', leadDraftOr($record['page_url'] ?? ''),
        '',
        'Source (utm_source) :', leadDraftOr($record['utm_source'] ?? ''),
        '',
        'Campagne (utm_campaign) :', leadDraftOr($record['utm_campaign'] ?? ''),
        '',
        'Contenu (utm_content) :', leadDraftOr($record['utm_content'] ?? ''),
    ];
    return ['Lead abandonné — ' . $project, implode("\r\n", $lines)];
}

function leadDraftEncodeHeader(string $value): string
{
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function leadDraftSmtpRead($socket): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return $response;
}

function leadDraftSmtpCommand($socket, string $command, array $expectedCodes): void
{
    fwrite($socket, $command . "\r\n");
    if (!in_array((int) substr(leadDraftSmtpRead($socket), 0, 3), $expectedCodes, true)) {
        throw new RuntimeException('SMTP command rejected.');
    }
}

/**
 * Same delivery as the lead e-mail in contact.php, with the same settings:
 * PHP mail() first (what Hostinger uses), SMTP_* as the fallback. To CONTACT_TO.
 * Throws when neither route accepts the message.
 */
function leadDraftSendMail(string $subject, string $body, array $record, array $env): void
{
    $to = leadDraftEnv($env, 'CONTACT_TO') ?: 'contact@emaraestates.com';
    $from = leadDraftEnv($env, 'CONTACT_FROM') ?: $to;
    $email = leadDraftEmail($record['email'] ?? '');
    $name = leadDraftClean($record['name'] ?? '', 80);
    $replyTo = $email !== ''
        ? leadDraftEncodeHeader($name !== '' ? $name : 'Prospect') . ' <' . $email . '>'
        : 'Emara Estates <contact@emaraestates.com>';
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    if (@mail($to, leadDraftEncodeHeader($subject), $body, implode("\r\n", $headers))) return;

    $host = leadDraftEnv($env, 'SMTP_HOST') ?: 'smtp.gmail.com';
    $port = (int) (leadDraftEnv($env, 'SMTP_PORT') ?: 465);
    $user = leadDraftEnv($env, 'SMTP_USER');
    $pass = leadDraftEnv($env, 'SMTP_PASS');
    $smtpFrom = leadDraftEnv($env, 'CONTACT_FROM') ?: $user;
    if ($port <= 0 || $user === '' || $pass === '' || $smtpFrom === '') {
        throw new RuntimeException('mail() failed and SMTP is not configured.');
    }

    $message = implode("\r\n", array_merge(
        ['From: Emara Estates <' . $smtpFrom . '>', 'To: ' . $to, 'Reply-To: ' . $replyTo, 'Subject: ' . leadDraftEncodeHeader($subject)],
        array_slice($headers, 2),
        ['Date: ' . date(DATE_RFC2822)],
    )) . "\r\n\r\n" . $body . "\r\n";

    $socket = @stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, 10, STREAM_CLIENT_CONNECT);
    if (!$socket) throw new RuntimeException('SMTP connection failed.');
    stream_set_timeout($socket, 10);
    try {
        if ((int) substr(leadDraftSmtpRead($socket), 0, 3) !== 220) throw new RuntimeException('SMTP greeting failed.');
        leadDraftSmtpCommand($socket, 'EHLO emaraestates.com', [250]);
        leadDraftSmtpCommand($socket, 'AUTH LOGIN', [334]);
        leadDraftSmtpCommand($socket, base64_encode($user), [334]);
        leadDraftSmtpCommand($socket, base64_encode($pass), [235]);
        leadDraftSmtpCommand($socket, 'MAIL FROM:<' . $smtpFrom . '>', [250]);
        leadDraftSmtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        leadDraftSmtpCommand($socket, 'DATA', [354]);
        fwrite($socket, str_replace("\r\n.", "\r\n..", $message) . "\r\n.\r\n");
        if ((int) substr(leadDraftSmtpRead($socket), 0, 3) !== 250) throw new RuntimeException('SMTP data failed.');
        leadDraftSmtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

/**
 * Booleans only — no values, no paths.
 */
function leadDraftDiagnostics(array $env): array
{
    $dir = leadDraftDir($env);
    $lock = leadDraftLock($dir);
    $writable = false;
    if ($lock !== null) {
        $probe = $dir . '/.probe-' . bin2hex(random_bytes(4));
        $writable = @file_put_contents($probe, '1') !== false && @unlink($probe);
        leadDraftUnlock($lock);
    }
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';
    $real = realpath($dir) ?: '';
    return [
        'enabled' => leadDraftEnabled($env),
        'partial_email' => leadDraftPartialEmailEnabled($env),
        'store_writable' => $writable,
        'store_outside_web_root' => $real !== '' && $documentRoot !== '' && !str_starts_with($real . '/', $documentRoot . '/'),
    ];
}
