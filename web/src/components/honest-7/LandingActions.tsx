'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Orbit } from '@/components/honest-7/Icons';
import { useLeadForm } from '@/components/honest-7/LeadFormState';
import { CTA_PRIMARY, FORM_ID, PROJECT } from '@/components/honest-7/shared';
import { trackLandingEvent, type LandingEvent } from '@/lib/landing-events';
import { cn } from '@/lib/cn';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scrolls `target` to the top of the screen, clear of the header where it is
 * sticky (lg and up). Done by hand rather than with scrollIntoView so the
 * site-wide 96px `scroll-padding-top` does not leave a dead band on phones.
 */
function scrollToElement(target: HTMLElement) {
  const offset = window.matchMedia('(min-width: 1024px)').matches ? 96 : 14;
  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - offset,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

/**
 * The lead card closest to where the visitor is: the first one from the top
 * of the page, the closing one from the bottom, so nobody is sent back up the
 * whole page. The card glows once and takes focus (without scrolling) so
 * keyboard and screen-reader users land in it too.
 */
function scrollToNearestForm() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-lead-form]'));
  if (!cards.length) return;
  const middle = window.innerHeight / 2;
  const distance = (card: HTMLElement) => {
    const rect = card.getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - middle);
  };
  const card = cards.reduce((best, candidate) => (distance(candidate) < distance(best) ? candidate : best));
  // Land on the heading that introduces the card when it sits above it (phones),
  // so the visitor sees they have reached the form, not just a box of options.
  const intro = document.querySelector<HTMLElement>(`[data-lead-intro="${card.dataset.leadForm}"]`);
  scrollToElement(intro && intro.getBoundingClientRect().top < card.getBoundingClientRect().top ? intro : card);
  card.focus({ preventScroll: true });
  card.setAttribute('data-arrived', '');
  window.setTimeout(() => card.removeAttribute('data-arrived'), 1400);
}

/**
 * Every CTA of the page. A real `#anchor` link (it works without JavaScript),
 * enhanced into a tracked smooth scroll. `to="form"` targets the nearest lead
 * card; any other value is the id of a section.
 */
export function ScrollCta({
  children,
  to = 'form',
  event,
  location,
  className,
  heroCta = false,
}: {
  children: ReactNode;
  to?: 'form' | string;
  event: LandingEvent;
  location: string;
  className?: string;
  /** Marks the hero's primary CTA: the sticky CTAs appear once it has scrolled away. */
  heroCta?: boolean;
}) {
  return (
    <a
      href={`#${to === 'form' ? FORM_ID : to}`}
      data-hero-cta={heroCta ? '' : undefined}
      onClick={(click) => {
        click.preventDefault();
        trackLandingEvent(event, { project: PROJECT, location });
        if (to === 'form') {
          scrollToNearestForm();
          return;
        }
        const target = document.getElementById(to);
        if (!target) return;
        scrollToElement(target);
        target.focus({ preventScroll: true });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

/**
 * Fires a view event once, when the section reaches the middle band of the
 * screen — a ratio threshold would never trigger on sections taller than the
 * viewport.
 */
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
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackLandingEvent(event, { project: PROJECT });
        observer.disconnect();
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event, node]);
  return (
    <section ref={setNode} id={id} tabIndex={-1} aria-labelledby={labelledBy} className={cn('outline-none', className)}>
      {children}
    </section>
  );
}

/**
 * True once the hero's primary CTA has scrolled away, while no lead card is
 * on screen, no field has the keyboard, and no lead has been sent yet.
 */
function useFloatingCta() {
  const { stage } = useLeadForm();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const heroCta = document.querySelector<HTMLElement>('[data-hero-cta]');
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-lead-form]'));
    if (!heroCta || !cards.length) return;

    const visibleCards = new Set<Element>();
    let typing = false;
    const update = () => {
      const heroPassed = heroCta.getBoundingClientRect().bottom < 0;
      setShown(heroPassed && visibleCards.size === 0 && !typing);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visibleCards.add(entry.target) : visibleCards.delete(entry.target)));
        update();
      },
      { threshold: 0 },
    );
    cards.forEach((card) => observer.observe(card));

    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(() => ((frame = 0), update()));
    };
    // A focused field means the on-screen keyboard is up: a bar pinned to the
    // bottom would then sit on top of what is being typed.
    const onFocusIn = (event: FocusEvent) => {
      typing = (event.target as Element | null)?.matches?.('input, textarea, select') ?? false;
      update();
    };
    const onFocusOut = () => {
      typing = false;
      update();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return shown && stage === 'form';
}

/**
 * Mobile bottom bar. `env(safe-area-inset-bottom)` (the page opts into
 * `viewport-fit=cover`) keeps the button above the iPhone home indicator when
 * Safari's toolbar is collapsed; when the toolbar is shown, Safari already
 * places fixed elements above it.
 */
export function StickyCta() {
  const visible = useFloatingCta();
  return (
    <div
      data-sticky-cta
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'fixed inset-x-0 bottom-0 z-80 px-4 pt-6 lg:hidden',
        'pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]',
        'bg-gradient-to-t from-shell from-55% to-shell/0',
        'transition-[opacity,transform] duration-300 ease-step',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <ScrollCta event="availability_cta_click" location="sticky_mobile" className={cn(CTA_PRIMARY, 'w-full text-[13.5px]')}>
        <Orbit />
        Demander les disponibilités
        <ArrowRight className="transition-transform duration-300 ease-step group-hover/cta:translate-x-1" />
      </ScrollCta>
    </div>
  );
}

/** The same CTA for desktop, in the sticky header, under the same conditions. */
export function HeaderCta() {
  const visible = useFloatingCta();
  return (
    <div
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'hidden transition-[opacity,transform] duration-300 ease-step lg:block',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
      )}
    >
      <ScrollCta event="availability_cta_click" location="header" className={cn(CTA_PRIMARY, 'min-h-11 px-5 py-2 text-[12.5px] shadow-none')}>
        <Orbit />
        Demander les disponibilités
      </ScrollCta>
    </div>
  );
}
