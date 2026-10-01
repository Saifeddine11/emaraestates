'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { trackLandingEvent, type LandingEvent } from '@/lib/landing-events';

export const HERO_FORM_ID = 'prix-disponibilites';
export const FINAL_FORM_ID = 'demande-finale';
export const SHOW_APARTMENTS_ID = 'appartements-temoins';

export function ScrollCta({
  children,
  target,
  event,
  location,
  className,
}: {
  children: ReactNode;
  target: string;
  event: LandingEvent;
  location: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={() => {
        trackLandingEvent(event, { project: 'Honest Signature 7', location });
        document.getElementById(target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function SectionView({
  event,
  children,
  className,
  id,
  labelledBy,
}: {
  event: LandingEvent;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackLandingEvent(event, { project: 'Honest Signature 7' });
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event]);
  return <section ref={ref} id={id} aria-labelledby={labelledBy} className={className}>{children}</section>;
}

/** Appears only after the first form has passed; hides while either form is visible. */
export function StickyAvailabilityCta() {
  const [passedHeroForm, setPassedHeroForm] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById(HERO_FORM_ID);
    const forms = [hero, document.getElementById(FINAL_FORM_ID)].filter(Boolean) as HTMLElement[];
    if (!hero || !forms.length) return;

    let visible = new Set<Element>();
    const formObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      setFormVisible(visible.size > 0);
    }, { threshold: 0.08 });
    forms.forEach((form) => formObserver.observe(form));

    const sentinelObserver = new IntersectionObserver(([entry]) => {
      setPassedHeroForm(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    sentinelObserver.observe(hero);
    return () => {
      visible = new Set();
      formObserver.disconnect();
      sentinelObserver.disconnect();
    };
  }, []);

  return (
    <div
      data-sticky-availability=""
      aria-hidden={!passedHeroForm || formVisible}
      inert={!passedHeroForm || formVisible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 ease-step lg:hidden',
        passedHeroForm && !formVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <ScrollCta
        target={FINAL_FORM_ID}
        event="availability_cta_click"
        location="mobile_sticky"
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-gold px-6 text-[14px] font-semibold uppercase tracking-[0.08em] text-forest shadow-[0_14px_35px_-15px_rgba(0,0,0,.65)]"
      >
        Voir les disponibilités <span aria-hidden="true" className="ml-2">→</span>
      </ScrollCta>
    </div>
  );
}
