'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { trackFunnel } from '@/components/honest-7/funnel';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import {
  BUDGETS,
  FACTS,
  FORM_TYPE,
  FUNNEL_EVENTS,
  LANDING_NAMES,
  LEAD_CHANNEL,
  LEAD_ORIGIN,
  LEAD_SOURCE,
  PROPERTY_TYPES,
  type PropertyType,
} from '@/lib/content/honest-signature-7';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { resolveLandingAngle } from '@/lib/landing-angle';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { createMetaEventId } from '@/lib/meta-event-id';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import { ENDPOINTS } from '@/lib/site';

export const DOSSIER_ID = 'dossier';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CONSENT =
  'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.';
const SUBMIT_ERROR = 'Une erreur est survenue. Veuillez réessayer.';
const EASE = [0.23, 1, 0.32, 1] as const;

type Step = 1 | 2;
type Errors = Record<string, string>;

type LeadFormApi = {
  step: Step;
  propertyType: string;
  budget: string;
  fullName: string;
  email: string;
  country: Country;
  phoneNumber: string;
  honeypot: string;
  errors: Errors;
  feedback: string;
  submitting: boolean;
  succeeded: boolean;
  drawerOpen: boolean;
  setPropertyType: (value: string) => void;
  setBudget: (value: string) => void;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setCountry: (value: Country) => void;
  setPhoneNumber: (value: string) => void;
  setHoneypot: (value: string) => void;
  markStarted: () => void;
  backToStep1: () => void;
  continueToStep2: (idPrefix: string) => void;
  submit: (idPrefix: string) => Promise<void>;
  openDrawer: (options: { location: string; propertyType?: PropertyType }) => void;
  closeDrawer: () => void;
};

const LeadFormContext = createContext<LeadFormApi | null>(null);

export function useLeadForm() {
  const api = useContext(LeadFormContext);
  if (!api) throw new Error('useLeadForm must be used inside <LeadFormProvider>');
  return api;
}

/**
 * One lead, two views: the drawer opened by every CTA and the inline form at
 * the bottom of the page (no-JS and accessibility fallback). Both render this
 * state, so answers carry over between them and a visitor can only ever
 * produce one submission.
 *
 * Wire contract: the existing /contact.php → `sendLeadToZapier()` → Catch
 * Hook path. Every key the Zap already receives is still sent (nom_complet,
 * telephone, budget, message, utmSource…); property_type, budget_range,
 * full_name, landing_angle and the snake_case ad IDs are added alongside.
 * contact.php answers 200 only after Zapier accepts the lead, so the Lead
 * event is never fired early.
 *
 * Funnel: CTA_Click (per click) → LeadFormStarted (first real input, not the
 * drawer opening) → LeadQualificationCompleted (step 1 valid) → Lead (Zapier
 * success). Each stage fires once per page load.
 */
