/**
 * `/honest-signature-7/` content — the dedicated Meta Ads landing page.
 *
 * Positioning: one of the last available plots in Guéliz hyper-centre, the
 * residence's services, the promoter's track record, real delivered
 * interiors, current availability and a staged payment plan.
 *
 * Every figure comes from the campaign brief or from copy already live on the
 * site. The only computed amounts are the payment simulator's, which applies
 * the brief's percentages to a price the visitor enters. There is no stock
 * count, no countdown and no rental figure: none of those has a reliable source.
 *
 * Images: HS7 visuals are the project's own renders; the show apartments and
 * the delivered residences are real photographs already published on the
 * site. Responsive variants live in web/public/media/honest-7 (shipped by the
 * deploy); full-size originals are the live /img files.
 */

/**
 * Claims that need the client's confirmation before they may be displayed.
 * Everything gated here is built and tested; flipping a flag is the whole change.
 */
export const VALIDATION = {
  /**
   * Honest 5 and 6 shown as sold — confirmed by the client side on 2026-10-02.
   * The homepage still sells Honest 5 ("30 appartements restants", limited
   * offer card): that card contradicts this page until it is retired.
   */
  honest56Sold: true,
  /** « Quand il n’y a plus de terrain, il n’y a plus de neuf. » — brief: only once Emara approves the wording. */
  landScarcityLine: false,
  /** Pre-submit promise « Vous choisissez ensuite comment être contacté : WhatsApp ou appel. » — only if sales honour it. */
  contactChoicePromise: false,
  /**
   * contact.php accepts a lead without an e-mail, but whether the Zapier →
   * HubSpot step does could not be verified (HubSpot matches contacts by
   * e-mail). Required until confirmed; `false` shows the field as optional.
   */
  emailRequired: true,
  /**
   * Saves name / phone / e-mail server-side as soon as a valid phone or e-mail
   * is typed, before the visitor submits, so an abandoned form can be called
   * back. The form's privacy line and the footer notice do not say this yet:
   * the wording to add is the client's (and their counsel's) to decide.
   * `false` stops every draft request from this page.
   */
  partialCapture: true,
  /**
   * Prices, simulator and budget ranges in euros (the campaigns target France
   * only). The entry price, 149 000 €, is the client's figure (2026-10-08). The
   * two other budget bounds (180 000 € and 225 000 €) are still a conversion of
   * 2 M and 2,5 M MAD at about 11 MAD for 1 €, rounded to 5 000 €.
   * `false` shows the dirham figures everywhere and the lead says
   * `currency: MAD`.
   */
  euroPrices: true,
  /**
   * Form, question 1: 1 / 2 / 3 chambres instead of Studio / 1 chambre /
   * 2 chambres. « Appartement 3 chambres » is a value the CRM has never
   * received, and with it the hero’s « Studios & appartements » no longer
   * matches the form. `false` keeps the three types the CRM already knows.
   */
  threeBedrooms: true,
  /**
   * « N demandes reçues aujourd’hui » at the top of the lead cards. Needs
   * /activity.php and its library on the server. `false` shows no band and
   * sends no request to it.
   */
  activityCounter: true,
  /**
   * The optional questions shown once the lead is sent (project, preferred
   * contact, show-apartment visit) and their second request to the CRM. Off at
   * the client's request (2026-10-09): when the contact details are sent, the
   * visitor sees the confirmation and that is all.
   */
  postLeadQuestions: false,
  /**
   * « Studios & appartements · dès 56 m² » in the hero (56 m² is the client's
   * figure of 2026-10-08; the earlier copy said 51 m²), and the three types
   * offered in the form. Both come from copy already published for this
   * project (the earlier page's description said "dès 51 m²", the previous
   * ad landing asked Studio / 1 chambre / 2 chambres); neither was re-confirmed
   * for this version. The form has offered 1, 2 and 3 chambres since
   * 2026-10-08, at the client's request. `false` removes the line from the hero.
   */
  typologies: true,
} as const;

