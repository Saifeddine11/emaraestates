import type { ReactNode } from 'react';
import { Faq } from '@/components/honest-7-residence-boutique/Faq';
import { HeroCarousel } from '@/components/honest-7/HeroCarousel';
import type { TrackIconName } from '@/components/honest-7/Icons3d';
import { Pictogram } from '@/components/honest-7-residence-boutique/Pictogram';
import { ArrowDown, ArrowRight, Check, Orbit, Oval, Phone } from '@/components/honest-7/Icons';
import { Hotel3d } from '@/components/honest-7-residence-boutique/Hotel3d';
import { HeaderCta, ScrollCta, SectionView, StickyCta } from '@/components/honest-7/LandingActions';
import { LandingTracking } from '@/components/honest-7/LandingTracking';
import { LeadForm } from '@/components/honest-7/LeadForm';
import { LeadFormProvider } from '@/components/honest-7/LeadFormState';
import { OpenOnForm } from '@/components/honest-7/OpenOnForm';
import { InView, Lines, Rise } from '@/components/honest-7/Reveal';
import { PaymentSimulator } from '@/components/honest-7/PaymentSimulator';
import { Picture } from '@/components/honest-7/Picture';
import { CTA_OUTLINE, CTA_PRIMARY, FINAL_FORM_ID, FORM_ID, SHOW_APARTMENTS_ID } from '@/components/honest-7/shared';
import { ShowGallery } from '@/components/honest-7/ShowGallery';
import {
  DOSSIER_CONTENTS,
  FACTS,
  HERO_AMENITIES,
  HERO_IMAGE,
  HERO_IMAGE_MOBILE,
  HERO_MEDIA_DESKTOP,
  HERO_SIZES,
  HERO_SLIDES,
  MAP_IMAGE,
  RESIDENCES,
  SHOW_APARTMENTS,
  SOLD_SHOWN,
  STATUS_LABEL,
  VALIDATION,
  type AmenityGroup,
  type Residence,
} from '@/lib/content/honest-signature-7';
import { AMENITY_GROUPS, HERO_AVIF, LOGO_SIZES, LOGO_SRCSET, MESSAGE_TAG } from '@/lib/content/honest-signature-7-residence-boutique';
import { CONTACT, WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

const SHELL = 'mx-auto w-full max-w-[1320px] px-gutter';
const EYEBROW = 'text-[13px] font-medium uppercase tracking-[0.2em]';
/** Olive darkened for small text on the light surfaces (AA contrast). */
const EYEBROW_LIGHT = 'text-[#5b6a4c]';
const H2 = 'font-sans font-medium uppercase tracking-[-0.035em]';
/** Appended after the size: tailwind-merge drops a leading that precedes a text-[…] size. */
const H2_LEADING = 'leading-[0.96]';
const SERIF = 'font-serif font-normal normal-case italic tracking-[-0.01em]';
const ARROW = 'transition-transform duration-300 ease-step group-hover/cta:translate-x-1';
/** The green a lead card stands on, lit from the side — see `GlassStage`. */
const GLASS_STAGE = 'bg-forest bg-[radial-gradient(64%_52%_at_84%_34%,rgba(122,139,104,0.5),transparent_72%)] text-cream';

/** Under the headline, on phones too: it carries the positioning the video sets up. */
const HERO_LINE = 'Une adresse intime au cœur de Guéliz, à 1 minute du Plaza, avec les services d’un hôtel.';

/**
 * Words whose letters hop one after the other, then rest
 * (`hs7-letter-hop` in globals.css). Read as one word by screen readers; with
 * reduced motion the letters stay still.
 */
function BounceLetters({ text, className }: { text: string; className?: string }) {
  let index = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, wordIndex) => (
          <span key={wordIndex}>
            {wordIndex > 0 && ' '}
            <span className="inline-block">
              {[...word].map((letter) => {
                const at = index++;
                return (
                  <span
                    key={at}
                    className="inline-block motion-safe:animate-[hs7-letter-hop_3.4s_linear_infinite]"
                    style={{ animationDelay: `${0.6 + at * 0.045}s` }}
                  >
                    {letter}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

const PHONE_HREF = `tel:${CONTACT.phoneDisplay.replace(/\s/g, '')}`;
const HEADER_PILL =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/25 px-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-forest transition-colors duration-200 hover:border-forest hover:bg-forest hover:text-cream';

const delivered = RESIDENCES.filter((residence) => residence.status === 'delivered');
const sold = RESIDENCES.filter((residence) => residence.status === 'sold');
const current = RESIDENCES.find((residence) => residence.status === 'selling');

/**
 * `/honest-signature-7-residence-boutique/` — /honest-signature-7/ for the
 * « première résidence boutique de Marrakech » video campaign. Same sections,
 * visuals, facts, prices, form, pixels and CRM path; only the positioning
 * copy differs, and every lead's message opens with MESSAGE_TAG.
 */
export function BoutiqueLanding() {
  return (
    <LeadFormProvider messageTag={MESSAGE_TAG}>
      <LandingTracking splitPlatforms />
      {/* `viewport-fit=cover` lets the page run under the notch in landscape: keep the content clear of it. */}
      <div className="bg-shell pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Header />
        <main id="main-content">
          {/* Ask first (the client's order, 2026-10-09): the form straight under the hero — the page can
              even open on it (VALIDATION.openOnForm, see OpenOnForm) — then how it is paid, then who builds it. */}
          <Hero />
          <FirstForm />
          {VALIDATION.openOnForm && <OpenOnForm />}
          <Payment />
          <TrackRecord />
          <ShowApartments />
          <Amenities />
          <Location />
          <Scarcity />
          <Questions />
          <FinalForm />
        </main>
        <Footer />
      </div>
      <StickyCta />
    </LeadFormProvider>
  );
}

/* ── Header: logo, project name, one phone number. No menu to leave by. ──── */

function Header() {
  return (
    <header className="relative z-50 border-b border-forest/10 bg-shell/92 backdrop-blur-md lg:sticky lg:top-0">
      <div className={cn(SHELL, 'flex h-14 items-center justify-between gap-4 lg:h-[68px]')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; 320px WebP of the official forest logo */}
        <img
          src="/media/honest-7/logo-emara-forest-320.webp"
          srcSet={LOGO_SRCSET}
          sizes={LOGO_SIZES}
          alt="Emara Estates"
          width={320}
          height={180}
          className="h-8 w-auto lg:h-10"
        />
        <p className="hidden text-[13px] font-medium uppercase tracking-[0.2em] text-forest/75 md:block">Honest Signature 7 · Résidence boutique</p>
        <div className="flex items-center gap-3">
          <HeaderCta />
          {/* Phones: the pill leads to the form. From lg it shows the number, and dials it. */}
          <ScrollCta event="availability_cta_click" location="header_mobile" className={cn(HEADER_PILL, 'lg:hidden')}>
            <Phone />
            Appeler
          </ScrollCta>
          <a
            href={PHONE_HREF}
            data-track-location="header"
            aria-label={`Appeler Emara Estates au ${CONTACT.phoneDisplay}`}
            className={cn(HEADER_PILL, 'hidden lg:inline-flex')}
          >
            <Phone />
            <span className="normal-case tracking-[0.02em] tabular-nums">{CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>
    </header>
  );
}

/* ── 1. Hero ─────────────────────────────────────────────────────────────
   The first screen carries the project, the place, the opportunity, the
   proof and the action. The building is shown as it is: no dark overlay, and
   no copy on the image except two small labels with their own background.
   Phones: headline → image → price → CTAs → amenities → track record.
   From lg: copy on the left, the building on the right, the track record
   under both. The load sequence is CSS-only, so it starts before hydration. */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="hs7-load relative overflow-x-clip bg-shell">
      <div className={cn(SHELL, 'grid gap-x-[clamp(32px,4.5vw,72px)] pb-7 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pb-10 lg:pt-9')}>
        <div className="min-w-0 lg:self-end">
          {/* No eyebrow above the headline (« Honest Signature 7 · Guéliz · Hyper-centre » removed at the client's request, 2026-10-17). */}
          {/* The headline and, beside it, the residence in relief. */}
          <div className="flex items-end justify-between gap-3">
          <h1
            id="hero-title"
            className="font-sans text-[clamp(23px,6.6vw,34px)] font-medium uppercase leading-[0.95] tracking-[-0.04em] text-forest lg:text-[clamp(34px,3.1vw,46px)]"
          >
            {/* The video's line, in the original headline's three masks. Each mask keeps 0.2em above the
                line: capitals carry accents (É, À). The middle line is not clipped: its letters bounce. */}
            <span className="block overflow-hidden pt-[0.2em]">
              <span className="block whitespace-nowrap">La première</span>
            </span>
            <span className="-mt-[0.04em] block pt-[0.2em]">
              <BounceLetters text="résidence boutique" className="block whitespace-nowrap text-olive" />
            </span>
            <span className="-mt-[0.16em] block overflow-hidden pb-[0.2em] pt-[0.2em]">
              <span className="block whitespace-nowrap">de Marrakech.</span>
            </span>
          </h1>
          <InView as="span" amount={0.3} className="mb-1 shrink-0">
            <Hotel3d className="size-[76px] sm:size-24 lg:size-28" />
          </InView>
          </div>
          <p className="mt-2 max-w-[520px] text-[15px] leading-[1.45] text-forest/75 lg:mt-4 lg:text-[18px] lg:leading-[1.5]">{HERO_LINE}</p>
        </div>

        <div className="mt-4 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
          {/* Enlarged at the client's request (2026-10-17): on phones a 3:2 frame, the façade render's own shape (2:1 before);
              from lg a wider column (1.15fr) rather than a taller frame, which would only zoom further into the render. */}
          <figure className="relative m-0 h-[clamp(150px,min(59vw,32svh),460px)] overflow-hidden rounded-[18px] bg-sand/40 lg:h-[clamp(440px,calc(100svh-250px),640px)] lg:rounded-[24px]">
            <HeroCarousel slides={HERO_SLIDES} sizes={HERO_SIZES} startOn="interaction">
              <picture className="block size-full">
                <source
                  type="image/avif"
                  media={HERO_IMAGE_MOBILE.media}
                  srcSet={HERO_AVIF.mobile}
                  sizes={HERO_IMAGE_MOBILE.sizes}
                  width={HERO_IMAGE_MOBILE.width}
                  height={HERO_IMAGE_MOBILE.height}
                />
                <source type="image/avif" media={HERO_MEDIA_DESKTOP} srcSet={HERO_AVIF.desktop} sizes={HERO_SIZES} width={HERO_IMAGE.width} height={HERO_IMAGE.height} />
                <source
                  media={HERO_IMAGE_MOBILE.media}
                  srcSet={HERO_IMAGE_MOBILE.srcSet}
                  sizes={HERO_IMAGE_MOBILE.sizes}
                  width={HERO_IMAGE_MOBILE.width}
                  height={HERO_IMAGE_MOBILE.height}
                />
                <Picture picture={HERO_IMAGE} sizes={HERO_SIZES} priority className="lg:object-[38%_60%]" />
              </picture>
            </HeroCarousel>
            <figcaption className="absolute left-3 top-3 z-[3] flex items-center gap-2 whitespace-nowrap rounded-full bg-shell/95 py-1.5 pl-2.5 pr-3.5 text-[12px] font-medium uppercase tracking-[0.1em] text-forest shadow-[0_8px_22px_-14px_rgba(0,0,0,0.55)] lg:left-5 lg:top-5 lg:py-2 lg:pl-3 lg:pr-4 lg:text-[13px]">
              <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
                <span className="absolute inset-0 rounded-full bg-olive motion-safe:animate-[hs7-ping_1.6s_var(--ease-step)_0.9s_both]" />
                <span className="relative size-2.5 rounded-full bg-olive" />
              </span>
              {FACTS.plaza}
            </figcaption>
          </figure>
        </div>

        <div className="min-w-0 lg:self-start">
          {/* How much, what, how it is paid. The Plaza distance sits on the image on phones, and here too from xl. */}
          <dl className="mt-3.5 grid grid-cols-[auto_1fr] items-end gap-x-7 border-t border-forest/12 pt-2.5 lg:mt-7 lg:gap-x-10 lg:pt-4 xl:grid-cols-[auto_auto_1fr]">
            <div>
              <dt className={cn('text-[12.5px] font-medium uppercase tracking-[0.16em]', EYEBROW_LIGHT)}>À partir de</dt>
              <dd className="mt-2.5 whitespace-nowrap font-sans text-[27px] font-medium leading-none tracking-[-0.03em] text-forest tabular-nums lg:mt-3 lg:text-[34px]">
                <span className="relative ml-[0.3em] inline-block">
                  {FACTS.priceHero.amount}
                  {FACTS.priceHero.unit && <span className="ml-1.5 text-[0.5em] font-medium tracking-[0.04em]">{FACTS.priceHero.unit}</span>}
                  <Oval className="text-olive" delay={780} />
                </span>
              </dd>
            </div>
            {/* From xl only: below that the image label already says it, and three cells do not fit. */}
            <div className="hidden xl:block">
              <dt className={cn('whitespace-nowrap text-[12.5px] font-medium uppercase tracking-[0.16em]', EYEBROW_LIGHT)}>Du Plaza, à pied</dt>
              <dd className="mt-1.5 whitespace-nowrap font-sans text-[22px] font-medium uppercase leading-none tracking-[-0.02em] text-forest">1 minute</dd>
            </div>
            {VALIDATION.typologies ? (
              <div>
                <dt className={cn('text-[12px] font-medium uppercase leading-[1.25] tracking-[0.12em] lg:text-[12.5px] lg:tracking-[0.16em]', EYEBROW_LIGHT)}>{FACTS.typologies}</dt>
                <dd className="mt-1.5 whitespace-nowrap font-sans text-[20px] font-medium uppercase leading-none tracking-[-0.02em] text-forest lg:text-[22px]">
                  {FACTS.surfaceFrom}
                </dd>
              </div>
            ) : (
              <div>
                <dt className={cn('text-[12.5px] font-medium uppercase tracking-[0.16em]', EYEBROW_LIGHT)}>Livraison</dt>
                <dd className="mt-1.5 whitespace-nowrap font-sans text-[20px] font-medium uppercase leading-none tracking-[-0.02em] text-forest lg:text-[22px]">
                  {FACTS.delivery}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:mt-6 lg:flex lg:flex-wrap lg:gap-3">
            <ScrollCta heroCta event="hero_primary_cta_click" location="hero" className={cn(CTA_PRIMARY, 'w-full lg:w-auto lg:px-8')}>
              <Orbit />
              <span className="text-balance">Recevoir le dossier de la résidence</span>
              <ArrowRight className={ARROW} />
            </ScrollCta>
            <ScrollCta to={SHOW_APARTMENTS_ID} event="hero_show_apartment_click" location="hero" className={cn(CTA_OUTLINE, 'w-full lg:w-auto')}>
              <Orbit className="-inset-px [--hs7-glint:var(--color-bronze)]" />
              Voir les appartements témoins
              <ArrowDown className="transition-transform duration-300 ease-step group-hover/cta:translate-y-0.5" />
            </ScrollCta>
          </div>

          {/* Eight amenities in two rows of four, a pictogram over a word or two — the four-line
              list read as too much text (client, 2026-10-17). The pictograms are on screen at once,
              like the rest of the hero; only their loops wait to be seen. */}
          <InView amount={0.3} className="mt-5 lg:mt-7">
            <ul aria-label="Les services hôteliers de la résidence" className="grid grid-cols-4 gap-x-1.5 gap-y-3 lg:gap-x-3">
              {HERO_AMENITIES.map((amenity, index) => (
                <li key={amenity.label} className="flex flex-col items-center gap-1 text-center">
                  <Pictogram name={amenity.icon} float={index * 0.6} className="size-11 lg:size-14" />
                  <span className="text-balance text-[12.5px] font-medium leading-[1.15] text-forest lg:text-[14px]">
                    {amenity.short ? (
                      <>
                        <span className="lg:hidden">{amenity.short}</span>
                        <span className="max-lg:hidden">{amenity.label}</span>
                      </>
                    ) : (
                      amenity.label
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </InView>
        </div>
      </div>

    </section>
  );
}

/* ── 2. The first form — the screen the page opens on (see OpenOnForm), so
   like the hero it is painted as it is (`hs7-load`): no reveal to wait for. ── */

function FirstForm() {
  return (
    // Only a short top padding: the hero above ends on the same background, its own padding already
    // separates them (the gap was ~85px on a phone; « diminue l'espace », client, 2026-10-18).
    <section aria-labelledby="dossier-title" className="hs7-load overflow-x-clip bg-shell pb-band-tight pt-4 text-forest lg:pt-6">
      {/* From lg the card spans both rows; the second row takes what its height leaves over, so the
          file's contents follow the steps instead of floating halfway down beside the card. */}
      <div className={cn(SHELL, 'grid items-start gap-x-[clamp(48px,6vw,104px)] gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:grid-rows-[auto_1fr] lg:gap-y-9')}>
        {/* 1 — Says "this is the form": on phones it sits right above the card, and CTAs scroll to it. */}
        <div data-lead-intro="hero" className="lg:col-start-1 lg:row-start-1 lg:pt-2">
          <p className={cn(EYEBROW, EYEBROW_LIGHT, 'flex items-center gap-3')}>
            <span aria-hidden="true" className="h-px w-8 bg-forest/30" />
            Prix • Plans • Disponibilités
          </p>
          <h2 id="dossier-title" className={cn(H2, 'mt-4 text-[clamp(34px,4.4vw,58px)]', H2_LEADING)}>
            <Lines
              lines={[
                'Le dossier de la résidence,',
                <span key="s" className={cn(SERIF, 'text-[1.1em] text-olive')}>
                  {VALIDATION.formQuestions ? <>en 3&nbsp;questions.</> : <>en une étape.</>}
                </span>,
              ]}
            />
          </h2>
          {/* What happens next, right under the heading and above the card, in place of the line that
              listed the file's contents (2026-10-17). Painted as it is, like the rest of the intro. */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Et ensuite ?</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-forest/75">
                <Check className="size-3.5 shrink-0 text-olive" />
                Sans engagement
              </p>
            </div>
            <ol className="relative mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {/* The thread from one step to the next, hidden behind the pictograms. */}
              <span aria-hidden="true" className="absolute inset-x-[16%] top-8 border-t border-dashed border-forest/25" />
              {(
                [
                  { icon: 'form', label: VALIDATION.formQuestions ? '3 questions' : 'Vos coordonnées' },
                  { icon: 'adviser', label: 'Un conseiller vous contacte' },
                  { icon: 'received', label: 'Dossier reçu' },
                ] as const
              ).map((step, index) => (
                <li key={step.icon} className="relative flex flex-col items-center gap-1.5 text-center">
                  <span className="relative rounded-full bg-shell px-1.5">
                    <Pictogram name={step.icon} float={index * 0.9} className="size-16" />
                    <span className="absolute -left-0.5 top-0 flex size-5 items-center justify-center rounded-full bg-forest text-[11px] font-semibold tabular-nums text-cream">
                      {index + 1}
                    </span>
                  </span>
                  <span className="text-balance text-[13.5px] font-medium leading-[1.25] text-forest sm:text-[15px]">{step.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* 2 — The card, on the only green of the section. */}
        <div className="min-w-0 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <GlassStage>
            <GlassLights>
              <LeadForm placement="hero" id={FORM_ID} title="Recevez le dossier complet" />
            </GlassLights>
            <TrackLine />
          </GlassStage>
        </div>

        {/* 3 — What the file contains: a pictogram and a word or two each, in three columns (the
            client found the list and its paragraphs too wordy, 2026-10-17). The investor's line
            became the gold-edged « Potentiel locatif ». */}
        <div className="lg:col-start-1 lg:row-start-2">
          <Rise>
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {DOSSIER_CONTENTS.map((item, index) => (
                <li
                  key={item.label}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-[18px] border bg-white/70 px-1 pb-3 pt-2.5 text-center shadow-[0_14px_28px_-24px_rgba(45,58,45,0.6)] sm:flex-row sm:gap-3 sm:px-3 sm:py-2.5 sm:text-left',
                    item.icon === 'rental' ? 'border-gold/80' : 'border-forest/[0.08]',
                  )}
                >
                  <Pictogram name={item.icon} float={index * 0.7} symbol={VALIDATION.euroPrices ? '€' : undefined} className="size-14" />
                  <span className="text-balance text-[13.5px] font-medium leading-[1.2] sm:text-[15px]">{item.label}</span>
                </li>
              ))}
            </ul>
          </Rise>
        </div>
      </div>
    </section>
  );
}

/**
 * The only green around a lead form: no larger than the card, its two lights
 * and the track line under it. A full-width band on phones, a rounded panel
 * beside the copy from lg. Nothing is clipped — the phone field's country list
 * may open past the card — so the padding has to stay wider than the lights'
 * overhang in `GlassLights`, and the card's shadow is drawn in to end on the
 * green instead of smudging the light page below it.
 */
function GlassStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-glass-stage
      className={cn(
        GLASS_STAGE,
        '-mx-gutter px-gutter pb-6 pt-9 lg:mx-0 lg:rounded-[32px] lg:px-8 lg:pb-7 lg:pt-10',
        '[&_[data-lead-form]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_24px_48px_-32px_rgba(0,0,0,0.7)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Two lit spheres behind a lead card, in Emara's greens. Glass needs something
 * to blur: they are sharp where they show past the card's edge and frosted
 * where it covers them. They only reach into the stage's padding (above the
 * card, and around the track line below), and the lower one stays dim: the
 * card's small print is read over it.
 */
function GlassLights({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -right-4 -top-6 size-32 rounded-full bg-[radial-gradient(circle_at_32%_28%,#b9c7a2,#7a8b68_56%,#4a5841)] lg:-right-6 lg:-top-8 lg:size-48" />
        <span className="absolute -bottom-2.5 -left-4 size-24 rounded-full bg-[radial-gradient(circle_at_32%_28%,#93a47d,#5f6f4f_58%,#3d4a37)] lg:-bottom-3 lg:-left-6 lg:size-36" />
      </div>
      {children}
    </div>
  );
}

/* ── 3. Show apartments: real interiors, then back to the form. ─────────── */

function ShowApartments() {
  return (
    <SectionView event="show_apartment_view" id={SHOW_APARTMENTS_ID} labelledBy="show-title" className="overflow-x-clip bg-cream py-band">
      <div className={SHELL}>
        <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Appartements témoins</p>
        <h2 id="show-title" className={cn(H2, 'mt-5 text-[clamp(32px,9vw,104px)] text-forest', H2_LEADING)}>
          <Lines lines={['Ne l’imaginez pas.', <span key="e" className={cn(SERIF, 'text-[1.1em] text-olive')}>Entrez.</span>]} />
        </h2>
        <Rise className="mt-6 grid gap-4 lg:mt-9 lg:grid-cols-2 lg:gap-16">
          <p className="max-w-[520px] text-[18px] leading-[1.55] text-forest/80">
            Le haut standing d’une résidence boutique se juge aux finitions. Découvrez-les dans des appartements déjà réalisés par
            Honest.
          </p>
          <p className="flex max-w-[520px] gap-3 border-t border-forest/15 pt-4 text-[15.5px] leading-[1.55] text-forest/75 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Check className="mt-1 text-olive" />
            <span>
              Ces appartements ont été photographiés dans des résidences Honest déjà livrées. Ce sont de vrais intérieurs réalisés, pas
              des images de synthèse.
            </span>
          </p>
        </Rise>

        <div className="mt-9 lg:mt-14">
          <ShowGallery rooms={SHOW_APARTMENTS} label="Appartements témoins des résidences Honest livrées" />
        </div>

        <div className="mt-11 flex flex-col gap-6 border-t border-forest/15 pt-8 md:flex-row md:items-center md:justify-between lg:mt-14">
          <h3 className="font-sans text-[clamp(28px,4vw,52px)] font-medium uppercase leading-none tracking-[-0.03em] text-forest">Vous vous y voyez ?</h3>
          <ScrollCta event="show_apartment_cta_click" location="show_apartments" className={cn(CTA_PRIMARY, 'w-full md:w-auto md:px-8')}>
            <Orbit />
            Demander les appartements disponibles
            <ArrowRight className={ARROW} />
          </ScrollCta>
        </div>
      </div>
    </SectionView>
  );
}

/* ── 4. Amenities, grouped by what they give you. ───────────────────────── */

function Amenities() {
  const [pool, spa, gym, cinema, ...services] = AMENITY_GROUPS;
  return (
    <section id="services" aria-labelledby="amenities-title" className="overflow-x-clip bg-shell py-band">
      <div className={SHELL}>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Services hôteliers</p>
            <h2 id="amenities-title" className={cn(H2, 'mt-5 text-[clamp(36px,6.4vw,92px)] text-forest', H2_LEADING)}>
              <Lines lines={['Les services d’un hôtel.', <span key="c" className={cn(SERIF, 'text-[1.1em] text-olive')}>L’intimité d’une résidence.</span>]} />
            </h2>
          </div>
          <InView amount={0.4} className="hidden shrink-0 sm:block">
            <Hotel3d float={1.2} className="size-32 lg:size-44" />
          </InView>
        </div>

        <div className="mt-9 grid gap-3 sm:gap-4 lg:mt-14 lg:grid-cols-12 lg:gap-5">
          <AmenityCard group={pool} className="lg:col-span-7" sizes="(min-width: 1024px) 56vw, 100vw" />
          <AmenityCard group={spa} className="lg:col-span-5" sizes="(min-width: 1024px) 40vw, 100vw" />
          <AmenityCard group={gym} className="lg:col-span-5" sizes="(min-width: 1024px) 40vw, 100vw" />
          <AmenityCard group={cinema} className="lg:col-span-7" sizes="(min-width: 1024px) 56vw, 100vw" />
        </div>

        <div className="mt-3 grid gap-x-5 sm:mt-4 sm:grid-cols-2 lg:mt-5">
          {services.map((service, index) => (
            <Rise key={service.benefit} delay={index * 0.08} className="flex gap-4 border-t border-forest/18 py-6 lg:py-8">
              <Pictogram name={service.items[0].icon} float={index * 0.7} className="size-14 shrink-0 lg:size-16" />
              <div>
                <p className={cn('text-[12.5px] font-medium uppercase tracking-[0.18em]', EYEBROW_LIGHT)}>{service.benefit}</p>
                <h3 className="mt-1.5 font-sans text-[clamp(24px,2.6vw,34px)] font-medium uppercase leading-none tracking-[-0.025em] text-forest">
                  {service.items[0].label}
                </h3>
                <p className="mt-2.5 max-w-[400px] text-[16px] leading-[1.5] text-forest/75">{service.line}</p>
              </div>
            </Rise>
          ))}
        </div>

        <p className="mt-2 text-[14px] text-forest/75">Visuels d’ambiance du projet, non contractuels.</p>
      </div>
    </section>
  );
}

function AmenityCard({ group, className, sizes }: { group: AmenityGroup; className?: string; sizes: string }) {
  if (!group.picture) return null;
  return (
    <Rise className={className}>
      <figure className="group relative m-0 h-[clamp(250px,68vw,420px)] overflow-hidden rounded-[18px] bg-sand/40 lg:h-[clamp(340px,32vw,460px)] lg:rounded-[22px]">
        <Picture
          picture={group.picture}
          sizes={sizes}
          className="transition-transform duration-[1100ms] ease-step group-hover:scale-[1.03]"
          style={{ objectPosition: group.position }}
        />
        {/* Only the lower part is shaded, where the caption sits: the visual itself stays untouched. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 p-4 text-cream sm:p-6">
          <h3 className="font-sans text-[clamp(22px,2.4vw,32px)] font-medium uppercase leading-none tracking-[-0.025em]">{group.benefit}</h3>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {group.items.map((item, index) => (
              <li key={item.label} className="flex items-center gap-1.5 rounded-full bg-shell/95 py-1 pl-1.5 pr-3 text-[13.5px] font-medium text-forest">
                <Pictogram name={item.icon} float={index * 0.6} className="size-8" />
                {item.label}
              </li>
            ))}
          </ul>
        </figcaption>
      </figure>
    </Rise>
  );
}

/**
 * Under a lead card, deliberately quiet: the inventory comes first, then the
 * form, then this reminder of what has already been delivered and sold.
 */
function TrackLine() {
  const range = (list: Residence[]) => (list.length > 1 ? `${list[0].number} ${list.length > 2 ? 'à' : 'et'} ${list[list.length - 1].number}` : `${list[0]?.number ?? ''}`);
  return (
    <p data-track-line className="mt-4 text-center text-[13px] leading-snug text-cream/65">
      Honest {range(delivered)} livrées
      {SOLD_SHOWN && sold.length > 0 && (
        <>
          {' '}
          <span aria-hidden="true" className="mx-1 text-cream/35">
            ·
          </span>{' '}
          Honest {range(sold)} vendues
        </>
      )}
    </p>
  );
}

/* ── 5. Track record: delivery proof kept apart from commercial demand. ─── */

function TrackRecord() {
  // The record in three figures over their pictograms — the six-line headline read as too much text
  // (client, 2026-10-18). « Honest 7 prend forme » became the third figure, the delivery year.
  const stats: { icon: TrackIconName; value: number | string; label: string }[] = [
    { icon: 'delivered', value: delivered.length, label: 'Résidences livrées' },
    ...(SOLD_SHOWN ? [{ icon: 'sold' as const, value: sold.length, label: 'Déjà vendues' }] : []),
    ...(current ? [{ icon: 'site' as const, value: FACTS.delivery.replace(/^\D+/, ''), label: 'Livraison Honest 7' }] : []),
  ];

  return (
    <section id="promoteur" aria-labelledby="track-title" className="overflow-x-clip bg-forest py-band-tight text-cream">
      <div className={SHELL}>
        {/* The eyebrow is the heading: the figures under it carry the message. */}
        <h2 id="track-title" className={cn('font-sans', EYEBROW, 'text-sand')}>
          Le promoteur
        </h2>
        <InView amount={0.3} className="mt-5">
          <ul className={cn('grid gap-2 sm:gap-4', stats.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
            {stats.map((stat, index) => (
              <li
                key={stat.icon}
                className="flex flex-col items-center gap-1 rounded-[18px] border border-cream/12 bg-white/[0.04] px-1 pb-4 pt-3 text-center lg:flex-row lg:gap-5 lg:px-6 lg:py-5 lg:text-left"
              >
                <Pictogram name={stat.icon} float={index * 0.8} symbol={stat.icon === 'sold' ? 'VENDU' : undefined} className="size-14 lg:size-20" />
                <span>
                  <span className="block font-sans text-[clamp(32px,9.5vw,60px)] font-medium leading-none tracking-[-0.03em] tabular-nums">{stat.value}</span>
                  <span className="mt-2 block text-balance text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.12em] text-sand lg:text-[13px]">
                    {stat.label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </InView>

        <div className="mt-9 lg:mt-12">
          <GroupLabel aside="Photos réelles">Preuve de livraison</GroupLabel>
          <ol className="-mx-gutter mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-gutter scroll-px-gutter [scrollbar-width:none] sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {delivered.map((residence) => (
              <li key={residence.number} className="w-[62vw] shrink-0 snap-start sm:w-[38vw] lg:w-auto">
                {/* No scroll reveal here: on phones the last photos start off-screen, in the swipe row. */}
                <div>
                  <figure className="m-0">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#243024] lg:aspect-[16/11]">
                      {residence.picture && <Picture picture={residence.picture} sizes="(min-width: 1024px) 23vw, (min-width: 641px) 38vw, 62vw" style={{ objectPosition: residence.position }} />}
                      <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-shell/95 py-1 pl-2 pr-2.5 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-forest">
                        <Check className="size-3.5 text-olive" />
                        {STATUS_LABEL[residence.status]}
                      </span>
                    </div>
                    <figcaption className="mt-3 flex items-baseline gap-3">
                      <span className="text-[13px] font-medium tabular-nums tracking-[0.14em] text-sand">0{residence.number}</span>
                      <span className="font-sans text-[19px] font-medium uppercase tracking-[-0.01em] sm:text-[21px]">{residence.name}</span>
                    </figcaption>
                  </figure>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* From lg, Honest 7 with its CTA. On phones the third figure says it, and the sticky bar carries the CTA. */}
          {current && (
            <Rise className="mt-12 hidden lg:block">
              <GroupLabel>Aujourd’hui</GroupLabel>
              <div className="mt-4 flex flex-col gap-5 rounded-[14px] bg-cream p-5 text-forest sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <span className={cn('text-[13px] font-medium tabular-nums tracking-[0.14em]', EYEBROW_LIGHT)}>0{current.number}</span>
                  <p className="mt-1.5 font-sans text-[clamp(24px,2.6vw,32px)] font-medium uppercase leading-none tracking-[-0.02em]">Honest Signature 7</p>
                  <p className={cn(SERIF, 'mt-1.5 text-[19px] leading-tight text-forest/80')}>La première résidence boutique de Marrakech.</p>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold uppercase tracking-[0.12em]">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="size-2 rounded-full bg-olive" />
                      {STATUS_LABEL[current.status]}
                    </span>
                    <span className="font-medium text-forest/75">Livraison prévue {FACTS.delivery.toLowerCase()}</span>
                  </p>
                </div>
                <ScrollCta event="availability_cta_click" location="track_record" className={cn(CTA_OUTLINE, 'min-h-12 shrink-0 px-5')}>
                  <Orbit className="-inset-px [--hs7-glint:var(--color-bronze)]" />
                  Recevoir le dossier de la résidence
                  <ArrowRight className={ARROW} />
                </ScrollCta>
              </div>
            </Rise>
          )}
      </div>
    </section>
  );
}

function GroupLabel({ children, aside }: { children: ReactNode; aside?: string }) {
  return (
    <p className="flex items-center gap-4 text-[13px] font-medium uppercase tracking-[0.2em] text-sand">
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-cream/18" />
      {aside && <span className="text-[12.5px] font-normal normal-case tracking-normal text-cream/65">{aside}</span>}
    </p>
  );
}

/* ── 6. Location ─────────────────────────────────────────────────────────── */

const LOCATION_POINTS = [
  { label: 'Hyper-centre', line: 'Une adresse intime au cœur de Guéliz, pas en périphérie.' },
  { label: 'À pied', line: 'Le Plaza à 1 minute de marche.' },
  { label: 'Neuf rare', line: 'L’un des derniers terrains disponibles de l’hyper-centre.' },
] as const;

function Location() {
  return (
    <section id="localisation" aria-labelledby="location-title" className="overflow-x-clip bg-cream py-band">
      <div className={cn(SHELL, 'grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[clamp(40px,6vw,96px)]')}>
        <div>
          <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Guéliz hyper-centre</p>
          <h2 id="location-title" className={cn(H2, 'mt-5 text-[clamp(36px,6vw,86px)] text-forest', H2_LEADING)}>
            <Lines lines={['Pas « près de Guéliz ».', <span key="a" className={cn(SERIF, 'text-[1.12em] text-olive')}>À Guéliz.</span>]} />
          </h2>

          {/* The route, drawn: residence → Plaza, one minute. */}
          <InView className="mt-9 border-t border-forest/15 pt-7 lg:mt-12" amount={0.5}>
            <p className="flex items-end gap-4">
              <span className="font-sans text-[clamp(96px,22vw,168px)] font-extralight leading-[0.74] tracking-[-0.06em] text-forest">1</span>
              <span className="pb-1">
                <span className="block font-sans text-[clamp(24px,3vw,38px)] font-medium uppercase leading-none tracking-[-0.03em] text-forest">Minute à pied</span>
                <span className={cn(SERIF, 'mt-1 block text-[clamp(22px,2.4vw,30px)] leading-tight text-forest/75')}>du Plaza.</span>
              </span>
            </p>
            <div aria-hidden="true" className="mt-7 flex items-center gap-3">
              <span className="size-3 shrink-0 rounded-full bg-forest" />
              <span className="relative h-px flex-1 bg-forest/15">
                <span className="hs7-rule absolute inset-0 block bg-forest [animation-duration:1.1s]" />
              </span>
              <span className="size-3 shrink-0 rounded-full border-2 border-forest" />
            </div>
            <p className="mt-2.5 flex justify-between text-[13px] font-medium uppercase tracking-[0.14em] text-forest/75">
              <span>Honest Signature 7</span>
              <span>Plaza</span>
            </p>
          </InView>

          <Rise className="mt-8">
            <ul className="grid gap-3.5">
              {LOCATION_POINTS.map((point) => (
                <li key={point.label} className="grid grid-cols-[112px_1fr] items-baseline gap-4 text-[16px] leading-[1.5]">
                  <span className={cn('text-[12.5px] font-medium uppercase tracking-[0.16em]', EYEBROW_LIGHT)}>{point.label}</span>
                  <span className="text-forest/80">{point.line}</span>
                </li>
              ))}
            </ul>
            {VALIDATION.landScarcityLine && (
              <p className={cn(SERIF, 'mt-7 text-[clamp(22px,2.4vw,30px)] leading-[1.2] text-forest')}>
                Quand il n’y a plus de terrain, il n’y a plus de neuf.
              </p>
            )}
          </Rise>
        </div>

        <Rise className="relative overflow-hidden rounded-[18px] lg:rounded-[24px]">
          <div className="aspect-[4/3] bg-[#1f291f] lg:aspect-[1.12]">
            <Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 52vw, 100vw" className="object-[36%_42%]" />
          </div>
        </Rise>
      </div>
    </section>
  );
}

/* ── 7. Payment schedule simulator ──────────────────────────────────────── */

function Payment() {
  return (
    <section id="echeancier" aria-labelledby="payment-title" className="bg-cream py-band-tight">
      <div className={SHELL}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
          <div>
            <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Paiement échelonné</p>
            <h2 id="payment-title" className={cn(H2, 'mt-5 text-[clamp(36px,6vw,86px)] text-forest', H2_LEADING)}>
              <Lines lines={['Votre résidence boutique,', <span key="m" className={cn(SERIF, 'text-[1.1em] text-olive')}>payée par étapes.</span>]} />
            </h2>
          </div>
          <Rise className="hidden lg:block">
            <p className="max-w-[420px] text-[18px] leading-[1.55] text-forest/80">
              30 % à la réservation, trois échéances de 15 %, puis 25 % à la remise des clés.
            </p>
          </Rise>
        </div>

        <div className="mt-10 lg:mt-14">
          <PaymentSimulator />
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-forest/15 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[16px] text-forest/75">
            Livraison prévue : <span className="font-medium text-forest">{FACTS.delivery.toLowerCase()}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── 8. Scarcity — qualitative only: there is no reliable stock figure. ─── */

const CHOICES = ['Étage', 'Orientation', 'Surface', 'Configuration'] as const;

function Scarcity() {
  return (
    <section id="choix" aria-labelledby="scarcity-title" className="overflow-x-clip bg-forest py-band text-cream">
      <div className={SHELL}>
        <p className={cn(EYEBROW, 'text-sand')}>Disponibilités actuelles</p>
        <h2 id="scarcity-title" className={cn(H2, 'mt-5 text-[clamp(34px,6.2vw,94px)]', H2_LEADING)}>
          <Lines lines={['Une adresse intime', <span key="m" className={cn(SERIF, 'text-[1.1em] text-sand')}>se choisit tôt.</span>]} />
        </h2>

        <ul className="mt-10 grid grid-cols-2 border-t border-cream/15 lg:mt-14 lg:grid-cols-4">
          {CHOICES.map((choice, index) => (
            <li
              key={choice}
              className="border-b border-cream/15 py-5 odd:border-r odd:pr-4 even:pl-4 lg:border-b-0 lg:border-r lg:px-6 lg:py-7 lg:first:pl-0 lg:last:border-r-0 lg:even:pl-6"
            >
              <Rise delay={index * 0.07}>
                <span className="text-[13px] font-medium tabular-nums tracking-[0.14em] text-sand">0{index + 1}</span>
                <p className="mt-3 font-sans text-[clamp(18px,2.2vw,30px)] font-medium uppercase leading-none tracking-[-0.02em]">{choice}.</p>
              </Rise>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-7 lg:mt-14 lg:flex-row lg:items-end lg:justify-between">
          <Rise>
            <p className={cn(SERIF, 'max-w-[620px] text-[clamp(25px,2.8vw,40px)] leading-[1.15]')}>
              Vous pouvez encore choisir. Chaque réservation réduit le choix disponible.
            </p>
          </Rise>
          <ScrollCta event="availability_cta_click" location="scarcity" className={cn(CTA_PRIMARY, 'w-full shrink-0 sm:w-auto sm:px-8')}>
            <Orbit />
            Demander les disponibilités
            <ArrowRight className={ARROW} />
          </ScrollCta>
        </div>
      </div>
    </section>
  );
}

/* ── 9. FAQ ──────────────────────────────────────────────────────────────── */

function Questions() {
  return (
    <section id="questions" aria-labelledby="faq-title" className="bg-shell py-band">
      <div className={cn(SHELL, 'grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-[clamp(40px,6vw,96px)]')}>
        <div>
          <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Questions fréquentes</p>
          <h2 id="faq-title" className={cn(H2, 'mt-5 text-[clamp(32px,4.4vw,60px)] text-forest', H2_LEADING)}>
            <Lines lines={['Avant de', <span key="d" className={cn(SERIF, 'text-[1.1em] text-olive')}>demander le dossier.</span>]} />
          </h2>
        </div>
        <Faq />
      </div>
    </section>
  );
}

/* ── 10. The closing form ────────────────────────────────────────────────── */

function FinalForm() {
  return (
    // On phones the green band closes the section and runs straight into the footer, itself green.
    <section aria-labelledby="final-title" className="overflow-x-clip bg-cream pt-band text-forest lg:pb-band">
      <div className={cn(SHELL, 'grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-[clamp(48px,6vw,104px)]')}>
        <div data-lead-intro="final" className="lg:sticky lg:top-28">
          <p className={cn(EYEBROW, EYEBROW_LIGHT)}>Votre appartement dans la résidence</p>
          <h2 id="final-title" className={cn(H2, 'mt-5 text-balance text-[clamp(32px,4.8vw,70px)]', H2_LEADING)}>
            Quels appartements sont encore{' '}
            <span className={cn(SERIF, 'text-[1.1em] text-olive')}>disponibles&nbsp;?</span>
          </h2>
          <p className="mt-6 max-w-[460px] text-[18px] leading-[1.55] text-forest/80">
            Recevez les disponibilités actuelles de la résidence et les prix lot par lot, avec les plans, la brochure et
            l’échéancier.
          </p>
        </div>
        <div className="min-w-0">
          <GlassStage className="pb-9">
            <GlassLights>
              <LeadForm placement="final" id={FINAL_FORM_ID} headingLevel="h3" title="Recevez le dossier complet" />
            </GlassLights>
            <TrackLine />
          </GlassStage>
        </div>
      </div>
    </section>
  );
}

/* ── Footer: contact and legal only. ─────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-cream/12 bg-forest pb-[calc(104px+env(safe-area-inset-bottom))] pt-11 text-cream/80 lg:pb-12">
      <div data-track-location="footer" className={cn(SHELL, 'grid gap-8 text-[15px] leading-[1.6] md:grid-cols-[1.1fr_1fr_1.5fr]')}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, live /img asset */}
          <img src="/img/logo.webp" alt="Emara Estates" width={1250} height={625} loading="lazy" className="h-12 w-auto" />
          <p className="mt-4 max-w-[300px] text-cream/75">Honest Signature 7, résidence boutique à Guéliz, Marrakech. Commercialisée par Emara Estates.</p>
        </div>
        <address className="not-italic">
          <a href={PHONE_HREF} className="block min-h-11 py-2.5 text-cream hover:underline">
            {CONTACT.phoneDisplay}
          </a>
          <a href={WHATSAPP.bare} target="_blank" rel="noopener noreferrer" className="block min-h-11 py-2.5 text-cream hover:underline">
            WhatsApp <span aria-hidden="true">↗</span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className="block min-h-11 py-2.5 text-cream hover:underline">
            {CONTACT.email}
          </a>
        </address>
        <div className="text-[14px] text-cream/70">
          <p>
            Données personnelles : vos coordonnées servent uniquement à vous recontacter au sujet de Honest Signature 7. Conformément à
            la loi 09-08, vous pouvez y accéder, les rectifier ou vous opposer à leur traitement en écrivant à {CONTACT.email}.
          </p>
          <p className="mt-3">Prix « à partir de », selon disponibilités. Échéancier indicatif. Visuels d’ambiance non contractuels.</p>
          <p className="mt-3">© 2026 Emara Estates</p>
        </div>
      </div>
    </footer>
  );
}
