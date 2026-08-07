import type { SlideImage } from '@/components/gallery/PropertySlider';

/**
 * `/residences-honest-678/` content, transcribed verbatim from the static build.
 *
 * Copy, alt text, lightbox captions and image order are all preserved. Treat
 * this file as content, not configuration — edits here change what Google sees.
 */

/** Featured card slider, `#apercu`. Legacy `data-slider-delay="3800"`. */
export const SUMMARY_SLIDES: SlideImage[] = [
  {
    src: '/img/honest006.webp',
    alt: "Façade contemporaine d'Honest Signature 7 à Guéliz Marrakech",
    lightboxTitle: 'Façade contemporaine - Honest Signature 7 à Guéliz Marrakech',
    width: 1536,
    height: 1024,
  },
  {
    src: '/img/honest002.webp',
    alt: 'Sauna et jacuzzi de la résidence Honest Signature 7 à Marrakech',
    lightboxTitle: 'Sauna et jacuzzi premium - Honest Signature 7 Marrakech',
    width: 1600,
    height: 1067,
  },
  {
    src: '/img/honest003.webp',
    alt: 'Rooftop avec salon cinéma et vue sur Marrakech depuis Honest Signature 7',
    lightboxTitle: 'Rooftop avec cinéma privé et vue Marrakech - Honest Signature 7',
    width: 1600,
    height: 1066,
  },
  {
    src: '/img/honest004.webp',
    alt: 'Piscine intérieure de la résidence Honest Signature 7 à Guéliz',
    lightboxTitle: 'Piscine intérieure haut standing - Honest Signature 7 Guéliz',
    width: 1600,
    height: 900,
  },
  {
    src: '/img/honest005.webp',
    alt: 'Salle de sport équipée dans la résidence Honest Signature 7 à Marrakech',
    lightboxTitle: 'Salle de sport équipée - Résidence Honest Signature 7 Marrakech',
    width: 1280,
    height: 720,
  },
  {
    src: '/img/honest007.webp',
    alt: "Perspective de façade d'Honest Signature 7 à Guéliz",
    lightboxTitle: 'Perspective de façade - Honest Signature 7 Guéliz',
    width: 1600,
    height: 900,
  },
];

/**
 * Gallery ribbon, `#galerie`. Same six photos as the slider but NOT the same
 * alt strings: the honest005 entry drops "la résidence". Both spellings are in
 * the indexed page, so both are kept exactly as authored.
 */
export const GALLERY_IMAGES = [
  {
    src: '/img/honest006.webp',
    alt: "Façade contemporaine d'Honest Signature 7 à Guéliz Marrakech",
    width: 1536,
    height: 1024,
  },
  {
    src: '/img/honest002.webp',
    alt: 'Sauna et jacuzzi de la résidence Honest Signature 7 à Marrakech',
    width: 1600,
    height: 1067,
  },
  {
    src: '/img/honest003.webp',
    alt: 'Rooftop avec salon cinéma et vue sur Marrakech depuis Honest Signature 7',
    width: 1600,
    height: 1066,
  },
  {
    src: '/img/honest004.webp',
    alt: 'Piscine intérieure de la résidence Honest Signature 7 à Guéliz',
    width: 1600,
    height: 900,
  },
  {
    src: '/img/honest005.webp',
    alt: 'Salle de sport équipée dans Honest Signature 7 à Marrakech',
    width: 1280,
    height: 720,
  },
  {
    src: '/img/honest007.webp',
    alt: "Perspective de façade d'Honest Signature 7 à Guéliz",
    width: 1600,
    height: 900,
  },
];

