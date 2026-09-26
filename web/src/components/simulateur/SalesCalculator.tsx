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
 * The apartment price is surface × price per m² (the team quotes this way,
 * never a direct price), in dirhams. Choosing Appartement or Duplex fills the
 * standard price per m², which stays editable. The same schedule as the public /simulateur/ — it
 * imports that page's own calculation — is applied to the total price, which
 * always includes the mandatory parking space. The public simulator is unchanged. No email, no
 * lead capture, no tracking: nothing leaves the browser. "Imprimer en PDF"
 * prints a branded payment plan through the browser's own print dialog.
 */

/** The team quotes in dirhams only. */
const currency: Currency = 'MAD';
/** Mandatory parking space. */
const PARKING_MAD = 50000;
/** Default price per m² by property type (MAD); the field stays editable. */
const PROPERTY_TYPES = [
  { label: 'Appartement', ratePerM2: 27000 },
  { label: 'Duplex', ratePerM2: 23000 },
] as const;
type PropertyType = (typeof PROPERTY_TYPES)[number]['label'];

const PRINT_ID = 'payment-plan-print';

/** "65,5" / "65.5" → 65.5 (up to 2 decimals); 0 when empty or invalid. */
function parseSurface(raw: string) {
  const value = Number.parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

/** Keeps digits and one decimal comma (max 2 decimals, 4 integer digits). */
function cleanSurface(raw: string) {
  const [whole = '', ...rest] = raw.replace(/\./g, ',').replace(/[^\d,]/g, '').split(',');
  const intPart = whole.slice(0, 4);
  return rest.length ? `${intPart},${rest.join('').slice(0, 2)}` : intPart;
}

/**
 * Intl's fr-FR thousands separator is a narrow no-break space (U+202F), nearly
 * invisible in the site font ("1 957 500" reads as "1957500"). Use a regular
 * no-break space so every 3 digits are clearly separated, on screen and in the PDF.
 */
function visibleSpaces(text: string) {
  return text.replace(/\u202f/g, '\u00a0');
}

function money(value: number) {
  return visibleSpaces(formatAmount(value, currency));
}

function formatSurface(value: number) {
  return visibleSpaces(`${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}\u00a0m²`);
}

/** Re-groups digits by thousands while keeping the caret after the same digit. */
function onGroupedChange(event: React.ChangeEvent<HTMLInputElement>, set: (value: string) => void) {
  const input = event.target;
  const caret = input.selectionStart ?? input.value.length;
  const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length;
  const next = groupDigits(input.value);
  set(next);
  window.requestAnimationFrame(() => {
    let position = 0;
    for (let seen = 0; position < next.length && seen < digitsBeforeCaret; position += 1) {
      if (/\d/.test(next[position])) seen += 1;
    }
    input.setSelectionRange(position, position);
  });
}

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards — the portal needs `document.body`. */
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function SalesCalculator() {
  const [surface, setSurface] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>(PROPERTY_TYPES[0].label);
  const [pricePerM2, setPricePerM2] = useState(groupDigits(String(PROPERTY_TYPES[0].ratePerM2)));
  const [clientName, setClientName] = useState('');
  const mounted = useIsClient();

  const area = parseSurface(surface);
  const rate = parseBudget(pricePerM2);
  const apartment = area && rate ? Math.round(area * rate) : 0;
  const parking = PARKING_MAD;
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
        ['Type de bien', propertyType],
        ['Superficie', formatSurface(area)],
        ['Prix au m²', money(rate)],
        ['Prix de l’appartement', money(apartment)],
        ['Place de parking (obligatoire)', money(parking)],
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
            Choisissez le type de bien et saisissez la superficie : le prix est calculé en
            dirhams, la place de parking obligatoire est ajoutée et l’échéancier porte sur le prix
            total.
          </p>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-[26px] border border-forest/10 bg-white shadow-[0_25px_85px_rgba(33,53,37,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 sm:p-8 lg:p-[42px]">
            <p id="sales-type-label" className={fieldLabel}>
              Type de bien
            </p>
            <div role="group" aria-labelledby="sales-type-label" className="grid grid-cols-2 gap-2.5">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type.label}
                  type="button"
                  aria-pressed={propertyType === type.label}
                  onClick={() => {
                    setPropertyType(type.label);
                    setPricePerM2(groupDigits(String(type.ratePerM2)));
                  }}
                  className={cn(
                    'flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-2xl border px-4 py-2.5 text-left transition-colors',
                    propertyType === type.label
                      ? 'border-forest bg-forest text-cream'
                      : 'border-forest/15 text-forest hover:border-forest/40',
                  )}
                >
                  <span className="text-[15px] font-semibold">{type.label}</span>
                  <span className={cn('text-[12.5px]', propertyType === type.label ? 'text-cream/75' : 'text-forest/55')}>
                    {money(type.ratePerM2)} / m²
                  </span>
                </button>
              ))}
            </div>

            <label htmlFor="sales-surface" className={cn(fieldLabel, 'mt-5')}>
              Superficie
            </label>
            <div className="relative">
              <input
                id="sales-surface"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="Ex : 65,5"
                value={surface}
                onChange={(event) => setSurface(cleanSurface(event.target.value))}
                className={cn(fieldInput, 'pr-14 text-[20px] font-semibold tracking-[-0.02em]')}
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-forest/50">
                m²
              </span>
            </div>

            <label htmlFor="sales-price-m2" className={cn(fieldLabel, 'mt-5')}>
              Prix au m²
            </label>
            <div className="relative">
              <input
                id="sales-price-m2"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ex : 27 000"
                value={pricePerM2}
                onChange={(event) => onGroupedChange(event, setPricePerM2)}
                className={cn(fieldInput, 'pr-16 text-[20px] font-semibold tracking-[-0.02em]')}
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-forest/50">
                MAD
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-forest/55">
              Prix standard {propertyType.toLowerCase()} rempli automatiquement, modifiable si besoin.
            </p>

            {apartment > 0 && (
              <p data-apartment-price={apartment} className="mt-4 rounded-2xl bg-forest/[0.04] px-4 py-3 text-[14.5px] text-forest/75">
                {formatSurface(area)} × {money(rate)} ={' '}
                <strong className="font-semibold text-forest">{money(apartment)}</strong>
              </p>
            )}

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
                    {money(schedule.budget)}
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
                        <span className="ml-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
                          {percent}
                        </span>
                      </dt>
                      <dd className="font-sans text-[clamp(19px,2vw,24px)] font-semibold tracking-[-0.04em] text-forest">
                        {money(amount)}
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
                Saisissez la superficie pour afficher le plan de paiement : 30 % à la réservation, 15 % tous
                les six mois (3 fois), 25 % à la remise des clés — parking obligatoire inclus.
              </p>
            )}
            <p className="mt-5 text-[13px] leading-relaxed text-forest/55">
              Place de parking obligatoire : {money(PARKING_MAD)}. Montants en
              dirhams. Estimation indicative : prix, échéances contractuelles et disponibilités à
              confirmer.
            </p>
          </div>
        </div>
      </div>

      {/* Printed document. Portaled to <body> so the print stylesheet can hide
          every other top-level node (header, footer, page) and keep this one. */}
      {mounted &&
        schedule &&
        createPortal(
          <div id={PRINT_ID} className="hidden text-forest">
            <div className="flex items-start justify-between gap-8 border-b border-forest/20 pb-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- print-only; next/image adds nothing here */}
              <img src="/logo-emara-forest.png" alt="Emara Estates" className="h-[56px] w-auto" />
              <div className="text-right text-[11px] leading-[1.6] text-forest/70">
                <p>{CONTACT.phoneDisplay}</p>
                <p>{CONTACT.email}</p>
                <p>emaraestates.com</p>
              </div>
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-bronze">
              Honest Signature 7 · Guéliz, Marrakech
            </p>
            <h1 className="mt-2 font-sans text-[30px] font-semibold tracking-[-0.03em]">Plan de paiement</h1>
            <p className="mt-1 text-[12.5px] text-forest/70">
              {clientName.trim() ? `Établi pour ${clientName.trim()} · ` : ''}
              {today}
            </p>

            <table className="mt-6 w-full border-collapse text-[13px]">
              <tbody>
                {priceLines.map(([label, value]) => (
                  <tr key={label} className="border-b border-forest/12">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right">{value}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 text-[14px] font-semibold">Prix total</td>
                  <td className="py-2.5 text-right text-[16px] font-semibold">{money(schedule.budget)}</td>
                </tr>
              </tbody>
            </table>

            <h2 className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-olive">
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
                    <td className="py-2.5">{label}</td>
                    <td className="py-2.5 text-center">{percent}</td>
                    <td className="py-2.5 text-right font-semibold">{money(amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 font-semibold">Total</td>
                  <td className="py-2.5 text-center font-semibold">100 %</td>
                  <td className="py-2.5 text-right font-semibold">{money(schedule.budget)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-7 border-t border-forest/15 pt-5 text-[10.5px] leading-[1.7] text-forest/65">
              <p>
                Le prix total inclut la place de parking obligatoire ({money(PARKING_MAD)}).
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
