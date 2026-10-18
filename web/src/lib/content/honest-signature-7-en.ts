/**
 * `/honest-signature-7-en/` content — the UK-English copy of the dedicated
 * Meta Ads landing page (client request, 2026-10-12: « tout pareil sauf en
 * anglais uk »). Same facts, same figures, same wire values as the French
 * original (`honest-signature-7.ts`); only the visitor-facing copy differs.
 * Wire values — FORM_TYPE, LEAD_SOURCE, PROPERTY_TYPES values, CRM messages —
 * stay identical so the Zap, HubSpot filters and reports keep working;
 * `page_url` tells the two pages apart.
 */

/**
 * Claims that need the client's confirmation before they may be displayed.
 * Kept in lockstep with the French original.
 */
export const VALIDATION = {
  /** Honest 5 and 6 shown as sold — confirmed by the client side on 2026-10-02. */
  honest56Sold: true,
  /** "When the land is gone, there is no more new-build." — only once Emara approves the wording. */
  landScarcityLine: false,
  /** Pre-submit promise about choosing WhatsApp or a call — only if sales honour it. */
  contactChoicePromise: false,
  /** E-mail required until the Zapier → HubSpot step is confirmed to accept leads without one. */
  emailRequired: true,
  /** Server-side drafts of abandoned forms (see the original for the caveats). */
  partialCapture: true,
  /** Prices, simulator and budget ranges in pounds on this page (client request, 2026-10-12). */
  euroPrices: true,
  /** Form, question 1: 1 / 2 / 3 bedrooms instead of Studio / 1 / 2. */
  threeBedrooms: true,
  /** The live daily counter — replaced by a static band (2026-10-12; the stock figure STOCK_LEFT since 2026-10-14). */
  activityCounter: false,
  /** The optional post-lead questions. Off at the client's request (2026-10-09). */
  postLeadQuestions: false,
  /** The two form questions (type, budget), before the contact details. Back on at the client's request (2026-10-14). */
  formQuestions: true,
  /** The page opens on the first lead card (OpenOnForm). Off at the client's request (2026-10-17), kept for later. */
  openOnForm: false,
  /** "Studios & apartments · from 56 m²" in the hero and the three types in the form. */
  typologies: true,
} as const;

/**
 * "15 last apartments available" at the top of the lead cards (see
 * StockNotice). The client's own stock figure — see the French original for
 * the provenance. Keep both pages' figures in step and never above the real
 * stock. `0` removes the band.
 */
export const STOCK_LEFT = 15;

export const FACTS = {
  project: 'Honest Signature 7',
  location: 'Guéliz, Marrakech',
  plaza: '1 minute’s walk from the Plaza',
  /**
   * The entry price is 1,590,000 MAD — about €149,000, the client's figure
   * (2026-10-08), shown here in pounds (client request, 2026-10-12):
   * £127,000 at ~0.85 GBP/EUR. The FAQ and the simulator both say the
   * amount is indicative and moves with the exchange rate.
   */
  priceFrom: VALIDATION.euroPrices ? '£127,000' : '1.59\u00a0M\u00a0MAD',
  /** The hero figure: the amount, and its unit set smaller when it has one. */
  priceHero: VALIDATION.euroPrices ? { amount: '£127,000', unit: '' } : { amount: '1.59 M', unit: 'MAD' },
  priceFromValue: VALIDATION.euroPrices ? 127_000 : 1_590_000,
  priceFromMad: '1,590,000 MAD',
  /** What the simulator, its event and the lead’s `currency` are expressed in. */
  currency: VALIDATION.euroPrices ? 'GBP' : 'MAD',
  delivery: 'June 2028',
  typologies: 'Studios & apartments',
  surfaceFrom: 'from 56 m²',
} as const;

/** 30 / 15 / 15 / 15 / 25 — the brief's schedule, in order. */
export const PAYMENT_PLAN = [
  { share: 30, when: 'On reservation' },
  { share: 15, when: 'After 6 months' },
  { share: 15, when: 'After 12 months' },
  { share: 15, when: 'After 18 months' },
  { share: 25, when: 'On key handover' },
] as const;

