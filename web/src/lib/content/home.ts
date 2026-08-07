import type { SlideImage } from '@/components/gallery/PropertySlider';

/**
 * Homepage content, transcribed verbatim from the static build.
 *
 * Copy, alt text, lightbox captions and image order are all preserved. Treat
 * this file as content, not configuration — edits here change what Google sees.
 */

export const FEATURED_SLIDES: SlideImage[] = [
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
    src: '/img/appartements-temoins/honest-7-appartement-temoin-01.webp',
    alt: 'Honest Signature 7 à Guéliz Marrakech - salon',
    lightboxTitle: 'Appartement témoin Honest Signature 7 - Guéliz Marrakech',
    width: 1600,
    height: 900,
  },
  {
    src: '/img/appartements-temoins/honest-7-appartement-temoin-02.webp',
    alt: 'Honest Signature 7 à Guéliz Marrakech - chambre',
    lightboxTitle: 'Appartement témoin Honest Signature 7 - Guéliz Marrakech',
    width: 1600,
    height: 1066,
  },
];

export const RIBBON_IMAGES = [
  {
    src: '/img/honest001.webp',
    alt: "Façade d'une résidence Honest Signature à Guéliz Marrakech",
    width: 1600,
    height: 900,
  },
  {
    src: '/img/honest002.webp',
    alt: "Hall intérieur d'une résidence Honest Signature à Guéliz",
    width: 1600,
    height: 1067,
  },
  {
    src: '/img/honest003.webp',
    alt: "Circulation intérieure et finitions d'une résidence Honest Signature",
    width: 1600,
    height: 1066,
  },
  {
    src: '/img/honest004.webp',
    alt: "Vue extérieure d'un programme immobilier Honest Signature à Marrakech",
    width: 1600,
    height: 900,
  },
  {
    src: '/img/honest005.webp',
    alt: "Détail architectural d'un appartement neuf Honest Signature",
    width: 1280,
    height: 720,
  },
  {
    src: '/img/honest006.webp',
    alt: 'Espace de vie de haut standing dans une résidence Honest Signature',
    width: 1536,
    height: 1024,
  },
];

export type SoldResidence = {
  id: string;
  galleryLabel: string;
  title: string;
  location: string;
  types: string;
  status: string;
  soldLabel: string;
  slides: SlideImage[];
};

const COMMON_TYPES = 'Studios, appartements, duplex, magasins';
const SOLD_LABEL = 'Programme entièrement commercialisé';

