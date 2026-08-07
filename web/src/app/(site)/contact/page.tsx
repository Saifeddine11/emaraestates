import type { Metadata } from 'next';
import { ContactHero } from '@/components/contact/ContactHero';
import { ContactOffice } from '@/components/contact/ContactOffice';
import { contactJsonLd } from '@/lib/structured-data';

const TITLE = 'Contact Emara Estates | Recevoir prix, plans & disponibilités';
const DESCRIPTION =
  'Contactez Emara Estates pour recevoir les prix, plans et disponibilités des appartements neufs à Guéliz Marrakech, ou planifier une visite.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

/**
 * Unlike `/residences-honest-678/`, this route's indexed canonical carries no
 * trailing slash, which is exactly what `trailingSlash: false` produces. So the
 * metadata API can own the canonical and og:url here; no hand-written tags.
 */
const CANONICAL = 'https://emaraestates.com/contact';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: 'Emara Estates',
    url: CANONICAL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, type: 'image/jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      {/* The legacy page wraps everything between the nav and the footer in
          <main>; the port had dropped it, which also left the layout's skip
          link without a target. */}
      <main id="main-content">
        <ContactHero />
        <ContactOffice />
      </main>
    </>
  );
}
