'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { HandDrawnCircle } from '@/components/motion/HandDrawnCircle';
import { HandDrawnUnderline } from '@/components/simulateur/HandDrawnUnderline';
import { ProjectImageCarousel } from '@/components/simulateur/ProjectImageCarousel';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { track } from '@/lib/gueliz-attribution';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import {
  captureSimulatorAttribution,
  readSimulatorAttribution,
} from '@/lib/simulator-attribution';
import { ENDPOINTS } from '@/lib/site';

export type Currency = 'EUR' | 'MAD';

export type Simulation = {
  budget: number;
  currency: Currency;
  propertyType: string;
  email: string;
  reservation: number;
  installments: [number, number, number];
  handover: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PROPERTY_TYPES = [
  'Studio',
  'Appartement 1 chambre',
  'Appartement 2 chambres',
  'Appartement 3 chambres',
  'Duplex',
  'Commerce',
  'Je ne sais pas encore',
];

const INTENTIONS = ['Recevoir les plans et prix', 'Organiser une visite'] as const;
type Intention = (typeof INTENTIONS)[number];

const CONSENT =
  'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.';
/**
 * Step-1 leads share contact.php's per-IP rate limit with the step-2 form, so
 * a visitor re-simulating many times must never lock themselves out of it.
 */
const MAX_PARTIAL_LEADS = 3;

/**
 * Records a step-1 lead (email + budget) even if step 2 is never completed.
 * Uses the existing `apport_simulator` contract of contact.php — the same
 * payload as the homepage ApportSimulator — which emails it to the team.
 * Fire-and-forget: the estimate is already shown locally and a failure here
 * must never surface to the visitor. `keepalive` lets it finish if they leave.
 */
function sendPartialLead(simulation: Simulation, honeypot: string) {
  const apportEur =
    simulation.currency === 'EUR' ? simulation.reservation : Math.round(simulation.reservation / 10);
  const apportMad =
    simulation.currency === 'EUR' ? Math.round(simulation.reservation * 10) : simulation.reservation;
  try {
    void fetch(ENDPOINTS.contact, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        form_type: 'apport_simulator',
        email: simulation.email,
        budget_value: simulation.budget,
        currency: simulation.currency,
        typologie: simulation.propertyType,
        apport_mad: apportMad,
        apport_eur: apportEur,
        source_page: window.location.href,
        company_website: honeypot,
      }),
    }).catch(() => {});
  } catch {
    // Never let lead capture break the reveal.
  }
}

const SUBMIT_ERROR =
  'Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous directement sur WhatsApp.';

