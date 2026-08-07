'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { ROUTES, WHATSAPP } from '@/lib/site';

/**
 * Mid-page conversion band.
 *
 * "hyper-centre" is ringed by a hand-drawn ellipse and underscore that draw
 * themselves in. In the static build these looped forever on a 2.8s cycle; here
 * they draw once when the band scrolls into view, which reads as a deliberate
 * flourish rather than a distraction. Reduced motion renders them already drawn.
 */
export function CtaBand() {
  const prefersReducedMotion = useReducedMotion();

  const drawn = { pathLength: 1, opacity: 0.95 };
  const undrawn = { pathLength: 0, opacity: 0 };

  return (
    <section className="relative overflow-hidden bg-forest px-[clamp(28px,5vw,60px)] py-[clamp(90px,11vw,140px)] text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(155,112,64,0.1),transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-[900px]">
        <Reveal>
          <div className="mb-4 text-[14.5px] font-normal uppercase tracking-[5px] text-bronze">
            Votre Projet
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="font-serif text-[clamp(42px,4.8vw,68px)] font-normal leading-[1.12] text-cream">
            Votre appartement en{' '}
            <span className="relative inline-block whitespace-nowrap px-[0.18em]">
              hyper-centre
              <svg
                viewBox="0 0 420 120"
                aria-hidden="true"
                focusable="false"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[150%] w-[128%] -translate-x-1/2 -translate-y-1/2 overflow-visible"
              >
                <motion.ellipse
                  cx="210"
                  cy="62"
                  rx="198"
                  ry="42"
                  fill="none"
                  stroke="rgba(232,213,163,0.72)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  initial={prefersReducedMotion ? drawn : undrawn}
                  whileInView={drawn}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 1.6, ease: [0.23, 1, 0.32, 1] }}
                />
                <motion.path
                  d="M84 32 C152 18, 268 18, 336 38"
                  fill="none"
                  stroke="rgba(232,213,163,0.72)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  initial={prefersReducedMotion ? drawn : undrawn}
                  whileInView={{ pathLength: 1, opacity: 0.9 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 1.1, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
                />
              </svg>
            </span>{' '}
            de Guéliz
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-[680px] text-[clamp(17px,1.55vw,20px)] font-normal leading-[1.9] text-sand">
            Contactez-nous pour recevoir les plans, les prix détaillés et planifier une visite de nos
            appartements témoins.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-11 flex flex-wrap justify-center gap-4">
            <ButtonLink href={ROUTES.contact} variant="primary">
              Demander un rendez-vous
            </ButtonLink>
            <ButtonLink href={WHATSAPP.general} target="_blank" rel="noopener" variant="outline">
              WhatsApp
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
