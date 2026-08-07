import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { ProjectShowcase } from './ProjectShowcase';
import { VirtualTour } from '@/components/sections/VirtualTour';
import { ApportSimulator } from '@/components/forms/ApportSimulator';

/**
 * `#biens` — projects on plan.
 *
 * Opens with the plaza track and the Apple-style Honest Signature 7
 * showcase. The plaza headline lives in the compact MapSection card.
 * Indexed label / h2 / body copy stay in the DOM after the showcase so
 * heading hierarchy and SEO wording are preserved. Immersion 3D and the
 * apport simulator follow. Honest 5 lives in `#nos-réalisations`.
 */

const TRACK_ITEMS = [
  { lead: '1 Min ', rest: 'À pied du Plaza' },
  { lead: 'Honest Signature', rest: 'Promoteur partenaire' },
  { lead: 'SECTEUR', rest: 'Marché aux Fleurs, Guéliz, Marrakech' },
];

export function ProjectsSection() {
  return (
    <section id="biens" className="scroll-mt-24 bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto w-full max-w-[1320px]">
        <Reveal>
          <div className="mx-auto flex max-w-[1180px] flex-col items-stretch gap-5 rounded-2xl bg-forest px-6 py-6 md:flex-row md:items-center md:justify-center md:gap-10 md:px-10 md:py-7">
            {TRACK_ITEMS.map((item, index) => (
              <div key={item.rest} className="contents">
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className="hidden h-8 w-px shrink-0 bg-olive/20 md:block"
                  />
                )}
                <div className="flex-1 text-center uppercase tracking-[2px]">
                  <span className="mb-2 block text-[clamp(26px,2.4vw,32px)] font-normal leading-none tracking-normal text-bronze normal-case">
                    {item.lead}
                  </span>
                  <span className="block text-[13px] font-medium leading-[1.55] text-cream/90 sm:text-[13.5px]">
                    {item.rest}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <ProjectShowcase />

        {/* Indexed intro copy — kept after the visual block so the hero stays
            minimal without dropping SEO wording or the section h2. */}
        <div className="mt-16 max-w-[720px] md:mt-20">
          <SectionLabel>Nos projets sur plans</SectionLabel>
          <SectionTitle>Honest Signature 7 à Guéliz Marrakech</SectionTitle>
          <SectionText className="mt-5">
            Emara Estates sélectionne des appartements neufs à Guéliz Marrakech pour les acheteurs
            exigeants, les investisseurs et les clients qui souhaitent sécuriser un bien neuf dans
            un emplacement stratégique. Notre accompagnement couvre la découverte du programme
            immobilier Marrakech, les plans, les prix, les disponibilités et l&apos;organisation
            d&apos;une visite.
          </SectionText>
        </div>

        <VirtualTour />
        <ApportSimulator idSuffix="home" />
      </div>
    </section>
  );
}
