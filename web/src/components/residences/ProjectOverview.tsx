import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { EditorialLink, SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { SIGNATURE_POINTS } from '@/lib/content/residences';
import { ROUTES } from '@/lib/site';

/** `.project-overview` — editorial copy beside the perspective visual. */
export function ProjectOverview() {
  return (
    <section className="mt-28 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <Reveal direction="left">
        <SectionLabel>L&apos;Adresse</SectionLabel>
        <SectionTitle>Un projet pensé pour le rythme premium de Guéliz</SectionTitle>
        <SectionText className="mt-6">
          Honest Signature 7 est un programme immobilier neuf à Guéliz, Marrakech, composé de
          studios, appartements, duplex et commerces. Avec des surfaces de 39 à 140 m², une première
          livraison prévue en 2028 et un prix d&apos;appel à partir de 1,05 M MAD, le programme
          s&apos;adresse aux acheteurs qui recherchent un bien neuf en hyper-centre de Marrakech.
        </SectionText>
        <SectionText className="mt-5">
          Pour comparer votre projet, consultez aussi notre page dédiée à l&apos;
          <EditorialLink href={ROUTES.appartementNeufGueliz}>
            appartement neuf à Guéliz
          </EditorialLink>{' '}
          et notre approche de l&apos;
          <EditorialLink href={ROUTES.investissement}>
            investissement immobilier à Marrakech
          </EditorialLink>
          .
        </SectionText>

        <dl className="mt-10 flex flex-col gap-6 border-t border-forest/10 pt-8">
          {SIGNATURE_POINTS.map((point) => (
            <div key={point.title}>
              <dt className="text-[13.5px] font-normal uppercase tracking-[2.5px] text-bronze">
                {point.title}
              </dt>
              <dd className="mt-2 text-[16.5px] font-normal leading-[1.9] text-forest/75">{point.text}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal direction="right" className="relative">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          <Image
            src="/img/honest007.webp"
            alt="Perspective extérieure d'Honest Signature 7 à Guéliz Marrakech"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            loading="lazy"
            className="object-cover transition-transform duration-[1.2s] ease-premium hover:scale-[1.04]"
          />
        </div>
        <div className="mx-6 -mt-14 rounded-2xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(45,58,45,0.4)] md:mx-10">
          <span className="font-serif text-3xl font-light text-forest">39-140 m²</span>
          <p className="mt-2 text-[16px] font-normal leading-[1.8] text-forest/75">
            Studios, appartements, duplex et commerces à Guéliz hyper-centre
          </p>
        </div>
      </Reveal>
    </section>
  );
}
