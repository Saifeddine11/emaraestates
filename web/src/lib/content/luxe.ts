import type { FaqItem } from '@/components/seo/SeoFaq';

/**
 * Copy for `/immobilier-luxe-marrakech`, transcribed verbatim from
 * `immobilier-luxe-marrakech.html`. This page exists for search; treat every
 * string as frozen and diff against the source rather than rewriting.
 */

export const LUXE_HERO = {
  label: 'Immobilier premium',
  title: 'Immobilier luxe à Marrakech',
  intro:
    "Une sélection d'appartements neufs haut standing et de programmes immobiliers premium pour acheter ou investir à Marrakech avec un accompagnement clair.",
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-residence-01.webp',
} as const;

export const LUXE_SERVICES = {
  label: 'Notre approche',
  title: 'Pourquoi choisir Emara Estates ?',
  cards: [
    {
      title: 'Sélection exigeante',
      body: "Nous privilégions des projets immobiliers cohérents avec une clientèle premium : emplacement, qualité de construction, typologies et potentiel d'usage.",
    },
    {
      title: 'Accompagnement personnalisé',
      body: 'Chaque projet est étudié selon votre objectif : résidence principale, pied-à-terre, investissement locatif ou acquisition patrimoniale à Marrakech.',
    },
    {
      title: 'Informations claires',
      body: "Plans, prix, disponibilités, typologies et organisation de visite : l'objectif est de vous aider à avancer avec des informations concrètes.",
    },
  ],
} as const;

export const LUXE_PROGRAMS = {
  ariaLabel: 'Programmes immobiliers sélectionnés',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp',
  alt: 'Façade du programme Honest Signature 7 à Guéliz Marrakech',
  label: 'Programmes',
  title: 'Programmes immobiliers sélectionnés',
  intro:
    'Emara Estates met en avant des programmes cohérents avec une recherche haut standing : emplacement, qualité du projet, typologies et accompagnement clair avant la visite.',
  program: {
    body: 'Un programme immobilier neuf haut standing à Guéliz, avec studios, appartements, duplex et commerces.',
  },
  cta: { href: '/residences-honest-678/', text: 'Découvrir le programme' },
} as const;

export const LUXE_GUELIZ = {
  label: 'Guéliz',
  title: 'Un focus naturel sur Guéliz',
  image: '/img/maps-optimized.webp',
  alt: 'Appartement neuf haut standing à Guéliz Marrakech',
  body: "Guéliz fait partie des secteurs les plus demandés de Marrakech grâce à son accessibilité, ses commerces, ses restaurants, ses services et son attractivité auprès des résidents comme des visiteurs. Pour un achat immobilier haut standing, ce type d'emplacement joue un rôle important dans la valeur d'usage et la demande locative.",
} as const;

export const LUXE_CTA = {
  label: 'Votre projet',
  title: 'Vous cherchez un bien premium à Marrakech ?',
  intro:
    'Découvrez les programmes sélectionnés par Emara Estates ou échangez avec un conseiller pour recevoir les informations disponibles.',
  buttons: [
    {
      href: '/residences-honest-678/',
      text: 'Découvrir Honest Signature 7',
      variant: 'primary' as const,
    },
    { href: '/contact', text: 'Contacter Emara Estates', variant: 'outline' as const },
  ],
} as const;

export const LUXE_FAQ: FaqItem[] = [
  {
    id: 'faq-luxe-1',
    question: 'Quel type de bien propose Emara Estates à Marrakech ?',
    answer:
      'Emara Estates met en avant des biens et programmes immobiliers premium, notamment des appartements neufs haut standing et des projets sélectionnés dans des emplacements recherchés comme Guéliz.',
  },
  {
    id: 'faq-luxe-2',
    question: "L'immobilier de luxe à Marrakech concerne-t-il seulement les grandes villas ?",
    answer:
      'Non. Le marché premium peut aussi concerner des appartements neufs bien situés, des résidences haut standing, des duplex ou des biens adaptés à un usage personnel ou locatif.',
  },
  {
    id: 'faq-luxe-3',
    question: "Comment recevoir les informations d'un programme ?",
    answer:
      'Vous pouvez contacter Emara Estates pour recevoir les plans, les prix, les disponibilités et organiser une visite selon votre projet.',
  },
];