export const FACTS = {
  project: 'Honest Signature 7',
  location: 'Guéliz, Marrakech',
  plaza: 'À 1 minute à pied du Plaza',
  /**
   * The entry price is 1 590 000 MAD. With VALIDATION.euroPrices the page shows
   * it in euros — 149 000 €, the client's figure (2026-10-08) — and says in the
   * FAQ and under the simulator that the amount is indicative. BUDGETS and the
   * simulator's first shortcut start at the same figure.
   */
  priceFrom: VALIDATION.euroPrices ? '149\u00a0000\u00a0€' : '1,59\u00a0M\u00a0MAD',
  /** The hero figure: the amount, and its unit set smaller when it has one. */
  priceHero: VALIDATION.euroPrices ? { amount: '149\u00a0000\u00a0€', unit: '' } : { amount: '1,59\u00a0M', unit: 'MAD' },
  priceFromValue: VALIDATION.euroPrices ? 149_000 : 1_590_000,
  priceFromMad: '1\u00a0590\u00a0000\u00a0MAD',
  /** What the simulator, its event and the lead’s `currency` are expressed in. */
  currency: VALIDATION.euroPrices ? 'EUR' : 'MAD',
  delivery: 'Juin 2028',
  typologies: 'Studios & appartements',
  surfaceFrom: 'dès 56\u00a0m²',
} as const;

/** 30 / 15 / 15 / 15 / 25 — the brief's schedule, in order. */
export const PAYMENT_PLAN = [
  { share: 30, when: 'À la réservation' },
  { share: 15, when: 'Après 6 mois' },
  { share: 15, when: 'Après 12 mois' },
  { share: 15, when: 'Après 18 mois' },
  { share: 25, when: 'À la remise des clés' },
] as const;

/** Example prices offered as shortcuts in the simulator — the form’s budget bounds, not lot prices. */
export const SIMULATOR_PRESETS = VALIDATION.euroPrices
  ? ([
      { label: '149\u00a0000\u00a0€', value: 149_000 },
      { label: '180\u00a0000\u00a0€', value: 180_000 },
      { label: '225\u00a0000\u00a0€', value: 225_000 },
    ] as const)
  : ([
      { label: '1,59\u00a0M', value: 1_590_000 },
      { label: '2\u00a0M', value: 2_000_000 },
      { label: '2,5\u00a0M', value: 2_500_000 },
    ] as const);

export const SIMULATOR_MAX = VALIDATION.euroPrices ? 2_000_000 : 20_000_000;

/* ── Pictures ───────────────────────────────────────────────────────────── */

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
function withOriginal(name: string, original: string, width: number, height: number, alt: string): Picture {
  return {
    src: original,
    srcSet: `${M}/${name}-640.webp 640w, ${M}/${name}-1080.webp 1080w, ${original} ${width}w`,
    width,
    height,
    alt,
  };
}

/** Variants from /media only, largest last — used as `src` too. */
function media(name: string, widths: number[], width: number, height: number, alt: string): Picture {
  return {
    src: `${M}/${name}-${widths[widths.length - 1]}.webp`,
    srcSet: widths.map((value) => `${M}/${name}-${value}.webp ${value}w`).join(', '),
    width,
    height,
    alt,
  };
}

/** The LCP image: an extra 828w step so ~2x phones skip the 1080w file. */
export const HERO_IMAGE: Picture = {
  src: '/img/honest006.webp',
  srcSet: `${M}/facade-jour-640.webp 640w, ${M}/facade-jour-828.webp 828w, ${M}/facade-jour-1080.webp 1080w, /img/honest006.webp 1536w`,
  width: 1536,
  height: 1024,
  alt: 'Façade de Honest Signature 7 à Guéliz, Marrakech : balcons végétalisés et arcades en rez-de-chaussée',
};

/** Full width below lg, the right-hand ~54 % column from lg. */
export const HERO_SIZES = '(min-width: 1024px) 54vw, 100vw';

/**
 * Below lg the façade sits in a ~2:1 frame, so phones get that crop of the
 * same render (a quarter fewer bytes for the LCP image) instead of the 3:2 file.
 */
export const HERO_IMAGE_MOBILE = {
  media: '(max-width: 1023px)',
  srcSet: `${M}/facade-mobile-640.webp 640w, ${M}/facade-mobile-828.webp 828w, ${M}/facade-mobile-1080.webp 1080w`,
  src: `${M}/facade-mobile-828.webp`,
  sizes: '100vw',
  width: 1536,
  height: 768,
} as const;
export const HERO_MEDIA_DESKTOP = '(min-width: 1024px)';

/**
 * The hero slideshow: the façade above comes first (it is the LCP image and
 * the only one in the page's HTML), then these renders of the same project,
 * loaded once the page is done. `position` is the crop kept in the wide,
 * shallow frame the hero has on phones.
 */
