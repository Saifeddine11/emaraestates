/**
 * Constants shared by the landing's server and client components. They live
 * in a plain module on purpose: a value exported from a `'use client'` file
 * reaches a server component as a client reference, not as the string.
 */

/** Anchor of the first lead card, right after the hero. */
export const FORM_ID = 'dossier';
/** Anchor of the closing lead card. */
export const FINAL_FORM_ID = 'disponibilites';
export const SHOW_APARTMENTS_ID = 'appartements-temoins';

export const PROJECT = 'Honest Signature 7';

/** Saves the form's draft before submit (see lead-draft.php). Never contact.php: that one creates CRM leads. */
export const LEAD_DRAFT_ENDPOINT = '/lead-draft.php';

/** Requests received today for the project (see activity.php). Read-only from the page. */
export const ACTIVITY_ENDPOINT = '/activity.php';

/** The page's one strong accent: gold is kept for the actions that lead to the form. */
export const CTA_PRIMARY =
  'group/cta relative inline-flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-gold px-6 py-3.5 text-center ' +
  'text-[14px] font-semibold uppercase leading-tight tracking-[0.07em] text-forest shadow-[0_14px_30px_-16px_rgba(120,84,30,0.75)] ' +
  'transition-[transform,background-color,box-shadow] duration-300 ease-step hover:-translate-y-0.5 hover:bg-[#dcbf8c] ' +
  'active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70';

/** Secondary actions: outline only. */
export const CTA_OUTLINE =
  'group/cta relative inline-flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full border border-forest/30 px-6 py-3.5 text-center ' +
  'text-[14px] font-semibold uppercase leading-tight tracking-[0.07em] text-forest transition-[transform,border-color,background-color] duration-300 ease-step ' +
  'hover:-translate-y-0.5 hover:border-forest hover:bg-forest/[0.04]';
