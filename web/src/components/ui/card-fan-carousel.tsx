'use client';

import Image from 'next/image';
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Card fan carousel.
 *
 * Cards are stacked in one grid cell and pushed apart by transform alone, so
 * the fan costs nothing in layout: no measurement pass, no reflow, no CLS. Every
 * distance is expressed against `--fan-w` (the card width) rather than a
 * measured pixel value, which means one `clamp()` scales the whole arrangement
 * from phone to desktop and the prerendered HTML is already in its final
 * position on first paint.
 *
 * Motion is a plain CSS transition on the site's `--ease-premium` curve. That
 * keeps the fan off the main thread and out of the JS bundle — the section's
 * entrance still uses `Reveal`, so the page keeps one motion vocabulary.
 *
 * Interaction model: the front card is the one that opens. Clicking a card
 * behind it brings it to the front instead, which is what the overlap already
 * implies. Focus also brings a card to the front, so a keyboard user is always
 * acting on the card they can see — pressing Enter always opens.
 */

export type FanCard = {
  /** Cover image, served from `/img`. Cropped to 4:5 by the card. */
  imgUrl: string;
  alt: string;
  /** Overlaid on the cover, and read out as the card's name. */
  title: string;
  /** One line of context, shown under the fan while the card is in front. */
  caption?: string;
  /**
   * Destination. Leave undefined while the video is still being produced: the
   * card then renders a waiting state rather than a play button that opens
   * nothing.
   */
  linkUrl?: string;
  /** `modal` hands `linkUrl` to the player; `newTab` opens it in a new tab. */
  open?: 'modal' | 'newTab';
  /** Portrait sources get a height-capped player rather than a 16:9 panel. */
  portrait?: boolean;
  /** Corner pill, e.g. "Bientôt". */
  badge?: string;
};

/**
 * Fan geometry. The translations are multipliers of `--fan-w`; rotation is
 * scale-free so it stays a constant. `transform-origin` sits below the card, so
 * rotating also swings it along an arc — the translation only adds separation
 * on top of that.
 */
const STEP_DEG = 3.6;
const STEP_X = 0.42;
const STEP_Y = 0.035;
const STEP_SCALE = 0.05;
const OPACITY = [1, 0.92, 0.78, 0.55];
/** Cards further out than this are parked behind the fan and taken out of play. */
const VISIBLE = 3;

const pad = (value: number) => String(value).padStart(2, '0');

type CardFanCarouselProps = {
  cards: FanCard[];
  /** Accessible name for the carousel region. */
  ariaLabel: string;
  /** Which card starts in front. */
  initialIndex?: number;
  /** Called when a card with `open: 'modal'` is activated from the front. */
  onSelect?: (card: FanCard, index: number) => void;
  /**
   * `dark` sits on forest/photo (hero). `light` sits on cream.
   * Only the chrome under the fan changes — card faces stay photographic.
   */
  tone?: 'light' | 'dark';
  /** Smaller fan geometry for embedding in the hero. */
  compact?: boolean;
  /** Hide the front-card caption under the fan (counter stays). */
  showCaption?: boolean;
  /** Optional label under the compact control counter. */
  controlLabel?: string;
  className?: string;
};

