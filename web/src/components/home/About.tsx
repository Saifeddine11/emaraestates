import Image from 'next/image';
import { Reveal } from '@/components/motion/Reveal';
import { EditorialLink, SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { ABOUT_VALUES } from '@/lib/content/home';
import { ROUTES } from '@/lib/site';

/**
 * `#about`. Carries three internal SEO links in the body copy
 * (immobilier-luxe / appartement-neuf-gueliz / investissement) — part of the
 * site's internal linking structure, so the anchor text stays as written.
 */
export function About() {
  return (
    <section
      id="about"
      className="scroll-mt-24 bg-cream px-[clamp(28px,5vw,60px)] py-[clamp(80px,10vw,130px)]"
    >
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <Reveal direction="left" className="relative">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
            <Image
              src="/img/aboutme.webp"
              alt="Portrait de la fondatrice d'Emara Estates à Marrakech"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              loading="lazy"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-forest/85 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <span className="block font-serif text-3xl font-normal text-cream">Ehab</span>
              <span className="mt-1 block text-[14px] font-semibold uppercase tracking-[1.5px] text-cream/88">
                CEO &amp; Fondateur — Emara Estates
              </span>
            </div>
          </div>

          <div className="absolute -right-4 top-8 rounded-2xl bg-bronze px-7 py-5 text-center shadow-[0_20px_50px_-20px_rgba(155,112,64,0.6)] lg:-right-8">
            <div className="font-serif text-4xl font-normal leading-none text-white">12</div>
            <div className="mt-1 text-[13px] font-semibold uppercase tracking-[1.5px] text-white">
              ans d&apos;excellence
            </div>
          </div>
        </Reveal>

        <Reveal direction="right">
          <SectionLabel>Qui sommes-nous ?</SectionLabel>
          <SectionTitle>
            Votre partenaire
            <br />
            immobilier à Guéliz
          </SectionTitle>

          <SectionText className="mt-6">
            Emara Estates est née d&apos;une conviction : l&apos;immobilier à Marrakech mérite un
            accompagnement à la hauteur de son potentiel. Basée en hyper-centre de Guéliz, notre
            équipe accompagne ses clients dans l&apos;acquisition d&apos;appartements neufs de haut
            standing, que vous résidiez au Maroc ou à l&apos;international.
          </SectionText>

          <SectionText className="mt-5">
            Découvrez aussi{' '}
            <EditorialLink href={ROUTES.immobilierLuxe}>
              l&apos;immobilier luxe à Marrakech
            </EditorialLink>
            , les{' '}
            <EditorialLink href={ROUTES.appartementNeufGueliz}>
              appartements neufs à Guéliz
            </EditorialLink>{' '}
            ou l&apos;
            <EditorialLink href={ROUTES.investissement}>
              investissement immobilier à Marrakech
            </EditorialLink>
            .
          </SectionText>

          <div className="mt-12 flex flex-col gap-8">
            {ABOUT_VALUES.map((value) => (
              <div key={value.title} className="border-l border-bronze/30 pl-6">
                {/* Not a heading — preserves the page's heading hierarchy. */}
                <p className="font-serif text-xl font-normal text-forest">{value.title}</p>
                <p className="mt-2 text-[16.5px] font-normal leading-[1.9] text-forest/75">{value.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
