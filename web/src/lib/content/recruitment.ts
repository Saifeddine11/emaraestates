export const RECRUITMENT_STEPS = [
  { id: 1, title: 'Parlons de ton expérience' },
  { id: 2, title: 'Niveau commercial' },
  { id: 3, title: 'Dernière étape' },
] as const;

export const SALES_EXPERIENCE_OPTIONS = [
  'Non',
  "Moins d'un an",
  '1 à 3 ans',
  'Plus de 3 ans',
] as const;

export const REAL_ESTATE_OPTIONS = ['Oui', 'Non'] as const;

export const SALES_CLOSED_OPTIONS = [
  'Aucune',
  '1 à 5',
  '6 à 15',
  'Plus de 15',
] as const;

export const CLOSING_LEVEL_OPTIONS = [
  'Débutant',
  'Intermédiaire',
  'Confirmé',
  'Excellent',
] as const;

export const PREFERRED_WORKING_HOURS_OPTIONS = [
  '09h00 – 12h00 / 13h00 – 17h00',
  '10h00 – 13h00 / 14h00 – 18h00',
] as const;

export const AVAILABILITY_PERIOD_OPTIONS = [
  'Immédiatement',
  'Dans les 30 prochains jours',
  'Entre 1 et 3 mois',
] as const;

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const TOTAL_STEPS = 3;
