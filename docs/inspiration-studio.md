# Inspiration → Studio : ce qui est essayable, et pourquoi pas le reste

La page `/inspiration/` montre huit ambiances. Chacune devrait pouvoir
s'ouvrir dans le Studio **sur sa propre photographie**, pour y essayer
d'autres parquets. Ce document dit où en est chaque photo, avec les mesures
qui ont décidé, et comment le mécanisme empêche désormais un faux lien.

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
incohérente **arrête la construction** au lieu de retomber en silence.

### Pourquoi les cartes essayables changent de fichier

Les vignettes d'inspiration étaient recadrées en 900 × 700, les pièces du
Visualiseur en 1600 × 1067. Même cliché, cadrage différent : ce n'est pas la
même image, et « vous retrouvez cette photo » serait faux de quelques dizaines
de centimètres de champ. Une carte essayable affiche donc le fichier de la
scène, décliné en 640 sur la grille et chargé en 1600 seulement quand la scène
devient active. Vérifié : ouvrir une carte charge
`room-chambre-parisienne.jpg` pour la scène et seulement des vignettes 640
pour les autres pièces de la bibliothèque.

## État des huit photos

Le pré-filtre (`_calibrage/calibrer.html`, `diagnostic()`) a été passé sur les
huit. Il ne sépare pas le bon du mauvais — il écarte l'inutilisable :

| carte | photo | classe du pré-filtre | flèche d'arc | balayage du sol | état |
|---|---|---|---|---|---|
| Séjour traversant | 7587865 | REJETÉ (sol continu 19 %) | non mesurable | 79,5° r=0,737 | photo remplacée |
| Chambre parisienne | 7587872 | MOYEN | non mesurable | 113,1° r=0,643 | **calibrée, essayable** |
| Cuisine ouverte | 7060823 | MOYEN | non mesurable | −52,4° r=−0,232 | non essayable |
| Couloir en enfilade | 7587374 | BON | 0,40 px | −83,9° r=−0,27 | non essayable |
| Chambre sous combles | 20771870 | MOYEN | non mesurable | −28,3° r=−0,451 | calibration commencée |
| Salon d'angle | 7045700 | MOYEN | non mesurable | −1,3° r=−0,016 | non essayable |
| Sous les toits | 8082327 | BON | non mesurable | 22,7° r=0,528 | calibration commencée |
| Entrée cadrée | 8583672 | EXCELLENT | 1,45 px | −94,9° r=−0,673 | non essayable |

Deux cartes sont essayables : deux sur huit, en dessous des six visées. Le
détail des refus suit, et aucune validation n'a été forcée.

### Chambre parisienne — calibrée dans ce lot

Sol entièrement dégagé, aucun meuble. La calibration a buté sur une chose que
les scènes précédentes supposaient : **le point principal n'est pas le centre
de l'image**, parce que ces photos sont des recadrages. La frontière du mur du
fond étant exactement horizontale (49 points, résidu max 0), la fuite de la
largeur est à l'infini, ce qui impose que la fuite de la profondeur ait
l'abscisse du point principal. Elle est à x 0,4437, soit 90 px à gauche du
centre : l'hypothèse du centre est réfutée par la mesure.

Avec ce point principal, les deux familles de lames du chevron en place —
perpendiculaires entre elles, à 45 degrés des murs — donnent une focale de
517 et 557 px, d'accord à 4 pour cent. C'est la seule contrainte de focale
disponible pour une pièce rectangulaire vue de face.

Le quadrilatère, construit sur les deux plinthes latérales (113 et 95 points,
résidus 1,08 et 0,99 px) et sur deux horizontales, mesure 3,20 × 2,32 m avec
0,02 et 0,01 pour cent de concordance entre côtés opposés. L'échelle repose
sur une seule référence, l'ouverture vitrée prise à 2,15 m : hauteur d'œil
1,05 m. C'est une vraisemblance, pas une preuve, et c'est écrit dans la scène.

**Le contour passe sous la plinthe.** Un premier rendu, contour posé au sommet
de la jonction, recouvrait de parquet la plinthe en bois des trois murs. Sa
hauteur a été mesurée sur six colonnes — 8 à 9 px partout — et le contour
décalé d'autant. C'est la règle du bureau vide prise dans l'autre sens : là-bas
1,6 px pour ne pas délaver une plinthe blanche, ici 9 px pour ne pas effacer
une plinthe en bois.

Contrôle de couverture, parquet foncé sur 288 points du sol : **aucun point
inchangé**, et écart maximal de 3 sur les points de mur juste au-dessus des
trois plinthes. Le sol change en entier, rien ne monte sur les murs, le seuil
de pierre et sa grille de convecteur sont préservés. Trois motifs regardés
(lames, Point de Hongrie, bâton rompu) et trois teintes.

### Séjour traversant — photo remplacée

