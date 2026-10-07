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
  /*
   * SOURCE — Pexels 9826455, Gustavo Galeano Maz.
   *
   * Cette couverture partageait sa photographie (Pexels 3935327) avec la
   * fiche motif « pose droite » : deux pages differentes, la meme image.
   * La fiche garde la photo, dont les lames filent droit vers le fond — son
   * sujet exact.
   *
   * Le guide prend ce couloir d'appartement ancien : les lames filent dans
   * l'axe de circulation, et par la porte de gauche on voit celles de la
   * piece voisine partir dans l'autre sens. La question du guide est posee
   * par l'image elle-meme, et la reponse s'y lit.
   *
   * La piece en angle (9826455) avait d'abord ete retenue, puis ecartee :
   * c'est la photo de la carte d'inspiration « Salon d'angle », et la
   * reprendre ici aurait recree le doublon qu'on venait de defaire.
   */
  'cover-quel-sens-de-pose-choisir': {
    id: 8583672, w: 1400, h: 875, credit: 'Curtis Adams',
    alt: 'Couloir d’appartement ancien aux lames patinées filant dans l’axe, ouvert sur une pièce où elles partent en travers',
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
    // Regarde sur le fichier : bouts de lames CARRES, jonction en escalier.
    // C'est un baton rompu. La page compare les deux motifs, l'image en
    // montre un : l'alt doit dire lequel.
    alt: 'Gros plan sur un parquet de chêne ancien posé en bâton rompu, lames à bouts carrés',
  },
  /*
   * SOURCE — Pexels 11126101.
   *
   * Cette couverture partageait sa photographie (Pexels 4263067) avec le
   * tutoriel « Coller un parquet contrecolle ». Elle montrait une pose en
   * cours ; ce guide parle de ce qui se joue AVANT la premiere lame. Le
   * vieux plancher a joints ouverts dit mieux le sujet : c'est le support
   * qu'il faut juger avant de poser quoi que ce soit dessus.
   *
   * Meme cliche que la tuile d'accueil `tile-renover`, a un cadrage et une
   * echelle differents. Un recoupement tuile / couverture, pas deux
   * couvertures identiques.
   */
  'cover-erreurs-a-eviter-avant-de-poser': {
    id: 11126101, w: 1400, h: 875, credit: 'Pexels',
    alt: 'Vieux plancher de bois patiné aux joints ouverts, vu en perspective',
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
  /*
   * Visuel PRODUIT POUR LE SITE, et non photographie — 2 octobre 2026.
   *
   * POURQUOI UN PLAN. Aucune photothèque à notre disposition ne montre une
   * vraie pose diagonale. Le visuel précédent était un rendu du Visualiseur
   * sur la scène `entree-cadree`, lames à −45° : correct, mais la perspective
   * écrasait l'angle — les lames paraissaient à 20° des plinthes, et le beige
   * se confondait avec les murs. On n'y lisait pas « 45° des murs ».
   *
   * CE QUE MONTRE CE VISUEL. La même géométrie que le Mode Plan, vue du
   * dessus : `getPattern('diagonale').build()` de js/tools/patterns.js, pièce
   * de 5,20 × 2,70 m, lames de 95 × 14 cm à joints décalés. Murs, porte et
   * fenêtre sont dessinés ; un repère blanc marque l'angle de 45° avec le mur.
   * C'est le moteur qui place les lames, pas une main : le visuel ne peut pas
   * montrer un angle que l'outil ne pose pas.
   *
   * CADRAGE. La pièce tient dans la zone commune aux deux recadrages du site :
   * le bandeau 16/7 de `.article-cover` (toute la largeur, 613 px au centre)
   * et les cartes 4/3 (875 px de haut, 1 167 au centre). Murs, porte et
   * repère restent visibles dans les deux.
   *
   * REFAIRE CE VISUEL — exporter les lames avec `getPattern('diagonale')`
   * ({ length: 520, width: 270, plankWidth: 14, plankLength: 95 }), les
   * dessiner à 2 px par centimètre, centrées dans 1400 × 875, puis produire
   * les déclinaisons 560, 980 et 1400 en jpg et webp. `local: true` empêche
   * `fetch-photos.js` de le remplacer.
   */
  'cover-pose-diagonale': {
    local: true, w: 1400, h: 875, credit: 'Plan dessiné par le moteur du Mode Plan',
    alt: 'Plan vu du dessus d’une pièce rectangulaire, avec porte et fenêtre : les lames sont posées à 45° des murs, un repère marque l’angle',
  },
  /*
   * SOURCE — Pexels 7587872, Max Vakhtbovych, https://www.pexels.com/photo/7587872/
   * Original 7360 x 4912. Licence Pexels, usage commercial autorise, credit
   * porte dans assets/images/CREDITS.md.
   *
   * POURQUOI CETTE PHOTO. L'audit visuel a montre que la precedente
   * (Pexels 37341468) illustrait la fiche « Point de Hongrie » avec un BATON
   * ROMPU : bouts de lames carres, jonction en escalier. Celle-ci a ete
   * verifiee a l'oeil, sur le fichier : les lames sont coupees en biais et
   * se rejoignent en pointe le long d'un joint central continu. C'est bien
   * un point de Hongrie.
   *
   * POURQUOI CE CADRAGE. 1400 x 613, soit 16/7 : le rapport exact de
   * `.article-cover`, le seul conteneur qui affiche cette cle (verifie :
   * aucune carte 4/3 ne l'utilise). Le navigateur n'a donc plus rien a
   * recouper, et ce que l'on choisit ici est ce que le lecteur voit. Avec
   * `crop: 'bottom'`, le sol occupe plus de la moitie du cadre, le joint
   * central file vers le fond et les biseaux se lisent au premier plan.
   *
   * Cadrage DIFFERENT de celui de l'accueil (`immersive-hongrie`, 16/9, meme
   * source) : ici le motif, la-bas l'ambiance.
   */
  'cover-point-de-hongrie': {
    id: 7587872, w: 1400, h: 613, crop: 'bottom', credit: 'Max Vakhtbovych',
    alt: 'Parquet de frêne clair en point de Hongrie, lames biseautées se rejoignant en pointe le long d’un joint central',
  },
  /*
   * « Chevrons » designe le POINT DE HONGRIE en francais : des lames coupees
   * en biais qui se rejoignent en pointe, joint continu. Cette photo montre
   * l'autre motif — des lames a bouts carres dont la jonction fait un
   * escalier. C'est un baton rompu, et l'alt le disait a l'envers.
   */
  'cover-baton-rompu': {
    id: 16101859, w: 1400, h: 875, credit: 'Francesca Cruccu',
    alt: 'Lumière rasante sur un parquet ancien posé en bâton rompu',
  },

  // --- Tutoriels ----------------------------------------------------------
  /*
   * SOURCE — Pexels 4263067, « K ».
   *
   * La precedente (Pexels 4981802) montrait un artisan percant un MUR
   * autour d'un boitier electrique : ni sol, ni lame, ni parquet, pour le
   * tutoriel de pose flottante.
   *
   * Celle-ci a ete regardee sur le fichier : une lame sombre en cours de
   * mise en place, une cale a frapper, un maillet, et surtout la sous-couche
   * mousse grise visible au ras du sol. C'est exactement une pose FLOTTANTE,
   * et le tutoriel annonce « de la sous-couche aux plinthes ».
   *
   * C'est la seule photographie du depot qui montre une pose reelle. Elle
   * revient donc ici, et quitte les deux couvertures qui se la partageaient
   * — dont le tutoriel de COLLAGE, ou elle etait factuellement fausse.
   */
  'cover-poser-un-parquet-flottant': {
    id: 4263067, w: 1400, h: 875, credit: 'K',
    alt: 'Lame de parquet mise en place à la cale à frapper, au-dessus d’une sous-couche mousse',
  },
  /*
   * IMAGE_REQUIRED — « Coller un parquet contrecolle ».
   *
   * Ce qu'il faudrait : une pose COLLEE. Colle en cordons ou peignee a la
   * spatule crantee, lame plaquee dessus, pas de sous-couche mousse.
   *
   * Ce qu'il y avait : Pexels 4263067, c'est-a-dire une pose flottante sur
   * sous-couche mousse, avec cale a frapper. La technique montree n'etait
   * pas celle du tutoriel, et le meme cliche servait deja deux autres pages.
   *
   * Aucune ressource locale ne montre un encollage. Plutot qu'une image qui
   * enseigne le geste inverse, la page se passe de couverture : le gabarit
   * s'en apercoit tout seul (voir `aUneCouverture` dans build.js).
   */
  /*
   * IMAGE_REQUIRED — « Reussir son calepinage ».
   *
   * Ce qu'il faudrait : un tracage. Cordeau, metre, lignes de reference au
   * sol, plan de calepinage, lames posees a blanc avant fixation.
   *
   * Ce qu'il y avait : Pexels 7258193, un masque de protection et des gants
   * poses sur une chaise, au-dessus d'un parquet deja pose. Ni tracage, ni
   * calepinage — et le sol du fond est un baton rompu, alors que le
   * tutoriel ne parle pas de ce motif.
   *
   * Aucune ressource locale ne montre un tracage. Le depot ne contient que
   * du ragreage, une chape lissee et une pose flottante : presenter l'un
   * des trois comme du calepinage serait la meme faute, deplacee. La page se
   * passe donc de couverture.
   */
  /*
   * Les trois tuiles ci-dessous sont declarees mais AUCUNE page ne les
   * affiche (verifie sur les 34 pages construites). Elles restent alignees
   * sur leur couverture pour que le depot ne se contredise pas, et sont
   * signalees ici plutot que supprimees en silence.
   */
  'tile-poser-un-parquet-flottant': { id: 4263067, w: 300, h: 300, credit: 'K', alt: '' },

  // --- Illustrations d'article --------------------------------------------
  'preparation-ragreage': {
    id: 11806489, w: 1400, h: 875, credit: 'Vladimir Srajber',
    alt: 'Ragréage frais en cours de mise en œuvre sur un sol intérieur',
  },
  'massif-contrecolle': {
    id: 7504591, w: 1400, h: 875, credit: 'cottonbro studio',
    alt: 'Présentoir d’échantillons de lames de bois de différentes essences',
  },
  /*
   * PLUS AFFICHEE NULLE PART depuis la refonte de /a-propos/ (verifie sur les
   * 34 pages construites). C'etait une photo de stock d'echantillons, posee
   * a cote du texte pour l'aerer ; la page respire desormais par un encadre
   * et deux tableaux, qui disent quelque chose. L'entree reste declaree —
   * les fichiers existent, la source est tracee — plutot que supprimee en
   * silence : si une page a besoin d'une image d'echantillons, elle est la.
   */
  'apropos-studio': {
    id: 6583355, w: 1400, h: 875, credit: 'cottonbro studio',
    alt: 'Comparaison d’échantillons de bois et de matières sur un plan de travail',
  },


  // --- Refonte : visuels pleine largeur -----------------------------------
  'hero-wide': {
    id: 13702811, w: 2200, h: 1300, credit: 'Curtis Adams',
    alt: 'Grande pièce vide au parquet clair, arches et lumière naturelle',
  },
  /*
   * SOURCE — Pexels 7587872, Max Vakhtbovych, https://www.pexels.com/photo/7587872/
   * Original 7360 x 4912. Meme cliche que `cover-point-de-hongrie` et que
   * `room-chambre-parisienne`, a trois cadrages distincts.
   *
   * POURQUOI CETTE PHOTO. La precedente (Pexels 16101859) etait la meme
   * image que `cover-baton-rompu`, a la taille pres, et montrait un baton
   * rompu — sous un dossier intitule « Le Point de Hongrie » dont le texte
   * explique que les lames sont « coupees en biais a leurs extremites ».
   * Le texte etait juste, l'image le dementait, sur la section la plus vue
   * du site pour ce motif.
   *
   * POURQUOI CE CADRAGE. 2000 x 1125, soit 16/9, avec `crop: 'bottom'`.
   * `.dossier__bg` couvre toute la section en `object-fit: cover` ; un
   * rapport plus large que celui de la section fait rogner les COTES, jamais
   * le bas — le sol reste donc entier quelle que soit la hauteur du bloc.
   * Un 4/3, lui, se serait fait couper par le bas, la ou se trouve le motif.
   *
   * Role : ambiance et impact, pas demonstration. Le gros plan sur le motif
   * est reserve a la fiche (`cover-point-de-hongrie`, 16/7).
   */
  'immersive-hongrie': {
    id: 7587872, w: 2000, h: 1125, crop: 'bottom', credit: 'Max Vakhtbovych',
    alt: 'Pièce aux murs bleus ouverte sur un jardin, sol en point de Hongrie filant vers la baie',
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
    alt: 'Parquet de chêne ancien posé en bâton rompu, vu de dessus',
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
    alt: 'Pièce aux murs bleus et parquet en point de Hongrie',
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
  'room-couloir-bleu': {
    id: 7587868, w: 1600, h: 1067, credit: 'Max Vakhtbovych',
    alt: 'Couloir aux murs bleu nuit à moulures, parquet en point de Hongrie dans l axe',
  },
  /*
   * Les trois pièces de la dernière passe. Elles ont été choisies sur MESURE
   * avant d'être importées : un pré-filtre a cherché, sur chaque candidate, le
   * plus long train de colonnes voisines dont la frontière basse s'aligne à
   * moins de 3 px. Celles-ci rendent 79, 75 et 61 colonnes à moins de 1,3 px.
   * Les neuf candidates de combles essayées avant elles plafonnaient à 32
   * colonnes à 2,56 px, et leurs sols étaient meublés : un comble se
   * photographie mal pour cet usage, ses murs bas sont courts et interrompus.
   */
  'room-entree-cadree': {
    id: 7865621, w: 1600, h: 1067, credit: 'Gustavo Galeano Maz',
    alt: 'Entrée vide aux murs blancs et plinthes bois, parquet miel, portes en enfilade au fond',
  },
  'room-chambre-claire': {
    id: 16641359, w: 1600, h: 1067, credit: 'Curtis Adams',
    alt: 'Chambre vide aux murs blancs et plafond à caisson, sol en lames foncées, trois fenêtres',
  },
  'room-piece-arcades': {
    id: 13702811, w: 1600, h: 1067, credit: 'Daniel Tanque',
    alt: 'Grande pièce vide à arcades, murs crème et parquet en bâton rompu',
  },
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
  /*
   * « Chevrons » designe le point de Hongrie en francais courant, mais le
   * site enseigne la distinction entre les deux motifs en V : le mot est
   * donc ecarte partout ou il tient lieu de nom de motif. Ici comme
   * ailleurs, on ecrit « Point de Hongrie » ou « baton rompu ».
   */
  /*
   * AUDIT VISUEL DU 1er OCTOBRE 2026 — la légende dit ce que la photo montre.
   *
   * Chaque fichier a été ouvert et regardé. Quatre cartes annonçaient autre
   * chose que leur image, parce que `meta` décrivait la configuration que le
   * Studio allait RENDRE et non le sol PHOTOGRAPHIÉ :
   *   - Séjour traversant : « Point de Hongrie · chêne fumé » sur un parquet
   *     doré en lames droites, posées dans l'axe ;
   *   - Cuisine ouverte : « chêne gris » sur des lames larges presque noires ;
   *   - Salon d'angle : « chêne foncé » nommait une famille de teintes, pas
   *     le produit que le Studio ouvre (chêne tabac) ;
   *   - Pièce aux arcades : « chêne fumé » sur un bâton rompu blond.
   *
   * `meta` et `config` suivent désormais la photographie, et `phrase` décrit
   * l'ambiance réellement visible — une phrase, écrite devant le fichier.
   * Le motif d'un deep-link ne peut pas différer du motif visible : on ne
   * montre pas un point de Hongrie parce que le moteur sait le rendre.
   */
  { id: 3935327, tags: 'droite sejour', credit: 'Curtis Adams', title: 'Séjour traversant', meta: 'Lames droites · chêne doré', size: 'wide',
    alt: 'Séjour vide et lumineux aux grandes fenêtres, parquet doré en lames droites filant vers la pièce du fond',
    phrase: 'Deux pièces en enfilade, un seul sol doré qui file vers la lumière.',
    image: 'room-sejour', sceneId: 'sejour', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-dore', pattern: 'lames', orientation: 0 } },
  { id: 7587872, tags: 'hongrie chambre', credit: 'Max Vakhtbovych', title: 'Chambre parisienne', meta: 'Point de Hongrie · chêne naturel', size: 'md',
    alt: 'Pièce aux murs bleus et parquet en point de Hongrie',
    phrase: 'Murs bleu profond, point de Hongrie clair : le V mène à la baie.',
    image: 'room-chambre-parisienne', sceneId: 'chambre-parisienne', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-naturel', pattern: 'point-de-hongrie', orientation: 0 } },
  /*
   * `id` et `credit` doivent designer la MEME photographie que `image`.
   * Ils etaient restes sur l'ancienne (7060823) apres le remplacement decrit
   * plus bas : le fichier `inspi-3.jpg`, telecharge d'apres `id`, montrait
   * donc une autre piece que la carte. `check-inspiration` le verifie
   * desormais, et `fetch-photos` telecharge d'apres `image`.
   */
  { id: 8146149, tags: 'droite cuisine', credit: 'Max Vakhtbovych', title: 'Cuisine ouverte', meta: 'Lames larges · chêne fumé', size: 'sm',
    alt: 'Cuisine ouverte sur un grand séjour vide, sol en lames foncées',
    // Photo remplacée : l'ancienne (room-cuisine, 7060823) avait un grand tapis
    // au centre du sol et six chaises à pieds de 4 px. La nouvelle a le sol le
    // plus dégagé du dépôt et des plinthes blanches sur lames foncées.
    phrase: 'Plateau blanc, lames larges presque noires : tout tient au contraste.',
    image: 'room-cuisine-ouverte', sceneId: 'cuisine-ouverte', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-fume', pattern: 'lames', orientation: 0 } },
  { id: 7587868, tags: 'hongrie couloir', credit: 'Max Vakhtbovych', title: 'Couloir en enfilade', meta: 'Point de Hongrie · chêne naturel', size: 'sm',
    alt: 'Couloir aux murs bleu nuit à moulures, parquet en point de Hongrie dans l’axe',
    // Photo remplacée, puis calibrée à la QUATRIÈME tentative. Les rejets :
    // room-couloir (7587374), bois clair sur bois clair, aucune marche sur
    // AUCUNE colonne ; deux autres couloirs (19899087, 7005286) sans frontière
    // mesurable et REJETÉS au dépistage.
    //
    // Ce couloir bleu (7587868) avait lui aussi été écarté, sur un relevé qui
    // rendait 15 et 35 px de résidu. Le relevé était en cause, pas la photo :
    // il cherchait la fuite dans les jonctions du sol, qui sont ici très
    // raides et bruitées. Repris par la méthode du bureau vide — les MOULURES
    // du lambris donnent la fuite (résidus 1,83 et 0,30 px), la TEINTE donne
    // le contour — la scène se mesure à 0,02 pour cent de concordance en
    // largeur et 1,14 en profondeur. Voir data/scenes/couloir-enfilade.json.
    //
    // `showInRoomLibrary: false` : son sol ne fait que 7 pour cent du cadre.
    // Essayable par sa carte, sans allonger « Changer de pièce ».
    phrase: 'Lambris bleu nuit, pointe continue dans l’axe : le couloir s’allonge.',
    image: 'room-couloir-bleu', sceneId: 'couloir-enfilade', visualizerAvailable: true, showInRoomLibrary: false,
    config: { productId: 'chene-naturel', pattern: 'point-de-hongrie', orientation: 0 } },
  { id: 16641359, tags: 'droite chambre', credit: 'Curtis Adams', title: 'Chambre claire', meta: 'Lames droites · chêne brun', size: 'md',
    alt: 'Chambre vide aux murs blancs et plafond à caisson, sol en lames foncées, trois fenêtres',
    // Photo remplacée, et le titre suit la photo. L'ancienne (room-petit-bureau,
    // 20771870) était un dressing sous combles : ses deux plinthes de placards
    // se relevaient franchement, mais son mur du fond est masqué sur sa moitié
    // droite par un fauteuil, donc sa seconde fuite n'était pas mesurable — et
    // son sol portait une banquette capitonnée, ce fauteuil à quatre pieds fins
    // et une console de premier plan.
    //
    // Neuf candidates de combles ont été essayées ensuite, et pré-filtrées sur
    // le plus long train de colonnes voisines alignées à moins de 3 px : la
    // meilleure rendait 32 colonnes à 2,56 px, contre 75 à 0,74 pour celle-ci.
    // Un comble se photographie mal pour cet usage — ses murs bas sont courts
    // et interrompus, et son sol est meublé. Le type de pièce est conservé :
    // c'est toujours une chambre.
    //
    // Première scène du dépôt dont la FOCALE est mesurée, par orthogonalité de
    // deux fuites relevées sur deux murs différents dont les horizons
    // concordent à 4,2 px. Voir data/scenes/chambre-claire.json.
    phrase: 'Murs blancs, plafond à caisson : la chaleur vient des lames brunes.',
    image: 'room-chambre-claire', sceneId: 'chambre-claire', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-brun', pattern: 'lames', orientation: 0 } },
  /* Meme derive que la carte « Cuisine ouverte » : l'identifiant etait reste
   * sur l'ancienne photo (7045700, `room-grande-piece`). */
  { id: 9826455, tags: 'droite sejour', credit: 'Gustavo Galeano Maz', title: 'Salon d’angle', meta: 'Lames droites · chêne tabac', size: 'wide',
    alt: 'Grande pièce vide formant un angle, sol en lames de noyer et plinthes bois',
    // Photo remplacée : l'ancienne (room-grande-piece, 7045700) avait un sol
    // sombre et miroitant dont le champ d'orientation ne donnait aucune fuite
    // (r = -0,016). La nouvelle a pour sujet un angle de murs, ce qui lui donne
    // deux frontières horizontales à deux profondeurs.
    phrase: 'Lames étroites tabac, plinthes assorties : une base sobre, prête à meubler.',
    image: 'room-salon-angle', sceneId: 'salon-angle', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-tabac', pattern: 'lames', orientation: 0 } },
  { id: 13702811, tags: 'baton-rompu sejour', credit: 'Daniel Tanque', title: 'Pièce aux arcades', meta: 'Bâton rompu · chêne naturel', size: 'sm',
    alt: 'Grande pièce vide à arcades, murs crème et parquet en bâton rompu',
    // Photo remplacée, et le titre suit la photo. L'ancienne
    // (room-sous-les-toits, 8082327) avait un sol presque vide, mais sa moitié
    // gauche n'était pas mesurable — onze colonnes, onze hauteurs sans
    // alignement — et surtout un pilier de brique en plein cadre avec une
    // échelle ajourée appuyée dessus. Ses deux murs latéraux se coupaient à
    // y 0,8287, SOUS la ligne de sol du mur du fond à 0,554 : géométriquement
    // impossible, donc l'un des deux relevés était faux.
    //
    // La remplaçante est la scène la mieux mesurée du dépôt : quatre droites,
    // deux par direction, dont deux corniches ; les deux fuites placent
    // l'horizon à 2,2 PIXELS l'une de l'autre ; la focale vient de leur
    // orthogonalité ; et la hauteur d'œil est mesurée sur quatre longueurs
    // connues — porte, hauteur sous corniche, plinthe, largeur de porte — ce
    // qui n'était jamais arrivé. Son sol est en bâton rompu et occupe près de
    // la moitié du cadre. Voir data/scenes/piece-arcades.json.
    /*
     * PRIORITE 13 — le motif propose est celui que la photo montre.
     *
     * La carte ouvrait le Visualiseur sur un POINT DE HONGRIE alors que le
     * sol photographie est un BATON ROMPU, et que ce sol occupe pres de la
     * moitie du cadre. Le visiteur voyait un motif, en obtenait un autre, et
     * n'avait aucun moyen de savoir lequel des deux la page lui nommait.
     *
     * `chene-fume` accepte les trois motifs (`compatiblePatterns` dans
     * data/parquets.json) : la configuration suit donc la photo.
     */
    phrase: 'Bâton rompu blond sous deux arcades : le motif anime sans alourdir.',
    image: 'room-piece-arcades', sceneId: 'piece-arcades', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-naturel', pattern: 'baton-rompu', orientation: 0 } },
  { id: 7865621, tags: 'droite couloir', credit: 'Gustavo Galeano Maz', title: 'Entrée cadrée', meta: 'Lames dans l’axe · chêne miel', size: 'md',
    alt: 'Entrée vide aux murs blancs et plinthes bois, parquet miel, portes en enfilade au fond',
    // Quatrième photo pour cette carte, et les trois refus ont tous la même
    // cause : le mobilier, jamais la géométrie. room-appartement-ancien avait
    // sa géométrie prouvée et un meuble à claire-voie sur un tiers du sol ;
    // l'entrée en noyer (7166928) plaçait sa fuite à y 0,62, au ras du bord
    // arrière du sol, ce qui faisait exploser les profondeurs à 200 m ;
    // l'entrée minimaliste (19866475) n'offrait qu'une colonne exploitable
    // sur quarante-huit, murs pâles sur sol pâle.
    //
    // Celle-ci a été choisie sur MESURE avant import : 61 colonnes voisines
    // alignées à 1,23 px. Sol entièrement vide, plinthes bois sur murs blancs,
    // bord arrière horizontal à 0,002 de pente — donc point principal imposé.
    // Voir data/scenes/entree-cadree.json.
    phrase: 'Lames miel dans l’axe, portes en enfilade : le regard file au fond.',
    image: 'room-entree-cadree', sceneId: 'entree-cadree', visualizerAvailable: true, showInRoomLibrary: true,
    config: { productId: 'chene-miel', pattern: 'lames', orientation: 0 } },
];

/**
 * URL de telechargement d'une photographie, aux dimensions demandees.
 *
 * `fm: 'webp'` demande la version WebP au CDN Pexels.
 *
 * `crop` place le cadre quand le rapport demande differe de celui de la
 * source : `bottom` garde le bas, `top` le haut, et l'absence de valeur
 * centre. C'est le seul levier de cadrage que ce CDN honore reellement --
 * `rect` et le zoom par point focal (`fp-z`) sont ignores, verifie sur la
 * photo 7587872 : les reponses etaient identiques, octet pour octet, a un
 * recadrage centre. Une vue rapprochee ne s'obtient donc qu'en demandant un
 * rapport plus large, pas un facteur d'agrandissement.
 */
const pexelsUrl = ({ id, w, h, fm, crop }) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb${
    fm ? `&fm=${fm}` : ''
  }${crop ? `&crop=${crop}` : ''}&fit=crop&w=${w}&h=${h}`;

const photoPage = (id) => `https://www.pexels.com/photo/${id}/`;

module.exports = { PHOTOS, INSPIRATION_PHOTOS, pexelsUrl, photoPage };
