'use client';

import { useState } from 'react';
import { ArrowRight, Check } from '@/components/honest-7-v2/Icons';
import { Picture } from '@/components/honest-7-v2/Picture';
import { PROOFS } from '@/lib/content/honest-signature-7-v2';
import { cn } from '@/lib/cn';

/**
 * « Du plan au réel » : one tab per delivered Honest residence, its façade and
 * the real interiors photographed in it. Tabs, arrows and thumbnails are plain
 * buttons; every photograph is in the HTML (lazy-loaded), so nothing is fetched
 * on a click that the browser has not already queued.
 */
export function ProofGallery() {
  const [tab, setTab] = useState(0);
  const [shot, setShot] = useState(0);
  const proof = PROOFS[tab];
  const total = proof.pictures.length;
  const current = proof.pictures[shot];

  const select = (index: number) => {
    setTab((index + PROOFS.length) % PROOFS.length);
    setShot(0);
  };
  const go = (delta: number) => setShot((value) => (value + delta + total) % total);

  const round =
    'flex size-11 cursor-pointer items-center justify-center rounded-full border transition-colors duration-300 ' +
    'border-white/35 bg-ink/35 text-cream backdrop-blur-sm hover:bg-ink/60';

  return (
    <div>
      {/* The residences, as tabs. */}
      <div role="tablist" aria-label="Résidences Honest livrées" className="-mx-gutter flex gap-2.5 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
        {PROOFS.map((item, index) => {
          const selected = index === tab;
          return (
            <button
              key={item.residence.number}
              type="button"
              role="tab"
              id={`proof-tab-${item.residence.number}`}
              aria-selected={selected}
              aria-controls="proof-panel"
              onClick={() => select(index)}
              className={cn(
                'flex min-w-[164px] shrink-0 cursor-pointer items-center gap-3 rounded-[16px] border p-2.5 text-left transition-colors duration-300 lg:min-w-0',
                selected ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-shell text-forest hover:border-forest/40',
              )}
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-sand/40">
                {item.residence.picture && <Picture picture={item.residence.picture} sizes="48px" decorative style={{ objectPosition: item.residence.position }} />}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-[11.5px] font-medium tabular-nums tracking-[0.14em]', selected ? 'text-cream/70' : 'text-[#5b6a4c]')}>0{item.residence.number}</span>
                <span className="block truncate text-[15.5px] font-semibold leading-tight">{item.residence.name}</span>
                <span className={cn('mt-0.5 flex items-center gap-1 text-[12px]', selected ? 'text-cream/80' : 'text-forest/65')}>
                  {selected ? <Check className="size-3" /> : <ArrowRight className="size-3" />}
                  {selected ? 'À l’écran' : 'Voir la résidence'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div id="proof-panel" role="tabpanel" aria-labelledby={`proof-tab-${proof.residence.number}`} className="mt-4 overflow-hidden rounded-[22px] bg-shell shadow-card ring-1 ring-forest/10 lg:mt-5 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="p-3 lg:p-4">
          <figure className="relative m-0 aspect-[4/3] overflow-hidden rounded-[16px] bg-sand/40 sm:aspect-[16/10]">
            {proof.pictures.map((item, index) => (
              <Picture
                key={item.picture.src}
                picture={item.picture}
                sizes="(min-width: 1024px) 56vw, 100vw"
                style={{ objectPosition: item.position }}
                className={cn('absolute inset-0 transition-opacity duration-500 ease-out', index === shot ? 'opacity-100' : 'opacity-0')}
              />
            ))}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/65 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-cream">
              <span>
                <span className="block text-[12.5px] font-medium tabular-nums tracking-[0.14em] text-cream/80">
                  {String(shot + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </span>
                <span className="mt-1 block text-[17px] font-semibold leading-tight">{current.label}</span>
              </span>
              {total > 1 && (
                <span className="flex gap-2">
                  <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className={round}>
                    <Chevron direction="left" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className={round}>
                    <Chevron direction="right" />
                  </button>
                </span>
              )}
            </figcaption>
          </figure>

          {total > 1 && (
            <ul aria-label="Photos de la résidence" className="mt-3 flex gap-2">
              {proof.pictures.map((item, index) => (
                <li key={item.picture.src}>
                  <button
                    type="button"
                    onClick={() => setShot(index)}
                    aria-label={`Photo ${index + 1} : ${item.label}`}
                    aria-pressed={index === shot}
                    className={cn(
                      'block h-14 w-20 cursor-pointer overflow-hidden rounded-[10px] border-2 transition-colors duration-300',
                      index === shot ? 'border-olive' : 'border-transparent opacity-80 hover:opacity-100',
                    )}
                  >
                    <Picture picture={item.picture} sizes="80px" decorative style={{ objectPosition: item.position }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-forest/10 p-5 lg:border-l lg:border-t-0 lg:p-7">
          <div>
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#5b6a4c]">
              <span aria-hidden="true" className="size-2 rounded-full bg-olive" />
              Commercialisée et livrée
            </p>
            <h3 className="mt-3 font-sans text-[clamp(26px,3vw,36px)] font-medium leading-[1.05] tracking-[-0.03em] text-forest">
              Déjà livrée, <span className="font-serif text-[1.1em] font-normal italic text-olive">à {proof.place}.</span>
            </h3>
            <p className="mt-3 text-[16px] leading-[1.55] text-forest/75">
              {proof.residence.name} : une résidence Honest livrée à {proof.place}. Photos réelles de la résidence
              {total > 1 ? ' et d’un appartement témoin photographié sur place' : ''}, pas des images de synthèse.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-forest/10 pt-5">
            <p className="text-[15px] tabular-nums text-forest/60">
              <span className="text-[20px] font-medium text-forest">0{tab + 1}</span> / 0{PROOFS.length}
            </p>
            <button
              type="button"
              onClick={() => select(tab + 1)}
              className="group/next flex cursor-pointer items-center gap-4 rounded-full border border-forest/20 py-2 pl-5 pr-2.5 text-left transition-colors duration-300 hover:border-forest"
            >
              <span>
                <span className="block text-[11.5px] font-medium uppercase tracking-[0.12em] text-forest/60">Résidence suivante</span>
                <span className="block text-[15px] font-semibold text-forest">{PROOFS[(tab + 1) % PROOFS.length].residence.name}</span>
              </span>
              <span className="flex size-10 items-center justify-center rounded-full bg-forest text-cream transition-transform duration-300 ease-step group-hover/next:translate-x-0.5">
                <ArrowRight />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
      {direction === 'left' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}
