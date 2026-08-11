'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { Button, ButtonLink } from '@/components/ui/Button';
import { fieldError, fieldInput, fieldLabel } from '@/components/ui/form-tokens';
import {
  AVAILABILITY_PERIOD_OPTIONS,
  CLOSING_LEVEL_OPTIONS,
  MAX_CV_BYTES,
  PREFERRED_WORKING_HOURS_OPTIONS,
  REAL_ESTATE_OPTIONS,
  RECRUITMENT_STEPS,
  SALES_CLOSED_OPTIONS,
  SALES_EXPERIENCE_OPTIONS,
  TOTAL_STEPS,
} from '@/lib/content/recruitment';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { cn } from '@/lib/cn';
import { ENDPOINTS, ROUTES } from '@/lib/site';
import {
  fireMetaCustomEvent,
  META_EVENT_RECRUITMENT,
} from '@/lib/meta-pixel';
import { fireSnapEvent, SNAP_EVENT_RECRUITMENT } from '@/lib/snap-pixel';

type Step = 1 | 2 | 3;

type FormState = {
  sales_experience: string;
  real_estate_experience: string;
  sales_closed_12m: string;
  closing_level: string;
  preferred_working_hours: string;
  availability_period: string;
  first_name: string;
  last_name: string;
  email: string;
};

const INITIAL: FormState = {
  sales_experience: '',
  real_estate_experience: '',
  sales_closed_12m: '',
  closing_level: '',
  preferred_working_hours: '',
  availability_period: '',
  first_name: '',
  last_name: '',
  email: '',
};

