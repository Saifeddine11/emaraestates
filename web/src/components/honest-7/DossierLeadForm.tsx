'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import { BUDGETS, FORM_TYPE, LANDING_NAME, LEAD_CHANNEL, LEAD_ORIGIN, LEAD_SOURCE, PURPOSES } from '@/lib/content/honest-signature-7';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { track } from '@/lib/gueliz-attribution';
import { trackLandingEvent } from '@/lib/landing-events';
import { createMetaEventId } from '@/lib/meta-event-id';
import { OG_TRACKING } from '@/lib/content/offre-gueliz';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import { captureLandingAttribution } from '@/lib/landing-attribution';
import { ENDPOINTS } from '@/lib/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PROJECT = 'Honest Signature 7';
const EASE = [0.22, 1, 0.36, 1] as const;
const CONSENT = 'En envoyant ce formulaire, vous acceptez d\u2019\u00EAtre contact\u00E9 par un conseiller Emara Estates au sujet de ce projet.';
const SUBMIT_ERROR = 'Une erreur est survenue. Veuillez r\u00E9essayer.';
const ABANDON_DELAY_MS = 10 * 60 * 1000; // 10 minutes

const BENEFITS = [
  'Brochure du projet',
  'Plans & surfaces',
  'Prix & disponibilit\u00E9s',
  'Plan de paiement',
  'Analyse du potentiel locatif',
  'Informations sur le quartier',
] as const;

type Stage = 'form' | 'qualify' | 'done';

