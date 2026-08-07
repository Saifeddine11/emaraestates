import { OG_TRACKING } from '@/lib/content/offre-gueliz';

/**
 * Ad attribution capture for `/offre-gueliz` — port of the `Attribution` module
 * in `js/offre-gueliz.js`.
 *
 * UTM parameters are read once from the URL and kept in sessionStorage for the
 * whole session, because the form is often completed minutes after the click
 * and the parameters may be gone from the URL by then. Every read and write is
 * guarded: storage throws in private modes, and losing attribution must never
 * break the funnel.
 */

export type Attribution = Record<string, string>;

export function readAttribution(): Attribution {
  try {
    const raw = window.sessionStorage.getItem(OG_TRACKING.storageKey);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

function writeAttribution(data: Attribution) {
  try {
    window.sessionStorage.setItem(OG_TRACKING.storageKey, JSON.stringify(data));
  } catch {
    /* storage unavailable — attribution is best-effort */
  }
}

/** Maps a utm_source onto the ad platform label the CRM expects. */
function platformFrom(source: string | undefined): string {
  const s = String(source || '').toLowerCase();
  if (/facebook|meta|instagram|fb|ig/.test(s)) return 'Meta';
  if (/tiktok|tt/.test(s)) return 'TikTok';
  if (/snap/.test(s)) return 'Snapchat';
  if (/google|adwords|gads/.test(s)) return 'Google';
  return source || '';
}

/**
 * Merges any ad parameters on the current URL into the stored attribution.
 * First write wins, matching the legacy `if (val && !stored[p])`.
 */
export function captureAttribution(): Attribution {
  const stored = readAttribution();
  const search = new URLSearchParams(window.location.search);
  let changed = false;

  for (const param of OG_TRACKING.urlParams) {
    const value = search.get(param);
    if (value && !stored[param]) {
      stored[param] = value;
      changed = true;
    }
  }

  if (!stored.landing_page_url) {
    stored.landing_page_url = window.location.href.split('#')[0];
    changed = true;
  }
  if (!stored.referrer && document.referrer) {
    stored.referrer = document.referrer;
    changed = true;
  }
  if (!stored.ad_platform) {
    const platform = platformFrom(stored.utm_source);
    if (platform) {
      stored.ad_platform = platform;
      changed = true;
    }
  }

  if (changed) writeAttribution(stored);
  return stored;
}

type Pixels = {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  ttq?: { track?: (...args: unknown[]) => void };
  snaptr?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

/**
 * Fires a conversion event on whichever pixels are actually present.
 *
 * Nothing is loaded here — if a pixel is absent the event is simply skipped, so
 * this never double-counts and never introduces a tag the page did not have.
 * The whole body is wrapped: a broken pixel must not take the funnel with it.
 */
export function track(eventName: string, data: Record<string, unknown> = {}) {
  if (!eventName) return;
  const w = window as typeof window & Pixels;
  try {
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: eventName, ...data });
    }
    if (typeof w.fbq === 'function') {
      // `Lead` is a Meta standard event; everything else is custom.
      if (eventName === 'Lead') w.fbq('track', eventName, data);
      else w.fbq('trackCustom', eventName, data);
    }
    if (w.ttq && typeof w.ttq.track === 'function') {
      w.ttq.track(eventName, data);
    }
    if (typeof w.snaptr === 'function') {
      w.snaptr('track', eventName === 'Lead' ? 'SIGN_UP' : 'CUSTOM_EVENT', data);
    }
    if (typeof w.gtag === 'function') {
      w.gtag('event', eventName, data);
    }
  } catch {
    /* tracking must never break the funnel */
  }
}
