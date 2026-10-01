'use client';

import { useEffect } from 'react';
import { LandingTracking } from '@/components/honest-7/LandingTracking';
import { CONTENT_NAME, PROJECT } from '@/lib/content/residence-boutique';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { trackLandingEvent } from '@/lib/landing-events';

/**
 * Page-level events: the shared HS7 LandingTracking (ViewContent once, Contact
 * on WhatsApp / phone clicks, attribution captured on arrival) under this
 * creative's content name, plus the CRO `landing_view`.
 */
export function BoutiqueTracking() {
  useEffect(() => {
    const attribution = captureLandingAttribution();
    trackLandingEvent('landing_view', {
      project: PROJECT,
      utm_source: attribution.utm_source || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
    });
  }, []);
  return <LandingTracking contentName={CONTENT_NAME} />;
}
