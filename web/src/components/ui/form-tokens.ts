/**
 * Form control styling, as class strings rather than components.
 *
 * Deliberately not a set of `<Field>` / `<Input>` wrappers. The three forms on
 * this site are wire contracts: `contact.php`, `newsletter.php` and
 * `lead-gueliz.php` read them by `name`, and `form-parity.mjs` compares the
 * resulting payloads against the legacy build field for field. Swapping their
 * markup for new components would put that contract at risk for a purely
 * visual gain. A class string drops into an existing `className` and changes
 * no DOM at all, so parity cannot move.
 *
 * Added in Phase 01, applied in Phase 02.
 */

/**
 * 16px is a hard floor, not a preference: iOS Safari zooms the viewport on
 * focus for anything smaller, which on a lead form reads as the page breaking.
 * The 52px height matches the button primitive so rows line up.
 */
/**
 * Note the absence of `outline-none`. The controls this replaces all set it,
 * which removed the only keyboard focus indicator they had — the global
 * `:focus-visible` bronze outline in `globals.css`. Focus now reads twice: the
 * border turns bronze for everyone, and keyboard users additionally get the
 * global ring.
 */
export const fieldInput =
  'w-full min-h-[52px] rounded-[12px] border border-forest/15 bg-white px-4 py-3 ' +
  'text-[16px] font-normal leading-[1.4] text-forest ' +
  'transition-[border-color] duration-[var(--duration-move)] ease-premium ' +
  'placeholder:text-olive/55 hover:border-forest/25 focus:border-bronze';

export const fieldTextarea = `${fieldInput} min-h-[132px] resize-y py-3.5`;

/** Native select keeps the system chevron; only the box is restyled. */
export const fieldSelect = `${fieldInput} cursor-pointer pr-10`;

/**
 * Labels sit above their control rather than acting as placeholders, so the
 * question stays readable while the field is being filled in.
 */
export const fieldLabel =
  'mb-2 block text-caption font-medium uppercase tracking-[1.4px] text-olive';

/** Bronze is the accent; an error must never read as decoration. */
export const fieldError = 'mt-2 block text-caption font-normal text-[#8c4a32]';

/** Vertical gap between stacked controls — roomier on touch. */
export const fieldRow = 'flex flex-col gap-5 md:gap-4';

/** Marks a required field without relying on colour alone. */
export const fieldRequired = 'text-bronze';
