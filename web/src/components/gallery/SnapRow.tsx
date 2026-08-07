'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Scroll-snap carousel.
 *
 * Replaces emara-gallery.js. Positioning is handled by native CSS scroll
 * snapping rather than transform bookkeeping, so touch, trackpad, keyboard and
 * the prev/next buttons all drive the same scroll position and cannot fall out
 * of sync. The counter is derived from scroll offset.
 *
 * `mode="mobile"` matches the legacy behaviour where the réalisations grid is a
 * static grid on desktop and only becomes a carousel below 769px.
 */

type SnapRowProps = {
  children: ReactNode;
  /** Accessible name for the carousel region. */
  ariaLabel: string;
  /** Number of items, used for the counter. */
  count: number;
  /** `always` = carousel at every width. `mobile` = carousel below `md` only. */
  mode?: 'always' | 'mobile';
  /**
   * `md:` classes that undo the carousel layout — a grid for the réalisations,
   * the marquee track for the photo ribbon. Only used when `mode="mobile"`.
   */
  desktopClassName?: string;
  /** Utility classes applied to the track when it IS a carousel. */
  trackClassName?: string;
  /** Copy shown beside the counter, e.g. "Glissez". */
  hint?: string;
  /** Palette for the controls. `dark` is for the forest-backed ribbon. */
  tone?: 'light' | 'dark';
  /** `between` puts the counter and arrows at opposite ends, `center` groups them. */
  align?: 'between' | 'center';
  /** Controls sit above the track by default; the ribbon puts them below. */
  controlsPosition?: 'above' | 'below';
  className?: string;
};

export function SnapRow({
  children,
  ariaLabel,
  count,
  mode = 'always',
  desktopClassName,
  trackClassName,
  hint,
  tone = 'light',
  align = 'between',
  controlsPosition = 'above',
  className,
}: SnapRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.firstElementChild as HTMLElement | null;
    if (!child) return;
    const step = child.offsetWidth + Number.parseFloat(getComputedStyle(track).columnGap || '0');
    if (!step) return;
    setActive(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / step))));
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        syncActive();
        frame = 0;
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [syncActive]);

  const step = (delta: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.firstElementChild as HTMLElement | null;
    if (!child) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || '0');
    track.scrollBy({ left: delta * (child.offsetWidth + gap), behavior: 'smooth' });
  };

  const controls = (
    <div
      className={cn(
        'items-center gap-4',
        mode === 'mobile' ? 'flex md:hidden' : 'flex',
        align === 'center' ? 'justify-center gap-7' : 'justify-between',
        controlsPosition === 'above' ? 'mb-6' : 'mt-6',
      )}
    >
      {align === 'center' ? (
        <ArrowButton
          tone={tone}
          label="Image précédente"
          onClick={() => step(-1)}
          disabled={active === 0}
        >
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </ArrowButton>
      ) : (
        <div className="flex items-baseline gap-3">
          {hint && (
            <span className="text-[13.5px] font-normal uppercase tracking-[3px] text-forest/75">
              {hint}
            </span>
          )}
          <Counter active={active} count={count} tone={tone} />
        </div>
      )}

      {align === 'center' ? (
        <Counter active={active} count={count} tone={tone} />
      ) : (
        <div className="flex items-center gap-2">
          <ArrowButton
            tone={tone}
            label="Image précédente"
            onClick={() => step(-1)}
            disabled={active === 0}
          >
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </ArrowButton>
          <ArrowButton
            tone={tone}
            label="Image suivante"
            onClick={() => step(1)}
            disabled={active >= count - 1}
          >
            <path d="M9.5 5.5L16 12l-6.5 6.5" />
          </ArrowButton>
        </div>
      )}

      {align === 'center' && (
        <ArrowButton
          tone={tone}
          label="Image suivante"
          onClick={() => step(1)}
          disabled={active >= count - 1}
        >
          <path d="M9.5 5.5L16 12l-6.5 6.5" />
        </ArrowButton>
      )}
    </div>
  );

  return (
    <div className={className} aria-roledescription="carrousel" aria-label={ariaLabel}>
      {controlsPosition === 'above' && controls}

      <div
        ref={trackRef}
        className={cn(
          // `[scrollbar-width:none]` keeps the native scrollbar from breaking
          // the composition while leaving the element genuinely scrollable.
          'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          trackClassName,
          mode === 'mobile' && cn('md:snap-none md:overflow-visible', desktopClassName),
        )}
      >
        {children}
      </div>

      {controlsPosition === 'below' && controls}
    </div>
  );
}

function Counter({
  active,
  count,
  tone,
}: {
  active: number;
  count: number;
  tone: 'light' | 'dark';
}) {
  return (
    <strong
      aria-live="polite"
      className={cn(
        'min-w-14 text-center text-[15px] font-normal tabular-nums tracking-[2px]',
        tone === 'dark' ? 'text-cream/85' : 'text-forest',
      )}
    >
      {active + 1} / {count}
    </strong>
  );
}

function ArrowButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: 'light' | 'dark';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-13 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ease-premium disabled:cursor-not-allowed disabled:opacity-30 md:size-10',
        tone === 'dark'
          ? 'border-sand/30 text-cream hover:border-cream/70'
          : 'border-forest/15 text-forest hover:border-bronze hover:text-bronze',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
