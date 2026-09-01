/**
 * Photographies du site.
 *
 * Source : Pexels (licence gratuite, usage commercial autorisé, sans
 * attribution obligatoire — nous créditons quand même les auteurs dans
 * assets/images/CREDITS.md).
 *
 * Chaque entrée décrit un fichier de assets/images/ : identifiant Pexels,
 * dimensions de recadrage, texte alternatif français et crédit.
 * Pour changer une image : remplacer l'id (et l'alt), puis relancer
 * `node _generator/fetch-photos.js --force`.
 */

const PHOTOS = {
  // --- Guides -------------------------------------------------------------
  'cover-quel-sens-de-pose-choisir': {
    id: 3935327, w: 1400, h: 875, credit: 'Curtis Adams',
    alt: "Pièce vide et lumineuse au parquet clair, éclairée par de grandes fenêtres",
  },
  'cover-poser-parquet-sens-de-la-lumiere': {
    id: 18707513, w: 1400, h: 875, credit: 'sanket mahind',
    alt: "Ombre d'une fenêtre projetée sur le parquet d'une pièce vide",
  },
  'cover-preparer-son-sol-avant-la-pose': {
    id: 37121398, w: 1400, h: 875, credit: 'Sài Gòn Công Ty CP',
    alt: 'Ouvrier lissant une chape à la truelle mécanique avant la pose du sol',
  },
  'cover-point-de-hongrie-ou-baton-rompu': {
    id: 15066939, w: 1400, h: 875, credit: 'Magda Ehlers',
    alt: 'Parquet en chevrons, motif de bois chaud vu de dessus',
  },
  'cover-erreurs-a-eviter-avant-de-poser': {
    id: 4263067, w: 1400, h: 875, credit: 'K',
    alt: 'Poseur assemblant des lames de parquet à la cale à frapper',
  },
  'cover-parquet-massif-ou-contrecolle': {
    id: 6568684, w: 1400, h: 875, credit: 'cottonbro studio',
    alt: 'Échantillons de placages de bois posés côte à côte',
  },
  'cover-sens-de-pose-couloir': {
    id: 19889159, w: 1400, h: 875, credit: 'Lisa Anna',
    alt: "Couloir d'appartement au parquet posé dans l'axe de circulation",
  },
  'cover-sens-de-pose-piece-etroite': {
    id: 7031616, w: 1400, h: 875, credit: 'Max Vakhtbovych',
    alt: 'Pièce allongée aux murs blancs et au parquet clair, baies vitrées au fond',
  },

  // --- Motifs -------------------------------------------------------------
  'cover-pose-droite': {
    id: 15226296, w: 1400, h: 875, credit: 'Designecologist',
    alt: 'Parquet à lames droites au pied d’un mur blanc',
  },
  'cover-pose-longueur': {
    id: 8146330, w: 1400, h: 875, credit: 'Max Vakhtbovych',
    alt: 'Pièce vide et moderne dont les lames filent dans la longueur',
  },
  'cover-pose-largeur': {
    id: 8146337, w: 1400, h: 875, credit: 'Max Vakhtbovych',
    alt: 'Pièce vide et minimaliste dont les lames traversent la largeur',
  },
  'cover-pose-diagonale': {
    id: 8918712, w: 1400, h: 875, credit: 'James Frid',
    alt: 'Lames de bois assemblées en motif géométrique orienté',
  },
  'cover-point-de-hongrie': {
    id: 37341468, w: 1400, h: 875, credit: 'Diana',
    alt: 'Gros plan sur un parquet en Point de Hongrie',
  },
  'cover-baton-rompu': {
    id: 16101859, w: 1400, h: 875, credit: 'Francesca Cruccu',
    alt: 'Lumière rasante sur un parquet posé en chevrons',
  },

  // --- Tutoriels ----------------------------------------------------------
  'cover-poser-un-parquet-flottant': {
    id: 4981802, w: 1400, h: 875, credit: 'Antoni Shkraba',
    alt: 'Artisan en chantier, visseuse en main, au-dessus d’un plancher bois',
  },
  'cover-coller-un-parquet-contrecolle': {
    id: 4263067, w: 1400, h: 875, credit: 'K',
    alt: 'Poseur mettant en place une lame de parquet contrecollé',
  },
  'cover-reussir-le-calepinage': {
    id: 7258193, w: 1400, h: 875, credit: 'Thirdman',
    alt: 'Outils de chantier posés sur un parquet en cours de pose',
  },
  'tile-poser-un-parquet-flottant': { id: 4981802, w: 300, h: 300, credit: 'Antoni Shkraba', alt: '' },
  'tile-coller-un-parquet-contrecolle': { id: 4263067, w: 300, h: 300, credit: 'K', alt: '' },
  'tile-reussir-le-calepinage': { id: 7258193, w: 300, h: 300, credit: 'Thirdman', alt: '' },

  // --- Illustrations d'article --------------------------------------------
  'preparation-ragreage': {
    id: 11806489, w: 1400, h: 875, credit: 'Vladimir Srajber',
    alt: 'Ragréage frais en cours de mise en œuvre sur un sol intérieur',
  },
  'massif-contrecolle': {
    id: 7504591, w: 1400, h: 875, credit: 'cottonbro studio',
    alt: 'Présentoir d’échantillons de lames de bois de différentes essences',
  },
  'apropos-studio': {
    id: 6583355, w: 1400, h: 875, credit: 'cottonbro studio',
    alt: 'Comparaison d’échantillons de bois et de matières sur un plan de travail',
  },

  // --- Hero et partage ----------------------------------------------------
  'hero-poster': {
    id: 7027842, w: 1000, h: 1100, credit: 'Curtis Adams',
    alt: 'Séjour vide au parquet clair, éclairé par une grande fenêtre',
  },
  'og-default': {
    id: 7027842, w: 1200, h: 630, credit: 'Curtis Adams',
    alt: 'Séjour au parquet clair',
  },
};

