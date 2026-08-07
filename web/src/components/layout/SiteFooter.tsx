import Image from 'next/image';
import { ANCHORS, CONTACT, EXTERNAL, ROUTES, SOCIAL } from '@/lib/site';

/**
 * Site footer. Five columns plus the office map embed.
 *
 * "Résidences livrées" keeps `/#nos-réalisations`. "Résidence Honest 5" lands
 * on `/#residence-honest-5`, the featured Honest 5 card in `#nos-réalisations`.
 */

/**
 * Phase 02: column headings adopt the eyebrow role, links gain contrast and a
 * touch target. The vertical padding is mobile-only — on a phone these were
 * ~20px tall rows sitting 12px apart, which is the hardest thing on the page
 * to hit accurately; on desktop the original rhythm is kept.
 */
const COLUMN_LINK =
  'py-2 text-[16px] font-normal leading-[1.5] text-cream/70 md:py-0.5 ' +
  'transition-colors duration-[var(--duration-move)] ease-premium hover:text-bronze';

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-eyebrow font-medium uppercase text-bronze">{children}</div>;
}

export function SiteFooter() {
  return (
    // `shell` replaces the hand-rolled gutter + max-width pair, so the footer
    // now lines up with the page container rather than approximating it.
    <footer className="bg-forest pb-12 pt-band text-cream">
      <div className="shell grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr_1.2fr]">
        <div className="max-w-[320px] sm:col-span-2 lg:col-span-1">
          <Image
            src="/img/logo.webp"
            alt="Emara Estates"
            width={1250}
            height={625}
            loading="lazy"
            className="h-14 w-auto"
          />
          <p className="mt-6 text-[16px] font-normal leading-[1.65] text-cream/75">
            Promotion et vente immobilière en hyper-centre de Guéliz, Marrakech. Appartements neufs
            de haut standing.
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 md:gap-2" aria-label="Navigation">
          <ColumnTitle>Navigation</ColumnTitle>
          <a href={ROUTES.home} className={COLUMN_LINK}>
            Accueil
          </a>
          <a href={ROUTES.residences} className={COLUMN_LINK}>
            Nos projets sur plans
          </a>
          <a href={`/${ANCHORS.services}`} className={COLUMN_LINK}>
            Notre accompagnement
          </a>
          <a href={`/${ANCHORS.realisations}`} className={COLUMN_LINK}>
            Résidences livrées
          </a>
          <a href={ROUTES.contact} className={COLUMN_LINK}>
            Prendre contact
          </a>
        </nav>

        <nav className="flex flex-col gap-0.5 md:gap-2" aria-label="Immobilier à Marrakech">
          <ColumnTitle>Immobilier à Marrakech</ColumnTitle>
          <a href={ROUTES.immobilierLuxe} className={COLUMN_LINK}>
            Immobilier luxe Marrakech
          </a>
          <a href={ROUTES.appartementNeufGueliz} className={COLUMN_LINK}>
            Appartement neuf Guéliz
          </a>
          <a href={ROUTES.investissement} className={COLUMN_LINK}>
            Investissement immobilier Marrakech
          </a>
          <a href={ROUTES.residences} className={COLUMN_LINK}>
            Honest Signature 7
          </a>
        </nav>

        <nav className="flex flex-col gap-0.5 md:gap-2" aria-label="Programmes et réseaux sociaux">
          <ColumnTitle>Programmes</ColumnTitle>
          <a href={ROUTES.residences} className={COLUMN_LINK}>
            Honest Signature 7
          </a>
          <a href={`/${ANCHORS.residenceHonest5}`} className={COLUMN_LINK}>
            Résidence Honest 5
          </a>
          <a href={`/${ANCHORS.realisations}`} className={COLUMN_LINK}>
            Résidences livrées
          </a>
          <div className="mt-6">
            <ColumnTitle>Suivez-nous</ColumnTitle>
          </div>
          <a href={SOCIAL.instagram} target="_blank" rel="noopener" className={COLUMN_LINK}>
            Instagram
          </a>
          <a href={SOCIAL.tiktok} target="_blank" rel="noopener" className={COLUMN_LINK}>
            TikTok
          </a>
          <a href={SOCIAL.snapchat} target="_blank" rel="noopener" className={COLUMN_LINK}>
            Snapchat
          </a>
        </nav>

        <div>
          <ColumnTitle>Notre Bureau</ColumnTitle>
          <p className="text-[16px] font-normal leading-[1.65] text-cream/75">
            {CONTACT.addressLine1}
            <br />
            {CONTACT.addressLine2}
          </p>
          <div className="mt-5 aspect-[4/3] w-full overflow-hidden rounded-card border border-cream/10">
            <iframe
              title="Carte du bureau Emara Estates à Marrakech"
              src={EXTERNAL.mapsEmbed}
              className="h-full w-full border-0 grayscale-[0.35] transition-[filter] duration-500 hover:grayscale-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      <div className="shell mt-band-tight border-t border-cream/10 pt-8">
        <span className="text-caption font-normal text-cream/65">
          © 2026 Emara Estates. Tous droits réservés.
        </span>
      </div>
    </footer>
  );
}
