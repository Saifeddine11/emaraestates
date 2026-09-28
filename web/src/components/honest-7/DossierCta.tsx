'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const DOSSIER_ID = 'dossier';
/** Lets "Organiser une visite" pre-tick the visit box in the form. */
export const VISIT_INTENT_EVENT = 'emara:hs7-visit-intent';

export const CTA_PRIMARY =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-8 py-4 text-[15px] font-medium tracking-[0.01em] text-cream transition-[background-color,transform,box-shadow] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-[#243024] hover:shadow-[0_14px_30px_-14px_rgba(45,58,45,0.6)]';
export const CTA_PRIMARY_ON_DARK =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-cream px-8 py-4 text-[15px] font-medium tracking-[0.01em] text-forest transition-[background-color,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-white';
export const TEXT_LINK =
  'inline-flex min-h-12 items-center gap-1.5 text-[15px] font-medium text-forest underline decoration-forest/25 underline-offset-[6px] transition-colors duration-300 hover:decoration-forest';

/**
 * A real `#dossier` anchor (works without JS) that scrolls smoothly and can
 * flag a visit request on the way.
 */
export function DossierCta({
  children = 'Recevoir le dossier',
  className = CTA_PRIMARY,
  visit = false,
}: {
  children?: ReactNode;
  className?: string;
  visit?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <a
      href={`#${DOSSIER_ID}`}
      onClick={(event) => {
        event.preventDefault();
        if (visit) window.dispatchEvent(new CustomEvent(VISIT_INTENT_EVENT));
        document.getElementById(DOSSIER_ID)?.scrollIntoView({
          behavior: reduce ? 'auto' : 'smooth',
          block: 'start',
        });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

/**
 * Mobile-only bottom bar. Appears once the hero is gone and only while the
 * form is still ahead, so it never sits on the form or the footer. The right
 * edge stays clear for the site's WhatsApp float.
 */
export function StickyDossierCta({ heroId }: { heroId: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const form = document.getElementById(DOSSIER_ID);
    if (!hero || !form) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const heroGone = hero.getBoundingClientRect().bottom < 0;
      const formAhead = form.getBoundingClientRect().top > window.innerHeight;
      setShown(heroGone && formAhead);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [heroId]);

  return (
    <div
      data-sticky-cta
      aria-hidden={!shown}
      inert={shown ? undefined : true}
      className={cn(
        'fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-4 right-[92px] z-80 transition-[opacity,transform] duration-300 ease-premium md:hidden',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <DossierCta className="flex min-h-14 w-full items-center justify-center rounded-full bg-forest px-6 text-[15px] font-medium text-cream shadow-[0_14px_34px_rgba(30,50,32,0.3)]" />
    </div>
  );
}
