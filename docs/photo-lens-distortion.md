# Photos, objectifs et distorsion

> **Rien n'est implémenté.** Ce document explique un problème que la fonction
> « importer ma pièce » rencontrera, comment le mesurer, et ce qu'il faudrait
> faire. Aucune correction de distorsion n'existe dans le moteur aujourd'hui.

## Deux choses différentes qu'on confond souvent

**La perspective** est ce que fait la géométrie : des droites parallèles dans
la pièce convergent dans l'image vers un point de fuite, une lame de 18 cm
paraît plus petite au fond qu'au premier plan. C'est un effet **projectif**, et
c'est exactement ce que le moteur sait décrire : une homographie envoie le
carré unité sur le quadrilatère du sol, et tout suit.

Une propriété compte : la perspective **conserve les droites**. Une droite du
monde reste une droite dans l'image, où qu'elle soit dans le cadre.

**La distorsion optique** est ce que fait la lentille. Elle déplace chaque
point le long du rayon qui le joint au centre optique, d'une quantité qui
croît avec la distance à ce centre. En barillet, les points s'éloignent du
centre ; en coussinet, ils s'en rapprochent.

Sa signature est l'inverse de la précédente : **elle courbe les droites**. Une
arête de porte parfaitement droite dessine un arc dans l'image, d'autant plus
marqué qu'elle passe loin du centre. Sur l'axe optique, elle ne courbe rien.

## Pourquoi ça compte pour SceneData

`SceneData` décrit une **caméra sténopé** : un point de fuite, un horizon, une
focale, et c'est tout. Il n'y a pas de coefficient de distorsion, et les
mesures de calibrage supposent toutes que les droites du monde sont droites
dans l'image :

- ajuster une droite sur un pied de mur ;
- croiser deux droites pour obtenir un point de fuite ;
- imposer le quatrième coin d'un quadrilatère par la perspective ;
- déduire la focale de l'orthogonalité de deux directions.

Si l'image est distordue, ces quatre opérations donnent des résultats qui
**dépendent de l'endroit du cadre où on les fait**. Deux relevés de la même
direction, l'un au centre l'autre au bord, donnent deux points de fuite
différents. Il n'existe alors aucun horizon compatible avec les deux, et la
scène n'est pas représentable — pas approximativement représentable :
franchement pas.

C'est le cas qui attend « importer ma pièce ». Les téléphones photographient
volontiers en ultra grand-angle pour faire tenir une pièce dans le cadre, et
ces optiques distordent. Certains appareils corrigent en interne, d'autres non,
et rien dans le fichier ne le dit de façon fiable.

## Comment le mesurer : la flèche d'arc

Le test tient en une phrase : **on prend une arête droite du monde réel, on la
suit dans l'image, et on regarde si elle est droite.**

`_calibrage/calibrer.html` expose `flecheDe(x, y0, y1)`. La fonction suit
l'arête, lui ajuste une parabole, et renvoie :

- `fleche` — l'écart de la parabole à sa corde, au milieu, en pixels. C'est le
  bombement ;
- `ecartType` — l'écart-type d'ajustement. Il dit si la parabole **décrit** le
  tracé ; sans lui le premier chiffre ne veut rien dire.

Ordres de grandeur relevés sur les photos du dépôt, à résolution native
(1600 × 1067) : une arête franche donne une flèche de 0,1 à 2 px pour un
écart-type inférieur à 2. Au-delà de 3 px de flèche **avec** un écart-type
faible, l'objectif déforme.

Deux règles pour que la mesure veuille dire quelque chose :

1. **Choisir l'arête loin du centre de l'image.** La distorsion radiale ne
   déplace rien sur l'axe optique : une verticale au milieu du cadre reste
   droite quelle que soit la force de la distorsion. Le semis automatique du
   diagnostic pondère d'ailleurs les colonnes par leur éloignement du centre,
   pour cette raison exactement.
2. **La prendre la plus longue possible.** Le bombement croît comme le carré de
   la longueur ; sur un segment court il se noie dans le bruit.

## Le piège, et il a fonctionné

La scène `couloir` a d'abord été rejetée de ce dépôt pour distorsion en
barillet. C'était faux, et la mécanique de l'erreur vaut d'être connue.