export const SOLD_RESIDENCES: SoldResidence[] = [
  {
    id: 'honest-1',
    galleryLabel: 'Résidence Honest 1',
    title: 'Résidence Honest 1',
    location: 'Guéliz hyper-centre, Marrakech',
    types: COMMON_TYPES,
    status: 'Livré',
    soldLabel: SOLD_LABEL,
    slides: [
      {
        src: '/img/optimized/realisations/honest1-900.webp',
        fullSrc: '/img/honest1.webp',
        alt: 'Entrée de la Résidence Honest 1 à Guéliz Marrakech',
        lightboxTitle: 'Entrée de résidence livrée - Honest Signature 1 Guéliz Marrakech',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/optimized/realisations/honest12-900.webp',
        fullSrc: '/img/honest12.webp',
        alt: 'Façade avec balcons de la Résidence Honest 1 à Guéliz',
        lightboxTitle: 'Façade avec balcons - Résidence Honest Signature 1 Guéliz',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/optimized/realisations/honest22-900.webp',
        fullSrc: '/img/honest22.webp',
        alt: 'Vue extérieure de la Résidence Honest 1 à Marrakech',
        lightboxTitle: 'Vue extérieure de résidence livrée - Honest Signature 1 Marrakech',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/appartements-temoins/honest-1-appartement-temoin-01.webp',
        alt: 'Appartement témoin de la Résidence Honest 1 à Guéliz Marrakech - salon',
        lightboxTitle: 'Appartement témoin Résidence Honest 1 - Guéliz Marrakech',
        width: 1600,
        height: 886,
      },
      {
        src: '/img/appartements-temoins/honest-1-appartement-temoin-02.webp',
        alt: 'Appartement témoin de la Résidence Honest 1 à Guéliz Marrakech - chambre',
        lightboxTitle: 'Appartement témoin Résidence Honest 1 - Guéliz Marrakech',
        width: 1600,
        height: 899,
      },
    ],
  },
  {
    id: 'honest-2',
    galleryLabel: 'Résidence Honest 2',
    title: 'Résidence Honest 2',
    location: 'Guéliz hyper-centre, Marrakech',
    types: COMMON_TYPES,
    status: 'Livré',
    soldLabel: SOLD_LABEL,
    slides: [
      {
        src: '/img/optimized/realisations/honest2-900.webp',
        fullSrc: '/img/honest2.webp',
        alt: 'Entrée de la Résidence Honest Signature 2 à Guéliz Marrakech',
        lightboxTitle: 'Entrée de résidence livrée - Honest Signature 2 Guéliz Marrakech',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/optimized/realisations/honest222-900.webp',
        fullSrc: '/img/honest222.webp',
        alt: 'Façade avec balcons de la Résidence Honest Signature 2 à Guéliz',
        lightboxTitle: 'Façade avec balcons - Résidence Honest Signature 2 Guéliz',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/appartements-temoins/honest-2-appartement-temoin-01.webp',
        alt: 'Appartement témoin de la Résidence Honest 2 à Guéliz Marrakech - séjour',
        lightboxTitle: 'Appartement témoin Résidence Honest 2 - Guéliz Marrakech',
        width: 1600,
        height: 1099,
      },
      {
        src: '/img/appartements-temoins/honest-2-appartement-temoin-02.webp',
        alt: 'Appartement témoin de la Résidence Honest 2 à Guéliz Marrakech - suite',
        lightboxTitle: 'Appartement témoin Résidence Honest 2 - Guéliz Marrakech',
        width: 1600,
        height: 1062,
      },
    ],
  },
  {
    id: 'honest-3',
    galleryLabel: 'Résidence Honest 3',
    title: 'Résidence Honest 3',
    location: 'Guéliz hyper-centre, Marrakech',
    types: COMMON_TYPES,
    status: 'Livré',
    soldLabel: SOLD_LABEL,
    slides: [
      {
        src: '/img/optimized/realisations/honest3-900.webp',
        fullSrc: '/img/honest3.webp',
        alt: 'Entrée de la Résidence Honest Signature 3 à Guéliz Marrakech',
        lightboxTitle: 'Entrée contemporaine - Résidence Honest Signature 3 Marrakech',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/optimized/realisations/honest31-900.webp',
        fullSrc: '/img/honest31.webp',
        alt: 'Façade de la Résidence Honest Signature 3 à Guéliz Marrakech',
        lightboxTitle: 'Façade de résidence livrée - Honest Signature 3 Guéliz Marrakech',
        width: 1800,
        height: 1013,
      },
      {
        src: '/img/appartements-temoins/honest-3-appartement-temoin-01.webp',
        alt: 'Appartement témoin de la Résidence Honest 3 à Guéliz Marrakech - salon',
        lightboxTitle: 'Appartement témoin Résidence Honest 3 - Guéliz Marrakech',
        width: 1600,
        height: 899,
      },
      {
        src: '/img/appartements-temoins/honest-3-appartement-temoin-02.webp',
        alt: 'Appartement témoin de la Résidence Honest 3 à Guéliz Marrakech - espace nuit',
        lightboxTitle: 'Appartement témoin Résidence Honest 3 - Guéliz Marrakech',
        width: 1600,
        height: 1070,
      },
    ],
  },
  {
    id: 'honest-4',
    galleryLabel: 'Résidence Honest 4',
    title: 'Résidence Honest 4',
    location: 'Guéliz hyper-centre, Marrakech',
    types: COMMON_TYPES,
    status: 'Livré',
    soldLabel: SOLD_LABEL,
    slides: [
      {
        src: '/img/optimized/realisations/honest4-900.webp',
        fullSrc: '/img/honest4.webp',
        alt: 'Entrée de la Résidence Honest Signature 4 à Guéliz Marrakech',
        lightboxTitle: 'Entrée de résidence haut standing - Honest Signature 4 Guéliz',
        width: 1800,
        height: 1200,
      },
      {
        src: '/img/optimized/realisations/honest42-900.webp',
        fullSrc: '/img/honest42.webp',
        alt: 'Luminaires décoratifs du hall de la Résidence Honest Signature 4',
        lightboxTitle: 'Hall design avec luminaires - Résidence Honest Signature 4',
        width: 1800,
        height: 1310,
        position: 'bottom center',
      },
      {
        src: '/img/optimized/realisations/honest43-900.webp',
        fullSrc: '/img/honest43.webp',
        alt: 'Façade moderne de la Résidence Honest Signature 4 à Marrakech',
        lightboxTitle: 'Façade moderne avec balcons - Honest Signature 4 Marrakech',
        width: 1800,
        height: 1012,
      },
      {
        src: '/img/optimized/realisations/honest4333-900.webp',
        fullSrc: '/img/honest4333.webp',
        alt: "Hall d'entrée avec boîtes aux lettres de la Résidence Honest Signature 4",
        lightboxTitle: "Hall d'entrée avec finitions premium - Honest Signature 4",
        width: 1800,
        height: 1310,
      },
      {
        src: '/img/appartements-temoins/honest-4-appartement-temoin-01.webp',
        alt: 'Appartement témoin de la Résidence Honest 4 à Guéliz Marrakech - salon',
        lightboxTitle: 'Appartement témoin Résidence Honest 4 - Guéliz Marrakech',
        width: 1600,
        height: 900,
      },
      {
        src: '/img/appartements-temoins/honest-4-appartement-temoin-02.webp',
        alt: 'Appartement témoin de la Résidence Honest 4 à Guéliz Marrakech - chambre',
        lightboxTitle: 'Appartement témoin Résidence Honest 4 - Guéliz Marrakech',
        width: 1600,
        height: 879,
      },
    ],
  },
];

