import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { SERVICES } from '@/lib/content/home';

/** `#services` — the four-step accompaniment, on the dark forest panel. */
export function Services() {
  return (
    <section
      id="services"
      className="scroll-mt-24 bg-forest px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <div className="mx-auto w-full max-w-[1320px]">
        <Reveal>
          <SectionLabel tone="dark">Notre accompagnement</SectionLabel>
          <SectionTitle tone="dark">
            De la visite à la
            <br />
            remise des clés
          </SectionTitle>
          <SectionText tone="dark" className="mt-6">
            Que vous achetiez pour habiter ou pour investir, nous vous guidons à chaque étape avec
            rigueur et transparence.
          </SectionText>
        </Reveal>

        <RevealGroup className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-cream/10 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((service) => (
            <RevealItem
              key={service.number}
              className="group bg-forest p-8 transition-colors duration-500 ease-premium hover:bg-cream/[0.03] md:p-10"
            >
              <div className="font-serif text-5xl font-light leading-none text-bronze/50 transition-colors duration-500 ease-premium group-hover:text-bronze">
                {service.number}
              </div>
              {/* Not a heading — preserves the page's heading hierarchy. */}
              <p className="mt-7 font-serif text-2xl font-normal text-cream">{service.title}</p>
              <p className="mt-4 text-[16.5px] font-normal leading-[1.7] text-cream/82">
                {service.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
