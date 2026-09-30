'use client';

import { useEffect } from 'react';
import { trackFunnel } from '@/components/honest-7/funnel';
import { FUNNEL_EVENTS } from '@/lib/content/honest-signature-7';
import { captureLandingAttribution } from '@/lib/landing-attribution';

/**
 * Page-level events for the ad landing. PageView already comes from the
 * global pixel base code, so this adds only:
 *   - ViewContent, once per page load;
 *   - Contact, when a WhatsApp or phone link is clicked — including the
 *     site-wide WhatsApp float, observed by delegation rather than edited.
 * Attribution is captured on arrival so the UTMs survive until the form.
 * `content_name` is unchanged so existing custom conversions keep matching;
 * the ad angle travels in `landing_angle`.
 */
export function LandingTracking() {
  useEffect(() => {
    captureLandingAttribution();
    trackFunnel(FUNNEL_EVENTS.view, {
      content_name: 'Honest Signature 7 - 6 residences',
      content_category: 'Real Estate',
      page_type: 'meta_landing_page',
    });

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const method = /wa\.me|whatsapp/i.test(href) ? 'WhatsApp' : href.startsWith('tel:') ? 'Téléphone' : '';
      if (method) trackFunnel('Contact', { method });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
