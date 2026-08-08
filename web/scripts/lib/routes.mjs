/**
 * The route table the preservation tooling works from.
 *
 * `legacy` is the file Apache serves today; `built` is what the export must
 * produce for the same URL. Getting `legacy` right matters: some routes have a
 * stale sibling file that .htaccess redirects away from, and comparing against
 * the wrong one would silently bless the wrong content.
 *
 * Exceptions are per route and each carries a written reason. `shared` entries
 * apply everywhere because they come from chrome every page renders.
 *
 * `copyExceptions` and `altExceptions` waive individual strings the port
 * legitimately drops. `headingExceptions` allow an intentional heading rewrite
 * at the same index (from → to). `addedSections` names whole sections the port
 * adds that the legacy page never had, and lifts them out of the built page
 * before the diff. `removedSections` does the opposite for approved deletions
 * from the legacy page. Everything listed in either is unverified by this
 * script — only for wholly new or wholly dropped sections, never to quiet a
 * diff in ported content that should still be there.
 */

/** Copy that every page loses for the same reason: deferred-mount chrome. */
const SHARED_COPY_EXCEPTIONS = [
  {
    text: '✕',
    why: 'mobile menu close glyph — the overlay mounts on open',
  },
];

/**
 * Only for routes that actually ship a gallery. Kept separate from the shared
 * list so a page without one cannot quietly inherit an excuse it never needs.
 */
const LIGHTBOX_COPY_EXCEPTIONS = [
  {
    text: '01/01',
    why: 'lightbox slide counter — the lightbox mounts on open',
  },
];

const LIGHTBOX_ALT_EXCEPTIONS = [
  [
    'Photo agrandie du projet immobilier',
    'lightbox now reuses each photo’s own alt instead of one generic string',
  ],
];

/** The mobile menu duplicates the header nav; its exact text varies per page. */
const mobileMenuDuplicate = (text) => ({
  text,
  why:
    'the mobile menu repeated the header nav verbatim; it now mounts on open, ' +
    'and every one of those destinations is still in the prerendered header',
});

const SHARED_ALT_EXCEPTIONS = [
  ['Emara', 'intro curtain logo is decorative and aria-hidden, so its alt is now empty'],
];

/** Every page's mobile menu repeats the same nav, so the text is identical. */
const MOBILE_MENU_TEXT =
  'AccueilNosprojetssurplanHonestSignature7NosréalisationsHonest1Honest2Honest3Honest4FAQContact';