Seule photo **rejetée** par le pré-filtre : le sol continu ne couvre que 19 %
de la moitié basse de l'image, deux canapés occupant l'essentiel du premier
plan. La règle du lot autorise alors le remplacement par une photo
éditorialement proche et déjà validée, plutôt qu'un lien vers une autre
pièce : la carte montre désormais `room-sejour`, la scène `sejour`, validée
depuis le lot précédent. La carte affiche donc la pièce qu'elle ouvre.

### Entrée cadrée — géométrie prouvée, rendu impossible

C'est la meilleure photo des huit au pré-filtre (EXCELLENT, flèche 1,45 px) et
sa géométrie était déjà validée. Son rendu avait été rejeté pour « une bande du
même sol non couverte le long du mur droit ». La carte de couverture
(rendu contre photo, vert changé, rouge inchangé) confirme et précise : la
bande fait environ un sixième de l'image, et ce qui l'occupe est un
porte-manteau **à claire-voie** — deux poteaux tournés, une tablette, un bac,
plusieurs traverses de quelques pixels — posé sur le sol visible, plus un
vantail de porte au premier plan. Étendre le masque jusqu'au mur demanderait
d'occulter une douzaine de membrures fines ; chaque erreur se verrait comme du
parquet peint en travers d'une traverse. Non essayable, et ce n'est pas un
défaut de mesure.

### Cuisine ouverte, Salon d'angle, Couloir en enfilade

- **Cuisine ouverte** : un grand tapis couvre le centre du sol et six chaises
  y posent des pieds de 4 px. Le tapis se détoure, les pieds beaucoup moins.
- **Salon d'angle** : sol sombre et miroitant. Le champ d'orientation du sol
  ne donne aucune fuite (r = −0,016) et, comme l'annonçait déjà la
  documentation du traqueur, les reflets créent des gradients plus forts que
  la jonction mur/sol.
- **Couloir en enfilade** : déjà calibrée et laissée `experimental` au lot
  précédent — jonction mur/sol sans contraste, frontière non mesurable. Rien
  n'a changé de ce côté.

### Les deux calibrations commencées

Elles ne sont pas abandonnées, et ce qui est mesuré est consigné :

- **Chambre sous combles** (`room-petit-bureau`) : les deux directions du sol
  sont franches. La plinthe des placards de gauche est linéaire de x 0,04 à
  0,28 (pente −0,1885, chute de luminance 111 à 131), celle des commodes du
  fond de x 0,58 à 0,73 (pente +0,131) ; leur intersection place le coin de la
  pièce en (0,502 ; 0,6936). Manquent une seconde parallèle par direction —
  donc les deux fuites — et le détourage de la banquette capitonnée, du
  fauteuil à quatre pieds fins et du bureau de premier plan.
- **Sous les toits** (`room-sous-les-toits`) : le mur droit est net (pente
  0,725). La moitié gauche de la frontière ne l'est pas : onze colonnes
  relevées donnent onze hauteurs sans alignement, entre 0,62 et 0,76, parce
  que le sol pâle, les panneaux vert sombre et les taches de soleil créent des
  gradients plus forts que la jonction. À reprendre colonne par colonne à la
  loupe.

Les deux cartes affichent déjà le cadrage 1600 × 1067 de leur future scène :
le jour où elles seront calibrées, seul `visualizerAvailable` changera.

## Performance

Mesures faites dans les mêmes conditions pour les trois scènes (pane de
prévisualisation masquée, ce qui gonfle les valeurs absolues — seule la
comparaison compte) :

| scène | ouverture | peinture WebGL | tâche longue max |
|---|---|---|---|
| chambre-parisienne (nouvelle, Point de Hongrie) | 8 097 ms | 94,4 ms | 1 234 ms |
| bureau-vide (référence, Point de Hongrie) | 7 240 ms | 91,3 ms | 1 077 ms |
| chambre (référence, lames) | 2 698 ms | 110,7 ms | 1 220 ms |

À motif égal, la nouvelle scène coûte comme une scène déjà validée. Son
masque a 23 sommets contre 30 pour le bureau vide, aucun occulteur, et le
worker de texture reste en service.

## Parcours vérifié

Sur 375 × 812, 844 × 390, 1440 × 900 et 1920 × 1080 : aucun débordement
horizontal, la carte entière est cliquable (335 × 419 px sur mobile), la
pastille fait 44 px de haut. Le clic ouvre le Studio sur la même photographie,
avec la configuration annoncée par la légende, et le parquet, le motif et
l'orientation se changent ensuite sans que la photo bouge.

## Ce que la page ne dit plus

Le chapeau annonçait « Chaque visuel indique le motif et le type de pose
retenus ». C'était vrai quand la légende décrivait le sol de la photo ; une
carte essayable annonce maintenant l'ambiance que le lien applique. Le chapeau
le dit : la légende donne le motif et la teinte, et les pièces calibrées
s'ouvrent dans le Studio sur cette photographie même.
