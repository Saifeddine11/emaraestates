import { FACTS } from '@/lib/content/honest-signature-7';
import { track } from '@/lib/gueliz-attribution';
import { resolveLandingAngle } from '@/lib/landing-angle';
import { captureLandingAttribution } from '@/lib/landing-attribution';

/**
 * Parameters every /honest-signature-7/ event carries, so Events Manager can
 * compare creative angle → landing angle → form start → lead. The UTMs are
 * only added when present, never as empty strings.
 */
export function funnelContext(): Record<string, string> {
  const attribution = captureLandingAttribution();
  const context: Record<string, string> = {
    project: FACTS.project,
    landing_angle: resolveLandingAngle(),
  };
  if (attribution.utm_campaign) context.utm_campaign = attribution.utm_campaign;
  if (attribution.utm_content) context.utm_content = attribution.utm_content;
  return context;
}

export function trackFunnel(
  eventName: string,
  data: Record<string, unknown> = {},
  options: { metaEventId?: string } = {},
) {
  track(eventName, { ...funnelContext(), ...data }, options);
}
