import type { ReactNode } from 'react';
import type { AmenityIconName } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const AMENITY_PATHS: Record<AmenityIconName, ReactNode> = {
  pool: (
    <>
      <path d="M3 13c2 0 2 1.6 4.5 1.6S10 13 12 13s2 1.6 4.5 1.6S19 13 21 13" />
      <path d="M3 18c2 0 2 1.6 4.5 1.6S10 18 12 18s2 1.6 4.5 1.6S19 18 21 18" />
      <path d="M8 10.5V5.5a2 2 0 0 1 4 0M16 10.5V5.5a2 2 0 0 1 4 0M8 8.5h8" />
    </>
  ),
  'heated-pool': (
    <>
      <path d="M3 15c2 0 2 1.6 4.5 1.6S10 15 12 15s2 1.6 4.5 1.6S19 15 21 15" />
      <path d="M3 19.5c2 0 2 1.6 4.5 1.6s2.5-1.6 4.5-1.6 2 1.6 4.5 1.6 2.5-1.6 4.5-1.6" />
      <path d="M8 10.5c-1.2-1.3 1.2-2.4 0-3.7s1.2-2.4 0-3.7M12.5 10.5c-1.2-1.3 1.2-2.4 0-3.7s1.2-2.4 0-3.7M17 10.5c-1.2-1.3 1.2-2.4 0-3.7s1.2-2.4 0-3.7" />
    </>
  ),
  spa: (
    <>
      <path d="M12 20c-4.5-.6-7.5-3.6-8-8 3.4.2 6 1.7 8 4.6 2-2.9 4.6-4.4 8-4.6-.5 4.4-3.5 7.4-8 8Z" />
      <path d="M12 16.6c-1.7-3.8-1.7-7.5 0-11.1 1.7 3.6 1.7 7.3 0 11.1Z" />
    </>
  ),
  sauna: (
    <>
      <path d="M4 20h16M6 20v-7h12v7M9 13v7M15 13v7" />
      <path d="M9 9.5c-1-1.1 1-2 0-3.1s1-2 0-3.1M15 9.5c-1-1.1 1-2 0-3.1s1-2 0-3.1" />
    </>
  ),
  jacuzzi: (
    <>
      <path d="M3 12h18v3.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 15.5V12Z" />
      <circle cx="8.5" cy="15.8" r=".6" />
      <circle cx="12" cy="16.6" r=".6" />
      <circle cx="15.5" cy="15.8" r=".6" />
      <path d="M8 8.5c-1-1 1-1.8 0-2.8M12 8.5c-1-1 1-1.8 0-2.8M16 8.5c-1-1 1-1.8 0-2.8" />
    </>
  ),
  gym: <path d="M3 12h18M6.5 7.5v9M17.5 7.5v9M4 9.5v5M20 9.5v5" />,
  cinema: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="m10.5 8.8 4 2.2-4 2.2V8.8ZM8 20.5h8M12 17v3.5" />
    </>
  ),
  concierge: (
    <>
      <path d="M4 18.5h16M5.5 18.5a6.5 6.5 0 0 1 13 0M12 12V9.5M10.5 9.5h3" />
      <path d="M3 21h18" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M10 16.5v-9h2.8a2.7 2.7 0 0 1 0 5.4H10" />
    </>
  ),
};

/** Fine outline pictograms, one visual weight for the whole page. */
export function AmenityIcon({ name, className }: { name: AmenityIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-5 shrink-0', className)} {...STROKE}>
      {AMENITY_PATHS[name]}
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4 shrink-0', className)} {...STROKE} strokeWidth={1.7}>
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

export function ArrowDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4 shrink-0', className)} {...STROKE} strokeWidth={1.7}>
      <path d="M10 3v13M5 11l5 5 5-5" />
    </svg>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn('size-4 shrink-0', className)} {...STROKE} strokeWidth={1.8}>
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export function Phone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4 shrink-0', className)} {...STROKE} strokeWidth={1.5}>
      <path d="M6.2 3H4.5A1.5 1.5 0 0 0 3 4.6C3.3 11.4 8.6 16.7 15.4 17a1.5 1.5 0 0 0 1.6-1.5v-1.7a1 1 0 0 0-.7-1l-2.7-.9a1 1 0 0 0-1 .3l-1 1.1a8.5 8.5 0 0 1-3.9-3.9l1.1-1a1 1 0 0 0 .3-1l-.9-2.7a1 1 0 0 0-1-.7Z" />
    </svg>
  );
}

/** Hand-drawn underline, drawn left to right. `pathLength=1` lets one dash rule fit every width. */
export function Underline({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 14"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute -bottom-[0.14em] left-0 h-[0.2em] w-full overflow-visible', className)}
    >
      <path
        d="M3 9.5C58 4.6 118 3 178 3.8c42 .5 82 2.3 119 5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        className="hs7-draw"
        style={{ animationDelay: `${delay}ms` }}
      />
    </svg>
  );
}

/** Hand-drawn oval around a figure. */
export function Oval({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 70"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute -left-[0.42em] -top-[0.36em] h-[calc(100%+0.72em)] w-[calc(100%+0.84em)] overflow-visible', className)}
    >
      <path
        d="M112 5C61 3 9 15 6 36c-3 19 42 30 101 30 62 0 108-12 107-33C213 13 162 3 96 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        className="hs7-draw"
        style={{ animationDelay: `${delay}ms` }}
      />
    </svg>
  );
}

/**
 * The CTAs' turning border: a 2px ring (`.hs7-orbit`, a static mask) with a
 * light circling behind it. Goes first inside a `relative` pill; on an outlined
 * pill pass `-inset-px` so it runs over the border, and a `--hs7-glint` colour.
 */
export function Orbit({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('hs7-orbit', className)}>
      <span />
    </span>
  );
}