export function LeadFormProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>(1);
  const [propertyType, setPropertyTypeState] = useState('');
  const [budget, setBudgetState] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('FR'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const startedAt = useRef(0);
  const formStarted = useRef(false);
  const qualified = useRef(false);
  /** Synchronous lock: `submitting` state lags a fast double click by one render. */
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  /** One ID per lead, reused across retries — shared by the Pixel and CAPI Lead. */
  const metaLeadEventId = useRef('');
  const buyerLeadSnapFired = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    captureLandingAttribution();
  }, []);

  const markStarted = useCallback(() => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackFunnel(FUNNEL_EVENTS.start, { lead_source: LEAD_SOURCE });
  }, []);

  const setPropertyType = useCallback((value: string) => {
    setPropertyTypeState(value);
    setErrors((prev) => ({ ...prev, property_type: '' }));
  }, []);

  const setBudget = useCallback((value: string) => {
    setBudgetState(value);
    setErrors((prev) => ({ ...prev, budget: '' }));
  }, []);

  const openDrawer = useCallback(
    ({ location, propertyType: preset }: { location: string; propertyType?: PropertyType }) => {
      trackFunnel(FUNNEL_EVENTS.cta, { cta_location: location, ...(preset ? { property_type: preset } : {}) });
      if (preset && !succeeded) {
        setPropertyType(preset);
        setStep(1);
      }
      setDrawerOpen(true);
    },
    [setPropertyType, succeeded],
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const backToStep1 = useCallback(() => setStep(1), []);

  const continueToStep2 = useCallback(
    (idPrefix: string) => {
      markStarted();
      const next: Errors = {};
      if (!propertyType) next.property_type = 'Choisissez un type d’appartement.';
      if (!budget) next.budget = 'Choisissez une fourchette de budget.';
      setErrors(next);
      if (Object.keys(next).length) {
        document
          .querySelector<HTMLInputElement>(`#${idPrefix}-${next.property_type ? 'property_type' : 'budget'} input`)
          ?.focus();
        return;
      }
      if (!qualified.current) {
        qualified.current = true;
        trackFunnel(FUNNEL_EVENTS.qualified, { property_type: propertyType, budget_range: budget });
      }
      setStep(2);
    },
    [budget, markStarted, propertyType],
  );

  const submit = useCallback(
    async (idPrefix: string) => {
      if (inFlight.current || submitting || succeeded) return;
      setFeedback('');

      const localNumber = normalizeLocalNumber(phoneNumber, country.code);
      const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
      const digits = phoneFull.replace(/\D/g, '');
      const name = fullName.trim().replace(/\s+/g, ' ');
      const next: Errors = {};
      if (name.length < 2 || !/\p{L}/u.test(name)) next.full_name = 'Indiquez votre nom complet.';
      if (digits.length < 8 || digits.length > 15) next.telephone = 'Indiquez un numéro de téléphone valide.';
      if (!email.trim()) next.email = 'Indiquez votre adresse e-mail.';
      else if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse e-mail valide.';
      setErrors(next);
      if (Object.keys(next).length) {
        const first = next.full_name ? 'name' : next.telephone ? 'phone' : 'email';
        document.getElementById(`${idPrefix}-${first}`)?.focus();
        return;
      }

      const attribution = captureLandingAttribution();
      const landingAngle = resolveLandingAngle();
      const source = `${window.location.origin}${window.location.pathname}`;
      const [firstName, ...rest] = name.split(' ');
      metaLeadEventId.current ||= createMetaEventId('lead');
      const payload = {
        form_type: FORM_TYPE,
        nom_complet: name,
        email: email.trim(),
        telephone: phoneFull,
        phoneFull,
        phoneCode: country.code,
        phoneCountry: country.country,
        phoneCountryCode: country.countryCode,
        phoneNumber: localNumber,
        budget,
        message: ['Demande : plans, prix & disponibilités', `Type : ${propertyType}`, `Budget : ${budget}`].join(' — '),
        jour_visite: '',
        source: LEAD_CHANNEL,
        company_website: honeypot,
        elapsed_ms: Date.now() - startedAt.current,
        projectName: FACTS.project,
        propertyType,
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
        full_name: name,
        first_name: firstName,
        last_name: rest.join(' '),
        phone: phoneFull,
        property_type: propertyType,
        budget_range: budget,
        project: FACTS.project,
        lead_origin: LEAD_ORIGIN,
        landing_name: LANDING_NAMES[landingAngle],
        landing_angle: landingAngle,
        landing_page: window.location.href,
        utm_source: attribution.utm_source || '',
        utm_medium: attribution.utm_medium || '',
        utm_campaign: attribution.utm_campaign || '',
        utm_content: attribution.utm_content || '',
        utm_term: attribution.utm_term || '',
        campaign_id: attribution.campaign_id || '',
        adset_id: attribution.adset_id || '',
        ad_id: attribution.ad_id || '',
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
        let data: { message?: string; errors?: Errors } = {};
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

        // A filled honeypot is silently "accepted" without creating a lead.
        if (!leadTracked.current && !honeypot) {
          leadTracked.current = true;
          trackFunnel(
            FUNNEL_EVENTS.lead,
            { lead_source: LEAD_SOURCE, property_type: propertyType, budget_range: budget },
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
    },
    [budget, country, email, fullName, honeypot, phoneNumber, propertyType, submitting, succeeded],
  );

  const api = useMemo<LeadFormApi>(
    () => ({
      step,
      propertyType,
      budget,
      fullName,
      email,
      country,
      phoneNumber,
      honeypot,
      errors,
      feedback,
      submitting,
      succeeded,
      drawerOpen,
      setPropertyType,
      setBudget,
      setFullName,
      setEmail,
      setCountry,
      setPhoneNumber,
      setHoneypot,
      markStarted,
      backToStep1,
      continueToStep2,
      submit,
      openDrawer,
      closeDrawer,
    }),
    [
      step,
      propertyType,
      budget,
      fullName,
      email,
      country,
      phoneNumber,
      honeypot,
      errors,
      feedback,
      submitting,
      succeeded,
      drawerOpen,
      setPropertyType,
      setBudget,
      markStarted,
      backToStep1,
      continueToStep2,
      submit,
      openDrawer,
      closeDrawer,
    ],
  );

  return <LeadFormContext.Provider value={api}>{children}</LeadFormContext.Provider>;
}

/**
 * The two-step form itself. `idPrefix` keeps IDs unique between the drawer
 * and the inline copy; `active` says which of the two the visitor is using.
 */
export function LeadForm({
  idPrefix,
  active,
  onDone,
}: {
  idPrefix: string;
  active: boolean;
  onDone?: () => void;
}) {
  const form = useLeadForm();
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const root = rootRef.current;
    if (!active || !root) return;
    const sheet = root.closest<HTMLElement>('[data-sheet-body]');
    if (sheet) sheet.scrollTo({ top: 0 });
    else if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [form.step, form.succeeded, active, reduce]);

  const honeypotField = (
    <input
      type="text"
      name="company_website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={form.honeypot}
      onChange={(event) => form.setHoneypot(event.target.value)}
      className="absolute -left-[9999px] size-px overflow-hidden"
    />
  );

  if (form.succeeded) {
    return (
      <div ref={rootRef} role="status" aria-live="polite" className="py-8 text-center">
        <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-forest text-cream">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </div>
        <h3 className="mt-6 font-sans text-[26px] font-medium tracking-[-0.03em] text-forest">
          Votre demande a bien été envoyée.
        </h3>
        <p className="mx-auto mt-3 max-w-[420px] text-[16px] leading-[1.65] text-forest/70">
          Un conseiller Emara Estates vous transmettra les plans, les prix et les disponibilités actuelles de Honest
          Signature 7.
        </p>
        {onDone && (
          <button type="button" onClick={onDone} className={cn(SECONDARY, 'mt-8')}>
            Revenir à la page
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <StepIndicator step={form.step} />
      <AnimatePresence mode="wait" initial={false}>
        {form.step === 1 ? (
          <motion.form
            key="step-1"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              form.continueToStep2(idPrefix);
            }}
            noValidate
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6 grid gap-7"
          >
            {honeypotField}
            <ChoiceGroup
              id={`${idPrefix}-property_type`}
              legend="Quels appartements vous intéressent ?"
              name="property_type"
              options={PROPERTY_TYPES}
              value={form.propertyType}
              onChange={(value) => {
                form.markStarted();
                form.setPropertyType(value);
              }}
              error={form.errors.property_type}
            />
            <ChoiceGroup
              id={`${idPrefix}-budget`}
              legend="Quel budget prévoyez-vous pour votre achat ?"
              name="budget_range"
              options={BUDGETS}
              value={form.budget}
              onChange={(value) => {
                form.markStarted();
                form.setBudget(value);
              }}
              error={form.errors.budget}
              columns
            />
            <button type="submit" className={SUBMIT}>
              Continuer
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="step-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void form.submit(idPrefix);
            }}
            noValidate
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6 grid gap-5"
          >
            {honeypotField}
            <h3 className={LEGEND}>Où devons-nous vous envoyer les disponibilités&nbsp;?</h3>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-cream/80 px-4 py-2.5">
              <p className="grid text-[14.5px] leading-[1.4] text-forest/70">
                <span className="font-medium text-forest">{form.propertyType}</span>
                <span>{form.budget}</span>
              </p>
              <button
                type="button"
                onClick={form.backToStep1}
                className="min-h-11 shrink-0 cursor-pointer text-[14px] font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
              >
                Modifier
              </button>
            </div>

            <TextField
              id={`${idPrefix}-name`}
              name="nom_complet"
              label="Nom complet"
              autoComplete="name"
              value={form.fullName}
              onChange={(value) => {
                form.markStarted();
                form.setFullName(value);
              }}
              error={form.errors.full_name || form.errors.nom_complet}
            />

            <div>
              <label htmlFor={`${idPrefix}-phone`} className={fieldLabel}>
                Téléphone / WhatsApp
              </label>
              <PhoneCountryInput
                country={form.country}
                onCountryChange={form.setCountry}
                number={form.phoneNumber}
                onNumberChange={(value) => {
                  form.markStarted();
                  form.setPhoneNumber(value);
                }}
                invalid={Boolean(form.errors.telephone)}
                describedBy={form.errors.telephone ? `${idPrefix}-phone-error` : undefined}
                selectId={`${idPrefix}-phone-code`}
                inputId={`${idPrefix}-phone`}
                numberLabel="Téléphone / WhatsApp"
                placeholder="6 12 34 56 78"
                autoDetect={active}
              />
              <FieldError id={`${idPrefix}-phone-error`} message={form.errors.telephone} />
            </div>

            <TextField
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              label="E-mail"
              autoComplete="email"
              value={form.email}
              onChange={(value) => {
                form.markStarted();
                form.setEmail(value);
              }}
              error={form.errors.email}
              placeholder="vous@exemple.com"
            />

            <button
              type="submit"
              disabled={form.submitting}
              aria-busy={form.submitting}
              className={cn(SUBMIT, 'px-5 text-[13px] tracking-[0.06em] sm:px-8 sm:text-[14px] sm:tracking-[0.1em]')}
            >
              {form.submitting ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                  Envoi en cours…
                </span>
              ) : (
                'Recevoir les plans & disponibilités'
              )}
            </button>
            <p className="text-center text-[14.5px] leading-[1.55] text-forest/70">
              Un conseiller Emara Estates vous transmettra les informations disponibles sur Honest Signature 7.
            </p>
            <p role="alert" aria-live="assertive" className="text-center text-[15px] text-[#8c4a32] empty:hidden">
              {form.feedback}
            </p>
            <p className="text-[13px] leading-[1.6] text-forest/50">{CONSENT}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Inline form at the end of the page — the fallback when the drawer is not used. */
export function DossierSection() {
  const form = useLeadForm();
  return (
    <section
      id={DOSSIER_ID}
      aria-labelledby="dossier-title"
      inert={form.drawerOpen ? true : undefined}
      className="scroll-mt-20 bg-cream px-gutter py-[clamp(56px,8vw,112px)]"
    >
      <div className="mx-auto grid w-full max-w-[1186px] items-start gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[clamp(56px,8vw,112px)]">
        <div className="lg:sticky lg:top-28">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-olive">Le dossier Honest Signature 7</p>
          <h2
            id="dossier-title"
            className="mt-4 text-balance font-sans text-[clamp(30px,4.2vw,54px)] font-medium leading-[1.06] tracking-[-0.035em] text-forest"
          >
            Recevez les plans, prix et disponibilités.
          </h2>
          <ul className="mt-7 grid gap-3 text-[16px] leading-[1.5] text-forest/75">
            {['Plans des appartements', 'Grille de prix à jour', 'Disponibilités actuelles'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-bronze" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(45,58,45,0.35)] sm:p-10">
          <LeadForm idPrefix="hs7" active={!form.drawerOpen} />
        </div>
      </div>
    </section>
  );
}

const SUBMIT =
  'min-h-14 w-full cursor-pointer rounded-full bg-forest px-8 py-4 text-[14px] font-medium uppercase tracking-[0.1em] text-cream transition-[background-color,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-[#243024] disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-forest/25 px-7 text-[15px] font-medium text-forest transition-colors duration-300 hover:border-forest';
const LEGEND = 'font-sans text-[clamp(21px,2vw,25px)] font-medium leading-[1.2] tracking-[-0.02em] text-forest';

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-olive">Étape {step} sur 2</p>
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
  id,
  legend,
  name,
  options,
  value,
  onChange,
  error,
  columns = false,
}: {
  id: string;
  legend: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  columns?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <fieldset id={id} aria-describedby={error ? errorId : undefined}>
      <legend className={LEGEND}>{legend}</legend>
      <div className={cn('mt-4 grid gap-2', columns ? 'grid-cols-2' : 'grid-cols-1')}>
        {options.map((option) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={cn(
                'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 text-[15px] leading-snug transition-colors duration-200',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bronze',
                columns && 'justify-center whitespace-nowrap px-2 text-center text-[14.5px] tabular-nums',
                checked ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-white text-forest hover:border-forest/40',
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
              {!columns && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-full border',
                    checked ? 'border-cream' : 'border-forest/30',
                  )}
                >
                  {checked && <span className="size-2 rounded-full bg-cream" />}
                </span>
              )}
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
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        maxLength={type === 'email' ? 120 : 80}
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
  return (
    <p id={id} className="mt-2 text-[14.5px] text-[#8c4a32]">
      {message}
    </p>
  );
}
