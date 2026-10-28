import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { preload } from 'react-dom';
import { BoutiqueLanding } from '@/components/honest-7-residence-boutique/BoutiqueLanding';
import { FACTS, HERO_IMAGE, HERO_IMAGE_MOBILE, HERO_MEDIA_DESKTOP, HERO_SIZES, VALIDATION } from '@/lib/content/honest-signature-7';
import { ANALYTICS_AHREFS_KEY } from '@/lib/site';

/**
 * `/honest-signature-7-residence-boutique/` — /honest-signature-7/ for the
 * « première résidence boutique de Marrakech » video campaign.
 *
 * A campaign page: `noindex, nofollow`, no canonical, no structured data and
 * absent from the sitemap, so it never competes with /honest-signature-7/,
 * which stays the indexed HS7 page. Like it, it sits outside the `(site)`
 * group: no navigation, no intro curtain, no WhatsApp float. The Meta and
 * Snap base pixels come from the root layout.
 */

const URL = 'https://emaraestates.com/honest-signature-7-residence-boutique/';
const TITLE = 'Honest Signature 7, la première résidence boutique de Marrakech | Emara Estates';
const DESCRIPTION =
  `Une adresse intime au cœur de Guéliz, à 1 minute à pied du Plaza, avec les services d’un hôtel : piscines, spa, jacuzzi, salle de sport, cinéma extérieur et conciergerie. À partir de ${VALIDATION.euroPrices ? FACTS.priceFrom : FACTS.priceFromMad}, livraison prévue en juin 2028.`;
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { type: 'website', locale: 'fr_MA', siteName: 'Emara Estates', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: OG_IMAGE, width: 1200, height: 630, type: 'image/jpeg' }] },
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

export default function Honest7BoutiquePage() {
  // The façade is the LCP element on every screen: fetch the right file first —
  // the 3:2 render below lg, the full render from lg. The media queries are exclusive.
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
      <a href="#main-content" className="sr-only-legacy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-[16px] focus:text-cream">
        Aller au contenu principal
      </a>
      <BoutiqueLanding />
      <Script src="https://analytics.ahrefs.com/analytics.js" data-key={ANALYTICS_AHREFS_KEY} strategy="lazyOnload" />
    </>
  );
}
