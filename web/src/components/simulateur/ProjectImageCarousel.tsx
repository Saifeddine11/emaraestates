'use client';

import Image from 'next/image';
import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SUMMARY_SLIDES } from '@/lib/content/residences';
import { cn } from '@/lib/cn';

const AUTOPLAY_MS = 4800;

export function ProjectImageCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const count = SUMMARY_SLIDES.length;

  useEffect(() => {
    if (paused || prefersReducedMotion || count < 2) return;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, prefersReducedMotion]);

  const step = (delta: number) => {
    setActive((index) => (index + delta + count) % count);
  };

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label="Photos du projet Honest Signature 7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          step(1);
        }
      }}
      className="relative min-h-[340px] overflow-hidden rounded-[25px] bg-forest shadow-[0_26px_65px_rgba(29,42,33,0.12)] sm:min-h-[500px] lg:min-h-[610px]"
    >
      {SUMMARY_SLIDES.map((slide, index) => {
        const visible = index === active;
        return (
          <Image
            key={slide.src}
            src={slide.src}
            alt={visible ? slide.alt : ''}
            fill
            priority={index === 0}
            sizes="(max-width: 1023px) 100vw, 48vw"
            aria-hidden={!visible}
            className={cn(
              'object-cover transition-[opacity,transform] ease-premium',
              prefersReducedMotion ? 'duration-0' : 'duration-1000',
              visible ? 'opacity-100' : 'opacity-0',
              visible && !prefersReducedMotion ? 'scale-[1.045]' : 'scale-100',
            )}
          />
        );
      })}

      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-forest/85 via-transparent to-black/15" />

      <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-5 p-4 sm:p-7">
        <div className="min-w-0 text-cream">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream">
            Honest Signature 7 · Guéliz
          </p>
          <span aria-live="polite" className="sr-only-legacy">
            {`Photo ${active + 1} sur ${count}`}
          </span>
          <div className="mt-2 flex items-center gap-0.5" aria-label="Choisir une photo">
            {SUMMARY_SLIDES.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Afficher la photo ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
                onClick={() => setActive(index)}
                className="group flex size-11 cursor-pointer items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === active ? 'w-7 bg-white' : 'w-1.5 bg-white/55 group-hover:bg-white/85',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-1">
          <CarouselButton label="Photo précédente" onClick={() => step(-1)}>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </CarouselButton>
          <CarouselButton label="Photo suivante" onClick={() => step(1)}>
            <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
          </CarouselButton>
        </div>
      </div>
    </div>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-cream/55 bg-white/10 text-cream backdrop-blur-md transition-colors duration-300 hover:bg-white/25"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5"
      >
        {children}
      </svg>
    </button>
  );
}
