import type { Metadata } from 'next';
import { LightboxProvider } from '@/components/gallery/LightboxProvider';
import { ShowroomLanding } from '@/components/appartements-temoins/ShowroomLanding';
import { landingJsonLd } from '@/lib/structured-data';

const TITLE = 'Appartements témoins à Marrakech | Honest Signature | Emara Estates';
const DESCRIPTION =
  'Visitez les appartements témoins Honest Signature à Guéliz, Marrakech. Découvrez les finitions, les volumes et les résidences déjà livrées, puis demandez une visite.';
/**
 * Slashed canonical, served as a directory index like /simulateur/. Rendered
 * directly (not via `alternates`) because the metadata API would strip the
 * trailing slash — see residences-honest-678/page.tsx.
 */
const CANONICAL = 'https://emaraestates.com/appartements-temoins/';
/** Shipped from web/public (see ASSET_FILES) — /img is not part of the deploy. */
const OG_IMAGE = 'https://emaraestates.com/og-appartements-temoins.jpg';

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
  slug: 'appartements-temoins/',
  name: TITLE,
  description: DESCRIPTION,
  breadcrumb: 'Appartements témoins',
});

export default function ShowroomsPage() {
  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LightboxProvider>
        <main id="main-content">
          <ShowroomLanding />
        </main>
      </LightboxProvider>
    </>
  );
}
