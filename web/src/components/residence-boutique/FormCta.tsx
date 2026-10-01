'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Arrow, FORM_ANCHOR } from '@/components/residence-boutique/BoutiqueLeadForm';
import { useLeadForm } from '@/components/residence-boutique/LeadFormState';
import { trackLandingEvent, type LandingEvent } from '@/lib/landing-events';
import { cn } from '@/lib/cn';

export const CTA_DARK =
  'group/cta inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-forest px-7 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-cream ' +
  'transition-[transform,background-color,box-shadow] duration-300 ease-step hover:-translate-y-px hover:bg-[#243024] hover:shadow-[0_16px_32px_-16px_rgba(45,58,45,0.7)]';
export const CTA_GOLD =
  'group/cta inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-gold px-7 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-forest ' +
  'transition-[transform,background-color] duration-300 ease-step hover:-translate-y-px hover:bg-[#dcbf8c]';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scrolls to whichever lead card is closest to where the visitor is — the
 * hero card from the top of the page, the closing card from the bottom — so
 * nobody is sent back up the page. The card then glows once and takes focus
 * (without scrolling) so screen-reader users land in it too.
 */
export function scrollToNearestForm() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-lead-form]'));
  if (!cards.length) return;
  const middle = window.innerHeight / 2;
  const card = cards.reduce((best, candidate) => {
    const distance = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return Math.abs(rect.top + rect.height / 2 - middle);
    };
    return distance(candidate) < distance(best) ? candidate : best;
  });
  card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  card.focus({ preventScroll: true });
  card.setAttribute('data-arrived', '');
  window.setTimeout(() => card.removeAttribute('data-arrived'), 1400);
}

/** A real `#disponibilites` anchor (works without JS), enhanced into a smooth scroll. */
export function FormCta({
  children,
  event = 'availability_cta_click',
  location,
  className = CTA_DARK,
  arrow = true,
  nudge = false,
}: {
  children: ReactNode;
  event?: Extract<LandingEvent, 'hero_cta_click' | 'availability_cta_click'>;
  location: string;
  className?: string;
  arrow?: boolean;
  /** Nudge the arrow twice the first time the CTA scrolls into view. */
  nudge?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const link = ref.current;
    if (!nudge || !link) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        link.setAttribute('data-nudge', '');
        observer.disconnect();
      },
      { threshold: 1 },
    );
    observer.observe(link);
    return () => observer.disconnect();
  }, [nudge]);

  return (
    <a
      ref={ref}
      href={`#${FORM_ANCHOR}`}
      onClick={(clickEvent) => {
        clickEvent.preventDefault();
        trackLandingEvent(event, { location });
        scrollToNearestForm();
      }}
      className={cn(className, nudge && 'rb-arrow-nudge')}
    >
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

/**
 * Mobile bottom bar. Shown only once the hero card has scrolled away and
 * while no lead card is on screen; gone for good after a successful lead.
 * Respects the iPhone home indicator via safe-area-inset-bottom.
 */
export function StickyFormCta() {
  const { succeeded } = useLeadForm();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-lead-form]'));
    const hero = cards.find((card) => card.dataset.leadForm === 'hero');
    if (!hero) return;
    const onScreen = new Map<Element, boolean>();
    const update = () => {
      const anyVisible = Array.from(onScreen.values()).some(Boolean);
      const heroPassed = hero.getBoundingClientRect().bottom < 0;
      setShown(heroPassed && !anyVisible);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => onScreen.set(entry.target, entry.isIntersecting));
        update();
      },
      { threshold: 0 },
    );
    cards.forEach((card) => observer.observe(card));
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(() => ((frame = 0), update()));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const visible = shown && !succeeded;
  return (
    <div
      data-sticky-cta
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'fixed inset-x-0 bottom-0 z-80 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:hidden',
        'bg-gradient-to-t from-shell via-shell/90 to-shell/0',
        'transition-[opacity,transform] duration-300 ease-step',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <FormCta
        location="sticky_mobile"
        className={cn(CTA_DARK, 'w-full shadow-[0_16px_34px_-12px_rgba(30,50,32,0.45)]')}
      >
        Voir les disponibilités
      </FormCta>
    </div>
  );
}

/**
 * Fires a `*_section_view` event once, when the section reaches the middle
 * band of the screen — a ratio threshold would never trigger on sections
 * taller than the viewport.
 */
export function SectionView({
  event,
  children,
  className,
  id,
  labelledBy,
}: {
  event: Extract<LandingEvent, 'amenities_section_view' | 'payment_section_view'>;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackLandingEvent(event);
        observer.disconnect();
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event, node]);
  return (
    <section ref={setNode} id={id} aria-labelledby={labelledBy} className={className}>
      {children}
    </section>
  );
}
