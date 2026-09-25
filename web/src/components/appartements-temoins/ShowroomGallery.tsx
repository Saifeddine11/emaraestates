'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { useLightbox } from '@/components/gallery/LightboxProvider';
import {
  DELIVERED_RESIDENCES,
  SHOWROOMS,
  type DeliveredResidence,
} from '@/lib/content/appartements-temoins';
import { cn } from '@/lib/cn';

type Filter = 'Tous' | DeliveredResidence;
const FILTERS: Filter[] = ['Tous', ...DELIVERED_RESIDENCES];

/**
 * Filterable showroom gallery. Mobile: a horizontal snap row (swipe). From
 * `md`: a grid. Each card opens the shared lightbox on the images currently
 * shown, so arrow/swipe navigation stays within the active filter.
 */
export function ShowroomGallery() {
  const [filter, setFilter] = useState<Filter>('Tous');
  const openLightbox = useLightbox();
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);

  const visible = filter === 'Tous' ? SHOWROOMS : SHOWROOMS.filter((s) => s.residence === filter);
  const lightboxImages = visible.map((s) => ({
    src: s.src,
    alt: s.alt,
    title: `${s.caption} — Résidence ${s.residence}, Guéliz · Résidence livrée`,
    width: s.width,
    height: s.height,
  }));

  function choose(next: Filter) {
    setFilter(next);
    // A new set starts at its first card, not wherever the old row was swiped to.
    trackRef.current?.scrollTo({ left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Filtrer par résidence"
        className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => choose(option)}
            className={cn(
              'min-h-11 shrink-0 cursor-pointer rounded-full border px-5 text-[14px] font-semibold transition-colors duration-200',
              filter === option
                ? 'border-forest bg-forest text-cream'
                : 'border-forest/15 bg-white text-forest/75 hover:border-forest/40',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only-legacy">
        {`${visible.length} photos affichées`}
      </p>

      <ul
        ref={trackRef}
        aria-label="Appartements témoins"
        className="-mx-gutter mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-gutter px-gutter pb-4 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((showroom, index) => (
            <motion.li
              key={showroom.src}
              layout={!prefersReducedMotion}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.23, 1, 0.32, 1] }}
              data-showroom={showroom.residence}
              className="w-[82vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-forest/8 bg-white shadow-[0_18px_50px_-30px_rgba(30,50,32,0.35)]">
                <button
                  type="button"
                  onClick={() => openLightbox({ images: lightboxImages, index })}
                  aria-label={`Agrandir : ${showroom.caption}, Résidence ${showroom.residence}`}
                  className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-forest/5"
                >
                  <Image
                    src={showroom.src}
                    alt={showroom.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 767px) 82vw, (max-width: 1279px) 50vw, 300px"
                    className="object-cover transition-transform duration-[1.1s] ease-premium group-hover:scale-[1.04]"
                  />
                </button>
                <div className="flex flex-1 flex-col p-5">
                  <span className="self-start rounded-full bg-olive/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-olive">
                    Résidence livrée
                  </span>
                  <h3 className="mt-3 whitespace-nowrap font-sans text-[19px] font-semibold tracking-[-0.03em] text-forest">
                    Résidence {showroom.residence}
                  </h3>
                  <p className="mt-1.5 text-[14px] text-forest/60">
                    {showroom.caption} · Guéliz, Marrakech
                  </p>
                  <button
                    type="button"
                    onClick={() => openLightbox({ images: lightboxImages, index })}
                    className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start text-[14px] font-semibold text-forest transition-colors hover:text-bronze"
                  >
                    Voir l’appartement témoin
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
