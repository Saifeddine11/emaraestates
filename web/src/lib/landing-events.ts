/**
 * CRO funnel events for the paid landing pages (landing_view, form_started,
 * budget_selected, lead_submit_success…).
 *
 * Kept apart from `track()` on purpose. `track()` carries the conversion
 * events campaigns optimise on (ViewContent, LeadFormStarted, Lead with its
 * CAPI event ID) and also fans out to Snap/TikTok; these micro-events would be
 * noise there. They go to:
 *   - `window.dataLayer`, created if absent, so any tag manager added later
 *     reads them without a code change;
 *   - the Meta Pixel as custom events (never `track`, so never a standard
 *     conversion), which is the analytics the site has today;
 *   - `gtag`, only if present.
 *
 * `lead_submit_success` is informational: the Meta `Lead` itself is still
 * fired by the form, once, after the server confirms.
 */

export type LandingEvent =
  | 'landing_view'
  | 'hero_cta_click'
  | 'hero_prices_cta_click'
  | 'hero_show_apartment_click'
  | 'availability_cta_click'
  | 'form_view'
  | 'form_started'
  | 'property_type_selected'
  | 'budget_selected'
  | 'form_step_2'
  | 'lead_submit_attempt'
  | 'lead_submit_success'
  | 'lead_submit_error'
  | 'show_apartment_section_view'
  | 'show_apartment_cta_click'
  | 'amenities_section_view'
  | 'payment_section_view'
  | 'qualify_submit';

type Sinks = {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

export function trackLandingEvent(name: LandingEvent, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as typeof window & Sinks;
  try {
    w.dataLayer = Array.isArray(w.dataLayer) ? w.dataLayer : [];
    w.dataLayer.push({ event: name, ...data });
    if (typeof w.fbq === 'function') w.fbq('trackCustom', name, data);
    if (typeof w.gtag === 'function') w.gtag('event', name, data);
  } catch {
    /* tracking must never break the funnel */
  }
}
