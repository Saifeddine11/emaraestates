'use client';

import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Owns the intro curtain and publishes a "ready" flag so the hero can start its
 * entrance the moment the curtain lifts, rather than guessing at a delay.
 *
 * The curtain is brand identity carried over from the static build (logo,
 * bronze rule, "Estates" wordmark on forest green). Its total duration is
 * shortened from 2.8s to 1.65s: the original spent nearly a second idle after
 * the last element had settled, which delayed the largest contentful paint for
 * no visual gain.
 */

const ReadyContext = createContext(true);

/** True once the intro curtain has lifted. */
export function useSiteReady() {
  return useContext(ReadyContext);
}

const CURTAIN_MS = 1650;

const FADE_MS = 700;

/**
 * The fade-out is a CSS transition driven by `lifting`, not a Framer `exit`.
 *
 * `AnimatePresence` waits for an exit animation to finish before unmounting its
 * child, and under `prefers-reduced-motion: reduce` that animation never ran —
 * which left this full-screen panel on top of the site permanently. The page
 * behind it was live and `ready` had flipped, so nothing looked broken from the
 * inside; it was simply unreachable. Driving opacity from a class and
 * unmounting on a timer removes the dependency on an animation completing.
 */
function Curtain({ lifting }: { lifting: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-9999 flex flex-col items-center justify-center gap-[30px] bg-forest',
        'transition-opacity ease-premium',
        lifting ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
      >
        <Image
          src="/img/logo.webp"
          alt=""
          width={1250}
          height={625}
          priority
          className="h-[84px] w-auto max-w-[min(80vw,260px)]"
        />
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="h-px w-[60px] origin-center bg-bronze"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="text-[13.5px] font-extralight uppercase tracking-[6px] text-sand"
      >
        Estates
      </motion.div>
    </div>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const [timerElapsed, setTimerElapsed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = window.setTimeout(() => setTimerElapsed(true), CURTAIN_MS);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  // Derived rather than stored, so honouring the motion preference does not
  // cost an extra render pass before the hero is allowed to animate.
  const ready = timerElapsed || Boolean(prefersReducedMotion);

  /**
   * The curtain stays in the tree for the length of its fade, then leaves for
   * good. It must start mounted so the prerendered HTML still carries the
   * wordmark the preservation diff expects.
   */
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    if (!ready) return;
    // Reduced motion skips the fade, so the unmount is a zero-delay tick
    // rather than an immediate setState inside the effect body.
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion ? 0 : FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, prefersReducedMotion]);

  return (
    <ReadyContext.Provider value={ready}>
      {mounted && <Curtain lifting={ready} />}
      {children}
    </ReadyContext.Provider>
  );
}
