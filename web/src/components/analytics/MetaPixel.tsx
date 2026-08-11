import Script from 'next/script';
import { META_PIXEL_ID } from '@/lib/meta-pixel';
import { MetaPixelPageViews } from '@/components/analytics/MetaPixelPageViews';

/**
 * Global Meta Pixel — one init for the whole site (including `/offre-gueliz`).
 *
 * Official base script in `<head>` via `beforeInteractive`, plus PageView on
 * client-side route changes. Conversion events (buyer Lead / etc. vs
 * RecruitmentApplication) are fired from the form success handlers only —
 * never from this base install.
 */
export function MetaPixel() {
  if (!META_PIXEL_ID) return null;

  const id = JSON.stringify(META_PIXEL_ID);

  return (
    <>
      <Script id="meta-pixel" strategy="beforeInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${id});
fbq('track', 'PageView');
`}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <MetaPixelPageViews />
    </>
  );
}
