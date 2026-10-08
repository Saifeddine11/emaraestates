'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { PhoneCountryField, type PhoneCountryPanel } from '@/components/forms/PhoneCountryField';
import { ArrowRight, Check } from '@/components/honest-7/Icons';
import { ActivityNotice } from '@/components/honest-7/ActivityNotice';
import { useLeadForm, type Placement } from '@/components/honest-7/LeadFormState';
import { PROJECT } from '@/components/honest-7/shared';
import { BUDGETS, CHANNELS, INTENTS, INVEST_INTENT, PROPERTY_TYPES, VALIDATION, VISIT_MOMENTS } from '@/lib/content/honest-signature-7';
import { trackLandingEvent } from '@/lib/landing-events';
import { WHATSAPP } from '@/lib/site';
import { cn } from '@/lib/cn';

/*
 * The card is a pane of frosted glass over Emara's green (`.hs7-glass`, on the
 * green stage that frames it), so everything on it is light: cream text, fields
 * and answers a shade clearer than the pane they sit on.
 */

/**
 * The phone field's country list, without the site's animation library (this
 * page loads none): it fades down as it opens and closes at once.
 */
const CountryPanel: PhoneCountryPanel = ({ open, className, children }) =>
  open ? <div className={cn(className, 'motion-safe:animate-[hs7-fade-down_0.2s_var(--ease-step)_both]')}>{children()}</div> : null;

/** Errors on the glass: the page's red is too dark to read on green. */
const ALERT = 'text-[#ffb4a8]';
const ALERT_BORDER = 'border-[#ff9a8b]';
/** 16px text is a floor: iOS Safari zooms the page on focus below it. */
const FIELD =
  'w-full min-h-[54px] rounded-[10px] border bg-white/[0.1] px-4 py-3 text-[16px] leading-[1.4] text-cream ' +
  'transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-cream/50 ' +
  'focus:border-cream focus:bg-white/[0.14] focus:shadow-[0_0_0_3px_rgba(245,240,232,0.22)] focus:outline-none';
const FIELD_BORDER = 'border-white/30';
const LABEL = 'mb-1.5 block text-[14px] font-medium text-cream';
const ERROR = cn('mt-1.5 text-[14px] font-medium leading-snug', ALERT);
/** The form's own buttons: cream on the green glass, so the next action is never in doubt. */
const SUBMIT =
  'group/cta inline-flex min-h-[56px] cursor-pointer items-center justify-center gap-2.5 rounded-full bg-cream px-6 text-center ' +
  'text-[16px] font-medium leading-tight text-forest shadow-[0_14px_30px_-18px_rgba(0,0,0,0.75)] ' +
  'transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70';
/**
 * « Continuer »: at full strength from the start, never greyed out — so it is
 * never disabled either: pressed before answering, it says what is missing.
 */
const CONTINUE =
  'mt-5 flex min-h-[54px] w-full cursor-pointer items-center justify-center rounded-full bg-cream px-6 text-[16px] font-medium text-forest ' +
  'shadow-[0_14px_30px_-18px_rgba(0,0,0,0.75)] transition-colors duration-200 hover:bg-white';
const CONTINUE_HINT = cn('mt-2.5 text-center text-[14px] font-medium leading-snug empty:hidden', ALERT);
const QUESTION = 'mt-2 font-sans text-[clamp(22px,2vw,27px)] font-medium leading-[1.2] tracking-[-0.01em] text-cream';

/**
 * The lead card, rendered twice (before the show apartments, and at the end of
 * the page) over one shared state — see LeadFormState.
 *
 * Three steps, the easy ones first: the type of apartment and the budget are
 * one tap each and move on by themselves; the contact details come last, when
 * the visitor has already started. The optional questions follow once the
 * lead is saved.
 */
