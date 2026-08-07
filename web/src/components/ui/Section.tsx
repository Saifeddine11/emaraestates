import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared section typography, on the Phase 01 type scale.
 *
 * Originally ported 1:1 from `.section-label` / `.section-title` /
 * `.section-text`. These now read the `--text-*` roles instead of carrying
 * their own clamps, so line height and tracking travel with the size and a
 * role cannot be used half-right.
 *
 * The bronze rule before every label is kept — it is brand, not decoration.
 * Only the proportions changed; no element was added, removed or renamed, so
 * the rendered text and heading structure are byte-identical.
 */

export function SectionLabel({
  children,
  className,
  tone = 'light',
  centered = false,
  rule = true,
}: {
  children: ReactNode;
  className?: string;
  /** `light` = on a pale background, `dark` = on forest/photo. */
  tone?: 'light' | 'dark';
  centered?: boolean;
  /** The 30px bronze rule. Suppressed in the project hero, as in the legacy CSS. */
  rule?: boolean;
}) {
  return (
    <div
      className={cn(
        // Weight + contrast carry presence; tracking stays elegant, not huge.
        'mb-5 flex items-center gap-3.5 text-eyebrow font-semibold uppercase',
        tone === 'light' ? 'text-forest/85' : 'text-bronze',
        centered && 'justify-center',
        className,
      )}
    >
      {rule && <span aria-hidden="true" className="h-px w-7 shrink-0 bg-bronze" />}
      {children}
    </div>
  );
}

type TitleProps = ComponentPropsWithoutRef<'h2'> & {
  as?: ElementType;
  tone?: 'light' | 'dark';
};

export function SectionTitle({
  children,
  className,
  as: Tag = 'h2',
  tone = 'light',
  ...props
}: TitleProps) {
  return (
    <Tag
      className={cn(
        'font-serif text-title font-normal',
        tone === 'light' ? 'text-forest' : 'text-cream',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function SectionText({
  children,
  className,
  tone = 'light',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      className={cn(
        // A weight step away from the heading, and a measure in characters
        // rather than pixels so it holds at every size.
        'measure text-lead font-normal',
        tone === 'light' ? 'text-forest/80' : 'text-cream/88',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Editorial inline link. Matches the legacy bronze underline treatment applied
 * to anchors inside `.section-text`.
 */
export function EditorialLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'border-b border-bronze/40 text-bronze transition-colors duration-250 ease-premium',
        'hover:border-forest/55 hover:text-forest',
        className,
      )}
    >
      {children}
    </a>
  );
}
