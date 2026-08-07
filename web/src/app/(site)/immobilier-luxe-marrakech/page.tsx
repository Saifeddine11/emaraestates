import type { Metadata } from 'next';
import { EditorialLink } from '@/components/ui/Section';
import {
  PinnedBackground,
  SeoCta,
  SeoHero,
  ServicesGrid,
  SplitSticky,
} from '@/components/seo/SeoSections';
import { SeoFaq } from '@/components/seo/SeoFaq';
import {
  LUXE_CTA,
  LUXE_FAQ,
  LUXE_GUELIZ,
  LUXE_HERO,
  LUXE_PROGRAMS,
  LUXE_SERVICES,
} from '@/lib/content/luxe';
import { landingJsonLd } from '@/lib/structured-data';

const TITLE = 'Immobilier luxe Marrakech | Appartements neufs haut standing';
const DESCRIPTION =
  'Emara Estates sélectionne des appartements neufs haut standing à Marrakech : emplacements premium, programmes neufs, plans et accompagnement.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

/**
 * Canonical is unslashed, which is what `trailingSlash: false` emits, so the
 * metadata API can own it — no hand-written tags as on `/residences-honest-678/`.
 */
const CANONICAL = 'https://emaraestates.com/immobilier-luxe-marrakech';

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
  slug: 'immobilier-luxe-marrakech',
  name: TITLE,
  description: DESCRIPTION,
  breadcrumb: 'Immobilier luxe Marrakech',
});

export default function ImmobilierLuxeMarrakechPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SeoHero {...LUXE_HERO} />

      {/* The static build keeps the hero outside <main> on this page and opens
          the landmark on the first section; the port had dropped the landmark
          entirely, which also left the layout's skip link without a target. */}
      <main id="main-content">
        <SplitSticky
          label="Emara Estates"
          title="L'immobilier premium à Marrakech, avec une approche sélective"
          image="/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-02.webp"
          alt="Espace de vie d'un appartement haut standing à Guéliz Marrakech"
        >
          L&apos;immobilier de prestige à Marrakech ne se limite pas à l&apos;adresse : il repose
          aussi sur la qualité du programme, la clarté des informations, les typologies disponibles
          et la cohérence du projet. Emara Estates met en avant des{' '}
          <EditorialLink href="/appartement-neuf-gueliz-marrakech">
            programmes immobiliers neufs
          </EditorialLink>{' '}
          et haut standing, notamment à Guéliz, pour les acheteurs qui souhaitent habiter,{' '}
          <EditorialLink href="/investissement-immobilier-marrakech">
            investir à Marrakech
          </EditorialLink>{' '}
          ou préparer un pied-à-terre.
        </SplitSticky>

        <ServicesGrid id="services" {...LUXE_SERVICES} cards={[...LUXE_SERVICES.cards]} />

        <PinnedBackground
          ariaLabel={LUXE_PROGRAMS.ariaLabel}
          image={LUXE_PROGRAMS.image}
          alt={LUXE_PROGRAMS.alt}
          label={LUXE_PROGRAMS.label}
          title={LUXE_PROGRAMS.title}
          intro={LUXE_PROGRAMS.intro}
          cta={{ ...LUXE_PROGRAMS.cta }}
        >
          <div className="mt-7 border-l-2 border-bronze pl-5">
            <h3 className="font-serif text-[22px] font-normal text-cream">
              <EditorialLink href="/residences-honest-678/">Honest Signature 7</EditorialLink> à
              Guéliz
            </h3>
            <p className="mt-2 text-[16.5px] font-normal leading-[1.85] text-cream/75">
              {LUXE_PROGRAMS.program.body}
            </p>
          </div>
        </PinnedBackground>

        <SplitSticky
          label={LUXE_GUELIZ.label}
          title={LUXE_GUELIZ.title}
          image={LUXE_GUELIZ.image}
          alt={LUXE_GUELIZ.alt}
          flip
        >
          {LUXE_GUELIZ.body}
        </SplitSticky>

        <SeoCta {...LUXE_CTA} buttons={[...LUXE_CTA.buttons]} />

        <SeoFaq
          label="Questions fréquentes"
          titleLines={['Immobilier luxe', 'à Marrakech']}
          items={LUXE_FAQ}
        />
      </main>
    </>
  );
}
