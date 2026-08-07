'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PropertySlider } from '@/components/gallery/PropertySlider';
import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { cn } from '@/lib/cn';
import { HONEST_5_SLIDES, SOLD_RESIDENCES, type SoldResidence } from '@/lib/content/home';
import { ROUTES } from '@/lib/site';
import { Showflats } from './Showflats';

/**
 * `#nos-réalisations` — listing-style gallery of Honest residences.
 *
 * Anchors: `#nos-réalisations`, `#appartement-temoin-honest`, `#residence-honest-5`.
 * Honest 5 is a larger listing card (same image→info pattern), not a hero panel.
 * Below `md`, Honest 1–4 sit in a horizontal snap carousel under Honest 5;
 * from `md` up they stay in the static grid beside it.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

/** Premium urgency red — distinct from bronze and forest. */
const URGENCY_RED = '#c23b2e';

const CARD_SURFACE =
  'group overflow-hidden rounded-[28px] border border-forest/8 bg-white ' +
  'shadow-[0_18px_44px_-30px_rgba(45,58,45,0.34)] ' +
  'transition-[transform,box-shadow] duration-[var(--duration-hover)] ease-premium ' +
  'hover:-translate-y-0.5 hover:shadow-[0_26px_52px_-28px_rgba(45,58,45,0.42)]';

function LiquidBadge({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] grid place-items-center px-4"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[rgba(255,250,244,0.32)] px-4 py-2 text-[13px] font-semibold uppercase tracking-[1.4px] text-forest shadow-[0_10px_28px_-12px_rgba(18,24,18,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-[14px] backdrop-saturate-[1.4] transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-hover)] ease-premium group-hover:-translate-y-px group-hover:border-white/50 group-hover:bg-[rgba(255,250,244,0.42)] sm:px-5 sm:py-2.5 sm:text-[14px] sm:tracking-[1.5px]">
        <span className="size-1.5 shrink-0 rounded-full bg-forest/80 shadow-[0_0_0_3px_rgba(45,58,45,0.12)]" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function UrgencyBadge({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-4 top-4 z-[6] sm:left-5 sm:top-5"
      {...(reduceMotion
        ? {}
        : {
            initial: { opacity: 0, scale: 0.92, y: -6 },
            whileInView: {
              opacity: 1,
              scale: [0.92, 1.06, 1],
              y: 0,
            },
            viewport: { once: true, amount: 0.4 },
            transition: {
              duration: 0.7,
              ease: EASE,
              scale: { duration: 0.85, times: [0, 0.55, 1], ease: EASE },
            },
          })}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[1.4px] text-white shadow-[0_12px_28px_-10px_rgba(194,59,46,0.65)] sm:px-5 sm:py-3 sm:text-[13.5px] sm:tracking-[1.5px]"
        style={{ backgroundColor: URGENCY_RED }}
      >
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-white" />
        30 dernières unités restantes
      </span>
    </motion.div>
  );
}

function ConstructionBadge() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[6] sm:bottom-5 sm:left-5">
      <span className="inline-flex items-center gap-2.5 rounded-full border border-cream/30 bg-forest px-4 py-2.5 text-[13.5px] font-semibold uppercase tracking-[1.5px] text-cream shadow-[0_14px_32px_-12px_rgba(45,58,45,0.55)] sm:px-5 sm:py-3 sm:text-[14.5px] sm:tracking-[1.6px]">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-bronze shadow-[0_0_0_4px_rgba(155,112,64,0.35)]"
        />
        En construction
      </span>
    </div>
  );
}

