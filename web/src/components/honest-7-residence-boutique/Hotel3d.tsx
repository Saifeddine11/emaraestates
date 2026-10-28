'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/*
 * The boutique residence as a pictogram in relief, drawn like the page's other
 * ones (honest-7/Icons3d.tsx) and animated by the same classes in globals.css
 * once its block has been seen: it floats, the lobby and a few windows light
 * up in turn, the parasol on the roof terrace sways and a glint twinkles.
 * Arcades on the ground floor and planted balconies, like the façade.
 *
 * Its gradient ids are its own; when it appears twice, both copies stay on
 * screen, so the first copy's definitions always resolve. A client component
 * so that its SVG is in the HTML once, not repeated in the RSC payload.
 */

type Point = readonly [number, number];
const points = (list: Point[]) => list.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ');
const delay = (seconds: number) => ({ animationDelay: `${seconds}s` });

/** A point of the long, lit face (s across, t down) and of the short face in shadow. */
const left = (s: number, t: number): Point => [10 + 26 * s, 22 + 13 * s + 22 * t];
const right = (s: number, t: number): Point => [36 + 18 * s, 35 - 9 * s + 22 * t];
const pane = (face: typeof left, s: number, t: number, w: number, h: number) => points([face(s, t), face(s + w, t), face(s + w, t + h), face(s, t + h)]);

/** An arcade of the ground floor: two jambs and a rounded head, on the sheared face. */
function arch(s: number) {
  const [a, b, c, d] = [left(s, 1), left(s, 0.7), left(s + 0.2, 0.7), left(s + 0.2, 1)];
  const [cx, cy] = left(s + 0.1, 0.52);
  return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}Q${cx} ${cy} ${c[0]} ${c[1]}L${d[0]} ${d[1]}Z`;
}

const COLUMNS = [0.1, 0.4, 0.7];
const ROWS = [0.1, 0.38];
/** The windows that light up, and when. */
const LIT: Record<string, number> = { '0-1': 0.5, '1-0': 1.3, '2-1': 2.1 };

export function Hotel3d({ className, float = 0 }: { className?: string; float?: number }) {
  const id = 'hs7b-hotel';
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn('hs7-3d shrink-0 overflow-visible', className)}
      style={{ '--hs7-3d-float': `${-float}s` } as CSSProperties}
    >
      <defs>
        <radialGradient id={`${id}-ground`}>
          <stop offset="0" stopColor="#2d3a2d" stopOpacity="0.28" />
          <stop offset="1" stopColor="#2d3a2d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-left`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#e6dccb" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6c9b1" />
          <stop offset="1" stopColor="#b3a48b" />
        </linearGradient>
        <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#efe6d4" />
          <stop offset="1" stopColor="#d9ccb4" />
        </linearGradient>
        <linearGradient id={`${id}-parasol`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4e6c4" />
          <stop offset="0.55" stopColor="#d2b178" />
          <stop offset="1" stopColor="#a8834a" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c6d1b7" />
          <stop offset="1" stopColor="#7a8b68" />
        </linearGradient>
      </defs>

      <ellipse className="hs7-3d-shadow" cx="33" cy="57.5" rx="25" ry="3.6" fill={`url(#${id}-ground)`} />
      <g className="hs7-3d-float">
        {/* The block: a long lit face, a short one in shadow, the roof terrace. */}
        <polygon points={points([left(0, 0), left(1, 0), left(1, 1), left(0, 1)])} fill={`url(#${id}-left)`} />
        <polygon points={points([right(0, 0), right(1, 0), right(1, 1), right(0, 1)])} fill={`url(#${id}-right)`} />
        <polygon points={points([left(0, 0), [28, 13], right(1, 0), left(1, 0)])} fill={`url(#${id}-roof)`} />

        {/* Windows: some light up in turn. */}
        {COLUMNS.flatMap((s, column) =>
          ROWS.map((t, row) => {
            const key = `${column}-${row}`;
            return key in LIT ? (
              <polygon key={key} className="hs7-3d-lit" style={delay(LIT[key])} points={pane(left, s, t, 0.2, 0.16)} fill="#d2b178" />
            ) : (
              <polygon key={key} points={pane(left, s, t, 0.2, 0.16)} fill="#2d3a2d" fillOpacity="0.28" />
            );
          }),
        )}
        {[0.15, 0.57].flatMap((s) => [0.1, 0.38, 0.72].map((t) => <polygon key={`r-${s}-${t}`} points={pane(right, s, t, 0.28, 0.16)} fill="#2d3a2d" fillOpacity="0.4" />))}

        {/* Planted balconies under each floor. */}
        <g fill="none" stroke="#7a8b68" strokeWidth="1.6" strokeLinecap="round">
          {[0.31, 0.59].map((t) => (
            <path key={t} d={`M${left(0.03, t).join(' ')}L${left(0.97, t).join(' ')}`} />
          ))}
        </g>

        {/* The arcades; the middle one is the lobby, lit. */}
        <path d={arch(0.1)} fill="#2d3a2d" />
        <path d={arch(0.4)} fill="#2d3a2d" />
        <path className="hs7-3d-lit" style={delay(0)} d={arch(0.4)} fill="#ecd6a6" fillOpacity="0.85" />
        <path d={arch(0.7)} fill="#2d3a2d" />

        {/* The roof terrace: a plant and a parasol that sways. */}
        <g className="hs7-3d-sway">
          <path d="M44.5 25.5C41.5 24.6 40 22 40.6 19.4C43.2 20.2 44.7 22.6 44.5 25.5Z" fill={`url(#${id}-leaf)`} />
          <path d="M45.2 25.5C44 21 46.4 17.4 50.6 16.8C50.6 21.2 48.4 24.6 45.2 25.5Z" fill={`url(#${id}-leaf)`} />
        </g>
        <g className="hs7-3d-sway" style={delay(0.8)}>
          <path d="M26 22V12.5" stroke="#8a7d68" strokeWidth="1" strokeLinecap="round" />
          <path d="M18.5 14.6Q26 7.6 33.5 14.6Q26 12.6 18.5 14.6Z" fill={`url(#${id}-parasol)`} />
        </g>

        {/* A glint, not a star rating. */}
        <path
          className="hs7-3d-twinkle"
          d="M53 4.5L54 7.9L57.4 8.9L54 9.9L53 13.3L52 9.9L48.6 8.9L52 7.9Z"
          fill="#d2b178"
        />
      </g>
    </svg>
  );
}
