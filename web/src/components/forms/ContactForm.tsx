'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneCountryInput } from '@/components/forms/PhoneCountryInput';
import { SuccessModal } from '@/components/forms/SuccessModal';
import { findCountry, normalizeLocalNumber, type Country } from '@/lib/countries';
import { ENDPOINTS } from '@/lib/site';
import { cn } from '@/lib/cn';
import { fieldInput, fieldLabel } from '@/components/ui/form-tokens';

/**
 * `#contactForm` → `POST /contact.php`.
 *
 * Shared by the homepage `#contact` section and the `/contact` page: the static
 * build ships byte-identical markup in both places, down to the field ids, and
 * the two never render together.
 *
 * The POST body reproduces js/contact-form.js field for field, including the
 * legacy `telephone` duplicate of `phoneFull` and the `elapsed_ms` timer that
 * the server uses to reject sub-3s submissions. The `company_website` honeypot
 * is answered with the success message and never sent, matching the old
 * silent-accept behaviour. Field names are a wire contract consumed downstream
 * by HubSpot/Zapier — renaming one drops data on the floor.
 */

const BUDGETS = ['1M - 1.5M MAD', '2M - 3M MAD', '+3M MAD'];

const GENERIC_ERROR =
  'Votre demande n’a pas pu être envoyée. Contactez-nous directement par WhatsApp.';
const BAD_RESPONSE =
  'Le serveur de contact ne répond pas correctement. Contactez-nous directement par WhatsApp.';

/**
 * Metrics come from the legacy `.contact-form input` rule: 16px text, 18/20px
 * padding, 64px min-height. The 16px matters beyond looks — iOS zooms the
 * viewport when a focused control renders below it.
 */
/** Shared control styling. Class strings only — the DOM is untouched. */
const FIELD = fieldInput;

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={fieldLabel}
    >
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[15px] font-normal text-red-600">
      {message}
    </p>
  );
}

/**
 * `card` is the homepage treatment, where the form supplies its own surface.
 * `plain` is `/contact`, where `.contact-panel` is already the light card and
 * the form sits directly inside it with a full-width submit.
 */
export function ContactForm({
  variant = 'card',
  className,
}: {
  variant?: 'card' | 'plain';
  className?: string;
}) {
  const plain = variant === 'plain';
  const [country, setCountry] = useState<Country>(() => findCountry('MA'));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Anti-spam timer: the server rejects anything submitted in under 3 seconds.
  // Started on mount, not during render, so the server and client agree.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const hasLeadContent = () =>
    [name, email, phoneNumber, budget, message].some((value) => value.trim() !== '');

  function resetForm() {
    setName('');
    setEmail('');
    setPhoneNumber('');
    setBudget('');
    setMessage('');
    setErrors({});
    startedAt.current = Date.now();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFeedback('');

    if (honeypot.trim()) {
      // Silently accept: a bot filled the trap.
      setFeedback(
        'Votre demande a bien été envoyée. Merci, notre équipe vous contactera dans les plus brefs délais.',
      );
      return;
    }

    const hadLeadContent = hasLeadContent();
    const localNumber = normalizeLocalNumber(phoneNumber, country.code);
    const phoneFull = localNumber ? `${country.code}${localNumber}` : '';

    setSubmitting(true);

    try {
      const response = await fetch(ENDPOINTS.contact, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          nom_complet: name,
          email,
          telephone: phoneFull,
          phoneFull,
          phoneCode: country.code,
          phoneCountry: country.country,
          phoneCountryCode: country.countryCode,
          phoneNumber: localNumber,
          budget,
          message,
          jour_visite: '',
          source: window.location.href,
          company_website: honeypot,
          elapsed_ms: Date.now() - startedAt.current,
        }),
      });

      const text = await response.text();
      let payload: { message?: string; errors?: Record<string, string> } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        setFeedback(BAD_RESPONSE);
        return;
      }

      if (!response.ok) {
        if (payload.errors) setErrors(payload.errors);
        setFeedback(payload.message ?? GENERIC_ERROR);
        return;
      }

      if (typeof payload.message !== 'string') {
        setFeedback(BAD_RESPONSE);
        return;
      }

      resetForm();
      if (hadLeadContent) setModalOpen(true);
    } catch {
      setFeedback(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        id="contactForm"
        onSubmit={handleSubmit}
        noValidate
        className={cn(
          !plain &&
            'rounded-3xl border border-forest/8 bg-shell p-7 shadow-[0_24px_60px_-40px_rgba(45,58,45,0.4)] md:p-10',
          className,
        )}
      >
        <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
          <label htmlFor="company-website">Site web</label>
          <input
            id="company-website"
            name="company_website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <div className={cn('flex flex-col', plain ? 'gap-4' : 'gap-5')}>
          <div>
            <FieldLabel htmlFor="contact-name">Nom complet</FieldLabel>
            <input
              id="contact-name"
              name="nom_complet"
              type="text"
              maxLength={80}
              autoComplete="name"
              placeholder="Nom complet"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.nom_complet)}
              aria-describedby={errors.nom_complet ? 'error-nom_complet' : undefined}
              className={cn(FIELD, errors.nom_complet && 'border-red-500/60')}
            />
            <FieldError id="error-nom_complet" message={errors.nom_complet} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="contact-email">Email</FieldLabel>
              <input
                id="contact-email"
                name="email"
                type="email"
                maxLength={120}
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'error-email' : undefined}
                className={cn(FIELD, errors.email && 'border-red-500/60')}
              />
              <FieldError id="error-email" message={errors.email} />
            </div>

            <div>
              <FieldLabel htmlFor="contact-phone">Téléphone</FieldLabel>
              <PhoneCountryInput
                country={country}
                onCountryChange={setCountry}
                number={phoneNumber}
                onNumberChange={setPhoneNumber}
                invalid={Boolean(errors.telephone)}
                describedBy={errors.telephone ? 'error-telephone' : undefined}
              />
              <FieldError id="error-telephone" message={errors.telephone} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="budget-select">Budget</FieldLabel>
            <select
              id="budget-select"
              name="budget"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? 'error-budget' : undefined}
              className={cn(FIELD, 'cursor-pointer', errors.budget && 'border-red-500/60')}
            >
              <option value="">Budget</option>
              {BUDGETS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError id="error-budget" message={errors.budget} />
          </div>

          <div>
            <FieldLabel htmlFor="contact-message">Décrivez votre projet</FieldLabel>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              maxLength={1200}
              placeholder="Décrivez votre projet"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'error-message' : undefined}
              className={cn(
                FIELD,
                'resize-y',
                plain && 'min-h-[126px]',
                errors.message && 'border-red-500/60',
              )}
            />
            <FieldError id="error-message" message={errors.message} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'mt-1 cursor-pointer rounded-[10px] bg-bronze px-12 py-5 text-[14.5px] font-normal uppercase tracking-[3px] text-white transition-all duration-400 ease-premium hover:-translate-y-0.5 hover:bg-forest hover:shadow-[0_10px_30px_rgba(45,58,45,0.2)] disabled:cursor-not-allowed disabled:opacity-60',
              plain
                ? 'w-full self-stretch rounded-lg'
                : 'self-start max-md:w-full max-md:self-stretch',
            )}
          >
            {submitting ? 'Envoi...' : 'Envoyer la demande'}
          </button>

          <div
            id="form-feedback"
            role="status"
            aria-live="polite"
            className="text-[16px] font-normal text-[#8f3f2f] empty:hidden"
          >
            {feedback}
          </div>
        </div>
      </form>

      <SuccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
