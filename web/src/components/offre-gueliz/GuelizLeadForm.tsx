'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { COUNTRIES, type Country } from '@/lib/countries';
import { captureAttribution, readAttribution, track } from '@/lib/gueliz-attribution';
import { fireSnapEvent, SNAP_EVENT_BUYER_LEAD } from '@/lib/snap-pixel';
import {
  OG_FORM,
  OG_SUCCESS_WHATSAPP,
  OG_TRACKING,
  type OgStepKey,
} from '@/lib/content/offre-gueliz';
import { cn } from '@/lib/cn';

/**
 * The Guéliz ads lead funnel — port of the form half of `js/offre-gueliz.js`.
 *
 * This is a **different funnel from `/contact`** and shares no code with it.
 * `lead-gueliz.php` maps these exact payload keys onto HubSpot internal
 * property names, so renaming one key silently drops one CRM property while the
 * request still returns 200. Every `name`, `id`, `data-*` hook and payload key
 * below is therefore reproduced verbatim from the legacy DOM.
 *
 * `npm run form-parity` diffs this component's real request against the legacy
 * page's real request, field by field. Change nothing here without re-running it.
 *
 * See ROUTE-CHECKLIST-offre-gueliz.md §6 for the full contract.
 */

const STEPS = OG_FORM.steps;
const TOTAL = STEPS.length;
const L = OG_FORM.labels;

const FRANCE = COUNTRIES.find((c) => c.countryCode === 'FR') ?? COUNTRIES[0];

function digits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

/** Module scope so the clock read stays out of the component's render path. */
function nowMs() {
  return Date.now();
}

