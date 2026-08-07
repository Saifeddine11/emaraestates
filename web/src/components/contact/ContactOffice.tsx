import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel } from '@/components/ui/Section';
import { EXTERNAL } from '@/lib/site';

/** `.contact-office` — address block plus the same Maps embed the footer uses. */

const DETAILS = [
  {
    term: 'Adresse',
    detail: '2ème etage, Business center Paul, Rue Mouatamid Ibn Abaad, Marrakech 40000',
  },
  { term: 'Horaires', detail: 'Lun - Sam : 9h - 19h' },
  {
    term: 'Accompagnement',
    detail: 'Visite, sélection de lots, réservation et suivi administratif.',
  },
];

export function ContactOffice() {
  return (
    <section className="grid items-center gap-[clamp(34px,5vw,78px)] bg-shell px-[clamp(24px,5vw,70px)] py-[clamp(74px,8vw,120px)] lg:grid-cols-[minmax(0,0.78fr)_minmax(360px,1fr)]">
      <Reveal direction="left">
        <SectionLabel>Notre bureau</SectionLabel>
        <h2 className="mb-7 max-w-[620px] text-balance font-serif text-[clamp(38px,4.4vw,64px)] font-light leading-[1.04] text-forest">
          Un point de contact au coeur de Marrakech
        </h2>
        <dl className="grid max-w-[620px] gap-[18px]">
          {DETAILS.map((item) => (
            <div key={item.term} className="border-l-2 border-bronze pl-5">
              <dt className="mb-[5px] text-[13.5px] uppercase tracking-[3px] text-bronze">
                {item.term}
              </dt>
              <dd className="text-[17px] font-normal leading-[1.75] text-forest/75">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal direction="right">
        <div className="overflow-hidden rounded-lg">
          <iframe
            title="Carte du bureau Emara Estates à Marrakech"
            src={EXTERNAL.mapsEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="block min-h-[310px] w-full border-0 md:min-h-[430px]"
          />
        </div>
      </Reveal>
    </section>
  );
}