/** Galerie inspiration : ordre = inspi-1.jpg, inspi-2.jpg, … */
const INSPIRATION_PHOTOS = [
  { id: 7587865, credit: 'Max Vakhtbovych', title: 'Séjour traversant', meta: 'Pose droite · chêne clair', size: 'wide',
    alt: 'Séjour contemporain au parquet clair posé dans la longueur' },
  { id: 7587872, credit: 'Max Vakhtbovych', title: 'Chambre parisienne', meta: 'Point de Hongrie · chêne naturel', size: 'md',
    alt: 'Pièce aux murs bleus et parquet en chevrons' },
  { id: 7060823, credit: 'Max Vakhtbovych', title: 'Cuisine ouverte', meta: 'Pose collée · contrecollé', size: 'sm',
    alt: 'Cuisine ouverte sur salle à manger, sol en parquet' },
  { id: 7587374, credit: 'Max Vakhtbovych', title: 'Couloir en enfilade', meta: 'Pose droite · lames étroites', size: 'sm',
    alt: 'Couloir minimaliste aux portes en bois et parquet posé dans l’axe' },
  { id: 20771870, credit: 'Алан Албегов', title: 'Bureau graphique', meta: 'Bâton rompu · chêne fumé', size: 'md',
    alt: 'Bureau sous combles avec plancher bois et mobilier moderne' },
  { id: 7045700, credit: 'Max Vakhtbovych', title: 'Salon d’angle', meta: 'Pose diagonale · chêne blond', size: 'wide',
    alt: 'Salon classique meublé, parquet blond au sol' },
  { id: 8082327, credit: 'Max Vakhtbovych', title: 'Sous les toits', meta: 'Pose droite · lames larges', size: 'sm',
    alt: 'Pièce sous combles éclairée par des fenêtres de toit, parquet clair' },
  { id: 8583672, credit: 'Curtis Adams', title: 'Entrée cadrée', meta: 'Frise · Point de Hongrie', size: 'md',
    alt: 'Entrée spacieuse au sol en bois et décoration soignée' },
];

const pexelsUrl = ({ id, w, h }) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const photoPage = (id) => `https://www.pexels.com/photo/${id}/`;

module.exports = { PHOTOS, INSPIRATION_PHOTOS, pexelsUrl, photoPage };
