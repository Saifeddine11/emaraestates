import type { Metadata } from 'next';
import Script from 'next/script';
import { Honest7Landing } from '@/components/honest-7/Honest7Landing';
import { landingJsonLd } from '@/lib/structured-data';
import { ANALYTICS_AHREFS_KEY } from '@/lib/site';

const TITLE = 'Honest Signature 7 à Guéliz, Marrakech | Emara Estates';
const DESCRIPTION = 'Honest Signature 7 à Guéliz, à 1 minute à pied du Plaza : dès 51 m², à partir de 1 390 000 MAD, livraison juin 2028. Recevez les plans, prix et disponibilités.';
const CANONICAL = 'https://emaraestates.com/honest-signature-7/';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: { type: 'website', locale: 'fr_MA', siteName: 'Emara Estates', title: TITLE, description: DESCRIPTION, images: [{ url: OG_IMAGE, width: 1200, height: 630, type: 'image/jpeg' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

const jsonLd = landingJsonLd({ slug: 'honest-signature-7/', name: TITLE, description: DESCRIPTION, breadcrumb: 'Honest Signature 7' });

export default function Honest7Page() {
  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a href="#main-content" className="sr-only-legacy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-cream">Aller au contenu principal</a>
      <Honest7Landing />
      <Script src="https://analytics.ahrefs.com/analytics.js" data-key={ANALYTICS_AHREFS_KEY} strategy="afterInteractive" />
    </>
  );
}
