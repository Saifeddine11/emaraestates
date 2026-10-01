import type { CSSProperties } from 'react';
import type { Picture as PictureData } from '@/lib/content/honest-signature-7';
import { cn } from '@/lib/cn';

/**
 * A plain `<img>` with a real `srcset`.
 *
 * The export runs with `images.unoptimized`, so `next/image` would ship one
 * full-size file to every phone. This page is mostly Meta mobile traffic, so
 * each visual has 640/1080 variants and the browser picks by `sizes`.
 * `width`/`height` keep the intrinsic ratio reserved (no layout shift).
 */
export function Picture({
  picture,
  sizes,
  priority = false,
  className,
  decorative = false,
  style,
  onLoad,
}: {
  picture: PictureData;
  sizes: string;
  priority?: boolean;
  className?: string;
  decorative?: boolean;
  style?: CSSProperties;
  onLoad?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: next/image cannot emit srcset here
    <img
      src={picture.src}
      srcSet={picture.srcSet}
      sizes={sizes}
      width={picture.width}
      height={picture.height}
      alt={decorative ? '' : picture.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      className={cn('block size-full object-cover', className)}
      style={style}
      onLoad={onLoad}
    />
  );
}
