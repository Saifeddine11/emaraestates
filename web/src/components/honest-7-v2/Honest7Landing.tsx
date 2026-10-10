import type { ReactNode } from 'react';
import { Faq } from '@/components/honest-7-v2/Faq';
import { HeroVideo } from '@/components/honest-7-v2/HeroVideo';
import { AmenityIcon, ArrowRight, Check, Orbit, Phone } from '@/components/honest-7-v2/Icons';
import { ScrollCta, StickyCta, WhatsAppMark } from '@/components/honest-7-v2/LandingActions';
import { LandingTracking } from '@/components/honest-7-v2/LandingTracking';
import { LeadForm } from '@/components/honest-7-v2/LeadForm';
import { LeadFormProvider } from '@/components/honest-7-v2/LeadFormState';
import { PaymentSimulator } from '@/components/honest-7-v2/PaymentSimulator';
import { Picture } from '@/components/honest-7-v2/Picture';
import { ProofGallery } from '@/components/honest-7-v2/ProofGallery';
import { Rail } from '@/components/honest-7-v2/Rail';
import { Lines, Rise } from '@/components/honest-7-v2/Reveal';
import { CTA_PRIMARY, FINAL_FORM_ID, FORM_ID } from '@/components/honest-7-v2/shared';
import {
  AMENITY_GROUPS,
  DOSSIER_CONTENTS,
  FACTS,
  HERO_POSTER,
  HERO_POSTER_SIZES,
  JOURNEY,
  MAP_IMAGE,
  OFFER,
  PAYMENT_PLAN,
  RESIDENCES,
  RESIDENCE_VIEWS,
  VALIDATION,
} from '@/lib/content/honest-signature-7-v2';
import { CONTACT, WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

/*
 * /honest-signature-7-v2/ — the landing laid out after BNG's Naïa Hills page
 * (2026-10-10): a full-screen hero with the facts in a card, the payment plan
 * as five numbered steps, what the price buys, the residence view by view,
 * the services, the delivered residences as proof, the four steps after the
 * form, and the form itself — asked for once the page has sold, with a bar
 * that follows the visitor. Same facts, same assets as the original page.
 */

const SHELL = 'mx-auto w-full max-w-[1320px] px-gutter';
const EYEBROW = 'text-[12.5px] font-semibold uppercase tracking-[0.18em]';
/** Olive darkened for small text on the light surfaces (AA contrast). */
const EYEBROW_LIGHT = 'text-[#5b6a4c]';
const NUMBER = 'text-[12.5px] font-medium tabular-nums tracking-[0.14em]';
/** Section titles: sentence case, tight, with the second line in the serif. */
const H2 = 'font-sans font-medium tracking-[-0.03em] text-forest';
const H2_LEADING = 'leading-[1.02]';
const SERIF = 'font-serif text-[1.1em] font-normal italic tracking-[-0.01em]';
const LEAD = 'text-[17px] leading-[1.55] text-forest/75 lg:text-[18px]';
/** The green a lead card stands on, lit from the side — see `GlassStage`. */
const GLASS_STAGE = 'bg-forest bg-[radial-gradient(64%_52%_at_84%_34%,rgba(122,139,104,0.5),transparent_72%)] text-cream';

const PHONE_HREF = `tel:${CONTACT.phoneDisplay.replace(/\s/g, '')}`;
const EURO = VALIDATION.euroPrices;
const UNIT = EURO ? '€' : 'MAD';

const delivered = RESIDENCES.filter((residence) => residence.status === 'delivered');
const sold = RESIDENCES.filter((residence) => residence.status === 'sold');
const lastDelivered = delivered[delivered.length - 1]?.number ?? 4;

/** "44 700" with no-break spaces — the same rounding as the simulator, so both agree. */
function formatAmount(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function schedule(price: number) {
  let allocated = 0;
  return PAYMENT_PLAN.map((step, index) => {
    const last = index === PAYMENT_PLAN.length - 1;
    const amount = last ? price - allocated : Math.round((price * step.share) / 100);
    allocated += amount;
    return { ...step, amount };
  });
}
const ENTRY_SCHEDULE = schedule(FACTS.priceFromValue);

export function Honest7Landing() {
  return (
    <LeadFormProvider>
      <LandingTracking splitPlatforms />
      <div className="bg-shell pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <main id="main-content">
          <Hero />
          <Payment />
          <Offer />
          <FirstForm />
          <Views />
          <Services />
          <Proof />
          <Journey />
          <FinalForm />
          <Questions />
        </main>
        <Footer />
      </div>
      <StickyCta />
    </LeadFormProvider>
  );
}

/* ── Shared pieces ──────────────────────────────────────────────────────── */

/** The page's one call to action: what you get, and that it costs nothing. */
function DossierCta({
  event,
  location,
  heroCta = false,
  className,
  children = 'Recevoir le dossier',
}: {
  event: 'hero_primary_cta_click' | 'availability_cta_click' | 'show_apartment_cta_click';
  location: string;
  heroCta?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ScrollCta heroCta={heroCta} event={event} location={location} className={cn(CTA_PRIMARY, 'justify-between gap-4 pl-6 pr-2.5 normal-case tracking-normal', className)}>
      <Orbit />
      <span className="flex flex-col items-start text-left leading-tight">
        <span className="text-[15.5px] font-semibold">{children}</span>
        <span className="text-[12px] font-medium text-forest/70">Gratuit · sans engagement</span>
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest/10">
        <ArrowRight className="transition-transform duration-300 ease-step group-hover/cta:translate-x-0.5" />
      </span>
    </ScrollCta>
  );
}

function WhatsAppLink({ location, className, tone = 'light' }: { location: string; className?: string; tone?: 'light' | 'dark' }) {
  return (
    <a
      href={WHATSAPP.bare}
      target="_blank"
      rel="noopener noreferrer"
      data-track-location={location}
      className={cn(
        'inline-flex min-h-12 items-center gap-2.5 rounded-full px-5 text-[15px] font-semibold transition-colors duration-300',
        tone === 'light' ? 'text-forest hover:bg-forest/[0.06]' : 'text-cream hover:bg-white/10',
        className,
      )}
    >
      <WhatsAppMark className="size-5 text-whatsapp" />
      Écrire sur WhatsApp
    </a>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(EYEBROW, EYEBROW_LIGHT, className)}>{children}</p>;
}

/* ── 1. Hero: the 3D film, the facts in a card. ───────────────────────────
   Below lg the film fills the screen, cropped a little at the top so its own
   logo stays under ours, the headline at the top and the card at the bottom
   where the film's captions are not. From lg the film is a portrait panel on
   the right of a dark stage. One <video> in both cases (HeroVideo), with no
   source until the page has loaded: the first screen costs its poster. */

const HERO_STATS = [
  { value: FACTS.priceFrom, label: 'à partir de' },
  { value: `${PAYMENT_PLAN[0].share}\u00a0%`, label: 'à la réservation' },
  { value: FACTS.delivery, label: 'livraison prévue' },
  { value: String(delivered.length), label: 'résidences déjà livrées' },
] as const;

const HERO_MEDIA = 'absolute inset-x-0 -top-[17%] h-[117%] w-full object-cover lg:inset-0 lg:h-full';

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="hs7-load relative isolate overflow-hidden bg-ink text-cream">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 hidden bg-[radial-gradient(70%_70%_at_78%_45%,rgba(61,78,61,0.9),transparent_72%)] lg:block" />

      <div className={cn(SHELL, 'flex min-h-[100svh] flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-16 lg:py-9')}>
        <div className="relative z-10 flex items-center justify-between pt-5 lg:col-start-1 lg:row-start-1 lg:pt-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, live /img asset (the white logo) */}
          <img src="/img/logo.webp" alt="Emara Estates" width={1250} height={625} className="h-9 w-auto lg:h-11" />
          <a
            href={PHONE_HREF}
            data-track-location="hero"
            aria-label={`Appeler Emara Estates au ${CONTACT.phoneDisplay}`}
            className="hidden min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 text-[14px] font-semibold tabular-nums text-cream transition-colors duration-300 hover:bg-white/10 lg:inline-flex"
          >
            <Phone />
            {CONTACT.phoneDisplay}
          </a>
        </div>

        {/* The film: the screen's background below lg, a portrait panel from lg. */}
        <div
          className={cn(
            'absolute inset-0 -z-10 overflow-hidden bg-ink',
            'lg:relative lg:inset-auto lg:z-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:h-[min(calc(100svh-72px),780px)] lg:w-auto lg:justify-self-end lg:self-center lg:aspect-[9/16] lg:rounded-[28px] lg:shadow-card-dark lg:ring-1 lg:ring-white/10',
          )}
        >
          <Picture picture={HERO_POSTER} sizes={HERO_POSTER_SIZES} priority className={cn(HERO_MEDIA, 'motion-safe:animate-[hs7-settle_3s_var(--ease-step)_both]')} />
          <HeroVideo className={HERO_MEDIA} />
          {/* Two veils below lg: one for the headline at the top, a deeper one over the film's own
              captions (« À partir de 40 000 € ») at the bottom, where the card sits. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/88 via-ink/25 via-38% to-transparent to-60% lg:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-ink via-ink/85 via-40% to-transparent lg:hidden" />
        </div>

        <div className="relative z-10 pt-9 lg:col-start-1 lg:row-start-2 lg:self-center lg:py-10">
          <p className={cn(EYEBROW, 'text-cream/80')}>Honest Signature 7 · Guéliz, Marrakech</p>
          <h1
            id="hero-title"
            className="mt-4 font-sans text-[clamp(34px,9.2vw,50px)] font-medium leading-[1.02] tracking-[-0.03em] [text-shadow:0_2px_28px_rgba(0,0,0,0.55)] lg:text-[clamp(50px,4.8vw,72px)]"
          >
            Un appartement neuf à Guéliz,
            <span className={cn(SERIF, 'block text-gold')}>dès {FACTS.priceFrom}.</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[16.5px] leading-[1.5] text-cream/85 [text-shadow:0_1px_14px_rgba(0,0,0,0.55)] lg:text-[18px]">
            Résidence avec piscines, spa et conciergerie, à 1 minute à pied du Plaza. {PAYMENT_PLAN[0].share} % à la réservation, le reste
            étalé jusqu’à la livraison, {FACTS.delivery.toLowerCase()}.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <DossierCta heroCta event="hero_primary_cta_click" location="hero" className="w-full sm:w-auto sm:min-w-[280px]" />
            <WhatsAppLink location="hero" tone="dark" className="self-start sm:self-auto" />
          </div>
        </div>

        <dl className="relative z-10 mt-auto mb-7 grid grid-cols-2 overflow-hidden rounded-[20px] border border-white/15 bg-ink/50 backdrop-blur-md lg:col-start-1 lg:row-start-3 lg:mb-0 lg:mt-0 lg:max-w-[640px] lg:grid-cols-4">
          {HERO_STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                'px-4 py-3.5 lg:px-5 lg:py-4',
                index % 2 === 0 && 'border-r border-white/12',
                index < 2 && 'border-b border-white/12 lg:border-b-0',
                index === 1 && 'lg:border-r',
              )}
            >
              <dd className="whitespace-nowrap font-sans text-[clamp(24px,6.4vw,30px)] font-medium leading-none tracking-[-0.03em] tabular-nums lg:text-[28px]">
                {stat.value}
              </dd>
              <dt className="mt-1.5 text-[13px] leading-tight text-cream/75">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ── 2. Pay in five: the plan as five steps, then the simulator for any price. ── */

function Payment() {
  return (
    <section id="paiement" aria-labelledby="payment-title" className="overflow-x-clip bg-cream py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Paiement échelonné</Eyebrow>
        <h2 id="payment-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              `Payer en ${PAYMENT_PLAN.length} fois,`,
              <span key="s" className={cn(SERIF, 'text-olive')}>
                au rythme du chantier.
              </span>,
            ]}
          />
        </h2>
        <Rise>
          <p className={cn(LEAD, 'mt-5 max-w-[620px]')}>
            Vous payez le promoteur par étapes, de la réservation à la remise des clés. Pour un appartement à {FACTS.priceFrom}, voici ce que
            cela donne.
          </p>
        </Rise>

        <ol className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-12 lg:grid-cols-5">
          {ENTRY_SCHEDULE.map((step, index) => (
            <li key={step.when} className={cn(index === ENTRY_SCHEDULE.length - 1 && 'col-span-2 lg:col-span-1')}>
              <Rise delay={index * 0.06} className="h-full">
                <div
                  className={cn(
                    'flex h-full flex-col justify-between rounded-[18px] p-4 sm:p-5',
                    index === 0 ? 'bg-forest text-cream' : index === ENTRY_SCHEDULE.length - 1 ? 'bg-gold text-forest' : 'bg-shell text-forest ring-1 ring-forest/10',
                  )}
                >
                  <div>
                    <span className={cn(NUMBER, index === 0 ? 'text-cream/65' : 'text-forest/55')}>0{index + 1}</span>
                    <p className="mt-6 font-sans text-[clamp(34px,7vw,46px)] font-medium leading-none tracking-[-0.04em] tabular-nums lg:mt-10">{step.share}&nbsp;%</p>
                    <p className={cn('mt-2 text-[15px] font-semibold leading-tight', index === 0 ? 'text-cream' : 'text-forest')}>{step.when}</p>
                  </div>
                  <p className={cn('mt-5 text-[14.5px] tabular-nums', index === 0 ? 'text-cream/75' : 'text-forest/70')}>
                    {formatAmount(step.amount)}&nbsp;{UNIT}
                    {index === ENTRY_SCHEDULE.length - 1 && <span className="block">Les clés sont à vous.</span>}
                  </p>
                </div>
              </Rise>
            </li>
          ))}
        </ol>

        <Rise className="mt-5">
          <p className="max-w-[720px] text-[15.5px] leading-[1.55] text-forest/75">
            Pour {FACTS.priceFrom} : {formatAmount(ENTRY_SCHEDULE[0].amount)}&nbsp;{UNIT} à la réservation, puis trois versements de{' '}
            {formatAmount(ENTRY_SCHEDULE[1].amount)}&nbsp;{UNIT} tous les six mois, et {formatAmount(ENTRY_SCHEDULE[4].amount)}&nbsp;{UNIT} à la remise
            des clés. Échéancier indicatif{EURO ? ', en euros au taux de change actuel' : ''} ; votre conseiller confirme les conditions du lot choisi.
          </p>
        </Rise>

        <div className="mt-12 border-t border-forest/12 pt-10 lg:mt-16 lg:pt-12">
          <h3 className={cn(H2, 'text-[clamp(24px,3vw,34px)]')}>
            Et pour <span className={cn(SERIF, 'text-olive')}>votre budget ?</span>
          </h3>
          <div className="mt-7 lg:mt-9">
            <PaymentSimulator />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <DossierCta event="availability_cta_click" location="payment" className="w-full sm:w-auto sm:min-w-[280px]" />
          <p className="text-[15px] text-forest/70">Prix lot par lot, plans et échéancier détaillé dans le dossier.</p>
        </div>
      </div>
    </section>
  );
}

/* ── 3. What the price buys. ─────────────────────────────────────────────── */

function Offer() {
  return (
    <section id="achat" aria-labelledby="offer-title" className="overflow-x-clip bg-shell py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Ce que vous achetez</Eyebrow>
        <h2 id="offer-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              'Un appartement neuf,',
              <span key="s" className={cn(SERIF, 'text-olive')}>
                au cœur de Guéliz.
              </span>,
            ]}
          />
        </h2>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:gap-5">
          {OFFER.map((point, index) => (
            <li key={point.title}>
              <Rise delay={index * 0.06} className="h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-[20px] bg-cream ring-1 ring-forest/10">
                  <div className="aspect-[16/10] overflow-hidden bg-sand/40">
                    <Picture picture={point.picture} sizes="(min-width: 640px) 50vw, 100vw" style={{ objectPosition: point.position }} />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <span className={cn(NUMBER, EYEBROW_LIGHT)}>0{index + 1}</span>
                    <h3 className="mt-2 font-sans text-[clamp(21px,2.4vw,26px)] font-medium leading-[1.1] tracking-[-0.02em] text-forest">{point.title}</h3>
                    <p className="mt-2.5 text-[15.5px] leading-[1.55] text-forest/75">{point.line}</p>
                  </div>
                </article>
              </Rise>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14px] text-forest/65">Visuels du projet, non contractuels. Photo réelle pour Honest 4.</p>
      </div>
    </section>
  );
}

/* ── 4. The form, once the page has said what is sold and how it is paid. ── */

function FirstForm() {
  return (
    <section aria-labelledby="dossier-title" className="overflow-x-clip bg-cream py-band-tight text-forest">
      <div className={cn(SHELL, 'grid items-start gap-x-[clamp(48px,6vw,104px)] gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-y-9')}>
        <div data-lead-intro="hero" className="lg:col-start-1 lg:row-start-1 lg:pt-2">
          <Eyebrow>Gratuit · sans engagement</Eyebrow>
          <h2 id="dossier-title" className={cn(H2, 'mt-4 text-[clamp(32px,4.6vw,56px)]', H2_LEADING)}>
            <Lines
              lines={[
                'Recevez le dossier',
                <span key="s" className={cn(SERIF, 'text-olive')}>
                  complet.
                </span>,
              ]}
            />
          </h2>
          <p className={cn(LEAD, 'mt-5 max-w-[520px]')}>
            Laissez vos coordonnées : un conseiller vous envoie les plans, les prix lot par lot, les disponibilités et l’échéancier, et répond
            à vos questions. Depuis la France, tout se fait à distance.
          </p>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <GlassStage>
            <GlassLights>
              <LeadForm placement="hero" id={FORM_ID} title="Recevez le dossier complet" />
            </GlassLights>
            <TrackLine />
          </GlassStage>
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <Rise>
            <ol className="grid border-t border-forest/12 sm:grid-cols-2 sm:gap-x-8">
              {DOSSIER_CONTENTS.map((item, index) => (
                <li key={item} className="flex items-baseline gap-4 border-b border-forest/12 py-3.5">
                  <span className={cn(NUMBER, EYEBROW_LIGHT)}>0{index + 1}</span>
                  <span className="text-[16px] font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ol>
          </Rise>
        </div>
      </div>
    </section>
  );
}

/**
 * The only green around a lead form: no larger than the card, its two lights
 * and the track line under it. A full-width band on phones, a rounded panel
 * beside the copy from lg.
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

function TrackLine() {
  return (
    <p data-track-line className="mt-4 text-center text-[13px] leading-snug text-cream/65">
      Honest 1 à {lastDelivered} livrées
      {sold.length > 0 && (
        <>
          {' '}
          <span aria-hidden="true" className="mx-1 text-cream/35">
            ·
          </span>{' '}
          Honest {sold[0].number} et {sold[sold.length - 1].number} vendues
        </>
      )}
    </p>
  );
}

/* ── 5. The residence, view by view — and where it stands. ──────────────── */

function Views() {
  return (
    <section id="residence" aria-labelledby="views-title" className="overflow-x-clip bg-shell py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Le projet</Eyebrow>
        <h2 id="views-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              'Honest Signature 7,',
              <span key="s" className={cn(SERIF, 'text-olive')}>
                vue par vue.
              </span>,
            ]}
          />
        </h2>
        <Rise>
          <p className={cn(LEAD, 'mt-5 max-w-[620px]')}>La façade, le hall, les appartements. Faites défiler. Les plans et les lots encore disponibles sont dans le dossier.</p>
        </Rise>

        <div className="mt-8 lg:mt-10">
          <Rail label="Vues du projet Honest Signature 7" itemClassName="w-[84vw] sm:w-[60vw] lg:w-[min(52vw,760px)]">
            {RESIDENCE_VIEWS.map((view, index) => (
              <figure key={view.picture.src} className="m-0">
                <div className="aspect-[4/3] overflow-hidden rounded-[18px] bg-sand/40 sm:aspect-[16/10]">
                  <Picture picture={view.picture} sizes="(min-width: 1024px) 52vw, (min-width: 640px) 60vw, 84vw" style={{ objectPosition: view.position }} />
                </div>
                <figcaption className="mt-3 flex items-baseline gap-3">
                  <span className={cn(NUMBER, EYEBROW_LIGHT)}>0{index + 1}</span>
                  <span className="text-[16.5px] font-semibold text-forest">{view.caption}</span>
                </figcaption>
              </figure>
            ))}
          </Rail>
        </div>

        <div className="mt-12 grid items-center gap-8 border-t border-forest/12 pt-10 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pt-12">
          <Rise>
            <Eyebrow>Sur la carte</Eyebrow>
            <h3 className={cn(H2, 'mt-3 text-[clamp(26px,3.2vw,38px)]')}>
              Pas « près de Guéliz ». <span className={cn(SERIF, 'text-olive')}>À Guéliz.</span>
            </h3>
            <p className="mt-6 flex items-end gap-4">
              <span className="font-sans text-[clamp(72px,16vw,112px)] font-extralight leading-[0.78] tracking-[-0.06em] text-forest">1</span>
              <span className="pb-1">
                <span className="block font-sans text-[clamp(20px,2.4vw,28px)] font-medium leading-none tracking-[-0.02em] text-forest">minute à pied</span>
                <span className={cn(SERIF, 'mt-1 block text-[clamp(20px,2.2vw,26px)] leading-tight text-forest/70')}>du Plaza.</span>
              </span>
            </p>
            <p className="mt-5 max-w-[440px] text-[16px] leading-[1.55] text-forest/75">
              Hyper-centre de Marrakech : commerces, cafés et bureaux à pied. L’un des derniers terrains disponibles du quartier accueille la résidence.
            </p>
          </Rise>
          <Rise className="overflow-hidden rounded-[18px] lg:rounded-[22px]">
            <div className="relative aspect-[4/3] bg-[#1f291f] lg:aspect-[16/10]">
              <Picture picture={MAP_IMAGE} sizes="(min-width: 1024px) 58vw, 100vw" className="object-[36%_42%]" />
              <p className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-shell/95 py-1.5 pl-2.5 pr-3.5 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-forest">
                <span aria-hidden="true" className="size-2 rounded-full bg-olive" />
                {FACTS.plaza}
              </p>
            </div>
          </Rise>
        </div>
      </div>
    </section>
  );
}

/* ── 6. Services: all inside the residence. ─────────────────────────────── */

function Services() {
  const withPicture = AMENITY_GROUPS.filter((group) => group.picture);
  const withoutPicture = AMENITY_GROUPS.filter((group) => !group.picture);
  return (
    <section id="services" aria-labelledby="services-title" className="overflow-x-clip bg-cream py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Services &amp; bien-être</Eyebrow>
        <h2 id="services-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              'Piscines, spa, cinéma :',
              <span key="s" className={cn(SERIF, 'text-olive')}>
                tout est dans la résidence.
              </span>,
            ]}
          />
        </h2>

        <div className="mt-8 lg:mt-10">
          <Rail label="Services de la résidence" itemClassName="w-[76vw] sm:w-[46vw] lg:w-[min(31vw,420px)]">
            {withPicture.map((group) => (
              <figure key={group.benefit} className="m-0">
                <div className="aspect-[4/3] overflow-hidden rounded-[18px] bg-sand/40">
                  <Picture picture={group.picture!} sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 76vw" style={{ objectPosition: group.position }} />
                </div>
                <figcaption className="mt-3">
                  <p className="text-[16.5px] font-semibold leading-snug text-forest">{group.benefit}.</p>
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[14.5px] text-forest/70">
                    {group.items.map((item) => (
                      <li key={item.label} className="flex items-center gap-1.5">
                        <AmenityIcon name={item.icon} className="size-4 text-olive" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </figcaption>
              </figure>
            ))}
          </Rail>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {withoutPicture.map((group) => (
            <li key={group.benefit} className="flex items-start gap-4 rounded-[16px] bg-shell p-4 ring-1 ring-forest/10">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-forest/15 text-olive">
                <AmenityIcon name={group.items[0].icon} className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold text-forest">{group.items[0].label}</span>
                <span className="mt-0.5 block text-[14.5px] leading-[1.5] text-forest/70">{group.line}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-forest/65">Visuels d’ambiance du projet, non contractuels.</p>
      </div>
    </section>
  );
}

/* ── 7. Proof: sold on plan, delivered, lived in. ───────────────────────── */

function Proof() {
  return (
    <section id="preuves" aria-labelledby="proof-title" className="overflow-x-clip bg-shell py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Du plan au réel</Eyebrow>
        <h2 id="proof-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              'Vendues sur plan.',
              <span key="s" className={cn(SERIF, 'text-olive')}>
                Livrées, habitées.
              </span>,
            ]}
          />
        </h2>
        <Rise>
          <p className={cn(LEAD, 'mt-5 max-w-[640px]')}>
            Honest 1, 2, 3 et 4 ont été vendues sur plan et livrées à Marrakech
            {sold.length > 0 ? `, Honest ${sold.map((residence) => residence.number).join(' et ')} sont vendues` : ''}. Honest 7 est la suivante. Voici
            les précédentes, en vrai.
          </p>
        </Rise>

        <div className="mt-8 lg:mt-10">
          <ProofGallery />
        </div>

        {/* Where Honest 7 stands today, and where it will be. No projection, no figure that is not already on the page. */}
        <Rise className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-[18px] bg-forest p-5 text-cream">
            <p className={cn(EYEBROW, 'text-cream/65')}>Aujourd’hui</p>
            <p className="mt-2 font-sans text-[clamp(24px,3vw,32px)] font-medium leading-none tracking-[-0.03em]">Honest 7, sur plan</p>
            <p className="mt-2.5 text-[14.5px] leading-[1.5] text-cream/80">À partir de {FACTS.priceFrom}. Le choix de l’étage, de l’orientation et de la surface.</p>
          </div>
          <div aria-hidden="true" className="hidden items-center text-forest/40 sm:flex">
            <ArrowRight className="size-6" />
          </div>
          <div className="rounded-[18px] bg-gold p-5 text-forest">
            <p className={cn(EYEBROW, 'text-forest/60')}>{FACTS.delivery}</p>
            <p className="mt-2 font-sans text-[clamp(24px,3vw,32px)] font-medium leading-none tracking-[-0.03em]">Honest 7, livrée</p>
            <p className="mt-2.5 text-[14.5px] leading-[1.5] text-forest/80">Les clés remises, comme pour Honest 1 à {lastDelivered} avant elle.</p>
          </div>
        </Rise>
      </div>
    </section>
  );
}

/* ── 8. From the file to the keys. ──────────────────────────────────────── */

function Journey() {
  return (
    <section id="parcours" aria-labelledby="journey-title" className="overflow-x-clip bg-cream py-band-tight">
      <div className={SHELL}>
        <Eyebrow>Et ensuite ?</Eyebrow>
        <h2 id="journey-title" className={cn(H2, 'mt-4 text-[clamp(32px,5vw,60px)]', H2_LEADING)}>
          <Lines
            lines={[
              'Votre appartement,',
              <span key="s" className={cn(SERIF, 'text-olive')}>
                du dossier aux clés.
              </span>,
            ]}
          />
        </h2>

        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-4">
          {JOURNEY.map((step, index) => (
            <li key={step.title}>
              <Rise delay={index * 0.06} className="h-full">
                <div className="flex h-full flex-col rounded-[18px] bg-shell p-5 ring-1 ring-forest/10 sm:p-6">
                  <span className={cn(NUMBER, EYEBROW_LIGHT)}>0{index + 1}</span>
                  <h3 className="mt-5 font-sans text-[clamp(22px,2.4vw,27px)] font-medium leading-[1.1] tracking-[-0.02em] text-forest lg:mt-8">{step.title}</h3>
                  <p className="mt-2.5 text-[15.5px] leading-[1.55] text-forest/75">{step.line}</p>
                </div>
              </Rise>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-5 border-t border-forest/12 pt-7 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-start gap-3 text-[15.5px] leading-[1.5] text-forest/80">
            <Check className="mt-1 shrink-0 text-olive" />
            <span>
              Emara Estates, Marrakech · un conseiller vous répond au{' '}
              <a href={PHONE_HREF} data-track-location="journey" className="whitespace-nowrap font-semibold text-forest tabular-nums hover:underline">
                {CONTACT.phoneDisplay}
              </a>
              , par appel ou WhatsApp.
            </span>
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <DossierCta event="availability_cta_click" location="journey" className="w-full sm:w-auto sm:min-w-[280px]" />
            <WhatsAppLink location="journey" className="self-start sm:self-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 9. The closing form. ───────────────────────────────────────────────── */

function FinalForm() {
  return (
    <section aria-labelledby="final-title" className="overflow-x-clip bg-shell pt-band-tight text-forest lg:pb-band-tight">
      <div className={cn(SHELL, 'grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-[clamp(48px,6vw,104px)]')}>
        <div data-lead-intro="final" className="lg:sticky lg:top-10">
          <Eyebrow>Gratuit · sans engagement</Eyebrow>
          <h2 id="final-title" className={cn(H2, 'mt-4 text-[clamp(32px,4.6vw,56px)]', H2_LEADING)}>
            <Lines
              lines={[
                'Quels appartements sont',
                <span key="s" className={cn(SERIF, 'text-olive')}>
                  encore disponibles ?
                </span>,
              ]}
            />
          </h2>
          <p className={cn(LEAD, 'mt-5 max-w-[460px]')}>
            Laissez votre numéro : un conseiller vous envoie les disponibilités actuelles et les prix lot par lot, avec les plans, la brochure et
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

/* ── 10. FAQ ─────────────────────────────────────────────────────────────── */

function Questions() {
  return (
    <section id="questions" aria-labelledby="faq-title" className="bg-cream py-band-tight">
      <div className={cn(SHELL, 'grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-[clamp(40px,6vw,96px)]')}>
        <div>
          <Eyebrow>Questions fréquentes</Eyebrow>
          <h2 id="faq-title" className={cn(H2, 'mt-4 text-[clamp(32px,4.4vw,56px)]', H2_LEADING)}>
            <Lines
              lines={[
                'Vos questions,',
                <span key="s" className={cn(SERIF, 'text-olive')}>
                  nos réponses.
                </span>,
              ]}
            />
          </h2>
        </div>
        <Faq />
      </div>
    </section>
  );
}

/* ── Footer: contact and legal only. ─────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-cream/12 bg-forest pb-[calc(112px+env(safe-area-inset-bottom))] pt-11 text-cream/80">
      <div data-track-location="footer" className={cn(SHELL, 'grid gap-8 text-[15px] leading-[1.6] md:grid-cols-[1.1fr_1fr_1.5fr]')}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, live /img asset */}
          <img src="/img/logo.webp" alt="Emara Estates" width={1250} height={625} loading="lazy" className="h-12 w-auto" />
          <p className="mt-4 max-w-[300px] text-cream/75">Honest Signature 7, Guéliz, Marrakech. Commercialisé par Emara Estates.</p>
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
            Données personnelles : vos coordonnées servent uniquement à vous recontacter au sujet de Honest Signature 7. Conformément à la loi
            09-08, vous pouvez y accéder, les rectifier ou vous opposer à leur traitement en écrivant à {CONTACT.email}.
          </p>
          <p className="mt-3">Prix « à partir de », selon disponibilités. Échéancier indicatif. Visuels d’ambiance non contractuels.</p>
          <p className="mt-3">© 2026 Emara Estates</p>
        </div>
      </div>
    </footer>
  );
}