/** `#prestations`. `paths` are the legacy inline SVG outlines, unchanged. */
export const AMENITIES = [
  {
    title: 'Piscines au rez-de-chaussée',
    text: 'Deux bassins pensés pour des usages complémentaires, avec une piscine chauffée et une piscine classique intégrées dès le rez-de-chaussée.',
    paths: [
      'M3 15c2.1-2.3 5.1-3.5 9-3.5s6.9 1.2 9 3.5',
      'M4.5 18c1.8-1.3 4.3-2 7.5-2s5.7.7 7.5 2',
      'M12 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
    ],
  },
  {
    title: 'Spa résidentiel',
    text: 'Un espace spa dédié au relâchement et au bien-être, conçu pour prolonger l’atmosphère calme et confidentielle de la résidence.',
    paths: [
      'M6 18V7.5a2.5 2.5 0 012.5-2.5h7A2.5 2.5 0 0118 7.5V18',
      'M8.5 10.5h7',
      'M8.5 14h7',
      'M10 3.5v2',
      'M14 3.5v2',
    ],
  },
  {
    title: 'Jacuzzi',
    text: 'Un jacuzzi intégré aux espaces détente pour offrir un supplément de confort recherché dans une adresse de haut standing.',
    paths: [
      'M4 20V8l8-4 8 4v12',
      'M7 14c1.4-1 2.8-1.5 5-1.5s3.6.5 5 1.5',
      'M8 17c1.1-.7 2.4-1 4-1s2.9.3 4 1',
      'M9.5 9.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0z',
    ],
  },
  {
    title: 'Salle de sport',
    text: 'Une salle de sport réservée aux résidents, pensée pour un usage quotidien confortable au sein même du projet.',
    paths: ['M5 18V9', 'M19 18V9', 'M8 18V12', 'M16 18V12', 'M5 9h14', 'M8 9V6h8v3'],
  },
  {
    title: 'Vestiaires séparés hommes / femmes',
    text: 'Des vestiaires distincts pour hommes et femmes, conçus pour offrir plus d’intimité, de confort et de praticité au quotidien.',
    paths: ['M6 19V6l6-2 6 2v13', 'M6 10h12', 'M9 13v6', 'M15 13v6'],
  },
  {
    title: 'Parking titré & box privatifs',
    text: 'Des stationnements titrés et des box privatifs qui renforcent la valeur patrimoniale et la qualité d’usage de l’ensemble.',
    paths: ['M4 16l2-6h12l2 6', 'M6 16v3', 'M18 16v3', 'M8 10V7h8v3', 'M8 16h8'],
  },
];

/** `#typologies`. */
export const TYPOLOGIES = [
  {
    kicker: 'Studio',
    title: 'Compact et premium',
    text: 'Une réponse idéale pour un premier investissement, la location meublée ou un pied-à-terre en hyper-centre.',
  },
  {
    kicker: 'Appartement',
    title: 'Confort quotidien',
    text: 'Des surfaces de 39 à 140 m² pensées pour un usage résidentiel stable, lumineux et valorisant.',
  },
  {
    kicker: 'Duplex',
    title: 'Volumes signature',
    text: 'Une lecture plus exclusive du programme avec des espaces généreux et différenciants.',
  },
  {
    kicker: 'Commerce',
    title: 'Visibilité & flux',
    text: 'Des magasins commerciaux bien positionnés dans une zone à forte fréquentation urbaine.',
  },
];

/** Overview section pull-outs. */
export const SIGNATURE_POINTS = [
  {
    title: 'Positionnement',
    text: 'Hyper centre, à proximité immédiate des commerces, restaurants et services.',
  },
  {
    title: 'Conception',
    text: 'Une esthétique sobre, raffinée et intemporelle, inspirée des codes hôteliers haut de gamme.',
  },
  {
    title: 'Projet patrimonial',
    text: 'Un actif pensé pour habiter, préparer un pied-à-terre ou étudier une stratégie patrimoniale à Guéliz.',
  },
];

export const SHOW_APARTMENT_POINTS = [
  'Finitions et matériaux',
  'Volumes et luminosité',
  'Typologies disponibles',
  'Plans, prix et disponibilités à jour',
];

export const LOCATION_POINTS = [
  'À proximité immédiate des commerces, restaurants et cafés de référence',
  'Connexion rapide aux axes majeurs de Marrakech',
  'Cadre recherché par une clientèle locale et internationale',
];

/** Google Maps embed for `#localisation` — distinct from the footer's office map. */
export const GUELIZ_MAP_EMBED =
  'https://www.google.com/maps?q=Gu%C3%A9liz%20Marrakech&z=15&output=embed';
