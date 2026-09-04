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
  /*
   * Les trois inspirations qui n'avaient pas de version « pièce ».
   *
   * Une carte d'inspiration ne devient essayable que si le Studio ouvre LA
   * MÊME photographie. Or les vignettes d'inspiration sont recadrées en
   * 900 × 700 et les pièces en 1600 × 1067 : même cliché, cadrage différent,
   * donc pas la même image. Ces entrées produisent la version 3:2, qui
   * sert alors aux deux — la carte l'affiche en 640, le Studio la charge en
   * 1600. La photo du séjour traversant, elle, a été écartée par le pré-filtre : sa
   * carte montre `room-sejour`, déjà validée, et son cadrage 3:2 a été retiré
   * plutôt que déployé sans usage.
   */
  'room-chambre-parisienne': {
    id: 7587872, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Pièce aux murs bleus et parquet en chevrons',
  },
  /*
   * Deux photographies retenues pour les cartes qui n'avaient pas de scène.
   *
   * Toutes sont passées, AVANT tout calibrage, par le pré-filtre de
   * _calibrage/calibrer.html — `diagnostic()` pour la distorsion et la part
   * de sol, `mesurabilite()` pour la seule question qui décide du coût :
   * peut-on relever le bas des murs ? Les mesures sont dans
   * docs/inspiration-studio.md. Dix-huit candidates ont été qualifiées ;
   * ces deux-là sont les seules dont la géométrie se soit recoupée jusqu'au
   * bout. Quatre autres, pourtant classées EXCELLENT ou BON au dépistage, ont
   * été abandonnées en cours de calibrage : le dépistage dit si une frontière
   * est RELEVABLE, pas si les frontières relevées appartiennent à des murs
   * parallèles. Voir la documentation.
   *
   * Même contributeur que la chambre parisienne, et ce n'est pas un hasard :
   * ses intérieurs sont photographiés au grand angle rectiligne, sol dégagé
   * et plinthes franches, ce qui se mesure. Une photo dont la jonction
   * mur/sol ne se relève pas coûte des heures pour rien.
   */
  'room-cuisine-ouverte': {
    id: 8146149, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Cuisine ouverte sur un grand séjour vide, sol en lames foncées',
  },
  'room-salon-angle': {
    id: 9826455, w: 1600, h: 1067, credit: 'Gustavo Galeano Maz',
    alt: 'Grande pièce vide formant un angle, sol en lames de noyer et plinthes bois',
  },
  'room-sous-les-toits': {
    id: 8082327, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Pièce sous combles éclairée par des fenêtres de toit, parquet clair',
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

/**
 * Galerie inspiration.
 *
 * ————————————————————————————————————————————————————————————————
 * « ESSAYER CETTE AMBIANCE » NE PEUT PAS MENTIR
 * ————————————————————————————————————————————————————————————————
 *
 * Chaque carte portait un lien vers le Visualiseur, avec un sceneId choisi
 * pour qu'il y en ait un — pas pour qu'il corresponde à la photo. Les huit
 * cartes ouvraient une autre pièce que celle montrée : on cliquait sur une
 * cuisine et on recevait un séjour. Les liens ont donc tous été retirés, et
 * c'était juste.
 *
 * Ils reviennent ici, mais tenus par une règle : `visualizerAvailable` n'est
 * vrai que si le Studio ouvre LA MÊME PHOTOGRAPHIE. Le générateur le vérifie
 * fichier contre fichier — `image` de la carte contre `file` de la scène dans
 * le manifeste — et REFUSE de construire le site si les deux diffèrent. Voir
 * `lienEssai()` dans build.js et `_generator/check-inspiration.js`. Il n'y a
 * plus de chemin par lequel un faux lien puisse revenir.
 *
 * ————————————————————————————————————————————————————————————————
 * POURQUOI `image` EXISTE
 * ————————————————————————————————————————————————————————————————
 *
 * Les vignettes d'inspiration étaient recadrées en 900 × 700, les pièces du
 * Visualiseur en 1600 × 1067. Même cliché, cadrage différent : ce n'est PAS
 * la même image, et la promesse « vous retrouvez cette photo » serait fausse
 * de quelques dizaines de centimètres de champ. Une carte essayable affiche
 * donc le fichier de la scène (`room-*`), en 640 sur la grille et en 1600
 * dans le Studio. Les cartes non essayables gardent leur vignette `inspi-*`.
 *
 * ————————————————————————————————————————————————————————————————
 * ÉTAT DES HUIT, AU 4 SEPTEMBRE 2026
 * ————————————————————————————————————————————————————————————————
 *
 *   carte                  photo      scène                statut
 *   Séjour traversant      3935327    sejour               essayable (photo remplacée)
 *   Chambre parisienne     7587872    chambre-parisienne   essayable (calibrée pour ce lot)
 *   Cuisine ouverte        7060823    —                    non : tapis + pieds de chaises
 *   Couloir en enfilade    7587374    couloir              non : frontières sans contraste
 *   Chambre sous combles   20771870   petit-bureau         essayable (calibrée pour ce lot)
 *   Salon d'angle          7045700    —                    non : sol sombre et miroitant
 *   Sous les toits         8082327    sous-les-toits       essayable (calibrée pour ce lot)
 *   Entrée cadrée          8583672    appartement-ancien   non : meuble à claire-voie
 *
 * Le remplacement de photo de la première carte suit la règle du lot : une
 * candidate non calibrable est remplacée par une photo éditorialement proche
 * et déjà validée, plutôt que reliée à une autre pièce. Les raisons de chaque
 * refus sont dans docs/inspiration-studio.md.
 *
 * `config` décrit ce que le lien applique à l'ouverture : c'est le style
 * annoncé par la légende, pas un réglage inventé au moment du clic. Le
 * visiteur change ensuite librement de parquet, de motif et d'orientation —
 * la photo, elle, ne change pas.
 *
 * `showInRoomLibrary` (défaut : vrai) décide si la scène apparaît AUSSI dans
 * « Changer de pièce » du Studio. Une inspiration peut être essayable sans
 * encombrer la bibliothèque principale.
 */
const INSPIRATION_PHOTOS = [
  { id: 3935327, tags: 'hongrie sejour', credit: 'Curtis Adams', title: 'Séjour traversant', meta: 'Chevrons · chêne fumé', size: 'wide',
    alt: 'Séjour vide et lumineux aux grandes fenêtres, sol clair',
    image: 'room-sejour', sceneId: 'sejour', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-fume', pattern: 'point-de-hongrie', orientation: 0 } },
  { id: 7587872, tags: 'hongrie chambre', credit: 'Max Vakhtbovych', title: 'Chambre parisienne', meta: 'Point de Hongrie · chêne naturel', size: 'md',
    alt: 'Pièce aux murs bleus et parquet en chevrons',
    image: 'room-chambre-parisienne', sceneId: 'chambre-parisienne', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-naturel', pattern: 'point-de-hongrie', orientation: 0 } },
  { id: 7060823, tags: 'droite cuisine', credit: 'Max Vakhtbovych', title: 'Cuisine ouverte', meta: 'Lames larges · chêne gris', size: 'sm',
    alt: 'Cuisine ouverte sur un grand séjour vide, sol en lames foncées',
    // Photo remplacée : l'ancienne (room-cuisine, 7060823) avait un grand tapis
    // au centre du sol et six chaises à pieds de 4 px. La nouvelle a le sol le
    // plus dégagé du dépôt et des plinthes blanches sur lames foncées.
    image: 'room-cuisine-ouverte', sceneId: 'cuisine-ouverte', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-gris', pattern: 'lames', orientation: 0 } },
  { id: 7587374, tags: 'droite couloir', credit: 'Max Vakhtbovych', title: 'Couloir en enfilade', meta: 'Lames dans l’axe · chêne clair', size: 'sm',
    alt: 'Couloir minimaliste aux portes en bois et parquet clair posé dans l’axe',
    // Trois photos essayées, aucune retenue. room-couloir (7587374) : bois
    // clair sur bois clair, aucune marche sur AUCUNE colonne — profils relevés
    // de haut en bas, variation de 20 niveaux sur toute la hauteur. Le couloir
    // bleu à moulures (7587868), classé EXCELLENT au dépistage : ses deux
    // frontières sont si raides (pentes -3,7 et +4,0) que l'ajustement rend
    // 15 et 35 px de résidu, et son sol visible ne fait que 6 pour cent du
    // cadre. Deux autres couloirs (19899087, 7005286) : aucune frontière
    // mesurable, et REJETÉ au dépistage.
    image: 'inspi-4', sceneId: null, visualizerAvailable: false,
    config: { productId: 'chene-craie', pattern: 'lames', orientation: 90 } },
  { id: 20771870, tags: 'droite chambre', credit: 'Алан Албегов', title: 'Chambre sous combles', meta: 'Lames droites · chêne brun', size: 'md',
    alt: 'Chambre sous combles au plancher brun et mobilier clair',
    // room-petit-bureau : CALIBRATION COMMENCÉE, pas finie. Les deux
    // directions du sol sont relevées et franches — la plinthe des placards
    // de gauche est linéaire de x 0,04 à 0,28 (pente -0,1885, chute de
    // luminance 111 à 131) et celle des commodes du fond de x 0,58 à 0,73
    // (pente +0,131) ; leur intersection place le coin de la pièce en
    // (0,502 ; 0,6936). Manquent une seconde parallèle par direction, donc
    // les deux fuites, et le détourage de la banquette capitonnée, du
    // fauteuil à quatre pieds fins et du bureau de premier plan. Voir
    // docs/inspiration-studio.md.
    image: 'room-petit-bureau', sceneId: null, visualizerAvailable: false,
    config: { productId: 'chene-brun', pattern: 'lames', orientation: 0 } },
  { id: 7045700, tags: 'droite sejour', credit: 'Max Vakhtbovych', title: 'Salon d’angle', meta: 'Lames droites · chêne foncé', size: 'wide',
    alt: 'Grande pièce vide formant un angle, sol en lames de noyer et plinthes bois',
    // Photo remplacée : l'ancienne (room-grande-piece, 7045700) avait un sol
    // sombre et miroitant dont le champ d'orientation ne donnait aucune fuite
    // (r = -0,016). La nouvelle a pour sujet un angle de murs, ce qui lui donne
    // deux frontières horizontales à deux profondeurs.
    image: 'room-salon-angle', sceneId: 'salon-angle', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-tabac', pattern: 'lames', orientation: 0 } },
  { id: 8082327, tags: 'droite chambre', credit: 'Max Vakhtbovych', title: 'Sous les toits', meta: 'Lames larges · chêne clair', size: 'sm',
    alt: 'Pièce sous combles éclairée par des fenêtres de toit, parquet clair',
    // room-sous-les-toits : sol presque vide, mais la moitié GAUCHE de la
    // frontière mur/sol n'est pas mesurable — onze colonnes relevées y
    // donnent onze hauteurs sans alignement (forces 15 à 46, valeurs de
    // 0,62 à 0,76), parce que le sol pâle, les panneaux vert sombre et les
    // taches de soleil créent des gradients plus forts que la jonction. Le
    // mur DROIT, lui, est net (pente 0,725, résidus faibles). Reprendre avec
    // un relevé colonne par colonne à la loupe.
    image: 'room-sous-les-toits', sceneId: null, visualizerAvailable: false,
    config: { productId: 'chene-sable', pattern: 'lames', orientation: 0 } },
  { id: 8583672, tags: 'droite couloir', credit: 'Curtis Adams', title: 'Entrée cadrée', meta: 'Lames dans l’axe · chêne miel', size: 'md',
    alt: 'Entrée spacieuse au sol en bois clair et décoration soignée',
    // room-appartement-ancien : géométrie prouvée, rendu rejeté — un meuble à
    // claire-voie occupe un tiers du sol visible. Deux remplaçantes essayées :
    // l'entrée en noyer (7166928, EXCELLENT au dépistage) dont le mur de
    // gauche ne s'ajuste qu'à 5 px de résidu et dont la fuite tombe à 0,62,
    // au ras du bord arrière du sol — les profondeurs y explosent à 200 m ;
    // et l'entrée minimaliste (19866475) dont une seule colonne sur
    // quarante-huit porte une marche exploitable, les murs étant pâles sur
    // sol pâle.
    image: 'inspi-8', sceneId: null, visualizerAvailable: false,
    config: { productId: 'chene-miel', pattern: 'lames', orientation: 90 } },
];

/** `fm: 'webp'` demande la version WebP au CDN Pexels. */
const pexelsUrl = ({ id, w, h, fm }) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb${
    fm ? `&fm=${fm}` : ''
  }&fit=crop&w=${w}&h=${h}`;

const photoPage = (id) => `https://www.pexels.com/photo/${id}/`;

module.exports = { PHOTOS, INSPIRATION_PHOTOS, pexelsUrl, photoPage };
