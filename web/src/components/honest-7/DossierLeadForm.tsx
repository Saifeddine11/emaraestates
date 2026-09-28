'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { DOSSIER_ID, VISIT_INTENT_EVENT } from '@/components/honest-7/DossierCta';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import {
  BUDGETS,
  FORM_TYPE,
  LANDING_NAME,
  LEAD_CHANNEL,
  LEAD_ORIGIN,
  LEAD_SOURCE,
  PURPOSES,
} from '@/lib/content/honest-signature-7';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { track } from '@/lib/gueliz-attribution';
import { createMetaEventId } from '@/lib/meta-event-id';
import { OG_TRACKING } from '@/lib/content/offre-gueliz';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { ENDPOINTS } from '@/lib/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CONSENT =
  'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.';
const SUBMIT_ERROR = 'Une erreur est survenue. Veuillez réessayer.';
const PROJECT = 'Honest Signature 7';
const EASE = [0.23, 1, 0.32, 1] as const;

type Step = 1 | 2;

/**
 * Two visual steps, one submission: step 1 qualifies (purpose + budget) and is
 * validated locally, step 2 collects contact details, and only the final
 * button posts. A visitor therefore produces exactly one lead.
 *
 * Wire contract: the existing /contact.php → `sendLeadToZapier()` → Catch
 * Hook path used by /simulateur/ and /appartements-temoins/. Every existing
 * key is still sent (nom_complet, telephone, budget, message, utmSource…) so
 * current Zap mappings keep working; the landing-page keys (first_name,
 * purchase_intent, utm_source, landing_page…) are added alongside. contact.php
 * answers 200 only after Zapier accepts the lead, so success is never shown
 * early. Funnel events reuse the /offre-gueliz names so the two paid-traffic
 * forms report under the same custom events.
 */
