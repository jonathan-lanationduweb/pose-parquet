# Moteur de rendu : Canvas 2D, WebGL ou Three.js — la décision

**Décision : WebGL 2 écrit à la main, sans bibliothèque. Le moteur Canvas 2D
est conservé comme recours et comme référence. Three.js est écarté.**

Ce document dit pourquoi, avec les mesures qui ont servi à trancher.

---

## Ce qu'on demande au moteur

La question n'est pas « quelle technologie est la plus moderne » mais « laquelle
sert le mieux l'architecture visée » :

| besoin                                  | aujourd'hui | à terme |
| --------------------------------------- | ----------- | ------- |
| projeter une texture sur un plan de sol | oui         | oui     |
| plusieurs plans dans une même photo     | oui         | oui     |
| filtrage correct en perspective rasante | oui         | oui     |
| albedo + relief + rugosité              | oui         | cartes photographiques |
| éclairement repris de la photo          | oui         | oui     |
| carte de profondeur                     | dérivée du plan | modèle monoculaire |
| occlusions                              | masques     | masques + tri par profondeur |
| changement de matériau instantané       | souhaitable | indispensable |

Ce qu'on ne demande **pas**, et c'est décisif : pas de graphe de scène, pas de
caméra 3D, pas de maillage, pas de chargeur de modèles, pas de système de
lumières, pas d'ombres projetées calculées, pas d'animation. Nous projetons des
quadrilatères texturés dans le plan image d'une photographie.

---

## Le défaut qu'il fallait corriger

L'ancien rendu ressemblait à « une texture posée sur un quadrilatère ». Trois
causes, mesurées :

1. **La tuile était trop petite.** 2,40 m de côté : une lame de 1,80 m ne
   tenait pas deux fois dedans, elle était donc étirée à la taille de la tuile.
   Les joints de bout s'alignaient tous les 2,40 m en une grille parfaite et le
   sol prenait l'aspect de grandes dalles. Corrigé côté données (4,80 m,
   1280 px), pas côté moteur.

2. **L'éclairement reportait tout.** Multiplier la texture par la luminance du
   pixel d'origine reporte le soleil, mais aussi **les lames de l'ancien sol** :
   deux trames se superposaient. Corrigé en séparant basse et haute fréquence
   (`js/scene/shading.js`), là aussi indépendamment du moteur.

3. **Le filtrage était isotrope.** Et là, le moteur compte.

Au fond d'une pièce, un pixel d'image couvre une **bande** de texture : quelques
millimètres en travers des lames, plusieurs centimètres dans leur longueur. Un
échantillonneur logiciel doit choisir un seul niveau de réduction :

- choisir le grand axe → le fond devient une bouillie uniforme, les lames
  disparaissent ;
- choisir le petit axe → le fond fourmille et scintille.

C'est exactement ce qui fait « image plaquée » : les lames du fond n'ont plus de
lames. La réponse correcte est le **filtrage anisotrope** : échantillonner
plusieurs fois le long du grand axe. Le GPU le fait en matériel, gratuitement,
avec 16 échantillons. En logiciel, il faut les payer un par un.

---

## Le POC et les mesures

Les deux moteurs ont été écrits pour consommer **exactement les mêmes données**
(`js/scene/geometry.js` est partagé, à dessein) et ont été comparés sur les
quatre pièces calibrées, en 1600 × 1067, dans `_calibrage/`.

Le moteur logiciel a reçu une approximation d'anisotropie — jusqu'à quatre
prélèvements le long du grand axe — pour que la comparaison porte sur une
qualité comparable et non sur un moteur volontairement bridé.

| scène        | zones | WebGL 2 | Canvas 2D | rapport | écart abs. moyen | biais |
| ------------ | ----- | ------- | --------- | ------- | ---------------- | ----- |
| sejour       | 2     | 28 ms   | 639 ms    | ×23     | 11,5 / 255       | −0,8  |
| piece-claire | 1     | 34 ms   | 488 ms    | ×14     | 10,6 / 255       | −0,3  |
| chambre      | 1     | 35 ms   | 496 ms    | ×14     | 11,7 / 255       | −1,2  |
| contraste    | 1     | 26 ms   | 460 ms    | ×18     |  8,2 / 255       | −1,3  |

Lecture de l'écart entre les deux moteurs :

- **le biais est négligeable** (moins de 0,5 %) : les deux s'accordent sur la
  teinte, l'éclairement, le contact, la géométrie. Aucune divergence de logique ;
- **l'écart absolu (3 à 5 %) est de la haute fréquence** : le GPU rend les
  lames du fond plus nettes, avec 16 prélèvements là où le logiciel en fait 4.
  C'est précisément la différence qu'on cherchait à obtenir.

