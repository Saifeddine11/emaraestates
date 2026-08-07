import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Buttons ported from `.btn-primary` / `.btn-outline`.
 *
 * `primary` keeps the signature wipe: a forest-green panel slides in from the
 * left on hover behind the label. `outline` has two tones because the legacy
 * sheet defines it for dark backgrounds and overrides it to forest on light
 * cards (`.featured-cta-secondary`).
 */

/**
 * CTA labels stay uppercase and tracked, but sized for confident scanning —
 * especially on mobile. Min height keeps a real tap target.
 */
const BASE =
  'relative inline-flex min-h-[54px] items-center justify-center overflow-hidden text-center ' +
  'font-sans text-[14.5px] font-semibold uppercase leading-[1.3] tracking-[1.7px] ' +
  'transition-all duration-[var(--duration-hover)] ease-premium ' +
  'active:translate-y-px active:duration-[var(--duration-move)] ' +
  'max-md:w-full max-md:max-w-[380px] max-md:min-h-[56px] max-md:px-6 max-md:text-[15.5px] max-md:tracking-[1.5px]';

const VARIANTS = {
  primary:
    'border border-bronze bg-bronze px-8 py-4 text-white ' +
    'hover:-translate-y-[1px] hover:shadow-[0_18px_42px_rgba(77,49,25,0.22)]',
  outlineDark:
    'border border-sand/40 bg-transparent px-8 py-4 text-cream ' +
    'hover:border-cream hover:bg-white/[0.06]',
  outlineLight:
    'border border-forest/[0.28] bg-transparent px-8 py-4 text-forest ' +
    'hover:border-forest hover:bg-forest/5',
} as const;

export type ButtonVariant = 'primary' | 'outline';
export type ButtonTone = 'light' | 'dark';

function classesFor(variant: ButtonVariant, tone: ButtonTone) {
  if (variant === 'primary') return VARIANTS.primary;
  return tone === 'light' ? VARIANTS.outlineLight : VARIANTS.outlineDark;
}

/** The sliding fill behind a primary label. Purely decorative. */
function PrimaryWipe() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 -translate-x-[101%] bg-forest transition-transform duration-[var(--duration-hover)] ease-premium group-hover:translate-x-0"
    />
  );
}

type AnchorProps = ComponentPropsWithoutRef<'a'> & {
  variant?: ButtonVariant;
  /** Which background the button sits on. Only affects `outline`. */
  tone?: ButtonTone;
  children: ReactNode;
};

export function ButtonLink({
  variant = 'primary',
  tone = 'dark',
  className,
  children,
  ...props
}: AnchorProps) {
  return (
    <a className={cn('group', BASE, classesFor(variant, tone), className)} {...props}>
      {variant === 'primary' && <PrimaryWipe />}
      <span className="relative z-[1]">{children}</span>
    </a>
  );
}

type NativeButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  tone = 'dark',
  className,
  children,
  type = 'button',
  ...props
}: NativeButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'group cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        BASE,
        classesFor(variant, tone),
        className,
      )}
      {...props}
    >
      {variant === 'primary' && <PrimaryWipe />}
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}
