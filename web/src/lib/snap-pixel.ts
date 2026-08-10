/**
 * Snapchat Pixel helpers.
 *
 * Base code (init + PAGE_VIEW) lives in `<SnapPixel />` once, globally.
 * Conversion events must fire only after the relevant backend confirms success,
 * and buyer vs recruitment events must never mix.
 */

/** Official Emara Estates Snap Pixel (Ads Manager). Env override for staging. */
export const SNAP_PIXEL_ID =
  process.env.NEXT_PUBLIC_SNAP_PIXEL_ID?.trim() ||
  '131b50b1-799c-4d5c-a2e5-343feb50333a';

/** Property / investment lead — never fire on recruitment. */
export const SNAP_EVENT_BUYER_LEAD = 'BuyerLead' as const;

/** Recruitment application — never fire on property forms. */
export const SNAP_EVENT_RECRUITMENT = 'RecruitmentApplication' as const;

type SnapWindow = typeof window & {
  snaptr?: (...args: unknown[]) => void;
};

/**
 * Fire a Snap event at most once per ref guard.
 * No-ops if the pixel is absent; never throws into form UX.
 */
export function fireSnapEvent(
  eventName: typeof SNAP_EVENT_BUYER_LEAD | typeof SNAP_EVENT_RECRUITMENT,
  alreadyFired: { current: boolean },
) {
  if (alreadyFired.current) return;
  alreadyFired.current = true;
  try {
    const snaptr = (window as SnapWindow).snaptr;
    if (typeof snaptr === 'function') {
      snaptr('track', eventName);
    }
  } catch {
    /* tracking must never break the form */
  }
}
