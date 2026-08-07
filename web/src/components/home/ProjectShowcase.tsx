'use client';

import { motion, useReducedMotion } from 'motion/react';
import { PropertySlider } from '@/components/gallery/PropertySlider';
import { ButtonLink } from '@/components/ui/Button';
import { FEATURED_SLIDES } from '@/lib/content/home';
import { ANCHORS, ROUTES } from '@/lib/site';

/**
 * Apple-style Honest Signature 7 showcase: large media + compact decision card.
 * Visual structure only — content, CTAs and brand tokens stay Emara.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

const DETAILS = [
  { label: 'Localisation', value: 'Guéliz, Marrakech' },
  { label: 'Budget', value: 'À partir de 39 000 € d’apport' },
  { label: 'Surface', value: '39–140 m²' },
] as const;

const STATS = [
  { value: '39–140', label: 'm²' },
  { value: '30%', label: 'À la réservation', note: '≈ 39 000 € d’apport' },
  { value: '2028', label: 'livraison prévue' },
] as const;

export function ProjectShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const enter = prefersReducedMotion
    ? undefined
    : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="mt-12 md:mt-14">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.95fr)_minmax(300px,1fr)] lg:gap-5">
        {/* Media */}
        <motion.div
          className="group relative min-h-[320px] overflow-hidden rounded-[32px] bg-forest/5 shadow-[0_28px_70px_-40px_rgba(45,58,45,0.45)] sm:min-h-[420px] lg:min-h-[600px]"
          {...(enter
            ? {
                initial: enter.initial,
                whileInView: enter.animate,
                viewport: { once: true, amount: 0.25 },
                transition: { duration: 0.7, ease: EASE },
              }
            : {})}
        >
          <div className="absolute inset-0 overflow-hidden">
            <PropertySlider
              images={FEATURED_SLIDES}
              className="absolute inset-0 transition-transform duration-[var(--duration-hover)] ease-premium group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 100vw, 70vw"
              priority
            />
          </div>
          <div className="pointer-events-none absolute left-5 top-5 z-[5] rounded-full bg-olive/95 px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[1.5px] text-cream sm:text-[13px]">
            Nouveau Projet
          </div>
          <div className="pointer-events-none absolute bottom-5 left-5 z-[5] max-w-[calc(100%-2.5rem)] rounded-full bg-forest/90 px-4 py-2.5 text-[14px] font-medium tracking-wide text-cream backdrop-blur-sm sm:text-[14.5px]">
            Lancement 2026 · Première livraison 2028
          </div>
        </motion.div>

        {/* Decision card */}
        <motion.article
          className="flex flex-col rounded-[32px] border border-forest/8 bg-white p-7 shadow-[0_24px_60px_-36px_rgba(45,58,45,0.35)] transition-[transform,box-shadow] duration-[var(--duration-hover)] ease-premium hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-34px_rgba(45,58,45,0.42)] sm:p-8 lg:p-9"
          {...(enter
            ? {
                initial: enter.initial,
                whileInView: enter.animate,
                viewport: { once: true, amount: 0.25 },
                transition: { duration: 0.7, delay: 0.1, ease: EASE },
              }
            : {})}
        >
          <div>
            <p className="font-serif text-[clamp(28px,2.6vw,36px)] font-normal leading-[1.15] text-forest text-balance">
              Honest Signature 7 à Guéliz Marrakech
            </p>
            <p className="mt-2.5 text-[13px] font-medium uppercase tracking-[1.4px] text-forest/70 sm:text-[13.5px]">
              Programme immobilier neuf haut standing à Guéliz, Marrakech
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-y border-forest/8 py-5">
            {STATS.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <span className="block font-serif text-[clamp(20px,2vw,26px)] font-semibold leading-none text-forest">
                  {stat.value}
                </span>
                <span className="mt-2 block text-[12.5px] font-semibold leading-snug text-forest/70 sm:text-[13px]">
                  {stat.label}
                </span>
                {'note' in stat && stat.note ? (
                  <span className="mt-0.5 block text-[12.5px] font-semibold leading-snug text-bronze sm:text-[13px]">
                    {stat.note}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <span className="block text-[12px] font-semibold uppercase tracking-[1.5px] text-forest/70">
              À partir de
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="font-serif text-[clamp(30px,3vw,38px)] font-normal leading-none tracking-[-0.01em] text-bronze">
                1,05 M MAD
              </span>
              <span className="text-[15.5px] font-normal text-forest/80">≈ 105 000 €</span>
            </div>
            <span className="mt-1.5 block text-[14px] font-medium tracking-[0.3px] text-forest/70">
              ≈ 27 000 MAD/m²
            </span>
          </div>

          {/* Key decision cues — formerly the bottom bar, now under the price. */}
          <div className="mt-5 grid grid-cols-1 gap-0 border-t border-forest/8 pt-5 sm:grid-cols-3 sm:gap-0">
            {DETAILS.map((detail, index) => (
              <div
                key={detail.label}
                className={
                  'min-w-0 py-3 first:pt-0 last:pb-0 sm:px-3 sm:py-0 sm:first:pl-0 sm:last:pr-0 ' +
                  (index > 0 ? 'border-t border-forest/8 sm:border-t-0 sm:border-l sm:pl-4' : '')
                }
              >
                <span className="block text-[12px] font-semibold uppercase tracking-[1.4px] text-forest/70">
                  {detail.label}
                </span>
                <span className="mt-1.5 block text-[14.5px] font-medium leading-snug text-forest sm:text-[15.5px]">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2.5 pt-7">
            <ButtonLink
              href={ROUTES.residences}
              variant="primary"
              className="w-full max-w-none justify-center"
            >
              Découvrir Honest Signature 7
            </ButtonLink>
            <ButtonLink
              href={ANCHORS.appartementsTemoins}
              variant="outline"
              tone="light"
              className="w-full max-w-none justify-center"
            >
              Voir les appartements témoins
            </ButtonLink>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
