/**
 * `/offre-gueliz` — port of `js/offre-gueliz-config.js`.
 *
 * The legacy page keeps every editable string in one config object and builds
 * the DOM from it at runtime. That shape is kept deliberately: the option
 * labels below travel verbatim into HubSpot, and `endpoint` / `leadSource` are
 * part of the lead contract, not presentation.
 *
 * See ROUTE-CHECKLIST-offre-gueliz.md §6 before changing anything here.
 */

export const OG_BRAND = {
  logo: '/img/logo.webp',
  logoAlt: 'Emara Estates',
  whatsappNumber: '212670038899',
  whatsappMessage:
    'Bonjour, je vous contacte au sujet des appartements neufs à Guéliz proposés par Emara Estates et j’aimerais recevoir les prix et disponibilités. Merci.',
} as const;

/** Built the same way the legacy success handler builds it. */
export const OG_SUCCESS_WHATSAPP = `https://wa.me/${OG_BRAND.whatsappNumber}?text=${encodeURIComponent(
  OG_BRAND.whatsappMessage,
)}`;

export const OG_HEADER = {
  ctaFull: 'Recevoir les disponibilités',
  ctaShort: 'Disponibilités',
} as const;

export const OG_FEATURES = {
  label: 'Caractéristiques du projet',
  title: 'Une adresse d’exception au cœur de Guéliz',
  text: 'Une résidence contemporaine qui allie emplacement premium, confort absolu et prestations haut de gamme.',
  cta: 'Recevoir les prix et disponibilités',
  image: {
    src: '/img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp',
    alt: 'Façade des appartements neufs Honest Signature 7 à Guéliz, Marrakech',
    width: 1600,
    height: 1067,
  },
  items: [
    { icon: 'building', text: 'Appartements neufs à Guéliz' },
    { icon: 'pin', text: 'À 1 min du Plaza' },
    { icon: 'wallet', text: 'Apport dès 39 000 €' },
    { icon: 'calendar', text: 'Livraison juin 2028' },
    { icon: 'layout', text: 'Du studio au 3 chambres' },
    { icon: 'ruler', text: '39 à 140 m²' },
  ],
} as const;

export const OG_LOCATION = {
  label: 'Localisation',
  title: 'Au cœur de Guéliz, le quartier le plus recherché de Marrakech',
  benefits: [
    'Hyper-centre de Guéliz',
    'À proximité des commerces, restaurants et services',
    'Accès rapide aux axes principaux',
    'À 1 minute du Plaza',
  ],
  mapEmbedSrc:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d875.8418635332205!2d-8.00738759783571!3d31.6316639507953!2m3!1f0!2f0!3f0!2m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xdafefb6dcc86ea1%3A0x6ae3814ee3fb96d0!2sEMARA%20ESTATES%20Marrakech!5e0!3m2!1sfr!2sma!4v1776019628621!5m2!1sfr!2sma',
  mapTitle: 'Carte de la résidence à Guéliz, Marrakech',
  mapTriggerLabel: 'Afficher la carte de la résidence à Guéliz',
  mapTriggerText: 'Voir la carte — Guéliz, Marrakech',
} as const;

export const OG_AMENITIES = {
  label: 'Commodités',
  title: 'Des prestations pensées pour votre bien-être',
  items: [
    { icon: 'jacuzzi', text: 'Jacuzzi' },
    { icon: 'sauna', text: 'Sauna' },
    { icon: 'spa', text: 'Spa' },
    { icon: 'pool', text: '2 piscines, dont 1 chauffée', wide: true },
    { icon: 'gym', text: 'Salle de sport' },
    { icon: 'cinema', text: 'Cinéma plein air' },
    { icon: 'parking', text: 'Parkings titrés' },
  ],
} as const;

/**
 * Step keys double as radio `name` attributes *and* payload keys. Option
 * strings are sent to HubSpot verbatim — do not reword, reorder or normalize.
 */
export const OG_FORM = {
  label: 'Votre projet',
  title: 'Recevez les prix et disponibilités',
  subtitle:
    'Répondez à 3 questions rapides. Un conseiller Emara Estates vous transmet les informations adaptées.',
  steps: [
    {
      key: 'projectType',
      question: 'Quel est votre projet ?',
      options: ['Résidence principale', 'Résidence secondaire', 'Investissement locatif'],
    },
    {
      key: 'apartmentType',
      question: 'Quel appartement recherchez-vous ?',
      options: ['1 chambre', '2 chambres', '3 chambres'],
    },
    {
      key: 'timeframe',
      question: 'Quel est votre délai d’acquisition ?',
      options: ['Dans les 3 mois', 'Dans les 6 mois', 'Dans les 12 mois'],
    },
  ],
  labels: {
    stepPrefix: 'Étape',
    stepJoiner: 'sur',
    back: 'Retour',
    next: 'Continuer',
    submit: 'Recevoir les disponibilités',
    submitting: 'Envoi…',
    fullName: 'Nom complet',
    phone: 'Téléphone / WhatsApp',
  },
  consent:
    'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.',
  success: {
    title: 'Votre demande a bien été envoyée',
    text: 'Un conseiller Emara Estates vous contactera rapidement avec les prix et les disponibilités.',
    whatsappCta: 'Contacter directement sur WhatsApp',
  },
  errors: {
    fullName: 'Merci d’indiquer votre nom complet.',
    phone: 'Merci d’indiquer un numéro de téléphone valide.',
    network:
      'Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous sur WhatsApp.',
  },
  endpoint: '/lead-gueliz.php',
  leadSource: 'Ads Landing Page',
} as const;

export const OG_TRACKING = {
  urlParams: [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'campaign_id',
    'adset_id',
    'ad_id',
  ],
  storageKey: 'emara_gueliz_attribution',
  events: {
    start: 'LeadFormStarted',
    step: 'LeadFormStepCompleted',
    lead: 'Lead',
  },
} as const;

export type OgStepKey = (typeof OG_FORM.steps)[number]['key'];
