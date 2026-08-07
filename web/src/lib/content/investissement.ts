import type { FaqItem } from '@/components/seo/SeoFaq';

/**
 * Copy for `/investissement-immobilier-marrakech`, transcribed verbatim from
 * `investissement-immobilier-marrakech.html`.
 *
 * The "Prudence" passage carries explicit no-guarantee language. It is a
 * compliance statement as much as copy — do not trim or soften it.
 */

export const INVEST_HERO = {
  label: 'Investissement',
  title: 'Investissement immobilier à Marrakech',
  intro:
    "Une approche claire pour identifier des appartements neufs et programmes immobiliers adaptés à un projet d'investissement à Marrakech.",
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-01.webp',
} as const;

export const INVEST_ANALYSIS = {
  ariaLabel: "Visualiser l'opportunité avant de décider",
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-01.webp',
  alt: "Intérieur d'un appartement neuf haut standing à Guéliz Marrakech",
  label: 'Analyse',
  title: "Visualiser l'opportunité avant de décider",
  intro:
    "Avant d'étudier un investissement, il est important de comparer l'emplacement, la typologie, la qualité du programme et les conditions réelles du marché.",
  points: [
    {
      term: 'Emplacement',
      detail:
        "Marrakech et Guéliz offrent une centralité recherchée. L'emplacement influence l'usage du bien, la demande locative et la lisibilité du projet.",
    },
    {
      term: 'Typologie',
      detail:
        "Studio, appartement ou duplex ne répondent pas au même objectif d'investissement. La comparaison des surfaces et configurations reste essentielle avant une décision.",
    },
    {
      term: 'Conditions réelles du marché',
      detail:
        'Les prix, charges, fiscalité et conditions de gestion locative varient selon les biens. Une analyse prudente reste nécessaire avant tout engagement.',
    },
  ],
  cta: { href: '/residences-honest-678/', text: 'Étudier Honest Signature 7' },
} as const;

export const INVEST_NEUF = {
  label: 'Neuf',
  title: "L'intérêt d'un appartement neuf",
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-03.webp',
  alt: "Espace de vie d'un appartement neuf à Guéliz Marrakech",
  body: "Un appartement neuf peut offrir plus de confort, une meilleure lisibilité des prestations et moins de travaux à prévoir au moment de l'acquisition. Pour un projet locatif, la qualité du bien, son emplacement et sa présentation peuvent influencer l'attractivité auprès des futurs occupants.",
} as const;

export const INVEST_GUELIZ = {
  label: 'Guéliz',
  title: 'Guéliz, un secteur stratégique',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-01.webp',
  alt: "Espace de vie d'un appartement neuf à Guéliz",
  body: "Guéliz est souvent recherché pour sa centralité, son accessibilité et la présence de nombreux services. Ce type d'emplacement peut convenir à plusieurs usages : résidence, pied-à-terre, location moyenne durée ou projet locatif selon la stratégie de l'acheteur.",
} as const;

export const INVEST_SERVICES = {
  label: 'Accompagnement',
  title: 'Comment Emara Estates accompagne les investisseurs',
  cards: [
    {
      title: 'Analyse du projet',
      body: 'Nous échangeons sur votre objectif : achat patrimonial, investissement locatif, pied-à-terre ou résidence à Marrakech.',
    },
    {
      title: 'Lecture des opportunités',
      body: "Nous vous aidons à comparer l'emplacement, les typologies, les prix, les plans et les disponibilités des programmes sélectionnés.",
    },
    {
      title: 'Décision plus claire',
      body: "Vous avancez avec des informations structurées avant d'organiser une visite ou de demander plus de détails sur un bien.",
    },
  ],
} as const;

export const INVEST_PROGRAM = {
  label: 'Opportunité',
  title: 'Une opportunité à étudier à Guéliz',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-residence-02.webp',
  alt: 'Résidence Honest Signature 7 à Guéliz Marrakech',
  cta: { href: '/residences-honest-678/', text: 'Étudier Honest Signature 7' },
} as const;

export const INVEST_PRUDENCE = {
  label: 'Prudence',
  title: 'Un investissement doit rester étudié',
  body: "Emara Estates peut vous accompagner dans la compréhension des programmes et des opportunités disponibles, mais chaque investissement doit être analysé selon votre budget, votre horizon, les charges, la fiscalité, la gestion locative et les conditions réelles du marché. Aucune rentabilité n'est garantie. Toute décision d'investissement doit être étudiée selon le prix réel, les charges, la gestion, la fiscalité et les conditions du marché.",
} as const;

export const INVEST_CTA = {
  label: 'Votre projet',
  title: "Étudier un projet d'investissement à Marrakech",
  intro:
    'Recevez les informations disponibles sur les programmes sélectionnés et échangez avec Emara Estates pour clarifier votre projet.',
  buttons: [
    {
      href: '/residences-honest-678/',
      text: 'Découvrir Honest Signature 7',
      variant: 'primary' as const,
    },
    { href: '/contact', text: 'Contact conseiller', variant: 'outline' as const },
  ],
} as const;

export const INVEST_FAQ: FaqItem[] = [
  {
    id: 'faq-invest-1',
    question: 'Marrakech est-elle intéressante pour un investissement immobilier ?',
    answer:
      "Marrakech peut présenter un intérêt pour certains investisseurs grâce à son attractivité touristique, ses quartiers recherchés et la demande pour des biens bien situés. Le choix du bien et de l'emplacement reste essentiel.",
  },
  {
    id: 'faq-invest-2',
    question: 'Quel type de bien choisir pour investir à Marrakech ?',
    answer:
      "Cela dépend de votre objectif. Un studio, un appartement haut standing ou un duplex peuvent répondre à des stratégies différentes selon le budget, l'emplacement et la gestion prévue.",
  },
];
