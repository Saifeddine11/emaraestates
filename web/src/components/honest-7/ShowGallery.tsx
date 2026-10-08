'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Picture } from '@/components/honest-7/Picture';
import type { ShowRoom } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

/**
 * The show-apartment gallery: a native scroll-snap rail, so a swipe on a phone
 * is the browser's own gesture (no gesture code, no autoplay). Arrow buttons
 * and arrow keys serve mouse and keyboard; a counter and a progress rule
 * replace carousel dots. The slide in view settles from a slight zoom — the
 * only motion, and only once per arrival.
 */
export function ShowGallery({ rooms, label }: { rooms: ShowRoom[]; label: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const total = rooms.length;

  /** Scroll offset that snaps each slide to the track's padded start edge. */
  const positions = useCallback(() => {
    const track = trackRef.current;
    if (!track) return [];
    const padding = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return (Array.from(track.children) as HTMLElement[]).map((slide) => slide.offsetLeft - track.offsetLeft - padding);
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const all = positions();
    const left = track.scrollLeft;
    const atEnd = left + track.clientWidth >= track.scrollWidth - 4;
    let nearest = 0;
    all.forEach((position, i) => {
      if (Math.abs(position - left) < Math.abs(all[nearest] - left)) nearest = i;
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
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const go = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const all = positions();
    const clamped = Math.max(0, Math.min(all.length - 1, target));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: all[clamped], behavior: reduce ? 'auto' : 'smooth' });
  };

  const button =
    'flex size-12 cursor-pointer items-center justify-center rounded-full border border-forest/20 text-forest ' +
    'transition-[border-color,background-color,color,opacity] duration-300 hover:border-forest hover:bg-forest hover:text-cream ' +
    'disabled:cursor-default disabled:opacity-30 disabled:hover:border-forest/20 disabled:hover:bg-transparent disabled:hover:text-forest';

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        go(index + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`${label} — faites défiler horizontalement`}
        className="-mx-gutter flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-gutter scroll-px-gutter [scrollbar-width:none] focus-visible:outline-offset-4 sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {rooms.map((room, i) => (
          <li
            key={room.title}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${total} : ${room.title}`}
            className="w-[86vw] shrink-0 snap-start sm:w-[68vw] lg:w-[min(60vw,900px)]"
          >
            <figure className="m-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-sand/35 sm:aspect-[16/10]">
                <Picture
                  picture={room.picture}
                  sizes="(min-width: 1024px) 60vw, (min-width: 641px) 68vw, 86vw"
                  className={cn(
                    'pointer-events-none transition-transform duration-[1100ms] ease-step',
                    i === index ? 'scale-100' : 'scale-[1.04]',
                  )}
                />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-cream sm:p-6">
                  <span>
                    <span className="block text-[13px] font-medium tabular-nums tracking-[0.16em] text-cream/85">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mt-1 block font-sans text-[clamp(24px,3vw,40px)] font-medium uppercase leading-none tracking-[-0.02em]">
                      {room.title}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-shell/92 px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.12em] text-forest">
                    {room.residence} · livrée
                  </span>
                </figcaption>
              </div>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-5">
        <p aria-live="polite" className="shrink-0 text-[15px] font-medium tabular-nums tracking-[0.08em] text-forest/75">
          <span className="text-forest">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
        </p>
        <div aria-hidden="true" className="relative h-px flex-1 bg-forest/15">
          <span
            className="absolute inset-y-0 left-0 w-full origin-left bg-forest transition-transform duration-700 ease-step"
            style={{ transform: `scaleX(${(index + 1) / total})` }}
          />
        </div>
        <div className="hidden shrink-0 gap-2.5 md:flex">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Photo précédente" className={button}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Photo suivante" className={button}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
