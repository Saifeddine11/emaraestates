'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { OgIcon } from '@/components/offre-gueliz/icons';
import { ROUTES } from '@/lib/site';
import {
  OG_AMENITIES,
  OG_BRAND,
  OG_FEATURES,
  OG_HEADER,
  OG_LOCATION,
} from '@/lib/content/offre-gueliz';
import { cn } from '@/lib/cn';

/**
 * Chrome and content sections for `/offre-gueliz`.
 *
 * This page has its own header and footer and none of the site chrome — no
 * nav, no mobile menu, no intro curtain, no WhatsApp float. That is the legacy
 * design, not an omission.
 */

/** Shared by the header, hero and sticky CTAs — all scroll, none navigate. */
function scrollToForm() {
  document.getElementById('og-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const BUTTON =
  'cursor-pointer rounded-[10px] bg-bronze px-7 py-4 text-[13.5px] font-normal uppercase tracking-[2.5px] text-white transition-all duration-400 ease-premium hover:bg-forest';

export function GuelizHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-forest/8 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-[clamp(20px,4vw,44px)] py-3.5">
        <a href={ROUTES.home} aria-label="Emara Estates — accueil" className="block">
          <Image
            src={OG_BRAND.logo}
            alt={OG_BRAND.logoAlt}
            width={1250}
            height={625}
            priority
            className="h-[34px] w-auto min-[561px]:h-10"
          />
        </a>
        <button type="button" data-scroll-to-form onClick={scrollToForm} className={BUTTON}>
          <span className="max-sm:hidden">{OG_HEADER.ctaFull}</span>
          <span className="sm:hidden">{OG_HEADER.ctaShort}</span>
        </button>
      </div>
    </header>
  );
}

