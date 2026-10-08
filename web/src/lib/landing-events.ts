/**
 * CRO funnel events for the paid landing pages (landing_view, form_started,
 * lead_submit_success, payment_simulator_completed…).
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
  | 'hero_primary_cta_click'
  | 'hero_show_apartment_click'
  | 'availability_cta_click'
  | 'form_view'
  | 'form_started'
  | 'lead_submit_attempt'
  | 'lead_submit_success'
  | 'lead_submit_error'
  | 'post_lead_intent_selected'
  | 'contact_channel_selected'
  | 'visit_booking_started'
  | 'post_lead_qualification_saved'
  | 'partial_lead_captured'
  | 'form_step_back'
  | 'show_apartment_view'
  | 'show_apartment_cta_click'
  | 'payment_simulator_started'
  | 'payment_simulator_completed'
  | 'faq_opened'
  | 'phone_click'
  | 'whatsapp_click'
  | 'property_type_selected'
  | 'budget_selected'
  // /residence-boutique-gueliz only.
  | 'hero_cta_click'
  | 'form_step_2'
  | 'amenities_section_view'
  | 'payment_section_view';

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