export function LeadForm({
  placement,
  id,
  title,
  headingLevel = 'h2',
}: {
  placement: Placement;
  id: string;
  title: ReactNode;
  headingLevel?: 'h2' | 'h3';
}) {
  const form = useLeadForm();
  const p = `hs7-${placement}`;
  const titleId = `${p}-title`;
  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const shownStage = useRef(form.stage);
  const shownStep = useRef(form.step);
  const Heading = headingLevel;

  // `form_view`, once per card, when a fifth of it is on screen.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackLandingEvent('form_view', { project: PROJECT, placement });
        observer.disconnect();
        // Reached by scrolling rather than by a CTA: the same one-time glow says "the form is here".
        card.setAttribute('data-arrived', '');
        window.setTimeout(() => card.removeAttribute('data-arrived'), 1600);
      },
      { threshold: 0.35 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [placement]);

  // A new stage replaces the card's content: move focus to it (in the card the
  // visitor is using) and bring its top back on screen if it scrolled away.
  useEffect(() => {
    if (shownStage.current === form.stage) return;
    shownStage.current = form.stage;
    if (form.activePlacement !== placement) return;
    panelRef.current?.focus({ preventScroll: true });
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [form.activePlacement, form.stage, placement]);

  // Same for a new step: one tap replaced the question, so focus follows it.
  useEffect(() => {
    if (shownStep.current === form.step) return;
    shownStep.current = form.step;
    if (form.activePlacement !== placement || form.stage !== 'form') return;
    stepRef.current?.focus({ preventScroll: true });
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [form.activePlacement, form.stage, form.step, placement]);

  // The first question hops three times each time it comes on screen, until it is answered.
  // The heading is watched and the line inside it moves, so the hop cannot take it off screen.
  const [question, setQuestion] = useState<HTMLElement | null>(null);
  const [questionOnScreen, setQuestionOnScreen] = useState(false);
  useEffect(() => {
    if (!question) return;
    const observer = new IntersectionObserver(([entry]) => setQuestionOnScreen(entry.isIntersecting), { threshold: 1 });
    observer.observe(question);
    return () => observer.disconnect();
  }, [question]);
  const hop = questionOnScreen && !form.propertyType;

  // « Continuer » pressed on a question that has no answer yet: the step it was pressed on.
  const [askedOn, setAskedOn] = useState<number | null>(null);
  const answered = form.step === 1 ? Boolean(form.propertyType) : Boolean(form.budget);
  const needsAnswer = askedOn === form.step && !answered;
  function onContinue() {
    if (answered) form.nextStep(placement);
    else setAskedOn(form.step);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit(placement);
  }

  return (
    <div
      ref={cardRef}
      id={id}
      data-lead-form={placement}
      tabIndex={-1}
      role="region"
      aria-labelledby={titleId}
      className={cn(
        // A pane of glass with a lit edge: it reads as a form, not as another section of the page.
        'hs7-glass relative scroll-mt-6 rounded-[24px] border border-white/20 p-5 text-cream outline-none xs:p-6 sm:p-8 lg:scroll-mt-28',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_30px_70px_-36px_rgba(0,0,0,0.65)] [&_:focus-visible]:outline-cream',
        'ring-0 ring-gold/0 transition-[box-shadow] duration-700 data-[arrived]:ring-[7px] data-[arrived]:ring-gold/45',
      )}
    >
      {/* Today's activity, right above the question: a band across the top of the card (absent while there is none). */}
      {VALIDATION.activityCounter && form.stage === 'form' && (
        <ActivityNotice className="-mx-5 -mt-5 mb-5 rounded-t-[23px] border-b border-white/15 bg-white/[0.07] px-5 pb-4 pt-[18px] xs:-mx-6 xs:-mt-6 xs:mb-6 xs:px-6 sm:-mx-8 sm:-mt-8 sm:mb-7 sm:px-8" />
      )}
      {form.stage === 'form' && (
        <div ref={stepRef} tabIndex={-1} className="outline-none">
          <div aria-hidden="true" className="h-[3px] overflow-hidden rounded-full bg-white/15">
            <span
              data-progress
              className="block h-full origin-left rounded-full bg-cream transition-transform duration-500 ease-step"
              style={{ transform: `scaleX(${form.step / 3})` }}
            />
          </div>
          <p className="mt-5 text-[12.5px] font-medium uppercase tracking-[0.16em] text-cream/80">
            Étape <span className="tabular-nums">{form.step}</span> sur 3
          </p>

          {form.step === 1 && (
            <div key="type" className="motion-safe:animate-[hs7-fade-up_0.35s_var(--ease-step)_both]">
              <Heading ref={setQuestion} id={titleId} className={QUESTION}>
                <span data-question-hop={hop ? '' : undefined} className={cn('block', hop && 'motion-safe:animate-[hs7-bounce_1.5s_0.4s_3]')}>
                  Quel type d’appartement recherchez-vous ?
                </span>
              </Heading>
              <div role="group" aria-labelledby={titleId} className="mt-5 grid gap-2.5">
                {PROPERTY_TYPES.map((type) => (
                  <Option key={type.value} selected={form.propertyType === type.value} onSelect={() => form.selectPropertyType(type.value, placement)}>
                    {type.label}
                  </Option>
                ))}
              </div>
              <button type="button" onClick={onContinue} className={CONTINUE}>
                Continuer
              </button>
              <p role="alert" className={CONTINUE_HINT}>
                {needsAnswer && 'Choisissez une réponse pour continuer.'}
              </p>
              <p className="mt-4 text-center text-[13.5px] leading-[1.55] text-cream/80">
                {title} : deux questions, puis vos coordonnées. Sans engagement.
              </p>
            </div>
          )}

          {form.step === 2 && (
            <div key="budget" className="motion-safe:animate-[hs7-fade-up_0.35s_var(--ease-step)_both]">
              <Heading id={titleId} className={QUESTION}>
                Quel budget prévoyez-vous ?
              </Heading>
              <div role="group" aria-labelledby={titleId} className="mt-5 grid gap-2.5">
                {BUDGETS.map((budget) => (
                  <Option key={budget} selected={form.budget === budget} onSelect={() => form.selectBudget(budget, placement)}>
                    <span className="whitespace-nowrap">
                      {budget.replace(/ MAD$/, '')}
                      {budget.endsWith(' MAD') && <span className="ml-1 text-[0.85em] text-cream/75">MAD</span>}
                    </span>
                  </Option>
                ))}
              </div>
              <button type="button" onClick={onContinue} className={CONTINUE}>
                Continuer
              </button>
              <p role="alert" className={CONTINUE_HINT}>
                {needsAnswer && 'Choisissez un budget pour continuer.'}
              </p>
              <BackLink onClick={() => form.goToStep(1, placement)}>Type d’appartement</BackLink>
            </div>
          )}

          {form.step === 3 && (
            <div key="contact" className="motion-safe:animate-[hs7-fade-up_0.35s_var(--ease-step)_both]">
              <Heading id={titleId} className={QUESTION}>
                Où vous envoyer les prix et les plans ?
              </Heading>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] text-cream">
                <Check className="text-cream" />
                <span className="font-medium text-cream">{PROPERTY_TYPES.find((type) => type.value === form.propertyType)?.label || 'Appartement'}</span>
                {form.budget && (
                  <>
                    <span aria-hidden="true" className="text-cream/45">
                      ·
                    </span>
                    <span>{form.budget}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => form.goToStep(1, placement)}
                  className="ml-auto min-h-11 cursor-pointer px-1 text-[14px] font-medium text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream"
                >
                  Modifier
                </button>
              </p>

              <form
                onSubmit={onSubmit}
                onFocusCapture={() => form.markStarted(placement)}
                onBlurCapture={() => form.flushDraft()}
                noValidate
                className="mt-2 grid gap-3.5"
              >
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

                <div>
                  <label htmlFor={`${p}-name`} className={LABEL}>
                    Nom complet
                  </label>
                  <input
                    id={`${p}-name`}
                    name="nom_complet"
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    maxLength={80}
                    value={form.fullName}
                    onChange={(event) => form.setFullName(event.target.value)}
                    aria-invalid={Boolean(form.errors.fullName)}
                    aria-describedby={form.errors.fullName ? `${p}-name-error` : undefined}
                    className={cn(FIELD, form.errors.fullName ? ALERT_BORDER : FIELD_BORDER)}
                  />
                  {form.errors.fullName && (
                    <p id={`${p}-name-error`} className={ERROR}>
                      {form.errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${p}-phone`} className={LABEL}>
                    Téléphone / WhatsApp
                  </label>
                  <PhoneCountryField
                    Panel={CountryPanel}
                    country={form.country}
                    onCountryChange={form.setCountry}
                    number={form.phoneNumber}
                    onNumberChange={form.setPhoneNumber}
                    invalid={Boolean(form.errors.phone)}
                    describedBy={form.errors.phone ? `${p}-phone-error` : undefined}
                    tone="glass"
                    selectId={`${p}-phone-code`}
                    inputId={`${p}-phone`}
                    numberLabel="Téléphone / WhatsApp"
                    placeholder="6 12 34 56 78"
                  />
                  {form.errors.phone && (
                    <p id={`${p}-phone-error`} className={ERROR}>
                      {form.errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${p}-email`} className={LABEL}>
                    E-mail{!VALIDATION.emailRequired && <span className="font-normal text-cream/85"> (facultatif)</span>}
                  </label>
                  <input
                    id={`${p}-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    enterKeyHint="send"
                    maxLength={120}
                    value={form.email}
                    onChange={(event) => form.setEmail(event.target.value)}
                    aria-invalid={Boolean(form.errors.email)}
                    aria-describedby={form.errors.email ? `${p}-email-error` : undefined}
                    placeholder="vous@exemple.com"
                    className={cn(FIELD, form.errors.email ? ALERT_BORDER : FIELD_BORDER)}
                  />
                  {form.errors.email && (
                    <p id={`${p}-email-error`} className={ERROR}>
                      {form.errors.email}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={form.submitting} aria-busy={form.submitting} className={cn(SUBMIT, 'mt-1.5 w-full')}>
                  {form.submitting ? (
                    <>
                      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-forest/30 border-t-forest" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      Recevoir les prix et plans
                      <ArrowRight className="transition-transform duration-300 ease-step group-hover/cta:translate-x-1" />
                    </>
                  )}
                </button>

                <DotList className="text-[13.5px] text-cream" items={['Prix lot par lot', 'Plans', 'Échéancier', 'Disponibilités']} />

                <div role="alert" aria-live="assertive" className="empty:hidden">
                  {form.feedback && (
                    <p className="rounded-[12px] border border-[#ff9a8b]/60 bg-black/20 px-4 py-3 text-[14.5px] leading-[1.5] text-cream">
                      {form.feedback}{' '}
                      <a href={WHATSAPP.bare} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
                        Ou écrivez-nous sur WhatsApp
                      </a>
                      .
                    </p>
                  )}
                </div>

                <div className="border-t border-white/15 pt-3.5 text-[13.5px] leading-[1.55] text-cream/85">
                  <p>
                    Un conseiller vous transmet les disponibilités et les prix lot par lot, puis les plans et la brochure. Sans
                    engagement, sans réservation automatique.
                  </p>
                  {VALIDATION.contactChoicePromise && <p className="mt-1.5">Vous choisissez ensuite comment être contacté : WhatsApp ou appel.</p>}
                  <p className="mt-1.5">Vos coordonnées servent uniquement à vous recontacter au sujet de Honest Signature 7.</p>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {form.stage === 'qualify' && <Qualify placement={placement} titleId={titleId} Heading={Heading} panelRef={panelRef} />}
      {form.stage === 'done' && <Done titleId={titleId} Heading={Heading} panelRef={panelRef} />}
    </div>
  );
}

type PanelProps = { titleId: string; Heading: 'h2' | 'h3'; panelRef: RefObject<HTMLDivElement | null> };

function SavedMark() {
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-forest motion-safe:animate-[hs7-pop_0.45s_var(--ease-step)_both]">
      <Check className="size-5" />
    </span>
  );
}

/** Next open days (the showroom is closed on Sundays), from tomorrow. */
function upcomingVisitDays(count = 6) {
  const short = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const long = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const days: { label: string; value: string }[] = [];
  const cursor = new Date();
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue;
    days.push({ label: short.format(cursor).replace(/\./g, ''), value: long.format(cursor) });
  }
  return days;
}

/** The lead is saved. These questions only help the adviser prepare the file. */
function Qualify({ placement, titleId, Heading, panelRef }: PanelProps & { placement: Placement }) {
  const form = useLeadForm();
  const p = `hs7-${placement}`;
  // Client-only (this panel never renders on the server), so today's date is safe to read.
  const days = useMemo(() => upcomingVisitDays(), []);

  return (
    <div ref={panelRef} tabIndex={-1} className="outline-none">
      <div role="status" className="flex items-center gap-3.5">
        <SavedMark />
        <div>
          <Heading id={titleId} className="font-sans text-[22px] font-medium leading-[1.15] tracking-[-0.01em] text-cream">
            Demande envoyée.
          </Heading>
          <p className="mt-1 text-[15px] leading-[1.45] text-cream/85">Un conseiller vous transmet le dossier.</p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.saveQualification(placement);
        }}
        className="mt-6 grid gap-5 border-t border-white/15 pt-5"
      >
        <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-cream/85">Facultatif — pour préparer votre dossier</p>

        <Chips
          legend="Votre projet ?"
          name={`${p}-intent`}
          value={form.intent}
          onChange={(value) => form.selectIntent(value, placement)}
          options={INTENTS.map((option) => ({ value: option.intent, label: option.label }))}
          columns="grid-cols-2"
        />
        {form.intent === INVEST_INTENT && (
          <p className="-mt-2 flex items-start gap-2 text-[14.5px] leading-[1.5] text-cream motion-safe:animate-[hs7-fade-up_0.4s_var(--ease-step)_both]">
            <Check className="mt-0.5 text-cream" />
            Votre dossier inclura l’analyse du potentiel locatif.
          </p>
        )}

        <Chips
          legend="Comment préférez-vous être contacté ?"
          name={`${p}-channel`}
          value={form.channel}
          onChange={(value) => form.selectChannel(value, placement)}
          options={CHANNELS.map((channel) => ({ value: channel, label: channel }))}
          columns="grid-cols-2"
        />

        {form.visitOpen ? (
          <div className="grid gap-4 rounded-[16px] border border-white/15 bg-white/[0.06] p-4 motion-safe:animate-[hs7-fade-up_0.4s_var(--ease-step)_both]">
            <p className="text-[16px] font-medium leading-snug text-cream">Visiter un appartement témoin</p>
            <Chips
              legend="Jour souhaité"
              small
              name={`${p}-visit-day`}
              value={form.visitDay}
              onChange={form.setVisitDay}
              options={days}
              columns="grid-cols-3"
            />
            <Chips
              legend="Moment"
              small
              name={`${p}-visit-moment`}
              value={form.visitMoment}
              onChange={form.setVisitMoment}
              options={VISIT_MOMENTS.map((moment) => ({ value: moment, label: moment }))}
              columns="grid-cols-3"
            />
            <p className="text-[13.5px] leading-[1.5] text-cream/85">Un conseiller vous confirme le rendez-vous.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => form.openVisit(placement)}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-white/25 px-4 text-left text-[15.5px] font-medium text-cream transition-colors duration-200 hover:border-white/55 hover:bg-white/[0.08]"
          >
            Visiter un appartement témoin
            <span aria-hidden="true" className="text-[20px] font-light leading-none text-cream/85">
              +
            </span>
          </button>
        )}

        <button
          type="submit"
          disabled={form.saving}
          aria-busy={form.saving}
          className={cn(SUBMIT, 'w-full')}
        >
          {form.saving ? 'Enregistrement…' : 'Terminer'}
          {!form.saving && <ArrowRight className="transition-transform duration-300 ease-step group-hover/cta:translate-x-1" />}
        </button>
      </form>
    </div>
  );
}

function Done({ titleId, Heading, panelRef }: PanelProps) {
  const form = useLeadForm();
  const visit = form.visitOpen ? [form.visitDay, form.visitMoment.toLowerCase()].filter(Boolean).join(', ') : '';
  return (
    <div ref={panelRef} tabIndex={-1} role="status" aria-live="polite" className="outline-none">
      <SavedMark />
      <Heading id={titleId} className="mt-5 font-sans text-[clamp(24px,2.2vw,30px)] font-medium leading-[1.15] tracking-[-0.01em] text-cream">
        C’est noté.
      </Heading>
      <p className="mt-3 text-[16px] leading-[1.6] text-cream">
        Un conseiller Emara Estates vous contacte
        {form.channel === 'WhatsApp' ? ' sur WhatsApp' : form.channel === 'Appel' ? ' par téléphone' : ''} et vous transmet les
        disponibilités et les prix lot par lot, puis les plans et la brochure.
      </p>
      {visit && (
        <p className="mt-3 text-[15px] leading-[1.55] text-cream/85">
          Visite d’un appartement témoin souhaitée : <span className="text-cream">{visit}</span>. Un conseiller vous confirme le
          rendez-vous.
        </p>
      )}
      <a
        href={WHATSAPP.bare}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border border-cream/35 px-5 text-[14.5px] font-medium text-cream transition-colors duration-200 hover:border-cream"
      >
        Écrire sur WhatsApp
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

function Chips({
  legend,
  name,
  options,
  value,
  onChange,
  columns,
  small = false,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  columns: string;
  small?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={cn('font-medium text-cream', small ? 'text-[14px] text-cream/85' : 'text-[16px]', 'leading-snug')}>{legend}</legend>
      <div className={cn('mt-2.5 grid gap-2', columns)}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-[12px] border px-2.5 py-2 text-center font-medium leading-tight',
                small ? 'min-h-11 text-[13.5px]' : 'min-h-[50px] text-[15px]',
                'transition-[background-color,border-color,color] duration-200 ease-step',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cream',
                checked ? 'border-cream bg-cream text-forest' : 'border-white/20 bg-white/[0.08] text-cream hover:border-white/50',
              )}
            >
              <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * One answer to a step, drawn like a form choice: the label, and a radio mark
 * that fills when chosen. A single tap selects it and moves on; « Continuer »
 * is there for a visitor who came back to change nothing.
 */
function Option({ children, selected, onSelect }: { children: ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-[14px] border px-4 text-left text-[16px] font-medium leading-tight text-cream',
        'transition-[background-color,border-color,box-shadow] duration-200 ease-step active:scale-[0.995]',
        selected
          ? 'border-cream bg-white/[0.2] shadow-[inset_0_0_0_1px_var(--color-cream)]'
          : 'border-white/20 bg-white/[0.08] hover:border-white/45 hover:bg-white/[0.13]',
      )}
    >
      <span className="flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200',
          selected ? 'border-cream bg-cream text-forest' : 'border-cream/40',
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
    </button>
  );
}

function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-medium text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream"
    >
      <span aria-hidden="true">←</span>
      {children}
    </button>
  );
}

/**
 * "Plans • Prix • …" that can wrap without ever leaving a separator alone at
 * the start or the end of a line: each dot belongs to the item it precedes
 * and hangs in the gap, and the row is pulled left by that gap, so the dot of
 * whichever item starts a line falls outside the clipped box.
 */
function DotList({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn('overflow-hidden font-medium leading-[1.5]', className)}>
      <ul className="-ml-5 flex flex-wrap">
        {items.map((item) => (
          <li
            key={item}
            className="relative ml-5 whitespace-nowrap before:absolute before:-left-3 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-current before:opacity-70"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
