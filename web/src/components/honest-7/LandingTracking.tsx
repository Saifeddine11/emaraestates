'use client';

import { useEffect } from 'react';
import { track } from '@/lib/gueliz-attribution';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { trackLandingEvent } from '@/lib/landing-events';

const PROJECT = 'Honest Signature 7';

/**
 * Page-level events for the ad landing. PageView already comes from the
 * global pixel base code, so this adds only:
 *   - ViewContent, once per page load;
 *   - Contact, when a WhatsApp or phone link is clicked — including the
 *     site-wide WhatsApp float, observed by delegation rather than edited.
 * Attribution is captured on arrival so the UTMs survive until the form.
 */
export function LandingTracking({ contentName = 'Honest Signature 7 - 6 residences' }: { contentName?: string }) {
  useEffect(() => {
    captureLandingAttribution();
    trackLandingEvent('landing_view', { project: PROJECT, landing: 'honest_signature_7' });
    track('ViewContent', {
      content_name: contentName,
      content_category: 'Real Estate',
      page_type: 'meta_landing_page',
      project: PROJECT,
    });

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const method = /wa\.me|whatsapp/i.test(href) ? 'WhatsApp' : href.startsWith('tel:') ? 'Téléphone' : '';
      if (method) track('Contact', { project: PROJECT, method });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [contentName]);

  return null;
}