export function CardFanCarousel({
  cards,
  ariaLabel,
  initialIndex = 0,
  onSelect,
  tone = 'light',
  compact = false,
  showCaption = true,
  controlLabel,
  className,
}: CardFanCarouselProps) {
  const count = cards.length;
  const [active, setActive] = useState(() => Math.min(Math.max(initialIndex, 0), count - 1));

  /** Pointer bookkeeping for swipe, and for telling a drag apart from a click. */
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  /**
   * Which card was in front when the press began.
   *
   * Pressing a card focuses it, `onFocus` brings it forward, and React has
   * re-rendered before `click` is dispatched — so by the time the click handler
   * runs, the card the user pressed always looks like the front one. Judging
   * the click against this snapshot instead is what keeps a press on a card at
   * the back from bringing it forward *and* opening it in one go.
   */
  const pressedFrom = useRef<number | null>(null);

  /** Signed distance from a given front card, wrapped to the shorter way round. */
  const offsetFrom = (index: number, reference: number) => {
    const half = Math.floor(count / 2);
    let offset = index - reference;
    if (offset > half) offset -= count;
    if (offset < -half) offset += count;
    return offset;
  };

  const offsetOf = (index: number) => offsetFrom(index, active);

  const step = (delta: number) => setActive((current) => (current + delta + count) % count);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    swallowClick.current = false;
    pressedFrom.current = active;
    drag.current = { x: event.clientX, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current && Math.abs(event.clientX - drag.current.x) > 8) drag.current.moved = true;
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const started = drag.current;
    drag.current = null;
    if (!started) return;
    // A drag must not also read as a click on whatever card it finished over.
    swallowClick.current = started.moved;
    const travelled = event.clientX - started.x;
    if (Math.abs(travelled) > 45) step(travelled < 0 ? 1 : -1);
  };

  const activate = (card: FanCard, index: number, event: { preventDefault: () => void }) => {
    const pressed = pressedFrom.current;
    pressedFrom.current = null;

    if (swallowClick.current) {
      swallowClick.current = false;
      event.preventDefault();
      return;
    }
    // Pointer activations are judged against the fan as it stood when the press
    // began; keyboard ones (no press, so no snapshot) against the fan now,
    // where focus has already brought the card forward and Enter should open it.
    if (offsetFrom(index, pressed ?? active) !== 0) {
      // A card behind the front one comes forward rather than opening.
      event.preventDefault();
      setActive(index);
      return;
    }
    if (!card.linkUrl) {
      event.preventDefault();
      return;
    }
    // `newTab` cards are real anchors — let the browser navigate.
    if (card.open === 'newTab') return;
    event.preventDefault();
    onSelect?.(card, index);
  };

  const activeCard = cards[active];

  return (
    <div className={className} role="group" aria-roledescription="carrousel" aria-label={ariaLabel}>
      <div
        // `--fan-w` is the one dimension the whole fan is built from.
        className={cn(
          // 9:16 cards, matching the vertical films they play, so a cover is
          // never cropped through its own burned-in captions.
          compact
            ? '[--fan-w:clamp(108px,26vw,152px)]'
            : '[--fan-w:clamp(148px,39vw,238px)]',
          'grid touch-pan-y justify-items-center',
          // The outermost cards deliberately bleed past the viewport. Clipping
          // only the horizontal axis keeps that from producing a scrollbar
          // while leaving the arc free to overhang vertically.
          '[overflow-x:clip] [overflow-y:visible]',
          compact ? 'pb-[calc(var(--fan-w)*0.08)] select-none' : 'pb-[calc(var(--fan-w)*0.18)] select-none',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
          }
        }}
      >
        {cards.map((card, index) => (
          <FanItem
            key={card.imgUrl}
            card={card}
            offset={offsetOf(index)}
            count={count}
            position={index + 1}
            total={count}
            compact={compact}
            tone={tone}
            onActivate={(event) => activate(card, index, event)}
            onFocus={() => setActive(index)}
          />
        ))}
      </div>

      {/* Compact: one control row under the stack.
          Full: caption can sit between the arrows on wider viewports. */}
      {compact ? (
        <div className="mt-4 flex flex-col items-center gap-2 sm:mt-5">
          <div className="flex items-center justify-center gap-3.5 sm:gap-5">
            <ArrowButton label="Vidéo précédente" onClick={() => step(-1)} tone={tone} size="sm">
              <path d="M14.5 5.5L8 12l6.5 6.5" />
            </ArrowButton>
            <p
              className={cn(
                'min-w-[5.75rem] text-center text-[15px] font-normal uppercase tracking-[0.22em] tabular-nums sm:text-[16px]',
                tone === 'dark' ? 'text-cream/90' : 'text-bronze',
              )}
            >
              {pad(active + 1)} / {pad(count)}
            </p>
            <ArrowButton label="Vidéo suivante" onClick={() => step(1)} tone={tone} size="sm">
              <path d="M9.5 5.5L16 12l-6.5 6.5" />
            </ArrowButton>
          </div>
          {controlLabel && (
            <p
              className={cn(
                'text-center text-[13.5px] font-medium uppercase tracking-[0.14em]',
                tone === 'dark' ? 'text-cream/75' : 'text-forest/70',
              )}
            >
              {controlLabel}
            </p>
          )}
          <span aria-live="polite" className="sr-only-legacy">
            {`${active + 1} sur ${count} — ${activeCard.title}.`}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            'mt-[clamp(20px,3vw,36px)] flex flex-col items-center gap-5',
            'md:flex-row md:justify-center md:gap-[clamp(14px,2.5vw,28px)]',
          )}
        >
          <div className="order-1 min-w-0 max-w-[440px] px-6 text-center md:order-2 md:flex-1 md:px-0">
            <p className="text-[14.5px] font-semibold uppercase tracking-[2px] text-bronze tabular-nums">
              {pad(active + 1)} / {pad(count)}
            </p>
            {controlLabel && (
              <p
                className={cn(
                  'mt-2 text-[13.5px] font-medium uppercase tracking-[0.14em]',
                  tone === 'dark' ? 'text-cream/75' : 'text-forest/70',
                )}
              >
                {controlLabel}
              </p>
            )}
            {showCaption && activeCard.caption && (
              <p
                className={cn(
                  'mt-3 text-[16.5px] font-normal leading-[1.65]',
                  tone === 'dark' ? 'text-cream/85' : 'text-forest/80',
                )}
              >
                {activeCard.caption}
              </p>
            )}
            <span aria-live="polite" className="sr-only-legacy">
              {`${active + 1} sur ${count} — ${activeCard.title}.`}
            </span>
          </div>
          <div className="order-2 flex items-center gap-5 md:contents">
            <ArrowButton
              label="Vidéo précédente"
              onClick={() => step(-1)}
              tone={tone}
              className="md:order-1"
            >
              <path d="M14.5 5.5L8 12l6.5 6.5" />
            </ArrowButton>
            <ArrowButton
              label="Vidéo suivante"
              onClick={() => step(1)}
              tone={tone}
              className="md:order-3"
            >
              <path d="M9.5 5.5L16 12l-6.5 6.5" />
            </ArrowButton>
          </div>
        </div>
      )}
    </div>
  );
}

