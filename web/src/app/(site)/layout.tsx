import Script from 'next/script';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { ANALYTICS_AHREFS_KEY } from '@/lib/site';

/**
 * Chrome shared by every public content route.
 *
 * `/offre-gueliz` sits outside this group on purpose: the legacy ads page has
 * its own header and footer, no site nav, no mobile menu, no intro curtain, no
 * WhatsApp float and no analytics tag. Adding any of them there would be a
 * change, not a port.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only-legacy focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-9999 focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-[16px] focus:text-cream"
      >
        Aller au contenu principal
      </a>
      <SiteChrome>
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* Sibling of the footer, as in the static build. On the three SEO
            landing pages this is the only WhatsApp entry point on the page, so
            it is a conversion path rather than a convenience. */}
        <WhatsAppFloat />
      </SiteChrome>
      <Script
        src="https://analytics.ahrefs.com/analytics.js"
        data-key={ANALYTICS_AHREFS_KEY}
        strategy="afterInteractive"
      />
    </>
  );
}
