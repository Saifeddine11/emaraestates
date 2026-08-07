'use client';

import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

/**
 * On-page video player.
 *
 * Behaviour matches `LightboxProvider`: Escape to close, a focus trap while
 * open, focus restored to the trigger on close, and the body locked from
 * scrolling underneath.
 *
 * Portaled to `document.body` so a transformed ancestor (the hero fan entrance)
 * cannot trap `position: fixed` and break backdrop clicks / full-viewport cover.
 *
 * It deliberately has no exit animation. The whole subtree unmounts the moment
 * it closes, which takes the iframe with it — an animated exit would keep the
 * player mounted, and audible, for the length of the fade.
 */

export type VideoSource = {
  url: string;
  title: string;
  /** Cover frame, handed to the player so the first paint is not a black box. */
  poster?: string;
  /** Portrait sources get a height-capped player instead of a 16:9 panel. */
  portrait?: boolean;
};

const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
/** A file we serve ourselves, played by the browser rather than framed. */
const SELF_HOSTED = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/**
 * Rewrites a share URL into something frameable, and leaves anything it does
 * not recognise (a Matterport space, say) untouched — those already serve an
 * embeddable page at their canonical URL.
 *
 * `autoplay=1` is safe here precisely because this only ever renders after a
 * click: the gesture is what lets the browser start playback with sound. No
 * video is ever mounted, muted or otherwise, until then.
 */
export function toEmbedUrl(url: string): string {
  const youtube = url.match(YOUTUBE);
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  }
  const vimeo = url.match(VIMEO);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&dnt=1`;
  }
  return url;
}

export function VideoModal({ source, onClose }: { source: VideoSource | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!source) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button, iframe, video');
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
    // Give the trap somewhere to start, without stealing focus into the iframe.
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus?.();
      triggerRef.current = null;
    };
  }, [source, onClose]);

  if (!source || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Fermer la vidéo"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-forest/95 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Vidéo : ${source.title}`}
        className="relative flex w-full max-w-[1100px] flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[13.5px] font-normal uppercase tracking-[3px] text-bronze">
              Vidéos &amp; visites immersives
            </div>
            <div className="mt-1 truncate font-serif text-xl font-light text-cream">
              {source.title}
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer la vidéo"
            onClick={onClose}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cream/20 bg-cream/5 text-cream transition-colors duration-300 hover:border-cream/50 hover:bg-cream/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>

        {SELF_HOSTED.test(source.url) ? (
          /**
           * Our own file, so the browser plays it directly — no third party, no
           * cookie banner, and nothing is fetched until this element mounts on
           * click. Portrait sources are capped by height rather than poured
           * into a 16:9 box, which would letterbox a 9:16 ad down to a sliver.
           */
          <div className="flex justify-center">
            <video
              src={source.url}
              poster={source.poster}
              controls
              autoPlay
              playsInline
              preload="none"
              className={cn(
                'w-auto max-w-full rounded-2xl bg-black/40',
                source.portrait ? 'max-h-[68dvh]' : 'max-h-[72dvh]',
              )}
            />
          </div>
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/40">
            <iframe
              src={toEmbedUrl(source.url)}
              title={source.title}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
