import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Honest7Landing } from '@/components/honest-7/Honest7Landing';
import { HERO_IMAGE, HERO_SIZES } from '@/lib/content/honest-signature-7';
import { landingJsonLd } from '@/lib/structured-data';

const TITLE = 'Honest Signature 7 à Guéliz, Marrakech | Emara Estates';
const DESCRIPTION =
  'Honest Signature 7 à Guéliz, à 1 minute à pied du Plaza : dès 51 m², à partir de 1 390 000 MAD, livraison juin 2028. Recevez les plans, prix et disponibilités.';
/**
 * Slashed canonical, served as a directory index like /simulateur/. Rendered
 * directly (not via `alternates`) because the metadata API would strip the
 * trailing slash — see residences-honest-678/page.tsx.
 */
const CANONICAL = 'https://emaraestates.com/honest-signature-7/';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: 'Emara Estates',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, type: 'image/jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const jsonLd = landingJsonLd({
  slug: 'honest-signature-7/',
  name: TITLE,
  description: DESCRIPTION,
  breadcrumb: 'Honest Signature 7',
});

export default function Honest7Page() {
  // The hero building is the LCP element: fetch the right width first.
  preload(HERO_IMAGE.src, {
    as: 'image',
    imageSrcSet: HERO_IMAGE.srcSet,
    imageSizes: HERO_SIZES,
    fetchPriority: 'high',
  });

  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main-content">
        <Honest7Landing />
      </main>
    </>
  );
}
