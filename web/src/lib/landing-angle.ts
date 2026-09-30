/**
 * Which Meta ad angle a visitor of /honest-signature-7/ came from.
 *
 * Order: `landing_angle` on the URL, then an unambiguous `utm_content`
 * keyword, then the same two values stored in the session's first-touch
 * attribution, then the proof hero. The page is a static export, so the hero
 * is chosen by an inline script before first paint (no flash of the wrong
 * variant) and this same function is serialised into it — one rule set for
 * the hero, the events and the lead payload.
 */

export const LANDING_ANGLES = ['price', 'payment', 'proof'] as const;
export type LandingAngle = (typeof LANDING_ANGLES)[number];
export const DEFAULT_LANDING_ANGLE: LandingAngle = 'proof';

/** Whole-word keywords, matched after lowercasing and stripping accents. */
export const UTM_CONTENT_KEYWORDS: Record<LandingAngle, string[]> = {
  price: ['price', 'prix'],
  payment: ['payment', 'paiement', 'echeancier'],
  proof: ['proof', 'preuve', 'livrees', 'delivered'],
};

/** Must match the key used by `captureLandingAttribution()`. */
export const LANDING_ATTRIBUTION_KEY = 'emara_hs7_landing_attribution';

/**
 * Self-contained on purpose (no imports, no outer variables, ES2017 syntax):
 * its source is inlined into the pre-paint script.
 */
function pickLandingAngle(
  search: string,
  stored: Record<string, string> | null,
  keywords: Record<string, string[]>,
  fallback: string,
): string {
  const angles = Object.keys(keywords);
  const fromContent = (value: string | null | undefined) => {
    if (!value) return '';
    const words = String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/);
    const matches = angles.filter((angle) => keywords[angle].some((word) => words.indexOf(word) !== -1));
    return matches.length === 1 ? matches[0] : '';
  };
  const valid = (value: string | null | undefined) => {
    const angle = String(value || '').toLowerCase();
    return angles.indexOf(angle) !== -1 ? angle : '';
  };
  const params = new URLSearchParams(search);
  const saved = stored || {};
  return (
    valid(params.get('landing_angle')) ||
    fromContent(params.get('utm_content')) ||
    valid(saved.landing_angle) ||
    fromContent(saved.utm_content) ||
    fallback
  );
}

function readStored(): Record<string, string> | null {
  try {
    return JSON.parse(window.sessionStorage.getItem(LANDING_ATTRIBUTION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function resolveLandingAngle(): LandingAngle {
  return pickLandingAngle(
    window.location.search,
    readStored(),
    UTM_CONTENT_KEYWORDS,
    DEFAULT_LANDING_ANGLE,
  ) as LandingAngle;
}

/**
 * Runs while the parser is inside the hero: sets `data-angle` on the hero
 * section before any of its content is painted. CSS in globals.css shows the
 * matching variant; without JS the proof variant stays visible.
 */
export const LANDING_ANGLE_SCRIPT = `(function(){try{var s=null;try{s=JSON.parse(sessionStorage.getItem(${JSON.stringify(
  LANDING_ATTRIBUTION_KEY,
)})||'null')}catch(e){}var a=(${pickLandingAngle.toString()})(location.search,s,${JSON.stringify(
  UTM_CONTENT_KEYWORDS,
)},${JSON.stringify(DEFAULT_LANDING_ANGLE)});document.currentScript.parentNode.setAttribute('data-angle',a)}catch(e){}})();`;
