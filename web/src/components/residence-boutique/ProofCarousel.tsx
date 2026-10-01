'use client';

import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const AUTOPLAY_MS = 5500;

export type ProofSlide = { key: string; content: ReactNode };

/**
 * Horizontal proof carousel: native scroll-snap for touch, pointer drag for a
 * mouse, arrow buttons + arrow keys for the keyboard, and an "01 / 05"
 * progress readout instead of dots.
 *
 * Autoplay is gentle (5.5 s), only runs while the carousel is on screen, pauses
 * on hover / focus, and stops for good at the visitor's first interaction.
 * Reduced-motion visitors get no autoplay at all.
 */
export function ProofCarousel({ label, slides }: { label: string; slides: ProofSlide[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const positions = useCallback(() => {
    const track = trackRef.current;
    if (!track) return [];
    const padding = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return (Array.from(track.children) as HTMLElement[]).map((slide) => slide.offsetLeft - track.offsetLeft - padding);
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const left = track.scrollLeft;
    const all = positions();
    const atEnd = left + track.clientWidth >= track.scrollWidth - 4;
    let nearest = 0;
    all.forEach((pos, i) => {
      if (Math.abs(pos - left) < Math.abs(all[nearest] - left)) nearest = i;
    });
    setIndex(atEnd ? all.length - 1 : nearest);
  }, [positions]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(() => ((frame = 0), measure()));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const go = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track) return;
      const all = positions();
      const clamped = ((target % all.length) + all.length) % all.length;
      track.scrollTo({ left: all[clamped], behavior: reduce ? 'auto' : 'smooth' });
    },
    [positions, reduce],
  );

  useEffect(() => {
    if (reduce || interacted || hovered || !inView) return;
    const timer = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [go, hovered, inView, index, interacted, reduce]);

  const stop = () => setInteracted(true);

  const onPointerDown = (event: ReactPointerEvent<HTMLUListElement>) => {
    stop();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { active: true, startX: event.clientX, startLeft: track.scrollLeft, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    if (!drag.current.active || !track) return;
    const delta = event.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(delta) > 4) {
      drag.current.moved = true;
      setDragging(true);
      track.setPointerCapture(event.pointerId);
    }
    if (drag.current.moved) track.scrollLeft = drag.current.startLeft - delta;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    const moved = drag.current.moved;
    drag.current.active = false;
    setDragging(false);
    if (!moved) return;
    // Snap to the nearest slide once released.
    const track = trackRef.current;
    if (!track) return;
    const all = positions();
    let nearest = 0;
    all.forEach((pos, i) => {
      if (Math.abs(pos - track.scrollLeft) < Math.abs(all[nearest] - track.scrollLeft)) nearest = i;
    });
    window.requestAnimationFrame(() => go(nearest));
  };

  const total = slides.length;
  const button =
    'flex size-12 cursor-pointer items-center justify-center rounded-full border border-forest/20 text-forest transition-[border-color,background-color,transform] duration-300 hover:border-forest hover:bg-forest hover:text-cream active:scale-95';

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label={label}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        stop();
        go(index + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`${label} — faites défiler horizontalement`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(event) => Math.abs(event.deltaX) > Math.abs(event.deltaY) && stop()}
        onClickCapture={(event) => {
          if (drag.current.moved) event.preventDefault();
        }}
        className={cn(
          'flex gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-5',
          '-mx-gutter px-gutter scroll-px-gutter [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'focus-visible:outline-offset-4 md:cursor-grab',
          dragging ? 'cursor-grabbing snap-none select-none' : 'snap-x snap-mandatory',
        )}
      >
        {slides.map((slide, i) => (
          <li
            key={slide.key}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${total}`}
            className="w-[84vw] shrink-0 snap-start sm:w-[64vw] lg:w-[min(58vw,860px)]"
          >
            {slide.content}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex items-center gap-6">
        <p aria-live="polite" className="shrink-0 text-[15px] font-medium tabular-nums tracking-[0.08em] text-forest/80">
          <span className="text-forest">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
        </p>
        <div aria-hidden="true" className="relative h-px flex-1 bg-forest/15">
          <span
            className="absolute inset-y-0 left-0 w-full origin-left bg-forest transition-transform duration-700 ease-step"
            style={{ transform: `scaleX(${(index + 1) / total})` }}
          />
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button type="button" onClick={() => {
              stop();
              go(index - 1);
            }} aria-label="Résidence précédente" className={button}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" onClick={() => {
              stop();
              go(index + 1);
            }} aria-label="Résidence suivante" className={button}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
