import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { TYPOLOGIES } from '@/lib/content/residences';

/** `#typologies` — copy on the left, four cards on the right. */
export function Typologies() {
  return (
    <section id="typologies" className="mt-28 grid scroll-mt-28 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <Reveal direction="left">
        <SectionLabel>Typologies</SectionLabel>
        <SectionTitle>Des typologies adaptées à plusieurs projets</SectionTitle>
        <SectionText className="mt-6">
          Studios, appartements, duplex et commerces permettent de répondre à différents objectifs :
          résidence principale, pied-à-terre à Marrakech, investissement locatif ou acquisition
          patrimoniale dans un emplacement central.
        </SectionText>
      </Reveal>

      <RevealGroup className="grid gap-[18px] sm:grid-cols-2 sm:gap-6">
        {TYPOLOGIES.map((item) => (
          <RevealItem key={item.kicker}>
            <article className="h-full rounded-3xl border border-forest/8 bg-white p-7 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-bronze/30 hover:shadow-[0_28px_60px_-40px_rgba(45,58,45,0.45)]">
              <span className="text-[13.5px] font-normal uppercase tracking-[2.5px] text-bronze">
                {item.kicker}
              </span>
              <h3 className="mt-4 font-serif text-2xl font-light leading-tight text-forest">
                {item.title}
              </h3>
              <p className="mt-3 text-[16.5px] font-normal leading-[1.9] text-forest/75">{item.text}</p>
            </article>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
