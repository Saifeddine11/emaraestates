import type { FaqItem } from '@/components/seo/SeoFaq';

/**
 * Copy for `/appartement-neuf-gueliz-marrakech`, transcribed verbatim from
 * `appartement-neuf-gueliz-marrakech.html`. The largest of the three landing
 * pages: two services grids, a gallery and an appartement-témoin teaser.
 *
 * Note `cœur` with the ligature in two headings here, against `coeur` without
 * it on `/contact`. Both are authored that way; neither is normalized.
 */

export const GUELIZ_HERO = {
  label: 'Guéliz Marrakech',
  title: 'Appartement neuf à Guéliz Marrakech',
  intro:
    'Acheter un appartement neuf à Guéliz permet de viser un emplacement central, proche des commerces, des services, de la gare et des principaux axes de Marrakech.',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp',
} as const;

export const GUELIZ_IMAGES = {
  ariaLabel: 'Honest Signature 7 en images',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-01.webp',
  alt: "Espace de vie d'un appartement neuf Honest Signature 7 à Guéliz Marrakech",
  label: 'Honest Signature 7',
  title: 'Honest Signature 7 en images',
  intro:
    "Les visuels permettent de mieux comprendre l'ambiance du programme, les finitions et le positionnement haut standing d'Honest Signature 7 à Guéliz.",
  miniCards: [
    {
      title: 'Un programme neuf à Guéliz',
      body: "Honest Signature 7 s'inscrit dans un quartier central et recherché de Marrakech, adapté à l'achat résidentiel comme à certains projets d'investissement.",
    },
    {
      title: 'Des espaces pensés pour plusieurs usages',
      body: "Studios, appartements, duplex et commerces permettent d'étudier plusieurs typologies selon votre objectif : habiter, investir ou préparer un pied-à-terre.",
    },
    {
      title: 'Plans, prix et disponibilités',
      body: 'Emara Estates vous accompagne pour recevoir les informations à jour, comparer les typologies et organiser une visite.',
    },
  ],
  cta: { href: '/residences-honest-678/', text: 'Voir le programme' },
} as const;

export const GUELIZ_LOCATION = {
  label: 'Emplacement',
  title: 'Pourquoi acheter à Guéliz ?',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-residence-01.webp',
  alt: 'Résidence Honest Signature 7 à Marrakech',
  body: 'Emara Estates sélectionne des programmes immobiliers neufs pour les acheteurs qui recherchent un bien haut standing, un pied-à-terre ou une opportunité patrimoniale à étudier. Guéliz combine centralité, accessibilité, commerces, restaurants, services et proximité avec les principaux axes de Marrakech.',
} as const;

/** First `.services` block — deliberately has no `id`. */
export const GUELIZ_WHY_NEW = {
  label: 'Achat neuf',
  title: 'Pourquoi acheter un appartement neuf à Guéliz ?',
  intro:
    "Un achat immobilier neuf à Guéliz se compare selon l'emplacement, les typologies, les prestations et la clarté des informations disponibles avant réservation.",
  cards: [
    {
      title: 'Hyper-centre de Marrakech',
      body: "Guéliz reste l'un des quartiers les plus recherchés pour sa centralité, ses commerces, ses restaurants et son accès rapide aux services.",
    },
    {
      title: 'Programmes neufs haut standing',
      body: "Les programmes sélectionnés mettent l'accent sur les finitions, les espaces communs, les typologies et la cohérence du projet.",
    },
    {
      title: 'Typologies adaptées',
      body: "Studios, appartements familiaux, duplex ou commerces permettent d'étudier plusieurs objectifs d'achat.",
    },
    {
      title: 'Accompagnement avant réservation',
      body: "Plans, prix, surfaces, disponibilités et conditions de réservation sont vérifiés avant d'avancer.",
    },
  ],
} as const;

export const GUELIZ_TYPOLOGIES = {
  label: 'Typologies',
  title: 'Des appartements neufs pour plusieurs objectifs',
  image: '/img/honest-signature-7/honest7-res-nuit.webp',
  alt: 'Appartement neuf haut standing à Guéliz Marrakech',
  body: 'Un appartement neuf à Guéliz peut répondre à différents projets : résidence principale, pied-à-terre à Marrakech, investissement locatif ou acquisition patrimoniale. Les typologies disponibles selon les programmes peuvent inclure studios, appartements familiaux, duplex ou biens commerciaux.',
} as const;

