/**
 * `/appartements-temoins/` content.
 *
 * Every image is an existing photograph of a real showroom in a delivered
 * Honest residence (repo `img/appartements-temoins/`, already served in
 * production). Captions and alt texts describe what each photo actually shows;
 * they are written for this page rather than reused from the homepage slides.
 *
 * Honest Signature 7 is deliberately absent from SHOWROOMS: it is the project
 * under construction, presented in its own clearly labelled section.
 */

export const DELIVERED_RESIDENCES = ['Honest 1', 'Honest 2', 'Honest 3', 'Honest 4'] as const;
export type DeliveredResidence = (typeof DELIVERED_RESIDENCES)[number];

export type Showroom = {
  residence: DeliveredResidence;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

const DIR = '/img/appartements-temoins';

export const SHOWROOMS: Showroom[] = [
  {
    residence: 'Honest 1',
    src: `${DIR}/honest-1-appartement-temoin-01.webp`,
    alt: "Vue depuis l'entrée vers le séjour d'un appartement témoin Honest 1, salle d'eau en bois à droite",
    caption: "Séjour et salle d'eau",
    width: 1600,
    height: 886,
  },
  {
    residence: 'Honest 1',
    src: `${DIR}/honest-1-appartement-temoin-02.webp`,
    alt: "Cuisine ouverte avec comptoir et tabourets dans un appartement témoin Honest 1",
    caption: 'Cuisine ouverte et comptoir',
    width: 1600,
    height: 899,
  },
  {
    residence: 'Honest 2',
    src: `${DIR}/honest-2-appartement-temoin-02.webp`,
    alt: 'Séjour ouvert sur une terrasse dans un appartement témoin Honest 2',
    caption: 'Séjour ouvert sur la terrasse',
    width: 1600,
    height: 1062,
  },
  {
    residence: 'Honest 2',
    src: `${DIR}/honest-2-appartement-temoin-01.webp`,
    alt: 'Chambre avec baie vitrée et balcon dans un appartement témoin Honest 2',
    caption: 'Chambre avec baie vitrée',
    width: 1600,
    height: 1099,
  },
  {
    residence: 'Honest 3',
    src: `${DIR}/honest-3-appartement-temoin-02.webp`,
    alt: 'Salon et cuisine ouverte dans un appartement témoin Honest 3',
    caption: 'Salon et cuisine ouverte',
    width: 1600,
    height: 1070,
  },
  {
    residence: 'Honest 3',
    src: `${DIR}/honest-3-appartement-temoin-01.webp`,
    alt: 'Cuisine équipée et coin repas dans un appartement témoin Honest 3',
    caption: 'Cuisine et coin repas',
    width: 1600,
    height: 899,
  },
  {
    residence: 'Honest 4',
    src: `${DIR}/honest-4-appartement-temoin-01.webp`,
    alt: 'Coin repas et cuisine dans un appartement témoin Honest 4',
    caption: 'Coin repas et cuisine',
    width: 1600,
    height: 900,
  },
  {
    residence: 'Honest 4',
    src: `${DIR}/honest-4-appartement-temoin-02.webp`,
    alt: 'Cuisine avec îlot en marbre dans un appartement témoin Honest 4',
    caption: 'Cuisine avec îlot',
    width: 1600,
    height: 879,
  },
];

/** Hero: the Honest 2 living room — natural light, terrace, real furnishing. */
export const HERO_IMAGE = SHOWROOMS[2];

export const VISIT_TYPES = [
  'Visite d’un appartement témoin',
  'Recevoir les plans et disponibilités',
  'Les deux',
] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export const CONTACT_METHODS = ['WhatsApp', 'Téléphone', 'Email'] as const;

export const TIMINGS = [
  'Dès que possible',
  'Cette semaine',
  'Ce mois-ci',
  'Je souhaite simplement recevoir les informations',
] as const;
