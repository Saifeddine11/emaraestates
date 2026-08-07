import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { ROUTES, WHATSAPP } from '@/lib/site';

/**
 * `#contact-projet` — closing conversion band.
 *
 * The WhatsApp link here is the bare number, with no prefilled message. The
 * homepage band uses a prefilled variant; the two are not interchangeable.
 */
export function ProjectCta() {
  return (
    <section
      id="contact-projet"
      className="relative mt-28 scroll-mt-28 overflow-hidden bg-forest px-[clamp(28px,5vw,60px)] py-[clamp(90px,11vw,140px)] text-center"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(155,112,64,0.1),transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-[900px]">
        <Reveal>
          <div className="mb-4 text-[14.5px] font-normal uppercase tracking-[5px] text-bronze">
            Votre Prochaine Étape
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="font-serif text-[clamp(42px,4.8vw,68px)] font-light leading-[1.12] text-cream">
            Recevoir les plans, prix et disponibilités
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-[680px] text-[clamp(17px,1.55vw,20px)] font-normal leading-[1.9] text-sand">
            Les disponibilités peuvent évoluer selon les typologies et l&apos;avancement commercial
            du programme. Pour obtenir les informations à jour, Emara Estates vous accompagne avec
            les plans, les prix indicatifs et l&apos;organisation d&apos;une visite.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-11 flex flex-wrap justify-center gap-4">
            <ButtonLink href={ROUTES.contact} variant="primary">
              Recevoir les disponibilités
            </ButtonLink>
            <ButtonLink href={WHATSAPP.bare} target="_blank" rel="noopener" variant="outline">
              WhatsApp
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