export function parseBudget(raw: string) {
  const normalized = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/** Display-only grouping for the budget input: "1900000" → "1 900 000". */
export function groupDigits(raw: string) {
  return raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatAmount(value: number, currency: Currency) {
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
  return currency === 'EUR' ? `${formatted}\u00a0€` : `${formatted}\u00a0MAD`;
}

/** Rounding is balanced into handover so the displayed amounts always equal the budget. */
export function calculateSchedule(budget: number, currency: Currency, propertyType: string, email: string): Simulation {
  const reservation = Math.round(budget * 0.3);
  const installment = Math.round(budget * 0.15);
  const handover = budget - reservation - installment * 3;
  return {
    budget,
    currency,
    propertyType,
    email,
    reservation,
    installments: [installment, installment, installment],
    handover,
  };
}

export function SimulatorExperience() {
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [propertyType, setPropertyType] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [honeypot, setHoneypot] = useState('');
  /** Inputs already sent as a step-1 lead, so re-clicking reveal doesn't re-email. */
  const sentPartialLeads = useRef(new Set<string>());
  const resultRef = useRef<HTMLDivElement>(null);
  const experienceStartedAt = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    experienceStartedAt.current = Date.now();
    captureSimulatorAttribution();
  }, []);

  useEffect(() => {
    if (!simulation || !window.matchMedia('(max-width: 768px)').matches) return;
    // Run after React has committed the revealed amounts. Scrolling from the
    // submit handler races the commit on slower phones and can target the old
    // placeholder position instead.
    const frame = window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [prefersReducedMotion, simulation]);

  function revealSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseBudget(budget);
    const normalizedEmail = email.trim();
    const nextErrors: Record<string, string> = {};

    if (!value) nextErrors.budget = 'Indiquez un budget supérieur à 0.';
    if (!normalizedEmail) nextErrors.email = 'Indiquez votre adresse email.';
    else if (!EMAIL_RE.test(normalizedEmail)) nextErrors.email = 'Indiquez une adresse email valide.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const next = calculateSchedule(value, currency, propertyType, normalizedEmail);
    setSimulation(next);
    track('SimulatorReveal', {
      currency,
      property_type: propertyType || 'Non renseigné',
      project: 'Honest Signature 7',
    });

    const leadKey = [next.email.toLowerCase(), next.budget, next.currency, next.propertyType].join('|');
    if (!sentPartialLeads.current.has(leadKey) && sentPartialLeads.current.size < MAX_PARTIAL_LEADS) {
      sentPartialLeads.current.add(leadKey);
      sendPartialLead(next, honeypot);
    }
  }

  return (
    <>
      <section
        id="simulateur"
        className="relative isolate overflow-hidden bg-[#f7f9f6] px-gutter pb-[clamp(48px,6vw,76px)] pt-[clamp(112px,11vw,146px)] [overflow-anchor:none]"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-[1] h-[88px] bg-forest" />
        <div aria-hidden="true" className="absolute -left-48 top-32 -z-[1] size-[420px] rounded-full bg-olive/[0.08] blur-3xl" />
        <div aria-hidden="true" className="absolute -right-44 bottom-0 -z-[1] size-[440px] rounded-full bg-bronze/[0.06] blur-3xl" />

        <div className="mx-auto w-full max-w-[1186px]">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">
              Simulation personnalisée
            </p>
            <h1 className="mt-3 font-sans text-[clamp(35px,4vw,52px)] font-semibold leading-[1.06] tracking-[-0.045em] text-forest">
              Quel budget pour votre appartement à <HandDrawnUnderline>Guéliz</HandDrawnUnderline>&nbsp;?
            </h1>
            <p className="mx-auto mt-3 max-w-[680px] text-[clamp(15px,1.3vw,17px)] font-normal leading-[1.65] text-forest/68">
              Honest Signature 7 dès{' '}
              <HandDrawnCircle className="-mx-[0.15em] whitespace-nowrap font-semibold text-forest">
                {/* Inner padding widens the oval so it clears the "1" and "€". */}
                <span className="px-[0.4em]">129&nbsp;000&nbsp;€</span>
              </HandDrawnCircle>.
              Estimez votre apport, puis recevez les informations
              correspondant à votre budget.
            </p>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-[26px] border border-forest/10 bg-white shadow-[0_25px_85px_rgba(33,53,37,0.08)] lg:grid-cols-[1.06fr_0.94fr]">
            <form
              onSubmit={revealSimulation}
              noValidate
              className="bg-white p-6 text-forest sm:p-8 lg:p-[42px]"
            >
              {/* Same honeypot contract as the step-2 and homepage forms. */}
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                className="absolute -left-[9999px] size-px overflow-hidden"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">
                Étape 1 sur 2 · Simulation
              </p>
              <h2 className="mt-2 font-sans text-[27px] font-semibold leading-tight tracking-[-0.04em] text-forest">
                Votre budget immobilier
              </h2>
              <div className="mt-7 grid gap-5">
                <div>
                  <label htmlFor="simulator-budget" className={fieldLabel}>
                    Budget du bien
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3">
                    <input
                      id="simulator-budget"
                      name="budget"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={currency === 'EUR' ? 'Ex : 180 000' : 'Ex : 1 900 000'}
                      value={budget}
                      onChange={(event) => {
                        const input = event.target;
                        // Keep the caret after the same digit once spaces are re-inserted.
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
                      aria-invalid={Boolean(errors.budget)}
                      aria-describedby={errors.budget ? 'simulator-budget-error' : undefined}
                      className={cn(fieldInput, errors.budget && 'border-red-500/60')}
                    />
                    <select
                      name="currency"
                      aria-label="Devise"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value as Currency)}
                      className={cn(fieldInput, 'cursor-pointer px-4')}
                    >
                      <option value="EUR">EUR</option>
                      <option value="MAD">MAD</option>
                    </select>
                  </div>
                  <FieldError id="simulator-budget-error" message={errors.budget} />
                  <p className="mt-2 text-[12.5px] font-normal leading-relaxed text-forest/55">
                    Prix d&apos;appel annoncé : à partir de 129 000 €. Les prix des lots restent à confirmer.
                  </p>
                </div>

                <div>
                  <label htmlFor="simulator-property-type" className={fieldLabel}>
                    Type de bien <span className="normal-case tracking-normal">(optionnel)</span>
                  </label>
                  <select
                    id="simulator-property-type"
                    name="property_type"
                    value={propertyType}
                    onChange={(event) => setPropertyType(event.target.value)}
                    className={cn(fieldInput, 'cursor-pointer')}
                  >
                    <option value="">Sélectionner</option>
                    {PROPERTY_TYPES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="simulator-email" className={fieldLabel}>Votre adresse email</label>
                  <input
                    id="simulator-email"
                    name="email"
                    type="email"
                    maxLength={120}
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'simulator-email-error' : undefined}
                    className={cn(fieldInput, errors.email && 'border-red-500/60')}
                  />
                  <FieldError id="simulator-email-error" message={errors.email} />
                </div>

                <button
                  type="submit"
                  className="min-h-14 cursor-pointer rounded-full bg-forest px-7 py-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze hover:shadow-[0_12px_24px_rgba(45,58,45,0.18)]"
                >
                  Voir mon apport estimé
                </button>
                <p className="text-[12.5px] font-normal leading-relaxed text-forest/58">
                  Estimation indicative et non contractuelle. Elle ne confirme ni le prix ni la
                  disponibilité d&apos;un lot précis.
                </p>
              </div>
            </form>
            <ResultCard simulation={simulation} resultRef={resultRef} />
          </div>
        </div>
      </section>

      <section className="bg-white px-gutter py-[clamp(52px,7vw,92px)]">
        <div className="mx-auto grid w-full max-w-[1396px] items-center gap-10 lg:grid-cols-[1fr_0.94fr] lg:gap-0">
          <div className="mx-auto w-full max-w-[710px] lg:mx-0 lg:pr-[clamp(48px,6vw,88px)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">
              Emara Estates · Guéliz, Marrakech
            </p>
            <h2 className="mt-5 max-w-[700px] font-sans text-[clamp(46px,5.45vw,78px)] font-semibold leading-[1.03] tracking-[-0.055em] text-forest">
              Votre appartement à Guéliz. Quel budget prévoir&nbsp;?
            </h2>
            <p className="mt-6 max-w-[560px] text-[clamp(17px,1.45vw,21px)] font-normal leading-[1.55] text-forest/72">
              À partir de 129 000 €, découvrez Honest Signature 7 à 1 minute à pied du Plaza et
              estimez votre apport en quelques secondes.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-7">
              <a
                href="#simulateur"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-7 py-4 text-[14px] font-semibold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze hover:shadow-[0_12px_24px_rgba(45,58,45,0.18)]"
              >
                Simuler mon budget
              </a>
              <a
                href="#projet-simulateur"
                className="inline-flex min-h-12 items-center justify-center text-[14px] font-semibold text-forest/78 transition-colors hover:text-bronze"
              >
                Découvrir le projet ↓
              </a>
            </div>
            <p className="mt-5 max-w-[560px] text-[12.5px] font-normal leading-relaxed text-forest/55">
              Simulation indicative, sans engagement. Un conseiller confirme les prix et les disponibilités des lots.
            </p>
          </div>

          <ProjectImageCarousel />
        </div>
      </section>

      <div className="border-y border-forest/10 bg-white px-gutter py-6">
        <dl className="mx-auto grid w-full max-w-[1000px] grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
          <ProjectStat value="1 minute" label="à pied du Plaza" />
          <ProjectStat value="Dès 129 000 €" label="prix d’appel annoncé" />
          <ProjectStat value="30 %" label="à la réservation" />
          <ProjectStat value="Guéliz" label="hyper-centre de Marrakech" />
        </dl>
      </div>

      <section id="projet-simulateur" className="scroll-mt-24 bg-white px-gutter py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto grid w-full max-w-[1186px] items-center gap-10 lg:grid-cols-2 lg:gap-[clamp(52px,7vw,88px)]">
          <div className="relative aspect-[1.07] overflow-hidden rounded-[24px] bg-forest shadow-[0_18px_48px_rgba(30,50,32,0.14)]">
            <Image
              src="/img/honest002.webp"
              alt="Présentation du programme Honest Signature 7"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Le programme</p>
            <h2 className="mt-4 font-sans text-[clamp(38px,4.1vw,58px)] font-semibold leading-[1.06] tracking-[-0.05em] text-forest">
              Honest Signature 7, au cœur de Guéliz
            </h2>
            <p className="mt-5 text-[clamp(16px,1.35vw,18px)] font-normal leading-[1.7] text-forest/68">
              Une adresse à 1 minute à pied du Plaza, avec plusieurs typologies pour habiter à Marrakech,
              disposer d&apos;un pied-à-terre ou étudier un investissement locatif.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-7">
              {['Deux piscines', 'Spa & jacuzzi', 'Salle de sport', 'Appartements témoins'].map((feature) => (
                <p key={feature} className="border-t border-forest/12 py-4 text-[14px] font-semibold text-forest">
                  {feature}
                </p>
              ))}
            </div>
            <a
              href={simulation ? '#demande-simulateur' : '#simulateur'}
              className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-7 py-4 text-[14px] font-semibold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze"
            >
              {simulation ? 'Demander les plans et prix' : 'Simuler puis demander les plans'}
            </a>
          </div>
        </div>
      </section>

      <motion.div
        initial={false}
        animate={{ opacity: simulation ? 1 : 0, height: simulation ? 'auto' : 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0.23, 1, 0.32, 1] }}
        inert={simulation ? undefined : true}
        className="overflow-hidden bg-cream"
      >
        {simulation && (
          <LeadRequestForm simulation={simulation} experienceStartedAt={experienceStartedAt} />
        )}
      </motion.div>
    </>
  );
}

