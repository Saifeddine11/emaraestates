/**
 * JSON-LD `@graph`s, ported node for node from the static build.
 *
 * The `@id` values are stable identifiers that Google has already crawled and
 * that other nodes reference. They must not change. Note that the Organization
 * node is deliberately not identical between pages — the project page ships a
 * shorter one — so each graph is transcribed from its own source rather than
 * factored into a shared constant.
 */
export const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://emaraestates.com/#website',
      url: 'https://emaraestates.com/',
      name: 'Emara Estates',
      inLanguage: 'fr-MA',
      publisher: { '@id': 'https://emaraestates.com/#organization' },
    },
    {
      '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
      '@id': 'https://emaraestates.com/#organization',
      name: 'Emara Estates',
      url: 'https://emaraestates.com/',
      telephone: '+212670038899',
      description:
        "Emara Estates accompagne les acheteurs et investisseurs dans l'immobilier de prestige à Marrakech, avec une sélection d'appartements neufs haut standing et de programmes immobiliers à Guéliz.",
      address: {
        '@type': 'PostalAddress',
        streetAddress: '2e étage, Business Center Paul, Rue Mouatamid Ibn Abaad',
        addressLocality: 'Marrakech',
        postalCode: '40000',
        addressCountry: 'MA',
      },
      areaServed: [
        { '@type': 'City', name: 'Marrakech' },
        { '@type': 'Place', name: 'Guéliz' },
      ],
      knowsAbout: [
        'Immobilier de prestige à Marrakech',
        'Appartements neufs haut standing',
        'Programmes immobiliers à Guéliz',
        'Investissement immobilier à Marrakech',
      ],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://emaraestates.com/#webpage',
      url: 'https://emaraestates.com/',
      name: 'Appartements neufs à Guéliz | Apport dès 39 000 € | Emara Estates',
      description:
        'Devenez propriétaire d’un appartement neuf à Guéliz avec un apport dès 39 000 €. Découvrez les programmes Emara Estates, prix, plans et accompagnement à Marrakech.',
      isPartOf: { '@id': 'https://emaraestates.com/#website' },
      about: { '@id': 'https://emaraestates.com/#organization' },
      inLanguage: 'fr-MA',
    },
  ],
} as const;

/** `/residences-honest-678/` JSON-LD `@graph`. Five nodes, order preserved. */
export const residencesJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://emaraestates.com/#website',
      url: 'https://emaraestates.com/',
      name: 'Emara Estates',
      inLanguage: 'fr-MA',
      publisher: { '@id': 'https://emaraestates.com/#organization' },
    },
    {
      '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
      '@id': 'https://emaraestates.com/#organization',
      name: 'Emara Estates',
      url: 'https://emaraestates.com/',
      telephone: '+212670038899',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '2e étage, Business Center Paul, Rue Mouatamid Ibn Abaad',
        addressLocality: 'Marrakech',
        postalCode: '40000',
        addressCountry: 'MA',
      },
    },
    {
      '@type': 'WebPage',
      '@id': 'https://emaraestates.com/residences-honest-678/#webpage',
      url: 'https://emaraestates.com/residences-honest-678/',
      name: 'Honest Signature 7 Guéliz | Prix, plans & visite témoin',
      description:
        'Découvrez Honest Signature 7 à Guéliz : studios, appartements, duplex et commerces. Recevez les prix, plans, disponibilités et planifiez une visite témoin.',
      isPartOf: { '@id': 'https://emaraestates.com/#website' },
      about: { '@id': 'https://emaraestates.com/residences-honest-678/#project' },
      inLanguage: 'fr-MA',
      breadcrumb: { '@id': 'https://emaraestates.com/residences-honest-678/#breadcrumb' },
    },
    {
      '@type': 'ApartmentComplex',
      '@id': 'https://emaraestates.com/residences-honest-678/#project',
      name: 'Honest Signature 7',
      url: 'https://emaraestates.com/residences-honest-678/',
      description:
        'Honest Signature 7 est un programme immobilier neuf haut standing situé à Guéliz, Marrakech, composé de studios, appartements, duplex et commerces.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Marrakech',
        addressRegion: 'Marrakech-Safi',
        addressCountry: 'MA',
      },
      containedInPlace: { '@type': 'Place', name: 'Guéliz, Marrakech' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'MAD',
        lowPrice: '1050000',
        availability: 'https://schema.org/InStock',
        url: 'https://emaraestates.com/residences-honest-678/',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://emaraestates.com/residences-honest-678/#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://emaraestates.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Honest Signature 7',
          item: 'https://emaraestates.com/residences-honest-678/',
        },
      ],
    },
  ],
} as const;

