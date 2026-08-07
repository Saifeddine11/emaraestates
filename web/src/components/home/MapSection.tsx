'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/lib/site';

/**
 * Compact forest-green plaza promo card.
 *
 * `#localisation` stays on this section so footer/deep links keep a landing
 * target after the full-bleed aerial was removed on request.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

export function MapSection() {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion
    ? undefined
    : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 } };

  return (
    <section
      id="localisation"
      className="scroll-mt-24 bg-cream px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,72px)]"
    >
      <div className="mx-auto grid w-full max-w-[1180px] items-center gap-7 rounded-[32px] bg-forest px-6 py-7 sm:gap-8 sm:px-8 sm:py-8 md:grid-cols-2 md:gap-10 md:rounded-[36px] md:px-10 md:py-9 lg:gap-12 lg:px-12 lg:py-10">
        <motion.div
          className="min-w-0"
          {...(enter
            ? {
                initial: enter.initial,
                whileInView: enter.whileInView,
                viewport: { once: true, amount: 0.35 },
                transition: { duration: 0.65, ease: EASE },
              }
            : {})}
        >
          <motion.h2
            id="mapTitle"
            className="max-w-[14ch] font-serif text-[clamp(30px,3.8vw,46px)] font-normal leading-[1.12] tracking-[-0.02em] text-cream text-balance"
          >
            Devenez propriétaire
            <br />
            <em className="italic text-[#e8d5a3]">à 1 minute à pied du Plaza</em>
          </motion.h2>

          <p className="mt-4 max-w-[34rem] text-[clamp(16.5px,1.3vw,18.5px)] font-normal leading-[1.65] text-cream/88 md:mt-5">
            Après 4 résidences livrées, notre 7ᵉ projet prend forme au cœur de Guéliz, à seulement 1
            minute du Plaza.
          </p>

          <div
            id="mapDivider"
            aria-hidden="true"
            className="mt-6 h-px w-11 bg-gradient-to-r from-bronze to-transparent"
          />

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ButtonLink
              href={ROUTES.contact}
              variant="primary"
              className="px-7 max-md:max-w-none"
            >
              Voir les disponibilités
            </ButtonLink>
            <ButtonLink
              href={ROUTES.contact}
              variant="outline"
              tone="dark"
              className="border-cream/40 px-7 max-md:max-w-none hover:border-cream/70"
            >
              Être rappelé par un conseiller
            </ButtonLink>
          </div>
        </motion.div>

        <motion.div
          className="relative aspect-[5/4] min-h-[220px] overflow-hidden rounded-[24px] sm:min-h-[260px] md:aspect-[4/3] md:min-h-0 md:rounded-[28px]"
          {...(enter
            ? {
                initial: enter.initial,
                whileInView: enter.whileInView,
                viewport: { once: true, amount: 0.3 },
                transition: { duration: 0.65, delay: 0.08, ease: EASE },
              }
            : {})}
        >
          <Image
            src="/img/maps.webp"
            alt="Carte de localisation d'Honest Signature 7 à Guéliz, à 1 minute à pied du Plaza"
            width={1672}
            height={941}
            className="absolute inset-0 size-full object-cover object-center"
            sizes="(max-width: 768px) 100vw, 48vw"
          />
        </motion.div>
      </div>
    </section>
  );
}
