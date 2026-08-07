import type { Metadata, Viewport } from 'next';
import { Reveal } from '@/components/motion/Reveal';
import {
  GuelizAmenities,
  GuelizFeatures,
  GuelizFooter,
  GuelizHeader,
  GuelizLocation,
  GuelizStickyCta,
} from '@/components/offre-gueliz/GuelizSections';
import { GuelizLeadForm } from '@/components/offre-gueliz/GuelizLeadForm';
import { OG_FORM } from '@/lib/content/offre-gueliz';

/**
 * `/offre-gueliz` — paid-ads lead funnel.
 *
 * Deliberately `noindex, nofollow` and absent from the sitemap. The legacy head
 * has **no canonical, no Open Graph, no Twitter tags and no JSON-LD**, and none
 * are added here: inventing them would change what this page tells crawlers.
 * The route also sits outside the `(site)` group so it inherits none of the
 * site chrome or analytics.
 */

export const metadata: Metadata = {
  title: 'Appartements neufs à Guéliz | Prix & disponibilités — Emara Estates',
  description:
    'Résidence contemporaine au cœur de Guéliz, Marrakech. Apport dès 39 000 €, livraison juin 2028. Recevez les prix et disponibilités.',
  robots: { index: false, follow: false },
};

/** Legacy head carries `<meta name="theme-color" content="#F5F0E8">`. */
export const viewport: Viewport = {
  themeColor: '#F5F0E8',
};

export default function OffreGuelizPage() {
  return (
    <>
      <GuelizHeader />

      <main id="og-main">
        <GuelizFeatures />
        <GuelizLocation />
        <GuelizAmenities />

        <section
          id="og-form"
          aria-labelledby="og-form-title"
          className="bg-shell px-[clamp(20px,4vw,44px)] py-[clamp(48px,7vw,96px)]"
        >
          <div className="mx-auto grid w-full max-w-[1100px] items-start gap-[clamp(32px,5vw,64px)] lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal className="lg:sticky lg:top-28">
              <span className="mb-4 block text-[13.5px] font-normal uppercase tracking-[4px] text-bronze">
                {OG_FORM.label}
              </span>
              <h2
                id="og-form-title"
                className="text-balance font-serif text-[clamp(28px,3.4vw,46px)] font-light leading-[1.15] text-forest"
              >
                {OG_FORM.title}
              </h2>
              <p className="mt-5 max-w-[440px] text-[16px] font-normal leading-[1.9] text-forest/75">
                {OG_FORM.subtitle}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <GuelizLeadForm />
            </Reveal>
          </div>
        </section>
      </main>

      <GuelizFooter />
      <GuelizStickyCta />
    </>
  );
}
