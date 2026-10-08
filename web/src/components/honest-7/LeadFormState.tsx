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
import {
  FACTS,
  FORM_TYPE,
  LANDING_NAME,
  LEAD_CHANNEL,
  LEAD_ORIGIN,
  LEAD_SOURCE,
  LEAD_STAGE,
  PROJECT_META,
  VALIDATION,
} from '@/lib/content/honest-signature-7';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { trackLandingEvent } from '@/lib/landing-events';
import { createMetaEventId } from '@/lib/meta-event-id';
import { pixelFormStarted, pixelLead, pixelStepCompleted } from '@/components/honest-7/pixels';
import { LEAD_DRAFT_ENDPOINT } from '@/components/honest-7/shared';
import { ENDPOINTS } from '@/lib/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PROJECT = PROJECT_META.project_name;

/** sessionStorage key of the form session: one ID per tab session, kept across reloads. */
const FORM_SESSION_KEY = 'emara_hs7_form_session';
/** Typing pauses this long before the draft is saved (a blur saves at once). */
const DRAFT_DEBOUNCE_MS = 1000;
/** An unchanged draft is re-sent at most this often, only to record that the visitor is still active. */
const DRAFT_TOUCH_MS = 60_000;
/** Matches LEAD_DRAFT_PARTIAL_GRACE_SECONDS on the server: a visitor still on the form after it is reported "en cours". */
const DRAFT_GRACE_MS = 47_000;

let memoryFormSession = '';

/** The form session ID, created on first use. Storage can throw in private modes: memory is the fallback. */
function formSessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(FORM_SESSION_KEY);
    if (stored) return stored;
  } catch {
    if (memoryFormSession) return memoryFormSession;
  }
  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
  }
  memoryFormSession = id;
  try {
    window.sessionStorage.setItem(FORM_SESSION_KEY, id);
  } catch {
    /* kept in memory for this page load */
  }
  return id;
}

export const SUBMIT_ERROR = 'L’envoi n’a pas abouti. Vos coordonnées sont conservées : réessayez.';

export type Placement = 'hero' | 'final';
/** `form` → the lead is sent → `qualify` (optional questions) → `done`. */
export type Stage = 'form' | 'qualify' | 'done';
/** Inside `form`: 1 type of apartment, 2 budget, 3 contact details. */
export type Step = 1 | 2 | 3;

type Errors = Partial<Record<'fullName' | 'phone' | 'email', string>>;

type Qualification = {
  intent: string;
  channel: string;
  visitOpen: boolean;
  visitDay: string;
  visitMoment: string;
};

const NO_QUALIFICATION: Qualification = { intent: '', channel: '', visitOpen: false, visitDay: '', visitMoment: '' };

type LeadFormContext = Qualification & {
  stage: Stage;
  step: Step;
  propertyType: string;
  budget: string;
  selectPropertyType: (value: string, from: Placement) => void;
  selectBudget: (value: string, from: Placement) => void;
  goToStep: (step: Step, from: Placement) => void;
  /** « Continuer »: the next question, once the current one is answered (after going back). */
  nextStep: (from: Placement) => void;
  fullName: string;
  email: string;
  country: Country;
  phoneNumber: string;
  honeypot: string;
  errors: Errors;
  feedback: string;
  submitting: boolean;
  saving: boolean;
  /** The form the visitor last acted in — the one that owns focus moves. */
  activePlacement: Placement;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setCountry: (value: Country) => void;
  setPhoneNumber: (value: string) => void;
  setHoneypot: (value: string) => void;
  markStarted: (from: Placement) => void;
  submit: (from: Placement) => Promise<void>;
  /** Saves the draft now if it changed — called when a field loses focus. */
  flushDraft: () => void;
  selectIntent: (value: string, from: Placement) => void;
  selectChannel: (value: string, from: Placement) => void;
  openVisit: (from: Placement) => void;
  setVisitDay: (value: string) => void;
  setVisitMoment: (value: string) => void;
  saveQualification: (from: Placement) => Promise<void>;
};

const Context = createContext<LeadFormContext | null>(null);

