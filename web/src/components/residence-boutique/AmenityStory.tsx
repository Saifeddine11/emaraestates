'use client';

import { useEffect, useRef, useState } from 'react';
import { Picture } from '@/components/honest-7/Picture';
import { Rail } from '@/components/honest-7/Rail';
import type { AmenityScene } from '@/lib/content/residence-boutique';
import { cn } from '@/lib/cn';

/**
 * One amenity at a time, big image, few words.
 *
 * Desktop: controlled sticky storytelling without scroll hijacking — the list
 * scrolls normally, and whichever title crosses the middle of the screen
 * drives the pinned image stage beside it. Phones: a native scroll-snap rail
 * (the shared honest-7 Rail), so swiping is the browser's own.
 */
export function AmenityStory({ scenes }: { scenes: AmenityScene[] }) {
  return (
    <>
      <div className="lg:hidden">
        <Rail label="Les espaces de la résidence" itemClassName="w-[82vw] sm:w-[58vw]">
          {scenes.map((scene) => (
            <figure key={scene.index} className="m-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-sand/40">
                <Picture picture={scene.picture} sizes="(min-width: 641px) 58vw, 82vw" style={{ objectPosition: scene.position }} />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-5 text-cream">
                  <span className="text-[13px] font-medium tabular-nums tracking-[0.16em] text-cream/75">{scene.index}</span>
                  <span className="mt-1 block font-sans text-[30px] font-medium uppercase leading-none tracking-[-0.02em]">{scene.title}</span>
                  <span className="mt-2 block text-[15px] leading-snug text-cream/85">{scene.line}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </Rail>
      </div>

      <DesktopStory scenes={scenes} />
    </>
  );
}

function DesktopStory({ scenes }: { scenes: AmenityScene[] }) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const activeRef = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (index === activeRef.current) return;
          setPrevious(activeRef.current);
          setActive(index);
          activeRef.current = index;
        });
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    items.current.forEach((item) => item && observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const scene = scenes[active];

  return (
    <div className="hidden gap-[clamp(40px,5vw,88px)] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ol className="py-[18vh]">
        {scenes.map((item, index) => (
          <li
            key={item.index}
            ref={(node) => {
              items.current[index] = node;
            }}
            data-index={index}
            aria-current={index === active ? 'step' : undefined}
            className={cn(
              'flex min-h-[52vh] flex-col justify-center border-t border-forest/10 transition-opacity duration-500 ease-step',
              index === active ? 'opacity-100' : 'opacity-25',
            )}
          >
            <span className="text-[14px] font-medium tabular-nums tracking-[0.18em] text-[#5b6a4c]">{item.index}</span>
            <h3 className="mt-3 font-sans text-[clamp(44px,5.4vw,84px)] font-medium uppercase leading-[0.92] tracking-[-0.035em] text-forest">
              {item.title}
            </h3>
            <p className="mt-4 max-w-[380px] text-[18px] leading-[1.5] text-forest/70">{item.line}</p>
          </li>
        ))}
      </ol>

      <div className="relative">
        <div className="sticky top-[12vh] h-[76vh] overflow-hidden rounded-[26px] bg-forest">
          {scenes.map((item, index) => {
            const state = index === active ? 'active' : index === previous ? 'previous' : 'idle';
            return (
              <div
                key={item.index}
                aria-hidden={state !== 'active'}
                className={cn(
                  'absolute inset-0',
                  state === 'active' && 'z-20 opacity-100 [clip-path:inset(0_0_0_0)] transition-[clip-path,opacity] duration-[1000ms] ease-step',
                  state === 'previous' && 'z-10 opacity-100',
                  state === 'idle' && 'z-0 opacity-0 [clip-path:inset(0_0_100%_0)]',
                )}
              >
                <Picture
                  picture={item.picture}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  decorative={state !== 'active'}
                  className={cn('transition-transform ease-out', state === 'active' ? 'scale-100 duration-[4000ms]' : 'scale-[1.05] duration-0')}
                  style={{ objectPosition: item.position }}
                />
              </div>
            );
          })}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

          <p aria-hidden="true" className="absolute left-6 top-6 z-40 rounded-full bg-shell/90 px-3.5 py-1.5 text-[13px] font-medium tabular-nums tracking-[0.14em] text-forest backdrop-blur">
            {scene.index} <span className="text-forest/60">/ {String(scenes.length).padStart(2, '0')}</span>
          </p>
          <p aria-hidden="true" className="absolute bottom-6 left-6 z-40 text-[14px] font-medium uppercase tracking-[0.18em] text-cream">
            <span key={scene.index} className="inline-block motion-safe:animate-[rb-fade-up_0.6s_var(--ease-step)_both]">
              {scene.title}
            </span>
          </p>

          {/* The second pool, inset — the "2" of "2 piscines", shown, not claimed. */}
          {scenes.map((item, index) =>
            item.inset ? (
              <div
                key={`${item.index}-inset`}
                aria-hidden={index !== active}
                className={cn(
                  'absolute bottom-6 right-6 z-40 w-[34%] overflow-hidden rounded-[16px] border-4 border-shell shadow-[0_24px_40px_-20px_rgba(0,0,0,0.6)] transition-[opacity,transform] duration-700 ease-step',
                  index === active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
                )}
              >
                <div className="aspect-[16/10]">
                  <Picture picture={item.inset} sizes="20vw" decorative={index !== active} />
                </div>
                <p className="bg-shell px-3 py-2 text-[13px] font-medium uppercase tracking-[0.14em] text-forest">Piscine intérieure</p>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
