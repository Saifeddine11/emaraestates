'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useLightbox, useLightboxOpen, type LightboxImage } from './LightboxProvider';
import { cn } from '@/lib/cn';

/**
 * Auto-advancing crossfade slider used by every property card.
 *
 * Ported from the inline homepage script, preserving the 4s cadence, the 1.3s
 * crossfade and the slow Ken Burns push on the active frame. Autoplay pauses
 * while the tab is hidden, while the pointer rests on the card, and while the
 * lightbox is open, so the two never fight over the index.
 */

export type SlideImage = {
  /** Source used in the card. */
  src: string;
  /** Higher-resolution source used when the slide is opened in the lightbox. */
  fullSrc?: string;
  alt: string;
  /** Lightbox caption. */
  lightboxTitle?: string;
  width: number;
  height: number;
  /** Anchors the crop for frames whose subject sits low. */
  position?: string;
};

/** Legacy `--slider-transition-speed` / `--slider-zoom-duration`. */
const TRANSITION_MS = 1300;
const ZOOM_MS = 6000;

export function PropertySlider({
  images,
  delay = 4000,
  className,
  sizes = '(max-width: 768px) 88vw, (max-width: 1280px) 45vw, 560px',
  priority = false,
  /** Crossfade auto-advance. Off for carousels that must stay still until tapped. */
  autoplay = true,
  /** Horizontal swipe between frames. Off when a parent track owns the gesture. */
  swipe = true,
}: {
  images: SlideImage[];
  delay?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  autoplay?: boolean;
  swipe?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const openLightbox = useLightbox();
  const lightboxOpen = useLightboxOpen();
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const autoplayEnabled =
    autoplay &&
    images.length > 1 &&
    !paused &&
    !tabHidden &&
    !lightboxOpen &&
    !prefersReducedMotion;

  useEffect(() => {
    if (!autoplayEnabled) return;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % images.length);
    }, delay);
    return () => window.clearInterval(timer);
  }, [autoplayEnabled, delay, images.length]);

  const lightboxImages: LightboxImage[] = images.map((image) => ({
    src: image.fullSrc ?? image.src,
    alt: image.alt,
    title: image.lightboxTitle,
    width: image.width,
    height: image.height,
  }));

  const step = (delta: number) =>
    setActive((index) => (index + delta + images.length) % images.length);

  return (
    <div
      className={cn('group/slider relative overflow-hidden', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={
        swipe
          ? (event) => {
              touchStartX.current = event.touches[0].clientX;
            }
          : undefined
      }
      onTouchEnd={
        swipe
          ? (event) => {
              if (touchStartX.current === null) return;
              const distance = event.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(distance) > 40) step(distance > 0 ? -1 : 1);
              touchStartX.current = null;
            }
          : undefined
      }
    >
      {images.map((image, index) => {
        const isActive = index === active;
        return (
          <Image
            key={image.src + index}
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            priority={priority && index === 0}
            loading={priority && index === 0 ? undefined : 'lazy'}
            className="object-cover"
            style={{
              objectPosition: image.position,
              opacity: isActive ? 1 : 0,
              // The slow push runs only on the visible frame and resets as it
              // cycles out. Two properties, two durations — hence inline.
              transform: isActive && !prefersReducedMotion ? 'scale(1.08)' : 'scale(1)',
              transition: `opacity ${TRANSITION_MS}ms var(--ease-premium), transform ${ZOOM_MS}ms ease-out`,
            }}
          />
        );
      })}

      {/* Full-card button so the whole frame is clickable and reachable by keyboard. */}
      <button
        type="button"
        onClick={() => openLightbox({ images: lightboxImages, index: active })}
        aria-label={`Agrandir la photo : ${images[active]?.alt ?? ''}`}
        className="absolute inset-0 z-[3] cursor-zoom-in"
      />

      {images.length > 1 && (autoplay || swipe) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[4] flex justify-center gap-1.5">
          {images.map((image, index) => (
            <span
              key={`dot-${image.src}-${index}`}
              className={cn(
                'h-px rounded-full transition-all duration-500 ease-premium',
                index === active ? 'w-7 bg-cream/90' : 'w-3 bg-cream/40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
