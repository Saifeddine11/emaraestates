import { FadeIn } from '@/components/appartements-temoins/FadeIn';
import {
  CTA_PRIMARY,
  CTA_PRIMARY_ON_DARK,
  DossierCta,
  StickyDossierCta,
  TEXT_LINK,
} from '@/components/honest-7/DossierCta';
import { DossierLeadForm } from '@/components/honest-7/DossierLeadForm';
import { LandingTracking } from '@/components/honest-7/LandingTracking';
import { MaskReveal, Parallax, PaymentBar } from '@/components/honest-7/Motion';
import { Picture } from '@/components/honest-7/Picture';
import { Rail } from '@/components/honest-7/Rail';
import {
  AMENITY_LIST,
  AMENITY_VISUALS,
  APARTMENT_VISUALS,
  DELIVERED_COUNT,
  DELIVERED_RESIDENCES,
  FACTS,
  HERO_IMAGE,
  HERO_SIZES,
  MAP_IMAGE,
  PAYMENT_PLAN,
  REVEAL_IMAGE,
} from '@/lib/content/honest-signature-7';
import { EXTERNAL } from '@/lib/site';
import { cn } from '@/lib/cn';

export const HERO_ID = 'la-7e';

const EYEBROW = 'text-[13px] font-medium uppercase tracking-[0.2em] text-olive';
const EYEBROW_DARK = 'text-[13px] font-medium uppercase tracking-[0.2em] text-sand';
const H2 =
  'text-balance font-sans text-[clamp(34px,5vw,64px)] font-medium leading-[1.04] tracking-[-0.035em] text-forest';
const H2_DARK =
  'text-balance font-sans text-[clamp(34px,5vw,64px)] font-medium leading-[1.04] tracking-[-0.035em] text-cream';
const LEAD = 'text-[clamp(17px,1.4vw,20px)] leading-[1.6] text-forest/70';
const NOTE = 'text-[13.5px] leading-relaxed text-forest/50';

/** "7e" set as an editorial numeral: serif italic, raised "e". */
function Seventh({ className }: { className?: string }) {
  return (
    <span className={cn('whitespace-nowrap font-sans font-medium', className)}>
      7<span className="relative -top-[0.62em] ml-[0.03em] text-[0.52em]">e</span>
    </span>
  );
}