export function useLeadForm() {
  const value = useContext(Context);
  if (!value) throw new Error('useLeadForm must be used inside <LeadFormProvider>.');
  return value;
}

function visitSummary({ visitOpen, visitDay, visitMoment }: Qualification) {
  if (!visitOpen || (!visitDay && !visitMoment)) return '';
  return [visitDay, visitMoment.toLowerCase()].filter(Boolean).join(', ');
}

/**
 * One lead, two forms. The first card and the closing card render the same
 * state, so details typed at the top are still there at the bottom, a success
 * in one shows in both, and the in-flight lock is shared — a visitor can never
 * produce two leads from one page.
 *
 * Three short steps, easiest first:
 *   1. Type of apartment, 2. budget — one tap each, nothing typed, nothing
 *      sent — then 3. name + phone (+ e-mail), posted to /contact.php with the
 *      two answers. The Meta `Lead` fires once, only after the server answers
 *      200 — and contact.php answers 200 only once Zapier accepted the lead.
 *
 * Then, optionally:
 *   4. The optional questions (project, channel, show-apartment visit) come
 *      after. Their answers go in a second request flagged
 *      `lead_stage: qualification`, with the same contact details so the CRM
 *      can match it, and without a Meta event ID so no second Lead is counted.
 *      Leaving at that point loses nothing: the lead already exists, and any
 *      answer already given is sent with a beacon on the way out.
 *
 * Before any of that, a draft (VALIDATION.partialCapture):
 *   0. As soon as a valid phone number or e-mail has been typed, the fields
 *      filled so far are saved to /lead-draft.php under one `form_session_id`
 *      — on blur, or after a second without typing, and only when something
 *      changed. If the visitor leaves, the team is told; if they submit, the
 *      same ID travels with the lead and contact.php closes the draft. A draft
 *      never reaches Zapier, HubSpot or Meta, and never fires a conversion.
 *
 * Wire contract: same endpoint, form_type, source, leadSource, lead_origin and
 * landing_name as before. See the hand-off notes for the added keys.
 */
