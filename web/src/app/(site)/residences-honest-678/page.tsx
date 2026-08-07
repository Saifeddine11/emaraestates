import type { Metadata } from 'next';
import { LightboxProvider } from '@/components/gallery/LightboxProvider';
import { ApportSimulator } from '@/components/forms/ApportSimulator';
import { VirtualTour } from '@/components/sections/VirtualTour';
import { ProjectHero } from '@/components/residences/ProjectHero';
import { ProjectSummary } from '@/components/residences/ProjectSummary';
import { ProjectOverview } from '@/components/residences/ProjectOverview';
import { Amenities } from '@/components/residences/Amenities';
import { ShowApartment } from '@/components/residences/ShowApartment';
import { ProjectGallery } from '@/components/residences/ProjectGallery';
import { Typologies } from '@/components/residences/Typologies';
import { ProjectLocation } from '@/components/residences/ProjectLocation';
import { ProjectCta } from '@/components/residences/ProjectCta';
import { residencesJsonLd } from '@/lib/structured-data';

const TITLE = 'Honest Signature 7 Guéliz | Prix, plans & visite témoin';
const DESCRIPTION =
  'Découvrez Honest Signature 7 à Guéliz : studios, appartements, duplex et commerces. Recevez les prix, plans, disponibilités et planifiez une visite témoin.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

/**
 * The indexed canonical carries a trailing slash, and this route is the one the
 * whole site links to that way. Next's metadata API resolves URLs against
 * `metadataBase` and normalizes the slash away (it follows `trailingSlash:
 * false`), which would point the canonical at a URL that .htaccess 301s. So
 * `alternates.canonical` and `openGraph.url` are left unset here and the two
 * tags are rendered directly below, where React hoists them into <head>.
 */
const CANONICAL = 'https://emaraestates.com/residences-honest-678/';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    // `article`, not `website` — this differs from the homepage.
    type: 'article',
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

export default function ResidencesHonest678Page() {
  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(residencesJsonLd) }}
      />
      {/* Section order is frozen — see ROUTE-CHECKLIST-residences-honest-678.md §5.
          The legacy page kept the hero outside <main>; it stays a <header> here
          but sits inside <main> so the skip link lands above it rather than
          past it. */}
      <LightboxProvider>
        <main id="main-content">
          <ProjectHero />
          <div className="mx-auto w-full max-w-[1400px] px-6 md:px-[60px]">
            <ProjectSummary />
            <VirtualTour />
            <ProjectOverview />
            <Amenities />
            <ShowApartment />
            <ProjectGallery />
            <Typologies />
            <ApportSimulator idSuffix="honest" />
            <ProjectLocation />
          </div>
          <ProjectCta />
        </main>
      </LightboxProvider>
    </>
  );
}
