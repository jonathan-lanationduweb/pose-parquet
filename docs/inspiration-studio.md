# Inspiration → Studio : ce qui est essayable, et pourquoi pas le reste

La page `/inspiration/` montre huit ambiances. Chacune devrait pouvoir
s'ouvrir dans le Studio **sur sa propre photographie**, pour y essayer
d'autres parquets. Ce document dit où en est chaque carte, avec les mesures
qui ont décidé, et comment le mécanisme empêche un faux lien.

**Quatre cartes sur huit sont essayables.** L'objectif est huit ; les quatre
qui manquent ont chacune une raison mesurée, écrite plus bas, et deux d'entre
elles ont vu trois photographies de remplacement essayées et rejetées.

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

S'y ajoute un **plancher** : `ESSAYABLES_MINIMUM`, aujourd'hui 4. Une carte
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
active. Vérifié au chargement du Studio : sept vignettes 640 pour la
bibliothèque, et la haute résolution de la seule scène ouverte.

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
pas si les frontières relevées appartiennent à des murs **parallèles**. Quatre
photographies classées EXCELLENT ou BON, avec deux directions annoncées, ont
été abandonnées en cours de calibrage parce que leurs deux « murs » ne se
recoupaient pas en un horizon plausible. C'est écrit dans sa documentation :
il ne remplace pas le regard.

## État des huit cartes

| carte | photo | scène | état |
|---|---|---|---|
| Séjour traversant | 3935327 | `sejour` | **essayable** — photo remplacée |
| Chambre parisienne | 7587872 | `chambre-parisienne` | **essayable** — calibrée |
| Cuisine ouverte | 8146149 | `cuisine-ouverte` | **essayable** — photo remplacée et calibrée |
| Couloir en enfilade | 7587374 | — | non : quatre photos essayées |
| Chambre sous combles | 20771870 | — | non : deux murs non parallèles |
| Salon d'angle | 9826455 | `salon-angle` | **essayable** — photo remplacée et calibrée |
| Sous les toits | 8082327 | — | non : horizon incompatible |
| Entrée cadrée | 8583672 | — | non : trois photos essayées |

Six scènes sont désormais publiques dans le Visualiseur : `sejour`,
`chambre`, `bureau-vide`, `chambre-parisienne`, `cuisine-ouverte`,
`salon-angle`. Les thèmes couverts par les cartes essayables : séjour,
chambre, cuisine ouverte, grand salon.

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

## Les quatre refus, avec leurs mesures

### Couloir en enfilade — quatre photographies essayées

- **room-couloir (7587374)**, la photo actuelle : bois clair sur bois clair.
  Profils relevés de haut en bas sur quatre colonnes : la luminance varie de
  20 niveaux sur TOUTE la hauteur de l'image, sans une seule marche. Ce
  n'est pas seulement le sol qui manque de contraste, c'est la photographie.
- **Couloir bleu à moulures (7587868)**, classé EXCELLENT, deux directions
  annoncées à moins d'un pixel : ses deux « frontières » étaient des
  MOULURES de lambris, pas la jonction du sol — le piège que le dépôt
  documente depuis `frontieres()`. La vraie jonction, relevée à la teinte
  (murs bleu nuit contre sol de chêne), donne deux bords très raides
  (pentes −3,7 et +4,0) dont l'ajustement rend 15 et 35 px de résidu, et un
  sol visible qui ne fait que 6 pour cent du cadre.
- **19899087** : aucune frontière mesurable. **7005286** : REJETÉ au
  dépistage.

### Entrée cadrée — trois photographies essayées

- **room-appartement-ancien (8583672)**, la photo actuelle : géométrie
  prouvée au lot précédent, rendu rejeté — un porte-manteau à claire-voie
  occupe un tiers du sol visible. La carte de couverture le confirme.
- **Entrée en noyer (7166928)**, classée EXCELLENT, 0 réserve : son mur de
  gauche ne s'ajuste qu'à 5 px de résidu (la série mélange le socle d'un
  placard miroir et le mur), et la fuite qui en résulte tombe à y 0,62, au
  ras du bord arrière du sol — les profondeurs mesurées explosent à 200 m.
  S'y ajoutent une banquette au premier plan et un placard miroir qui
  reflète le sol.
