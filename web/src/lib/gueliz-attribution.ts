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

/** `ViewContent` and `Contact` are sent only by /honest-signature-7/. */
const META_STANDARD_EVENTS = new Set(['Lead', 'ViewContent', 'Contact']);

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
 *
 * `metaEventId` is passed to Meta as `eventID` so the Conversions API copy of
 * the same conversion (sent by the server with that exact ID) is deduplicated.
 *
 * `snap: false` leaves Snapchat out of this call. /honest-signature-7/ uses it:
 * there each platform gets its own events (see components/honest-7/pixels.ts),
 * so a Meta event and its parameters are not relayed to Snap under a
 * placeholder name. Every other page keeps the behaviour it had.
 *
 * Each platform is guarded on its own: one pixel throwing does not stop the
 * calls to the others.
 */
export function track(
  eventName: string,
  data: Record<string, unknown> = {},
  { metaEventId, snap = true }: { metaEventId?: string; snap?: boolean } = {},
) {
  if (!eventName) return;
  const w = window as typeof window & Pixels;
  const guarded = (send: () => void) => {
    try {
      send();
    } catch {
      /* tracking must never break the funnel */
    }
  };
  guarded(() => {
    if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: eventName, ...data });
  });
  guarded(() => {
    if (typeof w.fbq !== 'function') return;
    const options = metaEventId ? [{ eventID: metaEventId }] : [];
    // Meta standard events go through `track`; everything else is custom.
    if (META_STANDARD_EVENTS.has(eventName)) w.fbq('track', eventName, data, ...options);
    else w.fbq('trackCustom', eventName, data, ...options);
  });
  guarded(() => {
    if (w.ttq && typeof w.ttq.track === 'function') w.ttq.track(eventName, data);
  });
  guarded(() => {
    // BuyerLead is fired explicitly after confirmed property-form success
    // (ContactForm / GuelizLeadForm). Do not map Meta `Lead` → Snap SIGN_UP
    // here: that would also fire on Guéliz honeypot short-circuits and mix
    // with the dedicated BuyerLead conversion used for Snap property ads.
    if (snap && typeof w.snaptr === 'function' && eventName !== 'Lead') w.snaptr('track', 'CUSTOM_EVENT', data);
  });
  guarded(() => {
    if (typeof w.gtag === 'function') w.gtag('event', eventName, data);
  });
}
