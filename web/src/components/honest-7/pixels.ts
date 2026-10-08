/**
 * What each ad platform receives at each moment of the /honest-signature-7/
 * funnel. One function per moment; inside it, one call per platform.
 *
 * The platforms are independent:
 *   - Meta gets Meta's events, through the shared `track()` with `snap: false`
 *     so nothing is relayed to Snapchat under a placeholder name;
 *   - Snapchat gets event types from Snap's own list, through `trackSnap()`;
 *   - each call is guarded on its own, so a blocked or failing pixel affects
 *     neither the other one nor the form.
 *
 * Both base pixels (init + page view) are installed once, in the root layout.
 * Nothing here initialises a pixel, and no call carries a name, a phone number
 * or an e-mail address.
 *
 * Callers own the "once" guarantee: the landing view fires once per page load,
 * the form start once per form, the lead once per accepted submission.
 */

import { LEAD_SOURCE } from '@/lib/content/honest-signature-7';
import { OG_TRACKING } from '@/lib/content/offre-gueliz';
import { track } from '@/lib/gueliz-attribution';
import { trackSnap, type SnapEvent } from '@/lib/snap-pixel';
import { PROJECT } from '@/components/honest-7/shared';

const META_ONLY = { snap: false } as const;

/**
 * Snap has no "lead form started" event type; the first of its five custom
 * slots carries it. Label it in Snap Events Manager.
 */
export const SNAP_FORM_STARTED: SnapEvent = 'CUSTOM_EVENT_1';
/** Snap's event type for a lead / form submission. */
export const SNAP_LEAD: SnapEvent = 'SIGN_UP';

/** The landing page was viewed. (Page view itself comes from the base pixels.) */
export function pixelLandingView(contentName: string) {
  track('ViewContent', { content_name: contentName, content_category: 'Real Estate', page_type: 'meta_landing_page', project: PROJECT }, META_ONLY);
  trackSnap('VIEW_CONTENT', { item_category: 'Real Estate', description: PROJECT });
}

/** First interaction with the lead form. Not a conversion on either platform. */
export function pixelFormStarted(placement: string) {
  track(OG_TRACKING.events.start, { project: PROJECT, lead_source: LEAD_SOURCE, placement }, META_ONLY);
  trackSnap(SNAP_FORM_STARTED, { description: 'Lead form started' });
}

/**
 * The lead was accepted by the backend — the only place a lead conversion is
 * sent, on either platform. `eventId` is the ID the server reuses for Meta's
 * Conversions API copy; Snap receives it as its own deduplication key, ready
 * for a server-side copy if one is ever added.
 */
export function pixelLead({ eventId, utmCampaign }: { eventId: string; utmCampaign: string }) {
  track(OG_TRACKING.events.lead, { lead_source: LEAD_SOURCE, project: PROJECT, utm_campaign: utmCampaign }, { metaEventId: eventId, snap: false });
  trackSnap(SNAP_LEAD, { sign_up_method: 'lead_form', description: PROJECT, client_dedup_id: eventId });
}

/**
 * One of the form's three steps was completed (1 type, 2 budget, 3 contact —
 * the last only once the lead is accepted). Meta only; not a conversion.
 */
export function pixelStepCompleted(step: 1 | 2 | 3, stepKey: 'type_de_bien' | 'budget' | 'coordonnees') {
  track(OG_TRACKING.events.step, { project: PROJECT, step, step_key: stepKey }, META_ONLY);
}

/** A phone or WhatsApp link was clicked. Meta only: nothing equivalent was asked of Snap. */
export function pixelContact(method: 'WhatsApp' | 'Téléphone') {
  track('Contact', { project: PROJECT, method }, META_ONLY);
}
