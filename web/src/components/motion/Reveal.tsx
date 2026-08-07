'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Scroll reveal primitive.
 *
 * Replaces the legacy `.reveal` / `.reveal-left` / `.reveal-right` /
 * `.reveal-scale` IntersectionObserver system. Timing and easing are ported
 * exactly: 0.9s on cubic-bezier(0.23, 1, 0.32, 1) — the site's motion signature.
 *
 * The `data-reveal` attribute is the hook for the no-JS fallback in layout.tsx,
 * mirroring the legacy `:not(.scroll-anim-ready)` escape hatch so content is
 * never invisible when scripts fail.
 */

export type RevealDirection = 'up' | 'left' | 'right' | 'scale' | 'fade';

/**
 * Phase 01 retune. Was 48px over 900ms, which is what made scrolling feel
 * heavy: long travel is what turns a reveal into an effect. Halving the
 * distance and taking a third off the duration keeps the arrival legible
 * while getting out of the reader's way.
 *
 * Deliberately one set of values rather than a mobile-specific pair. Reading
 * `matchMedia` during render would either mismatch hydration or flash on a
 * prerendered page; 24px reads correctly at both sizes, so the split is not
 * worth that cost.
 */
const DISTANCE = 24;

const OFFSETS: Record<RevealDirection, { x?: number; y?: number; scale?: number }> = {
  up: { y: DISTANCE },
  left: { x: -DISTANCE },
  right: { x: DISTANCE },
  scale: { scale: 0.96 },
  fade: {},
};

/**
 * These wrappers are always plain <div>s. Anything that needs a semantic
 * element wraps a Reveal instead of reaching through it — a polymorphic `as`
 * prop would mean building the motion component during render, which returns a
 * fresh component type each time and remounts the subtree.
 */

/**
 * Trigger threshold raised from the legacy 0.1 so an element is properly in
 * view before it moves, rather than animating while still half off-screen.
 */
const VIEWPORT = { once: true, amount: 0.18, margin: '0px 0px -40px 0px' } as const;

/** `--duration-enter`. The easing is the brand curve and is unchanged. */
const TRANSITION = { duration: 0.62, ease: [0.23, 1, 0.32, 1] } as const;

const hiddenState = (direction: RevealDirection) => {
  const offset = OFFSETS[direction];
  return { opacity: 0, x: offset.x ?? 0, y: offset.y ?? 0, scale: offset.scale ?? 1 };
};

type RevealProps = {
  children: ReactNode;
  /** Direction of travel. On viewports below `md` (769px) horizontal
   *  directions collapse to a vertical fade-up, matching the legacy CSS. */
  direction?: RevealDirection;
  /** Seconds of delay. Legacy `.stagger-N` was N * 0.12s. */
  delay?: number;
  className?: string;
  id?: string;
  /** Renders children immediately without motion. Useful for above-the-fold. */
  disabled?: boolean;
};

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className,
  id,
  disabled = false,
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (disabled || prefersReducedMotion) {
    return (
      <div className={className} id={id}>
        {children}
      </div>
    );
  }

  const variants: Variants = {
    hidden: hiddenState(direction),
    visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { ...TRANSITION, delay } },
  };

  return (
    <motion.div
      id={id}
      className={className}
      data-reveal=""
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container that staggers its `Reveal` children. Prefer this over hand-tuning
 * `delay` on each child so the rhythm stays consistent across sections.
 */
export function RevealGroup({
  children,
  className,
  // Was 0.12s. Across the eight-card rows on this site that meant nearly a
  // second before the last card had finished arriving.
  step = 0.07,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      data-reveal=""
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: step } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Child of `RevealGroup`. Inherits the parent's stagger timing. */
export function RevealItem({
  children,
  className,
  direction = 'up',
}: {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: hiddenState(direction),
        visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: TRANSITION },
      }}
    >
      {children}
    </motion.div>
  );
}
