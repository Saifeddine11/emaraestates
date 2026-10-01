'use client';

import { motion, useReducedMotion } from 'motion/react';
import { PAYMENT_STEPS } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

export function PaymentTimeline() {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-px bg-forest/15 lg:hidden">
        <motion.span data-reveal className="absolute inset-0 origin-top bg-forest" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: reduce ? 0 : 1.4, ease: EASE }} />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[11px] hidden h-px bg-forest/15 lg:block">
        <motion.span data-reveal className="absolute inset-0 origin-left bg-forest" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: reduce ? 0 : 1.4, ease: EASE }} />
      </div>
      <ol className="relative grid gap-9 lg:grid-cols-5 lg:gap-6">
        {PAYMENT_STEPS.map((step, index) => {
          const bookend = index === 0 || index === PAYMENT_STEPS.length - 1;
          return (
            <motion.li key={step.when} data-reveal initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.12 + index * 0.15, ease: EASE }} className="relative grid grid-cols-[24px_1fr] gap-x-5 lg:block">
              <span aria-hidden="true" className={cn('relative z-10 mt-1 flex size-[23px] items-center justify-center rounded-full border lg:mt-0', bookend ? 'border-forest bg-forest' : 'border-forest/40 bg-cream')}><span className={cn('size-[7px] rounded-full', bookend ? 'bg-gold' : 'bg-forest/50')} /></span>
              <div className="lg:mt-8">
                <p className="text-[12px] font-medium uppercase tracking-[.16em] text-olive">Étape 0{index + 1}</p>
                <p className={cn('mt-2 font-sans font-light leading-[.85] tracking-[-.05em] text-forest tabular-nums', bookend ? 'text-[clamp(62px,7vw,104px)]' : 'text-[clamp(50px,5vw,76px)]')}>{step.share}<span className="ml-1 align-top text-[.42em] font-normal tracking-normal">%</span></p>
                <p className="mt-3 text-[17px] font-medium leading-tight text-forest">{step.when}</p>
                <p className="mt-1 text-[14px] text-forest/65">{step.note}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