export function Honest7Landing() {
  return (
    <>
      <LandingTracking />

      {/* 1 — Hero: the ad, continued. Mobile: building under the transparent
          header, then the headline. Desktop: a forest band carries the header,
          text left, building right. The image is the LCP element and is
          preloaded by the page. */}
      <section id={HERO_ID} aria-labelledby="hero-title" className="relative bg-shell">
        <div aria-hidden="true" className="hidden h-[88px] bg-forest lg:block" />
        <div className="lg:grid lg:min-h-[min(calc(100svh-88px),860px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="relative h-[clamp(220px,38svh,440px)] overflow-hidden bg-forest lg:order-last lg:h-auto">
            <Picture
              picture={HERO_IMAGE}
              sizes={HERO_SIZES}
              priority
              className="object-[50%_42%] motion-safe:animate-[hs7-settle_1.8s_cubic-bezier(0.23,1,0.32,1)_both]"
            />
          </div>

          <div className="flex flex-col justify-center px-gutter pb-9 pt-6 sm:pb-12 sm:pt-10 lg:py-16 lg:pl-[clamp(40px,6vw,104px)] lg:pr-[clamp(32px,4vw,64px)]">
            <p className={cn(EYEBROW, 'hidden lg:block')}>Honest Signature 7 · Guéliz, Marrakech</p>
            <h1
              id="hero-title"
              className="font-sans text-[clamp(34px,9.2vw,46px)] font-medium leading-[1.02] tracking-[-0.04em] text-forest lg:mt-6 lg:text-[clamp(52px,5.2vw,84px)]"
            >
              <span className="block">{DELIVERED_COUNT} résidences livrées.</span>
              <span className="block">
                La <Seventh className="text-olive" /> prend forme à Guéliz.
              </span>
            </h1>
            <p className="mt-3 text-[14px] font-medium tracking-[0.02em] text-forest/60 sm:text-[15px] lg:mt-6">
              Guéliz · dès {FACTS.surfaceFrom} · dès {FACTS.priceFromShort} · livraison {FACTS.delivery}
            </p>
            <p className="mt-4 max-w-[520px] text-[17px] leading-[1.5] text-forest/80 sm:text-[19px] lg:mt-7 lg:text-[21px]">
              Découvrez Honest Signature 7, à 1 minute à pied du Plaza.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-7 lg:mt-10">
              <DossierCta />
              <a href="#realisations" className={cn(TEXT_LINK, 'justify-center no-underline sm:justify-start')}>
                Découvrir le projet <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Proof before the pitch. */}
      <section id="realisations" aria-labelledby="proof-title" className="overflow-x-clip bg-cream px-gutter py-[clamp(72px,10vw,140px)]">
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
            <div>
              <p className={EYEBROW}>Nos réalisations</p>
              <h2 id="proof-title" className={cn(H2, 'mt-4')}>
                Avant la <Seventh className="text-olive" />, il y en a eu {DELIVERED_COUNT}.
              </h2>
            </div>
            <p className={cn(LEAD, 'max-w-[460px]')}>
              Un historique visible.
              <br />
              Des résidences que l’on peut déjà voir aujourd’hui.
            </p>
          </FadeIn>

          <div className="mt-10 lg:mt-14">
            <Rail label="Résidences Honest déjà livrées" itemClassName="w-[84vw] sm:w-[62vw] lg:w-[46vw] lg:max-w-[720px]">
              {DELIVERED_RESIDENCES.map((residence) => (
                <figure key={residence.name} className="m-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/40 lg:aspect-[3/2]">
                    <Picture picture={residence.picture} sizes="(min-width: 1024px) 46vw, (min-width: 641px) 62vw, 84vw" />
                  </div>
                  <figcaption className="mt-4 flex items-baseline justify-between gap-4">
                    <span className="font-sans text-[19px] font-medium tracking-[-0.02em] text-forest">{residence.name}</span>
                    <span className="text-[14px] text-forest/55">Guéliz · Livrée</span>
                  </figcaption>
                </figure>
              ))}
            </Rail>
          </div>

          <div className="mt-10 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-8">
            <DossierCta />
            <DossierCta visit className={cn(TEXT_LINK, 'justify-center sm:justify-start')}>
              Organiser une visite
            </DossierCta>
          </div>
        </div>
      </section>

      {/* 3 — Honest Signature 7, revealed. */}
      <section id="projet" aria-labelledby="project-title" className="bg-forest py-[clamp(72px,10vw,140px)] text-cream">
        <FadeIn className="mx-auto w-full max-w-[1320px] px-gutter">
          <p className={EYEBROW_DARK}>Honest Signature 7</p>
          <h2 id="project-title" className={cn(H2_DARK, 'mt-4 max-w-[900px]')}>
            La <Seventh className="text-gold" /> s’installe au cœur de Guéliz.
          </h2>
          <p className="mt-5 max-w-[560px] text-[clamp(17px,1.4vw,20px)] leading-[1.6] text-cream/75">
            Une résidence neuve à quelques pas du Plaza.
          </p>
        </FadeIn>

        <MaskReveal className="mx-auto mt-10 w-full max-w-[1480px] overflow-hidden lg:mt-16 lg:px-gutter">
          <Parallax className="aspect-[1.08] overflow-hidden bg-[#1f291f] sm:aspect-[1.35] lg:aspect-[1.75] lg:rounded-[28px]">
            <Picture picture={REVEAL_IMAGE} sizes="(min-width: 1480px) 1400px, 100vw" className="object-[50%_60%]" />
          </Parallax>
        </MaskReveal>

        <div className="mx-auto w-full max-w-[1320px] px-gutter">
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-cream/15 pt-8 lg:mt-14 lg:grid-cols-4 lg:gap-0 lg:pt-10">
            {[
              { label: 'Surfaces', value: FACTS.surfaces },
              { label: 'Prix', value: `À partir de ${FACTS.priceFrom}` },
              { label: 'Prix au m²', value: FACTS.pricePerSqm },
              { label: 'Livraison', value: `Juin 2028` },
            ].map((fact) => (
              <div key={fact.label} className="min-w-0 lg:border-l lg:border-cream/15 lg:px-8 lg:first:border-0 lg:first:pl-0">
                <dt className="text-[13px] font-medium uppercase tracking-[0.18em] text-sand">{fact.label}</dt>
                <dd className="mt-2 text-balance font-sans text-[clamp(19px,1.9vw,26px)] font-medium leading-[1.2] tracking-[-0.02em] text-cream">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-8 lg:mt-14">
            <DossierCta className={CTA_PRIMARY_ON_DARK} />
            <a
              href="#appartements"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 text-[15px] font-medium text-cream underline decoration-cream/30 underline-offset-[6px] transition-colors duration-300 hover:decoration-cream sm:justify-start"
            >
              Voir les appartements
            </a>
          </div>
        </div>
      </section>

      {/* 4 — Location: one verified number, stated large. */}
      <section id="localisation" aria-labelledby="location-title" className="bg-shell px-gutter py-[clamp(72px,10vw,140px)]">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <FadeIn>
            <p className={EYEBROW}>Localisation</p>
            <h2 id="location-title" className={cn(H2, 'mt-4')}>
              Au cœur de Guéliz.
              <br />
              Tout est à quelques pas.
            </h2>
            <p className="mt-10 flex items-baseline gap-4 border-t border-forest/12 pt-8">
              <span className="font-sans text-[clamp(64px,10vw,128px)] font-light leading-[0.85] tracking-[-0.06em] text-forest">1</span>
              <span className="text-[clamp(20px,2vw,28px)] font-medium leading-[1.15] tracking-[-0.02em] text-forest">
                minute à pied
                <br />
                du Plaza
              </span>
            </p>
            <ul className="mt-8 grid gap-0 border-t border-forest/12">
              {['Carré Eden à proximité', 'Cafés & restaurants', 'Boutiques & services'].map((item) => (
                <li key={item} className="border-b border-forest/12 py-4 text-[17px] text-forest/80">
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          <MaskReveal className="overflow-hidden rounded-[24px]">
            <div className="aspect-square bg-forest sm:aspect-[4/3] lg:aspect-[1.2]">
              <Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 54vw, 100vw" className="object-[42%_40%] sm:object-center" />
            </div>
          </MaskReveal>
        </div>
      </section>

      {/* 5 — Lifestyle: real project visuals, one amenity each; the full
          list follows as text so nothing is shown under the wrong name. */}
      <section id="art-de-vivre" aria-labelledby="lifestyle-title" className="overflow-x-clip bg-cream px-gutter py-[clamp(72px,10vw,140px)]">
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW}>Les espaces de la résidence</p>
            <h2 id="lifestyle-title" className={cn(H2, 'mt-4')}>
              Bien plus qu’une résidence.
              <br />
              Un art de vivre.
            </h2>
          </FadeIn>

          <div className="mt-10 lg:mt-14">
            <Rail label="Espaces de la résidence Honest Signature 7" itemClassName="w-[76vw] sm:w-[46vw] lg:w-[30vw] lg:max-w-[440px]">
              {AMENITY_VISUALS.map((amenity) => (
                <figure key={amenity.title} className="m-0">
                  <div className="aspect-[4/5] overflow-hidden rounded-[20px] bg-sand/40">
                    <Picture
                      picture={amenity.picture}
                      sizes="(min-width: 1024px) 30vw, (min-width: 641px) 46vw, 76vw"
                      className="transition-transform duration-[1.2s] ease-premium hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-4 font-sans text-[19px] font-medium tracking-[-0.02em] text-forest">
                    {amenity.title}
                  </figcaption>
                </figure>
              ))}
            </Rail>
          </div>

          <ul className="mt-12 grid grid-cols-1 border-t border-forest/12 xs:grid-cols-2 lg:grid-cols-4">
            {AMENITY_LIST.map((item) => (
              <li key={item} className="flex items-center gap-3 border-b border-forest/12 py-4 pr-4 text-[16.5px] text-forest">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-bronze" />
                {item}
              </li>
            ))}
          </ul>
          <p className={cn(NOTE, 'mt-5')}>Visuels d’ambiance du projet, non contractuels.</p>
        </div>
      </section>

      {/* 6 — Payment plan: the proportions are the message. */}
      <section id="paiement" aria-labelledby="payment-title" className="bg-forest px-gutter py-[clamp(72px,10vw,140px)] text-cream">
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW_DARK}>Échéancier</p>
            <h2 id="payment-title" className={cn(H2_DARK, 'mt-4 max-w-[900px]')}>
              Un paiement réparti jusqu’à la remise des clés.
            </h2>
          </FadeIn>

          <PaymentBar className="mt-12 lg:mt-16" />

          <ol className="mt-10 grid gap-0 lg:mt-12 lg:grid-cols-3">
            {PAYMENT_PLAN.map((item) => (
              <li
                key={item.step}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-t border-cream/15 py-7 lg:block lg:border-l lg:border-t-0 lg:px-10 lg:py-2 lg:first:border-l-0 lg:first:pl-0"
              >
                <span className="text-[14px] font-medium tabular-nums tracking-[0.12em] text-sand">{item.step}</span>
                <div className="lg:mt-6">
                  <p className="font-sans text-[clamp(56px,7vw,104px)] font-light leading-[0.9] tracking-[-0.05em] text-cream">
                    {item.share}
                  </p>
                  <p className="mt-3 text-[17px] leading-snug text-cream/75 lg:text-[19px]">{item.label}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-8 border-t border-cream/15 pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
            <p className="text-[17px] text-cream/80">
              Livraison prévue : <span className="font-medium text-cream">juin 2028</span>
            </p>
            <DossierCta className={CTA_PRIMARY_ON_DARK} />
          </div>
        </div>
      </section>

      {/* 7 — Price: minimal. */}
      <section id="prix" aria-labelledby="price-title" className="bg-shell px-gutter py-[clamp(80px,12vw,160px)] text-center">
        <FadeIn className="mx-auto max-w-[960px]">
          <h2 id="price-title" className="font-sans text-[clamp(18px,1.8vw,24px)] font-normal text-forest/70">
            À partir de
          </h2>
          <p className="mt-3 whitespace-nowrap font-sans text-[clamp(44px,11.5vw,150px)] font-light leading-[0.95] tracking-[-0.055em] text-forest">
            1&nbsp;390&nbsp;000 <span className="text-[0.42em] font-normal tracking-[-0.01em]">MAD</span>
          </p>
          <p className="mt-6 text-[clamp(18px,1.8vw,24px)] font-medium tracking-[-0.01em] text-forest/80">{FACTS.pricePerSqm}</p>
          <div className="mt-10">
            <DossierCta className={CTA_PRIMARY}>Voir les disponibilités</DossierCta>
          </div>
          <p className={cn(NOTE, 'mt-6')}>Prix et disponibilités des lots confirmés par un conseiller.</p>
        </FadeIn>
      </section>

      {/* 8 — Apartments. */}
      <section id="appartements" aria-labelledby="apartments-title" className="overflow-x-clip bg-cream px-gutter py-[clamp(72px,10vw,140px)]">
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
            <div>
              <p className={EYEBROW}>Les appartements</p>
              <h2 id="apartments-title" className={cn(H2, 'mt-4')}>
                Projetez-vous dans votre futur appartement.
              </h2>
            </div>
            <p className={cn(LEAD, 'max-w-[440px]')}>
              Des surfaces de {FACTS.surfaces}, pensées pour y vivre comme pour investir.
            </p>
          </FadeIn>

          <div className="mt-10 lg:mt-14">
            <Rail label="Intérieurs Honest Signature 7" itemClassName="w-[86vw] sm:w-[66vw] lg:w-[52vw] lg:max-w-[820px]">
              {APARTMENT_VISUALS.map((room) => (
                <figure key={room.title} className="m-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/40 lg:aspect-[16/10]">
                    <Picture picture={room.picture} sizes="(min-width: 1024px) 52vw, (min-width: 641px) 66vw, 86vw" />
                  </div>
                  <figcaption className="mt-4 font-sans text-[19px] font-medium tracking-[-0.02em] text-forest">{room.title}</figcaption>
                </figure>
              ))}
            </Rail>
          </div>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-6">
            <DossierCta />
            <a
              href={EXTERNAL.virtualTour3d}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-forest/25 px-8 py-4 text-[15px] font-medium text-forest transition-colors duration-300 hover:border-forest"
            >
              Explorer la visite 3D
              <span aria-hidden="true">↗</span>
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
          <p className={cn(NOTE, 'mt-6')}>Visuels d’ambiance du projet, non contractuels.</p>
        </div>
      </section>

      {/* 9 — The form. */}
      <DossierLeadForm />

      <StickyDossierCta heroId={HERO_ID} />
    </>
  );
}
