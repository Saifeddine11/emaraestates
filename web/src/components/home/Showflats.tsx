'use client';

import Image from 'next/image';
import { SnapRow } from '@/components/gallery/SnapRow';
import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { SectionLabel, SectionText, SectionTitle } from '@/components/ui/Section';
import { useLightbox } from '@/components/gallery/LightboxProvider';
import { SHOWFLAT_SLIDES } from '@/lib/content/home';
import { EXTERNAL } from '@/lib/site';

/**
 * `#appartements-temoins` — showflat gallery, nested inside the réalisations
 * section. Nine slides, carousel at every breakpoint, each opening the shared
 * lightbox at its own index.
 */
export function Showflats() {
  const openLightbox = useLightbox();

  const lightboxImages = SHOWFLAT_SLIDES.map((slide) => ({
    src: slide.src,
    alt: slide.alt,
    title: slide.lightboxTitle,
    width: slide.width,
    height: slide.height,
  }));

  return (
    <section
      id="appartements-temoins"
      aria-labelledby="showflats-title"
      className="mt-28 scroll-mt-24"
    >
      <Reveal>
        <SectionLabel>Visite guidée</SectionLabel>
        <SectionTitle id="showflats-title">Appartements témoins</SectionTitle>
        <SectionText className="mt-6">
          Découvrez les finitions, volumes et ambiances intérieures de nos résidences Honest
          Signature à Guéliz.
        </SectionText>
      </Reveal>

      <SnapRow
        ariaLabel="Galerie des appartements témoins"
        count={SHOWFLAT_SLIDES.length}
        mode="always"
        className="mt-12"
        trackClassName="gap-5"
      >
        {SHOWFLAT_SLIDES.map((slide, index) => (
          <figure
            key={slide.src}
            className="m-0 w-[86vw] shrink-0 snap-start sm:w-[520px] lg:w-[620px]"
          >
            <button
              type="button"
              onClick={() => openLightbox({ images: lightboxImages, index })}
              aria-label={`Agrandir la photo : ${slide.alt}`}
              className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-3xl bg-forest/5"
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 640px) 86vw, (max-width: 1024px) 520px, 620px"
                loading="lazy"
                className="object-cover transition-transform duration-[1.1s] ease-premium group-hover:scale-[1.05]"
              />
            </button>
          </figure>
        ))}
      </SnapRow>

      <Reveal className="mt-10 flex justify-center">
        <ButtonLink
          href={EXTERNAL.matterportShowflat}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
        >
          Visiter l&apos;appartement témoin en 3D
        </ButtonLink>
      </Reveal>
    </section>
  );
}
