import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { SHOW_APARTMENT_POINTS } from '@/lib/content/residences';
import { ROUTES } from '@/lib/site';

/** `.show-apartment-section`, labelled by its own title. */
export function ShowApartment() {
  return (
    <section aria-labelledby="show-apartment-title" className="mt-28">
      <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <Reveal direction="left" className="relative aspect-[4/3] overflow-hidden rounded-3xl">
          <Image
            src="/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-01.webp"
            alt="Appartement témoin Honest Signature 7 à Guéliz Marrakech"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            loading="lazy"
            className="object-cover transition-transform duration-[1.2s] ease-premium hover:scale-[1.04]"
          />
        </Reveal>

        <Reveal direction="right">
          <div className="rounded-3xl border border-forest/8 bg-white p-8 shadow-[0_24px_60px_-45px_rgba(45,58,45,0.4)] md:p-12">
            <SectionLabel>Appartement témoin</SectionLabel>
            <SectionTitle
              id="show-apartment-title"
              className="text-[clamp(32px,3.4vw,48px)]"
            >
              Visitez l’appartement témoin Honest Signature 7
            </SectionTitle>
            <SectionText className="mt-6 text-[16px]">
              Découvrez concrètement les volumes, les finitions et l’ambiance du programme Honest
              Signature 7 à Guéliz. L’appartement témoin permet de mieux comparer les typologies,
              poser vos questions et avancer avec une vision claire avant réservation.
            </SectionText>

            <ul
              aria-label="Points clés de la visite"
              className="mt-8 grid gap-3 border-t border-forest/10 pt-7 sm:grid-cols-2"
            >
              {SHOW_APARTMENT_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-[16px] font-normal leading-[1.7] text-forest/75"
                >
                  <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-bronze" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href={ROUTES.contact} variant="primary">
                Planifier une visite de l’appartement témoin
              </ButtonLink>
              <ButtonLink href="#typologies" variant="outline" tone="light">
                Voir les typologies
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
