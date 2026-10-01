/**
 * `/residence-boutique-gueliz` content — the Meta Ads landing for the
 * "1ʳᵉ résidence boutique à Guéliz hyper-centre" creative.
 *
 * A sibling of `/honest-signature-7/` (the "6 résidences livrées" creative),
 * not a replacement: both post to the same /contact.php → Zapier path with the
 * same form_type, lead source and channel, and are told apart in the CRM by
 * `landing_name` and `landing_page`.
 *
 * Every figure comes from the campaign brief. Nothing is derived (no price ×
 * surface, no amount computed from a percentage), and there is no invented
 * scarcity: no stock count, no countdown, no "X personnes regardent".
 *
 * Images are the project's own renders and the real photographs of the
 * delivered residences, served as 640/1080(/1600) WebP variants from
 * web/public/media/honest-7 (shipped by the deploy's `media/` asset dir).
 */

import type { Picture } from '@/lib/content/honest-signature-7';

export {
  BUDGETS,
  FORM_TYPE,
  LEAD_CHANNEL,
  LEAD_ORIGIN,
  LEAD_SOURCE,
} from '@/lib/content/honest-signature-7';

export const PROJECT = 'Honest Signature 7';

/** `landing_name` sent with each lead — distinguishes this creative in the CRM. */
export const LANDING_NAME = 'Residence boutique Gueliz';

/** `content_name` of this page's ViewContent. */
export const CONTENT_NAME = 'Honest Signature 7 - Residence boutique';

export const PATH = '/residence-boutique-gueliz';

export const FACTS = {
  priceFrom: '1 390 000 MAD',
  priceFromNumber: '1 390 000',
  delivery: 'Juin 2028',
  deliveredCount: 6,
  plaza: 'À 1 minute à pied du Plaza',
} as const;

/** The brief's amenities line, in its order. */
export const AMENITIES_LINE = 'Piscines. Spa. Jacuzzi. Salle de sport. Sauna. Cinéma extérieur.';

/** Short row for the mobile hero. */
export const AMENITY_CHIPS = ['2 piscines', 'Spa', 'Jacuzzi', 'Salle de sport', 'Sauna', 'Cinéma extérieur', 'Parking titré'] as const;

export const TRUST_ITEMS = [
  `${FACTS.deliveredCount} résidences déjà livrées`,
  'Paiement progressif',
  `Livraison ${FACTS.delivery.toLowerCase()}`,
  'Guéliz hyper-centre',
] as const;

/* ── Pictures ───────────────────────────────────────────────────────────── */

const M = '/media/honest-7';

/** Variants from /media only, largest last — used as `src` too. */
function media(name: string, widths: number[], width: number, height: number, alt: string): Picture {
  const largest = widths[widths.length - 1];
  return {
    src: `${M}/${name}-${largest}.webp`,
    srcSet: widths.map((w) => `${M}/${name}-${w}.webp ${w}w`).join(', '),
    width,
    height,
    alt,
  };
}

/** 640/1080 variants plus a live /img original at its native width. */
function withOriginal(name: string, original: string, width: number, height: number, alt: string): Picture {
  return {
    src: original,
    srcSet: `${M}/${name}-640.webp 640w, ${M}/${name}-1080.webp 1080w, ${original} ${width}w`,
    width,
    height,
    alt,
  };
}

const FACADE: Picture = {
  // The LCP image: an extra 828w step so ~2x phones skip the 1080w file.
  ...withOriginal('facade-jour', '/img/honest006.webp', 1536, 1024, 'Façade de la résidence boutique Honest Signature 7 à Guéliz, Marrakech'),
  srcSet: `${M}/facade-jour-640.webp 640w, ${M}/facade-jour-828.webp 828w, ${M}/facade-jour-1080.webp 1080w, /img/honest006.webp 1536w`,
};
const PISCINE = withOriginal(
  'piscine',
  '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-03.webp',
  1600,
  1067,
  'Piscine extérieure de la résidence Honest Signature 7, bordée de transats',
);
const PISCINE_INTERIEURE = media(
  'piscine-interieure',
  [640, 1080, 1600],
  1600,
  900,
  'Piscine intérieure de la résidence Honest Signature 7',
);
const SALON = withOriginal(
  'salon',
  '/img/honest007.webp',
  1600,
  900,
  'Séjour lumineux d’un appartement Honest Signature 7',
);
const SPA = media(
  'spa',
  [640, 1080, 1600],
  1600,
  1066,
  'Espace spa de la résidence Honest Signature 7 : bassin intérieur, sauna et jacuzzi',
);
const JACUZZI = media('jacuzzi', [640, 720], 720, 1067, 'Jacuzzi habillé de bois de la résidence Honest Signature 7');
const SAUNA = media('sauna', [640, 720], 720, 1067, 'Sauna en bois de la résidence Honest Signature 7');
const SPORT = withOriginal(
  'salle-de-sport',
  '/img/honest005.webp',
  1280,
  720,
  'Salle de sport équipée de la résidence Honest Signature 7',
);
const CINEMA = withOriginal(
  'cinema',
  '/img/honest003.webp',
  1600,
  1066,
  'Cinéma extérieur sur le toit-terrasse, vue sur Marrakech',
);
const FACADE_NUIT: Picture = {
  src: `${M}/facade-nuit-1600.webp`,
  srcSet: `${M}/facade-nuit-640.webp 640w, ${M}/facade-nuit-1080.webp 1080w, ${M}/facade-nuit-1600.webp 1600w`,
  width: 1600,
  height: 1249,
  alt: 'Honest Signature 7 de nuit, façade éclairée sur rue à Guéliz',
};
export const MAP_IMAGE = withOriginal(
  'carte',
  '/img/maps.webp',
  1672,
  941,
  'Vue aérienne de Guéliz : Honest Signature 7 à 1 minute à pied du Plaza',
);