/** Example prices offered as shortcuts in the simulator — the form’s budget bounds, not unit prices. */
export const SIMULATOR_PRESETS = VALIDATION.euroPrices
  ? ([
      { label: '£127,000', value: 127_000 },
      { label: '£155,000', value: 155_000 },
      { label: '£190,000', value: 190_000 },
    ] as const)
  : ([
      { label: '1.59 M', value: 1_590_000 },
      { label: '2 M', value: 2_000_000 },
      { label: '2.5 M', value: 2_500_000 },
    ] as const);

export const SIMULATOR_MAX = VALIDATION.euroPrices ? 1_700_000 : 20_000_000;

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
  alt: 'Façade of Honest Signature 7 in Guéliz, Marrakech: planted balconies and ground-floor arcades',
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
    picture: media('facade-nuit', [640, 1080, 1600], 1600, 1249, 'Honest Signature 7 at night, lit street façade in Guéliz'),
    position: '50% 82%',
  },
  {
    picture: media('piscine', [640, 1080], 1080, 721, 'Outdoor pool of the Honest Signature 7 project, lined with sun loungers'),
    position: '50% 62%',
  },
  { picture: media('salon', [640, 1080], 1080, 608, 'Bright living room of a Honest Signature 7 apartment') },
  { picture: media('spa', [640, 1080, 1600], 1600, 1066, 'Spa area of the Honest Signature 7 project: indoor pool, sauna and jacuzzi'), position: '50% 60%' },
  { picture: media('cinema', [640, 1080], 1080, 720, 'Outdoor cinema of the Honest Signature 7 project, facing Marrakech'), position: '50% 68%' },
];

export const MAP_IMAGE = withOriginal(
  'carte',
  '/img/maps.webp',
  1672,
  941,
  'Aerial view of Guéliz: Honest Signature 7, a 1-minute walk from the Plaza',
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

/**
 * Every amenity of the residence, one short label each — "Pools" stands for
 * both pools. `short` is what a phone shows, where four share a row under
 * their pictograms (the cinema's moon and stars say "outdoor").
 */
export const HERO_AMENITIES: { label: string; short?: string; icon: AmenityIconName }[] = [
  { label: 'Pools', icon: 'pool' },
  { label: 'Spa', icon: 'spa' },
  { label: 'Sauna', icon: 'sauna' },
  { label: 'Jacuzzi', icon: 'jacuzzi' },
  { label: 'Gym', icon: 'gym' },
  { label: 'Outdoor cinema', short: 'Cinema', icon: 'cinema' },
  { label: 'Concierge service', short: 'Concierge', icon: 'concierge' },
  { label: 'Titled parking', icon: 'parking' },
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
    benefit: 'Swim all year round',
    items: [
      { label: 'Outdoor pool', icon: 'pool' },
      { label: 'Heated indoor pool', icon: 'heated-pool' },
    ],
    picture: withOriginal(
      'piscine',
      '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-03.webp',
      1600,
      1067,
      'Outdoor pool of the Honest Signature 7 project, lined with sun loungers',
    ),
    position: '50% 62%',
  },
  {
    benefit: 'Unwind without leaving',
    items: [
      { label: 'Spa', icon: 'spa' },
      { label: 'Sauna', icon: 'sauna' },
      { label: 'Jacuzzi', icon: 'jacuzzi' },
    ],
    picture: media('spa', [640, 1080, 1600], 1600, 1066, 'Spa area of the Honest Signature 7 project: indoor pool, sauna and jacuzzi'),
    position: '58% 55%',
  },
  {
    benefit: 'Stay active',
    items: [{ label: 'Gym', icon: 'gym' }],
    picture: withOriginal('salle-de-sport', '/img/honest005.webp', 1280, 720, 'Fully equipped gym of the Honest Signature 7 project'),
    position: '60% 50%',
  },
  {
    benefit: 'Entertain under the stars',
    items: [{ label: 'Outdoor cinema', icon: 'cinema' }],
    picture: withOriginal('cinema', '/img/honest003.webp', 1600, 1066, 'Outdoor cinema of the Honest Signature 7 project, facing Marrakech'),
    position: '50% 60%',
  },
  {
    benefit: 'Delegate the day-to-day',
    items: [{ label: 'Concierge service', icon: 'concierge' }],
    line: 'A concierge service designed to make everyday life simpler.',
  },
  {
    benefit: 'Park at home',
    items: [{ label: 'Titled parking', icon: 'parking' }],
    line: 'A titled parking space of your own, within the residence.',
  },
];

