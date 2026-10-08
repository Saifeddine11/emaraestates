/**
 * Today's activity on /honest-signature-7/, kept in step with the server.
 *
 * /activity.php is the source of truth: the number of requests contact.php
 * has accepted today. This module only reads it — once after the page's
 * `load` (so it never competes with the hero image), then every 30 s, paused
 * while the tab is hidden. Any failure leaves the page as it is.
 *
 * A "gain" — what plays "+1" — exists only when a later answer reports more
 * requests, for the same day, than the answer this visitor already had. The
 * first answer never creates one: nothing is animated on page load, and
 * nothing is ever generated here.
 */

import { ACTIVITY_ENDPOINT } from '@/components/honest-7/shared';

export type Activity = { day: string; requests: number };
/** `from` is the count that was on screen; `count`, how many requests arrived since. */
export type ActivityGain = { id: number; count: number; from: number };
export type ActivityState = {
  /** null until a valid answer arrives (or while the feature is off): nothing is shown. */
  today: Activity | null;
  gain: ActivityGain | null;
};

export const ACTIVITY_POLL_MS = 30_000;
const FIRST_POLL_DELAY_MS = 600;
const TIMEOUT_MS = 8_000;

const INITIAL: ActivityState = { today: null, gain: null };
let state = INITIAL;
const listeners = new Set<() => void>();
let started = false;
let inFlight = false;
let lastPoll = 0;
/** Gains are numbered once and for all: a number is never reused, even after a silent change in between. */
let gains = 0;

/** The answer, checked field by field; null for "not a usable answer". */
function parse(data: unknown): Activity | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  if (value.ok !== true || value.enabled !== true) return null;
  const { day, requests } = value;
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (typeof requests !== 'number' || !Number.isInteger(requests) || requests < 0) return null;
  return { day, requests };
}

function apply(next: Activity | null) {
  const previous = state.today;
  if (!next || (previous && previous.day === next.day && previous.requests === next.requests)) return;
  // More requests than in the answer this visitor already had, on the same day: they arrived during the visit.
  // A first answer, a new day (back to zero) or a lower figure changes the count with no animation.
  const gained = previous && previous.day === next.day ? next.requests - previous.requests : 0;
  state = {
    today: next,
    gain: gained > 0 ? { id: (gains += 1), count: gained, from: (previous as Activity).requests } : null,
  };
  listeners.forEach((listener) => listener());
}

async function poll() {
  if (inFlight || document.visibilityState !== 'visible') return;
  inFlight = true;
  lastPoll = Date.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ACTIVITY_ENDPOINT, { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (response.ok) apply(parse(await response.json()));
  } catch {
    // Offline, blocked, timed out, not JSON: keep what is shown.
  } finally {
    window.clearTimeout(timeout);
    inFlight = false;
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const begin = () => {
    window.setTimeout(() => void poll(), FIRST_POLL_DELAY_MS);
    window.setInterval(() => void poll(), ACTIVITY_POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPoll > ACTIVITY_POLL_MS) void poll();
    });
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}

export function subscribeActivity(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

export const getActivity = () => state;
export const getServerActivity = () => INITIAL;
