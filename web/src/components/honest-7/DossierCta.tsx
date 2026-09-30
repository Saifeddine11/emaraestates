'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DOSSIER_ID, useLeadForm } from '@/components/honest-7/DossierLeadForm';
import { CTA_PRIMARY } from '@/components/honest-7/styles';
import { CTA_LABEL, type PropertyType } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

/**
 * Opens the lead drawer. A real `#dossier` anchor, so without JS it still
 * lands on the inline form at the end of the page.
 */
export function DossierCta({
  children = CTA_LABEL,
  className = CTA_PRIMARY,
  location,
  propertyType,
}: {
  children?: ReactNode;
  className?: string;
  /** `cta_location` on the CTA_Click event. */
  location: string;
  propertyType?: PropertyType;
}) {
  const { openDrawer } = useLeadForm();
  return (
    <a
      href={`#${DOSSIER_ID}`}
      aria-haspopup="dialog"
      data-cta={location}
      onClick={(event) => {
        event.preventDefault();
        openDrawer({ location, propertyType });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

/**
 * Mobile-only bottom bar. Appears once the hero CTA has scrolled away and only
 * while the inline form is still ahead, so it never sits on the form or the
 * footer. The right edge stays clear of the site's WhatsApp float
 * (bottom-6 right-6, 56px).
 */
export function StickyDossierCta({ heroId }: { heroId: string }) {
  const [shown, setShown] = useState(false);
  const { drawerOpen } = useLeadForm();

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const form = document.getElementById(DOSSIER_ID);
    if (!hero || !form) return;
    const inPageCtas = [...document.querySelectorAll<HTMLElement>('main [data-cta]')].filter(
      (cta) => !cta.closest('[data-sticky-cta]'),
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const heroGone = hero.getBoundingClientRect().bottom < 0;
      const formAhead = form.getBoundingClientRect().top > vh;
      // Never stack on top of the in-page CTA it duplicates.
      const ctaInBar = inPageCtas.some((cta) => {
        const rect = cta.getBoundingClientRect();
        return rect.bottom > vh - 120 && rect.top < vh;
      });
      setShown(heroGone && formAhead && !ctaInBar);
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

  const visible = shown && !drawerOpen;
  return (
    <div
      data-sticky-cta
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-4 right-[92px] z-80 transition-[opacity,transform] duration-300 ease-premium md:hidden',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <DossierCta
        location="sticky_mobile"
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-forest px-4 text-[13.5px] font-medium uppercase tracking-[0.08em] text-cream shadow-[0_14px_34px_rgba(30,50,32,0.3)]"
      />
    </div>
  );
}
