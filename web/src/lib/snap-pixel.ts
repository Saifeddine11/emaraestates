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
 * Event types the Snap Pixel accepts. The list is closed: Snap attributes and
 * optimises on these names only, and offers five numbered slots for anything
 * else. A made-up name ("BuyerLead", or "CUSTOM_EVENT" without a number) may
 * leave the browser but cannot be used as a conversion in Ads Manager.
 */
export type SnapEvent = 'PAGE_VIEW' | 'VIEW_CONTENT' | 'SIGN_UP' | 'CUSTOM_EVENT_1' | 'CUSTOM_EVENT_2' | 'CUSTOM_EVENT_3' | 'CUSTOM_EVENT_4' | 'CUSTOM_EVENT_5';

/**
 * Sends one event to Snapchat, and only to Snapchat. No-op when the pixel is
 * absent (blocked, or localhost); never throws, so a Snap failure cannot
 * reach the form, the lead request or another platform's tracking.
 *
 * Parameters must be Snap's own (item_category, description, sign_up_method,
 * client_dedup_id…) — never a name, a phone number or an e-mail address.
 */
export function trackSnap(event: SnapEvent, params: Record<string, string | number> = {}) {
  try {
    const snaptr = (window as SnapWindow).snaptr;
    if (typeof snaptr === 'function') snaptr('track', event, params);
  } catch {
    /* tracking must never break the funnel */
  }
}

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
