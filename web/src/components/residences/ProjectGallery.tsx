'use client';

import Image from 'next/image';
import { SnapRow } from '@/components/gallery/SnapRow';
import { useLightbox } from '@/components/gallery/LightboxProvider';
import { Reveal } from '@/components/motion/Reveal';
import { SectionLabel, SectionTitle } from '@/components/ui/Section';
import { GALLERY_IMAGES } from '@/lib/content/residences';
import { cn } from '@/lib/cn';

/**
 * `#galerie` — infinite marquee on desktop, one-card carousel below 769px,
 * matching the split the legacy CSS made at that breakpoint.
 *
 * The set is rendered twice so the desktop track loops seamlessly at -50%. The
 * second pass is hidden from assistive tech and dropped on mobile, where the
 * carousel counts real slides. Only first-pass cards open the lightbox, which
 * is what the legacy `:not([aria-hidden])` zoom cursor signalled.
 */
export function ProjectGallery() {
  const openLightbox = useLightbox();

  return (
    <section id="galerie" className="mt-28 scroll-mt-28">
      <Reveal>
        <SectionLabel>Galerie Immersive</SectionLabel>
        <SectionTitle>Un aperçu du style, des ambiances et des détails</SectionTitle>
      </Reveal>

      <div className="relative mt-14 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[2] hidden w-[min(12vw,160px)] bg-gradient-to-r from-shell via-shell/55 to-transparent md:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-[2] hidden w-[min(12vw,160px)] bg-gradient-to-l from-shell via-shell/55 to-transparent md:block"
        />

        <SnapRow
          ariaLabel="Galerie du projet Honest Signature 7"
          count={GALLERY_IMAGES.length}
          mode="mobile"
          tone="light"
          align="center"
          controlsPosition="below"
          trackClassName="gap-[18px]"
          desktopClassName="md:w-max md:animate-ribbon md:overflow-x-hidden md:hover:[animation-play-state:paused]"
        >
          {[0, 1].map((pass) =>
            GALLERY_IMAGES.map((image, index) => (
              <figure
                key={`${pass}-${image.src}-${index}`}
                aria-hidden={pass === 1 ? 'true' : undefined}
                className={cn(
                  'relative m-0 aspect-[4/3] w-full shrink-0 snap-start overflow-hidden rounded-3xl bg-forest/[0.04] shadow-[0_20px_45px_-25px_rgba(24,29,24,0.35)]',
                  'md:w-[clamp(240px,28vw,420px)]',
                  pass === 1 && 'max-md:hidden',
                )}
              >
                <Image
                  src={image.src}
                  alt={pass === 0 ? image.alt : ''}
                  fill
                  sizes="(max-width: 768px) 90vw, 28vw"
                  loading="lazy"
                  className="object-cover [filter:saturate(0.96)_contrast(1.02)]"
                />
                {pass === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      openLightbox({
                        images: GALLERY_IMAGES.map((item) => ({
                          src: item.src,
                          alt: item.alt,
                          width: item.width,
                          height: item.height,
                        })),
                        index,
                      })
                    }
                    aria-label={`Agrandir la photo : ${image.alt}`}
                    className="absolute inset-0 cursor-zoom-in"
                  />
                )}
              </figure>
            )),
          )}
        </SnapRow>
      </div>
    </section>
  );
}