export function DossierLeadForm({ placement, id, title = 'Recevez le dossier complet du projet' }: {
  placement: 'hero' | 'final'; id: string; title?: string;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('MA'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [budget, setBudget] = useState('');
  const [purpose, setPurpose] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const startedAt = useRef(0);
  const formStarted = useRef(false);
  const inFlight = useRef(false);
  const leadSent = useRef(false);
  const leadTracked = useRef(false);
  const metaLeadEventId = useRef('');
  const buyerLeadSnapFired = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityHandler = useRef<(() => void) | null>(null);
  const beaconHandler = useRef<typeof sendBeaconFallback | null>(null);
  const reduce = useReducedMotion();
  const prefix = `hs7-${placement}`;

  useEffect(() => {
    startedAt.current = Date.now();
    captureLandingAttribution();
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      trackLandingEvent('form_view', { project: PROJECT, placement });
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [placement]);

  function markStarted() {
    if (formStarted.current) return;
    formStarted.current = true;
    trackLandingEvent('form_started', { project: PROJECT, placement });
    track(OG_TRACKING.events.start, { project: PROJECT, lead_source: LEAD_SOURCE, placement });
  }

  function buildPayload(budgetVal: string, intentVal: string) {
    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const names = cleanName.split(' ');
    const firstName = names.shift() || '';
    const lastName = names.join(' ');
    const attribution = captureLandingAttribution();
    const source = `${window.location.origin}${window.location.pathname}`;
    metaLeadEventId.current ||= createMetaEventId('lead');
    return {
      form_type: FORM_TYPE, nom_complet: cleanName, email: email.trim(), telephone: phoneFull,
      phoneFull, phoneCode: country.code, phoneCountry: country.country, phoneCountryCode: country.countryCode, phoneNumber: localNumber,
      budget: budgetVal, message: budgetVal
        ? `Demande : dossier complet du projet. Budget : ${budgetVal}. Projet : ${intentVal || '\u2014'}.`
        : 'Demande : brochure, plans, prix, disponibilit\u00E9s et potentiel locatif du projet.',
      jour_visite: '', source: LEAD_CHANNEL, company_website: honeypot, elapsed_ms: Date.now() - startedAt.current,
      projectName: PROJECT, currency: 'MAD', leadSource: LEAD_SOURCE,
      project_name: PROJECT, project_location: 'Gueliz', lead_source: 'dedicated_ads_landing',
      adPlatform: attribution.ad_platform || '', campaign: attribution.utm_campaign || attribution.campaign_id || '',
      adset: attribution.adset_id || '', ad: attribution.ad_id || '', landingPageUrl: attribution.landing_page_url || source,
      utmSource: attribution.utm_source || '', utmMedium: attribution.utm_medium || '', utmCampaign: attribution.utm_campaign || '',
      utmContent: attribution.utm_content || '', utmTerm: attribution.utm_term || '', campaignId: attribution.campaign_id || '',
      adsetId: attribution.adset_id || '', adId: attribution.ad_id || '', fbclid: attribution.fbclid || '',
      fbc: attribution.fbc || '', fbp: attribution.fbp || '', referrer: attribution.referrer || '', submissionDate: new Date().toISOString(),
      first_name: firstName, last_name: lastName, purchase_intent: intentVal, project: PROJECT, lead_origin: LEAD_ORIGIN,
      landing_name: LANDING_NAME, landing_page: window.location.href,
      utm_source: attribution.utm_source || '', utm_medium: attribution.utm_medium || '', utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '', utm_term: attribution.utm_term || '', meta_event_id: metaLeadEventId.current,
    };
  }

  /** Send lead via fetch (normal flow). */
  async function sendLead(payload: Record<string, unknown>) {
    if (leadSent.current) return;
    leadSent.current = true;
    const response = await fetch(ENDPOINTS.contact, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin', body: JSON.stringify(payload),
    });
    const text = await response.text();
    let data: { message?: string; errors?: Record<string, string> } = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* ignore */ }
    if (!response.ok || typeof data.message !== 'string') {
      leadSent.current = false;
      if (data.errors) setErrors(data.errors);
      throw new Error(`status_${response.status}`);
    }
  }

  /** Fire conversion tracking (once). */
  function fireTracking() {
    if (leadTracked.current || honeypot) return;
    leadTracked.current = true;
    trackLandingEvent('lead_submit_success', { project: PROJECT, placement });
    const attribution = captureLandingAttribution();
    track(OG_TRACKING.events.lead, { lead_source: LEAD_SOURCE, project: PROJECT, utm_campaign: attribution.utm_campaign || '' }, { metaEventId: metaLeadEventId.current });
    fireSnapEvent(SNAP_EVENT_BUYER_LEAD, buyerLeadSnapFired);
  }

  /** Send contact-only data via sendBeacon (for tab close / page hide). */
  const sendBeaconFallback = useCallback(() => {
    if (leadSent.current) return;
    leadSent.current = true;
    try {
      const payload = buildPayload('', '');
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINTS.contact, blob);
    } catch { /* must never break */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, email, phoneNumber, country, honeypot]);

  function clearAbandonSafety() {
    if (abandonTimer.current) { clearTimeout(abandonTimer.current); abandonTimer.current = null; }
    if (beaconHandler.current) { window.removeEventListener('beforeunload', beaconHandler.current); beaconHandler.current = null; }
    if (visibilityHandler.current) { document.removeEventListener('visibilitychange', visibilityHandler.current); visibilityHandler.current = null; }
  }

  function startAbandonSafety() {
    // 10-min auto-send if they idle on step 2
    abandonTimer.current = setTimeout(() => {
      if (leadSent.current) return;
      const payload = buildPayload('', '');
      sendLead(payload).then(fireTracking).catch(() => {});
      setStage('done');
      clearAbandonSafety();
    }, ABANDON_DELAY_MS);
    // Store exact references so removeEventListener matches the added listener
    beaconHandler.current = sendBeaconFallback;
    visibilityHandler.current = () => {
      if (document.visibilityState === 'hidden' && !leadSent.current) sendBeaconFallback();
    };
    window.addEventListener('beforeunload', beaconHandler.current);
    document.addEventListener('visibilitychange', visibilityHandler.current);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => clearAbandonSafety();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitStep1(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting || stage !== 'form') return;
    markStarted();
    setFeedback('');

    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
    const digits = phoneFull.replace(/\D/g, '');
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) next.full_name = 'Indiquez votre nom complet.';
    if (digits.length < 8 || digits.length > 15) next.telephone = 'Indiquez un num\u00E9ro de t\u00E9l\u00E9phone valide.';
    if (!email.trim()) next.email = 'Indiquez votre adresse email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse email valide.';
    setErrors(next);
    if (Object.keys(next).length) {
      const firstId = next.full_name ? `${prefix}-name` : next.telephone ? `${prefix}-phone` : `${prefix}-email`;
      document.getElementById(firstId)?.focus();
      return;
    }

    trackLandingEvent('lead_submit_attempt', { project: PROJECT, placement });
    setStage('qualify');
    startAbandonSafety();
  }

  async function submitStep2(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting) return;
    setFeedback('');

    const next: Record<string, string> = {};
    if (!budget) next.budget = 'Choisissez votre budget.';
    if (!purpose) next.purpose = 'Choisissez votre projet.';
    setErrors(next);
    if (Object.keys(next).length) return;

    clearAbandonSafety();
    const intentLabel = PURPOSES.find((p) => p.intent === purpose)?.label || purpose;
    const payload = buildPayload(budget, purpose);
    payload.message = `Demande : dossier complet du projet. Budget : ${budget}. Projet : ${intentLabel}.`;
    inFlight.current = true;
    setSubmitting(true);
    trackLandingEvent('qualify_submit', { project: PROJECT, placement, budget, purchase_intent: purpose });
    try {
      await sendLead(payload);
      fireTracking();
      setStage('done');
    } catch {
      setFeedback(SUBMIT_ERROR);
    } finally {
      inFlight.current = false; setSubmitting(false);
    }
  }

  async function handleSkip() {
    clearAbandonSafety();
    const payload = buildPayload('', '');
    inFlight.current = true;
    try {
      await sendLead(payload);
      fireTracking();
    } catch { /* still show done */ }
    inFlight.current = false;
    setStage('done');
  }

  return (
    <section ref={sectionRef} id={id} aria-labelledby={`${prefix}-title`} className="scroll-mt-20 rounded-[24px] bg-shell p-5 text-forest shadow-[0_30px_90px_-35px_rgba(8,16,9,.58)] sm:p-7 lg:p-8">
      {stage === 'done' ? (
        <motion.div role="status" aria-live="polite" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.55, ease: EASE }} className="py-8 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-forest text-cream"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6"><path d="m5 12 4 4L19 6" /></svg></span>
          <h2 id={`${prefix}-title`} className="mt-5 font-sans text-[28px] font-medium tracking-[-.03em]">Votre demande a bien {'\u00E9'}t{'\u00E9'} envoy{'\u00E9'}e.</h2>
          <p className="mx-auto mt-3 max-w-[460px] text-[16px] leading-[1.6] text-forest/70">Un conseiller vous transmettra la brochure, les plans, les prix et les disponibilit{'\u00E9'}s.</p>
        </motion.div>
      ) : stage === 'qualify' ? (
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}>
          <p className="text-[11px] font-medium uppercase tracking-[.2em] text-olive">Encore 2 questions</p>
          <h2 id={`${prefix}-title`} className="mt-2 font-sans text-[clamp(22px,3vw,30px)] font-medium uppercase leading-[1.08] tracking-[-.035em]">Personnalisez votre dossier</h2>
          <p className="mt-3 text-[14px] leading-[1.55] text-forest/65">Pour vous envoyer les informations les plus pertinentes.</p>
          <form onSubmit={submitStep2} noValidate className="mt-6 grid gap-5">
            <fieldset aria-describedby={errors.budget ? `${prefix}-budget-error` : undefined}>
              <legend className={fieldLabel}>Votre budget</legend>
              <div className="grid grid-cols-2 gap-2">
                {BUDGETS.map((option, index) => {
                  const checked = budget === option;
                  return (
                    <label key={option} className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-center text-[13px] leading-tight transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bronze sm:text-[14px]', checked ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream/35 hover:border-forest/40')}>
                      <input id={`${prefix}-budget-${index}`} type="radio" name={`${prefix}-budget`} value={option} checked={checked} onChange={() => { setBudget(option); setErrors((old) => ({ ...old, budget: '' })); trackLandingEvent('budget_selected', { project: PROJECT, placement, budget: option }); }} className="sr-only" />
                      {option}
                    </label>
                  );
                })}
              </div>
              <FieldError id={`${prefix}-budget-error`} message={errors.budget} />
            </fieldset>
            <fieldset aria-describedby={errors.purpose ? `${prefix}-purpose-error` : undefined}>
              <legend className={fieldLabel}>Votre projet</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PURPOSES.map((option) => {
                  const checked = purpose === option.intent;
                  return (
                    <label key={option.intent} className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-center text-[13px] leading-tight transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bronze sm:text-[14px]', checked ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream/35 hover:border-forest/40')}>
                      <input type="radio" name={`${prefix}-purpose`} value={option.intent} checked={checked} onChange={() => { setPurpose(option.intent); setErrors((old) => ({ ...old, purpose: '' })); }} className="sr-only" />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              <FieldError id={`${prefix}-purpose-error`} message={errors.purpose} />
            </fieldset>
            <button type="submit" disabled={submitting} aria-busy={submitting} className="min-h-14 w-full cursor-pointer rounded-full bg-forest px-5 py-4 text-[14px] font-semibold uppercase tracking-[.06em] text-cream transition-[transform,background-color] duration-300 ease-step hover:-translate-y-0.5 hover:bg-[#243024] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Envoi en cours\u2026' : <>Envoyer <span aria-hidden="true">{'\u2192'}</span></>}
            </button>
            <button type="button" onClick={handleSkip} className="text-center text-[13px] text-forest/55 underline underline-offset-2 hover:text-forest/80">Passer cette {'\u00E9'}tape</button>
            <p role="alert" aria-live="assertive" className="text-[14px] text-[#8c4a32] empty:hidden">{feedback}</p>
          </form>
        </motion.div>
      ) : (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[.2em] text-olive">Honest Signature 7 <span className="mx-1.5 text-forest/25">{'\u00B7'}</span> Gu{'\u00E9'}liz hyper-centre</p>
          <h2 id={`${prefix}-title`} className="mt-2 font-sans text-[clamp(24px,3vw,34px)] font-medium uppercase leading-[1.06] tracking-[-.035em]">{title}</h2>
          <p className="mt-3 text-[14px] leading-[1.55] text-forest/65">Recevez la brochure, les plans, les prix, les disponibilit{'\u00E9'}s et les informations utiles pour {'\u00E9'}valuer le potentiel locatif du projet.</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-[1.4] text-forest/75">
                <span aria-hidden="true" className="mt-0.5 text-bronze">{'\u2713'}</span>
                {item}
              </li>
            ))}
          </ul>
          <form onSubmit={submitStep1} onFocusCapture={markStarted} noValidate className="mt-6 grid gap-4">
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} className="absolute -left-[9999px] size-px overflow-hidden" />
            <TextField id={`${prefix}-name`} name="nom_complet" label="Nom complet" autoComplete="name" value={fullName} onChange={(value) => { markStarted(); setFullName(value); setErrors((old) => ({ ...old, full_name: '' })); }} error={errors.full_name || errors.nom_complet} />
            <div>
              <label htmlFor={`${prefix}-phone`} className={fieldLabel}>T{'\u00E9'}l{'\u00E9'}phone / WhatsApp</label>
              <PhoneCountryInput country={country} onCountryChange={setCountry} number={phoneNumber} onNumberChange={(value) => { markStarted(); setPhoneNumber(value); setErrors((old) => ({ ...old, telephone: '' })); }} invalid={Boolean(errors.telephone)} describedBy={errors.telephone ? `${prefix}-phone-error` : undefined} selectId={`${prefix}-phone-code`} inputId={`${prefix}-phone`} numberLabel="T\u00E9l\u00E9phone / WhatsApp" placeholder="6 12 34 56 78" />
              <FieldError id={`${prefix}-phone-error`} message={errors.telephone} />
            </div>
            <TextField id={`${prefix}-email`} name="email" type="email" label="E-mail" autoComplete="email" value={email} onChange={(value) => { markStarted(); setEmail(value); setErrors((old) => ({ ...old, email: '' })); }} error={errors.email} placeholder="vous@exemple.com" />
            <p className="text-[12.5px] leading-[1.5] text-forest/70">{CONSENT}</p>
            <button type="submit" disabled={submitting} aria-busy={submitting} className="min-h-14 w-full cursor-pointer rounded-full bg-forest px-5 py-4 text-[14px] font-semibold uppercase tracking-[.06em] text-cream transition-[transform,background-color] duration-300 ease-step hover:-translate-y-0.5 hover:bg-[#243024] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Envoi en cours\u2026' : <>Recevoir le dossier complet <span aria-hidden="true">{'\u2192'}</span></>}
            </button>
            <p className="text-center text-[12.5px] text-forest/70">Brochure {'\u2022'} Prix {'\u2022'} Plans {'\u2022'} Potentiel locatif {'\u2022'} Disponibilit{'\u00E9'}s</p>
            <p role="alert" aria-live="assertive" className="text-[14px] text-[#8c4a32] empty:hidden">{feedback}</p>
          </form>
        </>
      )}
    </section>
  );
}

function TextField({ id, name, label, value, onChange, error, type = 'text', autoComplete, placeholder }: { id: string; name: string; label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; autoComplete?: string; placeholder?: string; }) {
  return <div><label htmlFor={id} className={fieldLabel}>{label}</label><input id={id} name={name} type={type} maxLength={type === 'email' ? 120 : 80} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={cn(fieldInput, error && 'border-[#8c4a32]/60')} /><FieldError id={`${id}-error`} message={error} /></div>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1.5 text-[13px] text-[#8c4a32]">{message}</p> : null;
}
