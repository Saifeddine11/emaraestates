/**
 * `/honest-signature-7-residence-boutique/` content — the copy of the HS7 ads
 * landing for the « première résidence boutique de Marrakech » video campaign.
 *
 * Only what this page says differently lives here. Everything else — prices,
 * delivery date, pictures, amenities, show apartments, residences, form
 * options and wire values — is imported from `honest-signature-7.ts` as is,
 * so the two pages cannot drift apart on a figure.
 *
 * No figure is added: no lot count, no rental yield, no stock other than the
 * one the original page already shows (STOCK_LEFT, inside the lead cards).
 */

import { AMENITY_GROUPS as BASE_AMENITY_GROUPS, FAQ as BASE_FAQ, FACTS, type AmenityGroup } from '@/lib/content/honest-signature-7';

/**
 * Opens the CRM `message` of every lead sent from this page (see
 * LeadFormProvider's `messageTag`): the only difference on the wire with
 * /honest-signature-7/, besides the page URL.
 */
export const MESSAGE_TAG = 'Page : résidence boutique';

/**
 * The façade in AVIF, offered before the WebP files of HERO_IMAGE and
 * HERO_IMAGE_MOBILE (same widths, same render): about 40 % lighter for the
 * LCP image. Browsers without AVIF take the WebP sources.
 */
export const HERO_AVIF = {
  mobile: '/media/honest-7/facade-jour-640.avif 640w, /media/honest-7/facade-jour-828.avif 828w, /media/honest-7/facade-jour-1080.avif 1080w',
  desktop:
    '/media/honest-7/facade-jour-640.avif 640w, /media/honest-7/facade-jour-828.avif 828w, /media/honest-7/facade-jour-1080.avif 1080w, /media/honest-7/facade-jour-1536.avif 1536w',
} as const;

/** The header logo, drawn about 60 px wide (72 px from lg): a 160 px file below 2× screens. */
export const LOGO_SRCSET = '/media/honest-7/logo-emara-forest-160.webp 160w, /media/honest-7/logo-emara-forest-320.webp 320w';
export const LOGO_SIZES = '(min-width: 1024px) 72px, 57px';

/** The conciergerie and parking lines say « comme à l’hôtel »; the pictured groups are unchanged. */
export const AMENITY_GROUPS: AmenityGroup[] = BASE_AMENITY_GROUPS.map((group) => {
  if (group.items[0].icon === 'concierge') {
    return { ...group, line: 'Une conciergerie, comme à l’hôtel, pour vous simplifier le quotidien.' };
  }
  if (group.items[0].icon === 'parking') {
    return { ...group, line: 'Une place de parking titrée, au sein même de la résidence.' };
  }
  return group;
});

/** The original questions, after one on what « résidence boutique » means here. */
export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Qu’est-ce qu’une résidence boutique ?',
    answer:
      `Une résidence de haut standing à taille humaine, qui offre les services d’un hôtel. À ${FACTS.project} : piscine extérieure, piscine intérieure chauffée, spa, sauna, jacuzzi, salle de sport, cinéma extérieur et conciergerie, au cœur de Guéliz, à 1 minute à pied du Plaza.`,
  },
  ...BASE_FAQ,
];
