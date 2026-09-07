# Inspiration → Studio : ce qui est essayable, et pourquoi pas le reste

La page `/inspiration/` montre huit ambiances. Chacune devrait pouvoir
s'ouvrir dans le Studio **sur sa propre photographie**, pour y essayer
d'autres parquets. Ce document dit où en est chaque carte, avec les mesures
qui ont décidé, et comment le mécanisme empêche un faux lien.

**Les huit cartes sur huit sont essayables.** Chacune ouvre sa propre
photographie dans le Studio, chacune y rend un sol entièrement repeint, et le
contrôle `check-inspiration` bloque le build si l'une cesse de l'être.

Quatre photographies ont été remplacées pour y arriver, et le motif du
remplacement est le même dans les quatre cas : **du mobilier, pas de la
géométrie**. Un meuble à claire-voie sur un tiers du sol, un fauteuil à quatre
pieds fins, un pilier de brique avec une échelle appuyée dessus, un canapé
capitonné. Les remplaçantes ont été choisies sur mesure AVANT import, par un
pré-filtre qui cherche le plus long train de colonnes voisines dont la
frontière basse s'aligne à moins de trois pixels. Les retenues rendent 79, 75
et 61 colonnes à moins de 1,3 px ; les neuf candidates de combles essayées
avant elles plafonnaient à 32 colonnes à 2,56 px.

Deux titres ont donc changé, parce qu'ils décrivaient la photographie et non
l'ambiance : « Chambre sous combles » est devenue « Chambre claire » et « Sous
les toits » est devenue « Pièce aux arcades ». Les types de pièce sont
conservés : il reste une chambre et il reste une grande pièce de réception.

## Le mécanisme

Une carte porte cinq champs dans `_generator/photos.js` :

| champ | rôle |
|---|---|
| `image` | nom du fichier affiché — `room-*` pour une carte essayable, `inspi-*` sinon |
| `sceneId` | la scène du Visualiseur, ou `null` |
| `visualizerAvailable` | « essayable », pas « on aimerait » |
| `showInRoomLibrary` | la scène figure aussi dans « Changer de pièce » |
| `config` | parquet, motif et orientation appliqués à l'ouverture |

Quatre conditions autorisent le lien, vérifiées à la construction du site par
`_generator/check-inspiration.js` (appelé par `build.js`, donc impossible à
oublier) :

1. la carte se déclare essayable ;
2. elle nomme une scène ;
3. cette scène est publiable — `geometryStatus` **et** `visualStatus`
   validés, la règle du Visualiseur, pas une règle propre à cette page ;
4. **`scene.file` est exactement `${carte.image}.jpg`**.

La quatrième est celle qui manquait. Les huit cartes portaient un `sceneId`
choisi pour qu'il y en ait un, et rien ne rapprochait la photo de la carte de
la photo de la scène : on cliquait sur une cuisine, on recevait un séjour. La
comparaison se fait maintenant fichier contre fichier, et une carte
incohérente **arrête la construction**.

S'y ajoute un **plancher** : `ESSAYABLES_MINIMUM`, aujourd'hui 8. Une carte
peut cesser d'être essayable en silence — une scène rétrogradée à la revue
suffit, et le mécanisme est fait pour que la carte devienne muette plutôt que
menteuse. Le plancher rend cette perte visible : la vérification échoue si le
compte descend. Il se relève quand une inspiration de plus aboutit ; il ne se
baisse pas pour faire passer la vérification.

### Pourquoi les cartes essayables changent de fichier

Les vignettes d'inspiration étaient recadrées en 900 × 700, les pièces du
Visualiseur en 1600 × 1067. Même cliché, cadrage différent : ce n'est pas la
même image. Une carte essayable affiche donc le fichier de la scène, décliné
en 640 sur la grille et chargé en 1600 seulement quand la scène devient
active — et en 1120 sous 600 px de fenêtre. Vérifié au chargement du Studio :
les vignettes 640 de la bibliothèque, et la haute résolution de la seule scène
ouverte.

## L'outil qui manquait : `mesurabilite()`

