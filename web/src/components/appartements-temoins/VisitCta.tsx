'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import type { VisitType } from '@/lib/content/appartements-temoins';
import { VISIT_FORM_ID, VISIT_INTENT_EVENT } from '@/components/appartements-temoins/VisitRequestForm';
import { cn } from '@/lib/cn';

/**
 * A real `#demande-visite` anchor (works without JS) that also tells the form
 * which request the visitor chose, so "Planifier une visite" and "Recevoir les
 * disponibilités" land on the matching option.
 */
export function VisitCta({
  intent,
  className,
  children,
}: {
  intent: VisitType;
  className?: string;
  children: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <a
      href={`#${VISIT_FORM_ID}`}
      onClick={(event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(VISIT_INTENT_EVENT, { detail: intent }));
        document.getElementById(VISIT_FORM_ID)?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

export const CTA_PRIMARY =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-cream px-7 py-4 text-[14px] font-semibold text-forest transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-white';
export const CTA_PRIMARY_DARK =
  'inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-7 py-4 text-[14px] font-semibold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze';
export const CTA_SECONDARY_ON_DARK =
  'inline-flex min-h-14 items-center justify-center rounded-full border border-cream/35 px-7 py-4 text-[14px] font-semibold text-cream transition-colors duration-300 hover:border-cream hover:bg-cream/10';

/**
 * Mobile-only slim CTA. Appears once the hero has scrolled away and hides
 * while the form is on screen, so it never sits on top of the form it points
 * to. Leaves the bottom-right corner free for the site's WhatsApp float.
 */
export function StickyVisitCta({ heroId }: { heroId: string }) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const form = document.getElementById(VISIT_FORM_ID);
    if (!hero || !form) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setHeroVisible(entry.isIntersecting);
        if (entry.target === form) setFormVisible(entry.isIntersecting);
      }
    });
    observer.observe(hero);
    observer.observe(form);
    return () => observer.disconnect();
  }, [heroId]);

  const shown = !heroVisible && !formVisible;

  return (
    <div
      data-sticky-cta
      aria-hidden={!shown}
      inert={shown ? undefined : true}
      className={cn(
        'fixed bottom-6 left-4 right-[92px] z-80 transition-all duration-300 ease-premium md:hidden',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <VisitCta
        intent="Visite d’un appartement témoin"
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-forest px-6 text-[14px] font-semibold text-white shadow-[0_14px_34px_rgba(30,50,32,0.28)]"
      >
        Planifier une visite
      </VisitCta>
    </div>
  );
}