export type HeroSlide = { picture: Picture; position?: string };
export const HERO_SLIDES: HeroSlide[] = [
  {
    picture: media('facade-nuit', [640, 1080, 1600], 1600, 1249, 'Honest Signature 7 de nuit, façade éclairée sur rue à Guéliz'),
    position: '50% 82%',
  },
  {
    picture: media('piscine', [640, 1080], 1080, 721, 'Piscine extérieure du projet Honest Signature 7, bordée de transats'),
    position: '50% 62%',
  },
  { picture: media('salon', [640, 1080], 1080, 608, 'Séjour lumineux d’un appartement Honest Signature 7') },
  { picture: media('spa', [640, 1080, 1600], 1600, 1066, 'Espace spa du projet Honest Signature 7 : bassin intérieur, sauna et jacuzzi'), position: '50% 60%' },
  { picture: media('cinema', [640, 1080], 1080, 720, 'Cinéma extérieur du projet Honest Signature 7, face à Marrakech'), position: '50% 68%' },
];

export const MAP_IMAGE = withOriginal(
  'carte',
  '/img/maps.webp',
  1672,
  941,
  'Vue aérienne de Guéliz : Honest Signature 7 à 1 minute à pied du Plaza',
);

/* ── Hero ───────────────────────────────────────────────────────────────── */

export type AmenityIconName =
  | 'pool'
  | 'heated-pool'
  | 'spa'
  | 'sauna'
  | 'jacuzzi'
  | 'gym'
  | 'cinema'
  | 'concierge'
  | 'parking';

/** Every amenity of the residence, one short label each — « Piscines » stands for both pools. */
export const HERO_AMENITIES: { label: string; icon: AmenityIconName }[] = [
  { label: 'Piscines', icon: 'pool' },
  { label: 'Spa', icon: 'spa' },
  { label: 'Sauna', icon: 'sauna' },
  { label: 'Jacuzzi', icon: 'jacuzzi' },
  { label: 'Salle de sport', icon: 'gym' },
  { label: 'Cinéma extérieur', icon: 'cinema' },
  { label: 'Conciergerie', icon: 'concierge' },
  { label: 'Parking titré', icon: 'parking' },
];

/* ── Amenities, grouped by benefit ──────────────────────────────────────── */

export type AmenityGroup = {
  benefit: string;
  items: { label: string; icon: AmenityIconName }[];
  /** Only groups with a matching project visual carry one. */
  picture?: Picture;
  position?: string;
  /** One short line, for the groups shown without a visual. */
  line?: string;
};

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    benefit: 'Nager toute l’année',
    items: [
      { label: 'Piscine extérieure', icon: 'pool' },
      { label: 'Piscine intérieure chauffée', icon: 'heated-pool' },
    ],
    picture: withOriginal(
      'piscine',
      '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-03.webp',
      1600,
      1067,
      'Piscine extérieure du projet Honest Signature 7, bordée de transats',
    ),
    position: '50% 62%',
  },
  {
    benefit: 'Décompresser sans sortir',
    items: [
      { label: 'Spa', icon: 'spa' },
      { label: 'Sauna', icon: 'sauna' },
      { label: 'Jacuzzi', icon: 'jacuzzi' },
    ],
    picture: media('spa', [640, 1080, 1600], 1600, 1066, 'Espace spa du projet Honest Signature 7 : bassin intérieur, sauna et jacuzzi'),
    position: '58% 55%',
  },
  {
    benefit: 'Rester actif',
    items: [{ label: 'Salle de sport', icon: 'gym' }],
    picture: withOriginal('salle-de-sport', '/img/honest005.webp', 1280, 720, 'Salle de sport équipée du projet Honest Signature 7'),
    position: '60% 50%',
  },
  {
    benefit: 'Recevoir sous les étoiles',
    items: [{ label: 'Cinéma extérieur', icon: 'cinema' }],
    picture: withOriginal('cinema', '/img/honest003.webp', 1600, 1066, 'Cinéma extérieur du projet Honest Signature 7, face à Marrakech'),
    position: '50% 60%',
  },
  {
    benefit: 'Déléguer le quotidien',
    items: [{ label: 'Conciergerie', icon: 'concierge' }],
    line: 'Un service de conciergerie pensé pour simplifier le quotidien.',
  },
  {
    benefit: 'Se garer chez soi',
    items: [{ label: 'Parking titré', icon: 'parking' }],
    line: 'Une place de parking titrée, au sein de la résidence.',
  },
];

/* ── Show apartments: real interiors of delivered Honest residences ─────── */

export type ShowRoom = { title: string; residence: string; picture: Picture };

function showroom(name: string, original: string, width: number, height: number, alt: string): Picture {
  return withOriginal(name, `/img/appartements-temoins/${original}.webp`, width, height, alt);
}

/**
 * Labels describe what each photograph shows. The brief's "Salle de bain" and
 * "Terrasse" slides are not used as such: no dedicated photograph of either
 * exists, so the closest real views carry an honest label instead.
 */
