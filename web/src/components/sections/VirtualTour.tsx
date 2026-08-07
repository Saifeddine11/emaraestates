import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { EXTERNAL, ROUTES } from '@/lib/site';

/** 3D tour promo. Both destinations are external/legacy, so plain anchors. */
export function VirtualTour() {
  return (
    <Reveal id="visite-3d" className="mt-28 scroll-mt-28">
      <div className="grid items-center gap-10 rounded-3xl bg-forest px-7 py-12 sm:px-10 sm:py-14 md:gap-12 md:px-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-16">
        <div>
          <div className="mb-5 text-[14.5px] font-semibold uppercase tracking-[2px] text-bronze sm:text-[15px] sm:tracking-[2.2px]">
            Immersion 3D
          </div>
          <h2 className="max-w-[16ch] font-serif text-[clamp(38px,5.2vw,68px)] font-normal leading-[1.12] tracking-[-0.02em] text-cream text-balance">
            Visitez Honest Signature 7 en 3D
          </h2>
          <p className="mt-5 max-w-[600px] text-[16.5px] font-normal leading-[1.65] text-cream/90 sm:mt-6 sm:text-[18px] lg:text-[19px]">
            Explorez l&apos;univers Honest Signature 7 grâce à une expérience interactive permettant
            de visualiser le programme, ses espaces et son ambiance avant de demander les plans,
            prix et disponibilités.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
            <ButtonLink
              href={EXTERNAL.virtualTour3d}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="min-h-[58px] px-8 text-[14px] tracking-[2px] max-md:max-w-none sm:min-h-[60px] sm:text-[14.5px]"
            >
              Lancer la visite 3D
            </ButtonLink>
            <ButtonLink
              href={ROUTES.residences}
              variant="outline"
              tone="dark"
              className="min-h-[58px] px-8 text-[14px] tracking-[2px] max-md:max-w-none sm:min-h-[60px] sm:text-[14.5px]"
            >
              Découvrir le programme
            </ButtonLink>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image
            src="/img/honest006.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            loading="lazy"
            className="object-cover transition-transform duration-[1.2s] ease-premium hover:scale-[1.04]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent p-7"
          >
            <span className="text-[13.5px] font-semibold uppercase tracking-[1.6px] text-cream/85">
              Honest Signature 7
            </span>
            <span className="font-serif text-4xl font-normal text-cream">3D</span>
            <span className="mt-2 h-px w-12 bg-bronze" />
          </div>
        </div>
      </div>
    </Reveal>
  );
}
