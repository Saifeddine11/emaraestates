'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Premium hand-drawn oval around a short word.
 * Stroke draws once when the word enters view; optional soft pulse after.
 */

/** Closed, slightly imperfect oval — pen-like, not a geometric ellipse. */
const OVAL_PATH =
  'M 7.5 22.5 C 8.5 7.5 30 3.2 60 3 C 93 2.8 113 8.5 114.5 22.5 C 116 36.5 94 42.2 60 42.5 C 28 42.8 6.5 37 7.5 22.5 Z';

type HandDrawnCircleProps = {
  children: ReactNode;
  className?: string;
};

export function HandDrawnCircle({ children, className }: HandDrawnCircleProps) {
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
      className={
        className
          ? `hand-circle relative inline-block px-[0.22em] py-[0.3em] ${className}`
          : 'hand-circle relative inline-block px-[0.22em] py-[0.3em]'
      }
      data-drawn={showDrawn ? 'true' : 'false'}
    >
      <span className="relative z-[1]">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 122 46"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-bronze"
      >
        <path
          d={OVAL_PATH}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hand-circle-path"
        />
      </svg>
    </span>
  );
}
