import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, with later Tailwind utilities winning.
 *
 * Custom `--text-*` roles from `globals.css` must be registered as font-size
 * tokens; otherwise `tailwind-merge` treats `text-title` / `text-lead` as
 * colors and drops them when `text-forest` is also present — which silently
 * collapses section titles to body size.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-display',
        'text-title',
        'text-subhead',
        'text-lead',
        'text-body',
        'text-caption',
        'text-eyebrow',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