export function DossierLeadForm() {
  const [step, setStep] = useState<Step>(1);
  const [purpose, setPurpose] = useState('');
  const [budget, setBudget] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('FR'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [visitOffered, setVisitOffered] = useState(false);
  const [visit, setVisit] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const startedAt = useRef(0);
  const formStarted = useRef(false);
  /** Synchronous lock: `submitting` state lags a fast double click by one render. */
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  /** One ID per lead, reused across retries — shared by the Pixel and CAPI Lead. */
  const metaLeadEventId = useRef('');
  const buyerLeadSnapFired = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    startedAt.current = Date.now();
    captureLandingAttribution();
    function onVisitIntent() {
      setVisitOffered(true);
      setVisit(true);
    }
    window.addEventListener(VISIT_INTENT_EVENT, onVisitIntent);
    return () => window.removeEventListener(VISIT_INTENT_EVENT, onVisitIntent);
  }, []);

  function markStarted() {
    if (formStarted.current) return;
    formStarted.current = true;
    track(OG_TRACKING.events.start, { project: PROJECT, lead_source: LEAD_SOURCE });
  }

  function scrollToForm() {
    sectionRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function continueToStep2(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    markStarted();
    const next: Record<string, string> = {};
    if (!purpose) next.purpose = 'Choisissez le type de projet qui vous correspond.';
    if (!budget) next.budget = 'Choisissez une fourchette de budget.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector<HTMLInputElement>(next.purpose ? 'input[name="purpose"]' : 'input[name="budget_range"]')?.focus();
      return;
    }
    track(OG_TRACKING.events.step, { project: PROJECT, step: 1, step_key: 'qualification' });
    setStep(2);
    scrollToForm();
  }

  function phoneParts() {
    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    return { localNumber, phoneFull: localNumber ? `${country.code}${localNumber}` : '' };
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting || succeeded) return;
    setFeedback('');

    const { localNumber, phoneFull } = phoneParts();
    const digits = phoneFull.replace(/\D/g, '');
    const next: Record<string, string> = {};
    if (firstName.trim().length < 2) next.first_name = 'Indiquez votre prénom.';
    if (lastName.trim().length < 2) next.last_name = 'Indiquez votre nom.';
    if (digits.length < 8 || digits.length > 15) next.telephone = 'Indiquez un numéro de téléphone valide.';
    if (!email.trim()) next.email = 'Indiquez votre adresse email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse email valide.';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.first_name
        ? 'hs7-first-name'
        : next.last_name
          ? 'hs7-last-name'
          : next.telephone
            ? 'hs7-phone'
            : 'hs7-email';
      document.getElementById(first)?.focus();
      return;
    }

    const attribution = captureLandingAttribution();
    const source = `${window.location.origin}${window.location.pathname}`;
    metaLeadEventId.current ||= createMetaEventId('lead');
    const intent = PURPOSES.find((option) => option.label === purpose)?.intent ?? purpose;
    const payload = {
      form_type: FORM_TYPE,
      nom_complet: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      telephone: phoneFull,
      phoneFull,
      phoneCode: country.code,
      phoneCountry: country.country,
      phoneCountryCode: country.countryCode,
      phoneNumber: localNumber,
      budget,
      message: [
        'Demande : plans, prix & disponibilités',
        `Projet : ${intent}`,
        `Budget : ${budget}`,
        visit && 'Souhaite aussi organiser une visite',
      ]
        .filter(Boolean)
        .join(' — '),
      jour_visite: '',
      source: LEAD_CHANNEL,
      company_website: honeypot,
      elapsed_ms: Date.now() - startedAt.current,
      projectName: PROJECT,
      currency: 'MAD',
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
      // Landing-page keys, forwarded to the Catch Hook by contact.php.
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      purchase_intent: intent,
      project: PROJECT,
      lead_origin: LEAD_ORIGIN,
      landing_name: LANDING_NAME,
      landing_page: window.location.href,
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      // Shared with the browser Lead below; contact.php sends the CAPI copy.
      meta_event_id: metaLeadEventId.current,
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
        setFeedback(SUBMIT_ERROR);
        return;
      }

      // Conversion only after contact.php confirms success — never on step 1.
      // A filled honeypot is silently "accepted" without creating a lead.
      if (!leadTracked.current && !honeypot) {
        leadTracked.current = true;
        track(OG_TRACKING.events.step, { project: PROJECT, step: 2, step_key: 'coordonnees' });
        track(
          OG_TRACKING.events.lead,
          {
            lead_source: LEAD_SOURCE,
            project: PROJECT,
            purchase_intent: intent,
            budget_range: budget,
            utm_campaign: attribution.utm_campaign || '',
          },
          { metaEventId: metaLeadEventId.current },
        );
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

  const honeypotField = (
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
  );

  return (
    <section
      ref={sectionRef}
      id={DOSSIER_ID}
      aria-labelledby="dossier-title"
      className="bg-shell px-gutter py-[clamp(72px,10vw,140px)]"
    >
      <div className="mx-auto grid w-full max-w-[1186px] items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[clamp(56px,8vw,112px)]">
        <div className="lg:sticky lg:top-28">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-olive">Le dossier Honest Signature 7</p>
          <h2
            id="dossier-title"
            className="mt-4 text-balance font-sans text-[clamp(32px,4.2vw,54px)] font-medium leading-[1.06] tracking-[-0.035em] text-forest"
          >
            Recevez les plans, prix et disponibilités.
          </h2>
          <ul className="mt-8 grid gap-3 text-[16px] leading-[1.5] text-forest/75">
            {['Plans des appartements', 'Grille de prix à jour', 'Lots encore disponibles'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-bronze" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(45,58,45,0.35)] sm:p-10">
          {succeeded ? (
            <div role="status" aria-live="polite" className="py-10 text-center">
              <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-forest text-cream">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <h3 className="mt-6 font-sans text-[28px] font-medium tracking-[-0.03em] text-forest">
                Votre demande a bien été envoyée.
              </h3>
              <p className="mx-auto mt-3 max-w-[440px] text-[16px] leading-[1.7] text-forest/70">
                Un conseiller Emara Estates vous contactera pour vous transmettre les plans, prix et
                disponibilités.
              </p>
            </div>
          ) : (
            <>
              <StepIndicator step={step} />
              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.form
                    key="step-1"
                    onSubmit={continueToStep2}
                    onFocusCapture={markStarted}
                    noValidate
                    initial={reduce ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -16 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="mt-8 grid gap-8"
                  >
                    {honeypotField}
                    <ChoiceGroup
                      legend="Votre projet"
                      name="purpose"
                      options={PURPOSES.map((option) => option.label)}
                      value={purpose}
                      onChange={(value) => {
                        markStarted();
                        setPurpose(value);
                        setErrors((prev) => ({ ...prev, purpose: '' }));
                      }}
                      error={errors.purpose}
                    />
                    <ChoiceGroup
                      legend="Votre budget"
                      name="budget_range"
                      options={BUDGETS}
                      value={budget}
                      onChange={(value) => {
                        markStarted();
                        setBudget(value);
                        setErrors((prev) => ({ ...prev, budget: '' }));
                      }}
                      error={errors.budget}
                      compact
                    />
                    <button type="submit" className={SUBMIT}>
                      Continuer
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="step-2"
                    onSubmit={submitRequest}
                    noValidate
                    initial={reduce ? false : { opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: 16 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="mt-8 grid gap-5"
                  >
                    {honeypotField}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-cream/70 px-4 py-3 text-[14.5px] text-forest/75">
                      <span className="font-medium text-forest">{purpose}</span>
                      <span aria-hidden="true">·</span>
                      <span>{budget}</span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="ml-auto min-h-11 cursor-pointer text-[14px] font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
                      >
                        Modifier
                      </button>
                    </p>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField id="hs7-first-name" name="prenom" label="Prénom" autoComplete="given-name" value={firstName} onChange={setFirstName} error={errors.first_name} />
                      <TextField id="hs7-last-name" name="nom" label="Nom" autoComplete="family-name" value={lastName} onChange={setLastName} error={errors.last_name || errors.nom_complet} />
                    </div>

                    <div>
                      <label htmlFor="hs7-phone" className={fieldLabel}>Téléphone / WhatsApp</label>
                      <PhoneCountryInput
                        country={country}
                        onCountryChange={setCountry}
                        number={phoneNumber}
                        onNumberChange={setPhoneNumber}
                        invalid={Boolean(errors.telephone)}
                        describedBy={errors.telephone ? 'hs7-phone-error' : undefined}
                        selectId="hs7-phone-code"
                        inputId="hs7-phone"
                        numberLabel="Téléphone / WhatsApp"
                        placeholder="6 12 34 56 78"
                      />
                      <FieldError id="hs7-phone-error" message={errors.telephone} />
                    </div>

                    <TextField id="hs7-email" name="email" type="email" label="Email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} placeholder="vous@exemple.com" />

                    {visitOffered && (
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15.5px] text-forest">
                        <input
                          type="checkbox"
                          name="visite"
                          checked={visit}
                          onChange={(event) => setVisit(event.target.checked)}
                          className="size-5 shrink-0 accent-forest"
                        />
                        Je souhaite aussi organiser une visite
                      </label>
                    )}

                    <p className="text-[14px] leading-[1.65] text-forest/60">{CONSENT}</p>

                    <button type="submit" disabled={submitting} aria-busy={submitting} className={SUBMIT}>
                      {submitting ? (
                        <span className="inline-flex items-center justify-center gap-3">
                          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                          Envoi en cours…
                        </span>
                      ) : (
                        'Recevoir les plans, prix & disponibilités'
                      )}
                    </button>
                    <p className="text-center text-[14.5px] leading-[1.6] text-forest/70">
                      Un conseiller Emara Estates vous recontactera pour vous transmettre les disponibilités.
                    </p>
                    <p role="alert" aria-live="assertive" className="text-[15px] text-[#8c4a32] empty:hidden">
                      {feedback}
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const SUBMIT =
  'min-h-14 w-full cursor-pointer rounded-full bg-forest px-8 py-4 text-[15px] font-medium tracking-[0.01em] text-cream transition-[background-color,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-[#243024] disabled:cursor-not-allowed disabled:opacity-60';

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-olive">
        Étape {step} sur 2
      </p>
      <div aria-hidden="true" className="h-px flex-1 overflow-hidden bg-forest/10">
        <div
          className="h-full bg-forest transition-[width] duration-500 ease-premium"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>
    </div>
  );
}

function ChoiceGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  compact = false,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  compact?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="font-sans text-[clamp(20px,2vw,24px)] font-medium tracking-[-0.02em] text-forest">
        {legend}
      </legend>
      <div className={cn('mt-4 grid gap-2.5', compact ? 'grid-cols-1 xs:grid-cols-2' : 'grid-cols-1')}>
        {options.map((option) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[15.5px] leading-snug transition-colors duration-200',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bronze',
                checked ? 'border-forest bg-forest text-cream' : 'border-forest/15 text-forest hover:border-forest/40',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  checked ? 'border-cream' : 'border-forest/30',
                )}
              >
                {checked && <span className="size-2 rounded-full bg-cream" />}
              </span>
              {option}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

function TextField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        maxLength={type === 'email' ? 120 : 40}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(fieldInput, error && 'border-[#8c4a32]/60')}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-2 text-[14.5px] text-[#8c4a32]">{message}</p>;
}
