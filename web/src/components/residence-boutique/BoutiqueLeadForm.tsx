'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { useLeadForm, type Placement } from '@/components/residence-boutique/LeadFormState';
import {
  BUDGETS,
  FORM_DELIVERABLES,
  FORM_REASSURANCE,
  PROPERTY_TYPES,
} from '@/lib/content/residence-boutique';
import { WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

export const FORM_ANCHOR = 'disponibilites';

const FIELD =
  'w-full min-h-[54px] rounded-[12px] border bg-white px-4 py-3 text-[16px] leading-[1.4] text-forest ' +
  'transition-[border-color,box-shadow] duration-200 placeholder:text-forest/40 hover:border-forest/30 ' +
  'focus:border-gold focus:shadow-[0_0_0_3px_rgba(210,177,120,0.35)] focus:outline-none';
const LABEL = 'mb-2 block text-[14px] font-medium text-cream/85';

export const SUBMIT =
  'group/cta relative isolate flex min-h-[60px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-gold px-6 py-4 ' +
  'text-[15px] font-semibold uppercase tracking-[0.08em] text-forest shadow-[0_18px_36px_-18px_rgba(210,177,120,0.8)] ' +
  'transition-[transform,background-color,box-shadow] duration-300 ease-step hover:-translate-y-px hover:bg-[#dcbf8c] ' +
  'active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70';

/**
 * The lead card. Rendered twice (hero + closing section) over one shared
 * state — see LeadFormState. Step 1 qualifies (type + budget, validated
 * locally), step 2 collects contact details, and only the final button posts.
 */
export function BoutiqueLeadForm({
  placement,
  title,
  subtitle,
  className,
  headingLevel = 'h2',
}: {
  placement: Placement;
  title: ReactNode;
  subtitle: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}) {
  const form = useLeadForm();
  const reduce = useReducedMotion();
  const p = `rb-${placement}`;
  const titleId = `${p}-title`;
  const cardRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(form.step);
  const Heading = headingLevel;

  // Moving between steps: focus the next useful control in the form the
  // visitor is using (the twin form only mirrors the state, silently).
  useEffect(() => {
    if (shownStep.current === form.step) return;
    shownStep.current = form.step;
    if (form.activePlacement !== placement) return;
    // The next step mounts only once the previous one has faded out, so look
    // the field up frame by frame rather than once.
    const find = () =>
      form.step === 2
        ? document.getElementById(`${p}-name`)
        : document.querySelector<HTMLInputElement>(`#${p}-type input:checked, #${p}-type input`);
    let frame = 0;
    let tries = 0;
    const focusWhenReady = () => {
      const target = find();
      if (target) target.focus({ preventScroll: true });
      else if (tries++ < 60) frame = window.requestAnimationFrame(focusWhenReady);
    };
    frame = window.requestAnimationFrame(focusWhenReady);
    // Keep the card in view on phones, where step 2 is taller than step 1.
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on step changes
  }, [form.step]);

  function onContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.continueToStep2(placement)) {
      const missing = !form.propertyType ? `${p}-type` : `${p}-budget`;
      document.querySelector<HTMLInputElement>(`#${missing} input`)?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(placement);
  }

  const honeypot = (
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

  return (
    <div
      ref={cardRef}
      data-lead-form={placement}
      tabIndex={-1}
      role="region"
      aria-labelledby={titleId}
      className={cn(
        'relative scroll-mt-24 rounded-[26px] bg-forest p-5 text-cream shadow-[0_40px_80px_-40px_rgba(30,40,30,0.7)] outline-none xs:p-6 sm:p-8',
        'ring-0 ring-gold/0 transition-[box-shadow] duration-700 data-[arrived]:ring-4 data-[arrived]:ring-gold/50',
        className,
      )}
    >
      {form.succeeded ? (
        <Success placement={placement} titleId={titleId} Heading={Heading} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold">
              Étape <span className="tabular-nums">0{form.step}</span>
              <span className="text-cream/70"> / 02</span>
            </p>
            <div aria-hidden="true" className="flex flex-1 gap-1.5">
              <span className="h-[3px] flex-1 rounded-full bg-gold" />
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-cream/15">
                <span
                  className={cn(
                    'absolute inset-0 origin-left bg-gold transition-transform duration-500 ease-step',
                    form.step === 2 ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            </div>
          </div>

          <Heading id={titleId} className="mt-5 text-balance font-sans text-[clamp(22px,2.1vw,28px)] font-medium uppercase leading-[1.05] tracking-[-0.015em] text-cream">
            {form.step === 1 ? title : 'Où vous envoyer les disponibilités ?'}
          </Heading>
          <p className="mt-2 text-[15px] leading-[1.5] text-cream/70">
            {form.step === 1 ? subtitle : 'Dernière étape. Un conseiller vous transmet les options correspondant à vos réponses.'}
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {form.step === 1 ? (
              <motion.form
                key="step-1"
                onSubmit={onContinue}
                onFocusCapture={() => form.markStarted(placement)}
                noValidate
                initial={reduce ? false : { opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.36, ease: EASE }}
                className="mt-6 grid gap-6"
              >
                {honeypot}
                <Choices
                  id={`${p}-type`}
                  legend="Quel type de bien vous intéresse ?"
                  name={`${p}-property-type`}
                  value={form.propertyType}
                  error={form.errors.propertyType}
                  onChange={(value) => form.setPropertyType(value, placement)}
                  options={PROPERTY_TYPES.map((option) => ({
                    value: option.value,
                    label: option.label,
                    glyph: <RoomsGlyph rooms={option.rooms} />,
                  }))}
                  columns="grid-cols-1 sm:grid-cols-3"
                  stacked
                />
                <Choices
                  id={`${p}-budget`}
                  legend="Quel budget prévoyez-vous pour votre achat ?"
                  name={`${p}-budget-range`}
                  value={form.budget}
                  error={form.errors.budget}
                  onChange={(value) => form.setBudget(value, placement)}
                  options={BUDGETS.map((budget) => ({
                    value: budget,
                    label: (
                      <span className="whitespace-nowrap">
                        {budget.replace(/ MAD$/, '')}
                        <span className="ml-1 text-[0.82em] opacity-70">MAD</span>
                      </span>
                    ),
                  }))}
                  columns="grid-cols-2"
                  compact
                />
                <button type="submit" className={cn(SUBMIT, placement === 'hero' && 'rb-cta-sheen')}>
                  Voir mes options
                  <Arrow />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step-2"
                onSubmit={onSubmit}
                noValidate
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 14 }}
                transition={{ duration: 0.36, ease: EASE }}
                className="mt-6 grid gap-4"
              >
                {honeypot}
                <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-cream/12 bg-cream/[0.06] py-1.5 pl-3 pr-1.5 text-[14.5px] text-cream/85">
                  <Check className="size-4 text-gold" />
                  <span className="font-medium text-cream">{form.propertyType}</span>
                  <span aria-hidden="true" className="text-cream/40">·</span>
                  <span>{form.budget}</span>
                  <button
                    type="button"
                    onClick={() => form.backToStep1(placement)}
                    className="ml-auto min-h-11 cursor-pointer rounded-full px-3 text-[14px] font-medium text-cream underline decoration-cream/35 underline-offset-4 transition-colors hover:decoration-cream"
                  >
                    Modifier
                  </button>
                </div>

                <Field id={`${p}-name`} label="Nom complet" error={form.errors.fullName}>
                  <input
                    id={`${p}-name`}
                    name="nom_complet"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={form.fullName}
                    onChange={(event) => form.setFullName(event.target.value)}
                    aria-invalid={Boolean(form.errors.fullName)}
                    aria-describedby={form.errors.fullName ? `${p}-name-error` : undefined}
                    className={cn(FIELD, form.errors.fullName ? 'border-[#e0a58c]' : 'border-transparent')}
                  />
                </Field>

                <Field id={`${p}-phone`} label="Numéro de téléphone" error={form.errors.phone}>
                  <PhoneCountryInput
                    country={form.country}
                    onCountryChange={form.setCountry}
                    number={form.phoneNumber}
                    onNumberChange={form.setPhoneNumber}
                    invalid={Boolean(form.errors.phone)}
                    describedBy={form.errors.phone ? `${p}-phone-error` : undefined}
                    selectId={`${p}-phone-code`}
                    inputId={`${p}-phone`}
                    numberLabel="Numéro de téléphone"
                    placeholder="6 12 34 56 78"
                  />
                </Field>

                <Field id={`${p}-email`} label="E-mail" error={form.errors.email}>
                  <input
                    id={`${p}-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={120}
                    value={form.email}
                    onChange={(event) => form.setEmail(event.target.value)}
                    aria-invalid={Boolean(form.errors.email)}
                    aria-describedby={form.errors.email ? `${p}-email-error` : undefined}
                    placeholder="vous@exemple.com"
                    className={cn(FIELD, form.errors.email ? 'border-[#e0a58c]' : 'border-transparent')}
                  />
                </Field>

                <button type="submit" disabled={form.submitting} aria-busy={form.submitting} className={cn(SUBMIT, 'mt-2')}>
                  {form.submitting ? (
                    <>
                      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-forest/25 border-t-forest" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      Voir les prix et disponibilités
                      <Arrow />
                    </>
                  )}
                </button>
                <p className="text-center text-[13.5px] font-medium tracking-[0.04em] text-cream/80">{FORM_DELIVERABLES}</p>

                <div role="alert" aria-live="assertive" className="empty:hidden">
                  {form.feedback && (
                    <div className="rounded-[14px] border border-[#e0a58c]/50 bg-[#e0a58c]/10 px-4 py-3 text-[14.5px] leading-[1.5] text-cream">
                      {form.feedback}{' '}
                      <a href={WHATSAPP.bare} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
                        Ou écrivez-nous sur WhatsApp
                      </a>
                      .
                    </div>
                  )}
                </div>

                <p className="text-center text-[13px] leading-[1.55] text-cream/70">
                  {FORM_REASSURANCE} En envoyant, vous acceptez d’être contacté par un conseiller Emara Estates.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function Success({ placement, titleId, Heading }: { placement: Placement; titleId: string; Heading: 'h2' | 'h3' }) {
  const form = useLeadForm();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (form.activePlacement === placement) ref.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on success
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status" aria-live="polite" className="py-4 outline-none sm:py-6">
      <div aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gold text-forest motion-safe:animate-[rb-check-pop_0.5s_var(--ease-step)_both]">
        <Check className="size-6" />
      </div>
      <Heading id={titleId} className="mt-6 font-sans text-[clamp(24px,2.2vw,30px)] font-medium uppercase leading-[1.05] tracking-[-0.015em]">
        C’est noté.
      </Heading>
      <p className="mt-3 text-[16px] leading-[1.6] text-cream/80">
        Un conseiller Emara Estates vous contacte pour vous transmettre les plans, prix et disponibilités
        {form.propertyType ? (
          <>
            {' '}
            — <span className="text-cream">{form.propertyType.toLowerCase()}</span>, <span className="text-cream">{form.budget}</span>
          </>
        ) : null}
        .
      </p>
      <ul className="mt-6 grid gap-2 border-t border-cream/12 pt-5 text-[15px] text-cream/75">
        {['Plans et surfaces des lots disponibles', 'Prix à jour et échéancier', 'Étages et orientations encore libres'].map((item) => (
          <li key={item} className="flex items-center gap-3">
            <Check className="size-4 shrink-0 text-gold" />
            {item}
          </li>
        ))}
      </ul>
      <a
        href={WHATSAPP.bare}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full border border-cream/25 px-5 text-[14.5px] font-medium text-cream transition-colors hover:border-cream/60"
      >
        Plus rapide : écrire sur WhatsApp
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

type Option = { value: string; label: ReactNode; glyph?: ReactNode };

function Choices({
  id,
  legend,
  name,
  options,
  value,
  onChange,
  error,
  columns,
  stacked = false,
  compact = false,
}: {
  id: string;
  legend: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  columns: string;
  stacked?: boolean;
  /** Tight two-column grid: on phones the fill alone marks the choice. */
  compact?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <fieldset id={id} aria-describedby={error ? errorId : undefined}>
      <legend className="text-[16px] font-medium leading-snug text-cream">{legend}</legend>
      <div className={cn('mt-3 grid gap-2', columns)}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'group/opt relative flex min-h-[54px] cursor-pointer items-center gap-3 rounded-[14px] border py-3 text-[15px] font-medium leading-tight',
                compact ? 'px-3 max-sm:justify-center max-sm:text-[14.5px] sm:px-3.5' : 'px-3.5',
                'transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-step',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold',
                stacked && 'sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-between sm:gap-4 sm:px-4 sm:py-4',
                checked
                  ? 'border-cream bg-cream text-forest shadow-[0_14px_28px_-16px_rgba(0,0,0,0.6)] -translate-y-0.5'
                  : 'border-cream/15 bg-cream/[0.04] text-cream hover:-translate-y-px hover:border-cream/45 hover:bg-cream/[0.08]',
                error && !value && 'border-[#e0a58c]/60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.glyph && <span className={cn('shrink-0', checked ? 'text-forest' : 'text-cream/60')}>{option.glyph}</span>}
              <span className={cn('min-w-0 text-balance', compact ? 'max-sm:text-center sm:flex-1' : 'flex-1')}>{option.label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                  stacked && 'sm:absolute sm:right-3 sm:top-3',
                  compact && 'max-sm:hidden',
                  checked ? 'border-forest bg-forest text-cream' : 'border-cream/30',
                )}
              >
                {checked && <Check className="size-3 motion-safe:animate-[rb-check-pop_0.35s_var(--ease-step)_both]" />}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-[14px] text-[#f0bfa9]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[14px] text-[#f0bfa9]">
          {error}
        </p>
      )}
    </div>
  );
}

/** A plan in miniature: one cell for a studio, one more per bedroom. */
function RoomsGlyph({ rooms }: { rooms: number }) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" className="h-5 w-8 sm:h-6 sm:w-10" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1" y="1" width="38" height="22" rx="2" />
      {rooms >= 1 && <path d="M22 1v22" />}
      {rooms >= 2 && <path d="M22 12h17" />}
      <path d="M8 23v-4" strokeLinecap="round" />
    </svg>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn('size-4 shrink-0 transition-transform duration-300 ease-step group-hover/cta:translate-x-1', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}
