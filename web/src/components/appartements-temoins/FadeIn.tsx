'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Subtle fade-up on entering view.
 *
 * Deliberately not the shared `Reveal`: that one renders a `motion.div` on the
 * server but a plain `div` for reduced-motion visitors, and hydration keeps the
 * server's inline `opacity: 0` — the content never appears. This always
 * renders the same element and only drops the movement and duration.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
