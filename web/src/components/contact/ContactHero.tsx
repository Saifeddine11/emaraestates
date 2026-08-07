import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel } from '@/components/ui/Section';
import { ContactForm } from '@/components/forms/ContactForm';
import { CONTACT, SOCIAL, WHATSAPP } from '@/lib/site';

/**
 * `.contact-hero`, the full-viewport photo band that carries both the editorial
 * column and the request form.
 *
 * The legacy page hand-preloaded `img/hero-optimized.webp` with
 * `fetchpriority="high"`; a `priority` next/image emits that preload itself.
 *
 * The WhatsApp quick link uses the "échange" prefill, which is specific to this
 * route — see WHATSAPP in lib/site.ts.
 */

const SOCIAL_LINKS = [
  { href: SOCIAL.instagram, label: 'Instagram Emara Estates', icon: 'instagram.png' },
  { href: SOCIAL.tiktok, label: 'TikTok Emara Estates', icon: 'tik-tok.png' },
  { href: SOCIAL.snapchat, label: 'Snapchat Emara Estates', icon: 'snapchat.png' },
];

const QUICK_LINKS = [
  { href: 'tel:+212670038899', label: 'Téléphone', value: CONTACT.phoneDisplay },
  { href: WHATSAPP.echange, label: 'WhatsApp', value: 'Réponse rapide', external: true },
  { href: `mailto:${CONTACT.email}`, label: 'Email', value: CONTACT.email },
];

export function ContactHero() {
  return (
    <section className="relative isolate flex items-center overflow-hidden bg-forest px-[clamp(22px,4vw,60px)] pb-[58px] pt-[112px] md:min-h-svh">
      <Image
        src="/img/hero-optimized.webp"
        alt="Marrakech et immobilier haut standing accompagné par Emara Estates"
        fill
        priority
        sizes="100vw"
        className="-z-[3] object-cover [filter:saturate(0.9)_contrast(1.04)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-[2] bg-[linear-gradient(90deg,rgba(18,24,18,0.86)_0%,rgba(45,58,45,0.68)_48%,rgba(18,24,18,0.82)_100%),linear-gradient(180deg,rgba(18,24,18,0.2)_0%,rgba(18,24,18,0.82)_100%)]"
      />

      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-[clamp(34px,5vw,78px)] max-lg:max-w-[780px] lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.78fr)]">
        <Reveal direction="left">
          <SectionLabel tone="dark" className="text-[#f0ddba]">
            Contact
          </SectionLabel>
          <h1 className="max-w-[680px] text-balance font-serif text-[clamp(44px,6.4vw,86px)] font-light leading-[0.98] text-cream">
            Parlons de votre projet à Marrakech
          </h1>
          <p className="mt-6 max-w-[580px] text-[clamp(16px,1.45vw,20px)] font-normal leading-[1.9] text-cream/[0.82]">
            Vous souhaitez recevoir les plans, les prix ou organiser une visite ? L&apos;équipe
            Emara Estates vous répond avec une information claire, adaptée à votre budget et à votre
            calendrier.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-[18px]">
            <span className="text-[0.78rem] uppercase tracking-[0.16em] text-[#D2B178]">
              Suivez-nous
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(210,177,120,0.28)] bg-[rgba(250,248,244,0.04)] transition-colors duration-300 hover:border-[rgba(210,177,120,0.65)] hover:bg-[rgba(210,177,120,0.08)]"
                >
                  <Image
                    src={`/img/iconsocailmedia/${social.icon}`}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2.5 md:mt-[34px] md:grid-cols-3 md:gap-3 lg:max-w-[690px]">
            {QUICK_LINKS.map((quick) => (
              <a
                key={quick.href}
                href={quick.href}
                {...(quick.external ? { target: '_blank', rel: 'noopener' } : {})}
                className="min-w-0 rounded-lg border border-cream/20 bg-cream/[0.08] px-4 py-[18px] transition-all duration-300 hover:border-[rgba(240,221,186,0.42)] hover:bg-cream/[0.13]"
              >
                <span className="mb-2 block text-[13.5px] font-normal uppercase tracking-[2.6px] text-[#f0ddba]">
                  {quick.label}
                </span>
                <strong className="block text-[16.5px] font-normal leading-[1.45] text-cream/[0.92] [overflow-wrap:anywhere]">
                  {quick.value}
                </strong>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal direction="right">
          {/* `.contact-panel`: a light card sitting on the darkened photo, not
              a glass panel — the legacy background is rgba(250,248,244,.96). */}
          <section
            aria-labelledby="contact-form-title"
            className="rounded-lg border border-cream/[0.26] bg-[rgba(250,248,244,0.96)] p-[clamp(24px,3vw,36px)] text-forest shadow-[0_34px_90px_rgba(0,0,0,0.24)]"
          >
            <div className="mb-[22px]">
              <div className="mb-2.5 text-[13.5px] uppercase tracking-[3px] text-bronze">
                Demande privée
              </div>
              <h2
                id="contact-form-title"
                className="font-serif text-[clamp(31px,3vw,44px)] font-light leading-[1.08] text-forest"
              >
                Recevoir les informations
              </h2>
              <p className="mt-2.5 text-[16px] font-normal leading-[1.7] text-forest/75">
                Un conseiller vous recontacte avec les disponibilités, plans et prochaines visites
                possibles.
              </p>
              <p className="mt-2.5 text-[16px] font-normal leading-[1.7] text-forest/75">
                Contactez Emara Estates pour recevoir les plans, prix et disponibilités des
                appartements neufs à Guéliz Marrakech, ou pour organiser une visite du programme
                Honest Signature 7.
              </p>
            </div>

            <ContactForm variant="plain" />
          </section>
        </Reveal>
      </div>
    </section>
  );
}