function readUtmParams() {
  if (typeof window === 'undefined') {
    return {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  };
}

function OptionGroup({
  legend,
  name,
  value,
  options,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 font-serif text-[clamp(20px,2.4vw,24px)] font-medium leading-[1.25] text-forest">
        {legend}
      </legend>
      <div className="grid gap-2.5" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const selected = value === option;
          const id = `${name}-${option.replace(/\W+/g, '-').toLowerCase()}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className={cn(
                'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3.5',
                'text-[16px] leading-[1.4] text-forest transition-all duration-[var(--duration-move)] ease-premium',
                selected
                  ? 'border-bronze bg-bronze/[0.08] shadow-[inset_0_0_0_1px_rgba(155,112,64,0.25)]'
                  : 'border-forest/12 bg-white hover:border-forest/25',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
                  selected ? 'border-bronze bg-bronze' : 'border-forest/25 bg-shell',
                )}
              >
                <span
                  className={cn(
                    'size-[6px] rounded-full bg-white transition-opacity',
                    selected ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </span>
              <span className="min-w-0">{option}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className={fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function RecruitmentForm() {
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  /** One successful application = one Meta + one Snap RecruitmentApplication. */
  const recruitmentMetaFired = useRef(false);
  const recruitmentSnapFired = useRef(false);

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<FormState>(INITIAL);
  const [country, setCountry] = useState<Country>(() => findCountry('MA'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [successName, setSuccessName] = useState('');
  const [tracking, setTracking] = useState(readUtmParams);

  useEffect(() => {
    startedAt.current = Date.now();
    setTracking(readUtmParams());
  }, []);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, successName]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateStep(current: Step): boolean {
    const nextErrors: Record<string, string> = {};

    if (current === 1) {
      if (!data.sales_experience) nextErrors.sales_experience = 'Sélectionnez une option.';
      if (!data.real_estate_experience)
        nextErrors.real_estate_experience = 'Sélectionnez une option.';
      if (!data.sales_closed_12m) nextErrors.sales_closed_12m = 'Sélectionnez une option.';
    }

    if (current === 2) {
      if (!data.closing_level) nextErrors.closing_level = 'Sélectionnez une option.';
      if (!data.preferred_working_hours)
        nextErrors.preferred_working_hours = 'Sélectionnez une option.';
      if (!data.availability_period)
        nextErrors.availability_period = 'Sélectionnez une option.';
    }

    if (current === 3) {
      if (data.first_name.trim().length < 2) nextErrors.first_name = 'Prénom requis.';
      if (data.last_name.trim().length < 2) nextErrors.last_name = 'Nom requis.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(data.email.trim())) {
        nextErrors.email = 'Email invalide.';
      }
      const local = normalizeLocalNumber(phoneNumber, country.code);
      if (!local || local.length < 6) nextErrors.telephone = 'Téléphone invalide.';
      if (!cvFile) nextErrors.cv = 'Joignez votre CV en PDF.';
      else if (cvFile.type !== 'application/pdf' && !cvFile.name.toLowerCase().endsWith('.pdf')) {
        nextErrors.cv = 'Le CV doit être un fichier PDF.';
      } else if (cvFile.size > MAX_CV_BYTES) {
        nextErrors.cv = 'Le CV ne doit pas dépasser 5 MB.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((step + 1) as Step);
    }
  }

  function goBack() {
    if (step > 1) {
      setDirection(-1);
      setErrors({});
      setStep((step - 1) as Step);
    }
  }

  function onCvChange(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    setCvFile(file);
    setErrors((prev) => {
      if (!prev.cv) return prev;
      const next = { ...prev };
      delete next.cv;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFeedback('');
    if (!validateStep(3)) return;

    if (honeypot.trim()) {
      setSuccessName(data.first_name.trim());
      return;
    }

    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';
    const body = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      body.append(key, value.trim());
    });
    body.append('telephone', phoneFull);
    body.append('phone', phoneFull);
    body.append('phoneCode', country.code);
    body.append('phoneCountryCode', country.countryCode);
    body.append('phoneNumber', localNumber);
    if (cvFile) body.append('cv', cvFile, cvFile.name);
    body.append('company_website', honeypot);
    body.append('source', 'recruitment_website');
    body.append('page_url', window.location.href);
    body.append('referrer', document.referrer || '');
    body.append('utm_source', tracking.utm_source);
    body.append('utm_medium', tracking.utm_medium);
    body.append('utm_campaign', tracking.utm_campaign);
    body.append('utm_content', tracking.utm_content);
    body.append('utm_term', tracking.utm_term);
    body.append('elapsed_ms', String(Date.now() - startedAt.current));

    setSubmitting(true);
    try {
      const response = await fetch(ENDPOINTS.recruitment, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        body,
      });
      const text = await response.text();
      let payload: {
        success?: boolean;
        error?: string;
        first_name?: string;
        errors?: Record<string, string>;
      } = {};

      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        console.error('[recruitment] Non-JSON response', {
          status: response.status,
          body: text.slice(0, 800),
        });
        setFeedback(
          response.status === 404
            ? 'Endpoint recrutement indisponible. Vérifiez le déploiement de recruitment.php.'
            : 'Le serveur ne répond pas correctement. Réessayez dans un moment.',
        );
        return;
      }

      console.info('[recruitment] API response', {
        status: response.status,
        payload,
      });

      if (response.ok && payload.success === true) {
        // Real qualified apply returns first_name. Honeypot / too-fast bot
        // short-circuits return bare { success: true } — do not track those.
        const qualified = Boolean(payload.first_name?.trim());
        if (qualified) {
          // Recruitment only — never initial_lead / marketingqualifiedlead / buyer Lead.
          fireMetaCustomEvent(META_EVENT_RECRUITMENT, recruitmentMetaFired);
          fireSnapEvent(SNAP_EVENT_RECRUITMENT, recruitmentSnapFired);
        }
        setSuccessName(payload.first_name || data.first_name.trim());
        return;
      }

      if (payload.errors) setErrors(payload.errors);
      const preciseError =
        payload.error ||
        'Votre candidature n’a pas pu être envoyée. Réessayez dans un moment.';
      console.error('[recruitment] Apply failed', {
        status: response.status,
        error: preciseError,
        payload,
      });
      setFeedback(preciseError);
    } catch (error) {
      console.error('[recruitment] Network error', error);
      setFeedback('Votre candidature n’a pas pu être envoyée. Réessayez dans un moment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (successName) {
    return (
      <div
        ref={formRef}
        className="rounded-[22px] border border-forest/10 bg-shell px-5 py-10 shadow-[0_24px_60px_rgba(45,58,45,0.08)] md:px-10 md:py-12"
      >
        <p className="text-eyebrow font-semibold uppercase tracking-[1.6px] text-bronze">
          Emara Estates
        </p>
        <h2 className="mt-4 font-serif text-[clamp(34px,5vw,48px)] font-light leading-[1.05] text-forest">
          Candidature reçue.
        </h2>
        <p className="mt-5 max-w-[540px] text-lead text-forest/75">
          Merci {successName}. Notre équipe va maintenant étudier votre profil. Si votre
          candidature correspond à nos critères, nous vous contacterons prochainement.
        </p>
        <div className="mt-8">
          <ButtonLink href={ROUTES.home} variant="primary" className="max-md:max-w-none">
            Retour au site Emara Estates
          </ButtonLink>
        </div>
      </div>
    );
  }

  const progress = (step / TOTAL_STEPS) * 100;
  const stepMeta = RECRUITMENT_STEPS[step - 1];

  return (
    <div
      ref={formRef}
      className="rounded-[22px] border border-forest/10 bg-shell px-5 py-7 shadow-[0_24px_60px_rgba(45,58,45,0.08)] md:px-10 md:py-10"
    >
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow font-semibold uppercase tracking-[1.6px] text-bronze">
            Étape {step}/{TOTAL_STEPS}
          </p>
          <h2 className="mt-2 font-serif text-[clamp(28px,4vw,38px)] font-light leading-[1.1] text-forest">
            {stepMeta.title}
          </h2>
        </div>
      </div>

      <div
        className="mb-8 h-[3px] overflow-hidden rounded-full bg-forest/10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-label={`Progression ${step} sur ${TOTAL_STEPS}`}
      >
        <div
          className="h-full rounded-full bg-bronze transition-[width] duration-500 ease-premium"
          style={{ width: `${progress}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="company_website"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-10000px] h-px w-px overflow-hidden opacity-0"
        />

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-7"
            >
              {step === 1 ? (
                <>
                  <OptionGroup
                    legend="Avez-vous déjà travaillé dans la vente ?"
                    name="sales_experience"
                    value={data.sales_experience}
                    options={SALES_EXPERIENCE_OPTIONS}
                    onChange={(value) => setField('sales_experience', value)}
                    error={errors.sales_experience}
                  />
                  <OptionGroup
                    legend="Avez-vous déjà travaillé dans l’immobilier ?"
                    name="real_estate_experience"
                    value={data.real_estate_experience}
                    options={REAL_ESTATE_OPTIONS}
                    onChange={(value) => setField('real_estate_experience', value)}
                    error={errors.real_estate_experience}
                  />
                  <OptionGroup
                    legend="Combien de ventes avez-vous conclues au cours des 12 derniers mois ?"
                    name="sales_closed_12m"
                    value={data.sales_closed_12m}
                    options={SALES_CLOSED_OPTIONS}
                    onChange={(value) => setField('sales_closed_12m', value)}
                    error={errors.sales_closed_12m}
                  />
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <OptionGroup
                    legend="Comment évaluez-vous votre niveau en closing ?"
                    name="closing_level"
                    value={data.closing_level}
                    options={CLOSING_LEVEL_OPTIONS}
                    onChange={(value) => setField('closing_level', value)}
                    error={errors.closing_level}
                  />
                  <OptionGroup
                    legend="Quels horaires de travail vous conviennent le mieux ?"
                    name="preferred_working_hours"
                    value={data.preferred_working_hours}
                    options={PREFERRED_WORKING_HOURS_OPTIONS}
                    onChange={(value) => setField('preferred_working_hours', value)}
                    error={errors.preferred_working_hours}
                  />
                  <OptionGroup
                    legend="Quelle est votre disponibilité pour rejoindre Emara Estates ?"
                    name="availability_period"
                    value={data.availability_period}
                    options={AVAILABILITY_PERIOD_OPTIONS}
                    onChange={(value) => setField('availability_period', value)}
                    error={errors.availability_period}
                  />
                </>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="recruit-first-name" className={fieldLabel}>
                        Prénom
                      </label>
                      <input
                        id="recruit-first-name"
                        name="first_name"
                        autoComplete="given-name"
                        value={data.first_name}
                        onChange={(event) => setField('first_name', event.target.value)}
                        className={fieldInput}
                        aria-invalid={Boolean(errors.first_name)}
                      />
                      {errors.first_name ? (
                        <p className={fieldError} role="alert">
                          {errors.first_name}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="recruit-last-name" className={fieldLabel}>
                        Nom
                      </label>
                      <input
                        id="recruit-last-name"
                        name="last_name"
                        autoComplete="family-name"
                        value={data.last_name}
                        onChange={(event) => setField('last_name', event.target.value)}
                        className={fieldInput}
                        aria-invalid={Boolean(errors.last_name)}
                      />
                      {errors.last_name ? (
                        <p className={fieldError} role="alert">
                          {errors.last_name}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <span className={fieldLabel}>Téléphone</span>
                    <PhoneCountryInput
                      country={country}
                      onCountryChange={setCountry}
                      number={phoneNumber}
                      onNumberChange={(value) => {
                        setPhoneNumber(value);
                        setErrors((prev) => {
                          if (!prev.telephone) return prev;
                          const next = { ...prev };
                          delete next.telephone;
                          return next;
                        });
                      }}
                      invalid={Boolean(errors.telephone)}
                      describedBy={errors.telephone ? 'recruit-phone-error' : undefined}
                      selectId="recruit-phone-code"
                      inputId="recruit-phone"
                    />
                    {errors.telephone ? (
                      <p id="recruit-phone-error" className={fieldError} role="alert">
                        {errors.telephone}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="recruit-email" className={fieldLabel}>
                      Email
                    </label>
                    <input
                      id="recruit-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={data.email}
                      onChange={(event) => setField('email', event.target.value)}
                      className={fieldInput}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? (
                      <p className={fieldError} role="alert">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <span className={fieldLabel}>CV (PDF, max 5 MB)</span>
                    <input
                      ref={fileInputRef}
                      id="recruit-cv"
                      name="cv"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(event) => onCvChange(event.target.files)}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          'inline-flex min-h-[52px] items-center justify-center rounded-[12px] border border-forest/15 bg-white px-5',
                          'text-[15px] font-medium text-forest transition-colors hover:border-bronze',
                        )}
                      >
                        {cvFile ? 'Remplacer le CV' : 'Choisir un fichier PDF'}
                      </button>
                      <p className="min-w-0 text-[15px] text-forest/70 [overflow-wrap:anywhere]">
                        {cvFile ? cvFile.name : 'Aucun fichier sélectionné'}
                      </p>
                    </div>
                    {errors.cv ? (
                      <p className={fieldError} role="alert">
                        {errors.cv}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {feedback ? (
          <p className="mt-6 text-[15px] text-[#8c4a32]" role="alert">
            {feedback}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              tone="light"
              onClick={goBack}
              className="sm:min-w-[160px] max-md:max-w-none"
            >
              Retour
            </Button>
          ) : null}

          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              variant="primary"
              onClick={goNext}
              className="sm:min-w-[200px] max-md:max-w-none"
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="sm:min-w-[260px] max-md:max-w-none"
            >
              {submitting ? 'Envoi…' : 'Envoyer ma candidature'}
            </Button>
          )}
        </div>

        {step === 3 ? (
          <p className="mt-4 text-[14px] leading-[1.55] text-olive">
            Vos informations sont utilisées uniquement dans le cadre du recrutement Emara Estates.
          </p>
        ) : null}
      </form>
    </div>
  );
}
