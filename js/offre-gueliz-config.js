/* =============================================================================
   EMARA ESTATES — Landing Ads « Offre Guéliz »
   Configuration centralisée (contenu + réglages).
   -----------------------------------------------------------------------------
   Ce fichier est la SOURCE UNIQUE de tout le contenu éditable de la landing.
   Modifier ici (textes, images, options du formulaire, coordonnées de la carte,
   numéro WhatsApp, clés d'événements de tracking) sans toucher au HTML/JS.
   ============================================================================= */
(function (window) {
  'use strict';

  var CONFIG = {
    /* ---- Identité / contact ------------------------------------------------ */
    brand: {
      logo: '/img/logo.webp',
      logoAlt: 'Emara Estates',
      // Numéro WhatsApp déjà utilisé partout sur le site (ne pas dupliquer).
      whatsappNumber: '212670038899',
      whatsappMessage:
        'Bonjour, je vous contacte au sujet des appartements neufs à Guéliz proposés par Emara Estates et j’aimerais recevoir les prix et disponibilités. Merci.'
    },

    /* ---- Header ------------------------------------------------------------ */
    header: {
      cta: 'Recevoir les disponibilités'
    },

    /* ---- Section 1 — Caractéristiques du projet ---------------------------- */
    features: {
      label: 'CARACTÉRISTIQUES DU PROJET',
      title: 'Une adresse d’exception au cœur de Guéliz',
      text: 'Une résidence contemporaine qui allie emplacement premium, confort absolu et prestations haut de gamme.',
      cta: 'Recevoir les prix et disponibilités',
      // Image principale du projet (LCP) — asset réel déjà présent dans le site.
      image: {
        src: 'img/honest-signature-7/honest-signature-7-gueliz-marrakech-facade-01.webp',
        alt: 'Façade des appartements neufs Honest Signature 7 à Guéliz, Marrakech',
        width: 1600,
        height: 1067
      },
      // 6 caractéristiques. `icon` = clé d'icône (voir offre-gueliz.js).
      items: [
        { icon: 'building', text: 'Appartements neufs à Guéliz' },
        { icon: 'pin', text: 'À 1 min du Plaza' },
        { icon: 'wallet', text: 'Apport dès 39 000 €' },
        { icon: 'calendar', text: 'Livraison juin 2028' },
        { icon: 'layout', text: 'Du studio au 3 chambres' },
        { icon: 'ruler', text: '39 à 140 m²' }
      ]
    },

    /* ---- Section 2 — Localisation ------------------------------------------ */
    location: {
      label: 'LOCALISATION',
      title: 'Au cœur de Guéliz, le quartier le plus recherché de Marrakech',
      benefits: [
        'Hyper-centre de Guéliz',
        'À proximité des commerces, restaurants et services',
        'Accès rapide aux axes principaux',
        'À 1 minute du Plaza'
      ],
      // Coordonnées réelles stockées dans le site (marqueur « EMARA ESTATES
      // Marrakech », hyper-centre de Guéliz). Adaptables si l'emplacement exact
      // du programme diffère.
      coordinates: {
        lat: 31.6316639507953,
        lng: -8.00738759783571,
        zoom: 15
      },
      // Embed Google Maps (solution carte déjà utilisée sur le site, aucune
      // librairie ajoutée). Le placeholder est chargé en lazy au scroll.
      mapEmbedSrc:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d875.8418635332205!2d-8.00738759783571!3d31.6316639507953!2m3!1f0!2f0!3f0!2m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xdafefb6dcc86ea1%3A0x6ae3814ee3fb96d0!2sEMARA%20ESTATES%20Marrakech!5e0!3m2!1sfr!2sma!4v1776019628621!5m2!1sfr!2sma',
      mapTitle: 'Carte de la résidence à Guéliz, Marrakech'
    },

    /* ---- Section 3 — Commodités -------------------------------------------- */
    amenities: {
      label: 'COMMODITÉS',
      title: 'Des prestations pensées pour votre bien-être',
      items: [
        { icon: 'jacuzzi', text: 'Jacuzzi' },
        { icon: 'sauna', text: 'Sauna' },
        { icon: 'spa', text: 'Spa' },
        { icon: 'pool', text: '2 piscines, dont 1 chauffée', wide: true },
        { icon: 'gym', text: 'Salle de sport' },
        { icon: 'cinema', text: 'Cinéma plein air' },
        { icon: 'parking', text: 'Parkings titrés' }
      ]
    },

    /* ---- Section 4 — Formulaire progressif --------------------------------- */
    form: {
      label: 'VOTRE PROJET',
      title: 'Recevez les prix et disponibilités',
      subtitle:
        'Répondez à 3 questions rapides. Un conseiller Emara Estates vous transmet les informations adaptées.',
      steps: [
        {
          key: 'projectType',
          question: 'Quel est votre projet ?',
          options: [
            'Résidence principale',
            'Résidence secondaire',
            'Investissement locatif'
          ]
        },
        {
          key: 'apartmentType',
          question: 'Quel appartement recherchez-vous ?',
          options: ['1 chambre', '2 chambres', '3 chambres']
        },
        {
          key: 'timeframe',
          question: 'Quel est votre délai d’acquisition ?',
          options: ['Dans les 3 mois', 'Dans les 6 mois', 'Dans les 12 mois']
        }
      ],
      labels: {
        stepPrefix: 'Étape',
        stepJoiner: 'sur',
        back: 'Retour',
        next: 'Continuer',
        submit: 'Recevoir les disponibilités',
        fullName: 'Nom complet',
        phone: 'Téléphone / WhatsApp'
      },
      consent:
        'En envoyant ce formulaire, vous acceptez d’être contacté par un conseiller Emara Estates concernant votre projet immobilier.',
      success: {
        title: 'Votre demande a bien été envoyée',
        text: 'Un conseiller Emara Estates vous contactera rapidement avec les prix et les disponibilités.',
        whatsappCta: 'Contacter directement sur WhatsApp'
      },
      errors: {
        fullName: 'Merci d’indiquer votre nom complet.',
        phone: 'Merci d’indiquer un numéro de téléphone valide.',
        network:
          'Votre demande n’a pas pu être envoyée. Réessayez ou contactez-nous sur WhatsApp.'
      },
      // Endpoint serveur sécurisé. Fonctionne sous Apache/PHP (lead-gueliz.php)
      // comme sous Node (server.js). Aucun token privé côté client.
      endpoint: '/lead-gueliz.php',
      // Valeur fixe demandée par la campagne.
      leadSource: 'Ads Landing Page'
    },

    /* ---- Capture UTM / paramètres publicitaires ---------------------------- */
    // Persistés (sessionStorage) durant tout le parcours, même si le formulaire
    // est complété plusieurs minutes après l'arrivée.
    tracking: {
      urlParams: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'campaign_id',
        'adset_id',
        'ad_id'
      ],
      storageKey: 'emara_gueliz_attribution',
      // Clés d'événements (déclenchés uniquement si un pixel/GTM est présent).
      events: {
        start: 'LeadFormStarted',
        step: 'LeadFormStepCompleted',
        lead: 'Lead'
      }
    }
  };

  window.EMARA_GUELIZ_CONFIG = CONFIG;
})(window);
