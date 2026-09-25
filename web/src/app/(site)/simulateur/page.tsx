import type { Metadata } from 'next';
import { SimulatorExperience } from '@/components/simulateur/SimulatorExperience';

const TITLE = 'Simulateur immobilier Honest Signature 7 | Emara Estates';
const DESCRIPTION =
  'Simulez l’échéancier indicatif de votre budget pour Honest Signature 7 à Guéliz, puis demandez les plans, prix et disponibilités actuelles.';
const CANONICAL = 'https://emaraestates.com/simulateur/';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: 'Emara Estates',
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

export default function SimulatorPage() {
  return (
    <>
      <link rel="canonical" href={CANONICAL} />
      <meta property="og:url" content={CANONICAL} />
      <main id="main-content">
        <SimulatorExperience />
      </main>
    </>
  );
}
