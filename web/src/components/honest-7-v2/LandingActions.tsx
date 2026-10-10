'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Orbit } from '@/components/honest-7-v2/Icons';
import { useLeadForm } from '@/components/honest-7-v2/LeadFormState';
import { CTA_PRIMARY, FORM_ID, PROJECT } from '@/components/honest-7-v2/shared';
import { trackLandingEvent, type LandingEvent } from '@/lib/landing-events';
import { WHATSAPP } from '@/lib/site';
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
 * The bottom bar, on every screen size: the dossier CTA and WhatsApp side by
 * side, as soon as the hero's CTA has scrolled away and while no lead card is
 * on screen. `env(safe-area-inset-bottom)` (the page opts into
 * `viewport-fit=cover`) keeps it above the iPhone home indicator.
 */
export function StickyCta() {
  const visible = useFloatingCta();
  return (
    <div
      data-sticky-cta
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'fixed inset-x-0 bottom-0 z-80 px-4 pt-6',
        'pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]',
        'bg-gradient-to-t from-shell from-55% to-shell/0 lg:bg-none lg:pb-6',
        'transition-[opacity,transform] duration-300 ease-step',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <div className="mx-auto flex max-w-[560px] items-stretch gap-2.5 lg:rounded-full lg:bg-shell/90 lg:p-2 lg:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)] lg:backdrop-blur-md">
        <ScrollCta event="availability_cta_click" location="sticky_bar" className={cn(CTA_PRIMARY, 'min-h-14 flex-1 justify-between gap-3 pl-6 pr-2.5 normal-case tracking-normal')}>
          <Orbit />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[15.5px] font-semibold">Recevoir le dossier</span>
            <span className="text-[12px] font-medium text-forest/70">Gratuit · sans engagement</span>
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest/10">
            <ArrowRight className="transition-transform duration-300 ease-step group-hover/cta:translate-x-0.5" />
          </span>
        </ScrollCta>
        <a
          href={WHATSAPP.bare}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Écrire sur WhatsApp"
          onClick={() => trackLandingEvent('whatsapp_click', { project: PROJECT, location: 'sticky_bar' })}
          className="flex w-14 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-step hover:-translate-y-0.5"
        >
          <WhatsAppMark />
        </a>
      </div>
    </div>
  );
}

/** WhatsApp's glyph, inline: the page loads no icon font. */
export function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn('size-6', className)}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28" />
    </svg>
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
