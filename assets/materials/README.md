# Cartes de matière — formats attendus

Ce dossier est **vide à dessein**. Les douze parquets du catalogue sont
aujourd'hui **procéduraux** : leur apparence est calculée par
`js/scene/texture.js` à partir des paramètres de `data/parquets.json`. Aucune
photographie de produit, aucune texture téléchargée.

C'est un choix, pas un manque : nous n'avons pas de ressource photographique
dont la licence autorise cet usage. Plutôt que d'aller chercher une image de
parquet sur un moteur de recherche et de l'utiliser sans droits, le moteur
dessine le bois. Le résultat est honnête — il est présenté comme une
simulation — et il a un avantage réel : chaque référence a son propre veinage,
sa propre densité de nœuds, son propre contraste, et rien n'est une simple
recoloration d'une même image.

Le modèle de données, en revanche, est prêt à recevoir de vraies cartes.

---

## Arborescence attendue

Une référence = un dossier nommé par son `id` dans `data/parquets.json` :

```
assets/materials/
  chene-naturel/
    albedo.webp        couleur du bois, sans lumière ni ombre
    normal.webp        relief : chanfreins, veines creusées, joints
    roughness.webp     brillance locale
    thumbnail.webp     vignette de catalogue (facultatif)
    LICENSE.txt        origine et licence — obligatoire
```

## Contraintes techniques

| Point | Attendu |
| --- | --- |
| **Répétabilité** | La carte doit se raccorder à elle-même sans couture visible, horizontalement **et** verticalement. Une texture non répétable est inutilisable : le sol est pavé. |
| **Échelle** | Une carte couvre un carré de sol dont le côté est déclaré en mètres (`maps.albedo.meters`). Sans cette valeur, le moteur ne peut pas savoir qu'une lame mesure 18 cm. |
| **Résolution** | 1024 à 2048 px de côté. Au-delà, le gain est invisible à l'écran et le poids devient un problème sur mobile. |
| **Format** | WebP de préférence, PNG accepté. Pas de JPEG pour la carte de normales : ses artefacts de compression se voient directement dans l'éclairage. |
| **Espace couleur** | `albedo` en sRGB, sans ombre ni reflet incrusté. `normal` en espace tangent, convention OpenGL (Y vers le haut). `roughness` en niveaux de gris linéaires. |
| **Licence** | Obligatoire, dans `LICENSE.txt`, avec l'auteur, la source et l'usage autorisé. Sans ce fichier, la référence n'est pas publiée. |

## Déclaration dans le catalogue

```json
{
  "id": "chene-naturel",
  "maps": {
    "albedo":    { "file": "chene-naturel/albedo.webp",    "meters": 2.4 },
    "normal":    { "file": "chene-naturel/normal.webp",    "meters": 2.4 },
    "roughness": { "file": "chene-naturel/roughness.webp", "meters": 2.4 }
  },
  "proceduralFallback": true
}
```

`proceduralFallback: true` garde le moteur procédural comme solution de repli :
si un fichier manque ou ne se charge pas, la référence reste utilisable.

## Ce que le moteur en fera

`js/scene/material.js` expose déjà les trois cartes. Aujourd'hui :

- `albedo` ← tuile procédurale ;
- `relief` (pente + rugosité) ← **dérivé de la luminance de l'albedo**. C'est
  faux physiquement, mais visuellement juste sur du bois : un joint sombre se
  lit comme un creux, un chanfrein clair comme une arête. C'est ce qui fait
  accrocher la lumière sur les joints, et c'est précisément le détail qui manque
  quand un parquet a l'air peint.

Le jour où de vraies cartes existent, `materialMaps()` les charge au lieu de
les dériver. Les deux moteurs de rendu (`renderer-gl.js`, `renderer-canvas.js`)
échantillonnent déjà `albedo` et `relief` séparément : **rien à changer côté
rendu.**

## Un avertissement

Ne pas confondre « avoir une belle texture » et « avoir le bon matériau ». Une
carte d'albedo qui contient déjà des ombres et des reflets ruinera le rendu :
le moteur applique l'éclairement de la photo par-dessus, et deux éclairages
superposés donnent une image sale. Une carte d'albedo doit être plate, presque
terne à l'œil nu. C'est normal.