export function LeadFormProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('form');
  const [step, setStep] = useState<Step>(1);
  const [propertyType, setPropertyType] = useState('');
  const [budget, setBudget] = useState('');
  const [fullName, setFullNameState] = useState('');
  const [email, setEmailState] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('MA'));
  const [phoneNumber, setPhoneNumberState] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePlacement, setActivePlacement] = useState<Placement>('hero');
  const [qualification, setQualification] = useState<Qualification>(NO_QUALIFICATION);

  const startedAt = useRef(0);
  const started = useRef(false);
  /** Synchronous lock: `submitting` lags a fast double click by one render. */
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  /** One ID per lead, reused across retries — shared by the Pixel and CAPI Lead. */
  const metaLeadEventId = useRef('');
  const visitStarted = useRef(false);
  /** Answers already sent, so the same qualification is never posted twice. */
  const lastQualificationSent = useRef('');
  /** Created at the first meaningful interaction with the form; '' until then. */
  const formSession = useRef('');
  const draft = useRef({ signature: '', syncedAt: 0, timer: 0, graceTimer: 0, captured: false });
  const resync = useRef<() => void>(() => {});
  /** Latest values, for the page-hide beacon (which runs outside React's render). */
  const latest = useRef({ fullName, email, country, phoneNumber, honeypot, qualification, stage, propertyType, budget });
  /** Steps already reported as completed — going back and choosing again does not report them twice. */
  const stepsReported = useRef(new Set<Step>());

  useEffect(() => {
    latest.current = { fullName, email, country, phoneNumber, honeypot, qualification, stage, propertyType, budget };
  });

  useEffect(() => {
    startedAt.current = Date.now();
    captureLandingAttribution();
  }, []);

  const clearError = (key: keyof Errors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  /**
   * Sends the draft if there is one worth sending: a valid phone or e-mail,
   * and something new since the last save (or, with `force`, nothing new but a
   * visitor who is still here). Silent: no state, no UI, errors swallowed.
   */
  const syncDraft = useCallback((how: 'fetch' | 'beacon' = 'fetch', force = false) => {
    window.clearTimeout(draft.current.timer);
    const state = latest.current;
    if (!VALIDATION.partialCapture || state.stage !== 'form' || !formSession.current) return;

    const name = state.fullName.trim().replace(/\s+/g, ' ');
    const localNumber = normalizeLocalNumber(state.phoneNumber, state.country.code);
    const digits = `${state.country.code}${localNumber}`.replace(/\D/g, '');
    const phone = localNumber && digits.length >= 8 && digits.length <= 15 ? `${state.country.code}${localNumber}` : '';
    const mail = EMAIL_RE.test(state.email.trim()) ? state.email.trim() : '';
    // No usable contact method yet: nothing leaves the browser.
    if (!phone && !mail) return;

    const now = Date.now();
    const signature = JSON.stringify([name, phone, mail, state.propertyType, state.budget]);
    const unchanged = signature === draft.current.signature;
    if (unchanged && !force && now - draft.current.syncedAt < DRAFT_TOUCH_MS) return;
    draft.current.signature = signature;
    draft.current.syncedAt = now;

    const attribution = captureLandingAttribution();
    const body = JSON.stringify({
      form_session_id: formSession.current,
      project_name: PROJECT,
      name,
      phone,
      email: mail,
      property_type: state.propertyType,
      budget: state.budget,
      current_step: 'coordonnees',
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      fbclid: attribution.fbclid || '',
      page_url: attribution.landing_page_url || window.location.href.split('#')[0],
      company_website: state.honeypot,
      elapsed_ms: now - startedAt.current,
    });

    try {
      if (how === 'beacon') {
        navigator.sendBeacon(LEAD_DRAFT_ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch(LEAD_DRAFT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body,
      })
        .then((response) => (response.ok && response.status !== 204 ? response.json() : null))
        .then((answer: { captured?: boolean } | null) => {
          if (!answer?.captured || draft.current.captured) return;
          draft.current.captured = true;
          // Once per form session, and never with the phone number or the e-mail.
          let already = false;
          try {
            already = window.sessionStorage.getItem(`${FORM_SESSION_KEY}_captured`) === '1';
            window.sessionStorage.setItem(`${FORM_SESSION_KEY}_captured`, '1');
          } catch {
            /* storage unavailable: once per page load */
          }
          if (!already) trackLandingEvent('partial_lead_captured', { project: PROJECT, has_phone: Boolean(phone), has_email: Boolean(mail) });
          // Still on the form after the grace period: say so once, so the team can be told.
          window.clearTimeout(draft.current.graceTimer);
          draft.current.graceTimer = window.setTimeout(() => resync.current(), DRAFT_GRACE_MS);
        })
        .catch(() => {
          /* a lost draft must never show: the form itself is unaffected */
        });
    } catch {
      /* same */
    }
  }, []);

  // The grace-period resend is scheduled from inside syncDraft itself, hence the indirection.
  useEffect(() => {
    resync.current = () => syncDraft('fetch', true);
  }, [syncDraft]);

  /** Typing: save once the visitor pauses, not on every character. */
  const scheduleDraft = useCallback(() => {
    if (!VALIDATION.partialCapture) return;
    window.clearTimeout(draft.current.timer);
    draft.current.timer = window.setTimeout(() => syncDraft(), DRAFT_DEBOUNCE_MS);
  }, [syncDraft]);

  // Leaving with unsaved input (tab closed, app switched): one beacon on the way out.
  useEffect(() => {
    if (!VALIDATION.partialCapture) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') syncDraft('beacon');
    };
    const onPageHide = () => syncDraft('beacon');
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    // Carries no data: it only lets the server check for abandoned drafts, so
    // their e-mails still leave on days when no cron is set up.
    const ping = window.setTimeout(() => {
      try {
        navigator.sendBeacon(LEAD_DRAFT_ENDPOINT, new Blob([JSON.stringify({ action: 'sweep' })], { type: 'application/json' }));
      } catch {
        /* best effort */
      }
    }, 8000);
    const timers = draft.current;
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      window.clearTimeout(ping);
      window.clearTimeout(timers.timer);
      window.clearTimeout(timers.graceTimer);
    };
  }, [syncDraft]);

  const markStarted = useCallback((from: Placement) => {
    setActivePlacement(from);
    // The form session starts with the first meaningful interaction.
    formSession.current ||= formSessionId();
    if (started.current) return;
    started.current = true;
    trackLandingEvent('form_started', { project: PROJECT, placement: from });
    pixelFormStarted(from);
  }, []);

  /** Question 1 answered: remember it and move on. One tap, nothing sent. */
  const selectPropertyType = useCallback(
    (value: string, from: Placement) => {
      markStarted(from);
      setPropertyType(value);
      trackLandingEvent('property_type_selected', { project: PROJECT, placement: from, property_type: value });
      if (!stepsReported.current.has(1)) {
        stepsReported.current.add(1);
        pixelStepCompleted(1, 'type_de_bien');
      }
      setStep(2);
    },
    [markStarted],
  );

  /** Question 2 answered: on to the contact details. */
  const selectBudget = useCallback(
    (value: string, from: Placement) => {
      markStarted(from);
      setBudget(value);
      trackLandingEvent('budget_selected', { project: PROJECT, placement: from, budget_range: value });
      if (!stepsReported.current.has(2)) {
        stepsReported.current.add(2);
        pixelStepCompleted(2, 'budget');
      }
      setStep(3);
    },
    [markStarted],
  );

  /** Back to an earlier question; the answers given so far are kept. */
  const goToStep = useCallback((target: Step, from: Placement) => {
    setActivePlacement(from);
    trackLandingEvent('form_step_back', { project: PROJECT, placement: from, step: target });
    setStep(target);
  }, []);

  const nextStep = useCallback((from: Placement) => {
    setActivePlacement(from);
    setStep((current) => {
      const answers = latest.current;
      if (current === 1 && answers.propertyType) return 2;
      if (current === 2 && answers.budget) return 3;
      return current;
    });
  }, []);

  /** The request body, built from the latest values. */
  const buildPayload = useCallback((kind: keyof typeof LEAD_STAGE) => {
    const state = latest.current;
    const name = state.fullName.trim().replace(/\s+/g, ' ');
    const localNumber = normalizeLocalNumber(state.phoneNumber, state.country.code);
    const phoneFull = localNumber ? `${state.country.code}${localNumber}` : '';
    const [firstName = '', ...rest] = name.split(' ');
    const attribution = captureLandingAttribution();
    const source = `${window.location.origin}${window.location.pathname}`;
    const answers = state.qualification;
    const visit = visitSummary(answers);
    const isUpdate = kind === 'qualification';
    if (!isUpdate) metaLeadEventId.current ||= createMetaEventId('lead');

    const message = isUpdate
      ? [
          'Complément au dossier Honest Signature 7',
          `Projet : ${answers.intent || 'non précisé'}`,
          `Contact préféré : ${answers.channel || 'non précisé'}`,
          visit ? `Visite d’un appartement témoin souhaitée : ${visit}` : '',
        ]
          .filter(Boolean)
          .join(' — ')
      : [
          'Demande : prix, plans et disponibilités',
          `Type de bien : ${state.propertyType || 'non précisé'}`,
          `Budget : ${state.budget || 'non précisé'}`,
        ].join(' — ');

    return {
      form_type: FORM_TYPE,
      nom_complet: name,
      email: state.email.trim(),
      telephone: phoneFull,
      phoneFull,
      phoneCode: state.country.code,
      phoneCountry: state.country.country,
      phoneCountryCode: state.country.countryCode,
      phoneNumber: localNumber,
      budget: state.budget,
      message,
      jour_visite: isUpdate ? visit : '',
      source: LEAD_CHANNEL,
      company_website: state.honeypot,
      elapsed_ms: Date.now() - startedAt.current,
      projectName: PROJECT,
      propertyType: state.propertyType,
      // The currency of the page and of the `budget` label (see BUDGETS).
      currency: FACTS.currency,
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
      sc_click_id: attribution.sc_click_id || '',
      fbc: attribution.fbc || '',
      fbp: attribution.fbp || '',
      referrer: attribution.referrer || '',
      submissionDate: new Date().toISOString(),
      first_name: firstName,
      last_name: rest.join(' '),
      purchase_intent: isUpdate ? answers.intent : '',
      project: PROJECT,
      lead_origin: LEAD_ORIGIN,
      landing_name: LANDING_NAME,
      landing_page: window.location.href,
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      ...PROJECT_META,
      // Lets contact.php close this form session's draft. Not forwarded to Zapier.
      form_session_id: formSession.current,
      lead_stage: LEAD_STAGE[kind],
      contact_preference: isUpdate ? answers.channel : '',
      visit_preference: isUpdate ? visit : '',
      // Shared with the browser Lead; contact.php sends the CAPI copy. Absent
      // from the qualification request, which must not count as a second Lead.
      ...(isUpdate ? {} : { meta_event_id: metaLeadEventId.current }),
    };
  }, []);

  const submit = useCallback(
    async (from: Placement) => {
      setActivePlacement(from);
      if (inFlight.current || latest.current.stage !== 'form') return;
      markStarted(from);
      setFeedback('');

      const state = latest.current;
      const name = state.fullName.trim().replace(/\s+/g, ' ');
      const localNumber = normalizeLocalNumber(state.phoneNumber, state.country.code);
      const digits = `${state.country.code}${localNumber}`.replace(/\D/g, '');
      const mail = state.email.trim();
      const next: Errors = {};
      if (name.length < 3 || /\d/.test(name)) next.fullName = 'Indiquez votre nom complet.';
      if (!localNumber || digits.length < 8 || digits.length > 15) next.phone = 'Vérifiez votre numéro de téléphone.';
      if (!mail && VALIDATION.emailRequired) next.email = 'Indiquez votre e-mail.';
      else if (mail && !EMAIL_RE.test(mail)) next.email = 'Vérifiez votre adresse e-mail.';
      setErrors(next);
      if (next.fullName || next.phone || next.email) {
        const first = next.fullName ? 'name' : next.phone ? 'phone' : 'email';
        document.getElementById(`hs7-${from}-${first}`)?.focus();
        return;
      }

      // The lead itself is going out: no draft request may start after it.
      window.clearTimeout(draft.current.timer);
      window.clearTimeout(draft.current.graceTimer);
      const payload = buildPayload('lead');
      trackLandingEvent('lead_submit_attempt', { project: PROJECT, placement: from });
      inFlight.current = true;
      setSubmitting(true);
      const fail = (reason: string) => {
        setFeedback(SUBMIT_ERROR);
        trackLandingEvent('lead_submit_error', { project: PROJECT, placement: from, reason });
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

        // A filled honeypot is silently "accepted" by the server without
        // creating a lead: no conversion, and no qualification questions.
        if (state.honeypot) {
          setStage('done');
          return;
        }
        // Conversion only after contact.php confirms — never on a click.
        if (!leadTracked.current) {
          leadTracked.current = true;
          // Meta `Lead` and Snapchat `SIGN_UP`, each to its own platform, once.
          pixelLead({ eventId: metaLeadEventId.current, utmCampaign: captureLandingAttribution().utm_campaign || '' });
          pixelStepCompleted(3, 'coordonnees');
          trackLandingEvent('lead_submit_success', { project: PROJECT, placement: from, property_type: state.propertyType, budget_range: state.budget });
        }
        // This form session is closed (its ID stays in memory for the
        // qualification request). A later visit to the form starts a new one.
        try {
          window.sessionStorage.removeItem(FORM_SESSION_KEY);
          window.sessionStorage.removeItem(`${FORM_SESSION_KEY}_captured`);
        } catch {
          /* storage unavailable */
        }
        memoryFormSession = '';
        setStage('qualify');
      } catch {
        fail('network');
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [buildPayload, markStarted],
  );

  /** Answers worth sending, as a stable string — empty when nothing was answered. */
  const qualificationSignature = () => {
    const answers = latest.current.qualification;
    const visit = visitSummary(answers);
    return answers.intent || answers.channel || visit ? [answers.intent, answers.channel, visit].join('|') : '';
  };

  const saveQualification = useCallback(
    async (from: Placement) => {
      setActivePlacement(from);
      if (inFlight.current || latest.current.stage !== 'qualify') return;
      const signature = qualificationSignature();
      // Nothing answered, or already sent on the way out: the lead exists anyway.
      if (!signature || signature === lastQualificationSent.current) {
        setStage('done');
        return;
      }
      const answers = latest.current.qualification;
      inFlight.current = true;
      setSaving(true);
      try {
        lastQualificationSent.current = signature;
        const response = await fetch(ENDPOINTS.contact, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(buildPayload('qualification')),
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        trackLandingEvent('post_lead_qualification_saved', {
          project: PROJECT,
          placement: from,
          purchase_intent: answers.intent,
          contact_channel: answers.channel,
          visit_requested: Boolean(visitSummary(answers)),
        });
      } catch {
        // The lead is already in the CRM; a lost preference must not read as a failure.
        lastQualificationSent.current = '';
      } finally {
        inFlight.current = false;
        setSaving(false);
        setStage('done');
      }
    },
    [buildPayload],
  );

  // Leaving mid-qualification: send what was answered. Fires on tab close and
  // on switching app (a visitor opening WhatsApp), which is why a later change
  // of answers may still be sent again by saveQualification.
  useEffect(() => {
    if (stage !== 'qualify') return;
    const flush = () => {
      if (latest.current.stage !== 'qualify' || inFlight.current) return;
      const signature = qualificationSignature();
      if (!signature || signature === lastQualificationSent.current) return;
      try {
        const body = new Blob([JSON.stringify(buildPayload('qualification'))], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINTS.contact, body)) lastQualificationSent.current = signature;
      } catch {
        /* best effort: the lead itself is already saved */
      }
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [buildPayload, stage]);

  const selectIntent = useCallback((value: string, from: Placement) => {
    setActivePlacement(from);
    setQualification((prev) => ({ ...prev, intent: value }));
    trackLandingEvent('post_lead_intent_selected', { project: PROJECT, placement: from, purchase_intent: value });
  }, []);

  const selectChannel = useCallback((value: string, from: Placement) => {
    setActivePlacement(from);
    setQualification((prev) => ({ ...prev, channel: value }));
    trackLandingEvent('contact_channel_selected', { project: PROJECT, placement: from, contact_channel: value });
  }, []);

  const openVisit = useCallback((from: Placement) => {
    setActivePlacement(from);
    setQualification((prev) => ({ ...prev, visitOpen: true }));
    if (visitStarted.current) return;
    visitStarted.current = true;
    trackLandingEvent('visit_booking_started', { project: PROJECT, placement: from });
  }, []);

  const value = useMemo<LeadFormContext>(
    () => ({
      ...qualification,
      stage,
      step,
      propertyType,
      budget,
      selectPropertyType,
      selectBudget,
      goToStep,
      nextStep,
      fullName,
      email,
      country,
      phoneNumber,
      honeypot,
      errors,
      feedback,
      submitting,
      saving,
      activePlacement,
      setFullName: (next) => {
        setFullNameState(next);
        clearError('fullName');
        scheduleDraft();
      },
      setEmail: (next) => {
        setEmailState(next);
        clearError('email');
        scheduleDraft();
      },
      setCountry: (next) => {
        setCountry(next);
        scheduleDraft();
      },
      setPhoneNumber: (next) => {
        setPhoneNumberState(next);
        clearError('phone');
        scheduleDraft();
      },
      setHoneypot,
      markStarted,
      submit,
      flushDraft: syncDraft,
      selectIntent,
      selectChannel,
      openVisit,
      setVisitDay: (next) => setQualification((prev) => ({ ...prev, visitDay: next })),
      setVisitMoment: (next) => setQualification((prev) => ({ ...prev, visitMoment: next })),
      saveQualification,
    }),
    [
      qualification,
      stage,
      step,
      propertyType,
      budget,
      selectPropertyType,
      selectBudget,
      goToStep,
      nextStep,
      fullName,
      email,
      country,
      phoneNumber,
      honeypot,
      errors,
      feedback,
      submitting,
      saving,
      activePlacement,
      markStarted,
      submit,
      syncDraft,
      scheduleDraft,
      selectIntent,
      selectChannel,
      openVisit,
      saveQualification,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
