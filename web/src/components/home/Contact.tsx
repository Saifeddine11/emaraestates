import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel } from '@/components/ui/Section';
import { ContactForm } from '@/components/forms/ContactForm';
import { CONTACT } from '@/lib/site';

/**
 * `#contact`. The form itself is shared with the `/contact` page; only the
 * editorial column differs between the two.
 */

export function Contact() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <Reveal direction="left">
          <SectionLabel>Contact</SectionLabel>
          <p className="font-serif text-[clamp(38px,4.2vw,58px)] font-normal leading-[1.12] text-forest">
            Parlons de votre projet
          </p>
          <p className="mt-5 text-[17px] font-normal leading-[1.65] text-forest/80">
            Notre équipe basée à Guéliz vous répond sous 24h.
          </p>

          <dl className="mt-12 flex flex-col gap-7">
            <div>
              <dt className="text-[14px] font-semibold uppercase tracking-[1.5px] text-bronze">
                Adresse
              </dt>
              <dd className="mt-1.5 text-[16.5px] font-normal leading-[1.8] text-forest">
                {CONTACT.addressLine1}
                <br />
                {CONTACT.addressLine2}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-semibold uppercase tracking-[1.5px] text-bronze">
                Téléphone
              </dt>
              <dd className="mt-1.5 text-[16.5px] font-normal text-forest">
                {CONTACT.phoneDisplay}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-semibold uppercase tracking-[1.5px] text-bronze">Email</dt>
              <dd className="mt-1.5 text-[16.5px] font-normal">
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="border-b border-bronze/40 text-forest transition-colors duration-300 hover:text-bronze"
                >
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-semibold uppercase tracking-[1.5px] text-bronze">
                Horaires
              </dt>
              <dd className="mt-1.5 text-[16.5px] font-normal text-forest">{CONTACT.hours}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal direction="right">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