Le premier traqueur suivait, ligne après ligne, le **minimum de luminance**
dans une fenêtre autour de la position précédente. Sur un jambage de porte
clair contre un mur clair, il n'y a pas de minimum : le traqueur a glissé sur
le bois sombre de la porte, en s'en écartant progressivement. Il a mesuré sa
propre dérive, et cette dérive avait la forme d'un arc — +3,1 puis −4,0 puis
+4,0 px. Tous les indicateurs semblaient bons : le tracé comptait 79 points, le
résidu moyen valait 2,8 px, l'arc était régulier.

Le même jambage, suivi par le **maximum de gradient** — la marche de clarté,
et non le pixel le plus sombre — donne une flèche de **0,13 px** pour un
écart-type de **0,21 px** sur 99 points. C'est une droite.

Deux leçons, valables au-delà de ce cas :

- **un traqueur doit suivre ce qui définit l'arête.** Une ligne sombre se suit
  par la luminance, une marche de clarté par le gradient. Se tromper de
  grandeur ne donne pas un résultat bruité, il donne un résultat faux et
  d'allure crédible ;
- **il faut regarder le tracé posé sur l'image.** Dessiner les deux suivis
  par-dessus la photo a réglé la question en une capture : l'un tenait
  l'arête au pixel, l'autre partait en biais. Aucun chiffre n'aurait suffi.

Deux détails qui rendaient l'erreur possible et qui sont corrigés :

- l'outil de calibrage chargeait l'image par `image-loader.js`, qui la réduit à
  1100 px de large quand la fenêtre en fait moins de 600. La résolution de
  travail dépendait donc de la largeur de la fenêtre, et un résidu de 8 px ne
  voulait pas dire la même chose d'une session à l'autre. Il charge maintenant
  à la résolution du fichier, toujours ;
- le diagnostic ne retenait une arête que si la courbure **expliquait**
  l'essentiel de l'écart à la droite. Critère à l'envers : sur une photo saine
  la ligne est droite, la parabole n'ajoute rien, et cette part tombe à 0,13.
  Le séjour, scène de référence du dépôt, était rejeté par ce critère.

## Ce qu'il faudrait faire, le jour où

La chaîne visée :

```
PHOTO
  → correction de distorsion
  → analyse géométrique
  → SceneData
```

La correction doit venir **avant** tout relevé, jamais après : une fois les
points de fuite calculés sur une image distordue, l'erreur est entrée dans
toutes les valeurs et plus rien ne la sépare du reste.

Trois pistes, de la plus simple à la plus lourde :

1. **Refuser la photo.** Mesurer la flèche à l'import et dire à la personne que
   cette photo-là ne convient pas, en expliquant pourquoi et en suggérant de
   reculer plutôt que d'élargir. Peu satisfaisant, mais honnête et immédiat.
2. **Estimer un coefficient radial depuis l'image elle-même.** On dispose
   d'arêtes droites — jambages, angles de murs, plinthes. Chercher le
   coefficient `k₁` (voire `k₁, k₂`) qui les rend le plus droites possible est
   un problème d'optimisation à une ou deux inconnues, sans étalonnage
   préalable. C'est la piste raisonnable.
3. **Lire les métadonnées.** Marque, modèle et focale suffisent parfois à
   retrouver un profil d'objectif publié. Pratique quand ça marche, muet quand
   les métadonnées ont été retirées — ce que fait tout hébergeur d'images.

Dans les trois cas, `SceneData` gagnerait un bloc `lens` — coefficients,
centre optique, et la mention de leur provenance : mesurée, lue, ou supposée.
La distinction est celle qui court dans tout ce dépôt.

## Voir aussi

- `_calibrage/calibrer.html` — `flecheDe()`, `diagnostic()`, les suivis par
  gradient, la loupe graduée.
- `_calibrage/geometrie.js` — les mesures qui supposent des droites droites.
- `data/scenes/couloir.json` — la scène qui a servi de leçon, conservée en
  `experimental` avec le diagnostic corrigé.
- `docs/future-ai-api-contract.md` — le contrat d'un futur service d'analyse,
  auquel la correction de distorsion appartiendrait naturellement.
