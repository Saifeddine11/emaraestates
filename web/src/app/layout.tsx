import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import {
  MetaPixel,
  META_PIXEL_ID,
  metaPixelInlineScript,
} from '@/components/analytics/MetaPixel';
import {
  SnapPixel,
  SNAP_PIXEL_ID,
  snapPixelInlineScript,
} from '@/components/analytics/SnapPixel';
import { SITE_ORIGIN } from '@/lib/site';
import './globals.css';

/**
 * Document shell only.
 *
 * The site header, footer, WhatsApp float, skip link and analytics live in
 * `(site)/layout.tsx` instead, because `/offre-gueliz` is a paid-ads landing
 * page that deliberately ships none of them. Route groups do not affect URLs,
 * so this split is invisible to routing.
 *
 * Meta + Snap base pixels live here so every route (including `/offre-gueliz`)
 * gets PageView. Conversion events stay in form success handlers only.
 */

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  icons: {
    icon: [
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-48x48.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${jost.variable}`}>
      <head>
        {/* Scroll-reveal elements start hidden and are shown by Framer Motion.
            Without scripts they would never appear, so force them visible —
            the same escape hatch the legacy stylesheet used. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        {/* Meta Pixel base — once globally (Pixel ID 1049553054304565). */}
        {META_PIXEL_ID ? (
          <script
            id="meta-pixel"
            dangerouslySetInnerHTML={{ __html: metaPixelInlineScript(META_PIXEL_ID) }}
          />
        ) : null}
        {/* Snap Pixel base — once globally for emaraestates.com (all routes). */}
        {SNAP_PIXEL_ID ? (
          <script
            id="snap-pixel"
            dangerouslySetInnerHTML={{ __html: snapPixelInlineScript(SNAP_PIXEL_ID) }}
          />
        ) : null}
      </head>
      <body>
        <MetaPixel />
        <SnapPixel />
        {children}
      </body>
    </html>
  );
}
