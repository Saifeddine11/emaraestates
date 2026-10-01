'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import { BUDGETS, FORM_TYPE, LANDING_NAME, LEAD_CHANNEL, LEAD_ORIGIN, LEAD_SOURCE } from '@/lib/content/honest-signature-7';
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
const CONSENT = 'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates au sujet de ce projet.';
const SUBMIT_ERROR = 'Une erreur est survenue. Veuillez réessayer.';

export function DossierLeadForm({ placement, id, title = 'Recevez les prix & disponibilités' }: {
  placement: 'hero' | 'final'; id: string; title?: string;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry('MA'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [budget, setBudget] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const startedAt = useRef(0);
  const formStarted = useRef(false);
  const inFlight = useRef(false);
  const leadTracked = useRef(false);
  const metaLeadEventId = useRef('');
  const buyerLeadSnapFired = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
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

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting || succeeded) return;
    markStarted();
    setFeedback('');

    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
    const digits = phoneFull.replace(/\D/g, '');
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) next.full_name = 'Indiquez votre nom complet.';
    if (digits.length < 8 || digits.length > 15) next.telephone = 'Indiquez un numéro de téléphone valide.';
    if (!email.trim()) next.email = 'Indiquez votre adresse email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse email valide.';
    if (!budget) next.budget = 'Choisissez votre budget.';
    setErrors(next);
    if (Object.keys(next).length) {
      const firstId = next.full_name ? `${prefix}-name` : next.telephone ? `${prefix}-phone` : next.email ? `${prefix}-email` : `${prefix}-budget-0`;
      document.getElementById(firstId)?.focus();
      return;
    }

    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const names = cleanName.split(' ');
    const firstName = names.shift() || '';
    const lastName = names.join(' ');
    const attribution = captureLandingAttribution();
    const source = `${window.location.origin}${window.location.pathname}`;
    metaLeadEventId.current ||= createMetaEventId('lead');
    const payload = {
      form_type: FORM_TYPE, nom_complet: cleanName, email: email.trim(), telephone: phoneFull,
      phoneFull, phoneCode: country.code, phoneCountry: country.country, phoneCountryCode: country.countryCode, phoneNumber: localNumber,
      budget, message: `Demande : plans, prix, surfaces, étages et disponibilités — Budget : ${budget}`,
      jour_visite: '', source: LEAD_CHANNEL, company_website: honeypot, elapsed_ms: Date.now() - startedAt.current,
      projectName: PROJECT, currency: 'MAD', leadSource: LEAD_SOURCE,
      adPlatform: attribution.ad_platform || '', campaign: attribution.utm_campaign || attribution.campaign_id || '',
      adset: attribution.adset_id || '', ad: attribution.ad_id || '', landingPageUrl: attribution.landing_page_url || source,
      utmSource: attribution.utm_source || '', utmMedium: attribution.utm_medium || '', utmCampaign: attribution.utm_campaign || '',
      utmContent: attribution.utm_content || '', utmTerm: attribution.utm_term || '', campaignId: attribution.campaign_id || '',
      adsetId: attribution.adset_id || '', adId: attribution.ad_id || '', fbclid: attribution.fbclid || '',
      fbc: attribution.fbc || '', fbp: attribution.fbp || '', referrer: attribution.referrer || '', submissionDate: new Date().toISOString(),
      first_name: firstName, last_name: lastName, purchase_intent: '', project: PROJECT, lead_origin: LEAD_ORIGIN,
      landing_name: LANDING_NAME, landing_page: window.location.href,
      utm_source: attribution.utm_source || '', utm_medium: attribution.utm_medium || '', utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '', utm_term: attribution.utm_term || '', meta_event_id: metaLeadEventId.current,
    };

    inFlight.current = true;
    setSubmitting(true);
    trackLandingEvent('lead_submit_attempt', { project: PROJECT, placement, budget });
    try {
      const response = await fetch(ENDPOINTS.contact, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin', body: JSON.stringify(payload),
      });
      const text = await response.text();
      let data: { message?: string; errors?: Record<string, string> } = {};
      try { data = text ? JSON.parse(text) : {}; } catch {
        trackLandingEvent('lead_submit_error', { project: PROJECT, placement, reason: 'invalid_response' });
        setFeedback(SUBMIT_ERROR); return;
      }
      if (!response.ok || typeof data.message !== 'string') {
        if (data.errors) setErrors(data.errors);
        trackLandingEvent('lead_submit_error', { project: PROJECT, placement, status: response.status });
        setFeedback(SUBMIT_ERROR); return;
      }
      if (!leadTracked.current && !honeypot) {
        leadTracked.current = true;
        trackLandingEvent('lead_submit_success', { project: PROJECT, placement, budget });
        track(OG_TRACKING.events.lead, { lead_source: LEAD_SOURCE, project: PROJECT, budget_range: budget, utm_campaign: attribution.utm_campaign || '' }, { metaEventId: metaLeadEventId.current });
        fireSnapEvent(SNAP_EVENT_BUYER_LEAD, buyerLeadSnapFired);
      }
      setSucceeded(true);
    } catch {
      trackLandingEvent('lead_submit_error', { project: PROJECT, placement, reason: 'network' });
      setFeedback(SUBMIT_ERROR);
    } finally {
      inFlight.current = false; setSubmitting(false);
    }
  }

  return (
    <section ref={sectionRef} id={id} aria-labelledby={`${prefix}-title`} className="scroll-mt-20 rounded-[24px] bg-shell p-5 text-forest shadow-[0_30px_90px_-35px_rgba(8,16,9,.58)] sm:p-7 lg:p-8">
      {succeeded ? (
        <motion.div role="status" aria-live="polite" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.55, ease: EASE }} className="py-8 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-forest text-cream"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6"><path d="m5 12 4 4L19 6" /></svg></span>
          <h2 id={`${prefix}-title`} className="mt-5 font-sans text-[28px] font-medium tracking-[-.03em]">Votre demande a bien été envoyée.</h2>
          <p className="mx-auto mt-3 max-w-[460px] text-[16px] leading-[1.6] text-forest/70">Un conseiller vous transmettra les plans, prix et disponibilités.</p>
        </motion.div>
      ) : (
        <>
          <p className="text-[12px] font-medium uppercase tracking-[.2em] text-olive">Dossier gratuit · Sans engagement</p>
          <h2 id={`${prefix}-title`} className="mt-2 font-sans text-[clamp(27px,3vw,38px)] font-medium uppercase leading-[1.02] tracking-[-.035em]">{title}</h2>
          <p className="mt-3 text-[14px] text-forest/65">Plans • Prix • Surfaces • Disponibilités</p>
          <form onSubmit={submitRequest} onFocusCapture={markStarted} noValidate className="mt-6 grid gap-4">
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} className="absolute -left-[9999px] size-px overflow-hidden" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id={`${prefix}-name`} name="nom_complet" label="Nom complet" autoComplete="name" value={fullName} onChange={(value) => { markStarted(); setFullName(value); setErrors((old) => ({ ...old, full_name: '' })); }} error={errors.full_name || errors.nom_complet} />
              <TextField id={`${prefix}-email`} name="email" type="email" label="E-mail" autoComplete="email" value={email} onChange={(value) => { markStarted(); setEmail(value); setErrors((old) => ({ ...old, email: '' })); }} error={errors.email} placeholder="vous@exemple.com" />
            </div>
            <div>
              <label htmlFor={`${prefix}-phone`} className={fieldLabel}>Téléphone / WhatsApp</label>
              <PhoneCountryInput country={country} onCountryChange={setCountry} number={phoneNumber} onNumberChange={(value) => { markStarted(); setPhoneNumber(value); setErrors((old) => ({ ...old, telephone: '' })); }} invalid={Boolean(errors.telephone)} describedBy={errors.telephone ? `${prefix}-phone-error` : undefined} selectId={`${prefix}-phone-code`} inputId={`${prefix}-phone`} numberLabel="Téléphone / WhatsApp" placeholder="6 12 34 56 78" />
              <FieldError id={`${prefix}-phone-error`} message={errors.telephone} />
            </div>
            <fieldset aria-describedby={errors.budget ? `${prefix}-budget-error` : undefined}>
              <legend className={fieldLabel}>Votre budget</legend>
              <div className="grid grid-cols-2 gap-2">
                {BUDGETS.map((option, index) => {
                  const checked = budget === option;
                  return (
                    <label key={option} className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-center text-[13px] leading-tight transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bronze sm:text-[14px]', checked ? 'border-forest bg-forest text-cream' : 'border-forest/15 bg-cream/35 hover:border-forest/40')}>
                      <input id={`${prefix}-budget-${index}`} type="radio" name={`${prefix}-budget`} value={option} checked={checked} onChange={() => { markStarted(); setBudget(option); setErrors((old) => ({ ...old, budget: '' })); trackLandingEvent('budget_selected', { project: PROJECT, placement, budget: option }); }} className="sr-only" />
                      {option}
                    </label>
                  );
                })}
              </div>
              <FieldError id={`${prefix}-budget-error`} message={errors.budget} />
            </fieldset>
            <p className="text-[12.5px] leading-[1.5] text-forest/70">{CONSENT}</p>
            <button type="submit" disabled={submitting} aria-busy={submitting} className="min-h-14 w-full cursor-pointer rounded-full bg-forest px-5 py-4 text-[14px] font-semibold uppercase tracking-[.06em] text-cream transition-[transform,background-color] duration-300 ease-step hover:-translate-y-0.5 hover:bg-[#243024] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Envoi en cours…' : <>Recevoir les disponibilités <span aria-hidden="true">→</span></>}
            </button>
            <p className="text-center text-[12.5px] text-forest/70">Plans • Prix • Surfaces • Étages • Disponibilités</p>
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
