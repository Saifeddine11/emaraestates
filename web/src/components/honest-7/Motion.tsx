'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Image that opens from a slightly inset frame as it enters view. Only
 * `clip-path` animates, so the box never moves and nothing shifts around it.
 */
export function MaskReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { clipPath: 'inset(7% 7% 7% 7% round 28px)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.1, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slow vertical drift on a large architectural image. The image is scaled a
 * touch so the drift never exposes an edge; the building is never distorted,
 * only moved.
 */
export function Parallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y, scale: 1.09 }} className="size-full will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

const SEGMENTS = [
  { share: 30, tone: 'bg-cream text-forest' },
  { share: 15, tone: 'bg-cream/20 text-cream' },
  { share: 15, tone: 'bg-cream/20 text-cream' },
  { share: 15, tone: 'bg-cream/20 text-cream' },
  { share: 25, tone: 'bg-gold text-forest' },
] as const;

/**
 * The 30 / 15 × 3 / 25 plan drawn to scale, so the split reads before any
 * label does. Segments grow from the left once, on entering view.
 */
export function PaymentBar({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={className} aria-hidden="true">
      <div className="flex h-14 gap-1 sm:h-16">
        {SEGMENTS.map((segment, index) => (
          <motion.div
            key={index}
            initial={reduce ? false : { scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
            style={{ flexBasis: `${segment.share}%` }}
            className={`flex min-w-0 origin-left items-center justify-center rounded-[10px] text-[14px] font-medium tabular-nums sm:text-[15px] ${segment.tone}`}
          >
            {segment.share}&nbsp;%
          </motion.div>
        ))}
      </div>
      <div className="mt-3 hidden text-[14px] text-cream/60 sm:flex">
        <span style={{ flexBasis: '30%' }}>Réservation</span>
        <span style={{ flexBasis: '45%' }} className="border-t border-cream/25 pt-2 text-center">Tous les 6 mois × 3</span>
        <span style={{ flexBasis: '25%' }} className="text-right">Remise des clés</span>
      </div>
    </div>
  );
}
