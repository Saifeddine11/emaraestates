'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import {
  FORM_TYPE,
  LANDING_NAME,
  LEAD_CHANNEL,
  LEAD_ORIGIN,
  LEAD_SOURCE,
  PROJECT,
} from '@/lib/content/residence-boutique';
import { OG_TRACKING } from '@/lib/content/offre-gueliz';
import { track } from '@/lib/gueliz-attribution';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { trackLandingEvent } from '@/lib/landing-events';
import { createMetaEventId } from '@/lib/meta-event-id';
import { ENDPOINTS } from '@/lib/site';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const SUBMIT_ERROR = 'L’envoi n’a pas abouti. Vos réponses sont conservées : réessayez.';

export type Placement = 'hero' | 'final';
export type Step = 1 | 2;

type Errors = Partial<Record<'propertyType' | 'budget' | 'fullName' | 'phone' | 'email', string>>;

type LeadFormContext = {
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
  /** The form the visitor last acted in — the one that owns focus moves. */
  activePlacement: Placement;
  setPropertyType: (value: string, from: Placement) => void;
  setBudget: (value: string, from: Placement) => void;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setCountry: (value: Country) => void;
  setPhoneNumber: (value: string) => void;
  setHoneypot: (value: string) => void;
  markStarted: (from: Placement) => void;
  continueToStep2: (from: Placement) => boolean;
  backToStep1: (from: Placement) => void;
  submit: (from: Placement) => Promise<void>;
};

const Context = createContext<LeadFormContext | null>(null);

export function useLeadForm() {
  const value = useContext(Context);
  if (!value) throw new Error('useLeadForm must be used inside <LeadFormProvider>.');
  return value;
}

/**
 * One lead, two forms. The hero card and the closing card render the same
 * state, so an answer given at the top is still there at the bottom, a
 * success in one shows in both, and the in-flight lock is shared — a visitor
 * can never produce two leads from one page.
 *
 * Wire contract: identical to `/honest-signature-7/` (DossierLeadForm) —
 * /contact.php → `sendLeadToZapier()` → the existing Catch Hook, same
 * form_type, source, leadSource and lead_origin. This page adds only values
 * for keys contact.php already forwards: `propertyType` (Studio / 1 chambre /
 * 2 chambres) and its own `landing_name`. `purchase_intent` stays empty: this
 * form does not ask it. contact.php answers 200 only after Zapier accepts, so
 * the success state and the Lead are never shown early.
 */
