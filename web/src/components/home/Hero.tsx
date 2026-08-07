'use client';

import Image from 'next/image';
import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { useSiteReady } from '@/components/layout/SiteChrome';
import { ROUTES } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * Hero. The h1 and subtitle animate in word by word, 48ms apart — ported from
 * the legacy `heroWordAppear` keyframe including its blur/scale/lift.
 *
 * The full sentences live in `aria-label` on the h1 and p, matching the static
 * build. The word spans stay in the accessibility tree and are separated by real
 * whitespace text nodes, so the h1's textContent still reads as a normal
 * sentence for crawlers — splitting it into spans must not weld the words
 * together.
 *
 * Copy and CTAs only — `#videos` sits in the cream band below the hero.
 */

/** Three balanced lines — same copy, intentional breaks. */
const TITLE_LINES = [
  ['Apport', 'dès', '39\u00a0000\u00a0€,'],
  ['devenez', 'propriétaire'],
  ['d’un', 'appartement', 'neuf', 'à', 'Guéliz'],
] as const;

/** Global word index of the price fragment (gold accent). */
const PRICE_WORD_INDEX = 2;

const SUB_WORDS = [
  'Appartements',
  'neufs',
  'en',
  'hyper-centre',
  'de',
  'Marrakech,',
  'sélectionnés',
  'pour',
  'leur',
  'emplacement,',
  'leur',
  'standing',
  'et',
  'leur',
  'potentiel',
  'd’investissement.',
];

const TITLE_TEXT =
  'Apport dès 39 000 €, devenez propriétaire d’un appartement neuf à Guéliz';

const SUB_TEXT =
  'Appartements neufs en hyper-centre de Marrakech, sélectionnés pour leur emplacement, leur standing et leur potentiel d’investissement.';

const TITLE_WORD_COUNT = TITLE_LINES.reduce((n, line) => n + line.length, 0);

const WORD_STEP = 0.048;

function Word({
  children,
  index,
  animate,
  className,
}: {
  children: string;
  index: number;
  animate: boolean;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 18, scale: 0.94, filter: 'blur(6px)' }}
      animate={animate ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : undefined}
      transition={{ duration: 0.64, delay: index * WORD_STEP, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'inline-block will-change-transform',
        'transition-colors duration-250',
        className,
      )}
    >
      {children}
    </motion.span>
  );
}

export function Hero() {
  const ready = useSiteReady();
  const prefersReducedMotion = useReducedMotion();
  const animate = ready || Boolean(prefersReducedMotion);

  // Full-viewport cinematic hero. Extra bottom padding keeps the CTA pair
  // clear of the `#videos` desktop overlap — video position stays unchanged.
  return (
    <section className="relative z-[1] flex min-h-dvh items-center justify-center overflow-hidden pt-[clamp(96px,12vh,128px)] pb-[clamp(200px,34vh,360px)] md:min-h-[100dvh]">
      <Image
        src="/img/hero.webp"
        alt="Vue de Marrakech illustrant l'immobilier de prestige proposé par Emara Estates"
        width={1280}
        height={855}
        priority
        fetchPriority="high"
        // `max-w-none` is required: Tailwind's preflight caps images at
        // max-width 100%, which would clamp this back to the viewport width and
        // expose a bare strip on the right as the float animation drifts.
        className="absolute -inset-[5%] size-[110%] max-w-none animate-hero-float object-cover"
      />
      {/* Centered wash for the centered composition; softer bottom handoff. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.48)_42%,rgba(0,0,0,0.42)_70%,rgba(0,0,0,0.58)_100%),linear-gradient(105deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.28)_50%,rgba(0,0,0,0.22)_100%)]"
      />

      {/* Single centered content column — title, subtitle and CTAs share one axis. */}
      <div className="relative z-[2] mx-auto w-full max-w-[min(52rem,calc(100%-clamp(32px,6vw,80px)))]">
        <div className="mx-auto flex w-full flex-col items-center gap-7 text-center md:gap-8">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={animate ? { scaleX: 1 } : undefined}
            transition={{ duration: 0.65, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="h-px w-12 origin-center bg-gradient-to-r from-transparent via-bronze to-transparent"
          />

          <h1
            aria-label={TITLE_TEXT}
            className="relative flex w-full flex-col items-center gap-y-[0.2em] pb-1 font-serif text-[clamp(34px,4.6vw,52px)] font-normal leading-[1.28] tracking-[-0.016em] text-cream"
          >
            {TITLE_LINES.map((line, lineIndex) => {
              const lineStart = TITLE_LINES.slice(0, lineIndex).reduce(
                (n, words) => n + words.length,
                0,
              );
              return (
                <span
                  key={`title-line-${lineIndex}`}
                  className="block max-w-full text-center md:whitespace-nowrap"
                >
                  {line.map((word, wordIndex) => {
                    const index = lineStart + wordIndex;
                    return (
                      <Fragment key={`${word}-${index}`}>
                        <Word
                          index={index}
                          animate={animate}
                          className={
                            index === PRICE_WORD_INDEX
                              ? 'text-gold [text-shadow:0_2px_16px_rgba(0,0,0,0.28)]'
                              : 'hover:text-white'
                          }
                        >
                          {word}
                        </Word>
                        {wordIndex < line.length - 1 ? ' ' : null}
                      </Fragment>
                    );
                  })}
                  {/* Keep a real space between lines so h1 textContent stays a normal sentence. */}
                  {lineIndex < TITLE_LINES.length - 1 ? ' ' : null}
                </span>
              );
            })}
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={animate ? { opacity: 0.5, scaleX: 1 } : undefined}
              transition={{ duration: 1, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
              className="mt-1 h-px w-[min(56%,220px)] origin-center bg-gradient-to-r from-transparent via-cream/45 to-transparent"
            />
          </h1>

          <p
            aria-label={SUB_TEXT}
            className="mx-auto w-full max-w-[34rem] text-[clamp(16px,1.3vw,19px)] font-normal leading-[1.7] tracking-[0.01em] text-cream/78"
          >
            {SUB_WORDS.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <Word
                  index={TITLE_WORD_COUNT + index}
                  animate={animate}
                  className="hover:text-white"
                >
                  {word}
                </Word>{' '}
              </Fragment>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={animate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row sm:flex-wrap"
          >
            <ButtonLink
              href={ROUTES.residences}
              variant="primary"
              className="shadow-[0_16px_36px_rgba(77,49,25,0.22)]"
            >
              Voir les appartements disponibles
            </ButtonLink>
            <ButtonLink
              href={ROUTES.contact}
              variant="outline"
              tone="dark"
              className="border-cream/35 bg-[rgba(18,23,17,0.2)] backdrop-blur-[3px] hover:border-cream/70 hover:bg-cream/[0.08]"
            >
              Être rappelé par un conseiller
            </ButtonLink>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
