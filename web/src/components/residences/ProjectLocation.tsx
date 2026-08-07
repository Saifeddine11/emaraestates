import { Reveal } from '@/components/motion/Reveal';
import { EditorialLink, SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { GUELIZ_MAP_EMBED, LOCATION_POINTS } from '@/lib/content/residences';
import { ROUTES } from '@/lib/site';

/** `#localisation` — neighbourhood rationale beside the Guéliz map. */
export function ProjectLocation() {
  return (
    <section
      id="localisation"
      className="mt-28 grid scroll-mt-28 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16"
    >
      <Reveal direction="left">
        <SectionLabel>Localisation</SectionLabel>
        <SectionTitle>Pourquoi Guéliz&nbsp;?</SectionTitle>
        <SectionText className="mt-6">
          Guéliz est l&apos;un des quartiers les plus recherchés de Marrakech pour son accessibilité,
          ses commerces, ses restaurants, ses services et sa proximité avec les principaux axes de la
          ville. Pour un achat immobilier neuf, cet emplacement renforce l&apos;intérêt du projet
          autant pour l&apos;usage personnel que pour l&apos;investissement.
        </SectionText>
        <SectionText className="mt-5">
          Pour approfondir votre projet, consultez notre page sur l&apos;
          <EditorialLink href={ROUTES.appartementNeufGueliz}>
            appartement neuf à Guéliz Marrakech
          </EditorialLink>{' '}
          ou l&apos;
          <EditorialLink href={ROUTES.investissement}>
            investissement immobilier à Marrakech
          </EditorialLink>
          .
        </SectionText>

        <ul className="mt-9 flex flex-col gap-4 border-t border-forest/10 pt-8">
          {LOCATION_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-[16.5px] font-normal leading-[1.8] text-forest/75"
            >
              <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-bronze" />
              {point}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal direction="right">
        <div className="overflow-hidden rounded-3xl border border-forest/8 bg-white shadow-[0_24px_60px_-45px_rgba(45,58,45,0.4)]">
          <iframe
            title="Carte de Guéliz hyper-centre Marrakech"
            src={GUELIZ_MAP_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="block h-[380px] w-full border-0 md:h-[460px]"
          />
        </div>
      </Reveal>
    </section>
  );
}
