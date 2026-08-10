import { SNAP_PIXEL_ID } from '@/lib/snap-pixel';
import { SnapPixelPageViews } from '@/components/analytics/SnapPixelPageViews';

/** Official Snap Pixel bootstrap (init + first PAGE_VIEW). */
export function snapPixelInlineScript(pixelId: string) {
  return `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
r.src=n;var u=t.getElementsByTagName(s)[0];
u.parentNode.insertBefore(r,u);})(window,document,
'https://sc-static.net/scevent.min.js');
snaptr('init', ${JSON.stringify(pixelId)}, {});
snaptr('track', 'PAGE_VIEW');`;
}

/**
 * Global Snap Pixel — one init for the whole site (including `/offre-gueliz`).
 * Base code is injected in root `<head>`; this companion only re-fires PAGE_VIEW
 * on client navigations. Conversion events stay in the form success handlers.
 */
export function SnapPixel() {
  if (!SNAP_PIXEL_ID) return null;
  return <SnapPixelPageViews />;
}

export { SNAP_PIXEL_ID };