function SoldCard({
  residence,
  className,
  sizes = '(max-width: 768px) 78vw, (max-width: 1280px) 45vw, 280px',
}: {
  residence: SoldResidence;
  className?: string;
  sizes?: string;
}) {
  // No entrance motion — whileInView opacity fades were stranding cards at
  // opacity 0 inside the overflow-x track, and Y travel felt like auto-advance.
  return (
    <article className={cn(CARD_SURFACE, className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <PropertySlider
          images={residence.slides}
          // Parent track owns the horizontal gesture; keep frames still.
          autoplay={false}
          swipe={false}
          className="absolute inset-0 transition-transform duration-[var(--duration-hover)] ease-premium group-hover:scale-[1.03]"
          sizes={sizes}
        />
        <LiquidBadge label={residence.status} />
      </div>
      <div className="flex flex-col gap-2 px-5 py-5 sm:px-6 sm:py-6">
        <p className="font-serif text-[clamp(22px,2vw,26px)] font-normal leading-[1.2] text-forest">
          {residence.title}
        </p>
        <p className="text-[13px] font-medium uppercase tracking-[1.3px] text-forest/70 sm:text-[13.5px]">
          {residence.location}
        </p>
        <p className="mt-1 pt-0.5 text-[15px] font-semibold text-forest sm:text-[16px]">
          {residence.status}
        </p>
      </div>
    </article>
  );
}

/**
 * Honest 1–4: swipe carousel below `md`, grid cells from `md` up.
 * `md:contents` dissolves the track wrappers into the parent grid so desktop
 * layout stays a single non-duplicated DOM tree (no second set of cards).
 * No autoplay / no programmatic scroll — only the user’s swipe moves it.
 */
function SoldResidencesTrack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = SOLD_RESIDENCES.length;

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // Below `md` the track is a flex scroller; from `md` it becomes `contents`
    // and has no overflow — skip sync there.
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const child = track.firstElementChild as HTMLElement | null;
    if (!child) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || '0');
    const step = child.offsetWidth + gap;
    if (!step) return;
    setActive(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / step))));
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        syncActive();
        frame = 0;
      });
    };
    // Dots only — never call scrollTo / scrollBy from here.
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [syncActive]);

  return (
    <div className="min-w-0 md:contents">
      <div
        ref={trackRef}
        aria-roledescription="carrousel"
        aria-label="Résidences Honest livrées"
        className={cn(
          // Soft snap + native overflow scroll only — no scroll-smooth, no autoplay.
          'flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain',
          // Align with section padding; leave room on the right so card 2 peeks.
          '-mx-[clamp(28px,5vw,60px)] pl-[clamp(28px,5vw,60px)] pr-5',
          '[scroll-padding-inline:clamp(28px,5vw,60px)]',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Desktop: dissolve into the parent listing grid.
          'md:contents md:snap-none md:overflow-visible md:scroll-p-0',
        )}
      >
        {SOLD_RESIDENCES.map((residence) => (
          <div
            key={residence.id}
            className="w-[78vw] max-w-[20.5rem] shrink-0 snap-start md:w-auto md:max-w-none md:min-w-0 md:shrink md:snap-align-none"
          >
            <SoldCard residence={residence} />
          </div>
        ))}
      </div>

      <div
        className="mt-4 flex items-center justify-center gap-1.5 md:hidden"
        aria-hidden="true"
      >
        {SOLD_RESIDENCES.map((residence, index) => (
          <span
            key={residence.id}
            className={cn(
              'h-1 rounded-full transition-[width,background-color] duration-300 ease-premium',
              index === active ? 'w-5 bg-forest/55' : 'w-1.5 bg-forest/18',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Honest5ListingCard({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.article
      id="residence-honest-5"
      className={cn(
        CARD_SURFACE,
        'flex h-full scroll-mt-24 flex-col md:col-span-2 lg:col-span-2 lg:row-span-2',
        'shadow-[0_24px_56px_-32px_rgba(45,58,45,0.4)]',
        'hover:shadow-[0_32px_64px_-30px_rgba(45,58,45,0.48)]',
      )}
      {...(reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 22 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.15 },
            transition: { duration: 0.65, ease: EASE },
          })}
    >
      <div className="relative aspect-[16/10] min-h-0 flex-1 overflow-hidden lg:aspect-auto lg:min-h-[280px]">
        <PropertySlider
          images={HONEST_5_SLIDES}
          className="absolute inset-0 transition-transform duration-[var(--duration-hover)] ease-premium group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
        <UrgencyBadge reduceMotion={reduceMotion} />
        <ConstructionBadge />
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <p className="font-serif text-[clamp(26px,2.4vw,34px)] font-normal leading-[1.18] text-forest">
          Résidence Honest 5
        </p>
        <p className="text-[13.5px] font-medium uppercase tracking-[1.3px] text-forest/70 sm:text-[14px]">
          Guéliz hyper-centre, Marrakech
        </p>

        <div className="mt-2.5 border-t border-forest/8 pt-3.5">
          <p className="font-serif text-[clamp(30px,2.8vw,38px)] font-semibold leading-none tracking-[-0.01em] text-bronze">
            24 000 DH/m²
          </p>
          <p className="mt-2 text-[15.5px] font-normal leading-[1.45] text-forest/75 sm:text-[16px]">
            au lieu de{' '}
            <span className="text-forest/55 line-through decoration-forest/35">25 000 DH/m²</span>
          </p>
          <p className="mt-1.5 text-[15px] font-normal leading-[1.5] text-forest/75 sm:text-[15.5px]">
            sur une sélection de 15 appartements
          </p>
        </div>

        <p className="mt-2.5 text-[14.5px] font-medium leading-[1.45] text-forest/70 sm:text-[15px]">
          Rooftop · Piscine &amp; espace détente · Disponibilité limitée
        </p>

        <motion.div
          className="mt-5"
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 8 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, amount: 0.4 },
                transition: { duration: 0.5, delay: 0.15, ease: EASE },
              })}
        >
          <ButtonLink
            href={ROUTES.contact}
            variant="primary"
            className="w-full max-w-none justify-center px-6"
          >
            Voir les disponibilités
          </ButtonLink>
        </motion.div>

        {/* Indexed urgency / stock lines — quiet so the listing card stays light. */}
        <p className="mt-3.5 text-[13px] font-semibold uppercase tracking-[1.3px] text-bronze sm:text-[13.5px]">
          Dernières disponibilités avant clôture du stock
        </p>
        <span className="sr-only">
          30 appartements restants. En construction · Piscine rooftop. Offre limitée.
        </span>
      </div>
    </motion.article>
  );
}

export function Realisations() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="nos-réalisations"
      className="scroll-mt-24 overflow-x-clip bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <span id="appartement-temoin-honest" tabIndex={-1} className="sr-only-legacy">
        Appartements témoins Honest
      </span>

      <div className="mx-auto w-full max-w-[1320px]">
        <Reveal>
          <SectionLabel>Nos Réalisations</SectionLabel>
          <SectionTitle>
            4 résidences livrées
            <br />
            et une opportunité limitée
          </SectionTitle>
          <SectionText className="mt-6 max-w-[40rem]">
            Découvrez les programmes commercialisés avec succès aux côtés de notre promoteur
            partenaire Honest Signature, ainsi qu&apos;une disponibilité rare sur Honest 5.
          </SectionText>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-5">
          <Honest5ListingCard reduceMotion={reduceMotion} />
          <SoldResidencesTrack />
        </div>

        <Showflats />
      </div>
    </section>
  );
}
