import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/Section';

/**
 * Project hero, ported from `.project-hero`.
 *
 * The legacy background was a CSS `url()` on `.project-hero__bg`, which the
 * page had to hand-preload with `fetchpriority="high"`. Rendering it as a
 * `priority` next/image emits that preload automatically and gives the browser
 * intrinsic dimensions, so the LCP frame no longer depends on the stylesheet
 * parsing first.
 */
export function ProjectHero() {
  return (
    <header className="relative flex min-h-[86vh] items-center justify-center overflow-hidden bg-forest px-6 pb-[88px] pt-[136px] md:min-h-[92vh] md:px-[60px] md:pb-[120px] md:pt-40">
      <Image
        src="/img/honest007.webp"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="scale-105 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,58,45,0.78)_0%,rgba(45,58,45,0.55)_35%,rgba(45,58,45,0.92)_100%),radial-gradient(circle_at_50%_30%,rgba(155,112,64,0.16),transparent_45%)]"
      />

      <div className="relative z-[2] w-full max-w-[980px] text-center">
        <SectionLabel tone="dark" centered rule={false}>
          Programme Signature
        </SectionLabel>
        <h1 className="mb-[22px] font-serif text-[clamp(52px,7vw,108px)] font-light leading-[0.96] text-cream">
          {/* Keeps the "7" with the name it belongs to on narrow screens.
              Markup only — the text content is unchanged. */}
          Honest <span className="whitespace-nowrap">Signature 7</span> à Guéliz Marrakech
        </h1>
        <p className="mx-auto w-full max-w-[760px] text-[clamp(18px,2vw,22px)] font-normal leading-[1.9] text-cream/[0.82]">
          Programme immobilier neuf haut standing à Guéliz, Marrakech, avec studios, appartements,
          duplex et commerces sélectionnés pour habiter, investir ou préparer un projet locatif.
        </p>
        <div className="mt-[38px] flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href="#contact-projet" variant="primary">
            Recevoir la brochure
          </ButtonLink>
          <ButtonLink href="#galerie" variant="outline" tone="dark">
            Explorer le projet
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
