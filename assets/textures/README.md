# Textures de parquet

Le visualiseur génère ses textures **par programme** (voir
`js/visualizer/patterns.js`) : aucune image n'est nécessaire pour qu'il
fonctionne, et rien n'est emprunté à un catalogue commercial.

Ce dossier permet de remplacer une teinte par une **tuile photographique**
lorsque l'on dispose d'un visuel dont on détient les droits.

## Format attendu

```
assets/textures/
  <identifiant-de-teinte>/
    tile.jpg        1024 × 1024, répétable (seamless), lames dans la longueur
    LICENCE.txt     origine et droits d'utilisation du fichier
```

L'identifiant doit correspondre à une teinte déclarée dans `TONES`
(`clair`, `naturel`, `miel`, `brun`, `fume`, `graphite`) ou à une nouvelle
entrée ajoutée dans ce tableau.

## Brancher une tuile

```js
// js/visualizer/patterns.js
{ id: 'naturel', label: 'Chêne naturel', file: 'assets/textures/naturel/tile.jpg', … }
```

La tuile couvre `TILE_METERS` (2,4 m) de sol : une tuile représentant une
surface différente doit ajuster cette valeur, sinon l'échelle des lames sera
faussée.

## Ce qu'il ne faut pas faire

- reprendre des photos de nuanciers ou de catalogues sans autorisation ;
- utiliser une image non répétable : les raccords deviennent visibles ;
- utiliser une photo prise en perspective : la tuile doit être vue de dessus,
  la perspective étant appliquée par le moteur de rendu.