export function GuelizLeadForm() {
  const [current, setCurrent] = useState(0);
  const [values, setValues] = useState<Partial<Record<OgStepKey, string>>>({});
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<Country>(FRANCE);
  const [number, setNumber] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; telephone?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  /**
   * The legacy page ships an empty `<div data-steps>` and builds every step in
   * `DOMContentLoaded`. That is reproduced rather than improved on: prerendering
   * the steps would put copy and three `h3`s into the static file that the
   * legacy export does not have, and this migration preserves before it
   * improves. Prerendering is a deliberate later call, not a silent one.
   *
   * `useSyncExternalStore` gives `false` during the static render and `true`
   * after hydration, with no subscription and no state write in an effect.
   */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const startedRef = useRef(false);
  const startedAtRef = useRef(0);
  const questionRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  /** One confirmed Guéliz lead = one Snap BuyerLead (blocks double-submit). */
  const buyerLeadSnapFired = useRef(false);

  // Attribution is captured once on mount, exactly like the legacy IIFE.
  useEffect(() => {
    captureAttribution();
    startedAtRef.current = nowMs();
  }, []);

  const phoneFull = `${country.code}${digits(number)}`;
  const fieldsRevealed = Boolean(values[STEPS[TOTAL - 1].key]);

  const selectOption = (key: OgStepKey, option: string, index: number) => {
    setValues((prev) => ({ ...prev, [key]: option }));
    if (!startedRef.current) {
      startedRef.current = true;
      startedAtRef.current = nowMs();
      track(OG_TRACKING.events.start, {
        landing_page_url: readAttribution().landing_page_url,
      });
    }
    void index;
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= TOTAL) return;
    setCurrent(index);
    setFormError('');
    // Focus the question, as the legacy `goTo` does for keyboard users.
    window.requestAnimationFrame(() => questionRefs.current[index]?.focus({ preventScroll: true }));
  };

  const validName = (value: string) => value.trim().length >= 2;
  const validPhone = (full: string) => digits(full).length >= 8 && digits(full).length <= 15;

  /**
   * Builds the 25-key request body.
   *
   * Key names, order and fallbacks mirror `buildPayload()` in the legacy
   * script. `phone` is the full international number, not the national one, and
   * `phoneNumber`/`phoneCode` are inputs but deliberately not payload keys.
   */
  const buildPayload = () => {
    const a = readAttribution();
    return {
      fullName: fullName.trim(),
      phone: phoneFull,
      phoneCountry: country.label,
      phoneCountryCode: country.countryCode,
      projectType: values[STEPS[0].key] || '',
      apartmentType: values[STEPS[1].key] || '',
      timeframe: values[STEPS[2].key] || '',
      leadSource: OG_FORM.leadSource,
      adPlatform: a.ad_platform || '',
      campaign: a.utm_campaign || a.campaign_id || '',
      adset: a.adset_id || '',
      ad: a.ad_id || '',
      landingPageUrl: a.landing_page_url || window.location.href,
      utmSource: a.utm_source || '',
      utmMedium: a.utm_medium || '',
      utmCampaign: a.utm_campaign || '',
      utmContent: a.utm_content || '',
      utmTerm: a.utm_term || '',
      campaignId: a.campaign_id || '',
      adsetId: a.adset_id || '',
      adId: a.ad_id || '',
      referrer: a.referrer || '',
      submissionDate: new Date(nowMs()).toISOString(),
      company_website: honeypot,
      elapsed_ms: nowMs() - startedAtRef.current,
    };
  };

  const showSuccess = (payload: ReturnType<typeof buildPayload>) => {
    setSucceeded(true);
    track(OG_TRACKING.events.lead, {
      project_type: payload.projectType,
      apartment_type: payload.apartmentType,
      timeframe: payload.timeframe,
      lead_source: payload.leadSource,
      ad_platform: payload.adPlatform,
      utm_campaign: payload.utmCampaign,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return; // anti double-submit, as in the legacy guard
    setErrors({});
    setFormError('');

    // Honeypot short-circuits to success without touching the network, so a bot
    // gets no signal that it was caught.
    if (honeypot) {
      showSuccess(buildPayload());
      return;
    }

    const nameOk = validName(fullName);
    const phoneOk = validPhone(phoneFull);
    if (!nameOk || !phoneOk) {
      setErrors({
        fullName: nameOk ? undefined : OG_FORM.errors.fullName,
        telephone: phoneOk ? undefined : OG_FORM.errors.phone,
      });
      const target = document.getElementById(nameOk ? 'og-phone' : 'og-fullname');
      target?.focus();
      return;
    }

    const payload = buildPayload();
    setSubmitting(true);
    track(OG_TRACKING.events.step, { step: TOTAL, step_key: STEPS[TOTAL - 1].key });

    try {
      const response = await fetch(OG_FORM.endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const text = await response.text();
      let data: { success?: boolean; message?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(OG_FORM.errors.network);
      }
      if (!response.ok || data.success === false) {
        throw new Error(data.message || OG_FORM.errors.network);
      }
      // Snap BuyerLead only after lead-gueliz.php confirms success — never on
      // honeypot short-circuit (showSuccess alone) or recruitment forms.
      fireSnapEvent(SNAP_EVENT_BUYER_LEAD, buyerLeadSnapFired);
      showSuccess(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : OG_FORM.errors.network);
      setSubmitting(false);
    }
  };

  const pct = Math.round(((current + 1) / TOTAL) * 100);

  return (
    <div className="rounded-[20px] border border-forest/8 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(45,58,45,0.4)] md:p-9">
      {!succeeded && (
        <form id="og-lead-form" noValidate onSubmit={handleSubmit}>
          <div data-progress hidden={!mounted} className="mb-7">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span
                data-progress-label
                aria-live="polite"
                className="text-[13.5px] font-normal uppercase tracking-[2.5px] text-forest/75"
              >
                {mounted ? `${L.stepPrefix} ${current + 1} ${L.stepJoiner} ${TOTAL}` : ''}
              </span>
              <span data-progress-pct className="text-[15px] font-normal tabular-nums text-bronze">
                {mounted ? `${pct}%` : ''}
              </span>
            </div>
            <div className="h-px w-full bg-forest/12">
              <motion.span
                data-progress-bar
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="block h-px bg-bronze"
              />
            </div>
          </div>

          <div data-steps>
            {mounted && STEPS.map((step, index) => {
              const isLast = index === TOTAL - 1;
              return (
                <div
                  key={step.key}
                  data-step={index}
                  hidden={index !== current}
                  className={cn(index === current && 'is-active')}
                >
                  <h3
                    ref={(node) => {
                      questionRefs.current[index] = node;
                    }}
                    tabIndex={-1}
                    className="font-serif text-[clamp(21px,2.2vw,27px)] font-normal text-forest outline-none"
                  >
                    {step.question}
                  </h3>

                  <fieldset
                    role="radiogroup"
                    aria-label={step.question}
                    className="mt-5 flex flex-col gap-2.5 border-0 p-0"
                  >
                    {step.options.map((option, optionIndex) => {
                      const id = `${step.key}-${optionIndex}`;
                      const checked = values[step.key] === option;
                      return (
                        <label
                          key={id}
                          htmlFor={id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3.5 rounded-xl border px-5 py-4 text-[16.5px] font-normal transition-all duration-300 ease-premium',
                            checked
                              ? 'border-bronze bg-bronze/[0.06] text-forest'
                              : 'border-forest/12 text-forest/75 hover:border-bronze/50 hover:bg-forest/[0.02]',
                          )}
                        >
                          <input
                            type="radio"
                            id={id}
                            name={step.key}
                            value={option}
                            checked={checked}
                            onChange={() => selectOption(step.key, option, optionIndex)}
                            className="sr-only-legacy"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              'relative size-[18px] shrink-0 rounded-full border transition-colors duration-300',
                              checked ? 'border-bronze' : 'border-forest/25',
                            )}
                          >
                            {checked && (
                              <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bronze" />
                            )}
                          </span>
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </fieldset>

                  {isLast && (
                    <div data-fields hidden={!fieldsRevealed} className="mt-7 flex flex-col gap-5">
                      <div>
                        <label
                          htmlFor="og-fullname"
                          className="mb-2 block text-[13.5px] font-normal uppercase tracking-[2.5px] text-forest/75"
                        >
                          {L.fullName}
                        </label>
                        <input
                          type="text"
                          id="og-fullname"
                          name="fullName"
                          autoComplete="name"
                          placeholder="Prénom et nom"
                          aria-describedby="og-fullname-error"
                          aria-invalid={errors.fullName ? true : undefined}
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className={cn(
                            'w-full rounded-[10px] border bg-white px-5 py-[18px] text-base font-normal leading-[1.5] text-forest outline-none transition-colors duration-300 placeholder:text-forest/65',
                            errors.fullName
                              ? 'border-red-500/60'
                              : 'border-forest/12 focus:border-bronze',
                          )}
                        />
                        <span
                          id="og-fullname-error"
                          data-error-for="fullName"
                          className="mt-1.5 block text-[15.5px] font-normal text-red-600"
                        >
                          {errors.fullName || ''}
                        </span>
                      </div>

                      <div className="phone-country-field" data-phone-country-field>
                        <label
                          htmlFor="og-phone"
                          className="mb-2 block text-[13.5px] font-normal uppercase tracking-[2.5px] text-forest/75"
                        >
                          {L.phone}
                        </label>
                        <PhoneCountryInput
                          country={country}
                          onCountryChange={setCountry}
                          number={number}
                          onNumberChange={setNumber}
                          invalid={Boolean(errors.telephone)}
                          describedBy="og-phone-error"
                          selectId="og-phone-code"
                          inputId="og-phone"
                          numberLabel={L.phone}
                          placeholder=" "
                        />
                        {/* The legacy phone module wrote these four hidden inputs
                            and the CRM reads `phoneCountry` / `phoneCountryCode`
                            straight off the payload, so the names are frozen. */}
                        <input type="hidden" name="telephone" data-phone-legacy value={phoneFull} readOnly />
                        <input type="hidden" name="phoneFull" data-phone-full value={phoneFull} readOnly />
                        <input
                          type="hidden"
                          name="phoneCountry"
                          data-phone-country
                          value={country.label}
                          readOnly
                        />
                        <input
                          type="hidden"
                          name="phoneCountryCode"
                          data-phone-country-code
                          value={country.countryCode}
                          readOnly
                        />
                        <span
                          id="og-phone-error"
                          data-error-for="telephone"
                          className="mt-1.5 block text-[15.5px] font-normal text-red-600"
                        >
                          {errors.telephone || ''}
                        </span>
                      </div>

                      {/* Honeypot: offscreen, never announced, never focusable. */}
                      <input
                        type="text"
                        name="company_website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        value={honeypot}
                        onChange={(event) => setHoneypot(event.target.value)}
                        style={{
                          position: 'absolute',
                          left: '-9999px',
                          width: 1,
                          height: 1,
                          opacity: 0,
                        }}
                      />

                      <p className="text-[15px] font-normal leading-[1.75] text-forest/70">
                        {OG_FORM.consent}
                      </p>
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {index > 0 && (
                      <button
                        type="button"
                        data-back
                        onClick={() => goTo(index - 1)}
                        className="cursor-pointer rounded-[10px] border border-forest/15 px-7 py-4 text-[13.5px] font-normal uppercase tracking-[2.5px] text-forest transition-colors duration-300 hover:border-forest/40"
                      >
                        {L.back}
                      </button>
                    )}
                    {isLast ? (
                      <button
                        type="submit"
                        data-submit
                        disabled={!fieldsRevealed || submitting}
                        className="flex-1 cursor-pointer rounded-[10px] bg-bronze px-8 py-4 text-[13.5px] font-normal uppercase tracking-[2.5px] text-white transition-all duration-400 ease-premium hover:bg-forest disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? L.submitting : L.submit}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-next
                        disabled={!values[step.key]}
                        onClick={() => {
                          if (!values[step.key]) return;
                          track(OG_TRACKING.events.step, {
                            step: index + 1,
                            step_key: step.key,
                          });
                          goTo(index + 1);
                        }}
                        className="flex-1 cursor-pointer rounded-[10px] bg-bronze px-8 py-4 text-[13.5px] font-normal uppercase tracking-[2.5px] text-white transition-all duration-400 ease-premium hover:bg-forest disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {L.next}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p
            data-form-error
            role="alert"
            aria-live="assertive"
            className={cn('mt-5 text-[15.5px] font-normal text-red-600', !formError && 'hidden')}
          >
            {formError}
          </p>
        </form>
      )}

      {/* Success panel — the page never navigates, it swaps in place. */}
      <div data-success className={cn('text-center', !succeeded && 'hidden')} role="status" aria-live="polite">
        <div
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-bronze/10 text-bronze"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 data-success-title className="mt-5 font-serif text-[26px] font-normal text-forest">
          {succeeded ? OG_FORM.success.title : ''}
        </h3>
        <p data-success-text className="mx-auto mt-3 max-w-[460px] text-[16.5px] font-normal leading-[1.9] text-forest/75">
          {succeeded ? OG_FORM.success.text : ''}
        </p>
        <a
          data-success-wa
          href={succeeded ? OG_SUCCESS_WHATSAPP : '#'}
          target="_blank"
          rel="noopener"
          className="mt-7 inline-flex items-center gap-2.5 rounded-[10px] bg-[#25D366] px-7 py-4 text-[13.5px] font-normal uppercase tracking-[2.5px] text-white transition-transform duration-300 hover:-translate-y-0.5"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.349 0-4.508-.802-6.227-2.147l-.442-.357-2.645.887.887-2.645-.357-.442A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          <span data-success-wa-label>{succeeded ? OG_FORM.success.whatsappCta : ''}</span>
        </a>
      </div>
    </div>
  );
}
