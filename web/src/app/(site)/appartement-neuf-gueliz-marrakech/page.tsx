import type { Metadata } from 'next';
import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { SnapRow } from '@/components/gallery/SnapRow';
import { EditorialLink, SectionLabel, SectionTitle } from '@/components/ui/Section';
import {
  PinnedBackground,
  PinnedMiniCards,
  ProgramBlock,
  SeoCta,
  SeoHero,
  ServicesGrid,
  ShowApartmentTeaser,
  SplitSticky,
} from '@/components/seo/SeoSections';
import { SeoFaq } from '@/components/seo/SeoFaq';
import {
  GUELIZ_CTA,
  GUELIZ_FAQ,
  GUELIZ_GALLERY,
  GUELIZ_HERO,
  GUELIZ_IMAGES,
  GUELIZ_LOCATION,
  GUELIZ_PROGRAM,
  GUELIZ_SHOW_APARTMENT,
  GUELIZ_SUPPORT,
  GUELIZ_TYPOLOGIES,
  GUELIZ_WHY_NEW,
} from '@/lib/content/gueliz';
import { landingJsonLd } from '@/lib/structured-data';

const TITLE = 'Appartement neuf Guéliz Marrakech | Prix & disponibilités';
const DESCRIPTION =
  'Vous cherchez un appartement neuf à Guéliz Marrakech ? Consultez les programmes sélectionnés par Emara Estates et recevez les prix à jour.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';
const CANONICAL = 'https://emaraestates.com/appartement-neuf-gueliz-marrakech';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: 'Emara Estates',
    url: CANONICAL,
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
  slug: 'appartement-neuf-gueliz-marrakech',
  name: TITLE,
  description: DESCRIPTION,
  breadcrumb: 'Appartement neuf Guéliz Marrakech',
});

export default function AppartementNeufGuelizMarrakechPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SeoHero {...GUELIZ_HERO} />

      {/* The static build keeps the hero outside <main> on this page and opens
          the landmark on the first section; the port had dropped the landmark
          entirely, which also left the layout's skip link without a target. */}
      <main id="main-content">
        <PinnedBackground
          ariaLabel={GUELIZ_IMAGES.ariaLabel}
          image={GUELIZ_IMAGES.image}
          alt={GUELIZ_IMAGES.alt}
          label={GUELIZ_IMAGES.label}
          title={GUELIZ_IMAGES.title}
          intro={GUELIZ_IMAGES.intro}
          cta={{ ...GUELIZ_IMAGES.cta }}
        >
          <PinnedMiniCards cards={[...GUELIZ_IMAGES.miniCards]} />
        </PinnedBackground>

        <SplitSticky
          label={GUELIZ_LOCATION.label}
          title={GUELIZ_LOCATION.title}
          image={GUELIZ_LOCATION.image}
          alt={GUELIZ_LOCATION.alt}
        >
          {GUELIZ_LOCATION.body}
        </SplitSticky>

        <ServicesGrid {...GUELIZ_WHY_NEW} cards={[...GUELIZ_WHY_NEW.cards]} />

        <SplitSticky
          label={GUELIZ_TYPOLOGIES.label}
          title={GUELIZ_TYPOLOGIES.title}
          image={GUELIZ_TYPOLOGIES.image}
          alt={GUELIZ_TYPOLOGIES.alt}
          flip
        >
          {GUELIZ_TYPOLOGIES.body}
        </SplitSticky>

        <section className="bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)]">
          <div className="mx-auto w-full max-w-[1320px]">
            <Reveal>
              <SectionLabel>{GUELIZ_GALLERY.label}</SectionLabel>
              <SectionTitle className="text-[clamp(32px,3.6vw,52px)]">
                {GUELIZ_GALLERY.title}
              </SectionTitle>
            </Reveal>
            <SnapRow
              ariaLabel={GUELIZ_GALLERY.ariaLabel}
              count={GUELIZ_GALLERY.images.length}
              className="mt-12"
              trackClassName="gap-5"
            >
              {GUELIZ_GALLERY.images.map((image) => (
                <figure
                  key={image.src}
                  className="w-[86%] shrink-0 snap-start overflow-hidden rounded-2xl md:w-[46%]"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    sizes="(max-width: 768px) 86vw, 46vw"
                    className="h-full w-full object-cover"
                  />
                </figure>
              ))}
            </SnapRow>
          </div>
        </section>

        <ProgramBlock
          label={GUELIZ_PROGRAM.label}
          title={GUELIZ_PROGRAM.title}
          image={GUELIZ_PROGRAM.image}
          alt={GUELIZ_PROGRAM.alt}
          cta={{ ...GUELIZ_PROGRAM.cta }}
        >
          Sélectionné par Emara Estates,{' '}
          <EditorialLink href="/residences-honest-678/">Honest Signature 7 à Guéliz</EditorialLink>{' '}
          réunit des appartements neufs haut standing dans l&apos;un des quartiers les plus
          recherchés de Marrakech. La page programme permet de consulter les typologies, les
          informations clés et de demander les plans, prix et disponibilités.
        </ProgramBlock>

        <ShowApartmentTeaser
          titleId={GUELIZ_SHOW_APARTMENT.titleId}
          label={GUELIZ_SHOW_APARTMENT.label}
          title={GUELIZ_SHOW_APARTMENT.title}
          body={GUELIZ_SHOW_APARTMENT.body}
          image={GUELIZ_SHOW_APARTMENT.image}
          alt={GUELIZ_SHOW_APARTMENT.alt}
          buttons={[...GUELIZ_SHOW_APARTMENT.buttons]}
        />

        <ServicesGrid id="services" {...GUELIZ_SUPPORT} cards={[...GUELIZ_SUPPORT.cards]} />

        <SeoCta {...GUELIZ_CTA} buttons={[...GUELIZ_CTA.buttons]} />

        <SeoFaq
          label="Questions fréquentes"
          titleLines={['Appartement neuf', 'à Guéliz']}
          items={GUELIZ_FAQ}
        />
      </main>
    </>
  );
}
