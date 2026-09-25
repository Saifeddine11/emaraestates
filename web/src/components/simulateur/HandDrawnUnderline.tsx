'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Hand-drawn stroke under a short word — the underline sibling of
 * HandDrawnCircle. Reuses its `hand-circle` draw-on-view styles so both marks
 * animate identically.
 */

/** Slightly rising, pen-like stroke with a soft tail — not a straight rule. */
const STROKE_PATH = 'M 2 9 C 22 5.5 48 4.2 74 4.8 C 92 5.2 106 6.4 118 8.6';

export function HandDrawnUnderline({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(false);
  const showDrawn = Boolean(prefersReducedMotion) || drawn;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const node = wrapRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setDrawn(true);
        observer.disconnect();
      },
      { threshold: 0.55, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <span
      ref={wrapRef}
      className="hand-circle relative inline-block whitespace-nowrap"
      data-drawn={showDrawn ? 'true' : 'false'}
    >
      <span className="relative z-[1]">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.14em] left-[-0.04em] z-0 h-[0.26em] w-[calc(100%+0.08em)] overflow-visible text-bronze"
      >
        <path
          d={STROKE_PATH}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hand-circle-path"
        />
      </svg>
    </span>
  );
}
