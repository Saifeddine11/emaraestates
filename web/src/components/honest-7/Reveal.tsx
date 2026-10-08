'use client';

import { useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * The page's scroll reveals, without an animation library: an element is
 * marked `data-inview` the first time it is seen and CSS does the rest
 * (`.hs7-rise`, `.hs7-mask`, `.hs7-draw`, `.hs7-rule` in globals.css) — no
 * per-frame JavaScript, and no re-render: the attribute is set on the node.
 * `data-reveal` lets the root layout's <noscript> rule show everything
 * without JavaScript.
 */

function useInView(amount: number) {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          node.setAttribute('data-inview', '');
          observer.disconnect();
        },
        { threshold: amount },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [amount],
  );
}

/**
 * Marks its element `data-inview` the first time it is seen: annotation
 * strokes (`.hs7-draw`) and rules (`.hs7-rule`) inside it draw once, on arrival.
 */
export function InView({
  children,
  className,
  as: Tag = 'div',
  amount = 0.4,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'p' | 'span' | 'li';
  amount?: number;
}) {
  const ref = useInView(amount);
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

/**
 * Heading lines rising out of a mask, one after the other. The mask is what
 * is observed: the moving line starts fully clipped by it, so observing the
 * line itself would never report it as visible.
 */
export function Lines({ lines }: { lines: ReactNode[] }) {
  const ref = useInView(0.5);
  return (
    <>
      {lines.map((line, index) => (
        <span key={index} ref={ref} className="hs7-mask -mb-[0.12em] -mt-[0.2em] block overflow-hidden pb-[0.2em] pt-[0.2em]">
          <span data-reveal className="block" style={index ? { transitionDelay: `${index * 90}ms` } : undefined}>
            {line}
          </span>
        </span>
      ))}
    </>
  );
}

/** Block rising 20px into place on entering view. */
export function Rise({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useInView(0.2);
  return (
    <div ref={ref} data-reveal className={cn('hs7-rise', className)} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
