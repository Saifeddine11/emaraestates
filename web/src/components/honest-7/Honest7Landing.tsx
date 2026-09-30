import { FadeIn } from '@/components/appartements-temoins/FadeIn';
import { DossierCta, StickyDossierCta } from '@/components/honest-7/DossierCta';
import { CTA_PRIMARY, CTA_PRIMARY_ON_DARK, TEXT_LINK } from '@/components/honest-7/styles';
import { DossierSection, LeadFormProvider } from '@/components/honest-7/DossierLeadForm';
import { LandingTracking } from '@/components/honest-7/LandingTracking';
import { LeadDrawer } from '@/components/honest-7/LeadDrawer';
import { MaskReveal, Parallax, PaymentBar } from '@/components/honest-7/Motion';
import { Picture } from '@/components/honest-7/Picture';
import { Rail } from '@/components/honest-7/Rail';
import {
  AMENITY_LIST,
  AMENITY_VISUALS,
  APARTMENT_VISUALS,
  AVAILABILITY_ROWS,
  CTA_MICROCOPY,
  DELIVERED_COUNT,
  DELIVERED_RESIDENCES,
  FACTS,
  HERO_IMAGE,
  HERO_SIZES,
  MAP_IMAGE,
  PAYMENT_PLAN,
  REVEAL_IMAGE,
  TRUST_BAR,
} from '@/lib/content/honest-signature-7';
import { LANDING_ANGLE_SCRIPT } from '@/lib/landing-angle';
import { EXTERNAL } from '@/lib/site';
import { cn } from '@/lib/cn';

export const HERO_ID = 'la-7e';

const SECTION_Y = 'py-[clamp(56px,8vw,112px)]';
const EYEBROW = 'text-[13px] font-medium uppercase tracking-[0.2em] text-olive';
const EYEBROW_DARK = 'text-[13px] font-medium uppercase tracking-[0.2em] text-sand';
const H2 =
  'text-balance font-sans text-[clamp(32px,4.6vw,60px)] font-medium leading-[1.05] tracking-[-0.035em] text-forest';
const H2_DARK =
  'text-balance font-sans text-[clamp(32px,4.6vw,60px)] font-medium leading-[1.05] tracking-[-0.035em] text-cream';
const LEAD = 'text-[clamp(17px,1.4vw,20px)] leading-[1.55] text-forest/70';
const NOTE = 'text-[13.5px] leading-relaxed text-forest/50';
const ROW_CTA =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-forest/20 px-5 text-[14px] font-medium text-forest transition-colors duration-300 hover:border-forest hover:bg-forest hover:text-cream';

