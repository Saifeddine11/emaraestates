import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { preload } from 'react-dom';
import { BoutiqueLanding } from '@/components/residence-boutique/BoutiqueLanding';
import { HERO_IMAGE, HERO_SIZES } from '@/lib/content/residence-boutique';
import { ANALYTICS_AHREFS_KEY } from '@/lib/site';

/**
 * `/residence-boutique-gueliz` — Meta Ads landing for the "1ʳᵉ résidence
 * boutique à Guéliz hyper-centre" creative.
 *
 * Like /offre-gueliz, it sits outside the `(site)` group on purpose: no site
 * navigation, no mega-footer, no intro curtain, no WhatsApp float — one page,
 * one action. It is an ads page, so `noindex, nofollow`, no canonical and
 * absent from the sitemap; /honest-signature-7/ remains the indexed HS7 page.
 * The Meta and Snap base pixels still come from the root layout.
 */

export const metadata: Metadata = {
  title: 'Honest Signature 7 — La 1re résidence boutique à Guéliz hyper-centre | Emara Estates',
  description:
    'Piscines, spa, jacuzzi, salle de sport, sauna, cinéma extérieur. À 1 minute à pied du Plaza, à partir de 1 390 000 MAD, livraison juin 2028. Voir les appartements disponibles.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#FAF8F4',
};

export default function ResidenceBoutiquePage() {
  // The first hero visual is the LCP element: fetch the right width first.
  preload(HERO_IMAGE.src, {
    as: 'image',
    imageSrcSet: HERO_IMAGE.srcSet,
    imageSizes: HERO_SIZES,
    fetchPriority: 'high',
  });

  return (
    <>
      <a
        href="#main-content"
        className="sr-only-legacy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-9999 focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-[16px] focus:text-cream"
      >
        Aller au contenu principal
      </a>
      <BoutiqueLanding />
      <Script src="https://analytics.ahrefs.com/analytics.js" data-key={ANALYTICS_AHREFS_KEY} strategy="lazyOnload" />
    </>
  );
}