Le pré-filtre `diagnostic()` mesure la distorsion, la résolution, la part de
sol et le balayage angulaire. Il ne dit rien de ce qui décide vraiment du coût
d'une calibration : **peut-on relever le bas des murs ?** Sa documentation
l'assumait, la mesure tentée alors — `frontieres()` — cherchant des droites
franches n'importe où et se posant volontiers sur un meuble.

`_calibrage/calibrer.html` a maintenant `mesurabilite()`. Deux principes,
appris en calibrant la chambre parisienne :

1. la marche la plus franche de chaque colonne est cherchée dans le tiers bas
   en luminance **et en teinte** — un mur bleu sur un sol de chêne ne change
   pas de clarté, il change de teinte, et c'est ce relevé qui a débloqué
   cette scène ;
2. on cherche les plus longues **séries de colonnes voisines alignées**. Un
   mur donne une série continue ; un semis de bords de meubles n'en donne pas.

Calé sur des scènes dont on connaît la vérité :

| photo | vérité connue | verdict de l'outil |
|---|---|---|
| chambre-parisienne | calibrée à 1 px | DEUX DIRECTIONS (0,01→0,31 résidu 1,62 ; 0,70→0,98 résidu 0,70) |
| bureau-vide | validée au lot précédent | DEUX DIRECTIONS |
| room-couloir | « relevé automatique en échec » | AUCUNE FRONTIÈRE MESURABLE |
| room-cuisine | tapis et pieds fins | AUCUNE FRONTIÈRE MESURABLE |

Il retrouve, sur la chambre parisienne, exactement les deux segments relevés
à la main. Trente secondes par photo là où le relevé manuel prenait une heure.

**Sa limite, apprise à ses dépens** : il dit si une frontière est RELEVABLE,
pas si les frontières relevées appartiennent à des murs **parallèles**, ni
même ce qu'elles sont. Quatre photographies classées EXCELLENT ou BON, avec
deux directions annoncées, ont été abandonnées en cours de calibrage parce que
leurs deux « murs » ne se recoupaient pas en un horizon plausible. Sur le
couloir bleu, les deux directions annoncées à moins d'un pixel étaient des
moulures de lambris : elles existaient, elles étaient droites, elles n'étaient
pas le sol. C'est écrit dans sa documentation : il ne remplace pas le regard,
et `trace()` est le regard.

### Le pré-filtre du second lot : choisir avant d'importer

Pour les trois remplaçantes de cette passe, un pré-filtre autonome a été écrit
sur le même principe, appliqué aux candidates **avant** de les faire entrer
dans `assets/images/` : pour chaque colonne, la marche la plus forte en
luminance et en teinte ; puis le plus long train de colonnes voisines dont les
points s'ajustent à moins de trois pixels. Un seul nombre en sort — la longueur
de ce train — et il classe sans ambiguïté :

| candidate | train le plus long | résidu max | retenue ? |
|---|---|---|---|
| 13702811, pièce à arcades | 79 colonnes | 0,69 px | oui |
| 16641359, chambre claire | 75 colonnes | 0,74 px | oui |
| 7865621, entrée | 61 colonnes | 1,23 px | oui |
| 8146331, couloir | 49 colonnes | 2,69 px | non retenue |
| 16116303, comble meublé | 32 colonnes | 2,56 px | non |
| 19980209, comble à tapis | 31 colonnes | 0,60 px | non — sol couvert |
| 2082093, chambre | 11 colonnes | — | non |

Le tri est net et coûte quelques secondes par photo. Il ne dit rien du
mobilier, et c'est pourquoi 19980209 est rejetée malgré un bon résidu : son
sol est sous un tapis. **Le pré-filtre écarte les photos non mesurables ; c'est
la revue à l'œil qui écarte les sols encombrés.** Les deux passes sont
nécessaires, et faire la seconde en premier économise du temps.

## État des huit cartes

