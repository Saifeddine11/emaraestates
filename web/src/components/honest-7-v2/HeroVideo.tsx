'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_VIDEO } from '@/lib/content/honest-signature-7-v2';
import { cn } from '@/lib/cn';

/**
 * The 3D film behind the hero, loaded only once the page is done.
 *
 * The HTML carries a <video> with no source: the first paint costs the poster
 * (the film's first frame, preloaded by the route) and nothing else. After the
 * `load` event the one file this device needs is attached — the 540p cut on a
 * 1x screen or a slow connection, 720p otherwise, nothing at all under data
 * saver or reduced motion — and the film fades in
 * over the poster once it is actually playing, so there is no flash. It pauses
 * off screen and resumes on return; the button lets the visitor stop it.
 */
export function HeroVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    if (nav.connection?.saveData) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const slow = /(^|-)2g$|3g/.test(nav.connection?.effectiveType ?? '');

    let cancelled = false;
    const attach = () => {
      if (cancelled || video.src) return;
      const small = slow || (window.devicePixelRatio < 1.5 && window.innerWidth < 1024);
      video.src = small ? HERO_VIDEO.mp4Small : HERO_VIDEO.mp4;
      video.load();
      setReady(true);
      video.play().catch(() => undefined);
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(attach, { timeout: 2500 });
      else window.setTimeout(attach, 600);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
    };
  }, []);

  // Off screen or in a hidden tab, the film stops drawing; it resumes when back.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    let visible = true;
    const sync = () => {
      if (stopped) return void video.pause();
      if (visible && document.visibilityState === 'visible') video.play().catch(() => undefined);
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => ((visible = entry.isIntersecting), sync()), { threshold: 0.1 });
    observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ready, stopped]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        className={cn(
          'pointer-events-none transition-opacity duration-700 ease-out motion-reduce:transition-none',
          playing ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
      {ready && (
        <button
          type="button"
          onClick={() => setStopped((value) => !value)}
          aria-label={stopped ? 'Relancer la vidéo' : 'Mettre la vidéo en pause'}
          aria-pressed={stopped}
          className="absolute right-2 top-2 z-[3] flex size-11 cursor-pointer items-center justify-center lg:right-4 lg:top-4"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-ink/80">
            {stopped ? (
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5" fill="currentColor">
                <path d="M3 1.6v8.8a.6.6 0 0 0 .92.5l6.8-4.4a.6.6 0 0 0 0-1L3.92 1.1A.6.6 0 0 0 3 1.6Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5" fill="currentColor">
                <rect x="2" y="1.5" width="3" height="9" rx="0.8" />
                <rect x="7" y="1.5" width="3" height="9" rx="0.8" />
              </svg>
            )}
          </span>
        </button>
      )}
    </>
  );
}
