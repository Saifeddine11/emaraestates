'use client';

import { useEffect } from 'react';
import { track } from '@/lib/gueliz-attribution';
import { captureLandingAttribution } from '@/lib/landing-attribution';

const PROJECT = 'Honest Signature 7';

/**
 * Page-level events for the ad landing. PageView already comes from the
 * global pixel base code, so this adds only:
 *   - ViewContent, once per page load;
 *   - Contact, when a WhatsApp or phone link is clicked — including the
 *     site-wide WhatsApp float, observed by delegation rather than edited.
 * Attribution is captured on arrival so the UTMs survive until the form.
 */
export function LandingTracking() {
  useEffect(() => {
    captureLandingAttribution();
    track('ViewContent', {
      content_name: 'Honest Signature 7 - 6 residences',
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
  }, []);

  return null;
}
