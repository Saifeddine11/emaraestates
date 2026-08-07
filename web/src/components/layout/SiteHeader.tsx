'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ANCHORS, ROUTES } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * Fixed header + mobile overlay menu.
 *
 * Link destinations are preserved exactly, including the deliberate split
 * where "Nos réalisations" points at `/#appartement-temoin-honest` (an sr-only
 * anchor) rather than at `/#nos-réalisations`, which the footer uses.
 *
 * All hrefs are plain anchors rather than `next/link`: every destination other
 * than `/` is still served by the legacy static build, so client-side routing
 * would 404.
 */

type NavChild = { label: string; href: string };

const PROJECTS_CHILDREN: NavChild[] = [{ label: 'Honest Signature 7', href: ROUTES.residences }];

const REALISATIONS_CHILDREN: NavChild[] = [
  { label: 'Honest 1', href: `/${ANCHORS.appartementTemoinHonest}` },
  { label: 'Honest 2', href: `/${ANCHORS.appartementTemoinHonest}` },
  { label: 'Honest 3', href: `/${ANCHORS.appartementTemoinHonest}` },
  { label: 'Honest 4', href: `/${ANCHORS.appartementTemoinHonest}` },
];

/**
 * Phase 02: tracking roughly halved and a weight step added, matching the move
 * the eyebrow made in Phase 01 — presence now comes from weight rather than
 * from spacing letters apart. The clamps stay because the row has to hold five
 * items plus the logo from 769px up, and tighter tracking is what buys that
 * room back.
 */
const LINK_BASE =
  'relative shrink-0 whitespace-nowrap text-[clamp(13px,0.95vw,14px)] font-medium uppercase ' +
  'tracking-[clamp(1.1px,0.11vw,1.5px)] text-cream ' +
  'transition-colors duration-[var(--duration-hover)] ease-premium hover:text-bronze ' +
  'after:absolute after:-bottom-2 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 ' +
  'after:bg-bronze after:transition-all after:duration-[var(--duration-hover)] after:ease-premium ' +
  'hover:after:w-full';

