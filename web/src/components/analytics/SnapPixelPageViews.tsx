'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SNAP_PIXEL_ID } from '@/lib/snap-pixel';

/**
 * Re-fires PAGE_VIEW on App Router client navigations.
 * The initial PAGE_VIEW is handled by the base script in `<SnapPixel />`.
 */
export function SnapPixelPageViews() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const skipNext = useRef(true);

  useEffect(() => {
    if (!SNAP_PIXEL_ID) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    if (skipNext.current) {
      skipNext.current = false;
      return;
    }

    try {
      const snaptr = (
        window as typeof window & { snaptr?: (...args: unknown[]) => void }
      ).snaptr;
      if (typeof snaptr === 'function') {
        snaptr('track', 'PAGE_VIEW');
      }
    } catch {
      /* tracking must never break navigation */
    }
  }, [pathname]);

  return null;
}
