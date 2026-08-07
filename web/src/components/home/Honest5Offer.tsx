'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Limited-offer callout inside the Honest 5 card.
 *
 * The wording is load-bearing: the reduced rate covers a selection of fifteen
 * apartments, not the thirty still available that the card states just above.
 * So the clarification sits inside the block, tied to the price, rather than
 * reading as a separate footnote.
 *
 * Deliberately not a link. The hover lift is a soft attention cue only — it
 * must not imply a click the card does not offer.
 *
 * Motion is layered: a one-shot entrance (fade-up, scale, tint, shimmer), then
 * a slow idle float. Reduced-motion users get a static panel.
 */

const EYEBROW = 'Offre limitée';
const PRICE = '24 000 DH/m²';
const PREVIOUS_PRICE = '25 000 DH/m²';
const CLARIFICATION = 'sur une sélection de 15 appartements';

/** Warm cream rest state — a step warmer than shell so the panel lifts off white. */
const SURFACE_REST = '#f7efe2';
/** One-pass highlight tint toward bronze cream. */
const SURFACE_PEAK = '#f0e2c8';

const SHADOW_REST = '0 18px 44px -28px rgba(155,112,64,0.55)';
const SHADOW_HOVER = '0 28px 56px -24px rgba(155,112,64,0.68)';

const SURFACE =
  'relative rounded-[22px] border border-bronze/30 bg-[#f7efe2] ' +
  'shadow-[0_18px_44px_-28px_rgba(155,112,64,0.55)] ' +
  'transition-[border-color] duration-[var(--duration-hover)] ease-premium ' +
  'hover:border-bronze/45';

const EASE = [0.23, 1, 0.32, 1] as const;

function OfferContent({ compact }: { compact?: boolean }) {
  return (
    <>
      <span
        className={
          'inline-flex items-center gap-2 rounded-full bg-bronze font-medium uppercase tracking-[2px] text-white ' +
          (compact
            ? 'px-3.5 py-1.5 text-[12.5px]'
            : 'px-3.5 py-1.5 text-[13.5px]')
        }
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-cream" />
        {EYEBROW}
      </span>

      <div className={compact ? 'mt-3.5 flex flex-col gap-1' : 'mt-5 flex flex-col gap-2 sm:gap-1.5'}>
        <span
          className={
            'font-semibold leading-[0.95] tracking-[-0.01em] text-bronze ' +
            (compact
              ? 'font-serif text-[clamp(28px,2.6vw,36px)]'
              : 'font-serif text-[clamp(38px,4.2vw,52px)]')
          }
        >
          {PRICE}
        </span>
        <span
          className={
            'font-normal leading-snug text-forest/80 ' +
            (compact ? 'text-[15px]' : 'text-[16px] sm:text-[16.5px]')
          }
        >
          au lieu de{' '}
          <span className="text-forest/55 line-through decoration-forest/35">
            {PREVIOUS_PRICE}
          </span>
        </span>
      </div>

      <p
        className={
          'border-t border-bronze/15 font-normal leading-snug text-forest/75 ' +
          (compact
            ? 'mt-3 pt-3 text-[14.5px]'
            : 'mt-4 pt-3.5 text-[15.5px] sm:text-[16px]')
        }
      >
        {CLARIFICATION}
      </p>
    </>
  );
}

export function Honest5Offer({ compact = false }: { compact?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  /** Desktop floats ±4px; mobile ±2px so the cue stays calm on small screens. */
  const [floatAmp, setFloatAmp] = useState(compact ? 2 : 4);
  const floatDelayRef = useRef<number | null>(null);
  const surfaceClass =
    SURFACE +
    (compact ? ' px-5 py-5 sm:px-6 sm:py-5' : ' px-7 py-6 sm:px-8 sm:py-7');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setFloatAmp(mq.matches || compact ? 2 : 4);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [compact]);

  useEffect(() => {
    return () => {
      if (floatDelayRef.current !== null) window.clearTimeout(floatDelayRef.current);
    };
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className={surfaceClass}>
        <OfferContent compact={compact} />
      </div>
    );
  }

  return (
    <motion.div
      className={surfaceClass}
      style={{ willChange: 'transform, box-shadow' }}
      initial={{ opacity: 0, y: 22, scale: 0.96, boxShadow: SHADOW_REST }}
      whileInView={{
        opacity: 1,
        y: 0,
        // One soft emphasis pulse after arrival — never looped.
        scale: [0.96, 1.02, 1],
        backgroundColor: [SURFACE_REST, SURFACE_PEAK, SURFACE_REST],
        boxShadow: [SHADOW_REST, SHADOW_HOVER, SHADOW_REST],
      }}
      viewport={{ once: true, amount: 0.45 }}
      whileHover={{
        y: compact ? -2 : -3,
        boxShadow: SHADOW_HOVER,
        transition: { duration: 0.4, ease: EASE },
      }}
      onViewportEnter={() => {
        if (floatDelayRef.current !== null) window.clearTimeout(floatDelayRef.current);
        // Start the idle float only after the entrance pulse has settled.
        floatDelayRef.current = window.setTimeout(() => setEntered(true), 1000);
      }}
      transition={{
        duration: 0.72,
        ease: EASE,
        scale: { duration: 0.95, times: [0, 0.55, 1], ease: EASE },
        backgroundColor: {
          duration: 1.7,
          times: [0, 0.3, 1],
          delay: 0.2,
          ease: 'easeInOut',
        },
        boxShadow: {
          duration: 1.7,
          times: [0, 0.3, 1],
          delay: 0.2,
          ease: 'easeInOut',
        },
      }}
    >
      {/* Clip only the shimmer so the float / hover lift are not cut off. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
      >
        <motion.span
          className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
          initial={{ x: '-20%', opacity: 0 }}
          whileInView={{ x: '320%', opacity: [0, 1, 1, 0] }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 1.15, delay: 0.55, ease: EASE }}
        />
      </div>

      <motion.div
        className="relative"
        animate={entered ? { y: [0, -floatAmp, 0] } : { y: 0 }}
        transition={
          entered
            ? {
                duration: 4.8,
                ease: 'easeInOut',
                repeat: Infinity,
                // Mirror keeps the turnaround soft — no bounce at either end.
                repeatType: 'mirror',
              }
            : { duration: 0 }
        }
      >
        <OfferContent compact={compact} />
      </motion.div>
    </motion.div>
  );
}