| carte | photo | scène | ce qui fixe l'échelle |
|---|---|---|---|
| Séjour traversant | 3935327 | `sejour` | — |
| Chambre parisienne | 7587872 | `chambre-parisienne` | focale par les deux familles du chevron |
| Cuisine ouverte | 8146149 | `cuisine-ouverte` | focale choisie, vérifiée au pas des lames |
| Couloir en enfilade | 7587868 | `couloir-enfilade` | focale et hauteur d'œil choisies |
| Chambre claire | 16641359 | `chambre-claire` | **focale mesurée** par orthogonalité |
| Salon d'angle | 9826455 | `salon-angle` | focale choisie, vérifiée au pas des lames |
| Pièce aux arcades | 13702811 | `piece-arcades` | **focale ET hauteur d'œil mesurées** |
| Entrée cadrée | 7865621 | `entree-cadree` | focale et hauteur d'œil choisies |

Dix scènes sont publiques dans le Visualiseur : `sejour`, `chambre`,
`bureau-vide`, `chambre-parisienne`, `cuisine-ouverte`, `salon-angle`,
`couloir-enfilade`, `entree-cadree`, `chambre-claire`, `piece-arcades`. Neuf
figurent dans « Changer de pièce » ; `couloir-enfilade` en est exclue par
`showInRoomLibrary: false`, parce que son sol ne fait que 7 pour cent du cadre
et qu'elle n'apporte rien à une liste de pièces d'exemple. Elle reste
essayable par sa carte, ce que ce champ existe précisément pour permettre.

Les thèmes couverts : séjour, chambre parisienne, cuisine ouverte, couloir,
chambre claire, grand salon, pièce de réception, entrée. Aucun doublon de type
de pièce n'a été introduit par les remplacements.

### Trois manières de fixer l'échelle, et ce qu'elles valent

Une scène a besoin d'une focale et d'une hauteur d'œil. Ce lot les a obtenues
de trois façons, qu'il vaut la peine de distinguer parce qu'elles n'ont pas la
même autorité.

**Rien n'est mesurable** — une pièce vue frontalement dans son axe. Un mur du
fond horizontal donne une fuite à l'infini, donc l'abscisse du point principal,
et c'est tout : la focale et la hauteur d'œil restent libres. C'est le cas du
couloir et de l'entrée. Ce qui sauve la mesure, c'est que la LARGEUR de la
pièce vaut un multiple fixe de la hauteur d'œil, quelle que soit la focale : le
couloir mesure 1,03 hauteur d'œil de large, l'entrée 2,94. À toute hauteur
d'œil plausible, le couloir fait entre 1,1 et 1,6 m et l'entrée entre 3,8 et
4,6 m. L'erreur est bornée même quand le paramètre est choisi.

**La focale est mesurable** — une pièce vue d'angle donne deux fuites finies,
et si elles encadrent le centre de l'image, leur produit scalaire rend la
focale. C'est `focaleParOrthogonalite()`, et la chambre claire est la première
scène du dépôt à en profiter : 676 px, champ 99,6 degrés. La fonction rend
`null` plutôt qu'une racine de complaisance quand le produit est positif, ce
qui est une manière de dire que les deux directions relevées ne sont pas
perpendiculaires.

**Les deux sont mesurables** — la pièce aux arcades. La focale vient de
l'orthogonalité, et la hauteur d'œil de quatre longueurs connues : la porte du
fond, sa largeur, la hauteur sous corniche, la plinthe. Le point important est
que ces quatre calculs sont INDÉPENDANTS DE LA FOCALE. Une longueur latérale
vaut `(x − cx)·h/dy` et une longueur verticale `h_image·h/dy` : la focale n'y
entre pas. À 1,05 m, la porte mesure 1,04 sur 2,19 m, la hauteur sous corniche
2,91 m, la plinthe 10,3 cm. À 1,45 m, la même porte mesurerait 1,43 sur 3,02 m
et la plinthe 14,2 cm — impossible. Un photographe d'immobilier tient son
appareil bas pour agrandir la pièce ; ici il l'a tenu très bas.

## Les deux scènes calibrées dans ce lot

### Cuisine ouverte — `room-cuisine-ouverte.jpg` (8146149)

Le cas le plus favorable rencontré : grand sol entièrement dégagé, murs et
plinthes blancs sur lames foncées, marche de luminance de 60 à 92 partout —
cinq fois celle du couloir clair écarté. Aucun meuble sur le sol visible,
donc aucun occulteur.