function ResultCard({
  simulation,
  resultRef,
}: {
  simulation: Simulation | null;
  resultRef: React.RefObject<HTMLDivElement | null>;
}) {
  const prefersReducedMotion = useReducedMotion();
  const rows = simulation
    ? [
        ['À la réservation', '30 %', simulation.reservation],
        ['2e versement', '15 %', simulation.installments[0]],
        ['3e versement', '15 %', simulation.installments[1]],
        ['4e versement', '15 %', simulation.installments[2]],
        ['À la remise des clés', '25 %', simulation.handover],
      ] as const
    : [];

  return (
    <div
      ref={resultRef}
      id="resultat-simulation"
      className="bg-[#eaf0e9] p-6 text-forest sm:p-8 lg:min-h-full lg:p-[42px]"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Votre estimation</p>
          <h2 className="mt-2 font-sans text-[clamp(28px,3vw,37px)] font-semibold leading-[1.08] tracking-[-0.045em] text-forest">
            Votre échéancier indicatif
          </h2>
        </div>
        {simulation && (
          <span className="shrink-0 rounded-full bg-forest px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream">
            100 %
          </span>
        )}
      </div>

      {!simulation ? (
        <div className="relative mt-6 flex min-h-[330px] items-center overflow-hidden rounded-[18px] border border-forest/8 bg-white/75 p-5">
          <div aria-hidden="true" className="w-full select-none space-y-3 opacity-60 blur-[8px]">
            {['À la réservation', '2e versement', '3e versement', '4e versement', 'À la remise des clés'].map((label, index) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-forest/8 pb-3 last:border-0 last:pb-0">
                <span className="text-[15px] text-forest/70">{label}</span>
                <span className="font-sans text-xl font-semibold tracking-[-0.04em] text-forest">{index === 0 ? '••• •••' : '•• •••'} €</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#eaf0e9]/65 px-7 text-center backdrop-blur-[2px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Votre estimation</p>
            <p className="mt-3 max-w-[330px] font-sans text-[clamp(29px,3vw,37px)] font-semibold leading-[1.08] tracking-[-0.045em] text-forest">
              Découvrez votre apport estimé
            </p>
            <p className="mt-3 max-w-[330px] text-[14.5px] font-normal leading-[1.55] text-forest/68">
              Complétez votre budget et votre email pour afficher les montants.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[15px] font-normal leading-relaxed text-forest/68">
            Budget simulé : <strong className="font-medium text-forest">{formatAmount(simulation.budget, simulation.currency)}</strong>
          </p>
          <dl className="mt-6 divide-y divide-forest/12 border-y border-forest/12">
            {rows.map(([label, percent, value]) => (
              <div
                key={label}
                data-payment-value={value}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5"
              >
                <div>
                  <dt className="text-[14px] font-normal text-forest/72">{label}</dt>
                  <dd className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-olive">{percent}</dd>
                </div>
                <dd className="font-sans text-[clamp(19px,2vw,25px)] font-semibold tracking-[-0.045em] text-forest">
                  {formatAmount(value, simulation.currency)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[13px] font-normal leading-relaxed text-forest/62">
            Les montants sont calculés dans la devise choisie, sans conversion EUR/MAD. Le prix,
            les échéances contractuelles et les disponibilités doivent être confirmés par Emara Estates.
          </p>
          <button
            type="button"
            onClick={() =>
              document.getElementById('demande-simulateur')?.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start',
              })
            }
            className="mt-6 min-h-14 w-full cursor-pointer rounded-full bg-forest px-6 py-4 text-[13.5px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-bronze"
          >
            Recevoir les plans, prix et disponibilités
          </button>
        </>
      )}
    </div>
  );
}

function LeadRequestForm({
  simulation,
  experienceStartedAt,
}: {
  simulation: Simulation;
  experienceStartedAt: React.RefObject<number>;
}) {
  const [country, setCountry] = useState<Country>(() => findCountry('FR'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [intention, setIntention] = useState<Intention>(INTENTIONS[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const buyerLeadSnapFired = useRef(false);
  const leadTracked = useRef(false);
  /** Synchronous lock: `submitting` state lags a fast double click by one render. */
  const inFlight = useRef(false);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting || succeeded) return;
    setErrors({});
    setFeedback('');

    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
    const digits = phoneFull.replace(/\D/g, '');
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Merci d’indiquer votre nom complet.';
    if (digits.length < 8 || digits.length > 15) nextErrors.telephone = 'Merci d’indiquer un numéro de téléphone valide.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(nextErrors.fullName ? 'simulator-full-name' : 'simulator-phone')?.focus();
      return;
    }

    const attribution = { ...readSimulatorAttribution(), ...captureSimulatorAttribution() };
    const source = `${window.location.origin}${window.location.pathname}`;
    const payload = {
      form_type: 'simulateur_request',
      nom_complet: fullName.trim(),
      email: simulation.email,
      telephone: phoneFull,
      phoneFull,
      phoneCode: country.code,
      phoneCountry: country.country,
      phoneCountryCode: country.countryCode,
      phoneNumber: localNumber,
      budget: `${simulation.budget} ${simulation.currency}`,
      // The intention travels in the existing `message` field so contact.php,
      // the Zapier webhook and the HubSpot mapping need no new property.
      message: [`Intention : ${intention}`, message.trim() && `Précision : ${message.trim()}`]
        .filter(Boolean)
        .join(' — '),
      jour_visite: '',
      source,
      company_website: honeypot,
      elapsed_ms: Date.now() - experienceStartedAt.current,
      projectName: 'Honest Signature 7',
      propertyType: simulation.propertyType,
      budgetValue: simulation.budget,
      currency: simulation.currency,
      reservationAmount: simulation.reservation,
      installmentAmount: simulation.installments[0],
      handoverAmount: simulation.handover,
      leadSource: 'Simulateur budget',
      adPlatform: attribution.ad_platform || '',
      campaign: attribution.utm_campaign || attribution.campaign_id || '',
      adset: attribution.adset_id || '',
      ad: attribution.ad_id || '',
      landingPageUrl: attribution.landing_page_url || source,
      utmSource: attribution.utm_source || '',
      utmMedium: attribution.utm_medium || '',
      utmCampaign: attribution.utm_campaign || '',
      utmContent: attribution.utm_content || '',
      utmTerm: attribution.utm_term || '',
      campaignId: attribution.campaign_id || '',
      adsetId: attribution.adset_id || '',
      adId: attribution.ad_id || '',
      fbclid: attribution.fbclid || '',
      fbc: attribution.fbc || '',
      fbp: attribution.fbp || '',
      referrer: attribution.referrer || '',
      submissionDate: new Date().toISOString(),
    };

    inFlight.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(ENDPOINTS.contact, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let data: { message?: string; errors?: Record<string, string> } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setFeedback(SUBMIT_ERROR);
        return;
      }

      if (!response.ok || typeof data.message !== 'string') {
        if (data.errors) setErrors(data.errors);
        setFeedback(data.message || SUBMIT_ERROR);
        return;
      }

      if (!leadTracked.current) {
        leadTracked.current = true;
        track('Lead', {
          lead_source: 'Simulateur budget',
          project: 'Honest Signature 7',
          currency: simulation.currency,
          property_type: simulation.propertyType || 'Non renseigné',
          utm_campaign: attribution.utm_campaign || '',
        });
      }
      fireSnapEvent(SNAP_EVENT_BUYER_LEAD, buyerLeadSnapFired);
      setSucceeded(true);
    } catch {
      setFeedback(SUBMIT_ERROR);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section id="demande-simulateur" className="scroll-mt-24 bg-[#f5f7f3] px-gutter py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto grid w-full max-w-[1186px] items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[clamp(56px,8vw,100px)]">
        <div className="lg:pt-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Étape 2 sur 2 · Vos coordonnées</p>
          <h2 className="mt-4 font-sans text-[clamp(34px,4.2vw,54px)] font-semibold leading-[1.08] tracking-[-0.05em] text-forest">
            Recevez les plans, prix et appartements disponibles selon votre budget.
          </h2>
          <p className="mt-5 max-w-[520px] text-[16.5px] font-normal leading-[1.8] text-forest/72">
            Votre email, votre budget et votre préférence sont déjà repris. Complétez simplement
            vos coordonnées pour qu&apos;un conseiller Emara Estates vous réponde.
          </p>
          <dl className="mt-8 grid gap-3 rounded-[18px] border border-forest/8 bg-white/70 p-5 text-[15px]">
            <SummaryRow label="Email" value={simulation.email} />
            <SummaryRow label="Budget" value={formatAmount(simulation.budget, simulation.currency)} />
            <SummaryRow label="Type de bien" value={simulation.propertyType || 'À définir'} />
          </dl>
        </div>

        <div className="rounded-[24px] border border-forest/10 bg-white p-6 shadow-[0_20px_65px_rgba(26,51,32,0.07)] sm:p-9 lg:p-[42px]">
          {succeeded ? (
            <div role="status" aria-live="polite" className="py-8 text-center">
              <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-bronze/10 text-bronze">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <h3 className="mt-5 font-sans text-[30px] font-semibold tracking-[-0.04em] text-forest">Votre demande a bien été envoyée</h3>
              <p className="mx-auto mt-3 max-w-[470px] text-[16px] font-normal leading-[1.8] text-forest/70">
                Un conseiller Emara Estates vous contactera avec les plans, les prix et les disponibilités actuelles.
              </p>
            </div>
          ) : (
            <form onSubmit={submitLead} noValidate>
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                className="absolute -left-[9999px] size-px overflow-hidden"
              />

              <div className="grid gap-5">
                <div>
                  <label htmlFor="simulator-full-name" className={fieldLabel}>Nom complet</label>
                  <input
                    id="simulator-full-name"
                    name="nom_complet"
                    type="text"
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Prénom et nom"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    aria-invalid={Boolean(errors.fullName || errors.nom_complet)}
                    aria-describedby={errors.fullName || errors.nom_complet ? 'simulator-full-name-error' : undefined}
                    className={cn(fieldInput, (errors.fullName || errors.nom_complet) && 'border-red-500/60')}
                  />
                  <FieldError id="simulator-full-name-error" message={errors.fullName || errors.nom_complet} />
                </div>

                <div>
                  <label htmlFor="simulator-phone" className={fieldLabel}>Téléphone / WhatsApp</label>
                  <PhoneCountryInput
                    country={country}
                    onCountryChange={setCountry}
                    number={phoneNumber}
                    onNumberChange={setPhoneNumber}
                    invalid={Boolean(errors.telephone)}
                    describedBy={errors.telephone ? 'simulator-phone-error' : undefined}
                    selectId="simulator-phone-code"
                    inputId="simulator-phone"
                    numberLabel="Téléphone / WhatsApp"
                  />
                  <FieldError id="simulator-phone-error" message={errors.telephone} />
                </div>

                <fieldset>
                  <legend className={fieldLabel}>Votre souhait</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {INTENTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[14.5px] font-medium transition-colors duration-200',
                          intention === option
                            ? 'border-forest bg-forest/[0.04] text-forest'
                            : 'border-forest/15 text-forest/75 hover:border-forest/35',
                        )}
                      >
                        <input
                          type="radio"
                          name="intention"
                          value={option}
                          checked={intention === option}
                          onChange={() => setIntention(option)}
                          className="size-4 shrink-0 accent-forest"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <button
                    type="button"
                    aria-expanded={detailsOpen}
                    aria-controls="simulator-message-panel"
                    onClick={() => setDetailsOpen((open) => !open)}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-semibold text-forest/78 transition-colors hover:text-bronze"
                  >
                    <span aria-hidden="true" className="text-[18px] leading-none">{detailsOpen ? '−' : '+'}</span>
                    Ajouter une précision
                    <span className="font-normal text-forest/50">(optionnel)</span>
                  </button>
                  <div id="simulator-message-panel" hidden={!detailsOpen} className="mt-2">
                    <label htmlFor="simulator-message" className="sr-only-legacy">
                      Précision
                    </label>
                    <textarea
                      id="simulator-message"
                      name="message"
                      rows={3}
                      maxLength={1000}
                      placeholder="Étage, vue, date de visite souhaitée…"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className={cn(fieldInput, 'resize-y')}
                    />
                  </div>
                </div>

                <p className="text-[14.5px] font-normal leading-[1.75] text-forest/68">{CONSENT}</p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-14 cursor-pointer rounded-full bg-forest px-7 py-4 text-[14px] font-semibold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Envoi…' : 'Recevoir mes disponibilités'}
                </button>

                <p role="alert" aria-live="assertive" className="text-[15px] font-normal text-red-600 empty:hidden">
                  {feedback}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-2 text-[14.5px] font-normal text-red-600">{message}</p>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
      <dt className="text-forest/55">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-forest">{value}</dd>
    </div>
  );
}

function ProjectStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 sm:border-r sm:border-forest/10 sm:pr-5 sm:last:border-0">
      <dt className="font-sans text-[clamp(17px,1.6vw,20px)] font-semibold tracking-[-0.035em] text-forest">
        {value}
      </dt>
      <dd className="mt-1 text-[12.5px] font-normal leading-snug text-forest/58">{label}</dd>
    </div>
  );
}
