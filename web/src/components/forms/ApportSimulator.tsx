'use client';

import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { ENDPOINTS, ROUTES } from '@/lib/site';
import { cn } from '@/lib/cn';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';

/**
 * Down-payment estimator.
 *
 * Calculation, validation messages and the POST payload are ported verbatim
 * from js/apport-simulator.js — 30% of budget, EUR↔MAD pegged at 1:10, posted
 * to /contact.php with `form_type: 'apport_simulator'`. The server may return
 * its own display strings, which take precedence over the local formatting.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const ERROR_MESSAGE = 'Une erreur est survenue. Vous pouvez nous contacter directement.';

const TYPOLOGIES = ['Studio', 'Appartement', 'Duplex', 'Commerce', 'Je ne sais pas encore'];

function parseBudget(raw: string) {
  const normalized = raw.replace(/\s/g, '').replace(/,/g, '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Thousands separated by a non-breaking space, matching the legacy output. */
function formatNumber(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

function calculateApport(budget: number, currency: 'MAD' | 'EUR') {
  if (currency === 'EUR') {
    const apportEur = Math.round(budget * 0.3);
    return { apportMad: Math.round(apportEur * 10), apportEur };
  }
  const apportMad = Math.round(budget * 0.3);
  return { apportMad, apportEur: Math.round(apportMad / 10) };
}

type Result = {
  budgetDisplay: string;
  apportMadDisplay: string;
  apportEurDisplay: string;
  typologie: string;
};

/** Shared control styling. Class strings only — the DOM is untouched. */
const FIELD = fieldInput;

/**
 * The static build gives the two instances of this form distinct field ids
 * (`…-home` vs `…-honest`) so that nothing collides if both ever render
 * together. They are part of the preserved markup, so the suffix is a prop
 * rather than something unified away.
 */
export function ApportSimulator({ idSuffix }: { idSuffix: 'home' | 'honest' }) {
  const titleId = `apport-simulator-title-${idSuffix}`;
  const budgetId = `apport-budget-${idSuffix}`;
  const typologieId = `apport-typologie-${idSuffix}`;
  const emailId = `apport-email-${idSuffix}`;

  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<'MAD' | 'EUR'>('MAD');
  const [typologie, setTypologie] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError('');
    setResult(null);

    const budgetValue = parseBudget(budget);
    const trimmedEmail = email.trim();
    const nextErrors: Record<string, string> = {};

    if (!budgetValue) {
      nextErrors.budget = 'Indiquez votre budget pour calculer l’apport.';
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Indiquez votre email pour recevoir votre estimation.';
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      nextErrors.email = 'Indiquez une adresse email valide.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const apport = calculateApport(budgetValue, currency);
    setSubmitting(true);

    try {
      const response = await fetch(ENDPOINTS.contact, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: 'apport_simulator',
          email: trimmedEmail,
          budget_value: budgetValue,
          currency,
          typologie: typologie.trim(),
          apport_mad: apport.apportMad,
          apport_eur: apport.apportEur,
          source_page: window.location.href,
          company_website: honeypot,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.errors) setErrors(data.errors);
        else setFormError(ERROR_MESSAGE);
        return;
      }

      const payload = data?.result ?? {};
      setResult({
        budgetDisplay: payload.budget_display ?? `${formatNumber(budgetValue)} ${currency}`,
        apportMadDisplay: payload.apport_mad_display ?? `${formatNumber(apport.apportMad)} MAD`,
        apportEurDisplay: payload.apport_eur_display ?? `${formatNumber(apport.apportEur)} €`,
        typologie: typologie.trim(),
      });
    } catch {
      setFormError(ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="simulateur-apport"
      aria-labelledby={titleId}
      className="mt-28 scroll-mt-28"
    >
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <Reveal direction="left">
          <SectionLabel>Estimation</SectionLabel>
          <SectionTitle id={titleId}>
            Simulez votre apport pour Honest Signature 7
          </SectionTitle>
          <SectionText className="mt-6">
            Entrez votre budget total et obtenez une estimation immédiate de l&apos;apport à prévoir
            à la réservation.
          </SectionText>
          <p className="mt-4 max-w-[560px] text-[16.5px] font-normal leading-[1.9] text-forest/70">
            Indiquez votre budget et estimez l&apos;apport à prévoir pour réserver votre appartement
            neuf à Guéliz.
          </p>
        </Reveal>

        <Reveal direction="right">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-3xl border border-forest/8 bg-shell p-7 shadow-[0_24px_60px_-40px_rgba(45,58,45,0.4)] md:p-10"
          >
            {/* Honeypot: hidden from users and assistive tech, filled only by
                bots. Unlabelled, as in the static build — the contact form's
                equivalent carries a label, this one deliberately does not. */}
            <input
              id={`apport-company-website-${idSuffix}`}
              type="text"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              className="absolute -left-[9999px] size-px overflow-hidden"
            />

            <div className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor={budgetId}
                  className={fieldLabel}
                >
                  Budget du bien
                </label>
                <div className="flex gap-3">
                  <input
                    id={budgetId}
                    name="budget"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ex : 1 300 000"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    aria-invalid={Boolean(errors.budget)}
                    aria-describedby={errors.budget ? `${budgetId}-error` : undefined}
                    className={cn(FIELD, errors.budget && 'border-red-500/60')}
                  />
                  <select
                    name="currency"
                    aria-label="Devise"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as 'MAD' | 'EUR')}
                    className={cn(FIELD, 'w-auto shrink-0 cursor-pointer pr-8')}
                  >
                    <option value="MAD">MAD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                {errors.budget && (
                  <p id={`${budgetId}-error`} className="mt-2 text-[15px] font-normal text-red-600">
                    {errors.budget}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={typologieId}
                  className={fieldLabel}
                >
                  Typologie <span className="normal-case tracking-normal">(optionnel)</span>
                </label>
                <select
                  id={typologieId}
                  name="typologie"
                  value={typologie}
                  onChange={(event) => setTypologie(event.target.value)}
                  className={cn(FIELD, 'cursor-pointer')}
                >
                  <option value="">Typologie</option>
                  {TYPOLOGIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className={fieldLabel}
                >
                  Votre adresse email
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Ex : contact@exemple.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${emailId}-error` : undefined}
                  className={cn(FIELD, errors.email && 'border-red-500/60')}
                />
                {errors.email && (
                  <p id={`${emailId}-error`} className="mt-2 text-[15px] font-normal text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <Button type="submit" variant="primary" disabled={submitting} className="mt-1">
                {submitting ? 'Calcul en cours…' : 'Voir mon apport estimé'}
              </Button>

              <p className="text-[15px] font-normal leading-relaxed text-forest/65">
                Estimation indicative et non contractuelle. Le montant réel dépend du prix exact, de
                la typologie, de la surface, de l&apos;étage et des disponibilités.
              </p>

              {formError && (
                <p role="alert" className="text-[16px] font-normal text-red-600">
                  {formError}
                </p>
              )}
            </div>

            {/* The result panel stays mounted and collapses to height 0 rather
                than unmounting. The legacy markup kept it in the DOM behind a
                `hidden` attribute, and its h3 is one of the homepage's counted
                headings — unmounting it would change the heading outline. */}
            <motion.div
              data-apport-result
              inert={result ? undefined : true}
              initial={false}
              animate={{ opacity: result ? 1 : 0, height: result ? 'auto' : 0 }}
              transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
                  <div className="mt-8 border-t border-forest/10 pt-8">
                    <h3 className="font-serif text-2xl font-light text-forest">
                      Votre estimation d&apos;apport
                    </h3>
                    <p className="mt-3 text-[16.5px] font-normal leading-[1.9] text-forest/75">
                      {result &&
                        `Pour un budget de ${result.budgetDisplay}, l'apport estimé à 30\u00a0% serait d'environ ${result.apportMadDisplay}, soit environ ${result.apportEurDisplay}.`}
                    </p>

                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      <ResultRow label="Budget saisi" value={result?.budgetDisplay ?? ''} />
                      <ResultRow label="Apport estimé (MAD)" value={result?.apportMadDisplay ?? ''} />
                      <ResultRow label="Apport estimé (EUR)" value={result?.apportEurDisplay ?? ''} />
                      {/* Kept in the DOM but hidden when empty, as the legacy
                          markup did — typologie is an optional field. */}
                      <ResultRow
                        label="Typologie"
                        value={result?.typologie ?? ''}
                        hidden={!result?.typologie}
                      />
                    </dl>

                    <p className="mt-6 text-[15px] font-normal leading-relaxed text-forest/65">
                      Cette estimation est indicative et non contractuelle. Le montant réel dépend
                      du prix exact, de la typologie, de la surface, de l&apos;étage et des
                      disponibilités au moment de la demande.
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <ButtonLink href={ROUTES.contact} variant="primary">
                        Recevoir les prix exacts
                      </ButtonLink>
                      <ButtonLink href={ROUTES.residences} variant="outline" tone="light">
                        Voir Honest Signature 7
                      </ButtonLink>
                    </div>
                  </div>
            </motion.div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

function ResultRow({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div hidden={hidden} className="rounded-xl bg-white px-4 py-3">
      <dt className="text-[13.5px] font-normal uppercase tracking-[2px] text-forest/75">{label}</dt>
      <dd className="mt-1 font-serif text-xl font-light text-forest">{value}</dd>
    </div>
  );
}
