import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The card surface.
 *
 * Added in the Phase 01 foundation pass and deliberately not yet applied — the
 * existing cards are swapped onto it in Phase 02, one component at a time,
 * with the suite run between each.
 *
 * Its API is taken from the three card treatments already in the codebase
 * rather than invented: the réalisations card (light, in a snap row), the
 * Honest 5 feature card (light, static) and the video fan card (dark, on
 * forest). Between them they used two radii, six bespoke shadows and three
 * different hover behaviours; this reduces that to one radius, a two-tier
 * shadow and a single lift.
 */

type CardProps<T extends ElementType> = {
  as?: T;
  /** `light` sits on cream or shell, `dark` sits on forest. */
  tone?: 'light' | 'dark';
  /**
   * Whether the whole card responds to pointer. Set this only when the card is
   * itself a link or button — a lift on something unclickable is a lie.
   */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

const TONES = {
  light: 'border-forest/8 bg-white shadow-card',
  dark: 'border-cream/12 bg-forest shadow-card-dark',
} as const;

const INTERACTIVE = {
  light: 'hover:-translate-y-0.5 hover:border-forest/14 hover:shadow-card-hover',
  dark: 'hover:-translate-y-0.5 hover:border-cream/22',
} as const;

export function Card<T extends ElementType = 'div'>({
  as,
  tone = 'light',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={cn(
        'relative overflow-hidden rounded-card border',
        'transition-[transform,box-shadow,border-color] duration-[var(--duration-hover)] ease-premium',
        TONES[tone],
        interactive && INTERACTIVE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Fixed-ratio media box for a card.
 *
 * The ratio is required rather than optional. Every image on this site is
 * served unoptimised from Apache, so the intrinsic size never reaches the
 * browser early enough to reserve space — the aspect box is the only thing
 * standing between the layout and a visible shift.
 *
 * Pair with `group` on the card and `group-hover:scale-[1.03]` on the image
 * for the standard hover; the overflow clip lives here.
 */
export function CardMedia({
  ratio,
  className,
  children,
}: {
  /** A Tailwind aspect utility, e.g. `aspect-[16/10]`. */
  ratio: string;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('relative overflow-hidden', ratio, className)}>{children}</div>;
}
