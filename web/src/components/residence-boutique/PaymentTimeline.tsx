'use client';

import { motion, useReducedMotion } from 'motion/react';
import { PAYMENT_STEPS } from '@/lib/content/residence-boutique';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;
const DRAW_S = 1.4;

/**
 * 30 → 15 → 15 → 15 → 25, as a timeline read left to right (top to bottom
 * on phones). The rule draws once on entering view and each milestone lands
 * as the line reaches it. Nothing to compute: the percentages are the
 * headline, the moment is the label. Only transform / opacity animate.
 */
export function PaymentTimeline() {
  const reduce = useReducedMotion();
  const count = PAYMENT_STEPS.length;
  const viewport = { once: true, amount: 0.35 } as const;

  return (
    <div className="relative">
      {/* The rule: vertical below lg, horizontal from lg — each draws along its own axis. */}
      <div aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-px bg-forest/15 lg:hidden">
        <motion.span
          className="absolute inset-0 origin-top bg-forest"
          data-reveal
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={viewport}
          transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE }}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[11px] hidden h-px bg-forest/15 lg:block">
        <motion.span
          className="absolute inset-0 origin-left bg-forest"
          data-reveal
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewport}
          transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE }}
        />
      </div>

      <ol className="relative grid gap-9 lg:grid-cols-5 lg:gap-6">
        {PAYMENT_STEPS.map((step, index) => {
          const bookend = index === 0 || index === count - 1;
          return (
            <motion.li
              key={step.when}
              data-reveal
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.15 + (index / (count - 1)) * (DRAW_S - 0.3), ease: EASE }}
              className="relative grid grid-cols-[24px_1fr] gap-x-5 lg:block"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 mt-1 flex size-[23px] items-center justify-center rounded-full border lg:mt-0',
                  bookend ? 'border-forest bg-forest' : 'border-forest/40 bg-cream',
                )}
              >
                <span className={cn('size-[7px] rounded-full', bookend ? 'bg-gold' : 'bg-forest/50')} />
              </span>
              <div className="lg:mt-8">
                <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#5b6a4c]">
                  Étape 0{index + 1}
                </p>
                <p
                  className={cn(
                    'mt-2 font-sans font-light leading-[0.85] tracking-[-0.05em] text-forest tabular-nums',
                    bookend ? 'text-[clamp(64px,7.4vw,112px)]' : 'text-[clamp(52px,5.6vw,84px)]',
                  )}
                >
                  {step.share}
                  <span className="ml-1 align-top text-[0.42em] font-normal tracking-normal">%</span>
                </p>
                <p className="mt-3 text-[18px] font-medium leading-tight text-forest">{step.when}</p>
                <p className="mt-1 text-[15px] text-forest/70">{step.note}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
