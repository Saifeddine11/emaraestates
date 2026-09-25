'use client';

import { useState } from 'react';
import {
  calculateSchedule,
  formatAmount,
  groupDigits,
  parseBudget,
  type Currency,
} from '@/components/simulateur/SimulatorExperience';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import { cn } from '@/lib/cn';

/**
 * Internal calculator for the sales team (/simulateur-equipe).
 *
 * Same schedule as the public /simulateur/ — it imports that page's own
 * calculation, so the two can never disagree — but with no email, no blur, no
 * lead capture and no tracking events. Nothing leaves the browser.
 */

const LAUNCH_PRICE_EUR = 129000;

export function SalesCalculator() {
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [copied, setCopied] = useState(false);

  const value = parseBudget(budget);
  const schedule = value ? calculateSchedule(value, currency, '', '') : null;
  const rows = schedule
    ? ([
        ['À la réservation', '30 %', schedule.reservation],
        ['2e versement', '15 %', schedule.installments[0]],
        ['3e versement', '15 %', schedule.installments[1]],
        ['4e versement', '15 %', schedule.installments[2]],
        ['À la remise des clés', '25 %', schedule.handover],
      ] as const)
    : [];

  function summary() {
    if (!schedule) return '';
    return [
      `Honest Signature 7 — échéancier indicatif pour un budget de ${formatAmount(schedule.budget, currency)} :`,
      ...rows.map(([label, percent, amount]) => `• ${label} (${percent}) : ${formatAmount(amount, currency)}`),
      'Estimation indicative et non contractuelle, sous réserve des prix et disponibilités confirmés par Emara Estates.',
    ].join('\n');
  }

  async function copySummary() {
    const text = summary();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / non-secure contexts: fall back to a hidden textarea.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <section className="relative isolate bg-[#f7f9f6] px-gutter pb-[clamp(48px,6vw,80px)] pt-[clamp(112px,11vw,146px)]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-[1] h-[88px] bg-forest" />

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="text-center">
          <p className="inline-flex rounded-full border border-bronze/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze">
            Outil interne · Équipe commerciale
          </p>
          <h1 className="mt-4 font-sans text-[clamp(32px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.045em] text-forest">
            Calculatrice d’échéancier Honest Signature 7
          </h1>
          <p className="mx-auto mt-3 max-w-[620px] text-[15.5px] leading-[1.65] text-forest/65">
            Saisissez le budget du client : l’échéancier se calcule instantanément, avec la même
            méthode que le simulateur public.
          </p>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-[26px] border border-forest/10 bg-white shadow-[0_25px_85px_rgba(33,53,37,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 sm:p-8 lg:p-[42px]">
            <label htmlFor="sales-budget" className={fieldLabel}>
              Budget du bien
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <input
                id="sales-budget"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder={currency === 'EUR' ? 'Ex : 180 000' : 'Ex : 1 900 000'}
                value={budget}
                onChange={(event) => {
                  const input = event.target;
                  const caret = input.selectionStart ?? input.value.length;
                  const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length;
                  const next = groupDigits(input.value);
                  setBudget(next);
                  window.requestAnimationFrame(() => {
                    let position = 0;
                    for (let seen = 0; position < next.length && seen < digitsBeforeCaret; position += 1) {
                      if (/\d/.test(next[position])) seen += 1;
                    }
                    input.setSelectionRange(position, position);
                  });
                }}
                className={cn(fieldInput, 'text-[20px] font-semibold tracking-[-0.02em]')}
              />
              <div role="group" aria-label="Devise" className="flex rounded-[14px] border border-forest/12 p-1">
                {(['EUR', 'MAD'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={currency === option}
                    onClick={() => setCurrency(option)}
                    className={cn(
                      'min-h-11 min-w-[58px] cursor-pointer rounded-[10px] px-3 text-[14px] font-semibold transition-colors',
                      currency === option ? 'bg-forest text-cream' : 'text-forest/65 hover:text-forest',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrency('EUR');
                setBudget(groupDigits(String(LAUNCH_PRICE_EUR)));
              }}
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-forest/12 px-4 text-[13.5px] font-semibold text-forest/75 transition-colors hover:border-forest/35 hover:text-forest"
            >
              Prix d’appel : 129 000 €
            </button>

            <p className="mt-6 text-[13px] leading-relaxed text-forest/55">
              Montants calculés dans la devise choisie, sans conversion EUR/MAD. Estimation
              indicative : prix, échéances contractuelles et disponibilités à confirmer.
            </p>
          </div>

          <div className="bg-[#eaf0e9] p-6 sm:p-8 lg:p-[42px]" aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Échéancier</p>
            {schedule ? (
              <>
                <p className="mt-2 font-sans text-[clamp(26px,3vw,34px)] font-semibold tracking-[-0.045em] text-forest">
                  {formatAmount(schedule.budget, currency)}
                </p>
                <dl className="mt-5 divide-y divide-forest/12 border-y border-forest/12">
                  {rows.map(([label, percent, amount]) => (
                    <div
                      key={label}
                      data-payment-value={amount}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5"
                    >
                      <dt className="text-[14.5px] text-forest/75">
                        {label}
                        <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
                          {percent}
                        </span>
                      </dt>
                      <dd className="font-sans text-[clamp(19px,2vw,24px)] font-semibold tracking-[-0.04em] text-forest">
                        {formatAmount(amount, currency)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={copySummary}
                  className="mt-6 min-h-14 w-full cursor-pointer rounded-full bg-forest px-6 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-bronze"
                >
                  {copied ? 'Copié ✓ — collez-le dans WhatsApp' : 'Copier l’échéancier pour le client'}
                </button>
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-forest/60">
                Saisissez un budget pour afficher l’échéancier : 30 % à la réservation, 3 versements
                de 15 % tous les six mois, 25 % à la remise des clés.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