Trois frontières relevées : mur de gauche (cinq colonnes, résidu max 0,39 px),
mur du fond **horizontal** sur seize colonnes, mur de droite (neuf colonnes,
résidu max 1,16 px). Les deux latéraux se croisent en (0,4635 ; 0,4930) :
fuite de la profondeur et horizon. Le mur du fond étant horizontal, la fuite
de la largeur est à l'infini, ce qui impose au point principal l'abscisse de
la fuite de profondeur — 58 px à gauche du centre de l'image. Quadrilatère
mesuré 4,85 × 2,82 m, concordance 0,02 et 0,00 pour cent.

Un premier masque s'arrêtait à x 0,905, croyant la pièce voisine commencée
là ; le rendu a montré un coin de sol d'origine bien visible. Mesuré au
pixel : le seuil gris est AU-DESSUS de la frontière, et le sol foncé passe
dessous jusqu'au bord du cadre. Corrigé.

### Salon d'angle — `room-salon-angle.jpg` (9826455)

Pièce vide dont le sujet est un angle : un mur avance au milieu du cadre, ce
qui donne **deux** frontières horizontales à deux profondeurs. Vingt-sept
colonnes sur le mur du fond (y 0,6504 à 0,6532, soit 3 px de dérive sur
620 px : l'horizontale est mesurée), vingt-cinq sur la face du mur qui
avance, trois à gauche (résidu 0,38 px) et six à droite (0,31 px). Fuite de
profondeur (0,5352 ; 0,4887) — point principal 56 px à **droite** du centre
cette fois : le recadrage de Pexels décale le point principal dans un sens ou
dans l'autre selon la photo, et c'est pourquoi on le mesure.

Quadrilatère 6,42 × 2,10 m, concordance 0,01 et 0,00 pour cent. La plinthe
est en bois, donc la chute relevée est son sommet : contour décalé de 13 px
vers le sol. La porte du fond est exclue — le sol qu'on aperçoit derrière
appartient à la pièce voisine.

### Ce qui est su et ce qui est choisi

Ces deux pièces sont vues de face : une fuite finie, une fuite à l'infini, et
rien de perpendiculaire de plus. **Aucune focale n'en est déductible**, et
aucune des deux n'a de chevron dont les deux familles la donneraient par
orthogonalité, comme à la chambre parisienne. La focale est donc CHOISIE
(900 et 950 px) et la hauteur d'œil déduite d'une porte ou d'un placard
(0,90 et 1,04 m), le couple étant retenu parce qu'il rend des dimensions
crédibles. La largeur, elle, ne dépend pas de la focale — elle vaut un nombre
fixe de hauteurs d'œil — ce qui borne l'erreur. Le contrôle est visuel : le
pas des lames rendues comparé à celui des lames en place. Vraisemblance
vérifiée à l'œil, pas preuve, et les notes des scènes le disent.

## Les quatre dernières cartes : ce qui a été refusé, et par quoi

Les quatre refus documentés ci-dessous ont tous été levés, trois par
remplacement et un par une reprise du relevé. Ils restent écrits parce qu'ils
disent où les photographies d'intérieur cèdent.

### Couloir en enfilade — quatre photographies, la quatrième retenue

- **room-couloir (7587374)** : bois clair sur bois clair. Profils relevés de
  haut en bas sur quatre colonnes : la luminance varie de 20 niveaux sur TOUTE
  la hauteur de l'image, sans une seule marche. Ce n'est pas seulement le sol
  qui manque de contraste, c'est la photographie.
- **19899087** : aucune frontière mesurable. **7005286** : REJETÉ au dépistage.
- **Couloir bleu à moulures (7587868)** : écarté d'abord, **retenu ensuite**.
  Et le retournement est la leçon la plus utile du lot. Ses deux premières
  « frontières », annoncées à moins d'un pixel, étaient des MOULURES de
  lambris, pas la jonction du sol — le piège que le dépôt documente depuis
  `frontieres()`. Sur ce constat, le relevé a cherché la fuite dans les
  jonctions du sol elles-mêmes, qui sont ici très raides (pentes −3,7 et +4,0)
  et bruitées : 15 et 35 px de résidu, et le refus.

  Le relevé était en cause, pas la photo. Repris par la méthode du bureau
  vide, avec **deux usages séparés** : les moulures courent le long des murs,
  donc parallèlement à l'axe du couloir, et elles donnent la FUITE (97 et 93
  points, résidus moyens 1,83 et 0,30 px — la droite de droite est la plus
  propre du dépôt) ; la teinte donne le CONTOUR (murs bleu nuit contre chêne,
  passage r−b négatif à positif). Le bord arrière du sol est horizontal (54
  points, pente −0,013), donc le point principal a l'abscisse de la fuite
  d'axe. Résultat : 0,02 pour cent de concordance en largeur, 1,14 en
  profondeur. Son sol ne fait toujours que 7 pour cent du cadre, ce qui lui
  vaut d'être exclue de « Changer de pièce » mais pas de sa carte.

  **Une frontière annoncée mesurable n'est pas une frontière identifiée.**
  `trace()` existe pour le dire, et ne pas l'avoir utilisé a coûté un refus.

