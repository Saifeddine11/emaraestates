import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { preload } from 'react-dom';
import { Honest7Landing } from '@/components/honest-7/Honest7Landing';
import { FACTS, HERO_IMAGE, HERO_IMAGE_MOBILE, HERO_MEDIA_DESKTOP, HERO_SIZES, VALIDATION } from '@/lib/content/honest-signature-7';
import { landingJsonLd } from '@/lib/structured-data';
import { ANALYTICS_AHREFS_KEY } from '@/lib/site';

/**
 * `/honest-signature-7/` — the dedicated Meta Ads landing page.
 *
 * It sits outside the `(site)` group on purpose: no site navigation, no
 * mega-footer, no intro curtain, no WhatsApp float — one page, one action.
 * The Meta and Snap base pixels still come from the root layout.
 */

const TITLE = 'Honest Signature 7 à Guéliz, Marrakech | Emara Estates';
const DESCRIPTION =
  `Honest Signature 7 à Guéliz hyper-centre, à 1 minute à pied du Plaza : à partir de ${VALIDATION.euroPrices ? FACTS.priceFrom : FACTS.priceFromMad}, livraison prévue en juin 2028. Recevez le dossier : plans, prix, disponibilités et échéancier.`;
const CANONICAL = 'https://emaraestates.com/honest-signature-7/';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { type: 'website', locale: 'fr_MA', siteName: 'Emara Estates', title: TITLE, description: DESCRIPTION, images: [{ url: OG_IMAGE, width: 1200, height: 630, type: 'image/jpeg' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

/**
 * `viewport-fit=cover` is what makes `env(safe-area-inset-bottom)` non-zero on
 * an iPhone: the sticky CTA uses it to stay above the home indicator.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAF8F4',
};

const jsonLd = landingJsonLd({ slug: 'honest-signature-7/', name: TITLE, description: DESCRIPTION, breadcrumb: 'Honest Signature 7' });

export default function Honest7Page() {
  // The façade is the LCP element on every screen: fetch the right file first —
  // the 2:1 crop below lg, the full render from lg. The media queries are exclusive.
  preload(HERO_IMAGE_MOBILE.src, {
    as: 'image',
    imageSrcSet: HERO_IMAGE_MOBILE.srcSet,
    imageSizes: HERO_IMAGE_MOBILE.sizes,
    media: HERO_IMAGE_MOBILE.media,
    fetchPriority: 'high',
  });
  preload(HERO_IMAGE.src, { as: 'image', imageSrcSet: HERO_IMAGE.srcSet, imageSizes: HERO_SIZES, media: HERO_MEDIA_DESKTOP, fetchPriority: 'high' });

  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a href="#main-content" className="sr-only-legacy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-[16px] focus:text-cream">
        Aller au contenu principal
      </a>
      <Honest7Landing />
      <Script src="https://analytics.ahrefs.com/analytics.js" data-key={ANALYTICS_AHREFS_KEY} strategy="lazyOnload" />
    </>
  );
}
