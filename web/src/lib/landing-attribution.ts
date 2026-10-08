/**
 * First-touch attribution for the /honest-signature-7/ ads landing page
 * (Meta and Snapchat traffic alike: whatever arrived in the URL is kept as is).
 *
 * Deliberately separate from the simulator's store (its sessionStorage key and
 * module stay exclusive to /simulateur/). Same first-write-wins convention:
 * the values captured on arrival from the ad survive in-page navigation, both
 * form steps and reloads within the session, and are only read at submit.
 */

export type LandingAttribution = Record<string, string>;

const STORAGE_KEY = 'emara_hs7_landing_attribution';

const URL_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'campaign_id',
  'adset_id',
  'ad_id',
  'fbclid',
] as const;

function readCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`;
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

function read(): LandingAttribution {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LandingAttribution) : {};
  } catch {
    return {};
  }
}

/** Merges the current URL and Meta cookies into the stored attribution and returns it. */
export function captureLandingAttribution(): LandingAttribution {
  const stored = read();
  const search = new URLSearchParams(window.location.search);
  let changed = false;
  const set = (key: string, value: string) => {
    if (value && !stored[key]) {
      stored[key] = value;
      changed = true;
    }
  };

  for (const param of URL_PARAMS) set(param, search.get(param) || '');
  // Snapchat appends its click ID as `ScCid` (sometimes lower-cased).
  for (const [key, value] of search) {
    if (key.toLowerCase() === 'sccid') set('sc_click_id', value);
  }
  set('fbc', readCookie('_fbc'));
  set('fbp', readCookie('_fbp'));
  set('landing_page_url', window.location.href.split('#')[0]);
  set('referrer', document.referrer);
  // First touch wins, like every value here: arriving later from the other
  // platform never relabels the visit.
  if (/facebook|meta|instagram|fb|ig/i.test(stored.utm_source || '') || stored.fbclid) set('ad_platform', 'Meta');
  else if (/snap/i.test(stored.utm_source || '') || stored.sc_click_id) set('ad_platform', 'Snapchat');

  if (changed) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Attribution is best-effort and must never block the form.
    }
  }
  return stored;
}