export const HERO_IMAGE = FACADE;
/** Hero stage width: the left ~56 % column on desktop, full width below. */
export const HERO_SIZES = '(min-width: 1024px) 50vw, 100vw';

export type HeroSlide = { index: string; label: string; picture: Picture; position?: string };

/** 01 Architecture → 05 Cinéma: the order the brief asks for. */
export const HERO_SLIDES: HeroSlide[] = [
  { index: '01', label: 'Architecture', picture: FACADE, position: '50% 40%' },
  { index: '02', label: 'Piscines', picture: PISCINE, position: '50% 60%' },
  { index: '03', label: 'Intérieurs', picture: SALON, position: '50% 50%' },
  { index: '04', label: 'Spa & wellness', picture: SPA, position: '55% 55%' },
  { index: '05', label: 'Cinéma extérieur', picture: CINEMA, position: '50% 55%' },
];

export type AmenityScene = {
  index: string;
  title: string;
  line: string;
  picture: Picture;
  /** A second real visual shown inset — only where the scene is plural. */
  inset?: Picture;
  position?: string;
};

export const AMENITY_SCENES: AmenityScene[] = [
  {
    index: '01',
    title: 'Piscines',
    line: 'Deux piscines : une en plein air, une intérieure.',
    picture: PISCINE,
    inset: PISCINE_INTERIEURE,
    position: '50% 62%',
  },
  { index: '02', title: 'Spa', line: 'Un espace bien-être au sein de la résidence.', picture: SPA, position: '60% 55%' },
  { index: '03', title: 'Jacuzzi', line: 'Dans votre résidence, pas dans un hôtel.', picture: JACUZZI, position: '50% 62%' },
  { index: '04', title: 'Salle de sport', line: 'Équipée, lumineuse, au pied de chez vous.', picture: SPORT, position: '50% 50%' },
  { index: '05', title: 'Sauna', line: 'Pour finir la journée comme à l’hôtel. Sans en sortir.', picture: SAUNA, position: '50% 50%' },
  { index: '06', title: 'Cinéma extérieur', line: 'Sur le toit-terrasse, face à Marrakech.', picture: CINEMA, position: '50% 55%' },
];

export const REVEAL_IMAGE = FACADE_NUIT;

/* ── Proof: delivered residences ────────────────────────────────────────── */

export type DeliveredResidence = { name: string; picture: Picture };

function realisation(file: string, alt: string): Picture {
  const base = '/img/optimized/realisations';
  return {
    src: `${base}/${file}-1800.webp`,
    srcSet: `${base}/${file}-900.webp 900w, ${base}/${file}-1800.webp 1800w`,
    width: 1800,
    height: 1013,
    alt,
  };
}

/**
 * Only residences the site already labels "Livré" AND has real photographs
 * of. Honest 5's published photos show a construction site, and no Honest 6
 * photograph exists in the repo, so neither is shown under a "livrée" label.
 */
export const DELIVERED_RESIDENCES: DeliveredResidence[] = [
  { name: 'Honest 1', picture: realisation('honest22', 'Vue extérieure de la Résidence Honest 1 à Guéliz, Marrakech') },
  { name: 'Honest 2', picture: realisation('honest222', 'Façade avec balcons de la Résidence Honest 2 à Guéliz') },
  { name: 'Honest 3', picture: realisation('honest31', 'Façade de la Résidence Honest 3 à Guéliz, Marrakech') },
  { name: 'Honest 4', picture: realisation('honest43', 'Façade de la Résidence Honest 4 à Marrakech') },
];

/* ── Payment ────────────────────────────────────────────────────────────── */

export const PAYMENT_STEPS = [
  { share: '30', when: 'À la réservation', note: 'Aujourd’hui' },
  { share: '15', when: '6 mois', note: 'après la réservation' },
  { share: '15', when: '12 mois', note: 'après la réservation' },
  { share: '15', when: '18 mois', note: 'après la réservation' },
  { share: '25', when: 'À la remise des clés', note: FACTS.delivery },
] as const;

/* ── Lead form ──────────────────────────────────────────────────────────── */

/** Visible label → `propertyType` sent to Zapier (an existing contact.php key). */
export const PROPERTY_TYPES = [
  { value: 'Studio', label: 'Studio', rooms: 0 },
  { value: 'Appartement 1 chambre', label: 'Appartement 1 chambre', rooms: 1 },
  { value: 'Appartement 2 chambres', label: 'Appartement 2 chambres', rooms: 2 },
] as const;

export const FORM_DELIVERABLES = 'Plans • Prix • Surfaces • Étages • Disponibilités';
export const FORM_REASSURANCE = 'Vos coordonnées servent uniquement à vous transmettre les informations du projet.';
