import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { AMENITIES } from '@/lib/content/residences';

/** `#prestations` — six amenity cards with the legacy line-art icons. */
export function Amenities() {
  return (
    <section id="prestations" className="mt-28 scroll-mt-28">
      <Reveal>
        <SectionLabel>Prestations</SectionLabel>
        <SectionTitle>Un confort pensé comme une expérience</SectionTitle>
        <SectionText className="mt-6">
          Chaque détail vise à créer une expérience résidentielle plus sereine, plus élégante et plus
          cohérente dans le temps.
        </SectionText>
      </Reveal>

      <RevealGroup className="mt-14 grid gap-[18px] md:grid-cols-2 md:gap-7 xl:grid-cols-3">
        {AMENITIES.map((amenity) => (
          <RevealItem key={amenity.title}>
            <article className="group h-full rounded-3xl border border-forest/8 bg-white p-8 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-bronze/30 hover:shadow-[0_28px_60px_-40px_rgba(45,58,45,0.45)]">
              <div
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-full bg-forest/[0.04] text-bronze transition-colors duration-500 group-hover:bg-bronze/10"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {amenity.paths.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              </div>
              <h3 className="mt-6 font-serif text-2xl font-light leading-tight text-forest">
                {amenity.title}
              </h3>
              <p className="mt-3 text-[16.5px] font-normal leading-[1.9] text-forest/75">{amenity.text}</p>
            </article>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