### Entrée cadrée — quatre photographies, la quatrième retenue

- **room-appartement-ancien (8583672)** : géométrie prouvée, rendu rejeté —
  un porte-manteau à claire-voie occupe un tiers du sol visible.
- **Entrée en noyer (7166928)**, classée EXCELLENT, 0 réserve : son mur de
  gauche ne s'ajuste qu'à 5 px de résidu, et la fuite qui en résulte tombe à
  y 0,62, au ras du bord arrière du sol — les profondeurs explosent à 200 m.
- **Entrée minimaliste (19866475)** : une seule colonne sur quarante-huit
  porte une marche exploitable, murs pâles sur sol pâle.
- **room-entree-cadree (7865621)**, retenue, et choisie sur MESURE avant
  import : 61 colonnes voisines alignées à 1,23 px. Sol entièrement vide.
  Les deux plinthes bois sur murs blancs s'ajustent à 1,10 et 0,48 px, le bord
  arrière est horizontal à 0,002 de pente sur 128 points. Un détail qui ne
  s'était pas encore présenté : la plinthe étant **en bois comme le sol**, la
  marche suivie au gradient est le HAUT de la plinthe, pas son pied. Le pied a
  été lu séparément sur le profil de luminance — mur clair, plinthe, biseau
  éclairé, ombre du pied, sol — à trois colonnes. Rapportés au point principal,
  ces trois pieds donnent le même rapport à 0,05 pour cent, et prédisent les
  deux coins arrière du sol à cinq et huit pixels de là où le balayage les
  observe.

### Chambre sous combles → Chambre claire

- **room-petit-bureau (20771870)**, refusée : le meilleur contraste des
  refusées (placards et plinthes blancs sur noyer, chutes de 90 à 185), et
  deux séries franches. Mais ces deux murs sont **perpendiculaires** : leur
  intersection est un coin, pas une fuite. Il manquait une parallèle par
  direction, et la moitié droite du mur du fond est masquée par un fauteuil,
  donc elle n'était pas relevable. S'y ajoutait le mobilier : banquette
  capitonnée, fauteuil à quatre pieds fins, console de premier plan.
- **Neuf candidates de combles** ont ensuite été pré-filtrées : la meilleure
  rend 32 colonnes alignées à 2,56 px, et son sol est couvert d'un tapis. Le
  constat est structurel et vaut d'être retenu : **un comble se photographie
  mal pour cet usage.** Ses murs bas sont courts et interrompus par les
  rampants, et son sol est meublé parce que c'est une pièce à vivre aménagée.
- **room-chambre-claire (16641359)**, retenue : 75 colonnes à 0,74 px. Vue
  d'angle, plinthes blanches sur noyer foncé — le meilleur contraste du dépôt,
  marches de 100 à 123 niveaux. Les deux plinthes s'ajustent à 0,29 et 0,26 px.
  Les deux fuites viennent des LINTEAUX de fenêtre, et leurs deux ordonnées,
  obtenues sur deux murs différents, concordent à 4,2 pixels. Un seul objet sur
  le sol : la porte ouverte, dont la base est plate à deux millièmes près sur
  neuf colonnes — un rectangle suffit, pas une silhouette.

  Trois pistes ont échoué avant les linteaux, et elles sont notées parce
  qu'elles se retenteront ailleurs : le plafond à caisson (arêtes blanc sur
  blanc, gradients de 10 à 40, aucun appariement fiable d'une colonne à
  l'autre), les jonctions mur/plafond (même problème), et la direction des
  lames par `orientationLocale`, qui rend des angles de 1,5 à 178,9 degrés
  avec des cohérences de 0,25 à 0,64 — ce noyer est trop veiné, sa figure noie
  ses joints. Les appuis de fenêtre ont aussi été essayés et écartés : 16,3 et
  10,0 px de résidu max, parce qu'un appui porte des reflets et des objets.