export const HONEST_5_SLIDES: SlideImage[] = [
  {
    src: '/img/optimized/realisations/honest5-900.webp',
    fullSrc: '/img/honest5.webp',
    alt: 'Chantier de la Résidence Honest Signature 5 à Guéliz Marrakech',
    lightboxTitle: 'Chantier en cours - Résidence Honest Signature 5 Guéliz Marrakech',
    width: 1800,
    height: 1013,
  },
  {
    src: '/img/optimized/realisations/honest52-900.webp',
    fullSrc: '/img/honest52.webp',
    alt: 'Structure en construction de la Résidence Honest Signature 5 à Marrakech',
    lightboxTitle: 'Avancement des travaux - Honest Signature 5 Marrakech',
    width: 1800,
    height: 1013,
  },
];

export const SHOWFLAT_SLIDES = [
  {
    src: '/img/appartements-temoins/honest-1-appartement-temoin-01.webp',
    alt: "Espace de vie d'un appartement témoin Honest Signature 1 à Guéliz Marrakech",
    lightboxTitle: 'Espace de vie appartement témoin Honest Signature 1 — Guéliz Marrakech',
    width: 1600,
    height: 886,
  },
  {
    src: '/img/appartements-temoins/honest-1-appartement-temoin-02.webp',
    alt: "Chambre d'un appartement témoin Honest Signature 1 à Guéliz Marrakech",
    lightboxTitle: 'Chambre appartement témoin Honest Signature 1 — Guéliz Marrakech',
    width: 1600,
    height: 899,
  },
  {
    src: '/img/appartements-temoins/honest-2-appartement-temoin-01.webp',
    alt: "Séjour d'un appartement témoin Honest Signature 2 à Guéliz Marrakech",
    lightboxTitle: 'Séjour appartement témoin Honest Signature 2 — Guéliz Marrakech',
    width: 1600,
    height: 1099,
  },
  {
    src: '/img/appartements-temoins/honest-2-appartement-temoin-02.webp',
    alt: "Suite d'un appartement témoin Honest Signature 2 à Guéliz Marrakech",
    lightboxTitle: 'Suite appartement témoin Honest Signature 2 — Guéliz Marrakech',
    width: 1600,
    height: 1062,
  },
  {
    src: '/img/appartements-temoins/honest-3-appartement-temoin-01.webp',
    alt: "Salon d'un appartement témoin Honest Signature 3 à Guéliz Marrakech",
    lightboxTitle: 'Salon appartement témoin Honest Signature 3 — Guéliz Marrakech',
    width: 1600,
    height: 899,
  },
  {
    src: '/img/appartements-temoins/honest-3-appartement-temoin-02.webp',
    alt: "Espace nuit d'un appartement témoin Honest Signature 3 à Guéliz Marrakech",
    lightboxTitle: 'Espace nuit appartement témoin Honest Signature 3 — Guéliz Marrakech',
    width: 1600,
    height: 1070,
  },
  {
    src: '/img/appartements-temoins/honest-4-appartement-temoin-01.webp',
    alt: "Espace de vie d'un appartement témoin Honest Signature 4 à Guéliz Marrakech",
    lightboxTitle: 'Espace de vie appartement témoin Honest Signature 4 — Guéliz Marrakech',
    width: 1600,
    height: 900,
  },
  {
    src: '/img/appartements-temoins/honest-4-appartement-temoin-02.webp',
    alt: "Chambre d'un appartement témoin Honest Signature 4 à Guéliz Marrakech",
    lightboxTitle: 'Chambre appartement témoin Honest Signature 4 — Guéliz Marrakech',
    width: 1600,
    height: 879,
  },
];

