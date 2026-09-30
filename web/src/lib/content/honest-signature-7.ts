/**
 * `/honest-signature-7/` content — the post-click page of the Meta static ads
 * (proof, price and payment angles; see lib/landing-angle.ts).
 *
 * Every figure here comes from the campaign brief or from copy already live on
 * the site. Nothing is derived: the page never multiplies a surface by the
 * price per m², so no incompatible surface/price pair can be displayed.
 *
 * Images: HS7 visuals are the project's own renders already published on
 * /residences-honest-678/; the delivered residences are real photographs
 * already published in the homepage "Nos réalisations" block. Responsive
 * 640/1080 variants live in web/public/media/honest-7 (shipped by the deploy);
 * the full-size originals are the live /img files.
 */

/** From the ad headline. The homepage still says "4 résidences livrées" — see the hand-off notes. */
export const DELIVERED_COUNT = 6;

export const FACTS = {
  project: 'Honest Signature 7',
  location: 'Guéliz, Marrakech',
  plaza: 'À 1 minute à pied du Plaza',
  priceFrom: '1\u00a0390\u00a0000\u00a0MAD',
  priceFromShort: '1,39 M MAD',
  pricePerSqm: '27 000 DH / m²',
  surfaces: '51–140 m²',
  surfaceFrom: '51 m²',
  delivery: 'juin 2028',
} as const;

export const PAYMENT_PLAN = [
  { step: '01', share: '30 %', label: 'À la réservation' },
  { step: '02', share: '15 %', label: 'Tous les 6 mois × 3' },
  { step: '03', share: '25 %', label: 'À la remise des clés' },
] as const;

export type Picture = {
  /** Largest source, also the fallback `src`. */
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};

const M = '/media/honest-7';

/** 640/1080 variants + the live original at its native width. */
function hs7(name: string, original: string, width: number, height: number, alt: string): Picture {
  return {
    src: original,
    srcSet: `${M}/${name}-640.webp 640w, ${M}/${name}-1080.webp 1080w, ${original} ${width}w`,
    width,
    height,
    alt,
  };
}

export const HERO_IMAGE = hs7(
  'facade-jour',
  '/img/honest006.webp',
  1536,
  1024,
  'Façade de la résidence Honest Signature 7 à Guéliz, Marrakech, avec ses balcons végétalisés',
);

export const HERO_SIZES = '(min-width: 1024px) 56vw, 100vw';

export const REVEAL_IMAGE: Picture = {
  src: `${M}/facade-nuit-1600.webp`,
  srcSet: `${M}/facade-nuit-640.webp 640w, ${M}/facade-nuit-1080.webp 1080w, ${M}/facade-nuit-1600.webp 1600w`,
  width: 1600,
  height: 1249,
  alt: 'Honest Signature 7 de nuit, façade éclairée sur rue à Guéliz',
};

export const MAP_IMAGE = hs7(
  'carte',
  '/img/maps.webp',
  1672,
  941,
  "Vue aérienne de Guéliz : Honest Signature 7 à 1 minute à pied du Plaza, centre de Guéliz",
);

export type DeliveredResidence = {
  name: string;
  picture: Picture;
};

/**
 * Honest 1–4: the only residences the site labels "Livré" with real
 * photographs. The repo has no verified photo of a delivered Honest 5 or 6
 * (Honest 5 is shown as a construction site on the homepage), so none is
 * added here and the page says these four are the ones pictured.
 */
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

export const DELIVERED_RESIDENCES: DeliveredResidence[] = [
  {
    name: 'Résidence Honest 1',
    picture: realisation('honest22', 'Vue extérieure de la Résidence Honest 1 à Guéliz, Marrakech'),
  },
  {
    name: 'Résidence Honest 2',
    picture: realisation('honest222', 'Façade avec balcons de la Résidence Honest 2 à Guéliz'),
  },
  {
    name: 'Résidence Honest 3',
    picture: realisation('honest31', 'Façade de la Résidence Honest 3 à Guéliz, Marrakech'),
  },
  {
    name: 'Résidence Honest 4',
    picture: realisation('honest43', 'Façade de la Résidence Honest 4 à Marrakech'),
  },
];

export type Amenity = { title: string; picture: Picture };

