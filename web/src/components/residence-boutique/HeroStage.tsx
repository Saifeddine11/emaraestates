'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Picture } from '@/components/honest-7/Picture';
import type { HeroSlide } from '@/lib/content/residence-boutique';
import { cn } from '@/lib/cn';

const INTERVAL_MS = 5200;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

/**
 * The hero's image composition: one dominant visual that cross-reveals every
 * ~5 s through the brief's sequence (architecture → pools → interiors → spa →
 * cinema), plus a floating card on desktop previewing what comes next.
 *
 * Performance rules:
 *   - slide 01 is server-rendered, eager, high priority and preloaded by the
 *     page; it is the LCP element and is painted at full opacity at once;
 *   - slides 02–05 are only mounted after `load` + idle, so they never compete
 *     with the LCP fetch, and the rotation waits until the next one decoded;
 *   - motion is transform / opacity / clip-path only; the pointer parallax
 *     writes two CSS variables, never React state.
 * Rotation pauses off-screen, in a background tab, on hover / focus, on the
 * pause button, and never starts for reduced-motion visitors.
 */
export function HeroStage({ slides, sizes, className }: { slides: HeroSlide[]; sizes: string; className?: string }) {
  // Hydrates with the server's answer (false), then switches to the real
  // preference — reading it during hydration would mismatch the server HTML.
  const reduce = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [mountRest, setMountRest] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>(() => slides.map((_, i) => i === 0));
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [cycled, setCycled] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const paused = reduce || userPaused || hovered || !visible;

  // Mount the other slides once the page has loaded and the main thread is idle.
  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const start = () => {
      const w = window as typeof window & { requestIdleCallback?: (cb: () => void) => number };
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => setMountRest(true));
      else timer = window.setTimeout(() => setMountRest(true), 300);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      const w = window as typeof window & { cancelIdleCallback?: (id: number) => void };
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Only rotate while the stage is on screen and the tab is visible.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden), {
      threshold: 0.2,
    });
    observer.observe(stage);
    const onVisibility = () => setVisible(!document.hidden && stage.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const next = (active + 1) % slides.length;

  useEffect(() => {
    if (paused || !mountRest || !loaded[next]) return;
    const timer = window.setTimeout(() => goTo(next), INTERVAL_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo is stable in behaviour
  }, [active, paused, mountRest, loaded, next]);

  function goTo(index: number) {
    if (index === active) return;
    setPrevious(active);
    setActive(index);
    setCycled(true);
  }

  // Pointer parallax: a few pixels at most, desktop pointers only.
  useEffect(() => {
    const stage = stageRef.current;
    const host = stage?.closest('section');
    if (!stage || !host || reduce || !window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      stage.style.setProperty('--px', x.toFixed(3));
      stage.style.setProperty('--py', y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduce]);

  const markLoaded = (index: number) =>
    setLoaded((prev) => (prev[index] ? prev : prev.map((value, i) => (i === index ? true : value))));

  const current = slides[active];
  const upcoming = slides[next];

  return (
    <div
      ref={stageRef}
      className={cn('relative [--px:0] [--py:0]', className)}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {/* Main image, drifting a few px against the pointer. */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[18px] bg-forest/90 transition-transform duration-700 ease-premium lg:rounded-[22px]"
        style={{ transform: 'translate3d(calc(var(--px) * -4px), calc(var(--py) * -4px), 0)' }}
      >
        {slides.map((slide, index) => {
          if (index > 0 && !mountRest) return null;
          const state = index === active ? 'active' : index === previous ? 'previous' : 'idle';
          return (
            <div
              key={slide.index}
              data-state={state}
              aria-hidden={state !== 'active'}
              className={cn(
                'absolute inset-0',
                state === 'active' && 'z-20 [clip-path:inset(0_0_0_0_round_0px)] opacity-100',
                state === 'previous' && 'z-10 opacity-100',
                state === 'idle' && 'z-0 opacity-0 [clip-path:inset(7%_7%_7%_7%_round_18px)]',
                // Only the incoming slide animates its reveal.
                state === 'active' && cycled && 'transition-[clip-path,opacity] duration-[1100ms] ease-step',
              )}
            >
              <Picture
                picture={slide.picture}
                sizes={sizes}
                priority={index === 0}
                decorative={index !== active}
                className={cn(
                  'transition-transform ease-out',
                  state === 'active' ? 'scale-100 duration-[6500ms]' : 'scale-[1.035] duration-0',
                  index === 0 && !cycled && 'motion-safe:animate-[rb-settle_6.5s_var(--ease-premium)_both]',
                )}
                style={{ objectPosition: slide.position }}
                onLoad={() => markLoaded(index)}
              />
            </div>
          );
        })}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />

        {/* Index + progress. */}
        <div className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-4 p-4 sm:p-5">
          <p aria-live="polite" className="min-w-0 truncate whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.14em] text-cream">
            <span className="tabular-nums">{current.index}</span>
            <span aria-hidden="true" className="mx-2 inline-block h-px w-3 translate-y-[-4px] bg-cream/60 sm:w-5" />
            <span key={current.index} className="motion-safe:animate-[rb-fade-up_0.6s_var(--ease-step)_both]">
              {current.label}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={slide.index}
                type="button"
                onClick={() => goTo(index)}
                disabled={index > 0 && !loaded[index]}
                aria-label={`Afficher : ${slide.label}`}
                aria-current={index === active}
                className="group hidden h-8 min-w-6 cursor-pointer items-center justify-center disabled:cursor-default sm:flex"
              >
                <span className="relative block h-[2px] w-4 overflow-hidden rounded-full bg-cream/30 sm:w-7">
                  {index === active && (
                    <span
                      key={`${active}-${paused}`}
                      className={cn(
                        'absolute inset-0 origin-left bg-cream',
                        paused ? 'scale-x-100' : 'animate-[rb-progress_linear_both]',
                      )}
                      style={paused ? undefined : { animationDuration: `${INTERVAL_MS}ms` }}
                    />
                  )}
                  {index !== active && <span className="absolute inset-0 origin-left scale-x-0 bg-cream/70 transition-transform duration-300 group-hover:scale-x-100" />}
                </span>
              </button>
            ))}
            {!reduce && (
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? 'Reprendre le diaporama' : 'Mettre le diaporama en pause'}
                className="ml-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                {userPaused ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-current"><path d="M4 2.5v11l9-5.5z" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-current"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" /></svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: a floating card previewing the next visual, drifting the
          other way for depth. Mounted with the other slides, after load. */}
      {mountRest && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-14 z-50 hidden w-[27%] max-w-[210px] xl:block"
          style={{ transform: 'translate3d(calc(var(--px) * 7px), calc(var(--py) * 7px), 0)', transition: 'transform 700ms var(--ease-premium)' }}
        >
          <div className="motion-safe:animate-[rb-float-in_0.9s_var(--ease-step)_both] rounded-[16px] bg-shell p-1.5 shadow-[0_24px_50px_-24px_rgba(30,40,30,0.55)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-sand/40">
              {slides.map((slide, index) => (
                <Picture
                  key={slide.index}
                  picture={slide.picture}
                  sizes="210px"
                  decorative
                  className={cn(
                    'absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-step',
                    index === next ? 'translate-y-0 opacity-100' : 'translate-y-[10px] opacity-0',
                  )}
                  style={{ objectPosition: slide.position }}
                />
              ))}
            </div>
            <p className="flex items-center justify-between px-1.5 pb-0.5 pt-2 text-[12px] font-medium uppercase tracking-[0.16em] text-forest/70">
              <span>À suivre</span>
              <span className="tabular-nums text-forest">{upcoming.index}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
