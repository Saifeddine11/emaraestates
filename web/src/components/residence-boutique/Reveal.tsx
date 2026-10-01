'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

/*
 * Both helpers render the same element and the same initial state on the
 * server and the client, and only zero the duration for reduced motion — a
 * reduced-motion-dependent `initial` would hydrate to the server's hidden
 * inline style and never show (see appartements-temoins/FadeIn). `data-reveal`
 * lets the root layout's <noscript> rule show them without JavaScript.
 */

/**
 * Heading lines rising out of a mask, one after the other. The mask is what
 * is observed: the moving line starts fully clipped by it, so observing the
 * line itself would never report it as visible.
 */
export function Lines({ lines, className }: { lines: ReactNode[]; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <>
      {lines.map((line, index) => (
        <motion.span
          key={index}
          className={cn('block overflow-hidden pb-[0.06em]', className)}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.5 }}
        >
          <motion.span
            data-reveal
            className="block"
            variants={{ hidden: { y: '105%' }, shown: { y: '0%' } }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, delay: index * 0.09, ease: EASE }}
          >
            {line}
          </motion.span>
        </motion.span>
      ))}
    </>
  );
}

/** Block rising 24px into place on entering view. */
export function Rise({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduce ? { duration: 0 } : { duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
