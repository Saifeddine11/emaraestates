import type { FanCard } from '@/components/ui/card-fan-carousel';
import { EXTERNAL } from '@/lib/site';

/**
 * Homepage video gallery content — `#videos`, embedded in the hero.
 *
 * Unlike its neighbours in this folder, nothing here is a migration contract:
 * the section is new, so none of this copy exists in the legacy build. It is
 * still content rather than configuration — titles and alt strings are visible
 * and indexed.
 *
 * Seven entries are our own 1080x1920 files under `/img/videos` (via
 * `web/public/img` → repo `img/`), played by the browser rather than framed by
 * a third party. Nothing is fetched until a card is clicked: the covers are
 * the only bytes this section costs on page load. The eighth is the Vertex 3D
 * tour, which is a navigable app rather than a video and so opens in its own
 * tab.
 *
 * Covers are single frames lifted from each video, so a card always shows the
 * film it plays. To replace one, export a frame at 720x1280 and overwrite the
 * file in `/img/videos/covers`.
 *
 * `deploy-layout.mjs` selectively ships `img/videos/` into `web/deploy` so
 * Hostinger FTP receives the carousel media even though the rest of `/img` is
 * excluded as an already-live duplicate.
 *
 * To add a video: drop `<slug>.mp4` in `/img/videos`, a `<slug>-cover.webp` in
 * `/img/videos/covers`, add an entry below, and list both paths in
 * `VIDEO_MEDIA_ASSETS` (`scripts/lib/deploy-manifest.mjs`). An entry with no
 * `linkUrl` renders a "Bientôt" state rather than a play button that opens
 * nothing.
 */
export const VIDEO_CARDS: FanCard[] = [
  {
    title: 'Présentation du projet',
    caption: 'Ce que change un bien pensé pour être vécu, et pas seulement visité.',
    imgUrl: '/img/videos/covers/presentation-projet-cover.webp',
    alt: 'Terrasse en rooftop d’une résidence Emara Estates à Marrakech',
    linkUrl: '/img/videos/presentation-projet.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Pourquoi Guéliz',
    caption: 'Six programmes vendus, et la signature qui les relie tous.',
    imgUrl: '/img/videos/covers/presentation-honest-cover.webp',
    alt: 'Façade d’un programme Honest Signature à Guéliz Marrakech',
    linkUrl: '/img/videos/presentation-honest.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'L’opportunité d’investissement',
    caption: 'Le chantier en cours, et ce que veut dire acheter sur plan.',
    imgUrl: '/img/videos/covers/chantier-cover.webp',
    alt: 'Chantier de construction d’une résidence Honest Signature à Marrakech',
    linkUrl: '/img/videos/chantier.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Comprendre l’apport de 39 000 €',
    caption: 'Le quartier, ses adresses et la Koutoubia à quelques minutes.',
    imgUrl: '/img/videos/covers/localisation-gueliz-cover.webp',
    alt: 'Vue sur la Koutoubia depuis le quartier Guéliz à Marrakech',
    linkUrl: '/img/videos/localisation-gueliz.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Le potentiel locatif',
    caption: 'Les intérieurs, la piscine et les espaces qui font le quotidien.',
    imgUrl: '/img/videos/covers/lifestyle-cover.webp',
    alt: 'Salle à manger d’un appartement Emara Estates à Marrakech',
    linkUrl: '/img/videos/lifestyle.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Les points forts du programme',
    caption: 'Pourquoi le choix du promoteur pèse autant que celui du bien.',
    imgUrl: '/img/videos/covers/promoteur-fiable-cover.webp',
    alt: 'Présentation des plans d’un programme immobilier Emara Estates',
    linkUrl: '/img/videos/promoteur-fiable.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Les erreurs à éviter',
    caption: 'Commodités, accessibilité et taux d’occupation en plein Guéliz.',
    imgUrl: '/img/videos/covers/rendement-locatif-cover.webp',
    alt: 'Piscine et espaces communs d’une résidence à Guéliz Marrakech',
    linkUrl: '/img/videos/rendement-locatif.mp4',
    open: 'modal',
    portrait: true,
  },
  {
    title: 'Message du fondateur',
    caption: 'Naviguez librement dans le programme et ses volumes en 3D interactive.',
    imgUrl: '/img/honest006.webp',
    alt: 'Façade contemporaine d’Honest Signature 7 à Guéliz Marrakech',
    linkUrl: EXTERNAL.virtualTour3d,
    // The Vertex tour is a full navigation app with its own chrome, so it gets
    // the whole tab rather than a framed panel.
    open: 'newTab',
  },
];