/* ── Show apartments: real interiors of delivered Honest residences ─────── */

export type ShowRoom = { title: string; residence: string; picture: Picture };

function showroom(name: string, original: string, width: number, height: number, alt: string): Picture {
  return withOriginal(name, `/img/appartements-temoins/${original}.webp`, width, height, alt);
}

/**
 * Labels describe what each photograph shows. The brief's "Bathroom" and
 * "Terrace" slides are not used as such: no dedicated photograph of either
 * exists, so the closest real views carry an honest label instead.
 */
export const SHOW_APARTMENTS: ShowRoom[] = [
  {
    title: 'Living room',
    residence: 'Honest 2',
    picture: showroom('temoin-sejour', 'honest-2-appartement-temoin-02', 1600, 1062, 'Living room opening onto a terrace in a show apartment of the Honest 2 residence'),
  },
  {
    title: 'Kitchen',
    residence: 'Honest 3',
    picture: showroom('temoin-cuisine', 'honest-3-appartement-temoin-01', 1600, 899, 'Fitted kitchen and dining corner in a show apartment of the Honest 3 residence'),
  },
  {
    title: 'Bedroom',
    residence: 'Honest 2',
    picture: showroom('temoin-chambre', 'honest-2-appartement-temoin-01', 1600, 1099, 'Bedroom with floor-to-ceiling window and balcony in a show apartment of the Honest 2 residence'),
  },
  {
    title: 'Shower room',
    residence: 'Honest 1',
    picture: showroom('temoin-salle-d-eau', 'honest-1-appartement-temoin-01', 1600, 886, 'Entrance opening onto the living room, wood-panelled shower room on the right, in a show apartment of the Honest 1 residence'),
  },
  {
    title: 'Dining area',
    residence: 'Honest 4',
    picture: showroom('temoin-repas', 'honest-4-appartement-temoin-01', 1600, 900, 'Dining corner and kitchen in a show apartment of the Honest 4 residence'),
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
  delivered: 'Delivered',
  sold: 'Sold',
  selling: 'Now selling',
};

const facade = (number: number, alt: string): Picture => media(`honest-${number}`, [480, 900], 900, 506, alt);

const ALL_RESIDENCES: Residence[] = [
  { number: 1, name: 'Honest 1', status: 'delivered', picture: facade(1, 'Exterior view of the Honest 1 residence in Guéliz, Marrakech') },
  { number: 2, name: 'Honest 2', status: 'delivered', picture: facade(2, 'Balconied façade of the Honest 2 residence in Guéliz') },
  { number: 3, name: 'Honest 3', status: 'delivered', picture: facade(3, 'Façade of the Honest 3 residence in Guéliz, Marrakech'), position: '18% 40%' },
  { number: 4, name: 'Honest 4', status: 'delivered', picture: facade(4, 'Façade of the Honest 4 residence in Marrakech') },
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
    question: `What does the ${FACTS.priceFrom} price correspond to?`,
    answer:
      `It is the project's starting price: ${FACTS.priceFromMad}${VALIDATION.euroPrices ? `, roughly ${FACTS.priceFrom} at the current exchange rate. The pound amount is indicative: it moves with that rate` : ''}. Each apartment's price then depends on its size, floor and orientation. The information pack details the prices unit by unit.`,
  },
  {
    question: 'When will the residence be delivered?',
    answer: 'Delivery is expected in June 2028.',
  },
  {
    question: 'Which apartments are still available?',
    answer:
      'Availability changes as reservations come in. An adviser sends you the up-to-date list, unit by unit: the floors, sizes and orientations still available.',
  },
  {
    question: 'Can I buy from abroad?',
    answer:
      'The pack and every exchange are handled remotely, by WhatsApp, phone or e-mail, whatever your country of residence. Your adviser then walks you through the steps that apply to your situation.',
  },
  {
    question: 'What is the payment plan?',
    answer:
      '30% on reservation, then 15% after 6 months, 15% after 12 months, 15% after 18 months, and 25% on key handover. Your adviser confirms the exact terms for the unit you choose.',
  },
  {
    question: 'What documents will I receive?',
    answer:
      'The project brochure, the floor plans, the prices unit by unit, the current availability and the payment schedule. For an investment project, the pack also includes an analysis of the rental potential.',
  },
  {
    question: 'Can I visit a show apartment?',
    answer:
      'Yes. Once your request is sent, you can tell us the day and time that suit you. An adviser then confirms the appointment.',
  },
];

