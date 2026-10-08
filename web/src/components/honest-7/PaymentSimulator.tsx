'use client';

import { useEffect, useRef, useState } from 'react';
import { InView } from '@/components/honest-7/Reveal';
import { FACTS, PAYMENT_PLAN, SIMULATOR_MAX, SIMULATOR_PRESETS, VALIDATION } from '@/lib/content/honest-signature-7';
import { trackLandingEvent } from '@/lib/landing-events';
import { cn } from '@/lib/cn';

const PROJECT = 'Honest Signature 7';
const MIN = FACTS.priceFromValue;
/** The page’s prices: euros once the conversion is confirmed, dirhams until then. */
const EURO = VALIDATION.euroPrices;

/** "1 590 000" with no-break spaces. Hand-rolled so server and browser agree on the separator. */
function formatAmount(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Each instalment rounded to the unit; the last one absorbs the remainder so the total is exact. */
function schedule(price: number) {
  let allocated = 0;
  return PAYMENT_PLAN.map((step, index) => {
    const last = index === PAYMENT_PLAN.length - 1;
    const amount = last ? price - allocated : Math.round((price * step.share) / 100);
    allocated += amount;
    return { ...step, amount };
  });
}

/**
 * "Calculer mon échéancier": the visitor enters an apartment price and sees
 * the brief's 30 / 15 / 15 / 15 / 25 plan in the page's currency. Not a mortgage
 * calculator — there is no rate and no monthly payment. Nothing is sent.
 */
export function PaymentSimulator() {
  const [price, setPrice] = useState<number>(MIN);
  const started = useRef(false);
  const completed = useRef(false);
  const touched = useRef(false);
  const valid = price >= MIN;
  const rows = schedule(valid ? price : MIN);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackLandingEvent('payment_simulator_started', { project: PROJECT });
  };

  // "Completed" = a valid price the visitor chose has stayed put for a moment.
  useEffect(() => {
    if (!touched.current || completed.current || !valid) return;
    const timer = window.setTimeout(() => {
      completed.current = true;
      trackLandingEvent('payment_simulator_completed', { project: PROJECT, price, currency: FACTS.currency });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [price, valid]);

  const choose = (value: number) => {
    markStarted();
    touched.current = true;
    setPrice(value);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[clamp(40px,5vw,88px)]">
      <div>
        <label htmlFor="hs7-simulator-price" className="block text-[13px] font-medium uppercase tracking-[0.18em] text-[#5b6a4c]">
          Prix de l’appartement
        </label>
        <div
          className={cn(
            'mt-3 flex items-baseline gap-3 border-b-2 pb-2 transition-colors duration-200 focus-within:border-forest',
            valid ? 'border-forest/25' : 'border-[#8c4a32]/60',
          )}
        >
          <input
            id="hs7-simulator-price"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            value={price ? formatAmount(price) : ''}
            onFocus={markStarted}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              choose(Math.min(Number(digits || 0), SIMULATOR_MAX));
            }}
            onBlur={() => !valid && setPrice(MIN)}
            aria-describedby="hs7-simulator-hint"
            aria-invalid={!valid}
            className="w-full min-w-0 bg-transparent font-sans text-[clamp(34px,8.5vw,56px)] font-normal leading-none tracking-[-0.03em] text-forest tabular-nums outline-none"
          />
          <span className={cn('shrink-0 font-medium text-forest/75', EURO ? 'text-[22px]' : 'text-[16px] tracking-[0.06em]')}>{EURO ? '€' : 'MAD'}</span>
        </div>
        <p id="hs7-simulator-hint" className={cn('mt-2.5 text-[14.5px] leading-[1.5]', valid ? 'text-forest/75' : 'text-[#8c4a32]')}>
          {valid ? 'Saisissez le prix d’un appartement, ou choisissez un exemple.' : EURO ? `Le projet démarre à environ ${FACTS.priceFrom}.` : `Le projet démarre à ${FACTS.priceFromMad}.`}
        </p>

        <ul aria-label="Exemples de prix" className="mt-5 flex flex-wrap gap-2">
          {SIMULATOR_PRESETS.map((preset) => (
            <li key={preset.value}>
              <button
                type="button"
                onClick={() => choose(preset.value)}
                aria-pressed={price === preset.value}
                className={cn(
                  'min-h-11 cursor-pointer rounded-full border px-4 text-[14.5px] font-medium tabular-nums transition-colors duration-200',
                  price === preset.value ? 'border-forest bg-forest text-cream' : 'border-forest/20 text-forest hover:border-forest/55',
                )}
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {/* The plan drawn to scale: the split reads before any figure does. */}
        <InView className="flex h-2.5 gap-1" amount={0.6}>
          {PAYMENT_PLAN.map((step, index) => (
            <span key={index} aria-hidden="true" style={{ flexBasis: `${step.share}%` }} className="overflow-hidden rounded-full bg-forest/12">
              <span
                className={cn('hs7-rule block size-full rounded-full', index === 0 || index === PAYMENT_PLAN.length - 1 ? 'bg-forest' : 'bg-olive')}
                style={{ animationDelay: `${index * 110}ms` }}
              />
            </span>
          ))}
        </InView>

        <ol className="mt-5 border-t border-forest/12">
          {rows.map((row, index) => (
            <li key={row.when} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-forest/12 py-3.5 sm:grid-cols-[minmax(0,1fr)_64px_auto]">
              <span className="flex items-baseline gap-3 text-[16px] font-medium leading-snug text-forest">
                <span className="text-[13px] font-medium tabular-nums tracking-[0.14em] text-[#5b6a4c]">0{index + 1}</span>
                {row.when}
              </span>
              <span className="hidden text-right text-[15px] tabular-nums text-forest/75 sm:block">{row.share}&nbsp;%</span>
              <span className={cn('text-right font-sans text-[19px] font-medium tabular-nums tracking-[-0.01em] sm:text-[21px]', valid ? 'text-forest' : 'text-forest/35')}>
                <span className="mr-2 text-[13.5px] font-normal text-forest/75 sm:hidden">{row.share}&nbsp;%</span>
                {valid ? formatAmount(row.amount) : '—'}
                {valid && <span className={cn('font-medium text-forest/75', EURO ? 'ml-1 text-[0.8em]' : 'ml-1.5 text-[12.5px] tracking-[0.04em]')}>{EURO ? '€' : 'MAD'}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14.5px] leading-[1.55] text-forest/75">
          Échéancier indicatif.{EURO && <> Le prix de départ est de {FACTS.priceFromMad}&nbsp;: son équivalent en euros varie avec le taux de change.</>} Votre
          conseiller confirme les conditions exactes du lot choisi.
        </p>
      </div>
    </div>
  );
}