export function LeadFormProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>(1);
  const [propertyType, setPropertyTypeState] = useState('');
  const [budget, setBudgetState] = useState('');
  const [fullName, setFullNameState] = useState('');
  const [email, setEmailState] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('FR'));
  const [phoneNumber, setPhoneNumberState] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [activePlacement, setActivePlacement] = useState<Placement>('hero');

  const startedAt = useRef(0);
  const started = useRef(false);
  /** Synchronous lock: `submitting` lags a fast double click by one render. */
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  /** One ID per lead, reused across retries — shared by the Pixel and CAPI Lead. */
  const metaLeadEventId = useRef('');
  const buyerLeadSnapFired = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    captureLandingAttribution();
  }, []);

  const clearError = (key: keyof Errors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const markStarted = useCallback((from: Placement) => {
    setActivePlacement(from);
    if (started.current) return;
    started.current = true;
    trackLandingEvent('form_started', { placement: from });
    track(OG_TRACKING.events.start, { project: PROJECT, lead_source: LEAD_SOURCE });
  }, []);

  const setPropertyType = useCallback(
    (value: string, from: Placement) => {
      markStarted(from);
      setPropertyTypeState(value);
      clearError('propertyType');
      trackLandingEvent('property_type_selected', { property_type: value, placement: from });
    },
    [markStarted],
  );

  const setBudget = useCallback(
    (value: string, from: Placement) => {
      markStarted(from);
      setBudgetState(value);
      clearError('budget');
      trackLandingEvent('budget_selected', { budget_range: value, placement: from });
    },
    [markStarted],
  );

  const continueToStep2 = useCallback(
    (from: Placement) => {
      markStarted(from);
      const next: Errors = {};
      if (!propertyType) next.propertyType = 'Choisissez un type de bien.';
      if (!budget) next.budget = 'Choisissez une fourchette de budget.';
      setErrors(next);
      if (next.propertyType || next.budget) return false;
      track(OG_TRACKING.events.step, { project: PROJECT, step: 1, step_key: 'qualification' });
      trackLandingEvent('form_step_2', { placement: from, property_type: propertyType, budget_range: budget });
      setStep(2);
      return true;
    },
    [budget, markStarted, propertyType],
  );

  const backToStep1 = useCallback((from: Placement) => {
    setActivePlacement(from);
    setStep(1);
  }, []);

  const submit = useCallback(
    async (from: Placement) => {
      setActivePlacement(from);
      if (inFlight.current || submitting || succeeded) return;
      setFeedback('');

      const name = fullName.trim().replace(/\s+/g, ' ');
      const localNumber = normalizeLocalNumber(phoneNumber, country.code);
      const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
      const digits = phoneFull.replace(/\D/g, '');
      const next: Errors = {};
      if (name.length < 2 || /\d/.test(name)) next.fullName = 'Indiquez votre nom.';
      if (digits.length < 8 || digits.length > 15) next.phone = 'Vérifiez votre numéro de téléphone.';
      if (!email.trim()) next.email = 'Indiquez votre e-mail.';
      else if (!EMAIL_RE.test(email.trim())) next.email = 'Vérifiez votre adresse e-mail.';
      setErrors(next);
      if (next.fullName || next.phone || next.email) {
        const first = next.fullName ? 'name' : next.phone ? 'phone' : 'email';
        document.getElementById(`rb-${from}-${first}`)?.focus();
        return;
      }

      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ');
      const attribution = captureLandingAttribution();
      const source = `${window.location.origin}${window.location.pathname}`;
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
        message: [
          'Demande : plans, prix & disponibilités',
          `Type de bien : ${propertyType}`,
          `Budget : ${budget}`,
        ].join(' — '),
        jour_visite: '',
        source: LEAD_CHANNEL,
        company_website: honeypot,
        elapsed_ms: Date.now() - startedAt.current,
        projectName: PROJECT,
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
        first_name: firstName,
        last_name: lastName,
        purchase_intent: '',
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

      trackLandingEvent('lead_submit_attempt', { placement: from, property_type: propertyType, budget_range: budget });
      inFlight.current = true;
      setSubmitting(true);
      const fail = (reason: string) => {
        setFeedback(SUBMIT_ERROR);
        trackLandingEvent('lead_submit_error', { placement: from, reason });
      };
      try {
        const response = await fetch(ENDPOINTS.contact, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });
        const text = await response.text();
        let data: { message?: string } = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          fail(`invalid_response_${response.status}`);
          return;
        }
        if (!response.ok || typeof data.message !== 'string') {
          fail(`http_${response.status}`);
          return;
        }

        // Conversion only after contact.php confirms — never on a click. A
        // filled honeypot is silently "accepted" without creating a lead.
        if (!leadTracked.current && !honeypot) {
          leadTracked.current = true;
          track(OG_TRACKING.events.step, { project: PROJECT, step: 2, step_key: 'coordonnees' });
          track(
            OG_TRACKING.events.lead,
            {
              lead_source: LEAD_SOURCE,
              project: PROJECT,
              property_type: propertyType,
              budget_range: budget,
              utm_campaign: attribution.utm_campaign || '',
            },
            { metaEventId: metaLeadEventId.current },
          );
          trackLandingEvent('lead_submit_success', { placement: from, property_type: propertyType, budget_range: budget });
        }
        fireSnapEvent(SNAP_EVENT_BUYER_LEAD, buyerLeadSnapFired);
        setSucceeded(true);
      } catch {
        fail('network');
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [budget, country, email, fullName, honeypot, phoneNumber, propertyType, submitting, succeeded],
  );

  const value = useMemo<LeadFormContext>(
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
      activePlacement,
      setPropertyType,
      setBudget,
      setFullName: (value) => {
        setFullNameState(value);
        clearError('fullName');
      },
      setEmail: (value) => {
        setEmailState(value);
        clearError('email');
      },
      setCountry,
      setPhoneNumber: (value) => {
        setPhoneNumberState(value);
        clearError('phone');
      },
      setHoneypot,
      markStarted,
      continueToStep2,
      backToStep1,
      submit,
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
      activePlacement,
      setPropertyType,
      setBudget,
      markStarted,
      continueToStep2,
      backToStep1,
      submit,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