### Sous les toits → Pièce aux arcades

- **room-sous-les-toits (8082327)**, refusée : `mesurabilite()` annonçait deux
  directions, mais l'intersection des deux murs latéraux tombe à y 0,8287,
  soit **sous** la frontière du mur du fond (y 0,554). Un horizon plus bas que
  des points du sol est impossible : l'un des deux relevés était faux. S'y
  ajoutait un pilier de brique en plein cadre avec une échelle ajourée appuyée
  dessus.
- **room-piece-arcades (13702811)**, retenue, et c'est la scène la mieux
  mesurée du dépôt : 79 colonnes alignées à 0,69 px au pré-filtre, en
  luminance ET en teinte, avec la même pente. Quatre droites, deux par
  direction, dont deux corniches (203 et 177 points, 0,31 et 0,42 px de résidu
  moyen). Les deux fuites placent l'horizon à **2,2 pixels** l'une de l'autre.

  Le mur droit n'a pas été ajusté sur toute sa longueur, et c'est délibéré :
  les deux arcades sont des niches en retrait, elles reculent la jonction du
  sol de 4 à 7 px, et un ajustement global rendait 2,23 px de résidu contre
  0,26 sur le seul pilier. Le contour du masque suit donc une POLYLIGNE de
  douze points relevés sur ce côté, et une droite sur l'autre. Suivre la droite
  du pilier aurait laissé une bande du parquet d'origine au fond de chaque
  niche.

## Performance

Le manifeste est passé de quatre à **dix** scènes publiques au fil des deux
lots, et neuf figurent dans la bibliothèque. La question est de savoir ce que
cet allongement coûte.

Réponse : rien à l'ouverture. Ce qui se charge à l'arrivée dans le Studio, pour
la pièce aux arcades comme pour l'entrée cadrée, ce sont **douze fichiers de
pièce pour 299 à 366 Ko** — dix vignettes 640, une déclinaison intermédiaire,
et **une seule pleine résolution**, celle de la scène ouverte. Le DOM est prêt
en 176 ms. Le worker de texture reste en service.

Délai jusqu'au premier sol peint, mesuré depuis le début de la navigation, pane
visible (les chiffres du lot précédent étaient pris pane masquée, donc plus
hauts ; seule la comparaison à la référence compte) :

| scène | motif | premier sol peint |
|---|---|---|
| chambre (référence) | lames | 2 281 ms |
| entrée cadrée | lames | 2 989 ms |
| chambre claire | lames | 3 002 ms |
| pièce aux arcades | Point de Hongrie | 5 070 ms |
| couloir en enfilade | Point de Hongrie | 5 137 ms |

Les scènes en lames se tiennent à 700 ms de la référence ; le Point de Hongrie
coûte environ deux secondes de plus, ce qui est le prix du motif et non celui
des nouvelles pièces — la chambre parisienne, calibrée au lot précédent, le
payait déjà.

Sur mobile 390 × 844, le canevas mesure 1 100 × 734 : c'est la déclinaison
1120 qui est servie, pas la pleine résolution. C'est ce fichier dont
`check-inspiration` vérifie désormais l'existence pour chaque scène, parce que
son absence aurait cassé le mobile sans que rien d'autre le signale.

## Le lien profond pouvait ne rien faire

Un essai utilisateur réel a montré ce que les contrôles automatiques
n'attrapaient pas : les deux cartes ajoutées n'ouvraient pas leur pièce, et
l'écran obtenu pouvait être le formulaire de projet. Les vérifications
passaient pourtant — contrat image = image respecté, scène publiable, adresse
correcte. Elles vérifiaient les DONNÉES, pas le CHEMIN DE CHARGEMENT.

