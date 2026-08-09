import type { Metadata } from 'next';
import { RecruitmentHero } from '@/components/recruitment/RecruitmentHero';

const TITLE = 'Recrutement commercial Marrakech | Emara Estates';
const DESCRIPTION =
  'Emara Estates recrute un commercial immobilier à Marrakech. Candidatez en quelques étapes et rejoignez une équipe exigeante.';
const OG_IMAGE = 'https://emaraestates.com/img/og-honest-signature-7.jpg';
const CANONICAL = 'https://emaraestates.com/recrutement-commercial-marrakech';

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

export default function RecruitmentPage() {
  return (
    <main id="main-content">
      <RecruitmentHero />
    </main>
  );
}
