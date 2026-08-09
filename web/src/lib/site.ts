/**
 * Preserved site constants.
 *
 * Every value here is a migration contract lifted verbatim from the static
 * build. Changing one changes a live, Google-indexed destination or a lead
 * routing path. See MIGRATION-PRESERVATION-CHECKLIST.md sections 1 and 4.
 */

export const SITE_ORIGIN = 'https://emaraestates.com';

/** Canonical routes. Note the deliberate trailing-slash asymmetry. */
export const ROUTES = {
  home: '/',
  residences: '/residences-honest-678/',
  contact: '/contact',
  immobilierLuxe: '/immobilier-luxe-marrakech',
  appartementNeufGueliz: '/appartement-neuf-gueliz-marrakech',
  investissement: '/investissement-immobilier-marrakech',
  recrutement: '/recrutement-commercial-marrakech',
} as const;

/** Homepage section anchors. `nos-réalisations` is intentionally accented. */
export const ANCHORS = {
  biens: '#biens',
  visite3d: '#visite-3d',
  simulateurApport: '#simulateur-apport',
  localisation: '#localisation',
  realisations: '#nos-réalisations',
  /** Honest 5 featured card — lives in `#nos-réalisations`. */
  residenceHonest5: '#residence-honest-5',
  appartementTemoinHonest: '#appartement-temoin-honest',
  appartementsTemoins: '#appartements-temoins',
  newsletter: '#newsletter',
  about: '#about',
  services: '#services',
  faq: '#faq',
  contact: '#contact',
} as const;

export const CONTACT = {
  phoneDisplay: '+212 6 700 388 99',
  email: 'contact@emaraestates.com',
  addressLine1: '2ème etage, Business center Paul,',
  addressLine2: 'Rue Mouatamid Ibn Abaad, Marrakech 40000',
  hours: 'Lun – Sam : 9h – 19h',
} as const;

/**
 * WhatsApp deep links. The `?text=` payloads are pre-encoded and are NOT
 * interchangeable — each entry point has its own prefilled message.
 *
 * The homepage uses `general` in exactly two places: the CTA band and the float.
 * `/residences-honest-678/` uses `bare` in its two places (CTA band and float)
 * with no prefill at all. `/contact` uses `echange` in its two places (the
 * quick-contact row and the float). Serving one page the other's link would
 * silently change what every lead sends us, so the float resolves this per route.
 */
export const WHATSAPP = {
  general:
    'https://wa.me/212670038899?text=Bonjour%2C%20je%20vous%20contacte%20au%20sujet%20des%20projets%20immobiliers%20propos%C3%A9s%20par%20Emara%20Estates%20et%20j%E2%80%99aimerais%20obtenir%20plus%20d%E2%80%99informations.%20Merci',
  bare: 'https://wa.me/212670038899',
  echange:
    'https://wa.me/212670038899?text=Bonjour%2C%20je%20souhaite%20%C3%A9changer%20avec%20Emara%20Estates%20au%20sujet%20d%27un%20projet%20immobilier%20%C3%A0%20Marrakech.%20Merci',
} as const;

/**
 * Which WhatsApp link the floating button carries, per route. Keys are
 * pathnames with any trailing slash removed (the export runs with
 * `trailingSlash: false`, so that is what `usePathname` reports).
 */
export const WHATSAPP_FLOAT_BY_ROUTE: Record<string, string> = {
  '': WHATSAPP.general,
  '/residences-honest-678': WHATSAPP.bare,
  '/contact': WHATSAPP.echange,
  // The three SEO landing pages all use the bare link, like the project page.
  '/immobilier-luxe-marrakech': WHATSAPP.bare,
  '/appartement-neuf-gueliz-marrakech': WHATSAPP.bare,
  '/investissement-immobilier-marrakech': WHATSAPP.bare,
  '/recrutement-commercial-marrakech': WHATSAPP.bare,
};

export const SOCIAL = {
  instagram: 'https://www.instagram.com/emara.estates',
  tiktok: 'https://www.tiktok.com/@emara.estates?_r=1&_t=ZS-95VFqI78Wjw',
  snapchat: 'https://snapchat.com/t/kQce8jwo',
} as const;

export const EXTERNAL = {
  virtualTour3d:
    'https://www.vertex-france.com/PACKAGE/HONEST_SIGNATURE/HonestPrestige2/navigation/menu/index.html?nocom#model',
  matterportShowflat: 'https://my.matterport.com/show/?m=QYfDKCkKrvs',
  mapsEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d875.8418635332205!2d-8.00738759783571!3d31.6316639507953!2m3!1f0!2f0!3f0!2m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xdafefb6dcc86ea1%3A0x6ae3814ee3fb96d0!2sEMARA%20ESTATES%20Marrakech!5e0!3m2!1sfr!2sma!4v1776019628621!5m2!1sfr!2sma',
} as const;

/**
 * Form endpoints. These stay as PHP paths: the site is served by Apache and the
 * handlers (contact.php, newsletter.php, lead-gueliz.php) are untouched by this
 * migration. Field names are wire contracts consumed by HubSpot/Zapier/SMTP.
 *
 * Recruitment is a dedicated email-only pipeline (no HubSpot / Zapier).
 * `/api/recruitment/apply` is rewritten to `recruitment.php` on Apache and
 * handled natively by `server.js` in local preview.
 */
export const ENDPOINTS = {
  contact: '/contact.php',
  newsletter: '/newsletter.php',
  recruitment: '/api/recruitment/apply',
} as const;

export const ANALYTICS_AHREFS_KEY = 'Tyd763kKZT871KqrdS45Sg';
