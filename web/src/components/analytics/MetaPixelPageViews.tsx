'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { META_PIXEL_ID } from '@/lib/meta-pixel';

/**
 * Re-fires PageView on App Router client navigations.
 * The initial PageView is handled by the base script in `<MetaPixel />`.
 * Never fires conversion events.
 */
export function MetaPixelPageViews() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const skipNext = useRef(true);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    if (skipNext.current) {
      skipNext.current = false;
      return;
    }

    try {
      const fbq = (
        window as typeof window & { fbq?: (...args: unknown[]) => void }
      ).fbq;
      if (typeof fbq === 'function') {
        fbq('track', 'PageView');
      }
    } catch {
      /* tracking must never break navigation */
    }
  }, [pathname]);

  return null;
}
