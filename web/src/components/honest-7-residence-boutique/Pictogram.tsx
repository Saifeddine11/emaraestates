'use client';

import type { ComponentProps } from 'react';
import { Icon3d } from '@/components/honest-7/Icons3d';

/**
 * The page's 3D pictograms behind a client boundary. Rendered from a server
 * component, each SVG travels twice — in the HTML and again in the RSC
 * payload — and the HTML is on the critical path of the LCP. From here the
 * payload only carries the name and offset; the drawing is in the HTML once.
 */
export function Pictogram(props: ComponentProps<typeof Icon3d>) {
  return <Icon3d {...props} />;
}
