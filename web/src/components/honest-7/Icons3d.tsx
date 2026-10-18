import type { CSSProperties, ReactNode } from 'react';
import type { AmenityIconName, DossierIconName } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

/*
 * The page's pictograms in relief — the hero's amenities, the dossier and the
 * steps after the form: lit faces, a side in shadow and a soft shadow on the
 * ground, in the brand's greens and golds. Each one floats and moves one part
 * on a loop (the water ripples, the page turns, the bell rings…)
 * once its block has been seen — `[data-inview] .hs7-3d-*` in globals.css.
 * The drawing as it stands, with no animation, is the reduced-motion and
 * no-JavaScript state. Plain SVG: nothing to download, sharp at any size.
 *
 * Gradient ids carry the icon's name: each pictogram appears once per page.
 */

export type StepIconName = 'form' | 'adviser' | 'received';

type Point = readonly [number, number];
const points = (list: Point[]) => list.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ');
const delay = (seconds: number) => ({ animationDelay: `${seconds}s` });

function Gradient({ id, from, to, x2 = 0, y2 = 1 }: { id: string; from: string; to: string; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

function Frame({ id, children, defs, shadow, className, style }: { id: string; children: ReactNode; defs: ReactNode; shadow: { cy: number; rx: number }; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={cn('hs7-3d shrink-0 overflow-visible', className)} style={style}>
      <defs>
        <radialGradient id={`${id}-ground`}>
          <stop offset="0" stopColor="#2d3a2d" stopOpacity="0.28" />
          <stop offset="1" stopColor="#2d3a2d" stopOpacity="0" />
        </radialGradient>
        {defs}
      </defs>
      <ellipse className="hs7-3d-shadow" cx="32" cy={shadow.cy} rx={shadow.rx} ry="3.6" fill={`url(#${id}-ground)`} />
      <g className="hs7-3d-float">{children}</g>
    </svg>
  );
}

/* ── The six items of the dossier ─────────────────────────────────────────── */

function Brochure(props: IconProps) {
  const id = 'hs7d-brochure';
  const right = 'M55 17Q44 13.5 32 19V49Q44 44 55 47Z';
  return (
    <Frame
      id={id}
      shadow={{ cy: 56, rx: 24 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-cover`} from="#4a5c48" to="#253025" />
          <Gradient id={`${id}-left`} from="#efe6d4" to="#fffdf8" x2={1} y2={0} />
          <Gradient id={`${id}-right`} from="#fffdf8" to="#efe6d4" x2={1} y2={0} />
          <Gradient id={`${id}-photo`} from="#ecd6a6" to="#b8925a" x2={1} />
        </>
      }
    >
      <path d="M7 49Q19 46 32 51Q45 46 57 49V51.5Q45 48.5 32 53.5Q19 48.5 7 51.5Z" fill="#1c251c" />
      <path d="M7 19Q19 16 32 21Q45 16 57 19V49Q45 46 32 51Q19 46 7 49Z" fill={`url(#${id}-cover)`} />
      <path d="M9 17Q20 13.5 32 19V49Q20 44 9 47Z" fill={`url(#${id}-left)`} />
      <path d={right} fill={`url(#${id}-right)`} />
      <path d="M32 19V49" stroke="#d6c9b1" strokeWidth="0.8" />
      <g fill="none" stroke="#7a8b68" strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round">
        <path d="M13 22.5Q20 20.4 28 22.8M13 27Q20 24.9 28 27.3M13 31.5Q20 29.4 28 31.8M13 36Q18 34.6 23 35.6" />
        <path d="M36 35Q43 33.1 51 34M36 39.5Q43 37.6 51 38.5" />
      </g>
      <path d="M36 22.6Q43 20.7 51 21.6V29.6Q43 28.7 36 30.6Z" fill={`url(#${id}-photo)`} />
      <path className="hs7-3d-flip" d={right} fill={`url(#${id}-right)`} stroke="#e2d7c3" strokeWidth="0.5" />
    </Frame>
  );
}

function Plans(props: IconProps) {
  const id = 'hs7d-plans';
  /** A point of the slab's top face, (0,0) at its back corner. */
  const at = (u: number, v: number): Point => [32 + 24 * u - 24 * v, 14 + 12 * u + 12 * v];
  const box = (u: number, v: number, du: number, dv: number) => [at(u, v), at(u + du, v), at(u + du, v + dv), at(u, v + dv)];
  const bed = box(0.58, 0.62, 0.22, 0.22);
  return (
    <Frame
      id={id}
      shadow={{ cy: 48, rx: 24 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-top`} from="#fffdf8" to="#ece2cf" x2={1} />
          <Gradient id={`${id}-left`} from="#d9ccb4" to="#c8bba8" />
          <Gradient id={`${id}-right`} from="#bfae92" to="#a3916f" />
        </>
      }
    >
      <polygon points="8,26 32,38 32,44 8,32" fill={`url(#${id}-left)`} />
      <polygon points="32,38 56,26 56,32 32,44" fill={`url(#${id}-right)`} />
      <polygon points="32,14 56,26 32,38 8,26" fill={`url(#${id}-top)`} />
      <polygon points={points(box(0.16, 0.14, 0.26, 0.18))} fill="#7a8b68" fillOpacity="0.55" />
      <g fill="none" stroke="#2d3a2d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path className="hs7-3d-draw" pathLength={1} d={`M${points([at(0.1, 0.1), at(0.9, 0.1), at(0.9, 0.9), at(0.1, 0.9)])}Z`} />
        <path className="hs7-3d-draw" pathLength={1} style={delay(0.35)} d={`M${points([at(0.5, 0.1), at(0.5, 0.58)])}`} />
        <path className="hs7-3d-draw" pathLength={1} style={delay(0.5)} d={`M${points([at(0.1, 0.55), at(0.34, 0.55)])}`} />
      </g>
      <g className="hs7-3d-pop">
        <polygon points={points(bed.map(([x, y]) => [x, y - 2]))} fill="#ecd6a6" />
        <polygon points={points([bed[3], bed[2], [bed[2][0], bed[2][1] - 2], [bed[3][0], bed[3][1] - 2]])} fill="#c4a26a" />
        <polygon points={points([bed[1], bed[2], [bed[2][0], bed[2][1] - 2], [bed[1][0], bed[1][1] - 2]])} fill="#a8834a" />
      </g>
    </Frame>
  );
}

function Prices({ symbol, ...props }: IconProps) {
  const id = 'hs7d-prices';
  const tag = 'M23 24L32 15L41 24V47Q41 50 38 50H26Q23 50 23 47Z';
  return (
    <Frame
      id={id}
      shadow={{ cy: 57, rx: 14 }}
      className={props.className} style={props.style}
      defs={
        <>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1dfb5" />
            <stop offset="0.55" stopColor="#d2b178" />
            <stop offset="1" stopColor="#b8925a" />
          </linearGradient>
        </>
      }
    >
      <circle cx="32" cy="6" r="1.9" fill="#2d3a2d" />
      <g className="hs7-3d-swing">
        <path d="M32 6C30.6 11 33.4 16 32 22.5" fill="none" stroke="#2d3a2d" strokeWidth="1.2" strokeLinecap="round" />
        <path d={tag} transform="translate(2.2 2.2)" fill="#8f6a3c" />
        <path d={tag} fill={`url(#${id}-face)`} />
        <path d="M24.6 25.2L32 17.8" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="32" cy="23.5" r="2.3" fill="#faf8f4" stroke="#a8834a" strokeWidth="0.8" />
        {symbol ? (
          <text x="32" y="43" textAnchor="middle" fontSize="14" fontWeight="600" fill="#2d3a2d">
            {symbol}
          </text>
        ) : (
          <path d="M27.5 35H36.5M27.5 39.5H36.5M27.5 44H33" stroke="#2d3a2d" strokeWidth="1.5" strokeLinecap="round" />
        )}
      </g>
    </Frame>
  );
}

function Availability(props: IconProps) {
  const id = 'hs7d-availability';
  const left = (s: number, t: number): Point => [18 + 14 * s, 16 + 7 * s + 29 * t];
  const right = (s: number, t: number): Point => [32 + 14 * s, 23 - 7 * s + 29 * t];
  const pane = (face: typeof left, s: number, t: number) => points([face(s, t), face(s + 0.22, t), face(s + 0.22, t + 0.12), face(s, t + 0.12)]);
  const COLUMNS = [0.2, 0.58];
  const ROWS = [0.1, 0.31, 0.52, 0.73];
  /** The lit windows — the homes still available — and when each one blinks. */
  const LIT: Record<string, number> = { 'l-0-1': 0, 'r-1-0': 0.6, 'l-1-2': 1.2, 'r-0-2': 1.8, 'l-0-3': 2.4 };
  const windows = (face: typeof left, side: 'l' | 'r', dim: string) =>
    COLUMNS.flatMap((s, column) =>
      ROWS.map((t, row) => {
        const key = `${side}-${column}-${row}`;
        return key in LIT ? (
          <polygon key={key} className="hs7-3d-lit" style={delay(LIT[key])} points={pane(face, s, t)} fill="#ecd6a6" />
        ) : (
          <polygon key={key} points={pane(face, s, t)} fill={dim} />
        );
      }),
    );
  return (
    <Frame
      id={id}
      shadow={{ cy: 54, rx: 19 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-left`} from="#5d705a" to="#3d4e3c" />
          <Gradient id={`${id}-right`} from="#2d3a2d" to="#1f281f" />
          <Gradient id={`${id}-top`} from="#b5c3a2" to="#7a8b68" x2={1} />
        </>
      }
    >
      <polygon points="18,16 32,23 32,52 18,45" fill={`url(#${id}-left)`} />
      <polygon points="32,23 46,16 46,45 32,52" fill={`url(#${id}-right)`} />
      <polygon points="32,9 46,16 32,23 18,16" fill={`url(#${id}-top)`} />
      {windows(left, 'l', 'rgba(250,248,244,0.16)')}
      {windows(right, 'r', 'rgba(250,248,244,0.1)')}
    </Frame>
  );
}

function Schedule(props: IconProps) {
  const id = 'hs7d-schedule';
  const coin = (cx: number, y: number) => (
    <>
      <path d={`M${cx - 12} ${y}V${y + 4.2}A12 4.6 0 0 0 ${cx + 12} ${y + 4.2}V${y}Z`} fill={`url(#${id}-edge)`} />
      <ellipse cx={cx} cy={y} rx="12" ry="4.6" fill={`url(#${id}-face)`} />
      <ellipse cx={cx} cy={y} rx="8.4" ry="3.1" fill="none" stroke="#a8834a" strokeOpacity="0.6" strokeWidth="0.8" />
    </>
  );
  return (
    <Frame
      id={id}
      shadow={{ cy: 55, rx: 22 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-edge`} from="#b8925a" to="#8f6a3c" x2={1} y2={0} />
          <Gradient id={`${id}-face`} from="#f4e6c4" to="#d2b178" x2={1} />
          <Gradient id={`${id}-paper`} from="#fffdf8" to="#efe6d4" />
          <Gradient id={`${id}-head`} from="#4a5c48" to="#2d3a2d" />
        </>
      }
    >
      <g transform="rotate(8 46 22)">
        <rect x="37.5" y="11.5" width="20" height="21" rx="3" fill="#c8bba8" />
        <rect x="36" y="10" width="20" height="21" rx="3" fill={`url(#${id}-paper)`} />
        <path d="M36 13A3 3 0 0 1 39 10H53A3 3 0 0 1 56 13V16H36Z" fill={`url(#${id}-head)`} />
        <g fill="#7a8b68" fillOpacity="0.45">
          <rect x="39" y="19" width="3.6" height="3" rx="0.8" />
          <rect x="44.2" y="19" width="3.6" height="3" rx="0.8" />
          <rect x="49.4" y="19" width="3.6" height="3" rx="0.8" />
          <rect x="39" y="24.5" width="3.6" height="3" rx="0.8" />
          <rect x="49.4" y="24.5" width="3.6" height="3" rx="0.8" />
        </g>
        <rect x="44.2" y="24.5" width="3.6" height="3" rx="0.8" fill="#d2b178" />
      </g>
      {coin(27, 45)}
      {coin(26, 40)}
      {coin(28, 35)}
      <g className="hs7-3d-drop">{coin(27, 30)}</g>
    </Frame>
  );
}

function Rental(props: IconProps) {
  const id = 'hs7d-rental';
  const bar = (cx: number, height: number, faces: [string, string, string], at: number) => {
    const by = 48;
    const top = by - height;
    return (
      <g className="hs7-3d-grow" style={delay(at)}>
        <polygon points={points([[cx - 6, top], [cx, top + 3], [cx, by + 3], [cx - 6, by]])} fill={faces[0]} />
        <polygon points={points([[cx, top + 3], [cx + 6, top], [cx + 6, by], [cx, by + 3]])} fill={faces[1]} />
        <polygon points={points([[cx - 6, top], [cx, top + 3], [cx + 6, top], [cx, top - 3]])} fill={faces[2]} />
      </g>
    );
  };
  return (
    <Frame id={id} shadow={{ cy: 55, rx: 24 }} className={props.className} style={props.style} defs={null}>
      {bar(17, 11, ['#a3b38f', '#7a8b68', '#c6d1b7'], 0)}
      {bar(31, 19, ['#5d705a', '#3d4e3c', '#8c9c79'], 0.12)}
      {bar(45, 28, ['#e2c58f', '#b8925a', '#f4e6c4'], 0.24)}
      <g fill="none" stroke="#2d3a2d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path className="hs7-3d-draw" pathLength={1} d="M9 30L21 22L30 25L49 9" />
        <path className="hs7-3d-pop" d="M42.5 9H49.5V16" />
      </g>
    </Frame>
  );
}

/* ── The three steps after the form ───────────────────────────────────────── */

function Form(props: IconProps) {
  const id = 'hs7d-form';
  return (
    <Frame
      id={id}
      shadow={{ cy: 56, rx: 16 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-card`} from="#fffdf8" to="#efe6d4" x2={1} />
          <Gradient id={`${id}-badge`} from="#5d705a" to="#2d3a2d" x2={1} />
        </>
      }
    >
      <rect x="20.5" y="10.5" width="26" height="40" rx="5" fill="#c8bba8" />
      <rect x="18" y="8" width="26" height="40" rx="5" fill={`url(#${id}-card)`} stroke="#2d3a2d" strokeOpacity="0.14" />
      <g fill="#ece3d2">
        <rect x="22" y="14" width="18" height="5.5" rx="2.75" />
        <rect x="22" y="22" width="18" height="5.5" rx="2.75" />
        <rect x="22" y="30" width="18" height="5.5" rx="2.75" />
      </g>
      <g fill="none" stroke="#2d3a2d" strokeWidth="1.5" strokeLinecap="round">
        <path className="hs7-3d-draw" pathLength={1} d="M24.6 16.75H33" />
        <path className="hs7-3d-draw" pathLength={1} style={delay(0.3)} d="M24.6 24.75H35.5" />
        <path className="hs7-3d-draw" pathLength={1} style={delay(0.6)} d="M24.6 32.75H31" />
      </g>
      <rect x="22" y="39.5" width="18" height="5" rx="2.5" fill="#d2b178" />
      <g className="hs7-3d-pop" style={delay(0.4)}>
        <circle cx="45" cy="46" r="7.5" fill={`url(#${id}-badge)`} />
        <path d="M41.6 46.1L44 48.4L48.5 43.8" fill="none" stroke="#faf8f4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Frame>
  );
}

function Adviser(props: IconProps) {
  const id = 'hs7d-adviser';
  const bubble = (
    <>
      <rect x="9" y="15" width="38" height="25" rx="12.5" />
      <path d="M17 35L13 46L27 38Z" />
    </>
  );
  return (
    <Frame id={id} shadow={{ cy: 56, rx: 20 }} className={props.className} style={props.style} defs={<Gradient id={`${id}-face`} from="#5d705a" to="#2d3a2d" x2={1} />}>
      <g fill="#1c251c" transform="translate(2 2.5)">
        {bubble}
      </g>
      <g fill={`url(#${id}-face)`}>{bubble}</g>
      <g fill="#faf8f4">
        <circle className="hs7-3d-dot" cx="19.5" cy="27.5" r="2.7" />
        <circle className="hs7-3d-dot" style={delay(0.16)} cx="28" cy="27.5" r="2.7" />
        <circle className="hs7-3d-dot" style={delay(0.32)} cx="36.5" cy="27.5" r="2.7" />
      </g>
      <circle className="hs7-3d-ping" cx="46" cy="15" r="5" fill="#d2b178" />
      <circle cx="46" cy="15" r="5" fill="#d2b178" stroke="#faf8f4" strokeWidth="1.6" />
    </Frame>
  );
}

function Received(props: IconProps) {
  const id = 'hs7d-received';
  return (
    <Frame
      id={id}
      shadow={{ cy: 56, rx: 23 }}
      className={props.className} style={props.style}
      defs={
        <>
          <Gradient id={`${id}-back`} from="#b8925a" to="#8f6a3c" />
          <Gradient id={`${id}-front`} from="#f1dfb5" to="#d2b178" />
          <Gradient id={`${id}-badge`} from="#5d705a" to="#2d3a2d" x2={1} />
        </>
      }
    >
      <path d="M10 21Q10 18 13 18H24L28 22H51Q54 22 54 25V48Q54 51 51 51H13Q10 51 10 48Z" fill={`url(#${id}-back)`} />
      <g className="hs7-3d-rise">
        <rect x="17" y="11" width="28" height="30" rx="2.5" fill="#fffdf8" stroke="#2d3a2d" strokeOpacity="0.12" />
        <path d="M21.5 17H36M21.5 21.5H40.5M21.5 26H33" stroke="#7a8b68" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <path d="M8 29Q8 27 10 27H54Q56 27 56 29L53.2 49Q52.8 51 50.6 51H13.4Q11.2 51 10.8 49Z" fill={`url(#${id}-front)`} />
      <path d="M10.5 29.6H53.5" stroke="#fff" strokeOpacity="0.65" strokeWidth="1" strokeLinecap="round" />
      <g className="hs7-3d-pop" style={delay(0.5)}>
        <circle cx="48" cy="47" r="7.5" fill={`url(#${id}-badge)`} />
        <path d="M44.6 47.1L47 49.4L51.5 44.8" fill="none" stroke="#faf8f4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Frame>
  );
}

/* ── The residence's amenities, in the hero ──────────────────────────────── */

/** Water: the brand's olive washed towards blue, so a pool reads as a pool without leaving the palette's family. */
const WATER = ['#d6e7e0', '#93b9ad'] as const;

function Pool(props: IconProps) {
  const id = 'hs7a-pool';
  const at = (u: number, v: number): Point => [32 + 25 * u - 25 * v, 14 + 12.5 * u + 12.5 * v];
  const basin = points([at(0.15, 0.15), at(0.85, 0.15), at(0.85, 0.85), at(0.15, 0.85)]);
  return (
    <Frame
      id={id}
      shadow={{ cy: 50, rx: 25 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <Gradient id={`${id}-stone`} from="#fffdf8" to="#e9dfcc" x2={1} />
          <Gradient id={`${id}-left`} from="#d9ccb4" to="#c8bba8" />
          <Gradient id={`${id}-right`} from="#bfae92" to="#a3916f" />
          <Gradient id={`${id}-water`} from={WATER[0]} to={WATER[1]} x2={1} />
          <clipPath id={`${id}-basin`}>
            <polygon points={basin} />
          </clipPath>
        </>
      }
    >
      <polygon points="7,26.5 32,39 32,44 7,31.5" fill={`url(#${id}-left)`} />
      <polygon points="32,39 57,26.5 57,31.5 32,44" fill={`url(#${id}-right)`} />
      <polygon points="32,14 57,26.5 32,39 7,26.5" fill={`url(#${id}-stone)`} />
      <g clipPath={`url(#${id}-basin)`}>
        <polygon points={basin} fill="#6f9488" />
        <polygon points={basin} transform="translate(0 2.6)" fill={`url(#${id}-water)`} />
        <g className="hs7-3d-wave" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.1" strokeLinecap="round">
          {/* A ripple every 8 units, run 8 to the left and back: the loop does not jump. */}
          <path d="M2 27q2-1.4 4 0t4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0" />
          <path d="M6 32.5q2-1.4 4 0t4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0" />
        </g>
      </g>
      <g fill="none" stroke="#5d705a" strokeWidth="1.2" strokeLinecap="round">
        <path d="M43.4 24.6V20.2Q43.4 18.4 45.2 18.7" />
        <path d="M46.8 26.3V21.9Q46.8 20.1 48.6 20.4" />
      </g>
    </Frame>
  );
}

function Spa(props: IconProps) {
  const id = 'hs7a-spa';
  const stone = (cy: number, rx: number, ry: number, light: string, dark: string, key: string) => (
    <>
      <ellipse cx="32" cy={cy + 1.6} rx={rx} ry={ry} fill={dark} />
      <ellipse cx="32" cy={cy} rx={rx} ry={ry} fill={`url(#${id}-${key})`} />
      <Gradient id={`${id}-${key}`} from={light} to={dark} />
    </>
  );
  return (
    <Frame
      id={id}
      shadow={{ cy: 54, rx: 17 }}
      className={props.className}
      style={props.style}
      defs={<Gradient id={`${id}-leaf`} from="#c6d1b7" to="#7a8b68" x2={1} />}
    >
      {stone(46, 15, 6, '#8c9c79', '#4a5c48', 'base')}
      {stone(37.5, 11.5, 5, '#e2d8c6', '#a99a83', 'middle')}
      {stone(30.5, 8, 3.8, '#9fae8c', '#5d705a', 'top')}
      <g className="hs7-3d-sway">
        <path d="M31.5 28C26.8 26.4 24.4 22.4 25 18.4C29.2 19.4 31.6 23.2 31.5 28Z" fill={`url(#${id}-leaf)`} />
        <path d="M32.5 28C30.6 20.8 34.4 14.8 41.5 13.6C41.6 20.8 37.8 26.6 32.5 28Z" fill={`url(#${id}-leaf)`} />
        <path d="M32.5 28Q35.6 21 41.5 13.6M31.5 28Q28.6 23.4 25 18.4" fill="none" stroke="#4a5c48" strokeOpacity="0.6" strokeWidth="0.8" />
      </g>
      <path d="M22.5 27.6Q24 26.4 26.5 26.8" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
    </Frame>
  );
}

function Sauna(props: IconProps) {
  const id = 'hs7a-sauna';
  return (
    <Frame
      id={id}
      shadow={{ cy: 54, rx: 17 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d9b98a" />
            <stop offset="0.5" stopColor="#b8925a" />
            <stop offset="1" stopColor="#8a6233" />
          </linearGradient>
          <Gradient id={`${id}-water`} from={WATER[0]} to={WATER[1]} x2={1} />
        </>
      }
    >
      <g fill="none" stroke="#c8bba8" strokeWidth="1.7" strokeLinecap="round">
        <path className="hs7-3d-steam" d="M22.5 25c-1.8-2.2 1.8-3.6 0-5.8s1.8-3.6 0-5.8" />
        <path className="hs7-3d-steam" style={delay(0.7)} d="M29 24c-1.8-2.2 1.8-3.6 0-5.8s1.8-3.6 0-5.8" />
        <path className="hs7-3d-steam" style={delay(1.4)} d="M35.5 25c-1.8-2.2 1.8-3.6 0-5.8s1.8-3.6 0-5.8" />
      </g>
      <path d="M17 31L19.2 47.5A10.8 4 0 0 0 40.8 47.5L43 31A13 4.6 0 0 1 17 31Z" fill={`url(#${id}-wood)`} />
      <path d="M23.6 35.2L24.6 51M30 35.6V51.5M36.4 35.2L35.4 51" stroke="#7a5530" strokeOpacity="0.4" strokeWidth="0.8" />
      <path d="M17.7 36.6A12.4 4.4 0 0 0 42.3 36.6M18.8 44.6A11.3 4.1 0 0 0 41.2 44.6" fill="none" stroke="#2d3a2d" strokeWidth="1.5" />
      <ellipse cx="30" cy="31" rx="13" ry="4.6" fill="#5a3d22" />
      <ellipse cx="30" cy="31.8" rx="11" ry="3.5" fill={`url(#${id}-water)`} />
      <ellipse cx="30" cy="31" rx="13" ry="4.6" fill="none" stroke="#d9b98a" strokeWidth="1" />
      <path d="M33 32L49.5 17.5" stroke="#9b7040" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50.2" cy="16.9" r="1.8" fill="#8a6233" />
    </Frame>
  );
}

function Jacuzzi(props: IconProps) {
  const id = 'hs7a-jacuzzi';
  const BUBBLES: [number, number, number, number][] = [
    [24, 30.5, 1.5, 0],
    [31, 32.5, 1.2, 0.5],
    [37, 30, 1.7, 1],
    [42, 32, 1.1, 1.5],
    [28, 28.6, 1.1, 1.9],
  ];
  return (
    <Frame
      id={id}
      shadow={{ cy: 51, rx: 25 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#efe7d8" />
            <stop offset="0.6" stopColor="#c8bba8" />
            <stop offset="1" stopColor="#a3916f" />
          </linearGradient>
          <radialGradient id={`${id}-water`} cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" stopColor={WATER[0]} />
            <stop offset="1" stopColor={WATER[1]} />
          </radialGradient>
        </>
      }
    >
      <path d="M10 30V41A22 8 0 0 0 54 41V30Z" fill={`url(#${id}-side)`} />
      <ellipse cx="32" cy="30" rx="22" ry="8" fill="#f8f3ea" />
      <ellipse cx="32" cy="30.4" rx="18" ry="6" fill="#6f9488" />
      <ellipse cx="32" cy="31.4" rx="17.6" ry="5.2" fill={`url(#${id}-water)`} />
      <g fill="#fff">
        {BUBBLES.map(([cx, cy, r, at]) => (
          <circle key={cx} className="hs7-3d-bubble" style={delay(at)} cx={cx} cy={cy} r={r} fillOpacity="0.9" />
        ))}
      </g>
      <path d="M13.5 27.4Q18 23.6 27 22.6" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1" strokeLinecap="round" />
    </Frame>
  );
}

function Gym(props: IconProps) {
  const id = 'hs7a-gym';
  const plate = (cx: number, ry: number, face: string, key: string) => (
    <>
      <ellipse cx={cx + 2.6} cy="34" rx="3.4" ry={ry} fill="#1c251c" />
      <rect x={cx} y={34 - ry} width="2.6" height={ry * 2} fill="#1c251c" />
      <ellipse cx={cx} cy="34" rx="3.4" ry={ry} fill={`url(#${id}-${key})`} />
      <Gradient id={`${id}-${key}`} from={face} to="#2d3a2d" />
      <circle cx={cx} cy="34" r="1.1" fill="#d2b178" />
    </>
  );
  return (
    <Frame id={id} shadow={{ cy: 54, rx: 21 }} className={props.className} style={props.style} defs={<Gradient id={`${id}-bar`} from="#e2d8c6" to="#8a7d68" />}>
      <g className="hs7-3d-lift">
        <rect x="11" y="32.6" width="42" height="2.8" rx="1.4" fill={`url(#${id}-bar)`} />
        {plate(13, 7.5, '#5d705a', 'outer-left')}
        {plate(18.5, 10, '#7a8b68', 'inner-left')}
        {plate(42.5, 10, '#7a8b68', 'inner-right')}
        {plate(48, 7.5, '#5d705a', 'outer-right')}
      </g>
    </Frame>
  );
}

function Cinema(props: IconProps) {
  const id = 'hs7a-cinema';
  const star = (cx: number, cy: number, r: number, at: number) => (
    <path className="hs7-3d-twinkle" style={delay(at)} d={`M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`} fill="#d2b178" />
  );
  return (
    <Frame
      id={id}
      shadow={{ cy: 54, rx: 22 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <Gradient id={`${id}-frame`} from="#4a5c48" to="#2d3a2d" />
          <Gradient id={`${id}-screen`} from="#fffdf8" to="#ecd6a6" x2={1} />
          <Gradient id={`${id}-lawn`} from="#b5c3a2" to="#7a8b68" />
        </>
      }
    >
      <ellipse cx="32" cy="50.5" rx="21" ry="4" fill={`url(#${id}-lawn)`} />
      <path d="M21 39L18 50M43 39L46 50" stroke="#2d3a2d" strokeWidth="2" strokeLinecap="round" />
      <rect x="13.4" y="17.4" width="38" height="24" rx="2.5" fill="#1c251c" />
      <rect x="11" y="15" width="38" height="24" rx="2.5" fill={`url(#${id}-frame)`} />
      <rect x="13.5" y="17.5" width="33" height="19" rx="1.2" fill={`url(#${id}-screen)`} />
      <path className="hs7-3d-beat" d="M27.6 22.6L35.4 27L27.6 31.4Z" fill="#2d3a2d" />
      <path d="M55.4 4.6A5 5 0 1 0 59.6 12.4A4.2 4.2 0 1 1 55.4 4.6Z" fill="#d2b178" />
      {star(8, 9, 2.6, 0)}
      {star(30, 7, 2, 0.8)}
      {star(46, 10, 1.6, 1.6)}
    </Frame>
  );
}

function Concierge(props: IconProps) {
  const id = 'hs7a-concierge';
  return (
    <Frame
      id={id}
      shadow={{ cy: 55, rx: 20 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <Gradient id={`${id}-base`} from="#4a5c48" to="#2d3a2d" x2={1} />
          <linearGradient id={`${id}-dome`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4e6c4" />
            <stop offset="0.5" stopColor="#d2b178" />
            <stop offset="1" stopColor="#a8834a" />
          </linearGradient>
        </>
      }
    >
      <g fill="none" stroke="#b8925a" strokeWidth="1.4" strokeLinecap="round">
        <path className="hs7-3d-ring-wave" d="M23 19.5Q24 15.6 27.4 13.6M41 19.5Q40 15.6 36.6 13.6" />
        <path className="hs7-3d-ring-wave" style={delay(0.12)} d="M18.6 18.4Q20.2 11.8 25.8 9.2M45.4 18.4Q43.8 11.8 38.2 9.2" />
      </g>
      <path d="M13 46V49.5A19 5.2 0 0 0 51 49.5V46Z" fill="#1c251c" />
      <ellipse cx="32" cy="46" rx="19" ry="5.2" fill={`url(#${id}-base)`} />
      <g className="hs7-3d-ring">
        <g className="hs7-3d-press">
          <rect x="30.6" y="22.5" width="2.8" height="5.5" fill="#a8834a" />
          <circle cx="32" cy="21.6" r="3" fill={`url(#${id}-dome)`} />
        </g>
        <path d="M16 45C16 34.5 23 27.2 32 27.2S48 34.5 48 45Z" fill={`url(#${id}-dome)`} />
        <ellipse cx="32" cy="45" rx="16" ry="2.8" fill="#b8925a" />
        <path d="M20.6 39.4C21.6 34 25 30.2 29 29.2" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

function Parking(props: IconProps) {
  const id = 'hs7a-parking';
  return (
    <Frame
      id={id}
      shadow={{ cy: 55, rx: 18 }}
      className={props.className}
      style={props.style}
      defs={
        <>
          <Gradient id={`${id}-post`} from="#c8bba8" to="#8a7d68" x2={1} y2={0} />
          <Gradient id={`${id}-sign`} from="#4a5c48" to="#2d3a2d" x2={1} />
          <Gradient id={`${id}-deed`} from="#fffdf8" to="#efe6d4" />
        </>
      }
    >
      <ellipse cx="28" cy="51" rx="5" ry="1.8" fill="#8a7d68" />
      <rect x="26.5" y="28" width="3" height="23" fill={`url(#${id}-post)`} />
      <g className="hs7-3d-turn">
        <rect x="16.2" y="8.2" width="28" height="24" rx="5" fill="#1c251c" />
        <rect x="14" y="6" width="28" height="24" rx="5" fill={`url(#${id}-sign)`} />
        <rect x="16.5" y="8.5" width="23" height="19" rx="3.5" fill="none" stroke="#faf8f4" strokeOpacity="0.35" strokeWidth="0.8" />
        <path d="M24.4 24.5V11.5H29.6A4 4 0 0 1 29.6 19.5H24.4" fill="none" stroke="#faf8f4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* « Titré »: the space comes with its own title deed. */}
      <g transform="rotate(8 46 41)">
        <rect x="38.6" y="33.6" width="15" height="17" rx="1.6" fill="#c8bba8" />
        <rect x="37" y="32" width="15" height="17" rx="1.6" fill={`url(#${id}-deed)`} />
        <path d="M40 36H49M40 39H47" stroke="#7a8b68" strokeOpacity="0.6" strokeWidth="1.1" strokeLinecap="round" />
        <circle className="hs7-3d-beat" cx="47.6" cy="44.6" r="2.6" fill="#d2b178" stroke="#a8834a" strokeWidth="0.7" />
      </g>
    </Frame>
  );
}

type IconProps = { className?: string; style?: CSSProperties; symbol?: string };

type Icon3dName = AmenityIconName | DossierIconName | StepIconName;

const ICONS: Record<Icon3dName, (props: IconProps) => ReactNode> = {
  pool: Pool,
  'heated-pool': Pool,
  spa: Spa,
  sauna: Sauna,
  jacuzzi: Jacuzzi,
  gym: Gym,
  cinema: Cinema,
  concierge: Concierge,
  parking: Parking,
  brochure: Brochure,
  plans: Plans,
  prices: Prices,
  availability: Availability,
  schedule: Schedule,
  rental: Rental,
  form: Form,
  adviser: Adviser,
  received: Received,
};

/**
 * One pictogram. `float` offsets its float in the loop so a row of them does
 * not bob in step; `symbol` is the currency printed on the price tag.
 */
export function Icon3d({ name, className, float = 0, symbol }: { name: Icon3dName; className?: string; float?: number; symbol?: string }) {
  const Drawing = ICONS[name];
  return <Drawing className={className} symbol={symbol} style={{ '--hs7-3d-float': `${-float}s` } as CSSProperties} />;
}