export const SERVICES = [
  {
    number: '01',
    title: 'Sélection personnalisée',
    body: "Nous identifions le programme et le type d'appartement qui correspondent à votre projet : résidence principale, pied-à-terre ou investissement locatif.",
  },
  {
    number: '02',
    title: 'Visite et conseil',
    body: "Visitez nos appartements témoins, comparez les programmes, et bénéficiez de nos conseils sur le choix du quartier, de l'étage et de l'orientation.",
  },
  {
    number: '03',
    title: 'Accompagnement administratif',
    body: 'Contrat légalisé et authentifié, versement sécurisé de 30%, suivi notarial. Nous simplifions chaque démarche pour vous.',
  },
  {
    number: '04',
    title: 'Acquéreurs internationaux',
    body: 'Ouvert à toutes les nationalités. Nous accompagnons les non-résidents dans les démarches spécifiques : procuration, ouverture de compte, conseil fiscal.',
  },
];

export const FAQ_ITEMS = [
  {
    id: 'faq-home-1',
    question: 'Qui est le promoteur des résidences ?',
    answer:
      'Emara Estates opère en partenariat exclusif avec Honest Signature, un promoteur de référence à Marrakech, reconnu pour la qualité de ses réalisations et le respect de ses engagements. Ensemble, nous avons déjà 4 résidences livrées à Guéliz — Honest Signature 7 est actuellement en cours de construction.',
  },
  {
    id: 'faq-home-2',
    question: 'Où se situent les projets ?',
    answer:
      "Tous nos programmes sont situés en hyper-centre de Guéliz, le quartier le plus prisé de Marrakech. À proximité immédiate du Carré Eden, du Plaza et de l'ensemble des commerces, restaurants et services.",
  },
  {
    id: 'faq-home-3',
    question: "Comment se déroule la procédure d'achat ?",
    answer:
      "La procédure est simple et sécurisée. Un versement initial de 30% est requis à la réservation, suivi de la signature d'un contrat légalisé et authentifié. Nous vous accompagnons à chaque étape, de la réservation jusqu'à la remise des clés.",
  },
  {
    id: 'faq-home-4',
    question: "Quelles garanties protègent l'acquéreur ?",
    answer:
      "Chaque contrat de réservation est encadré par la loi Dahir relative à l'achèvement des constructions. Cette loi garantit la protection de l'acquéreur et engage le promoteur à livrer le bien dans les conditions convenues contractuellement.",
  },
  {
    id: 'faq-home-5',
    question: 'Quel est le potentiel locatif ?',
    answer:
      "Les appartements situés en hyper-centre de Guéliz peuvent intéresser une clientèle locative grâce à la centralité du quartier et à l'attractivité de Marrakech. Le potentiel doit toujours être étudié selon la typologie, le prix, les charges, la gestion et les conditions réelles du marché.",
  },
  {
    id: 'faq-home-6',
    question: "Comment évaluer un projet d'investissement ?",
    answer:
      "Un projet d'investissement se compare selon le prix d'achat, les charges, la fiscalité, la gestion locative, la demande réelle et l'horizon de détention. Emara Estates vous aide à réunir les informations disponibles, sans garantir de rendement.",
  },
  {
    id: 'faq-home-7',
    question: 'Le bien peut-il prendre de la valeur avec le temps ?',
    answer:
      "Un bien bien situé peut présenter un intérêt patrimonial, mais l'évolution de valeur dépend du marché, de l'emplacement exact, de la qualité du programme et des conditions de revente. Aucune plus-value n'est garantie.",
  },
  {
    id: 'faq-home-8',
    question: 'Puis-je visiter un appartement témoin ?',
    answer:
      'Absolument. Nous vous invitons à visiter nos appartements témoins sur rendez-vous afin de constater par vous-même la qualité des finitions et des prestations. Contactez-nous pour planifier votre visite.',
  },
  {
    id: 'faq-home-9',
    question: 'Faut-il être marocain pour acheter ?',
    answer:
      "Non. L'acquisition est ouverte à toutes les nationalités sans restriction. Que vous résidiez au Maroc ou à l'étranger, nous vous accompagnons dans l'ensemble des démarches administratives et bancaires nécessaires.",
  },
];

export const ABOUT_VALUES = [
  {
    title: 'Sélection premium à Marrakech',
    body: 'Des programmes immobiliers choisis pour leur emplacement, leur qualité de construction et leur cohérence avec une clientèle haut standing.',
  },
  {
    title: 'Focus Guéliz et quartiers stratégiques',
    body: "Une attention particulière aux emplacements recherchés de Marrakech, notamment Guéliz, pour l'achat, la résidence ou l'investissement locatif.",
  },
  {
    title: 'Accompagnement clair',
    body: 'Un suivi simple pour recevoir les plans, comparer les typologies, vérifier les disponibilités et organiser une visite avec un conseiller.',
  },
];
