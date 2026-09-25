'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import {
  CONTACT_METHODS,
  TIMINGS,
  VISIT_TYPES,
  type VisitType,
} from '@/lib/content/appartements-temoins';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { track } from '@/lib/gueliz-attribution';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import { captureSimulatorAttribution, readSimulatorAttribution } from '@/lib/simulator-attribution';
import { ENDPOINTS } from '@/lib/site';

export const VISIT_FORM_ID = 'demande-visite';
/** Fired by the page CTAs to preselect a visit type before scrolling here. */
export const VISIT_INTENT_EVENT = 'emara:visit-intent';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CONSENT =
  'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.';
const SUBMIT_ERROR =
  'Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous directement sur WhatsApp.';
const LEAD_SOURCE = 'Appartements témoins';

type Step = 1 | 2;

/**
 * Two visual steps, one submission. Step 1 is validated locally and nothing is
 * sent until the final button, so a visitor produces exactly one lead.
 *
 * The request is the same /contact.php → Zapier (HubSpot) → email contract as
 * the /simulateur/ step-2 form: existing field names, honeypot, `elapsed_ms`
 * timer and attribution keys. contact.php has no fields for visit type,
 * contact method or timing, so they travel in the existing `message` field.
 */
export function VisitRequestForm() {
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('FR'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [visitType, setVisitType] = useState<VisitType>(VISIT_TYPES[0]);
  const [contactMethod, setContactMethod] = useState<string>(CONTACT_METHODS[0]);
  const [timing, setTiming] = useState<string>(TIMINGS[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const startedAt = useRef(0);
  /** Synchronous lock: `submitting` state lags a fast double click by one render. */
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  const buyerLeadSnapFired = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    startedAt.current = Date.now();
    captureSimulatorAttribution();

    function onIntent(event: Event) {
      const type = (event as CustomEvent<VisitType>).detail;
      if (VISIT_TYPES.includes(type)) setVisitType(type);
    }
    window.addEventListener(VISIT_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(VISIT_INTENT_EVENT, onIntent);
  }, []);

  function scrollToForm() {
    sectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function phoneParts() {
    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    return { localNumber, phoneFull: localNumber ? `${country.code}${localNumber}` : '' };
  }

  function continueToStep2(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { phoneFull } = phoneParts();
    const digits = phoneFull.replace(/\D/g, '');
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.nom_complet = 'Merci d’indiquer votre nom complet.';
    if (!email.trim()) next.email = 'Indiquez votre adresse email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse email valide.';
    if (digits.length < 8 || digits.length > 15) next.telephone = 'Merci d’indiquer un numéro de téléphone valide.';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.nom_complet ? 'visit-full-name' : next.email ? 'visit-email' : 'visit-phone';
      document.getElementById(first)?.focus();
      return;
    }
    setStep(2);
    scrollToForm();
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting || succeeded) return;
    setFeedback('');

    const { localNumber, phoneFull } = phoneParts();
    const attribution = { ...readSimulatorAttribution(), ...captureSimulatorAttribution() };
    const source = `${window.location.origin}${window.location.pathname}`;
    const payload = {
      form_type: 'appartements_temoins_request',
      nom_complet: fullName.trim(),
      email: email.trim(),
      telephone: phoneFull,
      phoneFull,
      phoneCode: country.code,
      phoneCountry: country.country,
      phoneCountryCode: country.countryCode,
      phoneNumber: localNumber,
      budget: '',
      message: [
        `Demande : ${visitType}`,
        `Contact préféré : ${contactMethod}`,
        `Délai : ${timing}`,
        message.trim() && `Précision : ${message.trim()}`,
      ]
        .filter(Boolean)
        .join(' — '),
      jour_visite: '',
      source,
      company_website: honeypot,
      elapsed_ms: Date.now() - startedAt.current,
      projectName: 'Appartements témoins Honest',
      leadSource: LEAD_SOURCE,
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
        if (data.errors) {
          setErrors(data.errors);
          // Contact-detail errors live on step 1; send the visitor back there.
          if (data.errors.nom_complet || data.errors.email || data.errors.telephone) setStep(1);
        }
        setFeedback(data.message || SUBMIT_ERROR);
        return;
      }

      // Conversion only after contact.php confirms success — never on step 1.
      if (!leadTracked.current) {
        leadTracked.current = true;
        track('Lead', {
          lead_source: LEAD_SOURCE,
          project: 'Appartements témoins Honest',
          visit_type: visitType,
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
    <section
      ref={sectionRef}
      id={VISIT_FORM_ID}
      aria-labelledby="visit-form-title"
      className="bg-[#f5f7f3] px-gutter py-[clamp(72px,9vw,120px)]"
    >
      <div className="mx-auto grid w-full max-w-[1186px] items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[clamp(56px,8vw,100px)]">
        <div className="lg:sticky lg:top-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Demande de visite</p>
          <h2
            id="visit-form-title"
            className="mt-4 font-sans text-[clamp(34px,4.2vw,54px)] font-semibold leading-[1.08] tracking-[-0.05em] text-forest"
          >
            Planifiez votre visite d’un appartement témoin
          </h2>
          <p className="mt-5 max-w-[500px] text-[16.5px] font-normal leading-[1.8] text-forest/72">
            Un conseiller Emara Estates vous recontacte pour confirmer un créneau et vous transmettre
            les plans, prix et disponibilités actuelles.
          </p>
          <ol className="mt-8 flex gap-3" aria-label="Progression">
            {(['Vos coordonnées', 'Vos préférences'] as const).map((label, index) => {
              const current = step === index + 1 && !succeeded;
              const done = step > index + 1 || succeeded;
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex-1 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-colors',
                    current && 'border-forest bg-forest text-cream',
                    done && 'border-olive/30 bg-olive/10 text-olive',
                    !current && !done && 'border-forest/12 text-forest/50',
                  )}
                >
                  {index + 1}. {label}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-[24px] border border-forest/10 bg-white p-6 shadow-[0_20px_65px_rgba(26,51,32,0.07)] sm:p-9 lg:p-[42px]">
          {succeeded ? (
            <div role="status" aria-live="polite" className="py-8 text-center">
              <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-bronze/10 text-bronze">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <h3 className="mt-5 font-sans text-[30px] font-semibold tracking-[-0.04em] text-forest">
                Votre demande a bien été envoyée
              </h3>
              <p className="mx-auto mt-3 max-w-[470px] text-[16px] font-normal leading-[1.8] text-forest/70">
                Un conseiller Emara Estates vous contactera par {contactMethod.toLowerCase()} pour
                organiser la suite.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 ? (
                <motion.form
                  key="step-1"
                  onSubmit={continueToStep2}
                  noValidate
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  aria-label="Étape 1 sur 2 : vos coordonnées"
                >
                  <input
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="absolute -left-[9999px] size-px overflow-hidden"
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Étape 1 sur 2</p>
                  <div className="mt-5 grid gap-5">
                    <div>
                      <label htmlFor="visit-full-name" className={fieldLabel}>Nom complet</label>
                      <input
                        id="visit-full-name"
                        name="nom_complet"
                        type="text"
                        maxLength={80}
                        autoComplete="name"
                        placeholder="Prénom et nom"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        aria-invalid={Boolean(errors.nom_complet)}
                        aria-describedby={errors.nom_complet ? 'visit-full-name-error' : undefined}
                        className={cn(fieldInput, errors.nom_complet && 'border-red-500/60')}
                      />
                      <FieldError id="visit-full-name-error" message={errors.nom_complet} />
                    </div>

                    <div>
                      <label htmlFor="visit-email" className={fieldLabel}>Email</label>
                      <input
                        id="visit-email"
                        name="email"
                        type="email"
                        maxLength={120}
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'visit-email-error' : undefined}
                        className={cn(fieldInput, errors.email && 'border-red-500/60')}
                      />
                      <FieldError id="visit-email-error" message={errors.email} />
                    </div>

                    <div>
                      <label htmlFor="visit-phone" className={fieldLabel}>Téléphone / WhatsApp</label>
                      <PhoneCountryInput
                        country={country}
                        onCountryChange={setCountry}
                        number={phoneNumber}
                        onNumberChange={setPhoneNumber}
                        invalid={Boolean(errors.telephone)}
                        describedBy={errors.telephone ? 'visit-phone-error' : undefined}
                        selectId="visit-phone-code"
                        inputId="visit-phone"
                        numberLabel="Téléphone / WhatsApp"
                      />
                      <FieldError id="visit-phone-error" message={errors.telephone} />
                    </div>

                    <ChoiceGroup
                      legend="Votre demande"
                      name="visit_type"
                      options={VISIT_TYPES}
                      value={visitType}
                      onChange={(v) => setVisitType(v as VisitType)}
                      columns="grid-cols-1"
                    />

                    <button type="submit" className={PRIMARY_BUTTON}>
                      Continuer
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="step-2"
                  onSubmit={submitRequest}
                  noValidate
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  aria-label="Étape 2 sur 2 : vos préférences"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">Étape 2 sur 2</p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-11 cursor-pointer text-[13.5px] font-semibold text-forest/65 transition-colors hover:text-bronze"
                    >
                      ← Modifier mes coordonnées
                    </button>
                  </div>
                  <p className="mt-1 text-[14px] text-forest/60">
                    {fullName.trim()} · {email.trim()}
                  </p>

                  <div className="mt-5 grid gap-6">
                    <ChoiceGroup
                      legend="Comment préférez-vous être contacté ?"
                      name="contact_method"
                      options={CONTACT_METHODS}
                      value={contactMethod}
                      onChange={setContactMethod}
                      columns="sm:grid-cols-3"
                    />
                    <ChoiceGroup
                      legend="Quand souhaitez-vous visiter ?"
                      name="timing"
                      options={TIMINGS}
                      value={timing}
                      onChange={setTiming}
                      columns="sm:grid-cols-2"
                    />

                    <div>
                      <button
                        type="button"
                        aria-expanded={detailsOpen}
                        aria-controls="visit-message-panel"
                        onClick={() => setDetailsOpen((open) => !open)}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-semibold text-forest/78 transition-colors hover:text-bronze"
                      >
                        <span aria-hidden="true" className="text-[18px] leading-none">{detailsOpen ? '−' : '+'}</span>
                        Ajouter une précision
                        <span className="font-normal text-forest/50">(optionnel)</span>
                      </button>
                      <div id="visit-message-panel" hidden={!detailsOpen} className="mt-2">
                        <label htmlFor="visit-message" className="sr-only-legacy">Précision</label>
                        <textarea
                          id="visit-message"
                          name="message"
                          rows={3}
                          maxLength={900}
                          placeholder="Typologie recherchée, budget, disponibilités…"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className={cn(fieldInput, 'resize-y')}
                        />
                      </div>
                    </div>

                    <p className="text-[14px] font-normal leading-[1.75] text-forest/68">{CONSENT}</p>

                    <button type="submit" disabled={submitting} className={PRIMARY_BUTTON}>
                      {submitting ? 'Envoi…' : 'Demander ma visite'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          )}

          <p role="alert" aria-live="assertive" className="mt-4 text-[15px] font-normal text-red-600 empty:hidden">
            {feedback}
          </p>
        </div>
      </div>
    </section>
  );
}

const PRIMARY_BUTTON =
  'min-h-14 w-full cursor-pointer rounded-full bg-forest px-7 py-4 text-[14px] font-semibold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:bg-bronze disabled:cursor-not-allowed disabled:opacity-60';

function ChoiceGroup({
  legend,
  name,
  options,
  value,
  onChange,
  columns,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  columns: string;
}) {
  return (
    <fieldset>
      <legend className={fieldLabel}>{legend}</legend>
      <div className={cn('grid gap-2.5', columns)}>
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 text-[14px] font-medium leading-snug transition-colors duration-200',
              value === option
                ? 'border-forest bg-forest/[0.04] text-forest'
                : 'border-forest/15 text-forest/75 hover:border-forest/35',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-4 shrink-0 accent-forest"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-2 text-[14.5px] font-normal text-red-600">{message}</p>;
}
