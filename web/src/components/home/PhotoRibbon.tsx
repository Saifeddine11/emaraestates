import Image from 'next/image';
import { SnapRow } from '@/components/gallery/SnapRow';
import { RIBBON_IMAGES } from '@/lib/content/home';
import { cn } from '@/lib/cn';

/**
 * Infinite photo marquee on desktop, one-card carousel below 769px — the same
 * split the legacy CSS made at that breakpoint.
 *
 * The image set is rendered twice so the desktop track can loop seamlessly at
 * -50%. The second pass is hidden from assistive tech and dropped entirely on
 * mobile, where the carousel counts real slides.
 */
export function PhotoRibbon() {
  return (
    <div className="relative mt-28 overflow-hidden bg-forest py-12">
      <h2 className="mx-auto mb-8 max-w-[760px] px-8 text-center font-serif text-[clamp(28px,3.9vw,52px)] font-light leading-[1.12] tracking-[0.01em] text-cream">
        Le Guéliz qu&apos;on rêvait d&apos;habiter
      </h2>

      {/* Edge fades so cards dissolve into the panel rather than being clipped.
          Desktop only — on mobile a single card fills the width. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[2] hidden w-[min(14vw,180px)] bg-gradient-to-r from-forest via-forest/60 to-transparent md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[2] hidden w-[min(14vw,180px)] bg-gradient-to-l from-forest via-forest/60 to-transparent md:block"
      />

      <SnapRow
        ariaLabel="Galerie des résidences Emara Estates"
        count={RIBBON_IMAGES.length}
        mode="mobile"
        tone="dark"
        align="center"
        controlsPosition="below"
        trackClassName="gap-[18px] px-[18px]"
        desktopClassName="md:w-max md:animate-ribbon md:overflow-x-hidden md:hover:[animation-play-state:paused]"
      >
        {[0, 1].map((pass) =>
          RIBBON_IMAGES.map((image, index) => (
            <figure
              key={`${pass}-${image.src}-${index}`}
              aria-hidden={pass === 1 ? 'true' : undefined}
              className={cn(
                'relative m-0 aspect-[4/3] w-full shrink-0 snap-start overflow-hidden rounded-3xl bg-white/[0.04] shadow-[0_20px_45px_rgba(0,0,0,0.16)]',
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
            </figure>
          )),
        )}
      </SnapRow>
    </div>
  );
}
