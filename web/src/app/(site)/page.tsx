import type { Metadata } from 'next';
import { LightboxProvider } from '@/components/gallery/LightboxProvider';
import { Hero } from '@/components/home/Hero';
import { VideoGallerySection } from '@/components/sections/video-gallery-section';
import { ProjectsSection } from '@/components/home/ProjectsSection';
import { MapSection } from '@/components/home/MapSection';
import { Realisations } from '@/components/home/Realisations';
import { Newsletter } from '@/components/home/Newsletter';
import { CtaBand } from '@/components/home/CtaBand';
import { About } from '@/components/home/About';
import { ParallaxQuote } from '@/components/home/ParallaxQuote';
import { Services } from '@/components/home/Services';
import { Faq } from '@/components/home/Faq';
import { Contact } from '@/components/home/Contact';
import { homeJsonLd } from '@/lib/structured-data';

const TITLE = 'Appartements neufs à Guéliz | Apport dès 39 000 € | Emara Estates';
const DESCRIPTION =
  'Devenez propriétaire d’un appartement neuf à Guéliz avec un apport dès 39 000 €. Découvrez les programmes Emara Estates, prix, plans et accompagnement à Marrakech.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

/**
 * The indexed canonical carries a trailing slash. Next's metadata API resolves
 * URLs against `metadataBase` and normalizes that slash away (it follows
 * `trailingSlash: false`), which would silently re-point the canonical at a URL
 * that .htaccess 301s. So `alternates.canonical` and `openGraph.url` are left
 * unset here and the two tags are rendered directly below, where React hoists
 * them into <head> verbatim.
 */
const CANONICAL = 'https://emaraestates.com/';

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

export default function HomePage() {
  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      {/* Section order: hero → #videos (cream fan, desktop overlap teaser) →
          projects → map → réalisations. The video gallery has no legacy counterpart. */}
      <LightboxProvider>
        <main id="main-content">
          <Hero />
          <VideoGallerySection />
          <ProjectsSection />
          <MapSection />
          <Realisations />
          <Newsletter />
          <CtaBand />
          <About />
          <ParallaxQuote />
          <Services />
          <Faq />
          <Contact />
        </main>
      </LightboxProvider>
    </>
  );
}