Autre mesure, sur le confort d'usage : changer de parquet coûte **190 ms** en
WebGL contre **269 ms** en Canvas — un écart bien plus faible que le rapport
ci-dessus, parce que les deux paient la même chose : la fabrication procédurale
de la tuile 1280², de son relief et de ses mipmaps, soit environ 170 ms de CPU.
**Le goulot d'étranglement du changement de matériau n'est pas le moteur de
rendu, c'est la génération de la texture.** C'est ce que résoudra le passage à
de vraies cartes en fichiers (`material.maps`, aujourd'hui prévu et vide) :
décoder un WebP est dix fois moins cher que dessiner la tuile.

---

## Pourquoi pas Three.js

Three.js aurait donné le filtrage anisotrope et le multi-plan, comme WebGL brut.
Il n'apporte rien d'autre **ici** :

| ce que Three.js apporte              | ce que nous en ferions |
| ------------------------------------ | ---------------------- |
| graphe de scène, hiérarchie d'objets | rien : 1 à 4 quadrilatères |
| caméra perspective, contrôles        | rien : la caméra est la photo, décrite par une homographie |
| chargeurs glTF/OBJ, géométries       | rien : aucun modèle 3D |
| matériaux PBR, système de lumières   | rien : notre éclairement vient de la photo, pas d'un modèle |
| ombres, post-traitement, animation   | rien dans cette passe   |

Ce qui reste utile — un plan texturé, un shader, des mipmaps anisotropes — fait
**une vingtaine de lignes** de WebGL 2 brut. En regard, le coût est réel :

- **une dépendance**, dans un projet dont la règle explicite est *zéro
  dépendance*, sans bundler et sans `node_modules` ;
- **environ 600 Ko** minifiés à vendorer et à maintenir, pour une page dont tout
  le CSS pèse 113 Ko ;
- **une abstraction de plus** entre nos données et le pixel : notre modèle n'est
  pas « une caméra qui regarde un monde », c'est « une photo dont on connaît le
  plan du sol ». Plier ce modèle dans une caméra `PerspectiveCamera` demanderait
  de reconstruire une pose 3D à partir de l'homographie — soit remplacer un
  calcul exact et direct par un calcul dérivé et approché.

Le résultat en l'état : `js/scene/renderer-gl.js` fait 420 lignes, commentaires
compris, et ne dépend de rien.

**Ce qui ferait rouvrir la question.** Le jour où il faudra placer de vrais
objets 3D dans la pièce — un meuble, une plinthe modélisée, une reconstruction
des murs — un moteur 3D redevient le bon outil, et Three.js sera le candidat
naturel. Ce n'est pas le sujet de cette passe, et le contraire aurait été de
payer aujourd'hui pour un besoin hypothétique.

---

## Pourquoi garder le moteur Canvas

Il n'est pas là par nostalgie :

1. **Recours.** Sans WebGL 2 — contexte refusé, pilote sur liste noire, machine
   virtuelle, navigateur ancien — le visualiseur continue de fonctionner. Le
   choix se fait à l'exécution (`js/scene/renderer.js`), et une seule fonction
   décide.
2. **Référence.** Deux implémentations indépendantes des mêmes équations
   attrapent les erreurs qu'une seule laisse passer. Le banc de `_calibrage/`
   compare les deux images pixel à pixel : c'est ce qui a révélé que la formule
   d'atténuation du relief était exprimée en pixels de texture d'un côté et en
   mètres de l'autre. Un bug qu'aucune capture d'écran n'aurait montré.
3. **Coût faible.** 290 lignes, aucune dépendance, aucune maintenance de
   plateforme.

La règle : **toute évolution du shader doit être portée dans les deux**, et le
banc doit continuer à donner un biais inférieur à 1 %.

---

## Et WebGPU

Prématuré. WebGL 2 est disponible partout où le site est utilisé, le rendu tient
en 30 ms, et rien dans le pipeline actuel n'est limité par l'API. WebGPU
deviendrait intéressant si la segmentation tournait dans le navigateur — un
modèle ONNX en WebGPU pour éviter tout serveur, piste évoquée dans
[future-python-architecture.md](future-python-architecture.md). C'est le calcul
qui l'imposerait, pas le rendu.

---

## Où regarder dans le code

| fichier                       | rôle |
| ----------------------------- | ---- |
| `js/scene/renderer.js`        | choisit le moteur, prépare ce qui ne dépend que de la photo |
| `js/scene/renderer-gl.js`     | WebGL 2 : shader, textures, un quadrilatère par zone |
| `js/scene/renderer-canvas.js` | Canvas 2D : même chaîne, en tableaux typés |
| `js/scene/geometry.js`        | partagé — c'est la garantie que les deux calculent la même chose |
| `_calibrage/`                 | banc d'essai et outil de calibrage des scènes |