La cause, dans `js/studio/app.js`, tenait en deux lignes :

```js
// au démarrage
if (requested && sceneOuvrable(sceneIndex, requested)) openRoom(requested);
// et dans openRoom
const entry = sceneOuvrable(sceneIndex, id) || bibliotheque[0];
```

La première exige que le manifeste connaisse la scène ; sinon elle ne fait
RIEN — pas d'ouverture, pas de message, le visiteur reste sur l'écran
d'accueil du Studio, où les actions visibles mènent ailleurs, dont « Votre
projet ». La seconde, si elle était atteinte avec un identifiant non résolu,
ouvrait la PREMIÈRE pièce de la bibliothèque : cliquer sur une cuisine et
recevoir un séjour, exactement le défaut que la page Inspiration venait de
réparer, réinstallé un étage plus bas.

Il suffit que le manifeste servi soit périmé pour que le premier cas se
produise, et c'est le cas le plus probable juste après l'ajout d'une scène :
GitHub Pages garde un fichier une dizaine de minutes, et un navigateur qui a
déjà ouvert le Studio a l'ancienne liste, sans les nouvelles pièces.

Trois corrections :

1. **`openRoom(id)` ouvre `id`, ou rien.** Une scène que le manifeste déclare
   fermée est refusée avec un mot. Une scène que le manifeste IGNORE est tout
   de même tentée : le fichier est adressé par son identifiant, et le nom de
   son image vient désormais de la scène chargée, plus du manifeste. Un
   manifeste périmé ne peut donc plus rendre un lien inopérant.
2. **Un échec le dit.** Le Studio revient à la bibliothèque avec « Cette pièce
   n'a pas pu être chargée. Choisissez-en une autre. » au lieu d'un écran
   d'accueil muet.
3. **Le manifeste est revalidé à chaque chargement** (`cache: 'no-cache'` sur
   `data/scenes/index.json`) : quelques kilo-octets, une réponse 304 le plus
   souvent, et une scène nouvelle n'est jamais invisible.

Vérifié par les deux cas limites : `?piece=salon` — une scène présente sur le
disque mais absente du manifeste — ouvre maintenant la pièce, alors qu'elle ne
faisait rien avant ; `?piece=piece-inexistante` affiche le message et la
bibliothèque au lieu du silence.

La garde `check-inspiration.js` a été étendue en conséquence : elle lit
maintenant le fichier de scène comme le Studio le lit et vérifie ce que le
moteur consomme — quadrilatère à quatre sommets, mètres non nuls, contour d'au
moins trois sommets, image déclarée et concordante avec le manifeste — plus
l'existence des déclinaisons 640 et **1120**, cette dernière étant celle que
`openRoom` demande sous 600 px de fenêtre : son absence aurait cassé le mobile
en silence. Elle recompose enfin l'adresse et compare ses paramètres à
`config`. Éprouvée à blanc en cassant volontairement les mètres et le contour
d'une scène : les deux griefs sortent.

## Parcours vérifié

Les huit cartes ont été reprises **au clic réel**, et non par lecture du lien :
clic aux coordonnées de la pastille dans la page, page obtenue, nom de la pièce
lu dans la barre du Studio, canevas contrôlé, et vérification qu'on n'est pas
arrivé sur le formulaire de projet.

Un piège d'outillage, noté pour la prochaine fois : le volet du navigateur
affiche une émulation 1440 × 900 réduite à son propre repère de 800 × 505, et
un clic par référence d'élément utilise les coordonnées de PAGE tandis qu'un
clic par coordonnées utilise celles du repère. Les deux premiers clics par
référence ont donc manqué leur cible sans erreur. Convertir explicitement, ou
retirer l'émulation.