export const GUELIZ_GALLERY = {
  ariaLabel: 'Galerie Honest Signature 7 à Guéliz',
  label: 'Honest Signature 7',
  title: 'Un programme neuf au cœur de Guéliz',
  images: [
    {
      src: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp',
      alt: 'Façade du programme Honest Signature 7 à Guéliz Marrakech',
      width: 1600,
      height: 1067,
    },
    {
      src: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-01.webp',
      alt: "Espace de vie d'un appartement neuf à Guéliz",
      width: 1600,
      height: 1066,
    },
    {
      src: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-interieur-02.webp',
      alt: "Intérieur d'un appartement neuf Honest Signature 7 à Marrakech",
      width: 1600,
      height: 900,
    },
    {
      src: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-appartement-02.webp',
      alt: 'Appartement neuf haut standing à Honest Signature 7 Marrakech',
      width: 1600,
      height: 1066,
    },
  ],
} as const;

export const GUELIZ_PROGRAM = {
  label: 'Programme',
  title: 'Honest Signature 7, un programme neuf au cœur de Guéliz',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-residence-02.webp',
  alt: 'Programme immobilier Honest Signature 7 à Guéliz Marrakech',
  cta: { href: '/residences-honest-678/', text: 'Voir le programme' },
} as const;

export const GUELIZ_SHOW_APARTMENT = {
  label: 'Appartement témoin',
  titleId: 'show-apartment-teaser-title',
  title: 'Découvrir l’appartement témoin Honest Signature 7',
  image: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-espace-de-vie-01.webp',
  alt: 'Appartement témoin Honest Signature 7 à Guéliz Marrakech',
  body: 'Pour mieux vous projeter dans un appartement neuf à Guéliz, Emara Estates peut vous accompagner dans la visite de l’appartement témoin Honest Signature 7 et vous transmettre les informations à jour sur les typologies disponibles.',
  buttons: [
    { href: '/contact', text: 'Planifier une visite', variant: 'primary' as const },
    { href: '/residences-honest-678/', text: 'Voir Honest Signature 7', variant: 'outline' as const },
  ],
} as const;

/** Second `.services` block — this is the one carrying `id="services"`. */
export const GUELIZ_SUPPORT = {
  label: 'Accompagnement',
  title: "Un accompagnement avant l'achat",
  cards: [
    {
      title: 'Comparer les typologies',
      body: 'Comprendre les surfaces, les plans et les configurations disponibles selon votre objectif.',
    },
    {
      title: 'Vérifier les disponibilités',
      body: 'Recevoir les informations à jour sur les biens encore disponibles et les conditions commerciales.',
    },
    {
      title: 'Organiser une visite',
      body: 'Planifier une visite ou un échange pour avancer avec une vision claire du programme.',
    },
    {
      title: 'Avancer avec clarté',
      body: 'Recevoir une vision structurée du programme avant de prendre une décision : informations clés, prochaines étapes et échange avec un conseiller Emara Estates.',
    },
  ],
} as const;

export const GUELIZ_CTA = {
  label: 'Votre projet',
  title: 'Recevoir les informations sur les appartements neufs à Guéliz',
  intro:
    'Demandez les plans, les prix et les disponibilités des programmes sélectionnés à Guéliz.',
  buttons: [
    {
      href: '/residences-honest-678/',
      text: 'Voir Honest Signature 7',
      variant: 'primary' as const,
    },
    { href: '/contact', text: 'Demander les disponibilités', variant: 'outline' as const },
  ],
} as const;

export const GUELIZ_FAQ: FaqItem[] = [
  {
    id: 'faq-gueliz-1',
    question: 'Pourquoi Guéliz est-il recherché pour un appartement neuf ?',
    answer:
      "Guéliz est apprécié pour sa position centrale, ses commerces, ses restaurants, ses services et son accessibilité. C'est un quartier pratique pour vivre à Marrakech et attractif pour certains projets d'investissement.",
  },
  {
    id: 'faq-gueliz-2',
    question: 'Peut-on acheter un appartement neuf à Guéliz pour investir ?',
    answer:
      "Oui, certains acheteurs choisissent Guéliz pour un projet d'investissement ou de location. Le potentiel dépend du bien, de la typologie, de la gestion locative et des conditions du marché.",
  },
  {
    id: 'faq-gueliz-3',
    question: 'Comment obtenir les prix et disponibilités ?',
    answer:
      'Vous pouvez contacter Emara Estates pour recevoir les plans, prix, disponibilités et organiser une visite selon le programme qui vous intéresse.',
  },
];
