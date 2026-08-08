import { Reveal } from '@/components/motion/Reveal';
import { HandDrawnCircle } from '@/components/motion/HandDrawnCircle';
import { SectionLabel } from '@/components/ui/Section';
import { ProjectShowcase } from './ProjectShowcase';
import { VirtualTour } from '@/components/sections/VirtualTour';
import { ApportSimulator } from '@/components/forms/ApportSimulator';

/**
 * `#biens` — projects on plan.
 *
 * Opens with a strong Guéliz headline + subtitle, then the plaza track and
 * the Apple-style Honest Signature 7 showcase. Immersion 3D and the apport
 * simulator follow. Honest 5 lives in `#nos-réalisations`.
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
        <div className="max-w-[1180px]">
          <SectionLabel>Nos projets sur plans</SectionLabel>
          <h2 className="w-full max-w-none font-serif text-[clamp(36px,4vw,56px)] font-normal leading-[1.2] tracking-[-0.02em] text-forest lg:whitespace-nowrap">
            <HandDrawnCircle>Nouveau</HandDrawnCircle>
            {' '}
            projet au cœur de Guéliz
          </h2>
          <p className="mt-5 max-w-[38rem] text-[clamp(17px,1.4vw,20px)] font-normal leading-[1.65] text-forest/80 md:mt-6">
            Découvrez Honest Signature 7, un programme immobilier neuf situé à 1 minute à pied du
            Plaza, dans l&apos;un des secteurs les plus recherchés de Marrakech.
          </p>
        </div>

        <Reveal className="mt-12 md:mt-14">
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

        <VirtualTour />
        <ApportSimulator idSuffix="home" />
      </div>
    </section>
  );
}
