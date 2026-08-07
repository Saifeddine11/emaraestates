import { PropertySlider } from '@/components/gallery/PropertySlider';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { SUMMARY_SLIDES } from '@/lib/content/residences';

/**
 * `#apercu` — the featured card that overlaps the hero.
 *
 * The legacy `.project-summary` pulls itself up over the hero with a negative
 * margin (-120px desktop / -52px mobile); that overlap is what makes the card
 * read as part of the hero composition, so it is kept.
 */

const TYPE_PILLS = ['Studio', 'Appartement', 'Duplex', 'Magasin commercial'];

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-forest/12 bg-forest/[0.04] px-3.5 py-1.5 text-[13.5px] font-normal uppercase tracking-[1.5px] text-forest/75">
      {children}
    </span>
  );
}

function Detail({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-serif text-2xl font-normal leading-none text-forest">{value}</span>
      <span className="text-[15px] font-normal tracking-wide text-forest/75">{label}</span>
      {note && <span className="text-[15px] font-normal text-forest/65">{note}</span>}
    </div>
  );
}

export function ProjectSummary() {
  return (
    <section id="apercu" className="relative z-[4] -mt-[52px] scroll-mt-28 md:-mt-[120px]">
      <Reveal>
        <article className="overflow-hidden rounded-3xl border border-forest/8 bg-white shadow-[0_30px_80px_rgba(24,29,24,0.14)]">
          <div className="relative min-h-[340px] md:aspect-[16/9] md:min-h-0">
            <PropertySlider
              images={SUMMARY_SLIDES}
              delay={3800}
              className="absolute inset-0"
              sizes="(max-width: 1024px) 100vw, 1200px"
              priority
            />
            <div className="pointer-events-none absolute left-5 top-5 z-[5] rounded-full bg-bronze px-4 py-2 text-[13.5px] font-normal uppercase tracking-[2px] text-white shadow-lg">
              Disponible
            </div>
            <div className="pointer-events-none absolute bottom-5 left-5 z-[5] rounded-full bg-forest/85 px-4 py-2 text-[15px] font-normal tracking-wide text-cream backdrop-blur-sm">
              Lancement 2026 · Première livraison 2028
            </div>
          </div>

          <div className="flex flex-col gap-6 p-7 md:p-12">
            <div>
              <h2 className="font-serif text-[clamp(36px,3.6vw,50px)] font-normal leading-tight text-forest">
                Guéliz hyper-centre, Marrakech
              </h2>
              <p className="mt-2 text-[16px] font-normal tracking-wide text-bronze">
                Adresse prime · Promoteur Honest Signature
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {TYPE_PILLS.map((pill) => (
                <Pill key={pill}>{pill}</Pill>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 border-y border-forest/8 py-6 sm:grid-cols-3">
              <Detail value="39–140" label="m²" />
              <Detail value="30%" label="À la réservation" note="≈ 39 000 € d'apport" />
              <Detail value="2028" label="1ère livraison" />
            </div>

            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold uppercase tracking-[1.5px] text-forest/80">
                  À partir de
                </span>
                <span className="font-serif text-[clamp(36px,3.6vw,50px)] font-normal leading-none text-forest">
                  1,05 M MAD
                </span>
                <span className="text-[16px] font-normal text-forest/80">≈ 105 000 €</span>
                <span className="text-[15.5px] font-normal text-forest/75">~ 27 000 MAD/m²</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ButtonLink href="#prestations" variant="outline" tone="light">
                  Voir les détails
                </ButtonLink>
                <ButtonLink href="#contact-projet" variant="primary">
                  Demander une visite
                </ButtonLink>
              </div>
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