/** `/contact`. Node 3 is a `ContactPage`, not a `WebPage`. */
export const contactJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://emaraestates.com/#website',
      url: 'https://emaraestates.com/',
      name: 'Emara Estates',
      inLanguage: 'fr-MA',
      publisher: { '@id': 'https://emaraestates.com/#organization' },
    },
    {
      '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
      '@id': 'https://emaraestates.com/#organization',
      name: 'Emara Estates',
      url: 'https://emaraestates.com/',
      telephone: '+212670038899',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '2e étage, Business Center Paul, Rue Mouatamid Ibn Abaad',
        addressLocality: 'Marrakech',
        postalCode: '40000',
        addressCountry: 'MA',
      },
    },
    {
      '@type': 'ContactPage',
      '@id': 'https://emaraestates.com/contact#webpage',
      url: 'https://emaraestates.com/contact',
      name: 'Contact Emara Estates | Recevoir prix, plans & disponibilités',
      description:
        'Contactez Emara Estates pour recevoir les prix, plans et disponibilités des appartements neufs à Guéliz Marrakech, ou planifier une visite.',
      isPartOf: { '@id': 'https://emaraestates.com/#website' },
      about: { '@id': 'https://emaraestates.com/#organization' },
      inLanguage: 'fr-MA',
      breadcrumb: { '@id': 'https://emaraestates.com/contact#breadcrumb' },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://emaraestates.com/contact#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://emaraestates.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Contact',
          item: 'https://emaraestates.com/contact',
        },
      ],
    },
  ],
} as const;

/**
 * The three SEO landing pages ship a structurally identical graph, differing
 * only in slug, page name, description and the second breadcrumb label. That
 * uniformity was verified against all three source files before factoring this
 * out — unlike the Organization node, which does vary between other routes.
 *
 * Note the type is `WebPage`. None of these pages marks its FAQ up as
 * `FAQPage`, and adding that would be a new structured-data claim rather than
 * a preservation.
 */
export function landingJsonLd({
  slug,
  name,
  description,
  breadcrumb,
}: {
  slug: string;
  name: string;
  description: string;
  breadcrumb: string;
}) {
  const url = `https://emaraestates.com/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://emaraestates.com/#website',
        url: 'https://emaraestates.com/',
        name: 'Emara Estates',
        inLanguage: 'fr-MA',
        publisher: { '@id': 'https://emaraestates.com/#organization' },
      },
      {
        '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
        '@id': 'https://emaraestates.com/#organization',
        name: 'Emara Estates',
        url: 'https://emaraestates.com/',
        telephone: '+212670038899',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '2e étage, Business Center Paul, Rue Mouatamid Ibn Abaad',
          addressLocality: 'Marrakech',
          postalCode: '40000',
          addressCountry: 'MA',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: { '@id': 'https://emaraestates.com/#website' },
        about: { '@id': 'https://emaraestates.com/#organization' },
        inLanguage: 'fr-MA',
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: 'https://emaraestates.com/',
          },
          { '@type': 'ListItem', position: 2, name: breadcrumb, item: url },
        ],
      },
    ],
  };
}
