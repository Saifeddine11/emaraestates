/**
 * Meta (Facebook) Pixel helpers.
 *
 * Base code (init + PageView) lives in root layout once, globally.
 * Conversion events must fire only after the relevant backend confirms success,
 * and buyer vs recruitment events must never mix.
 */

/** Official Emara Estates Meta Pixel. Env override optional for staging. */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '1049553054304565';

/**
 * Recruitment application — fire only on /recrutement-commercial-marrakech
 * after POST /api/recruitment/apply returns success: true.
 * Never fire from property / buyer forms.
 */
export const META_EVENT_RECRUITMENT = 'RecruitmentApplication' as const;

type MetaWindow = typeof window & {
  fbq?: (...args: unknown[]) => void;
};

/**
 * Fire a Meta custom event at most once per ref guard.
 * No-ops if the pixel is absent; never throws into form UX.
 */
export function fireMetaCustomEvent(
  eventName: typeof META_EVENT_RECRUITMENT,
  alreadyFired: { current: boolean },
) {
  if (alreadyFired.current) return;
  alreadyFired.current = true;
  try {
    const fbqAvailable = typeof (window as MetaWindow).fbq === 'function';
    // Temporary production debugging — remove after Meta Events Manager confirms.
    console.log('[Meta] RecruitmentApplication firing', { fbqAvailable });

    const fbq = (window as MetaWindow).fbq;
    if (typeof fbq === 'function') {
      fbq('trackCustom', eventName);
    }
  } catch {
    /* tracking must never break the form */
  }
}
