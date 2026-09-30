/**
 * Class strings shared by the server-rendered landing and its client CTAs.
 * Kept out of the 'use client' modules: a server component importing a
 * constant from one receives a client reference, not the string.
 */

export const CTA_PRIMARY =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-8 py-4 text-[14px] font-medium uppercase tracking-[0.1em] text-cream transition-[background-color,transform,box-shadow] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-[#243024] hover:shadow-[0_14px_30px_-14px_rgba(45,58,45,0.6)]';
export const CTA_PRIMARY_ON_DARK =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-cream px-8 py-4 text-[14px] font-medium uppercase tracking-[0.1em] text-forest transition-[background-color,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-white';
export const TEXT_LINK =
  'inline-flex min-h-12 items-center gap-1.5 text-[15px] font-medium text-forest underline decoration-forest/25 underline-offset-[6px] transition-colors duration-300 hover:decoration-forest';
