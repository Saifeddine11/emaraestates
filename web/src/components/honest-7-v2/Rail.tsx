'use client';

import { useReducedMotion } from 'motion/react';
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Native horizontal scroll-snap rail. Touch swipes are the browser's own (no
 * JS gesture code, no autoplay); the arrow buttons and the counter are an
 * enhancement for mouse and keyboard users. Slides bleed to the viewport edge
 * on mobile so the next image always peeks in, which is the swipe affordance.
 */
export function Rail({
  label,
  children,
  itemClassName,
  tone = 'light',
}: {
  label: string;
  children: ReactNode;
  itemClassName: string;
  tone?: 'light' | 'dark';
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const items = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const left = track.scrollLeft;
    let nearest = 0;
    slides.forEach((slide, i) => {
      if (Math.abs(slidePosition(track, slide) - left) < Math.abs(slidePosition(track, slides[nearest]) - left)) {
        nearest = i;
      }
    });
    setIndex(nearest);
    setEdges({ start: left <= 4, end: left + track.clientWidth >= track.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(() => ((frame = 0), measure()));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const go = (delta: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const target = slides[Math.max(0, Math.min(slides.length - 1, index + delta))];
    track.scrollTo({ left: slidePosition(track, target), behavior: reduce ? 'auto' : 'smooth' });
  };

  const dark = tone === 'dark';
  const button = cn(
    'flex size-12 cursor-pointer items-center justify-center rounded-full border transition-colors duration-300 disabled:cursor-default disabled:opacity-30',
    dark
      ? 'border-cream/25 text-cream hover:border-cream/60 disabled:hover:border-cream/25'
      : 'border-forest/20 text-forest hover:border-forest/60 disabled:hover:border-forest/20',
  );

  return (
    <div role="region" aria-roledescription="carrousel" aria-label={label}>
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`${label} — faites défiler horizontalement`}
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 sm:gap-5',
          '-mx-gutter px-gutter scroll-px-gutter [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'focus-visible:outline-offset-4',
        )}
      >
        {items.map((child, i) => (
          <li
            key={i}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${items.length}`}
            className={cn('shrink-0 snap-start', itemClassName)}
          >
            {child}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-6">
        <p
          aria-live="polite"
          className={cn('text-[14px] tabular-nums tracking-[0.04em]', dark ? 'text-cream/60' : 'text-forest/55')}
        >
          <span className={dark ? 'text-cream' : 'text-forest'}>{String(index + 1).padStart(2, '0')}</span>
          {' / '}
          {String(items.length).padStart(2, '0')}
        </p>
        <div className="hidden gap-3 md:flex">
          <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label="Image précédente" className={button}>
            <Arrow direction="left" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label="Image suivante" className={button}>
            <Arrow direction="right" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Scroll offset that snaps `slide` to the track's padded start edge. */
function slidePosition(track: HTMLElement, slide: HTMLElement) {
  const padding = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
  return slide.offsetLeft - track.offsetLeft - padding;
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      {direction === 'left' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}