function FanItem({
  card,
  offset,
  count,
  position,
  total,
  compact = false,
  tone = 'light',
  onActivate,
  onFocus,
}: {
  card: FanCard;
  offset: number;
  count: number;
  position: number;
  total: number;
  compact?: boolean;
  tone?: 'light' | 'dark';
  onActivate: (event: { preventDefault: () => void }) => void;
  onFocus: () => void;
}) {
  const distance = Math.abs(offset);
  const parked = distance > VISIBLE;
  const isFront = offset === 0;
  const pending = !card.linkUrl;
  const onDark = tone === 'dark' || compact;

  const style: CSSProperties = {
    transformOrigin: '50% 145%',
    transform: [
      `translateX(calc(var(--fan-w) * ${(STEP_X * offset).toFixed(4)}))`,
      `translateY(calc(var(--fan-w) * ${(STEP_Y * distance).toFixed(4)}))`,
      `rotate(${(STEP_DEG * offset).toFixed(2)}deg)`,
      `scale(${(1 - STEP_SCALE * distance).toFixed(4)})`,
    ].join(' '),
    opacity: parked ? 0 : OPACITY[distance],
    zIndex: count - distance,
    pointerEvents: parked ? 'none' : undefined,
  };

  const label = pending
    ? `${card.title} — vidéo bientôt disponible`
    : card.open === 'newTab'
      ? `${card.title} — ouvrir dans un nouvel onglet`
      : `Lire la vidéo : ${card.title}`;

  const shared = {
    style,
    onFocus,
    'aria-label': `${label} (${position} sur ${total})`,
    tabIndex: parked ? -1 : 0,
    className: cn(
      'group col-start-1 row-start-1 block w-[var(--fan-w)] rounded-[18px] outline-offset-[6px]',
      'transition-[transform,opacity] duration-[900ms] ease-premium motion-reduce:transition-none',
      pending && isFront ? 'cursor-default' : 'cursor-pointer',
    ),
  };

  const face = (
    <span
      className={cn(
        'relative block aspect-[9/16] overflow-hidden rounded-[18px] bg-forest',
        'ring-1 transition-[box-shadow,--tw-ring-color,transform] duration-700 ease-premium',
        isFront
          ? onDark
            ? 'shadow-[0_28px_60px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(245,240,232,0.12)] ring-cream/35 group-hover:ring-bronze/70'
            : 'shadow-[0_36px_72px_-28px_rgba(45,58,45,0.42),0_18px_40px_-24px_rgba(45,58,45,0.28)] ring-bronze/50'
          : onDark
            ? 'shadow-[0_18px_40px_-22px_rgba(0,0,0,0.65)] ring-cream/10'
            : 'shadow-[0_22px_48px_-26px_rgba(45,58,45,0.32)] ring-forest/10',
      )}
    >
      <Image
        src={card.imgUrl}
        alt={card.alt}
        fill
        sizes="(max-width: 768px) 32vw, 160px"
        loading="lazy"
        className="object-cover transition-transform duration-[1.4s] ease-premium group-hover:scale-[1.05]"
      />

      {/* Legibility scrim for the title, then a veil that recedes the cards
          sitting behind the front one. The scrim lightens off the front card:
          there is no title to carry there, and at this overlap eight full-
          strength scrims stack into one dark smear across the bottom. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-forest/95 via-forest/15 to-transparent',
          'transition-opacity duration-700 ease-premium',
          isFront ? 'opacity-100' : 'opacity-40',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-forest transition-opacity duration-700 ease-premium',
          isFront ? 'opacity-0' : 'opacity-[0.28]',
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2',
          // Sized off the card, not the viewport, so it stays in proportion.
          'size-[clamp(40px,calc(var(--fan-w)*0.28),52px)]',
          'items-center justify-center rounded-full border transition-all duration-500 ease-premium',
          'shadow-[0_10px_28px_-8px_rgba(0,0,0,0.55)] backdrop-blur-[3px]',
          pending
            ? 'border-cream/30 bg-forest/55 text-cream/65'
            : cn(
                'border-cream/85 bg-cream/18 text-cream',
                'group-hover:scale-[1.08] group-hover:border-bronze group-hover:bg-bronze',
              ),
          isFront ? 'opacity-100' : 'opacity-55',
        )}
      >
        {pending ? (
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="8.2" />
            <path d="M12 7.6V12l2.9 1.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="ml-[2px] size-[17px]" fill="currentColor">
            <path d="M8 5.4v13.2L19 12z" />
          </svg>
        )}
      </span>

      {/* Title and badge belong to the card in front only. Every card carrying
          its own caption turns the overlap into a row of half-words, and the
          front card's name is repeated under the fan anyway. */}
      {card.badge && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-2.5 top-2.5 rounded-full bg-forest/70 px-2.5 py-1',
            'text-[11px] font-normal uppercase tracking-[1.6px] text-cream/85 backdrop-blur-[2px]',
            'transition-opacity duration-500 ease-premium',
            isFront ? 'opacity-100' : 'opacity-0',
          )}
        >
          {card.badge}
        </span>
      )}

      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-[clamp(12px,3.5vw,16px)]',
          'transition-opacity duration-500 ease-premium',
          isFront ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="h-px w-7 bg-bronze" />
        <span className="font-serif text-[clamp(13px,calc(var(--fan-w)*0.09),17px)] font-light leading-[1.25] text-cream">
          {card.title}
        </span>
      </span>
    </span>
  );

  if (card.linkUrl && card.open === 'newTab') {
    return (
      <a {...shared} href={card.linkUrl} target="_blank" rel="noopener noreferrer" onClick={onActivate}>
        {face}
      </a>
    );
  }

  return (
    <button
      {...shared}
      type="button"
      aria-disabled={pending && isFront ? true : undefined}
      onClick={onActivate}
    >
      {face}
    </button>
  );
}

function ArrowButton({
  label,
  onClick,
  tone = 'light',
  size = 'md',
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full',
        'transition-all duration-400 ease-premium',
        'hover:border-bronze hover:bg-bronze hover:text-white',
        size === 'sm' ? 'size-11' : 'size-12',
        tone === 'dark'
          ? 'border border-cream/30 bg-cream/[0.1] text-cream backdrop-blur-[3px] hover:shadow-[0_14px_28px_-16px_rgba(155,112,64,0.45)]'
          : 'border border-forest/14 bg-white text-forest shadow-[0_10px_24px_-18px_rgba(45,58,45,0.45)] hover:shadow-[0_14px_28px_-16px_rgba(155,112,64,0.45)]',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