- **Entrée minimaliste (19866475)** : une seule colonne sur quarante-huit
  porte une marche exploitable, murs pâles sur sol pâle.

### Chambre sous combles — `room-petit-bureau` (20771870)

Le meilleur contraste des refusées : placards blancs et plinthes blanches sur
noyer, chutes de luminance de 90 à 185. Deux séries franches et longues : le
socle des placards de gauche (x 0,06 → 0,28, résidu nul à l'œil, pente
−0,1875) et la file de commodes du fond (x 0,56 → 0,98, pente +0,135). Mais
ces deux murs sont **perpendiculaires** dans la pièce : leur intersection est
un coin, pas une fuite. La troisième série disponible — le dessus des
commodes, horizontal sur x 0,12 → 0,46 — devrait être parallèle au socle si
les deux appartenaient au même mur ; l'une est horizontale dans l'image et
l'autre pas, donc elles ne le sont pas. Sous les rampants de cette pièce, les
plans de mur ne sont pas ceux qu'on croit. Il manque une frontière parallèle
à l'une des deux séries, et le mobilier (banquette capitonnée, fauteuil à
quatre pieds fins, bureau de premier plan) reste à détourer.

### Sous les toits — `room-sous-les-toits` (8082327)

`mesurabilite()` annonce deux directions : mur de gauche (x 0,02 → 0,24,
pente −0,21, forces 55 à 81) et mur de droite (x 0,82 → 0,98, pente +0,639,
forces 17 à 38). S'y ajoute une belle **horizontale** sous les lucarnes
(x 0,56 → 0,72, y 0,550 à 0,572, forces 40 à 136), qui place la fuite de la
largeur à l'infini. Mais l'intersection des deux murs latéraux tombe à
y 0,8287, soit **sous** la frontière du mur du fond (y 0,554) : un horizon
plus bas que des points du sol est impossible. Les deux murs ne sont donc pas
parallèles — plausible dans des combles cloisonnés. Une troisième frontière
parallèle à l'un des deux, ou un relevé du pilier de brique, pourrait
trancher ; ce n'est pas fait.

## Performance

Mesures dans les mêmes conditions (pane de prévisualisation masquée, ce qui
gonfle les valeurs absolues — seule la comparaison compte), manifeste passé de
quatre à six scènes publiques :

| scène | ouverture | peinture WebGL | tâche longue max |
|---|---|---|---|
| cuisine-ouverte, lames | 2 154 ms | 56 ms | 626 ms |
| chambre (référence), lames | 2 698 ms | 111 ms | 1 220 ms |
| chambre-parisienne, Point de Hongrie | 8 097 ms | 94 ms | 1 234 ms |
| bureau-vide (référence), Point de Hongrie | 7 240 ms | 91 ms | 1 077 ms |

Deux scènes de plus dans la bibliothèque ne coûtent rien à l'ouverture : au
chargement du Studio, sept vignettes 640 et la haute résolution de la seule
scène active. Le worker de texture reste en service.

## Parcours vérifié

375 × 812, 844 × 390, 1440 × 900 et 1920 × 1080 : aucun débordement
horizontal, la carte entière est cliquable (335 × 419 px sur mobile), la
pastille fait 44 px. Les quatre cartes essayables ouvrent le Studio sur la
photographie qu'elles affichent — vérifié en comparant, dans la page, le
`src` de la vignette au `file` de la scène : quatre sur quatre identiques.
Parquet, motif et orientation se changent ensuite sans que la photo bouge.

## Crédits

Les deux nouvelles photographies sont sous licence Pexels, auteurs relevés
sur leurs pages source et non devinés : `room-cuisine-ouverte` de Max
Vakhtbovych (Pexels 8146149), `room-salon-angle` de Gustavo Galeano Maz
(Pexels 9826455). `assets/images/CREDITS.md` est régénéré par
`fetch-photos.js`. Les photographies essayées puis écartées ne sont pas
versionnées : elles restent dans `_calibrage/_candidates/`, non déployé.