export const SHOW_APARTMENTS: ShowRoom[] = [
  {
    title: 'Séjour',
    residence: 'Honest 2',
    picture: showroom('temoin-sejour', 'honest-2-appartement-temoin-02', 1600, 1062, 'Séjour ouvert sur une terrasse dans un appartement témoin de la résidence Honest 2'),
  },
  {
    title: 'Cuisine',
    residence: 'Honest 3',
    picture: showroom('temoin-cuisine', 'honest-3-appartement-temoin-01', 1600, 899, 'Cuisine équipée et coin repas dans un appartement témoin de la résidence Honest 3'),
  },
  {
    title: 'Chambre',
    residence: 'Honest 2',
    picture: showroom('temoin-chambre', 'honest-2-appartement-temoin-01', 1600, 1099, 'Chambre avec baie vitrée et balcon dans un appartement témoin de la résidence Honest 2'),
  },
  {
    title: 'Salle d’eau',
    residence: 'Honest 1',
    picture: showroom('temoin-salle-d-eau', 'honest-1-appartement-temoin-01', 1600, 886, 'Entrée ouvrant sur le séjour, salle d’eau en bois à droite, dans un appartement témoin de la résidence Honest 1'),
  },
  {
    title: 'Espace repas',
    residence: 'Honest 4',
    picture: showroom('temoin-repas', 'honest-4-appartement-temoin-01', 1600, 900, 'Coin repas et cuisine dans un appartement témoin de la résidence Honest 4'),
  },
];

/* ── Track record ───────────────────────────────────────────────────────── */

export type ResidenceStatus = 'delivered' | 'sold' | 'selling';

export type Residence = {
  number: number;
  name: string;
  status: ResidenceStatus;
  /** Real photographs exist for the delivered residences only. */
  picture?: Picture;
  /** `object-position` of the photograph in its card. */
  position?: string;
};

export const STATUS_LABEL: Record<ResidenceStatus, string> = {
  delivered: 'Livrée',
  sold: 'Vendue',
  selling: 'En commercialisation',
};

const facade = (number: number, alt: string): Picture => media(`honest-${number}`, [480, 900], 900, 506, alt);

const ALL_RESIDENCES: Residence[] = [
  { number: 1, name: 'Honest 1', status: 'delivered', picture: facade(1, 'Vue extérieure de la résidence Honest 1 à Guéliz, Marrakech') },
  { number: 2, name: 'Honest 2', status: 'delivered', picture: facade(2, 'Façade avec balcons de la résidence Honest 2 à Guéliz') },
  { number: 3, name: 'Honest 3', status: 'delivered', picture: facade(3, 'Façade de la résidence Honest 3 à Guéliz, Marrakech'), position: '18% 40%' },
  { number: 4, name: 'Honest 4', status: 'delivered', picture: facade(4, 'Façade de la résidence Honest 4 à Marrakech') },
  { number: 5, name: 'Honest 5', status: 'sold' },
  { number: 6, name: 'Honest 6', status: 'sold' },
  { number: 7, name: 'Honest 7', status: 'selling' },
];

/** Only the statuses that may be shown today (see VALIDATION.honest56Sold). */
export const RESIDENCES: Residence[] = ALL_RESIDENCES.filter(
  (residence) => residence.status !== 'sold' || VALIDATION.honest56Sold,
);

export const SOLD_SHOWN = RESIDENCES.some((residence) => residence.status === 'sold');

/* ── FAQ — verified facts only ──────────────────────────────────────────── */

export const FAQ: { question: string; answer: string }[] = [
  {
    question: `À quoi correspond le prix de ${FACTS.priceFrom} ?`,
    answer:
      `C’est le prix de départ du projet : ${FACTS.priceFromMad}${VALIDATION.euroPrices ? `, soit environ ${FACTS.priceFrom} au taux de change actuel. Le montant en euros est indicatif : il varie avec ce taux` : ''}. Le prix de chaque appartement dépend ensuite de sa surface, de son étage et de son orientation. Le dossier détaille les prix lot par lot.`,
  },
  {
    question: 'Quand la résidence sera-t-elle livrée ?',
    answer: 'La livraison est prévue en juin 2028.',
  },
  {
    question: 'Quels appartements sont encore disponibles ?',
    answer:
      'Les disponibilités évoluent au fil des réservations. Un conseiller vous transmet la liste à jour, lot par lot : étages, surfaces et orientations encore disponibles.',
  },
  {
    question: 'Puis-je acheter depuis l’étranger ?',
    answer:
      'Le dossier et les échanges se font à distance, par WhatsApp, appel ou e-mail, quel que soit votre pays de résidence. Votre conseiller vous précise ensuite les démarches adaptées à votre situation.',
  },
  {
    question: 'Quel est le plan de paiement ?',
    answer:
      '30 % à la réservation, puis 15 % après 6 mois, 15 % après 12 mois, 15 % après 18 mois, et 25 % à la remise des clés. Votre conseiller confirme les conditions exactes du lot choisi.',
  },
  {
    question: 'Quels documents vais-je recevoir ?',
    answer:
      'La brochure du projet, les plans, les prix lot par lot, les disponibilités actuelles et l’échéancier de paiement. Pour un projet d’investissement, le dossier comprend aussi des éléments d’analyse du potentiel locatif.',
  },
  {
    question: 'Puis-je visiter un appartement témoin ?',
    answer:
      'Oui. Une fois votre demande envoyée, vous pouvez indiquer le jour et le moment qui vous conviennent. Un conseiller vous confirme ensuite le rendez-vous.',
  },
];

