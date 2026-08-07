import type { Metadata } from 'next';
import { EditorialLink } from '@/components/ui/Section';
import {
  PinnedBackground,
  PinnedPoints,
  ProgramBlock,
  SeoCta,
  SeoHero,
  ServicesGrid,
  SplitSticky,
  TextBlock,
} from '@/components/seo/SeoSections';
import { SeoFaq } from '@/components/seo/SeoFaq';
import {
  INVEST_ANALYSIS,
  INVEST_CTA,
  INVEST_FAQ,
  INVEST_GUELIZ,
  INVEST_HERO,
  INVEST_NEUF,
  INVEST_PROGRAM,
  INVEST_PRUDENCE,
  INVEST_SERVICES,
} from '@/lib/content/investissement';
import { landingJsonLd } from '@/lib/structured-data';

const TITLE = 'Investir à Marrakech | Appartements neufs à Guéliz';
const DESCRIPTION =
  'Étudiez votre projet immobilier à Marrakech avec Emara Estates : appartements neufs à Guéliz, typologies, prix et accompagnement personnalisé.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';
const CANONICAL = 'https://emaraestates.com/investissement-immobilier-marrakech';

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
  slug: 'investissement-immobilier-marrakech',
  name: TITLE,
  description: DESCRIPTION,
  breadcrumb: 'Investissement immobilier Marrakech',
});

export default function InvestissementImmobilierMarrakechPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SeoHero {...INVEST_HERO} />

      {/* The static build keeps the hero outside <main> on this page and opens
          the landmark on the first section; the port had dropped the landmark
          entirely, which also left the layout's skip link without a target. */}
      <main id="main-content">
        <SplitSticky
          label="Marché"
          title="Pourquoi Marrakech attire les investisseurs ?"
          image="/img/marrakech.webp"
          alt="Appartement neuf haut standing à Guéliz Marrakech"
        >
          Investir dans l&apos;immobilier à Marrakech demande de comparer l&apos;emplacement, le
          type de bien, le prix d&apos;acquisition, les charges, la demande locative et les
          conditions réelles du marché. À Guéliz, un{' '}
          <EditorialLink href="/appartement-neuf-gueliz-marrakech">
            appartement neuf à Guéliz
          </EditorialLink>{' '}
          peut constituer une opportunité patrimoniale à étudier, notamment lorsque le programme, la
          typologie et l&apos;accompagnement sont clairement présentés.
        </SplitSticky>

        <PinnedBackground
          ariaLabel={INVEST_ANALYSIS.ariaLabel}
          image={INVEST_ANALYSIS.image}
          alt={INVEST_ANALYSIS.alt}
          label={INVEST_ANALYSIS.label}
          title={INVEST_ANALYSIS.title}
          intro={INVEST_ANALYSIS.intro}
          cta={{ ...INVEST_ANALYSIS.cta }}
        >
          <PinnedPoints points={[...INVEST_ANALYSIS.points]} />
        </PinnedBackground>

        <SplitSticky
          label={INVEST_NEUF.label}
          title={INVEST_NEUF.title}
          image={INVEST_NEUF.image}
          alt={INVEST_NEUF.alt}
          flip
        >
          {INVEST_NEUF.body}
        </SplitSticky>

        <SplitSticky
          label={INVEST_GUELIZ.label}
          title={INVEST_GUELIZ.title}
          image={INVEST_GUELIZ.image}
          alt={INVEST_GUELIZ.alt}
        >
          {INVEST_GUELIZ.body}
        </SplitSticky>

        <ServicesGrid id="services" {...INVEST_SERVICES} cards={[...INVEST_SERVICES.cards]} />

        <ProgramBlock
          label={INVEST_PROGRAM.label}
          title={INVEST_PROGRAM.title}
          image={INVEST_PROGRAM.image}
          alt={INVEST_PROGRAM.alt}
          cta={{ ...INVEST_PROGRAM.cta }}
        >
          <EditorialLink href="/residences-honest-678/">Honest Signature 7</EditorialLink> peut
          intéresser des acheteurs qui recherchent un bien neuf dans un quartier central de
          Marrakech. Le potentiel dépend toujours de la typologie, du prix, de la gestion et des
          conditions réelles du marché.
        </ProgramBlock>

        <TextBlock label={INVEST_PRUDENCE.label} title={INVEST_PRUDENCE.title}>
          {INVEST_PRUDENCE.body}
        </TextBlock>

        <SeoCta {...INVEST_CTA} buttons={[...INVEST_CTA.buttons]} />

        <SeoFaq
          label="Questions fréquentes"
          titleLines={['Investissement', 'immobilier']}
          items={INVEST_FAQ}
        />
      </main>
    </>
  );
}