/** Only amenities with a matching project visual get a picture. */
export const AMENITY_VISUALS: Amenity[] = [
  {
    title: 'Piscine résidentielle',
    picture: hs7('piscine', '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-03.webp', 1600, 1067, 'Piscine de la résidence Honest Signature 7 bordée de transats, en soirée'),
  },
  {
    title: 'Spa & jacuzzi',
    picture: hs7('spa-jacuzzi', '/img/honest002.webp', 1600, 1067, 'Sauna et jacuzzi de la résidence Honest Signature 7'),
  },
  {
    title: 'Salle de sport',
    picture: hs7('salle-de-sport', '/img/honest005.webp', 1280, 720, 'Salle de sport équipée de la résidence Honest Signature 7'),
  },
  {
    title: 'Cinéma en plein air',
    picture: hs7('cinema', '/img/honest003.webp', 1600, 1066, 'Cinéma en plein air sur le toit-terrasse, vue sur Marrakech'),
  },
];

/** The full list from the brief, shown as text so nothing is left out or mislabelled. */
export const AMENITY_LIST = [
  'Piscine résidentielle',
  'Piscine chauffée',
  'Spa',
  'Jacuzzi',
  'Salle de sport',
  'Cinéma en plein air',
  'Box parking',
] as const;

export type Room = { title: string; picture: Picture };

export const APARTMENT_VISUALS: Room[] = [
  {
    title: 'Séjour',
    picture: hs7('salon', '/img/honest007.webp', 1600, 900, 'Séjour lumineux d’un appartement Honest Signature 7'),
  },
  {
    title: 'Espace repas',
    picture: hs7('sejour-duplex', '/img/honest001.webp', 1600, 900, 'Espace repas et escalier d’un appartement Honest Signature 7'),
  },
  {
    title: 'Chambre',
    picture: hs7('chambre', '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-03.webp', 1600, 1067, 'Chambre d’un appartement Honest Signature 7'),
  },
  {
    title: 'Salle de bains',
    picture: hs7('salle-de-bain', '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-appartement-02.webp', 1600, 1066, 'Salle de bains en pierre claire d’un appartement Honest Signature 7'),
  },
  {
    title: 'Hall d’entrée',
    picture: hs7('hall', '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-residence-02.webp', 1600, 1066, 'Hall d’entrée de la résidence Honest Signature 7'),
  },
];

/* ── Conversion blocks ──────────────────────────────────────────────────── */

export const CTA_LABEL = 'Voir les lots disponibles';
export const CTA_MICROCOPY = 'Plans · prix · disponibilités actuelles';

export const TRUST_BAR = [
  `${DELIVERED_COUNT} résidences déjà livrées`,
  '1 min du Plaza',
  FACTS.surfaces,
  '30 % à la réservation',
] as const;

/* ── Lead form ──────────────────────────────────────────────────────────── */

/** Travels as-is in `property_type` (and the existing `propertyType` key). */
export const PROPERTY_TYPES = ['Studio', 'Appartement 1 chambre', 'Appartement 2 chambres'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * No lot counts: no inventory source exists for this project, so the rows
 * only open the form with the type pre-selected.
 */
export const AVAILABILITY_ROWS: { id: string; label: string; type: PropertyType }[] = [
  { id: 'studio', label: 'Studios', type: 'Studio' },
  { id: '1_chambre', label: '1 chambre', type: 'Appartement 1 chambre' },
  { id: '2_chambres', label: '2 chambres', type: 'Appartement 2 chambres' },
];

/**
 * Starts at the entry price (no range below it). Each label travels as-is in
 * `budget`, which contact.php caps at 30 chars.
 */
export const BUDGETS = [
  '1,39 M – 1,6 M MAD',
  '1,6 M – 2 M MAD',
  '2 M – 2,5 M MAD',
  'Plus de 2,5 M MAD',
] as const;

/** Value of the `source` key for this page's leads. */
export const LEAD_CHANNEL = 'Meta Ads';
export const LEAD_ORIGIN = 'Meta Landing Page';

/** `landing_name` per ad angle; the proof value is the one the CRM already receives. */
export const LANDING_NAMES = {
  proof: '6 residences livrees',
  price: '2500 EUR m2 Gueliz',
  payment: '30 pourcent reservation',
} as const;

export const LEAD_SOURCE = 'Landing Honest Signature 7';
export const FORM_TYPE = 'honest_signature_7_request';

/** One event per funnel stage, each fired once per page load (CTA_Click: per click). */
export const FUNNEL_EVENTS = {
  view: 'ViewContent',
  cta: 'CTA_Click',
  start: 'LeadFormStarted',
  qualified: 'LeadQualificationCompleted',
  lead: 'Lead',
} as const;
