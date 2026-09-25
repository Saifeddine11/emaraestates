/**
 * First-touch campaign attribution for the simulator funnel.
 *
 * The paid-ads landing page already persists UTM and campaign identifiers in
 * sessionStorage. The simulator keeps its own key so changes here cannot alter
 * that established wire contract, while following the same first-write-wins
 * convention. Meta browser identifiers are read from their first-party cookies
 * when available; no contact information is stored here or placed in the URL.
 */

export type SimulatorAttribution = Record<string, string>;

const STORAGE_KEY = 'emara_simulator_attribution';

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

function platformFrom(source: string | undefined) {
  const value = String(source || '').toLowerCase();
  if (/facebook|meta|instagram|fb|ig/.test(value)) return 'Meta';
  if (/tiktok|tt/.test(value)) return 'TikTok';
  if (/snap/.test(value)) return 'Snapchat';
  if (/google|adwords|gads/.test(value)) return 'Google';
  return source || '';
}

export function readSimulatorAttribution(): SimulatorAttribution {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SimulatorAttribution) : {};
  } catch {
    return {};
  }
}

function writeSimulatorAttribution(value: SimulatorAttribution) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Attribution is best-effort and must never block the form.
  }
}

export function captureSimulatorAttribution(): SimulatorAttribution {
  const stored = readSimulatorAttribution();
  const search = new URLSearchParams(window.location.search);
  let changed = false;

  for (const param of URL_PARAMS) {
    const value = search.get(param);
    if (value && !stored[param]) {
      stored[param] = value;
      changed = true;
    }
  }

  for (const [key, cookie] of [
    ['fbc', '_fbc'],
    ['fbp', '_fbp'],
  ] as const) {
    const value = readCookie(cookie);
    if (value && !stored[key]) {
      stored[key] = value;
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

  if (changed) writeSimulatorAttribution(stored);
  return stored;
}