| carte | page obtenue | pièce affichée | canevas | formulaire ? |
|---|---|---|---|---|
| Séjour traversant | `?piece=sejour…` | Séjour et salle à manger | 1600 × 1067 | non |
| Chambre parisienne | `?piece=chambre-parisienne…` | Chambre parisienne | 1600 × 1067 | non |
| Cuisine ouverte | `?piece=cuisine-ouverte…` | Cuisine ouverte sur le séjour | 1600 × 1067 | non |
| Couloir en enfilade | `?piece=couloir-enfilade…` | Couloir en enfilade | 1600 × 1067 | non |
| Chambre claire | `?piece=chambre-claire…` | Chambre claire | 1600 × 1067 | non |
| Salon d'angle | `?piece=salon-angle…` | Salon d'angle | 1600 × 1067 | non |
| Pièce aux arcades | `?piece=piece-arcades…` | Pièce aux arcades | 1600 × 1067 | non |
| Entrée cadrée | `?piece=entree-cadree…` | Entrée cadrée | 1600 × 1067 | non |

**Huit sur huit.** Aucune n'a mené au formulaire de projet : cette page ne
s'ouvre que par « Utiliser dans mon projet », depuis la comparaison du Studio.
Les deux fonctions ne se confondent pas.

Les commandes ont ensuite été exercées au clic réel sur « Entrée cadrée »,
chaque fois en comparant la signature de quatre pixels du sol avant et après :
une carte de parquet (Chêne Craie : sol changé), les trois motifs du catalogue
(Lames droites, Point de Hongrie, Bâton rompu : sol changé à chaque bascule),
et l'orientation (troisième choix du sens de pose : sol changé). Le panneau
« Motif » ne se peuple qu'après un clic sur son onglet, et ses choix portent la
classe `tile-card`, pas `cat__card` — ce qui a d'abord fait croire à un panneau
vide.

Sur **390 × 844**, les quatre nouvelles cartes refont le parcours complet.
Le canevas y mesure 1 100 × 734 : c'est la déclinaison 1120 qui est chargée,
pas la pleine résolution. Aucun débordement horizontal sur aucune des deux
pages, et les huit pastilles mesurent 44 × 203 px, au-dessus du minimum
tactile.

Une réserve à porter au compte de l'ergonomie et non de ce lot : à **505
pixels de hauteur de fenêtre**, les onglets Parquet / Motif / Orientation
tombent sous la zone visible, dans un tiroir replié dont la poignée est masquée
en disposition large. Le visiteur ne peut alors plus changer de motif. Ce n'est
pas lié aux scènes ; c'est une hauteur de fenêtre inhabituelle, mais elle
existe.

## Crédits

Les cinq photographies ajoutées dans ce lot sont sous licence Pexels, auteurs
relevés sur leurs pages source et non devinés :

| fichier | auteur | source |
|---|---|---|
| `room-cuisine-ouverte` | Max Vakhtbovych | Pexels 8146149 |
| `room-salon-angle` | Gustavo Galeano Maz | Pexels 9826455 |
| `room-couloir-bleu` | Max Vakhtbovych | Pexels 7587868 |
| `room-entree-cadree` | Gustavo Galeano Maz | Pexels 7865621 |
| `room-chambre-claire` | Curtis Adams | Pexels 16641359 |
| `room-piece-arcades` | Daniel Tanque | Pexels 13702811 |

`assets/images/CREDITS.md` est régénéré par `fetch-photos.js` et porte ces
mêmes lignes. Les photographies essayées puis écartées ne sont pas versionnées :
elles restent dans `_calibrage/_candidates/`, non déployé et ignoré par git.

## Un contrôle de plus : toute scène publiable se charge

Deux fichiers de scène ont été écrits, à deux passes différentes, avec le bloc
`planes` fermé par un crochet au lieu d'une accolade. Le JSON ne se parse plus,
le Studio échoue au chargement, et rien ne le disait : le fichier existe, le
manifeste le déclare, la carte pointe dessus. Le premier a été trouvé à la main
après un rendu vide ; le second aurait pu partir en production.

`check-inspiration.js` vérifie donc maintenant que **toute scène publiable du
manifeste** se charge, et pas seulement celles qu'une carte d'inspiration
ouvre. Une pièce proposée dans « Changer de pièce » n'était couverte par aucun
autre contrôle. Le coût est un `JSON.parse` par scène. Éprouvé à blanc en
renommant `floorZones` dans `bureau-vide.json`, qui n'est portée par aucune
carte : le grief sort et le build s'arrête.
