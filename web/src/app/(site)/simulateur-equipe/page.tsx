import type { Metadata } from 'next';
import { SalesCalculator } from '@/components/simulateur/SalesCalculator';

/**
 * Internal sales-team calculator. Not linked from the site, not in the
 * sitemap, and kept out of search results.
 */
export const metadata: Metadata = {
  title: 'Calculatrice équipe commerciale | Emara Estates',
  robots: { index: false, follow: false },
};

export default function SalesCalculatorPage() {
  return (
    <main id="main-content">
      <SalesCalculator />
    </main>
  );
}