/* ── Lead form ──────────────────────────────────────────────────────────── */

export type DossierIconName = 'brochure' | 'plans' | 'prices' | 'availability' | 'schedule' | 'rental';

/** What the visitor receives — the value exchanged for their details. */
export const DOSSIER_CONTENTS: readonly { label: string; icon: DossierIconName }[] = [
  { label: 'Brochure', icon: 'brochure' },
  { label: 'Floor plans', icon: 'plans' },
  { label: 'Unit prices', icon: 'prices' },
  { label: 'Availability', icon: 'availability' },
  { label: 'Payment plan', icon: 'schedule' },
  { label: 'Rental potential', icon: 'rental' },
];

/**
 * Post-submit question 1. `intent` is the `purchase_intent` sent to Zapier:
 * the values are the ones the CRM already receives — only the labels are
 * English.
 */
export const INTENTS = [
  { label: 'To live in', intent: 'Résidence principale' },
  { label: 'To invest', intent: 'Investissement' },
  { label: 'A pied-à-terre', intent: 'Résidence secondaire' },
  { label: 'Just looking', intent: 'Je me renseigne' },
] as const;

export const INVEST_INTENT = 'Investissement';

/** Post-submit question 2 → `contact_preference`. Values unchanged for the CRM. */
export const CHANNELS = ['WhatsApp', 'Appel'] as const;

export const VISIT_MOMENTS = ['Morning', 'Afternoon', 'End of day'] as const;

/**
 * Form, question 1. `value` is the `propertyType` sent to Zapier — the French
 * values the CRM already knows; only the labels are English.
 */
export const PROPERTY_TYPES = VALIDATION.threeBedrooms
  ? ([
      { value: 'Appartement 1 chambre', label: '1 bedroom', rooms: 1 },
      { value: 'Appartement 2 chambres', label: '2 bedrooms', rooms: 2 },
      { value: 'Appartement 3 chambres', label: '3 bedrooms', rooms: 3 },
    ] as const)
  : ([
      { value: 'Studio', label: 'Studio', rooms: 0 },
      { value: 'Appartement 1 chambre', label: '1 bedroom', rooms: 1 },
      { value: 'Appartement 2 chambres', label: '2 bedrooms', rooms: 2 },
    ] as const);

/**
 * Form, question 2. Starts at the entry price (no range below it). Each label
 * travels as-is in `budget`, which contact.php caps at 30 characters.
 */
export const BUDGETS = VALIDATION.euroPrices
  ? (['£127,000 – £155,000', '£155,000 – £190,000', 'Over £190,000'] as const)
  : (['1.59 M – 2 M MAD', '2 M – 2.5 M MAD', 'Over 2.5 M MAD'] as const);

/*
 * Wire values — IDENTICAL to the French page on purpose: the Zap and the CRM
 * filters treat both pages as one campaign; `page_url` tells them apart.
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
