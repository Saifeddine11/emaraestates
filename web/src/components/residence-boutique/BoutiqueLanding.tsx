import { MaskReveal } from '@/components/honest-7/Motion';
import { Picture } from '@/components/honest-7/Picture';
import { AmenityStory } from '@/components/residence-boutique/AmenityStory';
import { BoutiqueLeadForm, FORM_ANCHOR } from '@/components/residence-boutique/BoutiqueLeadForm';
import { BoutiqueTracking } from '@/components/residence-boutique/BoutiqueTracking';
import { CTA_DARK, CTA_GOLD, FormCta, SectionView, StickyFormCta } from '@/components/residence-boutique/FormCta';
import { HeroStage } from '@/components/residence-boutique/HeroStage';
import { LeadFormProvider } from '@/components/residence-boutique/LeadFormState';
import { PaymentTimeline } from '@/components/residence-boutique/PaymentTimeline';
import { ProofCarousel } from '@/components/residence-boutique/ProofCarousel';
import { Lines, Rise } from '@/components/residence-boutique/Reveal';
import {
  AMENITIES_LINE,
  AMENITY_CHIPS,
  AMENITY_SCENES,
  DELIVERED_RESIDENCES,
  FACTS,
  HERO_SIZES,
  HERO_SLIDES,
  MAP_IMAGE,
  REVEAL_IMAGE,
  TRUST_ITEMS,
} from '@/lib/content/residence-boutique';
import { CONTACT, WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

const EYEBROW = 'text-[13px] font-medium uppercase tracking-[0.2em]';
const H2 = 'font-sans font-medium uppercase tracking-[-0.035em]';
/** Appended after the size: tailwind-merge drops a leading that precedes a text-[…] size. */
const H2_LEADING = 'leading-[0.94]';
const SERIF = 'font-serif font-normal normal-case italic tracking-[-0.01em]';
const SHELL = 'mx-auto w-full max-w-[1400px] px-gutter';

/** "1ʳᵉ", "7ᵉ": typographic ordinals rather than Unicode modifier letters. */
function Ord({ n, suffix }: { n: number; suffix: string }) {
  return (
    <span className="whitespace-nowrap">
      {n}
      <span className="relative -top-[0.55em] ml-[0.02em] text-[0.46em] normal-case tracking-normal">{suffix}</span>
    </span>
  );
}

function SectionIndex({ index, label, dark = false }: { index: string; label: string; dark?: boolean }) {
  return (
    <p className={cn(EYEBROW, 'flex items-center gap-3', dark ? 'text-sand' : 'text-[#5b6a4c]')}>
      <span className="tabular-nums">{index}</span>
      <span aria-hidden="true" className={cn('h-px w-8', dark ? 'bg-sand/50' : 'bg-[#5b6a4c]/50')} />
      {label}
    </p>
  );
}

export function BoutiqueLanding() {
  return (
    <LeadFormProvider>
      <BoutiqueTracking />
      <Header />

      <main id="main-content">
        <Hero />
        <TrustBar />
        <Desire />
        <Location />
        <Proof />
        <Payment />
        <Fomo />
        <FinalForm />
      </main>

      <Footer />
      <StickyFormCta />
    </LeadFormProvider>
  );
}

/* ── Header: logo, one signal, one CTA — no navigation to leave by. ─────── */

function Header() {
  return (
    <header className="relative z-50 border-b border-forest/8 bg-shell/90 backdrop-blur-md lg:sticky lg:top-0">
      <div className={cn(SHELL, 'flex h-16 items-center justify-between gap-4 lg:h-[72px]')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; 320px WebP (~6 KB) of /logo-emara-forest.png */}
        <img src="/media/honest-7/logo-emara-forest-320.webp" alt="Emara Estates" width={320} height={180} className="h-9 w-auto lg:h-11" />
        <p className="hidden items-center gap-3 text-[13px] font-medium uppercase tracking-[0.18em] text-forest/70 md:flex">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-olive motion-safe:animate-[rb-ping-once_1.6s_var(--ease-premium)_1.2s_both]" />
            <span className="relative size-2 rounded-full bg-olive" />
          </span>
          Honest Signature 7 <span aria-hidden="true" className="text-forest/30">/</span> Guéliz hyper-centre
        </p>
        <FormCta
          event="hero_cta_click"
          location="header"
          className="group/cta inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-colors duration-300 hover:bg-[#243024] sm:px-5"
        >
          <span className="sm:hidden">Disponibilités</span>
          <span className="hidden sm:inline">Voir les disponibilités</span>
        </FormCta>
      </div>
    </header>
  );
}

/* ── 1. Hero ─────────────────────────────────────────────────────────────
   Mobile order: eyebrow, headline, image, location + price, amenities, form.
   Desktop: headline, amenities + price and the image on the left; the form
   on the right, visible without scrolling. The headline and its annotations
   animate with CSS only, so they paint before any JavaScript runs. */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip bg-shell">
      <div className={cn(SHELL, 'grid gap-8 pb-10 pt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(400px,0.9fr)] lg:gap-[clamp(32px,4vw,72px)] lg:pb-14 lg:pt-8')}>
        <div className="flex min-w-0 flex-col">
          <div className="rb-in order-1 flex items-center justify-between gap-4 [animation-delay:0ms]">
            <p className={cn(EYEBROW, 'flex items-center gap-2.5 text-forest')}>
              <span className="rounded-full bg-forest px-2.5 py-1 text-[12.5px] tracking-[0.16em] text-cream">Nouveau</span>
              Guéliz hyper-centre
            </p>
            <p className={cn(EYEBROW, 'hidden tabular-nums text-forest/60 xl:block')}>Honest Signature 7</p>
          </div>

          <h1
            id="hero-title"
            className="order-2 mt-5 font-sans text-[clamp(31px,9.3vw,50px)] font-medium uppercase leading-[0.93] tracking-[-0.04em] text-forest lg:mt-7 lg:text-[clamp(50px,5vw,82px)]"
          >
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="rb-line block [animation-delay:100ms]">
                La <Ord n={1} suffix="re" /> résidence
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.2em]">
              <span className="rb-line block [animation-delay:220ms]">
                <span className="relative inline-block">
                  <span className={cn(SERIF, 'text-[1.2em] leading-[0.8]')}>Boutique</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 300 18"
                    preserveAspectRatio="none"
                    className="absolute -bottom-[0.14em] left-[2%] h-[0.2em] w-[98%] overflow-visible text-bronze"
                  >
                    <path
                      d="M3 12.5C58 6.8 118 4.6 178 5.4c42 .5 82 2.7 118 6.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      pathLength={1}
                      className="rb-draw [animation-delay:500ms]"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline"> à Guéliz</span>
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.18em]">
              <span className="rb-line block [animation-delay:320ms]">
                <span className="lg:hidden">À Guéliz </span>
                <span className="relative inline-block whitespace-nowrap">
                  Hyper-centre
                  {/* A dimension line: precise ticks, drawn left to right. */}
                  <span aria-hidden="true" className="rb-rule absolute -bottom-[0.1em] left-0 right-0 flex h-[0.12em] items-center [animation-delay:650ms]">
                    <span className="h-full w-[2px] bg-olive" />
                    <span className="h-[2px] flex-1 bg-olive" />
                    <span className="h-full w-[2px] bg-olive" />
                  </span>
                </span>
                {'.'}
              </span>
            </span>
          </h1>

          {/* Supporting facts — after the image on phones, before it from lg. */}
          <div className="order-4 mt-5 lg:order-3 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
            <div className="rb-in hidden [animation-delay:800ms] lg:block">
              <p className="text-[17px] leading-[1.5] text-forest/75 xl:text-[18px]">{AMENITIES_LINE}</p>
              <p className={cn(SERIF, 'mt-1 text-[26px] leading-tight text-forest xl:text-[28px]')}>Pas dans un hôtel. Chez vous.</p>
            </div>

            <div className="flex items-end justify-between gap-4 border-y border-forest/10 py-3.5 lg:hidden">
              <p className="rb-in flex items-center gap-2 text-[13.5px] font-medium uppercase leading-tight tracking-[0.12em] text-forest [animation-delay:950ms]">
                <PinPulse />
                <span>
                  À 1 min à pied
                  <br />
                  du Plaza
                </span>
              </p>
              <PriceTag />
            </div>
            <div className="hidden lg:block">
              <PriceTag />
            </div>

            <ul aria-label="Équipements de la résidence" className="rb-in -mx-gutter mt-3.5 flex gap-1.5 overflow-x-auto px-gutter [animation-delay:800ms] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
              {AMENITY_CHIPS.map((chip) => (
                <li key={chip} className="shrink-0 whitespace-nowrap rounded-full border border-forest/12 bg-white/60 px-3 py-1.5 text-[13.5px] font-medium text-forest/85">
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-3 mt-6 lg:order-4 lg:mt-8">
            <div className="relative h-[clamp(190px,52vw,380px)] lg:h-[clamp(280px,calc(100svh-560px),460px)]">
              <HeroStage slides={HERO_SLIDES} sizes={HERO_SIZES} className="size-full" />
              <p className="rb-in pointer-events-none absolute left-4 top-4 z-50 hidden items-center gap-2 rounded-full bg-shell/92 py-2 pl-3 pr-4 text-[13px] font-medium uppercase tracking-[0.14em] text-forest shadow-[0_10px_24px_-14px_rgba(0,0,0,0.5)] backdrop-blur [animation-delay:950ms] lg:flex">
                <PinPulse />
                <span aria-hidden="true">→</span> À 1 min à pied du Plaza
              </p>
            </div>
          </div>
        </div>

        {/* The form: beside the headline from lg, right after the hook on phones. */}
        <div className="min-w-0 lg:pt-1">
          <p className="rb-in mb-3 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.2em] text-forest/70 [animation-delay:1100ms]">
            <span aria-hidden="true" className="inline-block text-bronze motion-safe:animate-[rb-nudge-down_0.9s_var(--ease-step)_1.4s_both]">
              ↓
            </span>
            Disponibilités actuelles
          </p>
          <div id={FORM_ANCHOR} className="scroll-mt-24">
            <BoutiqueLeadForm
              placement="hero"
              title="Trouvez votre appartement"
              subtitle="Répondez à 2 questions pour voir les options correspondant à votre recherche."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceTag() {
  return (
    <p className="rb-in shrink-0 text-right [animation-delay:1100ms] lg:text-left">
      <span className="block text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#5b6a4c] lg:text-[13px]">À partir de</span>
      <span className="mt-1 block whitespace-nowrap font-sans text-[26px] font-normal leading-none tracking-[-0.03em] text-forest tabular-nums lg:text-[clamp(30px,2.6vw,40px)]">
        {FACTS.priceFromNumber}
        <span className="ml-1.5 text-[0.5em] font-medium tracking-[0.04em]">MAD</span>
      </span>
    </p>
  );
}

function PinPulse() {
  return (
    <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
      <span className="absolute inset-0 rounded-full bg-bronze motion-safe:animate-[rb-ping-once_1.6s_var(--ease-premium)_1.3s_both]" />
      <span className="relative size-2.5 rounded-full bg-bronze" />
    </span>
  );
}

/* ── Trust bar ───────────────────────────────────────────────────────────── */

function TrustBar() {
  const items = TRUST_ITEMS.map((item) => (
    <li key={item} className="flex shrink-0 items-center gap-5 whitespace-nowrap text-[13.5px] font-medium uppercase tracking-[0.16em] text-cream sm:text-[14px]">
      {item}
      <span aria-hidden="true" className="size-1.5 rotate-45 bg-gold/80" />
    </li>
  ));
  return (
    <section aria-label="Repères" className="overflow-hidden bg-forest py-4 lg:py-5">
      {/* Desktop: static, evenly spread. */}
      <ul className={cn(SHELL, 'hidden items-center justify-between gap-6 lg:flex [&>li:last-child>span]:hidden')}>{items}</ul>
      {/* Phones: a slow drift (40 s a loop), a plain grid for reduced motion. */}
      <div className="lg:hidden motion-reduce:hidden">
        <div className="flex w-max animate-[rb-marquee_40s_linear_infinite] gap-5">
          <ul className="flex gap-5">{items}</ul>
          <ul aria-hidden="true" className="flex gap-5">
            {items}
          </ul>
        </div>
      </div>
      <ul className="hidden grid-cols-2 gap-x-4 gap-y-2 px-gutter motion-reduce:grid lg:motion-reduce:hidden [&>li>span]:hidden">
        {items}
      </ul>
    </section>
  );
}

/* ── 2. Desire ───────────────────────────────────────────────────────────── */

function Desire() {
  return (
    <SectionView event="amenities_section_view" id="espaces" labelledBy="desire-title" className="overflow-x-clip bg-shell py-band">
      <div className={SHELL}>
        <SectionIndex index="01" label="Résidence boutique" />
        <h2 id="desire-title" className={cn(H2, 'mt-6 text-[clamp(44px,10.5vw,148px)] text-forest', H2_LEADING)}>
          <Lines lines={['Pas dans un hôtel.', <span key="chez" className={cn(SERIF, 'text-[1.08em] text-olive')}>Chez vous.</span>]} />
        </h2>
        <Rise className="mt-6 max-w-[520px] lg:mt-8">
          <p className="text-[18px] leading-[1.55] text-forest/70">
            Deux piscines, un spa, un jacuzzi, un sauna, une salle de sport et un cinéma extérieur. Dans votre résidence.
          </p>
        </Rise>

        <div className="mt-10 lg:mt-4">
          <AmenityStory scenes={AMENITY_SCENES} />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-forest/10 pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-4">
          <p className="text-[15px] text-forest/75">
            + Parking titré. <span className="text-forest/75">Visuels d’ambiance du projet, non contractuels.</span>
          </p>
          <FormCta location="amenities" className={cn(CTA_DARK, 'w-full sm:w-auto')}>Voir les appartements disponibles</FormCta>
        </div>
      </div>
    </SectionView>
  );
}

/* ── 3. Location ─────────────────────────────────────────────────────────── */

function Location() {
  return (
    <section id="localisation" aria-labelledby="location-title" className="overflow-x-clip bg-forest py-band text-cream">
      <div className={cn(SHELL, 'grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[clamp(40px,6vw,104px)]')}>
        <div>
          <SectionIndex index="02" label="Guéliz hyper-centre" dark />
          <h2 id="location-title" className={cn(H2, 'mt-6 text-[clamp(38px,6.4vw,92px)]', H2_LEADING)}>
            <Lines lines={['Pas « près de Guéliz ».', <span key="a" className={cn(SERIF, 'text-[1.1em] text-gold')}>À Guéliz.</span>]} />
          </h2>

          <Rise className="mt-10 border-t border-cream/15 pt-8 lg:mt-14">
            <p className="flex items-end gap-5">
              <span className="font-sans text-[clamp(150px,30vw,300px)] font-extralight leading-[0.72] tracking-[-0.08em] text-cream">1</span>
              <span className="pb-[0.4em]">
                <span className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.2em] text-gold">
                  <span aria-hidden="true">→</span> 1 min
                </span>
                <span className="mt-2 block font-sans text-[clamp(30px,3.4vw,48px)] font-medium uppercase leading-[0.95] tracking-[-0.03em]">Minute</span>
                <span className={cn(SERIF, 'mt-1 block text-[clamp(22px,2.2vw,30px)] leading-tight text-cream/80')}>à pied du Plaza.</span>
              </span>
            </p>
          </Rise>
          <div className="mt-10">
            <FormCta location="location" className={cn(CTA_GOLD, 'w-full sm:w-auto')}>
              Voir les prix et plans
            </FormCta>
          </div>
        </div>

        <MaskReveal className="relative overflow-hidden rounded-[24px]">
          <div className="aspect-[4/3] bg-[#1f291f] lg:aspect-[1.15]">
            <Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 52vw, 100vw" className="object-[34%_40%]" />
          </div>
          <p className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-shell/95 px-3.5 py-2 text-[13px] font-medium uppercase tracking-[0.14em] text-forest">
            <PinPulse /> <span className="hidden sm:inline">Honest Signature 7</span> <span aria-hidden="true">→</span> Plaza : 1 min
          </p>
        </MaskReveal>
      </div>
    </section>
  );
}

/* ── 4. Proof ────────────────────────────────────────────────────────────── */

function Proof() {
  const slides = [
    ...DELIVERED_RESIDENCES.map((residence, index) => ({
      key: residence.name,
      content: (
        <figure className="m-0">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/40 lg:aspect-[16/10]">
            <Picture
              picture={residence.picture}
              sizes="(min-width: 1024px) 58vw, (min-width: 641px) 64vw, 84vw"
              className="pointer-events-none transition-transform duration-[1200ms] ease-premium group-hover:scale-[1.025]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-shell/92 px-3 py-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-forest">
              Livrée
            </span>
          </div>
          <figcaption className="mt-4 flex items-baseline gap-4">
            <span className="text-[14px] font-medium tabular-nums tracking-[0.16em] text-[#5b6a4c]">0{index + 1}</span>
            <span className="font-sans text-[22px] font-medium uppercase tracking-[-0.02em] text-forest"><span className="hidden sm:inline">Résidence </span>{residence.name}</span>
            <span className="ml-auto hidden text-[14px] text-forest/70 sm:inline">Marrakech</span>
          </figcaption>
        </figure>
      ),
    })),
    {
      key: 'hs7',
      content: (
        <figure className="m-0">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-[20px] bg-forest lg:aspect-[16/10]">
            <Picture
              picture={REVEAL_IMAGE}
              sizes="(min-width: 1024px) 58vw, (min-width: 641px) 64vw, 84vw"
              className="pointer-events-none object-[50%_60%] transition-transform duration-[1200ms] ease-premium group-hover:scale-[1.025]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-forest">
              La <Ord n={7} suffix="e" /> · Livraison {FACTS.delivery.toLowerCase()}
            </span>
          </div>
          <figcaption className="mt-4 flex items-baseline gap-4">
            <span className="text-[14px] font-medium tabular-nums tracking-[0.16em] text-bronze">07</span>
            <span className="font-sans text-[22px] font-medium uppercase tracking-[-0.02em] text-forest">Honest Signature 7</span>
            <span className="ml-auto text-[14px] text-forest/70">Guéliz</span>
          </figcaption>
        </figure>
      ),
    },
  ];

  return (
    <section id="realisations" aria-labelledby="proof-title" className="overflow-x-clip bg-cream py-band">
      <div className={SHELL}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end lg:gap-16">
          <div>
            <SectionIndex index="03" label="Le promoteur" />
            <h2 id="proof-title" className={cn(H2, 'mt-6 text-[clamp(38px,6.2vw,92px)] text-forest', H2_LEADING)}>
              <Lines
                lines={[
                  `${FACTS.deliveredCount} résidences déjà livrées.`,
                  <span key="7" className={cn(SERIF, 'text-[1.1em] text-olive')}>
                    Voici la <Ord n={7} suffix="e" />.
                  </span>,
                ]}
              />
            </h2>
          </div>
          <Rise>
            <p className="max-w-[420px] text-[18px] leading-[1.55] text-forest/80">
              Honest Signature 7 est la <Ord n={7} suffix="e" /> résidence du même promoteur. Les six précédentes sont déjà livrées.
            </p>
          </Rise>
        </div>

        <div className="mt-10 lg:mt-14">
          <ProofCarousel label="Résidences Honest déjà livrées, puis Honest Signature 7" slides={slides} />
        </div>
      </div>
    </section>
  );
}

/* ── 5. Payment ──────────────────────────────────────────────────────────── */

function Payment() {
  return (
    <SectionView event="payment_section_view" id="paiement" labelledBy="payment-title" className="bg-shell py-band">
      <div className={SHELL}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end lg:gap-16">
          <div>
            <SectionIndex index="04" label="Paiement progressif" />
            <h2 id="payment-title" className={cn(H2, 'mt-6 text-[clamp(38px,6.2vw,92px)] text-forest', H2_LEADING)}>
              <Lines lines={['Réservez aujourd’hui.', <span key="p" className={cn(SERIF, 'text-[1.1em] text-olive')}>Payez progressivement.</span>]} />
            </h2>
          </div>
          <Rise>
            <p className="max-w-[420px] text-[18px] leading-[1.55] text-forest/80">
              30 % pour réserver, trois échéances de 15 %, le solde de 25 % à la remise des clés.
            </p>
          </Rise>
        </div>

        <div className="mt-14 lg:mt-20">
          <PaymentTimeline />
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-forest/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[16px] text-forest/70">
            Livraison prévue : <span className="font-medium text-forest">{FACTS.delivery.toLowerCase()}</span>
          </p>
          <FormCta location="payment" className={cn(CTA_DARK, 'w-full sm:w-auto')}>Voir les options pour mon budget</FormCta>
        </div>
      </div>
    </SectionView>
  );
}

/* ── 6. FOMO — real urgency, no invented numbers. ───────────────────────── */

const CHOICES = [
  { title: 'Étage', glyph: 'floor' },
  { title: 'Orientation', glyph: 'compass' },
  { title: 'Surface', glyph: 'area' },
  { title: 'Configuration', glyph: 'plan' },
] as const;

function Fomo() {
  return (
    <section id="choix" aria-labelledby="fomo-title" className="overflow-x-clip bg-forest py-band text-cream">
      <div className={SHELL}>
        <SectionIndex index="05" label="Disponibilités" dark />
        <h2 id="fomo-title" className={cn(H2, 'mt-6 text-[clamp(38px,6.6vw,100px)]', H2_LEADING)}>
          <Lines lines={['Vous pouvez encore choisir.', <span key="m" className={cn(SERIF, 'text-[1.1em] text-gold')}>Mais pas indéfiniment.</span>]} />
        </h2>

        <ul className="mt-12 grid grid-cols-2 border-t border-cream/15 lg:mt-16 lg:grid-cols-4">
          {CHOICES.map((choice, index) => (
            <li key={choice.title} className="border-b border-cream/15 py-6 pr-4 odd:border-r odd:pr-4 lg:border-b-0 lg:border-r lg:px-6 lg:py-8 lg:first:pl-0 lg:last:border-r-0 [&:nth-child(even)]:pl-4 lg:[&:nth-child(even)]:pl-6">
              <Rise delay={index * 0.08}>
                <ChoiceGlyph kind={choice.glyph} />
                <p className="mt-5 font-sans text-[clamp(22px,2.4vw,34px)] font-medium uppercase leading-none tracking-[-0.02em]">{choice.title}.</p>
              </Rise>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col gap-8 lg:mt-16 lg:flex-row lg:items-end lg:justify-between">
          <Rise>
            <p className={cn(SERIF, 'max-w-[620px] text-[clamp(26px,2.8vw,40px)] leading-[1.15] text-cream')}>
              Chaque réservation réduit le choix disponible.
            </p>
          </Rise>
          <FormCta location="fomo" className={cn(CTA_GOLD, 'w-full sm:w-auto')} nudge>
            Voir ce qui est encore disponible
          </FormCta>
        </div>
      </div>
    </section>
  );
}

function ChoiceGlyph({ kind }: { kind: (typeof CHOICES)[number]['glyph'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-11 text-gold">
      {kind === 'floor' && (
        <g {...common}>
          <path d="M8 40h32M8 32h32M8 24h32M8 16h32M8 8h32" opacity=".35" />
          <path d="M8 24h32" strokeWidth="2.4" opacity="1" />
        </g>
      )}
      {kind === 'compass' && (
        <g {...common}>
          <circle cx="24" cy="24" r="16" opacity=".35" />
          <path d="M24 12l4 12-4 12-4-12z" />
          <path d="M24 4v4" />
        </g>
      )}
      {kind === 'area' && (
        <g {...common}>
          <rect x="10" y="10" width="28" height="28" opacity=".35" />
          <path d="M10 44h28M10 42v4M38 42v4M44 10v28M42 10h4M42 38h4" />
        </g>
      )}
      {kind === 'plan' && (
        <g {...common}>
          <rect x="6" y="10" width="36" height="28" opacity=".35" />
          <path d="M24 10v28M24 24h18M14 38v-6" />
        </g>
      )}
    </svg>
  );
}

/* ── 7. The second form ─────────────────────────────────────────────────── */

function FinalForm() {
  return (
    <section id="votre-appartement" aria-labelledby="final-title" className="bg-cream py-band">
      <div className={cn(SHELL, 'grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] lg:gap-[clamp(48px,6vw,112px)]')}>
        <div className="lg:sticky lg:top-28">
          <SectionIndex index="06" label="Votre appartement" />
          <h2 id="final-title" className={cn(H2, 'mt-6 text-balance text-[clamp(36px,5vw,76px)] text-forest', H2_LEADING)}>
            Quel appartement correspond à votre <span className={cn(SERIF, 'text-[1.1em] text-olive')}>budget&nbsp;?</span>
          </h2>
          <p className="mt-6 max-w-[460px] text-[18px] leading-[1.55] text-forest/80">
            Deux réponses suffisent. Un conseiller vous transmet ensuite ce qui est encore disponible pour vous.
          </p>
          <ol className="mt-10 hidden max-w-[460px] border-t border-forest/12 lg:block">
            {['Plans', 'Prix', 'Surfaces', 'Étages', 'Disponibilités'].map((item, index) => (
              <li key={item} className="flex items-baseline gap-5 border-b border-forest/12 py-3.5">
                <span className="text-[13px] font-medium tabular-nums tracking-[0.16em] text-[#5b6a4c]">0{index + 1}</span>
                <span className="text-[18px] font-medium uppercase tracking-[0.02em] text-forest">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <BoutiqueLeadForm
          placement="final"
          headingLevel="h3"
          title="Trouvez votre appartement"
          subtitle="Répondez à 2 questions pour voir les options correspondant à votre recherche."
        />
      </div>
    </section>
  );
}

/* ── Footer: contact and legal only. ─────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-forest pb-32 pt-12 text-cream/80 lg:pb-12">
      <div className={cn(SHELL, 'grid gap-8 text-[15px] leading-[1.6] md:grid-cols-[1.2fr_1fr_1.4fr]')}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, live /img asset */}
          <img src="/img/logo.webp" alt="Emara Estates" width={1250} height={625} loading="lazy" className="h-12 w-auto" />
          <p className="mt-4 max-w-[300px] text-cream/75">Commercialisation de Honest Signature 7, Guéliz, Marrakech.</p>
        </div>
        <address className="not-italic">
          <a href={`tel:${CONTACT.phoneDisplay.replace(/\s/g, '')}`} className="block min-h-11 py-2.5 text-cream hover:underline">
            {CONTACT.phoneDisplay}
          </a>
          <a href={`mailto:${CONTACT.email}`} className="block min-h-11 py-2.5 text-cream hover:underline">
            {CONTACT.email}
          </a>
          <a href={WHATSAPP.bare} target="_blank" rel="noopener noreferrer" className="block min-h-11 py-2.5 text-cream hover:underline">
            WhatsApp <span aria-hidden="true">↗</span>
          </a>
          <p className="mt-2 text-cream/75">
            {CONTACT.addressLine1} {CONTACT.addressLine2}
          </p>
        </address>
        <div className="text-[14px] text-cream/75">
          <p>
            Données personnelles : vos coordonnées servent uniquement à vous recontacter au sujet de ce projet. Conformément à la
            loi 09-08, vous pouvez y accéder, les rectifier ou vous opposer à leur traitement en écrivant à {CONTACT.email}.
          </p>
          <p className="mt-3">Prix « à partir de », selon disponibilités. Visuels d’ambiance non contractuels.</p>
          <p className="mt-3">© 2026 Emara Estates</p>
        </div>
      </div>
    </footer>
  );
}