/* ── Lead form ──────────────────────────────────────────────────────────── */

/** What the visitor receives — the value exchanged for their details. */
export const DOSSIER_CONTENTS = [
  'Brochure du projet',
  'Plans des appartements',
  'Prix lot par lot',
  'Disponibilités actuelles',
  'Échéancier de paiement',
  'Analyse du potentiel locatif',
] as const;

/**
 * Post-submit question 1. `intent` is the `purchase_intent` sent to Zapier:
 * the first three reuse the values the CRM already receives from this page.
 */
export const INTENTS = [
  { label: 'Y habiter', intent: 'Résidence principale' },
  { label: 'Investir', intent: 'Investissement' },
  { label: 'Pied-à-terre', intent: 'Résidence secondaire' },
  { label: 'Je me renseigne', intent: 'Je me renseigne' },
] as const;

export const INVEST_INTENT = 'Investissement';

/** Post-submit question 2 → `contact_preference`. */
export const CHANNELS = ['WhatsApp', 'Appel'] as const;

export const VISIT_MOMENTS = ['Matin', 'Après-midi', 'Fin de journée'] as const;

/**
 * Form, question 1. `value` is the `propertyType` sent to Zapier. Studio,
 * 1 chambre and 2 chambres are values /residence-boutique-gueliz already
 * sends; « Appartement 3 chambres » (VALIDATION.threeBedrooms) is new to the CRM.
 */
export const PROPERTY_TYPES = VALIDATION.threeBedrooms
  ? ([
      { value: 'Appartement 1 chambre', label: '1 chambre', rooms: 1 },
      { value: 'Appartement 2 chambres', label: '2 chambres', rooms: 2 },
      { value: 'Appartement 3 chambres', label: '3 chambres', rooms: 3 },
    ] as const)
  : ([
      { value: 'Studio', label: 'Studio', rooms: 0 },
      { value: 'Appartement 1 chambre', label: '1 chambre', rooms: 1 },
      { value: 'Appartement 2 chambres', label: '2 chambres', rooms: 2 },
    ] as const);

/**
 * Form, question 2. Starts at the entry price (no range below it). In euros
 * with VALIDATION.euroPrices: from the 149 000 € entry price, then the dirham
 * bounds 2 M and 2,5 M at about 11 MAD for 1 €, rounded to 5 000 €. Each label travels as-is in `budget`, which contact.php
 * caps at 30 characters.
 */
export const BUDGETS = VALIDATION.euroPrices
  ? (['149 000 – 180 000 €', '180 000 – 225 000 €', 'Plus de 225 000 €'] as const)
  : (['1,59 M – 2 M MAD', '2 M – 2,5 M MAD', 'Plus de 2,5 M MAD'] as const);

/*
 * Wire values. FORM_TYPE, LEAD_SOURCE, LEAD_CHANNEL, LEAD_ORIGIN and
 * LANDING_NAME are what the Zap and the CRM already receive from this page:
 * they are unchanged on purpose, so existing filters and reports keep working.
 */
export const FORM_TYPE = 'honest_signature_7_request';
export const LEAD_SOURCE = 'Landing Honest Signature 7';
/** Value of the `source` key for this page's leads. */
export const LEAD_CHANNEL = 'Meta Ads';
export const LEAD_ORIGIN = 'Meta Landing Page';
export const LANDING_NAME = '6 residences livrees';

/** Project metadata attached to every lead — the visitor never picks the project. */
export const PROJECT_META = {
  project_name: 'Honest Signature 7',
  project_location: 'Gueliz',
  lead_source: 'dedicated_ads_landing',
} as const;

/** `lead_stage`: the first request creates the lead, the second only completes it. */
export const LEAD_STAGE = { lead: 'lead', qualification: 'qualification' } as const;
