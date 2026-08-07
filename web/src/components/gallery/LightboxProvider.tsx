'use client';

import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Single global lightbox, opened by any gallery on the page.
 *
 * Behaviour ported from the ~500 lines of inline script in the static
 * homepage: arrow-key and swipe navigation, Escape to close, a focus trap while
 * open, and focus restored to the trigger on close.
 */

export type LightboxImage = {
  /** Full-resolution source. Falls back to the thumbnail when absent. */
  src: string;
  alt: string;
  /** Caption shown under the image. */
  title?: string;
  width: number;
  height: number;
};

type OpenPayload = { images: LightboxImage[]; index: number };

const LightboxContext = createContext<(payload: OpenPayload) => void>(() => {});

export function useLightbox() {
  return useContext(LightboxContext);
}

/** True while the lightbox is open, so sliders can pause their autoplay. */
const LightboxOpenContext = createContext(false);
export function useLightboxOpen() {
  return useContext(LightboxOpenContext);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenPayload | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const open = useCallback((payload: OpenPayload) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setState(payload);
  }, []);

  const close = useCallback(() => {
    setState(null);
    // Return focus to whatever opened the lightbox.
    triggerRef.current?.focus?.();
    triggerRef.current = null;
  }, []);

  const step = useCallback((delta: number) => {
    setState((current) => {
      if (!current) return current;
      const count = current.images.length;
      return { ...current, index: (current.index + delta + count) % count };
    });
  }, []);

  useEffect(() => {
    if (!state) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
        return;
      }
      if (event.key !== 'Tab') return;

      // Focus trap.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button');
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
    // Move focus into the dialog so the trap has somewhere to start.
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [state, close, step]);

  const current = state ? state.images[state.index] : null;
  const isOpen = Boolean(state);
  const contextValue = useMemo(() => open, [open]);

  return (
    <LightboxContext.Provider value={contextValue}>
      <LightboxOpenContext.Provider value={isOpen}>
        {children}
        <AnimatePresence>
          {state && current && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-8"
            >
              <button
                type="button"
                aria-label="Fermer la galerie"
                onClick={close}
                className="absolute inset-0 cursor-default bg-forest/95 backdrop-blur-sm"
                tabIndex={-1}
              />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Galerie photo du projet"
                className="relative flex max-h-full w-full max-w-[1200px] flex-col gap-4"
                onTouchStart={(event) => {
                  touchStartX.current = event.touches[0].clientX;
                }}
                onTouchEnd={(event) => {
                  if (touchStartX.current === null) return;
                  const delta = event.changedTouches[0].clientX - touchStartX.current;
                  if (Math.abs(delta) > 50) step(delta > 0 ? -1 : 1);
                  touchStartX.current = null;
                }}
              >
                <motion.figure
                  key={state.index}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                  className="relative m-0 overflow-hidden rounded-2xl bg-black/20"
                >
                  <Image
                    src={current.src}
                    alt={current.alt}
                    width={current.width}
                    height={current.height}
                    className="max-h-[76dvh] w-full object-contain"
                    priority
                  />
                </motion.figure>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-normal uppercase tracking-[3px] text-bronze">
                      {pad(state.index + 1)} / {pad(state.images.length)}
                    </div>
                    {current.title && (
                      <div className="mt-1 truncate text-[16px] font-normal text-cream/80">
                        {current.title}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LightboxButton label="Photo précédente" onClick={() => step(-1)}>
                      <path d="M14.5 5.5L8 12l6.5 6.5" />
                    </LightboxButton>
                    <LightboxButton label="Photo suivante" onClick={() => step(1)}>
                      <path d="M9.5 5.5L16 12l-6.5 6.5" />
                    </LightboxButton>
                    <LightboxButton label="Fermer la galerie" onClick={close}>
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </LightboxButton>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LightboxOpenContext.Provider>
    </LightboxContext.Provider>
  );
}

function LightboxButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-cream/20 bg-cream/5 text-cream transition-colors duration-300 hover:border-cream/50 hover:bg-cream/10"
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
        {children}
      </svg>
    </button>
  );
}
