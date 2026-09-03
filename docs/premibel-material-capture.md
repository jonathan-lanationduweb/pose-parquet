# Produire une vraie matière pour le visualiseur

Ce document dit **ce qu'il faut photographier et comment**, pour qu'une
référence passe de `approximate` à `ready`.

Aujourd'hui, aucune des 14 références pilotes n'a de matière réelle : toutes
sont rendues par une famille de démonstration. Le rendu est donc **indicatif**,
et le visualiseur le dit.

## Pourquoi la photo de la fiche produit ne suffit pas

L'image principale d'une fiche Premibel est une **photo d'ambiance** : une
pièce meublée, vue en perspective, avec sa lumière et ses ombres portées. Les
quatorze images du panel pilote sont de ce type.

La reprendre comme texture de sol donnerait une surface qui répète des meubles,
des plinthes et des ombres tous les quatre mètres. Ce n'est pas un défaut de
qualité, c'est une erreur de nature : une photo de mise en scène n'est pas une
carte de matière.

D'où la séparation, dans le schéma produit :

| champ | rôle | contrainte |
| --- | --- | --- |
| `visual.thumbnail` | vignette de catalogue | aucune — la photo d'ambiance convient |
| `visual.sample` | photo d'échantillon sur fiche | aucune |
| `visual.albedo` | **rendu du sol** | à plat, sans ombre, sans perspective |
| `visual.normal` | relief, facultatif | même cadrage que l'albedo |
| `visual.roughness` | brillance locale, facultatif | même cadrage que l'albedo |
| `visual.plankVariants` | **plusieurs vraies lames** | voir plus bas |

## La prise de vue

Une seule photo par lame, mais faite correctement.

**Ce qu'il faut**

- **Une lame réellement représentative** de la référence, pas la plus belle du
  colis. Le visualiseur montrera ce qu'on achète, y compris ses nœuds.
- **Parfaitement à plat**, capteur parallèle au sol. Un trépied et une colonne
  verticale, pas une photo tenue à la main au-dessus.
- **Lumière diffuse et bilatérale** : deux sources larges de part et d'autre,
  ou un ciel couvert. L'objectif est qu'aucune ombre ne se forme dans le grain.
- **Aucune ombre dure**, aucun reflet spéculaire. Une lame vernie renvoie les
  sources : les décaler jusqu'à ce que le reflet sorte du cadre.
- **Balance des blancs fixe et mesurée**, avec une charte grise dans un premier
  cliché. La teinte du produit est la référence : elle ne doit pas dériver
  d'une lame à l'autre.
- **Toute la lame dans le cadre**, largeur complète, avec quelques centimètres
  de marge.
- **Une règle ou une mire** dans le champ, sur un cliché de calage au moins.
  C'est ce qui permet de vérifier l'échelle plutôt que de la supposer.
- **Résolution utile : au moins 8 px/mm** sur la lame — une lame de 150 mm de
  large occupe alors 1200 px. En dessous, le grain fin disparaît.
- **RAW si possible**, sinon JPEG qualité maximale. Pas de netteté ni de
  contraste appliqués par l'appareil.

**Ce qu'il faut éviter**

- le flash intégré ;
- une lame posée sur un sol clair qui renvoie de la lumière par le bas ;
- deux lames photographiées dans des conditions différentes puis mises côte à
  côte : l'écart se verra plus que le bois ;
- toute retouche « esthétique » avant livraison — saturation, virage, vignette.

## Du cliché à la carte

Étapes, dans l'ordre. Rien ici n'exige un outil particulier ; ce qui compte est
que chaque étape soit faite, et vérifiée.

1. **Correction de perspective.** Redresser sur les arêtes de la lame, qui sont
   droites et parallèles. Après cette étape, la lame est un rectangle.
2. **Correction d'éclairement.** Retirer le gradient de lumière résiduel
   (division par un flou très large de l'image elle-même). Une carte d'albedo
   ne doit contenir **aucune lumière** : le moteur applique celle de la pièce.
3. **Calage colorimétrique** sur la charte grise du cliché de calage.
4. **Mise à l'échelle** : rééchantillonner à une résolution en px/mm choisie
   une fois pour toutes — 8 px/mm est un bon compromis. C'est cette valeur qui
   fait qu'une lame de 150 mm mesure 150 mm au sol.
5. **Découpe des variantes** : une image par lame, bord à bord, sans
   chevauchement.
6. **Relief (facultatif)** : dériver une carte de normales de la luminance, ou
   photographier la même lame sous deux éclairages rasants opposés.
7. **Rugosité (facultatif)** : une carte claire là où la surface est fermée
   (vernis), sombre dans le grain ouvert (brossé).
8. **Contrôle des raccords** : afficher les variantes côte à côte dans
   `_calibrage/material-review.html` et regarder les jonctions.

## Ne pas chercher le raccord parfait

Une texture parfaitement raccordable, répétée sur 30 m², est **moins** réaliste
qu'un jeu de vraies lames distribuées. Le raccord invisible fait disparaître les
joints ; ce qu'on veut, ce sont des lames différentes les unes des autres.

C'est pourquoi la cible n'est pas *une* texture mais `plankVariants` :

```json
"plankVariants": [
  "premibel/CHENF36006/lame-01.webp",
  "premibel/CHENF36006/lame-02.webp",
  "premibel/CHENF36006/lame-03.webp"
]
```

Le moteur distribue les variantes de façon déterministe — même produit, même
scène, même agencement — sur le mécanisme déjà en place pour casser la
périodicité de la tuile (décalage propre à chaque rangée, voir `uJitter` dans
`js/scene/renderer-gl.js`).

**Combien de variantes.** 3 suffisent à supprimer l'effet copier-coller,
8 donnent un sol crédible, 12 à 20 sont la cible pour une référence phare. Le
moteur n'a pas de limite : `plankVariants` est une liste, et sa longueur ne
change rien au code. Rien n'oblige à tout produire d'un coup — on peut livrer
3 lames, puis compléter.

## Livraison

Un dossier par référence, nommé par le SKU :

```
premibel/CHENF36006/
  albedo.webp          carte principale, à plat, sans lumière
  lame-01.webp …       variantes, même résolution px/mm
  normal.webp          facultatif
  roughness.webp       facultatif
  capture.json         { "pxPerMm": 8, "wbRef": "…", "date": "…", "operateur": "…" }
```

`capture.json` n'est pas de la bureaucratie : sans le `pxPerMm`, l'échelle
redevient une supposition, et c'est le défaut qu'on vient de passer plusieurs
passes à éliminer.

## Vérifier avant d'intégrer

- [ ] la lame est un rectangle, ses bords sont parallèles au cadre ;
- [ ] aucun gradient de lumière visible en poussant le contraste ;
- [ ] aucun reflet spéculaire ;
- [ ] la teinte correspond à l'échantillon physique, sous lumière neutre ;
- [ ] `pxPerMm` renseigné, et cohérent avec la largeur déclarée de la fiche ;
- [ ] les variantes se ressemblent sans être identiques ;
- [ ] dans `material-review.html`, la référence passe à `ready` et le sol ne
      montre ni raccord ni répétition sur une pièce de 6 à 8 m.
