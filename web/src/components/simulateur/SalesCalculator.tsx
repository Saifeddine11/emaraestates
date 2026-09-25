'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateSchedule,
  formatAmount,
  groupDigits,
  parseBudget,
  type Currency,
} from '@/components/simulateur/SimulatorExperience';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import { cn } from '@/lib/cn';
import { CONTACT } from '@/lib/site';

/**
 * Internal calculator for the sales team (/simulateur-equipe).
 *
 * Same schedule as the public /simulateur/ — it imports that page's own
 * calculation — applied to the total price, which here always includes the
 * mandatory parking space. The public simulator is unchanged. No email, no
 * lead capture, no tracking: nothing leaves the browser. "Imprimer en PDF"
 * prints a branded payment plan through the browser's own print dialog.
 */

const LAUNCH_PRICE_EUR = 129000;
/** Mandatory parking space, priced in dirhams. */
const PARKING_MAD = 50000;
/** EUR equivalent at the site's fixed 1 € = 10 MAD rate (same as the homepage simulator). */
const PARKING = { MAD: PARKING_MAD, EUR: PARKING_MAD / 10 } as const;

const PRINT_ID = 'payment-plan-print';

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards — the portal needs `document.body`. */
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function SalesCalculator() {
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [clientName, setClientName] = useState('');
  const mounted = useIsClient();

  const apartment = parseBudget(price);
  const parking = PARKING[currency];
  const total = apartment ? apartment + parking : 0;
  const schedule = total ? calculateSchedule(total, currency, '', '') : null;
  const rows = schedule
    ? ([
        ['À la réservation', '30 %', schedule.reservation],
        ['6 mois après la réservation', '15 %', schedule.installments[0]],
        ['12 mois après la réservation', '15 %', schedule.installments[1]],
        ['18 mois après la réservation', '15 %', schedule.installments[2]],
        ['À la remise des clés', '25 %', schedule.handover],
      ] as const)
    : [];
  const priceLines = schedule
    ? ([
        ['Prix de l’appartement', formatAmount(apartment, currency)],
        [
          'Place de parking (obligatoire)',
          currency === 'EUR'
            ? `${formatAmount(parking, 'EUR')} (${formatAmount(PARKING_MAD, 'MAD')})`
            : formatAmount(parking, 'MAD'),
        ],
      ] as const)
    : [];

  function printPlan() {
    const previousTitle = document.title;
    // Becomes the default file name in "Enregistrer en PDF".
    document.title = ['Plan de paiement Honest Signature 7', clientName.trim()].filter(Boolean).join(' - ');
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

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
          <p className="mx-auto mt-3 max-w-[640px] text-[15.5px] leading-[1.65] text-forest/65">
            Saisissez le prix de l’appartement : la place de parking obligatoire est ajoutée et
            l’échéancier se calcule sur le prix total.
          </p>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-[26px] border border-forest/10 bg-white shadow-[0_25px_85px_rgba(33,53,37,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 sm:p-8 lg:p-[42px]">
            <label htmlFor="sales-budget" className={fieldLabel}>
              Prix de l’appartement
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <input
                id="sales-budget"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder={currency === 'EUR' ? 'Ex : 180 000' : 'Ex : 1 900 000'}
                value={price}
                onChange={(event) => {
                  const input = event.target;
                  const caret = input.selectionStart ?? input.value.length;
                  const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length;
                  const next = groupDigits(input.value);
                  setPrice(next);
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
                setPrice(groupDigits(String(LAUNCH_PRICE_EUR)));
              }}
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-forest/12 px-4 text-[13.5px] font-semibold text-forest/75 transition-colors hover:border-forest/35 hover:text-forest"
            >
              Prix d’appel : 129 000 €
            </button>


            <p className="mt-6 text-[13px] leading-relaxed text-forest/55">
              Place de parking obligatoire : {formatAmount(PARKING_MAD, 'MAD')}, soit{' '}
              {formatAmount(PARKING.EUR, 'EUR')} au taux fixe du site (1 € = 10 MAD). Montants
              calculés dans la devise choisie. Estimation indicative : prix, échéances contractuelles
              et disponibilités à confirmer.
            </p>
          </div>

          <div className="bg-[#eaf0e9] p-6 sm:p-8 lg:p-[42px]" aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Plan de paiement</p>
            {schedule ? (
              <>
                <dl className="mt-3 grid gap-1.5 text-[14.5px]">
                  {priceLines.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-forest/70">{label}</dt>
                      <dd className="text-right font-medium text-forest">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-forest/15 pt-3">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-forest/70">Prix total</span>
                  <span data-total={schedule.budget} className="font-sans text-[clamp(26px,3vw,34px)] font-semibold tracking-[-0.045em] text-forest">
                    {formatAmount(schedule.budget, currency)}
                  </span>
                </div>

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
                <div className="mt-6">
                  <label htmlFor="sales-client" className={fieldLabel}>
                    Nom du client <span className="normal-case tracking-normal">(optionnel, pour le PDF)</span>
                  </label>
                  <input
                    id="sales-client"
                    type="text"
                    autoComplete="off"
                    maxLength={80}
                    placeholder="Prénom et nom"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className={fieldInput}
                  />
                </div>
                <button
                  type="button"
                  onClick={printPlan}
                  className="mt-4 inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-bronze"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
                    <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
                  </svg>
                  Imprimer en PDF
                </button>
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-forest/60">
                Saisissez un prix pour afficher le plan de paiement : 30 % à la réservation, 15 % tous
                les six mois (3 fois), 25 % à la remise des clés — parking obligatoire inclus.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Printed document. Portaled to <body> so the print stylesheet can hide
          every other top-level node (header, footer, page) and keep this one. */}
      {mounted &&
        schedule &&
        createPortal(
          <div id={PRINT_ID} className="hidden text-forest">
            <div className="flex items-start justify-between gap-8 border-b border-forest/20 pb-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- print-only; next/image adds nothing here */}
              <img src="/logo-emara-forest.png" alt="Emara Estates" className="h-[64px] w-auto" />
              <div className="text-right text-[11px] leading-[1.6] text-forest/70">
                <p>{CONTACT.phoneDisplay}</p>
                <p>{CONTACT.email}</p>
                <p>emaraestates.com</p>
              </div>
            </div>

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-bronze">
              Honest Signature 7 · Guéliz, Marrakech
            </p>
            <h1 className="mt-2 font-sans text-[30px] font-semibold tracking-[-0.03em]">Plan de paiement</h1>
            <p className="mt-1 text-[12.5px] text-forest/70">
              {clientName.trim() ? `Établi pour ${clientName.trim()} · ` : ''}
              {today}
            </p>

            <table className="mt-8 w-full border-collapse text-[13px]">
              <tbody>
                {priceLines.map(([label, value]) => (
                  <tr key={label} className="border-b border-forest/12">
                    <td className="py-2.5">{label}</td>
                    <td className="py-2.5 text-right">{value}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 text-[14px] font-semibold">Prix total</td>
                  <td className="py-3 text-right text-[16px] font-semibold">{formatAmount(schedule.budget, currency)}</td>
                </tr>
              </tbody>
            </table>

            <h2 className="mt-8 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-olive">
              Échéancier
            </h2>
            <table className="mt-3 w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-forest/25 text-left text-[11px] uppercase tracking-[0.1em] text-forest/60">
                  <th className="py-2 font-semibold">Échéance</th>
                  <th className="py-2 text-center font-semibold">Part</th>
                  <th className="py-2 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, percent, amount]) => (
                  <tr key={label} className="border-b border-forest/12">
                    <td className="py-3">{label}</td>
                    <td className="py-3 text-center">{percent}</td>
                    <td className="py-3 text-right font-semibold">{formatAmount(amount, currency)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 font-semibold">Total</td>
                  <td className="py-3 text-center font-semibold">100 %</td>
                  <td className="py-3 text-right font-semibold">{formatAmount(schedule.budget, currency)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-10 border-t border-forest/15 pt-5 text-[10.5px] leading-[1.7] text-forest/65">
              <p>
                Le prix total inclut la place de parking obligatoire ({formatAmount(PARKING_MAD, 'MAD')}
                {currency === 'EUR' ? `, soit ${formatAmount(PARKING.EUR, 'EUR')} au taux 1 € = 10 MAD` : ''}).
                Les versements de 15 % interviennent tous les six mois à compter de la réservation.
              </p>
              <p className="mt-1.5">
                Document indicatif et non contractuel. Le prix, les échéances contractuelles et la
                disponibilité du lot sont confirmés par Emara Estates lors de la réservation.
              </p>
              <p className="mt-4">
                Emara Estates · {CONTACT.addressLine1} {CONTACT.addressLine2}
              </p>
            </div>
          </div>,
          document.body,
        )}

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 16mm 14mm; }
          body > *:not(#${PRINT_ID}) { display: none !important; }
          #${PRINT_ID} { display: block !important; }
          html, body { background: #fff !important; }
        }
      `}</style>
    </section>
  );
}
