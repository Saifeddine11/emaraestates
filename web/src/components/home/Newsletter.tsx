'use client';

import { useState, type FormEvent } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { ENDPOINTS } from '@/lib/site';
import { cn } from '@/lib/cn';
import { fieldInput } from '@/components/ui/form-tokens';

/**
 * Newsletter signup. Posts `{ email, website, page_url }` to /newsletter.php —
 * the same payload the legacy js/newsletter.js sent, including the `website`
 * honeypot.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const INVALID = 'Veuillez entrer une adresse email valide.';
const ERROR = 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setMessage(INVALID);
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch(ENDPOINTS.newsletter, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, website, page_url: window.location.href }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        setStatus('ok');
        setMessage(data?.message ?? 'Merci. Votre inscription a bien été prise en compte.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data?.message ?? ERROR);
      }
    } catch {
      setStatus('error');
      setMessage(ERROR);
    }
  }

  return (
    <section
      id="newsletter"
      className="scroll-mt-24 bg-shell px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <Reveal className="mx-auto w-full max-w-[1320px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <SectionLabel>Newsletter</SectionLabel>
            <SectionTitle>Recevez les nouveaux projets Emara Estates</SectionTitle>
            <SectionText className="mt-6">
              Soyez informé en priorité des nouveaux programmes immobiliers, appartements neufs à
              Guéliz, disponibilités et opportunités sélectionnées à Marrakech.
            </SectionText>
          </div>

          <div className="rounded-card border border-forest/8 bg-white p-7 shadow-card md:p-10">
            <form id="newsletterForm" onSubmit={handleSubmit} noValidate>
              <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
                <label htmlFor="newsletter-website">Site web</label>
                <input
                  id="newsletter-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label className="sr-only-legacy" htmlFor="newsletter-email">
                    Votre adresse email
                  </label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="Votre adresse email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={cn(fieldInput, 'bg-shell')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="min-h-[52px] shrink-0 cursor-pointer rounded-[12px] bg-bronze px-8 text-[13.5px] font-medium uppercase tracking-[2px] text-white transition-all duration-[var(--duration-hover)] ease-premium hover:bg-forest active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'sending' ? 'Envoi…' : 'S’abonner'}
                </button>
              </div>

              <p
                id="newsletter-message"
                role="status"
                aria-live="polite"
                className={cn(
                  'mt-3 text-[16px] font-normal',
                  status === 'ok' && 'text-forest',
                  status === 'error' && 'text-red-600',
                )}
              >
                {message}
              </p>

              <p className="mt-4 text-[16px] font-normal leading-[1.65] text-forest/75">
                En vous inscrivant, vous acceptez d’être contacté par Emara Estates au sujet de ses
                projets immobiliers. Vous pouvez demander votre désinscription à tout moment.
              </p>
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
