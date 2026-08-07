'use client';

import { useState } from 'react';
import { VideoModal, type VideoSource } from '@/components/gallery/VideoModal';
import { Reveal } from '@/components/motion/Reveal';
import { CardFanCarousel } from '@/components/ui/card-fan-carousel';
import { VIDEO_CARDS } from '@/lib/content/videos';

/**
 * `#videos` — the video and immersive-visit gallery.
 *
 * The one section on this site that is not a port: it has no counterpart in the
 * legacy build, which is why it is declared as an intentional addition in
 * `scripts/lib/routes.mjs`. It adds no route, no metadata, no JSON-LD and no
 * outbound destination the site did not already publish.
 *
 * Cream-backed and copy-free on purpose — the fan is the section. It sits
 * between the photographic hero and `#biens`. On desktop a larger upward
 * overlap brings the central card clearly into the first fold — hero CSS is
 * never touched.
 */

/** Open on something playable, so the front card is never a waiting state. */
const FIRST_PLAYABLE = Math.max(
  VIDEO_CARDS.findIndex((card) => card.linkUrl),
  0,
);

export function VideoGallerySection() {
  const [source, setSource] = useState<VideoSource | null>(null);

  return (
    <section
      id="videos"
      // Mobile: stacked cream band. Desktop: controlled upward overlap into the
      // hero so the fan peeks in the first fold without cropping the cards.
      className="relative z-[3] scroll-mt-24 overflow-x-clip bg-cream px-[clamp(28px,5vw,60px)] pb-[clamp(48px,6vw,80px)] pt-[clamp(28px,4vw,48px)] md:-mt-[clamp(200px,32vh,300px)] md:pt-[clamp(12px,2vw,20px)]"
    >
      <div className="mx-auto w-full max-w-[1320px]">
        {/* Pulled out to the page gutter so the outermost cards bleed off the
            edge instead of being cut short by the section padding. */}
        <Reveal className="-mx-[clamp(28px,5vw,60px)]">
          <CardFanCarousel
            cards={VIDEO_CARDS}
            ariaLabel="Vidéos et visites immersives des résidences"
            initialIndex={FIRST_PLAYABLE}
            showCaption={false}
            controlLabel="Message du fondateur"
            onSelect={(card) =>
              setSource({
                url: card.linkUrl!,
                title: card.title,
                // The cover doubles as the player's poster, so the frame the
                // card was showing is the frame the player opens on.
                poster: card.imgUrl,
                portrait: card.portrait,
              })
            }
          />
        </Reveal>
      </div>

      <VideoModal source={source} onClose={() => setSource(null)} />
    </section>
  );
}
