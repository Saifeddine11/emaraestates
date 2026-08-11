import { META_PIXEL_ID } from '@/lib/meta-pixel';
import { MetaPixelPageViews } from '@/components/analytics/MetaPixelPageViews';

/**
 * Official Meta Pixel bootstrap (init + first PageView).
 * Injected once in root `<head>` — same pattern as Snap Pixel — so `fbq`
 * exists before any form conversion fires.
 */
export function metaPixelInlineScript(pixelId: string) {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');`;
}

/**
 * Global Meta Pixel — one init for the whole site (including `/offre-gueliz`).
 *
 * Base code is injected in root `<head>`; this companion only re-fires PageView
 * on client navigations. Conversion events (buyer Lead / etc. vs
 * RecruitmentApplication) are fired from the form success handlers only —
 * never from this base install.
 */
export function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  return <MetaPixelPageViews />;
}

export { META_PIXEL_ID };