export const ROUTES = [
  {
    url: '/',
    name: 'homepage',
    legacy: 'index.html',
    built: 'out/index.html',
    copyExceptions: [
      ...SHARED_COPY_EXCEPTIONS,
      ...LIGHTBOX_COPY_EXCEPTIONS,
      mobileMenuDuplicate(MOBILE_MENU_TEXT),
      {
        // Must run before the bare “9” exception: that digit appears inside
        // “39–140” / “39 000”, and stripping it first leaves a mangled remainder
        // that false-pairs with Immersion 3D. Facts stay on the HS7 card.
        text:
          "StudioAppartementDuplexMagasincommercial39–140m²30%Àlaréservation≈39000€d'apport" +
          '20281èrelivraisonÀpartirde1,05MMAD≈105000€~27000MAD/m²DécouvrirHonestSignature7' +
          "VoirlesappartementstémoinsImmersion3DVisitezHonestSignature7en3DExplorezl'univers" +
          'HonestSignature7grâceàuneexpérienceinteractivepermettantdevisualiserleprogramme,' +
          'sesespacesetsonambianceavantdedemanderlesplans,prixetdisponibilités.',
        why:
          'HS7 featured stats/CTAs redesigned in the Apple-style card; Immersion 3D ' +
          'copy is unchanged and still follows in #biens',
      },
      {
        text: '9',
        why:
          'showflats slide count — the ninth slide was dropped on request, so the ' +
          'carousel counter reads “/ 8”',
      },
      {
        // Apport CTAs → map title → réalisations intro (photo-ribbon already
        // stripped via removedSections before this diff runs). Map is now a
        // compact forest card; réalisations copy is unchanged.
        text:
          'RecevoirlesprixexactsVoirHonestSignature7Devenezpropriétaireà1minuteàpiedduPlaza' +
          'AppartementstémoinsHonestNosRéalisations4résidenceslivréesetuneopportunitélimitée' +
          'Découvrezlesprogrammescommercialisésavecsuccèsauxcôtésdenotrepromoteurpartenaire' +
          "HonestSignature,ainsiqu'unedisponibilitéraresurHonest5.",
        why:
          'MapSection intro redesigned as a compact left/right forest card; ' +
          'plaza h2 and réalisations copy remain on the homepage',
      },

      {
        // First sentence-chunk of the legacy `#biens` intro (hero CTAs → label
        // → h2 → body sentence 1). Replaced by the Guéliz headline rewrite.
        text:
          'VoirlesappartementsdisponiblesÊtrerappeléparunconseillerNosprojetssurplans' +
          'HonestSignature7àGuélizMarrakechEmaraEstatessélectionnedesappartementsneufs' +
          'àGuélizMarrakechpourlesacheteursexigeants,lesinvestisseursetlesclientsqui' +
          'souhaitentsécuriserunbienneufdansunemplacementstratégique.',
        why:
          '#biens intro rewritten to “Nouveau projet au cœur de Guéliz”; ' +
          'hero CTAs, label and HS7 name remain elsewhere on the homepage',
      },
      {
        // Second sentence of the legacy `#biens` body (own chunk at the period).
        text:
          'NotreaccompagnementcouvreladécouverteduprogrammeimmobilierMarrakech,' +
          "lesplans,lesprix,lesdisponibilitésetl'organisationd'unevisite.",
        why:
          'legacy `#biens` body sentence 2 dropped with the intro rewrite; ' +
          'plans/prix/disponibilités CTAs remain on the HS7 card and forms',
      },

      {
        // Legacy nests Honest 5 after the four sold cards. It now leads
        // `#nos-réalisations` as the featured listing card; wording stays.
        text:
          '30appartementsrestantsEnconstruction·PiscinerooftopRésidenceHonest5' +
          'Guélizhyper-centre,MarrakechAppartementRooftopDisponibilitélimitée' +
          '30appartementsrestantsRooftopPiscine&espacedétente' +
          'Dernièresdisponibilitésavantclôturedustock',
        why:
          'Honest 5 redesigned as the dominant featured card at the top of ' +
          '#nos-réalisations; facts and offer remain on the homepage',
      },
      {
        // Pill row on the legacy Honest 5 body — type/rooftop now live as
        // status chips / metadata on the featured listing card.
        text: 'AppartementRooftopDisponibilitélimitée',
        why:
          'Honest 5 pill cluster simplified on the featured listing card; ' +
          'Disponibilité limitée / Rooftop remain visible in #nos-réalisations',
      },
      {
        // Stock figure block that sat above the offer on the legacy card.
        text: '30appartementsrestantsRooftopPiscine&espacedétente',
        why:
          'Honest 5 stock/rooftop stats rearranged on the featured listing card; ' +
          'same facts remain (badge + metadata + offer)',
      },
      {
        text: '23000DH/m²',
        why:
          'Honest 5 offer rate updated to 24 000 DH/m² on request; previous price ' +
          'and 15-apartment clarification unchanged',
      },

      {
        // Must run before the shorter types / sold-label exceptions, which would
        // otherwise shred this passage before it can be waived whole.
        text:
          'Glissez1/4RésidenceHonest1Guélizhyper-centre,MarrakechStudios,appartements,' +
          'duplex,magasinsTypesLivréProgrammeentièrementcommercialiséRésidenceHonest2' +
          'Guélizhyper-centre,MarrakechStudios,appartements,duplex,magasinsTypesLivré' +
          'ProgrammeentièrementcommercialiséRésidenceHonest3Guélizhyper-centre,Marrakech' +
          'Studios,appartements,duplex,magasinsTypesLivréProgrammeentièrementcommercialisé' +
          'RésidenceHonest4Guélizhyper-centre,MarrakechStudios,appartements,duplex,' +
          'magasinsTypesLivréProgrammeentièrementcommercialiséVisiteguidéeAppartementstémoins' +
          'Découvrezlesfinitions,volumesetambiancesintérieuresdenosrésidencesHonestSignatureàGuéliz.',
        why:
          'Nos Réalisations redesigned as a listing grid led by Honest 5; ' +
          'sold cards and Appartements témoins copy remain on the homepage',
      },
      {
        text: 'Studios,appartements,duplex,magasinsTypes',
        why: 'types row removed from sold-residence cards on request',
      },
      {
        text: 'Programmeentièrementcommercialisé',
        why: 'sold-status footer removed from sold-residence cards on request',
      },
      {
        text: 'Glissez',
        why: 'SnapRow swipe hint removed from sold-residence listings on request',
      },
      {
        text: '1/4',
        why: 'SnapRow counter removed from sold-residence listings on request',
      },
      {
        // Whole legacy featured body — Apple-style HS7 card keeps title,
        // subtitle, tags and price; the paragraph is folded into those.
        text:
          'ProgrammeimmobilierneufhautstandingàGuéliz,avecstudios,appartements,' +
          'duplexetcommerces.Uneadressesélectionnéepouracheterunbienneuf' +
          'enhyper-centredeMarrakech.',
        why:
          'featured-property body folded into the Apple-style Honest Signature 7 ' +
          'card (subtitle + filter bar); meaning kept',
      },
      {
        // Contiguous track + featured card through the first body sentence.
        // Must stay before shorter “commerces.” exceptions so this whole passage
        // is waived in one shot. The Apple-style HS7 card keeps the same facts.
        text:
          '1MinÀpiedduPlazaHonestSignaturePromoteurpartenaireSECTEURMarchéauxFleurs,' +
          'Guéliz,MarrakechNouveauProjetLancement2026·Premièrelivraison2028' +
          'HonestSignature7àGuélizMarrakechProgrammeimmobilierneufhautstandingàGuéliz,' +
          'MarrakechProgrammeimmobilierneufhautstandingàGuéliz,avecstudios,appartements,' +
          'duplexetcommerces.',
        why:
          'Honest Signature 7 featured block redesigned as Apple-style showcase; ' +
          'facts remain on the homepage (track, badges, title, price, CTAs)',
      },
      {
        // First sentence alone (chunked at the period) of the legacy featured body.
        text:
          'ProgrammeimmobilierneufhautstandingàGuéliz,avecstudios,appartements,' +
          'duplexetcommerces.',
        why:
          'featured body first sentence folded into HS7 subtitle + filter bar',
      },
      {
        // Cheerio sometimes chunks the second sentence on its own.
        text:
          'Uneadressesélectionnéepouracheterunbienneufenhyper-centredeMarrakech.',
        why: 'second sentence of the featured body, folded into the HS7 card',
      },
      {
        // Interim short rewrite that lived on FeaturedProperty before the
        // Apple-style card; typologies remain in the filter bar / body copy.
        text:
          'ProgrammeimmobilierneufhautstandingàGuéliz,avecstudios,appartements,' +
          'duplexetcommerces,aucœurdeMarrakech.',
        why:
          'short featured body removed from the Apple-style HS7 decision card; ' +
          'facts remain via subtitle and filter bar',
      },
      {
        text: 'StudioAppartementDuplexMagasincommercial',
        why:
          'typology pill row removed from the Honest Signature 7 decision card on request',
      },
      {
        text: '1ère',
        why:
          'featured card delivery label now reads “livraison prévue” (same 2028 fact)',
      },
      {
        text: '~27000MAD/m²',
        why:
          'price-per-m² line now uses ≈ instead of ~ on the Apple-style HS7 card',
      },
    ],
    altExceptions: [
      ...SHARED_ALT_EXCEPTIONS,
      ...LIGHTBOX_ALT_EXCEPTIONS,
      [
        'Appartement témoin Honest Signature 7 à Guéliz Marrakech — salon',
        'ninth showflats slide removed on request; the photo itself still appears ' +
          'on this page in the Honest Signature 7 feature card, under its own alt ' +
          '“Honest Signature 7 à Guéliz Marrakech - salon”',
      ],
    ],
    addedSections: [
      {
        selector: '#videos',
        why:
          'the video gallery, added after the migration as a cream band between ' +
          'the hero and #biens — it has no legacy counterpart and displaces ' +
          'nothing, so there is nothing here to preserve',
      },
    ],
    removedSections: [
      {
        selector: '.photo-ribbon',
        why:
          '“Le Guéliz qu\'on rêvait d\'habiter” ribbon removed on request — ' +
          'heading, gallery and alts are intentionally gone from the homepage',
      },
      {
        selector: '.map-section',
        why:
          'full-bleed aerial localisation map removed on request; #localisation ' +
          'now lands on the compact plaza promo card (map-intro title kept)',
      },
    ],
    headingExceptions: [
      {
        from: 'h2: Honest Signature 7 à Guéliz Marrakech',
        to: 'h2: Nouveau projet au cœur de Guéliz',
        why:
          '#biens section h2 rewritten on request; HS7 name remains as card ' +
          'title in the showcase (not a heading)',
      },
    ],
  },
  {
    url: '/residences-honest-678/',
    name: 'Honest Signature 7',
    // The repo also holds a stale `residences-honest-678.html` at the root with
    // a different <title>. .htaccess 301s it to this directory version, so this
    // is the file that is actually indexed.
    legacy: 'residences-honest-678/index.html',
    // `trailingSlash: false` exports a flat file; scripts/deploy-layout.mjs will
    // reposition it to `residences-honest-678/index.html` at deploy time, which
    // is the shape .htaccess already expects.
    built: 'out/residences-honest-678.html',
    copyExceptions: [
      ...SHARED_COPY_EXCEPTIONS,
      ...LIGHTBOX_COPY_EXCEPTIONS,
      mobileMenuDuplicate(MOBILE_MENU_TEXT),
    ],
    altExceptions: [...SHARED_ALT_EXCEPTIONS, ...LIGHTBOX_ALT_EXCEPTIONS],
  },
  {
    url: '/contact',
    name: 'contact',
    // `contact/index.html` also exists but is stale (older, different <title>);
    // .htaccess 301s `/contact/` to `/contact`, which Apache maps to this file.
    legacy: 'contact.html',
    // Canonical carries no trailing slash here, so the export lands on the
    // final shape already — deploy-layout has nothing to reposition.
    built: 'out/contact.html',
    // No gallery on this route, so the lightbox exceptions deliberately do not
    // apply.
    copyExceptions: [...SHARED_COPY_EXCEPTIONS, mobileMenuDuplicate(MOBILE_MENU_TEXT)],
    altExceptions: SHARED_ALT_EXCEPTIONS,
  },
  {
    url: '/immobilier-luxe-marrakech',
    name: 'immobilier luxe',
    // No stale sibling for the three landing pages; each is a single file
    // served by the generic extensionless fallback at the end of .htaccess.
    legacy: 'immobilier-luxe-marrakech.html',
    built: 'out/immobilier-luxe-marrakech.html',
    copyExceptions: [...SHARED_COPY_EXCEPTIONS, mobileMenuDuplicate(MOBILE_MENU_TEXT)],
    altExceptions: SHARED_ALT_EXCEPTIONS,
  },
  {
    url: '/appartement-neuf-gueliz-marrakech',
    name: 'appartement neuf Guéliz',
    legacy: 'appartement-neuf-gueliz-marrakech.html',
    built: 'out/appartement-neuf-gueliz-marrakech.html',
    copyExceptions: [...SHARED_COPY_EXCEPTIONS, mobileMenuDuplicate(MOBILE_MENU_TEXT)],
    altExceptions: SHARED_ALT_EXCEPTIONS,
  },
  {
    url: '/investissement-immobilier-marrakech',
    name: 'investissement immobilier',
    legacy: 'investissement-immobilier-marrakech.html',
    built: 'out/investissement-immobilier-marrakech.html',
    copyExceptions: [...SHARED_COPY_EXCEPTIONS, mobileMenuDuplicate(MOBILE_MENU_TEXT)],
    altExceptions: SHARED_ALT_EXCEPTIONS,
  },
  {
    url: '/offre-gueliz',
    name: 'offre Guéliz (ads)',
    legacy: 'offre-gueliz.html',
    built: 'out/offre-gueliz.html',
    // This page ships none of the site chrome, so none of the shared
    // exceptions apply: there is no mobile menu, no intro curtain, no float.
    copyExceptions: [],
    altExceptions: [],
    /**
     * No exceptions, deliberately. `js/offre-gueliz.js` builds the form at
     * runtime from its config, so the legacy file ships an empty
     * `<div data-steps>` and an unfilled success panel. The port reproduces
     * that exactly rather than prerendering the steps, which keeps the static
     * diff meaningful here instead of waiving it. The form's real behaviour is
     * covered by the Guéliz section of `form-parity.mjs`.
     */
  },
];
