'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { HeroSlide } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

/**
 * The hero image, turning into a slideshow once the page has loaded.
 *
 * The first slide is `children`: the server-rendered façade, which stays the
 * LCP image and the only one preloaded. The other slides are added after the
 * `load` event, so they never compete with it, and one is only shown once its
 * file has arrived. The show stops while the hero is off screen or the tab is
 * hidden; it does not start by itself under reduced motion or data saver.
 */
export function HeroCarousel({
  children,
  slides,
  sizes,
  interval = 1500,
}: {
  children: ReactNode;
  slides: readonly HeroSlide[];
  sizes: string;
  interval?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState<readonly boolean[]>([]);
  const [playing, setPlaying] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  // 0 is the façade; slide k of `slides` is index k + 1.
  const [{ active, previous }, setShown] = useState({ active: 0, previous: 0 });

  // Bring the other slides in once the page is done loading.
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => {
        setMounted(true);
        setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }, 900);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mounted || !playing || !onScreen) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      setShown((shown) => {
        // Next slide whose file has arrived; the façade (0) always has.
        for (let step = 1; step <= slides.length + 1; step += 1) {
          const candidate = (shown.active + step) % (slides.length + 1);
          if (candidate === 0 || loaded[candidate - 1]) return candidate === shown.active ? shown : { active: candidate, previous: shown.active };
        }
        return shown;
      });
    };
    const timer = window.setInterval(tick, interval);
    return () => window.clearInterval(timer);
  }, [interval, loaded, mounted, onScreen, playing, slides.length]);

  const markLoaded = (index: number) =>
    setLoaded((state) => {
      if (state[index]) return state;
      const next = state.slice();
      next[index] = true;
      return next;
    });

  return (
    <div ref={rootRef} data-hero-carousel data-slide={active} className="relative size-full">
      {children}

      {mounted &&
        slides.map((slide, index) => {
          const position = index + 1;
          const isActive = position === active;
          // The slide being left stays opaque under the new one, so the fade never shows through to the façade —
          // except when the façade is the one coming back: then it fades out.
          const isUnder = position === previous && active !== 0 && !isActive;
          const isLeaving = position === previous && active === 0;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- static export: next/image cannot emit srcset here
            <img
              key={slide.picture.src}
              ref={(node) => {
                if (node?.complete && node.naturalWidth > 0) markLoaded(index);
              }}
              src={slide.picture.src}
              srcSet={slide.picture.srcSet}
              sizes={sizes}
              width={slide.picture.width}
              height={slide.picture.height}
              alt={slide.picture.alt}
              aria-hidden={!isActive}
              loading="lazy"
              decoding="async"
              onLoad={() => markLoaded(index)}
              style={{ objectPosition: slide.position }}
              className={cn(
                'absolute inset-0 block size-full object-cover',
                isActive && 'z-[2] opacity-100 transition-opacity duration-[600ms] ease-out motion-reduce:transition-none',
                isUnder && 'z-[1] opacity-100',
                isLeaving && 'z-[1] opacity-0 transition-opacity duration-[600ms] ease-out motion-reduce:transition-none',
                !isActive && !isUnder && !isLeaving && 'opacity-0',
              )}
            />
          );
        })}

      {mounted && (
        <>
          <div aria-hidden="true" className="absolute bottom-3.5 right-3 z-[3] flex gap-[5px] lg:bottom-6 lg:right-5 lg:gap-1.5">
            {[0, ...slides.map((_, index) => index + 1)].map((position) => (
              <span
                key={position}
                className={cn(
                  'size-[5px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.12)] transition-[background-color,transform] duration-300 lg:size-1.5',
                  position === active ? 'scale-125 bg-white' : 'bg-white/55',
                )}
              />
            ))}
          </div>
          {/* A slideshow that moves by itself must be stoppable. */}
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? 'Mettre le diaporama en pause' : 'Lancer le diaporama'}
            aria-pressed={!playing}
            className="absolute right-2 top-2 z-[3] flex size-11 cursor-pointer items-center justify-center lg:right-4 lg:top-4"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-forest/55 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-forest/80">
              {playing ? (
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5" fill="currentColor">
                  <rect x="2" y="1.5" width="3" height="9" rx="0.8" />
                  <rect x="7" y="1.5" width="3" height="9" rx="0.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5" fill="currentColor">
                  <path d="M3 1.6v8.8a.6.6 0 0 0 .92.5l6.8-4.4a.6.6 0 0 0 0-1L3.92 1.1A.6.6 0 0 0 3 1.6Z" />
                </svg>
              )}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