function Dropdown({ label, href, items }: { label: string; href: string; items: NavChild[] }) {
  return (
    <div className="group relative shrink-0">
      {/* Bridges the gap to the panel so the pointer can travel without closing it. */}
      <span aria-hidden="true" className="absolute -inset-x-3.5 top-full h-[18px]" />
      <a href={href} className={cn(LINK_BASE, 'group-hover:text-bronze group-hover:after:w-full')}>
        {label}
      </a>
      <div
        className={cn(
          'invisible absolute left-1/2 top-full z-[200] mt-2 min-w-[228px] -translate-x-1/2 translate-y-1',
          'rounded-card border border-sand/18 bg-forest/95 py-2 opacity-0 backdrop-blur-xl',
          'shadow-[0_22px_50px_-24px_rgb(0_0_0_/_0.55)]',
          'transition-[opacity,visibility,transform] duration-[var(--duration-move)] ease-premium',
          'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100',
        )}
      >
        {items.map((child, index) => (
          <a
            key={`${child.label}-${index}`}
            href={child.href}
            // 44px rows: these are pointer targets on hybrid laptops too.
            className="flex min-h-[44px] items-center whitespace-nowrap px-5 text-[13.5px] font-medium uppercase tracking-[1.4px] text-cream/85 transition-colors duration-[var(--duration-move)] ease-premium hover:bg-cream/[0.06] hover:text-bronze"
          >
            {child.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/** Flat list; `sub` is a visual grouping only — every destination is preserved. */
const MOBILE_ITEMS: { label: string; href: string; sub: boolean }[] = [
  { label: 'Accueil', href: ROUTES.home, sub: false },
  { label: 'Nos projets sur plan', href: ROUTES.residences, sub: false },
  { label: 'Honest Signature 7', href: ROUTES.residences, sub: true },
  { label: 'Nos réalisations', href: `/${ANCHORS.appartementTemoinHonest}`, sub: false },
  { label: 'Honest 1', href: `/${ANCHORS.appartementTemoinHonest}`, sub: true },
  { label: 'Honest 2', href: `/${ANCHORS.appartementTemoinHonest}`, sub: true },
  { label: 'Honest 3', href: `/${ANCHORS.appartementTemoinHonest}`, sub: true },
  { label: 'Honest 4', href: `/${ANCHORS.appartementTemoinHonest}`, sub: true },
  { label: 'FAQ', href: `/${ANCHORS.faq}`, sub: false },
  { label: 'Contact', href: ROUTES.contact, sub: false },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 80);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /**
   * Lock the page behind the overlay, dismiss on Escape, and keep Tab inside
   * the panel while it is open.
   *
   * The trap and the focus handoff are new: the overlay covers the viewport,
   * so without them a keyboard user tabbed straight into the page behind it
   * with nothing visible to follow. Mirrors `VideoModal`.
   */
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Captured now: the ref may point elsewhere by the time cleanup runs.
    const toggle = toggleRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      toggle?.focus();
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav
        id="nav"
        className={cn(
          'fixed inset-x-0 top-0 z-100 flex items-center justify-between gap-[clamp(20px,3vw,46px)]',
          'px-gutter transition-all duration-500 ease-premium',
          'after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-10 after:content-[""]',
          // At rest the bar is a scrim rather than a panel: a top-down fade
          // that darkens only what sits behind the links. The pale wash it
          // used to carry read as a sheet floating on the photograph, and left
          // the right-hand items low-contrast wherever the image went light.
          // On scroll it resolves into a proper forest bar with a hairline.
          scrolled
            ? 'bg-forest/85 py-2.5 shadow-[0_1px_0_0_rgb(200_187_168_/_0.12),0_18px_44px_-28px_rgb(0_0_0_/_0.5)] backdrop-blur-xl after:bg-gradient-to-b after:from-forest/35 after:to-transparent'
            : 'bg-gradient-to-b from-black/40 via-black/18 to-transparent py-3.5 after:bg-gradient-to-b after:from-black/10 after:to-transparent',
        )}
      >
        <div className="shrink-0">
          <a href={ROUTES.home} className="inline-flex items-center">
            <Image
              src="/img/logo.webp"
              alt="Emara Estates"
              width={1250}
              height={625}
              priority
              className={cn(
                // A smaller delta between states: the logo used to jump 6px on
                // the first scroll tick, which read as a stutter.
                'w-auto max-w-[150px] transition-all duration-500 ease-premium',
                scrolled ? 'h-[clamp(42px,4.8dvh,52px)]' : 'h-[clamp(46px,5.2dvh,56px)]',
              )}
            />
          </a>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-[clamp(22px,3.1vw,48px)] md:flex">
          <a href={ROUTES.home} className={LINK_BASE}>
            Accueil
          </a>
          <Dropdown label="Nos projets sur plan" href={ROUTES.residences} items={PROJECTS_CHILDREN} />
          <Dropdown
            label="Nos réalisations"
            href={`/${ANCHORS.appartementTemoinHonest}`}
            items={REALISATIONS_CHILDREN}
          />
          <a href={`/${ANCHORS.faq}`} className={LINK_BASE}>
            FAQ
          </a>
          <a
            href={ROUTES.contact}
            className={cn(
              LINK_BASE,
              // Aligned to the Button primitive: same tracking, weight and a
              // real 44px target, so the nav CTA and the page CTAs read as one
              // family rather than two.
              'inline-flex min-h-[44px] items-center border border-bronze/50 px-[clamp(20px,2vw,26px)] after:hidden',
              'transition-all duration-[var(--duration-hover)] hover:border-bronze hover:bg-bronze hover:text-white',
              'active:translate-y-px active:duration-[var(--duration-move)]',
            )}
          >
            Contact
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          ref={toggleRef}
          aria-controls="mobileMenu"
          aria-expanded={menuOpen}
          // 48px target. It was a 24px bar with 10px padding, which is under
          // the comfortable minimum on the one control every phone user needs.
          className="z-[101] -mr-2 flex size-12 cursor-pointer flex-col items-center justify-center gap-[5px] border-0 bg-transparent md:hidden"
        >
          <span
            className={cn(
              'h-px w-6 bg-cream transition-all duration-300 ease-premium',
              menuOpen && 'translate-y-[6px] rotate-45',
            )}
          />
          <span
            className={cn(
              'h-px w-6 bg-cream transition-all duration-300 ease-premium',
              menuOpen && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'h-px w-6 bg-cream transition-all duration-300 ease-premium',
              menuOpen && '-translate-y-[6px] -rotate-45',
            )}
          />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobileMenu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.32,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="fixed inset-0 z-[999] overflow-y-auto overscroll-contain bg-forest md:hidden"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Fermer le menu"
              className="absolute right-4 top-4 z-[1] flex size-12 cursor-pointer items-center justify-center border-0 bg-transparent text-cream transition-colors duration-[var(--duration-move)] ease-premium hover:text-bronze"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>

            {/* `min-h-full` on the inner column so the list centres when it
                fits and scrolls from the top when it does not — the previous
                `justify-center` on the scroll container clipped the first
                items unreachably on short screens. */}
            <div className="flex min-h-full flex-col items-stretch justify-center gap-0.5 px-6 py-24">
              {MOBILE_ITEMS.map((item, index) => (
                <motion.a
                  key={`${item.label}-${index}`}
                  href={item.href}
                  onClick={close}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.42, delay: 0.04 + index * 0.028, ease: [0.23, 1, 0.32, 1] }
                  }
                  className={cn(
                    // The whole row is the target, not just the glyphs.
                    'flex min-h-[52px] items-center rounded-[10px] px-4 font-serif font-light',
                    'transition-colors duration-[var(--duration-move)] ease-premium',
                    'hover:bg-cream/[0.05] hover:text-bronze active:bg-cream/[0.08]',
                    item.sub ? 'text-[24px] text-cream/65' : 'text-[31px] text-cream',
                  )}
                >
                  {item.label}
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