export function GuelizFeatures() {
  return (
    <section
      aria-labelledby="og-features-title"
      className="bg-cream px-[clamp(20px,4vw,44px)] py-[clamp(48px,7vw,96px)]"
    >
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-[20px]">
            <Image
              src={OG_FEATURES.image.src}
              alt={OG_FEATURES.image.alt}
              width={OG_FEATURES.image.width}
              height={OG_FEATURES.image.height}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <span className="mb-4 block text-[13.5px] font-normal uppercase tracking-[4px] text-bronze">
              {OG_FEATURES.label}
            </span>
            <h1
              id="og-features-title"
              className="text-balance font-serif text-[clamp(34px,4.4vw,58px)] font-light leading-[1.1] text-forest"
            >
              {OG_FEATURES.title}
            </h1>
            <p className="mt-5 max-w-[560px] text-[16px] font-normal leading-[1.9] text-forest/75">
              {OG_FEATURES.text}
            </p>
          </Reveal>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {OG_FEATURES.items.map((item, index) => (
              <Reveal key={item.text} direction="up" delay={0.04 * (index + 1)}>
                <div className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white/60 px-4 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bronze/10 text-bronze">
                    <OgIcon name={item.icon} className="size-4" />
                  </span>
                  <span className="text-[16px] font-normal text-forest">{item.text}</span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <button
              type="button"
              data-scroll-to-form
              onClick={scrollToForm}
              className={cn(BUTTON, 'mt-8 w-full sm:w-auto')}
            >
              {OG_FEATURES.cta}
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * Click-to-load map.
 *
 * The iframe only mounts once the visitor asks for it. On a paid-traffic page
 * the Google Maps embed is the single heaviest thing on the route, and eager
 * loading it would cost mobile performance for visitors who never look at it.
 */
function GuelizMap() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div data-map className="relative aspect-4/3 overflow-hidden rounded-[20px] border border-forest/10 bg-shell">
      {loaded ? (
        <iframe
          src={OG_LOCATION.mapEmbedSrc}
          title={OG_LOCATION.mapTitle}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="size-full border-0"
        />
      ) : (
        <button
          type="button"
          data-map-trigger
          aria-label={OG_LOCATION.mapTriggerLabel}
          onClick={() => setLoaded(true)}
          className="flex size-full cursor-pointer flex-col items-center justify-center gap-3 text-forest/75 transition-colors duration-300 hover:bg-forest/[0.03] hover:text-bronze"
        >
          <OgIcon name="pin" className="size-7" />
          <span className="text-[15.5px] font-normal tracking-[0.5px]">
            {OG_LOCATION.mapTriggerText}
          </span>
        </button>
      )}
    </div>
  );
}

export function GuelizLocation() {
  return (
    <section
      aria-labelledby="og-loc-title"
      className="bg-shell px-[clamp(20px,4vw,44px)] py-[clamp(48px,7vw,96px)]"
    >
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-2">
        <div>
          <Reveal>
            <span className="mb-4 block text-[13.5px] font-normal uppercase tracking-[4px] text-bronze">
              {OG_LOCATION.label}
            </span>
            <h2
              id="og-loc-title"
              className="text-balance font-serif text-[clamp(28px,3.4vw,46px)] font-light leading-[1.15] text-forest"
            >
              {OG_LOCATION.title}
            </h2>
          </Reveal>
          {/* `Reveal` is always a <div>, so it sits inside the <li> rather than
              around it — a div between <ul> and <li> is invalid list markup. */}
          <ul className="mt-7 flex flex-col gap-3.5">
            {OG_LOCATION.benefits.map((benefit, index) => (
              <li key={benefit}>
                <Reveal
                  direction="up"
                  delay={0.04 * (index + 1)}
                  className="flex items-start gap-3 text-[16.5px] font-normal leading-[1.7] text-forest/75"
                >
                  <OgIcon name="check" className="mt-1 size-4 shrink-0 text-bronze" />
                  {benefit}
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <Reveal delay={0.08}>
          <GuelizMap />
        </Reveal>
      </div>
    </section>
  );
}

export function GuelizAmenities() {
  return (
    <section
      aria-labelledby="og-amenities-title"
      className="bg-cream px-[clamp(20px,4vw,44px)] py-[clamp(48px,7vw,96px)]"
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <Reveal>
          <span className="mb-4 block text-[13.5px] font-normal uppercase tracking-[4px] text-bronze">
            {OG_AMENITIES.label}
          </span>
          <h2
            id="og-amenities-title"
            className="max-w-[720px] text-balance font-serif text-[clamp(28px,3.4vw,46px)] font-light leading-[1.15] text-forest"
          >
            {OG_AMENITIES.title}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {OG_AMENITIES.items.map((item, index) => (
            <Reveal
              key={item.text}
              direction="up"
              delay={0.04 * (index + 1)}
              className={cn('wide' in item && item.wide && 'sm:col-span-2')}
            >
              <div className="flex h-full items-center gap-3.5 rounded-xl border border-forest/10 bg-white/60 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bronze/10 text-bronze">
                  <OgIcon name={item.icon} className="size-[18px]" />
                </span>
                <span className="text-[16px] font-normal text-forest">{item.text}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GuelizFooter() {
  return (
    <footer className="border-t border-forest/8 bg-cream px-[clamp(20px,4vw,44px)] py-9">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Image
          src={OG_BRAND.logo}
          alt={OG_BRAND.logoAlt}
          width={1250}
          height={625}
          loading="lazy"
          className="h-10 w-auto"
        />
        <span className="text-[15px] font-normal text-forest/75">
          © 2026 Emara Estates. Tous droits réservés.
        </span>
        <nav aria-label="Liens légers" className="flex items-center gap-6">
          <a
            href={ROUTES.home}
            className="text-[15px] font-normal text-forest/75 transition-colors duration-300 hover:text-bronze"
          >
            Accueil
          </a>
          <a
            href={ROUTES.contact}
            className="text-[15px] font-normal text-forest/75 transition-colors duration-300 hover:text-bronze"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}

/**
 * Mobile-only sticky CTA. Hidden from assistive tech and taken out of the tab
 * order while off, matching the legacy `aria-hidden="true"` + `tabindex="-1"`,
 * because it duplicates the header CTA.
 */
export function GuelizStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById('og-form');
    if (!form) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = form.getBoundingClientRect();
      // Thresholds copied from the legacy `initStickyCta`: the form counts as
      // visible once it crosses 85% of the viewport, and the bar only appears
      // past 400px of scroll.
      const formVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
      setVisible(window.scrollY > 400 && !formVisible);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      data-sticky-cta
      // Hidden from assistive tech and out of the tab order while off-screen,
      // then exposed once shown — the legacy `show()` toggles both.
      aria-hidden={visible ? 'false' : 'true'}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-cream/95 p-3 backdrop-blur-md transition-transform duration-400 ease-premium md:hidden',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <button
        type="button"
        data-scroll-to-form
        tabIndex={visible ? 0 : -1}
        onClick={scrollToForm}
        className={cn(BUTTON, 'w-full')}
      >
        {OG_HEADER.ctaFull}
      </button>
    </div>
  );
}