/** "7e" set as an editorial numeral with a raised "e". */
function Seventh({ className }: { className?: string }) {
  return (
    <span className={cn('whitespace-nowrap font-sans font-medium', className)}>
      7<span className="relative -top-[0.62em] ml-[0.03em] text-[0.52em]">e</span>
    </span>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[18px] shrink-0 text-bronze" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

function FactRow({ facts }: { facts: readonly string[] }) {
  return (
    <ul className="grid grid-cols-3 border-y border-forest/12 lg:max-w-[560px]">
      {facts.map((fact) => (
        <li
          key={fact}
          className="flex items-center border-l border-forest/12 py-2.5 pl-3 pr-2 text-[14px] font-medium leading-[1.3] text-forest first:border-l-0 first:pl-0 sm:text-[15px] lg:py-3.5 lg:pl-5 lg:first:pl-0"
        >
          {fact}
        </li>
      ))}
    </ul>
  );
}

const PLAZA = 'À 1 minute à pied du Plaza.';

export function Honest7Landing() {
  return (
    <LeadFormProvider>
      <LandingTracking />

      {/* 1 — Hero: the ad, continued. The inline script picks the variant
          (price / payment / proof) before paint. Mobile: the building fills
          the top and fades into the text panel, which always holds the hook,
          the Plaza line, the facts and the CTA. The page ends 72px short of
          the fold so the trust bar peeks in and the CTA stays clear of the
          WhatsApp float. Desktop: text left, building right. */}
      <section id={HERO_ID} aria-labelledby="hero-title" className="relative bg-shell" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: LANDING_ANGLE_SCRIPT }} />
        <div aria-hidden="true" className="hidden h-[88px] bg-forest lg:block" />
        <div className="flex min-h-[calc(100svh-72px)] flex-col lg:grid lg:min-h-[min(calc(100svh-88px),860px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="relative min-h-[170px] flex-1 overflow-hidden bg-forest lg:order-last">
            <Picture
              picture={HERO_IMAGE}
              sizes={HERO_SIZES}
              priority
              className="absolute inset-0 object-[50%_30%] motion-safe:animate-[hs7-settle_1.8s_cubic-bezier(0.23,1,0.32,1)_both] lg:object-[50%_42%]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-shell via-shell/60 to-transparent lg:hidden" />
          </div>

          <div className="relative -mt-8 px-gutter pb-7 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:py-16 lg:pl-[clamp(40px,6vw,104px)] lg:pr-[clamp(32px,4vw,64px)]">
            <p className={EYEBROW}>
              <span data-hs7-variant="proof payment">Honest Signature 7 · Guéliz</span>
              <span data-hs7-variant="price">Honest Signature 7</span>
            </p>

            <h1
              id="hero-title"
              className="mt-3 font-sans text-[clamp(31px,8.5vw,44px)] font-medium leading-[1.04] tracking-[-0.04em] text-forest lg:mt-6 lg:text-[clamp(48px,4.9vw,80px)]"
            >
              <span data-hs7-variant="proof">
                <span className="block">{DELIVERED_COUNT} résidences déjà livrées.</span>
                <span className="block">
                  La <Seventh className="text-olive" /> prend forme à Guéliz.
                </span>
              </span>
              <span data-hs7-variant="price">
                <span className="block whitespace-nowrap text-[clamp(60px,17vw,96px)] font-light leading-[0.92] tracking-[-0.055em] lg:text-[clamp(60px,6vw,104px)]">
                  2&nbsp;500&nbsp;€/m²
                </span>
                <span className="mt-2 block lg:mt-4">au cœur de Guéliz.</span>
              </span>
              <span data-hs7-variant="payment">
                <span className="block">
                  <span className="whitespace-nowrap">30&nbsp;%</span> à la réservation.
                </span>
              </span>
            </h1>

            <div data-hs7-variant="payment">
              <p className="mt-3 text-[17px] leading-[1.45] text-forest/80 sm:text-[19px] lg:mt-5 lg:text-[21px]">
                Le reste réparti jusqu’à la remise des clés.
              </p>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[16px] font-medium text-forest/80 sm:text-[17px] lg:mt-5 lg:text-[19px]">
              <PinIcon />
              {PLAZA}
            </p>

            <div className="mt-4 lg:mt-8">
              <div data-hs7-variant="proof">
                <FactRow facts={[`Dès ${FACTS.surfaceFrom}`, `Dès ${FACTS.priceFromShort}`, `Livraison ${FACTS.delivery}`]} />
              </div>
              <div data-hs7-variant="price">
                <FactRow facts={[`Dès ${FACTS.surfaceFrom}`, '30 % à la réservation', `Livraison ${FACTS.delivery}`]} />
              </div>
              <div data-hs7-variant="payment">
                <FactRow facts={['15 % tous les 6 mois × 3', '25 % à la remise des clés', `Livraison ${FACTS.delivery}`]} />
              </div>
            </div>

            <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-6 lg:mt-9">
              <DossierCta location="hero" className={cn(CTA_PRIMARY, 'w-full whitespace-nowrap sm:w-auto sm:shrink-0')} />
              <p className="text-center text-[13.5px] font-medium tracking-[0.02em] text-forest/60 sm:text-left">{CTA_MICROCOPY}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Trust bar. */}
      <section aria-label="Honest Signature 7 en bref" className="border-y border-forest/10 bg-cream">
        <ul className="mx-auto grid w-full max-w-[1320px] grid-cols-2 gap-px bg-forest/10 lg:grid-cols-4">
          {TRUST_BAR.map((item) => (
            <li key={item} className="flex min-h-[60px] items-center gap-2.5 bg-cream px-gutter py-3 text-[14.5px] font-medium leading-[1.3] text-forest sm:text-[15.5px] lg:justify-center lg:px-6">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-bronze" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — Current availability. No lot counts: there is no inventory
          source, so rows only open the form with the type pre-selected. */}
      <section id="disponibilites" aria-labelledby="availability-title" className="bg-shell px-gutter py-[clamp(48px,7vw,96px)]">
        <div className="mx-auto grid w-full max-w-[1320px] items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <FadeIn>
            <p className={EYEBROW}>Honest Signature 7</p>
            <h2 id="availability-title" className={cn(H2, 'mt-4')}>
              Disponibilités actuelles
            </h2>
            <p className={cn(LEAD, 'mt-4 max-w-[460px]')}>La disponibilité évolue au rythme des réservations.</p>
          </FadeIn>
          <div>
            <ul className="border-t border-forest/12">
              {AVAILABILITY_ROWS.map((row) => (
                <li key={row.type} className="flex items-center justify-between gap-4 border-b border-forest/12 py-3.5">
                  <span className="font-sans text-[clamp(19px,1.8vw,24px)] font-medium tracking-[-0.02em] text-forest">{row.label}</span>
                  <DossierCta location={`availability_${row.id}`} propertyType={row.type} className={ROW_CTA}>
                    Voir les lots <span aria-hidden="true">→</span>
                  </DossierCta>
                </li>
              ))}
            </ul>
            <DossierCta location="availability_grid" className={cn(CTA_PRIMARY, 'mt-7 w-full sm:w-auto')}>
              Recevoir la grille actualisée
            </DossierCta>
          </div>
        </div>
      </section>

      {/* 4 — Proof. Only the four residences with verified photographs are
          pictured, and the caption says so. */}
      <section id="realisations" aria-labelledby="proof-title" className={cn('overflow-x-clip bg-cream px-gutter', SECTION_Y)}>
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW}>Nos réalisations</p>
            <h2 id="proof-title" className={cn(H2, 'mt-4')}>
              <span className="block">{DELIVERED_COUNT} résidences déjà livrées.</span>
              <span className="block">
                La <Seventh className="text-olive" /> prend forme à Guéliz.
              </span>
            </h2>
          </FadeIn>

          <div className="mt-9 lg:mt-12">
            <Rail label="Résidences Honest déjà livrées" itemClassName="w-[80vw] sm:w-[56vw] lg:w-[40vw] lg:max-w-[620px]">
              {DELIVERED_RESIDENCES.map((residence) => (
                <figure key={residence.name} className="m-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/40 lg:aspect-[3/2]">
                    <Picture picture={residence.picture} sizes="(min-width: 1024px) 40vw, (min-width: 641px) 56vw, 80vw" />
                  </div>
                  <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                    <span className="font-sans text-[18px] font-medium tracking-[-0.02em] text-forest">{residence.name}</span>
                    <span className="text-[14px] text-forest/55">Guéliz · Livrée</span>
                  </figcaption>
                </figure>
              ))}
            </Rail>
          </div>
          <p className={cn(NOTE, 'mt-5')}>
            Photographies réelles des résidences Honest 1 à {DELIVERED_RESIDENCES.length}.
          </p>
        </div>
      </section>

      {/* 5 — Project overview, with the confirmed MAD pricing. */}
      <section id="projet" aria-labelledby="project-title" className={cn('bg-shell', SECTION_Y)}>
        <FadeIn className="mx-auto w-full max-w-[1320px] px-gutter">
          <p className={EYEBROW}>Honest Signature 7</p>
          <h2 id="project-title" className={cn(H2, 'mt-4 max-w-[900px]')}>
            La <Seventh className="text-olive" /> s’installe au cœur de Guéliz.
          </h2>
        </FadeIn>

        <MaskReveal className="mx-auto mt-9 w-full max-w-[1480px] overflow-hidden lg:mt-12 lg:px-gutter">
          <Parallax className="aspect-[1.2] overflow-hidden bg-[#1f291f] sm:aspect-[1.5] lg:aspect-[2] lg:rounded-[28px]">
            <Picture picture={REVEAL_IMAGE} sizes="(min-width: 1480px) 1400px, 100vw" className="object-[50%_60%]" />
          </Parallax>
        </MaskReveal>

        <div className="mx-auto w-full max-w-[1320px] px-gutter">
          <div id="prix" className="mt-9 grid gap-8 border-t border-forest/12 pt-8 lg:mt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:pt-10">
            <div>
              <p className="text-[16px] text-forest/65 sm:text-[18px]">À partir de</p>
              <p className="mt-1 whitespace-nowrap font-sans text-[clamp(40px,7vw,88px)] font-light leading-[0.98] tracking-[-0.05em] text-forest">
                1&nbsp;390&nbsp;000 <span className="text-[0.45em] font-normal tracking-[-0.01em]">MAD</span>
              </p>
              <p className="mt-3 text-[18px] font-medium text-forest/80 sm:text-[20px]">{FACTS.pricePerSqm}</p>
            </div>
            <dl className="grid grid-cols-2 gap-6">
              {[
                { label: 'Surfaces', value: FACTS.surfaces },
                { label: 'Livraison', value: 'Juin 2028' },
              ].map((fact) => (
                <div key={fact.label} className="border-l border-forest/12 pl-5">
                  <dt className="text-[13px] font-medium uppercase tracking-[0.18em] text-olive">{fact.label}</dt>
                  <dd className="mt-2 font-sans text-[clamp(20px,1.9vw,26px)] font-medium tracking-[-0.02em] text-forest">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-9 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-8">
            <DossierCta location="project" />
            <p className={cn(NOTE, 'text-center sm:text-left')}>Prix et disponibilités des lots confirmés par un conseiller.</p>
          </div>
        </div>
      </section>

      {/* 6 — Payment plan: the proportions are the message. */}
      <section id="paiement" aria-labelledby="payment-title" className={cn('bg-forest px-gutter text-cream', SECTION_Y)}>
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW_DARK}>Échéancier</p>
            <h2 id="payment-title" className={cn(H2_DARK, 'mt-4 max-w-[860px]')}>
              Un paiement réparti jusqu’à la remise des clés.
            </h2>
          </FadeIn>

          <PaymentBar className="mt-10 lg:mt-14" />

          <ol className="mt-8 grid gap-0 lg:mt-10 lg:grid-cols-3">
            {PAYMENT_PLAN.map((item) => (
              <li
                key={item.step}
                className="flex items-baseline gap-5 border-t border-cream/15 py-5 lg:block lg:border-l lg:border-t-0 lg:px-10 lg:py-1 lg:first:border-l-0 lg:first:pl-0"
              >
                <p className="w-[92px] shrink-0 font-sans text-[clamp(40px,5vw,72px)] font-light leading-[0.95] tracking-[-0.05em] text-cream lg:w-auto">
                  {item.share}
                </p>
                <p className="text-[17px] leading-snug text-cream/75 lg:mt-3 lg:text-[19px]">{item.label}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-6 border-t border-cream/15 pt-7 sm:flex-row sm:items-center sm:justify-between lg:mt-12">
            <p className="text-[17px] text-cream/80">
              Livraison : <span className="font-medium text-cream">juin 2028</span>
            </p>
            <DossierCta location="payment" className={CTA_PRIMARY_ON_DARK} />
          </div>
        </div>
      </section>

      {/* 7 — Location: one verified number, stated large. */}
      <section id="localisation" aria-labelledby="location-title" className={cn('bg-shell px-gutter', SECTION_Y)}>
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <FadeIn>
            <p className={EYEBROW}>Localisation</p>
            <h2 id="location-title" className={cn(H2, 'mt-4')}>
              Au cœur de Guéliz.
            </h2>
            <p className="mt-8 flex items-baseline gap-4 border-t border-forest/12 pt-7">
              <span className="font-sans text-[clamp(64px,9vw,120px)] font-light leading-[0.85] tracking-[-0.06em] text-forest">1</span>
              <span className="text-[clamp(20px,2vw,28px)] font-medium leading-[1.15] tracking-[-0.02em] text-forest">
                minute à pied
                <br />
                du Plaza
              </span>
            </p>
            <ul className="mt-7 grid gap-0 border-t border-forest/12">
              {['Carré Eden à proximité', 'Cafés & restaurants', 'Boutiques & services'].map((item) => (
                <li key={item} className="border-b border-forest/12 py-3.5 text-[17px] text-forest/80">
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          <MaskReveal className="overflow-hidden rounded-[24px]">
            <div className="aspect-[4/3] bg-forest lg:aspect-[1.2]">
              <Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 54vw, 100vw" className="object-[42%_40%] sm:object-center" />
            </div>
          </MaskReveal>
        </div>
      </section>

      {/* 8 — Amenities: four real project visuals and the full list, no carousel. */}
      <section id="art-de-vivre" aria-labelledby="lifestyle-title" className={cn('bg-cream px-gutter', SECTION_Y)}>
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW}>Les espaces de la résidence</p>
            <h2 id="lifestyle-title" className={cn(H2, 'mt-4')}>
              Bien plus qu’une résidence.
            </h2>
          </FadeIn>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-12 lg:grid-cols-4">
            {AMENITY_VISUALS.map((amenity) => (
              <li key={amenity.title}>
                <figure className="m-0">
                  <div className="aspect-square overflow-hidden rounded-[18px] bg-sand/40 lg:aspect-[4/5]">
                    <Picture picture={amenity.picture} sizes="(min-width: 1024px) 24vw, 46vw" />
                  </div>
                  <figcaption className="mt-2.5 font-sans text-[15.5px] font-medium tracking-[-0.01em] text-forest sm:text-[17px]">
                    {amenity.title}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Équipements de la résidence">
            {AMENITY_LIST.map((item) => (
              <li key={item} className="rounded-full border border-forest/15 bg-shell px-4 py-2 text-[14.5px] text-forest">
                {item}
              </li>
            ))}
          </ul>
          <p className={cn(NOTE, 'mt-5')}>Visuels d’ambiance du projet, non contractuels.</p>
        </div>
      </section>

      {/* 9 — Apartments. */}
      <section id="appartements" aria-labelledby="apartments-title" className={cn('overflow-x-clip bg-shell px-gutter', SECTION_Y)}>
        <div className="mx-auto w-full max-w-[1320px]">
          <FadeIn>
            <p className={EYEBROW}>Les appartements</p>
            <h2 id="apartments-title" className={cn(H2, 'mt-4')}>
              Découvrez les appartements.
            </h2>
          </FadeIn>

          <div className="mt-8 lg:mt-12">
            <Rail label="Intérieurs Honest Signature 7" itemClassName="w-[82vw] sm:w-[60vw] lg:w-[46vw] lg:max-w-[720px]">
              {APARTMENT_VISUALS.map((room) => (
                <figure key={room.title} className="m-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-sand/40 lg:aspect-[16/10]">
                    <Picture picture={room.picture} sizes="(min-width: 1024px) 46vw, (min-width: 641px) 60vw, 82vw" />
                  </div>
                  <figcaption className="mt-3 font-sans text-[18px] font-medium tracking-[-0.02em] text-forest">{room.title}</figcaption>
                </figure>
              ))}
            </Rail>
          </div>

          <div className="mt-9 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-8">
            <DossierCta location="apartments" />
            <a
              href={EXTERNAL.virtualTour3d}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(TEXT_LINK, 'justify-center sm:justify-start')}
            >
              Explorer la visite 3D <span aria-hidden="true">↗</span>
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
          <p className={cn(NOTE, 'mt-5')}>Visuels d’ambiance du projet, non contractuels.</p>
        </div>
      </section>

      {/* 10 — The inline form (fallback for no-JS and assistive tech). */}
      <DossierSection />

      <LeadDrawer />
      <StickyDossierCta heroId={HERO_ID} />
    </LeadFormProvider>
  );
}
