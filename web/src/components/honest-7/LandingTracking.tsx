'use client';

import { useEffect } from 'react';
import { pixelContact, pixelLandingView } from '@/components/honest-7/pixels';
import { track } from '@/lib/gueliz-attribution';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { trackLandingEvent } from '@/lib/landing-events';

const PROJECT = 'Honest Signature 7';

/** Page loads this module once; React's dev double-mount must not double-count the view. */
const viewed = new Set<string>();

/**
 * Page-level events for the ad landing. PageView already comes from the
 * global pixel base code, so this adds only:
 *   - `landing_view` and ViewContent, once per page load;
 *   - `phone_click` / `whatsapp_click`, plus the Meta `Contact` the page has
 *     always sent, when a phone or WhatsApp link is clicked — observed by
 *     delegation, so every such link on the page is covered.
 * Attribution is captured on arrival so the UTMs survive until the form.
 *
 * `splitPlatforms` (the /honest-signature-7/ page) sends Meta and Snapchat
 * their own events — see pixels.ts. Without it (/residence-boutique-gueliz,
 * which shares this component) the calls are the ones that page always made.
 */
export function LandingTracking({
  contentName = 'Honest Signature 7 - 6 residences',
  splitPlatforms = false,
}: {
  contentName?: string;
  splitPlatforms?: boolean;
}) {
  useEffect(() => {
    const attribution = captureLandingAttribution();
    if (!viewed.has(contentName)) {
      viewed.add(contentName);
      trackLandingEvent('landing_view', {
        project: PROJECT,
        landing: 'honest_signature_7',
        utm_source: attribution.utm_source || '',
        utm_campaign: attribution.utm_campaign || '',
        utm_content: attribution.utm_content || '',
      });
      if (splitPlatforms) pixelLandingView(contentName);
      else track('ViewContent', { content_name: contentName, content_category: 'Real Estate', page_type: 'meta_landing_page', project: PROJECT });
    }

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const whatsapp = /wa\.me|whatsapp/i.test(href);
      if (!whatsapp && !href.startsWith('tel:')) return;
      const location = link.closest('[data-track-location]')?.getAttribute('data-track-location') || '';
      trackLandingEvent(whatsapp ? 'whatsapp_click' : 'phone_click', { project: PROJECT, location });
      if (splitPlatforms) pixelContact(whatsapp ? 'WhatsApp' : 'Téléphone');
      else track('Contact', { project: PROJECT, method: whatsapp ? 'WhatsApp' : 'Téléphone' });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [contentName, splitPlatforms]);

  return null;
}
