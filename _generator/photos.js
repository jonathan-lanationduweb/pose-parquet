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
  // L'image précédente (Designecologist, 15226296) était composée aux quatre
  // cinquièmes d'un mur blanc vide, avec un simple liseré de parquet en bas.
  // Recadrée dans le bandeau de couverture, elle se lisait comme un grand
  // rectangle gris : le sujet de la page en était absent.
  'cover-pose-droite': {
    id: 3935327, w: 1400, h: 875, credit: 'Curtis Adams',
    alt: 'Séjour lumineux dont les lames filent droit vers le fond de la pièce',
  },
  'cover-pose-longueur': {
    id: 8146330, w: 1400, h: 875, credit: 'Max Vakhtbovych',
    alt: 'Pièce vide et moderne dont les lames filent dans la longueur',
  },
  'cover-pose-largeur': {
    id: 8146337, w: 1400, h: 875, credit: 'Max Vakhtbovych',
    alt: 'Pièce vide et minimaliste dont les lames traversent la largeur',
  },
  // Visuel **produit pour le site**, et non photographié.
  //
  // L'image précédente (James Frid, 8918712) montrait des pavés de bois usés
  // vus de dessus : aucune pose en diagonale, aucun rapport avec le sujet de
  // la page. Son texte alternatif — « motif géométrique orienté » — le
  // trahissait déjà.
  //
  // Aucune photothèque à notre disposition ne propose de pose réellement
  // diagonale, et une photo approchante serait à nouveau fausse. Le visuel est
  // donc calculé par le moteur du visualiseur sur la scène « chambre », lames
  // à −45° : c'est le motif exact dont parle la page. `local: true` empêche
  // `fetch-photos.js` de le remplacer par un téléchargement.
  'cover-pose-diagonale': {
    local: true, w: 1400, h: 875, credit: 'Rendu du Visualiseur Parquet',
    alt: 'Parquet clair posé en diagonale dans une chambre aux murs bleus',
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


  // --- Refonte : visuels pleine largeur -----------------------------------
  'hero-wide': {
    id: 13702811, w: 2200, h: 1300, credit: 'Curtis Adams',
    alt: 'Grande pièce vide au parquet clair, arches et lumière naturelle',
  },
  'immersive-hongrie': {
    id: 16101859, w: 2000, h: 1500, credit: 'Francesca Cruccu',
    alt: 'Lumière rasante dessinant les chevrons d un parquet en Point de Hongrie',
  },
  'immersive-parcours': {
    id: 18707513, w: 2000, h: 1400, credit: 'sanket mahind',
    alt: 'Pièce vide au parquet clair traversée par l ombre d une fenêtre',
  },
  'tile-preparer': {
    id: 11806489, w: 1000, h: 900, credit: 'Vladimir Srajber',
    alt: 'Ragréage en cours sur un sol intérieur',
  },
  'tile-poser': {
    id: 4263067, w: 1000, h: 900, credit: 'K',
    alt: 'Poseur assemblant des lames de parquet',
  },
  'tile-motif': {
    id: 15066939, w: 1000, h: 900, credit: 'Magda Ehlers',
    alt: 'Parquet en chevrons vu de dessus',
  },
  'tile-renover': {
    id: 11126101, w: 1000, h: 900, credit: 'Pexels',
    alt: 'Vieux plancher bois patiné',
  },
  'projet-visuel': {
    id: 6835181, w: 1400, h: 1100, credit: 'Max Vakhtbovych',
    alt: 'Pièce lumineuse au parquet clair, baies vitrées',
  },

  // --- Pièces d'exemple du visualiseur ------------------------------------
  'room-sejour': {
    id: 3935327, w: 1600, h: 1067, credit: 'Curtis Adams',
    alt: 'Séjour vide et lumineux, grandes fenêtres',
  },
  'room-piece-claire': {
    id: 8146330, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Pièce vide et moderne, lumière douce',
  },
  'room-chambre': {
    id: 7587859, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Chambre aux murs bleus ouverte sur le jardin',
  },
  'room-salon': {
    id: 7027842, w: 1600, h: 1067, credit: 'Curtis Adams',
    alt: 'Salon avec moulures et lustre',
  },
  'room-contraste': {
    id: 18707513, w: 1600, h: 1067, credit: 'sanket mahind',
    alt: 'Pièce contrastée traversée par l ombre d une fenêtre',
  },
  'room-cuisine': {
    id: 7060823, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Cuisine ouverte sur la salle à manger',
  },
  /**
   * Les pièces suivantes ne sont pas choisies pour leur beauté.
   *
   * Chacune couvre un cas que le moteur ne savait pas éprouver : une
   * profondeur de couloir où les lames rapetissent en quelques mètres, une
   * petite pièce où une lame de 19 cm doit peser lourd dans le cadre, un grand
   * sol où la tuile de 4,80 m a la place de se répéter, des pieds de chaise
   * fins qui mettent l'occlusion à l'épreuve. Une jolie photo au sol vide et
   * plat n'apprend rien.
   */
  'room-couloir': {
    id: 7587374, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Couloir clair aux portes en bois, ouvert sur une pièce au fond',
  },
  'room-petit-bureau': {
    id: 20771870, w: 1600, h: 1067, credit: 'Алан Албегов',
    alt: 'Petit bureau sous combles, banquette capitonnée et chaise devant un secrétaire',
  },
  'room-grande-piece': {
    id: 7045700, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Grand salon classique meublé au parquet foncé, canapé et tapis',
  },
  'room-petite-piece': {
    id: 26747989, w: 1600, h: 1067, credit: 'Image Hunter',
    alt: 'Petit bureau d angle, secretaire en bois clair devant une fenetre a rideaux',
  },
  'room-bureau-vide': {
    id: 7028110, w: 1600, h: 1067, credit: 'Curtis Adams',
    alt: 'Bureau vide vu d angle, sol en lames claires et plinthes blanches sur deux murs',
  },
  'room-appartement-ancien': {
    id: 8583672, w: 1600, h: 1067, credit: 'Curtis Adams',
    alt: 'Couloir d appartement ancien au parquet patiné, console et portes à double battant',
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
  { id: 7587865, tags: 'hongrie sejour', try: 'piece=sejour&parquet=chene-fume&motif=point-de-hongrie&orientation=0', credit: 'Max Vakhtbovych', title: 'Séjour traversant', meta: 'Chevrons · chêne fumé', size: 'wide',
    alt: 'Séjour contemporain au parquet foncé posé en chevrons' },
  { id: 7587872, tags: 'hongrie chambre', try: 'piece=chambre&parquet=chene-naturel&motif=point-de-hongrie&orientation=0', credit: 'Max Vakhtbovych', title: 'Chambre parisienne', meta: 'Point de Hongrie · chêne naturel', size: 'md',
    alt: 'Pièce aux murs bleus et parquet en chevrons' },
  { id: 7060823, tags: 'droite cuisine', try: 'piece=sejour&parquet=chene-gris&motif=lames&orientation=0', credit: 'Max Vakhtbovych', title: 'Cuisine ouverte', meta: 'Lames larges · chêne gris', size: 'sm',
    alt: 'Cuisine ouverte sur salle à manger, parquet aux lames larges et grises' },
  { id: 7587374, tags: 'droite couloir', try: 'piece=piece-claire&parquet=chene-craie&motif=lames&orientation=90', credit: 'Max Vakhtbovych', title: 'Couloir en enfilade', meta: 'Lames dans l’axe · chêne clair', size: 'sm',
    alt: 'Couloir minimaliste aux portes en bois et parquet clair posé dans l’axe' },
  { id: 20771870, tags: 'droite chambre', try: 'piece=chambre&parquet=chene-brun&motif=lames&orientation=0', credit: 'Алан Албегов', title: 'Chambre sous combles', meta: 'Lames droites · chêne brun', size: 'md',
    alt: 'Chambre sous combles au plancher brun et mobilier clair' },
  { id: 7045700, tags: 'droite sejour', try: 'piece=sejour&parquet=chene-tabac&motif=lames&orientation=0', credit: 'Max Vakhtbovych', title: 'Salon d’angle', meta: 'Lames droites · chêne foncé', size: 'wide',
    alt: 'Salon classique meublé, parquet foncé au sol' },
  { id: 8082327, tags: 'droite chambre', try: 'piece=piece-claire&parquet=chene-sable&motif=lames&orientation=0', credit: 'Max Vakhtbovych', title: 'Sous les toits', meta: 'Lames larges · chêne clair', size: 'sm',
    alt: 'Pièce sous combles éclairée par des fenêtres de toit, parquet clair' },
  { id: 8583672, tags: 'droite couloir', try: 'piece=contraste&parquet=chene-miel&motif=lames&orientation=90', credit: 'Curtis Adams', title: 'Entrée cadrée', meta: 'Lames dans l’axe · chêne miel', size: 'md',
    alt: 'Entrée spacieuse au sol en bois clair et décoration soignée' },
];

/** `fm: 'webp'` demande la version WebP au CDN Pexels. */
const pexelsUrl = ({ id, w, h, fm }) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb${
    fm ? `&fm=${fm}` : ''
  }&fit=crop&w=${w}&h=${h}`;

const photoPage = (id) => `https://www.pexels.com/photo/${id}/`;

module.exports = { PHOTOS, INSPIRATION_PHOTOS, pexelsUrl, photoPage };
