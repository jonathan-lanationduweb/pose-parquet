# Contrat de l'API d'analyse — spécification, pas encore implémentée

Ce document décrit la **forme des données** qu'un service d'analyse d'image
devra renvoyer pour alimenter le Visualiseur Parquet. Il n'existe aujourd'hui
aucun serveur, aucun modèle, aucune requête réseau : le front produit
exactement ces mêmes données à la main (pièces précalibrées) ou par sélection
de l'utilisateur (photo importée).

L'intérêt de figer le contrat maintenant est simple : le jour où le service
existe, il suffit d'enregistrer un analyseur de plus.

```js
// js/scene/analyzer.js — le seul point de branchement
registerAnalyzer('remote', async ({ file }) => {
  const body = new FormData();
  body.append('image', file);
  const response = await fetch(`${API}/analyze-room`, { method: 'POST', body });
  return normalizeScene(await response.json()); // ← même schéma que data/scenes/*.json
});
```

Le moteur de rendu ne sait pas d'où viennent les données. Il reçoit une
`SceneData` normalisée et il peint.

---

## POST /analyze-room

**Requête** — `multipart/form-data`

| champ     | type   | obligatoire | rôle                                                        |
| --------- | ------ | ----------- | ----------------------------------------------------------- |
| `image`   | file   | oui         | JPEG / PNG / WebP, 20 Mo maximum                            |
| `maxSide` | int    | non         | côté le plus long souhaité pour les cartes renvoyées (1600) |
| `want`    | string | non         | liste : `floor,depth,occlusion,geometry` (défaut : tout)    |

**Réponse** — `application/json`

```json
{
  "schema": "pose-parquet/scene@1",
  "sceneId": "upload-7f3c1a",
  "source": "ai",
  "confidence": 0.87,
  "timings": { "segmentation": 412, "depth": 233, "geometry": 18 },

  "image": { "width": 1600, "height": 1067 },

  "camera": {
    "horizon": 0.431,
    "vanishingPoints": [
      { "x": 0.512, "y": 0.431, "weight": 0.9 },
      { "x": 8.4, "y": 0.436, "weight": 0.4 }
    ],
    "fovDeg": 62,
    "tiltDeg": -3.1,
    "heightM": 1.55
  },

  "surfaces": [
    { "id": "rez", "label": "Sol continu", "continuous": true }
  ],

  "floorZones": [
    {
      "id": "zone-1",
      "label": "Pièce principale",
      "surfaceId": "rez",
      "order": 0,
      "confidence": 0.93,
      "plane": {
        "quad": [
          { "x": 0.201, "y": 0.585 },
          { "x": 0.829, "y": 0.585 },
          { "x": 1.043, "y": 0.996 },
          { "x": -0.038, "y": 0.996 }
        ],
        "meters": { "width": 4.6, "depth": 4.2 },
        "origin": { "u": 0, "v": 0 },
        "rotationDeg": 0
      },
      "mask": {
        "polygon": [{ "x": 0.0, "y": 0.69 }, "…"],
        "holes": [[{ "x": 0.44, "y": 0.81 }, "…"]]
      },
      "runtimeMask": null
    }
  ],

  "occluders": [
    {
      "id": "occ-1",
      "label": "Commode",
      "kind": "furniture",
      "polygon": [{ "x": 0.36, "y": 0.56 }, "…"],
      "contact": [{ "x": 0.36, "y": 0.70 }, "…"],
      "depth": 0.42,
      "castsShadow": true
    }
  ],

  "maps": {
    "floorMask": { "encoding": "png-base64", "width": 800, "height": 534, "data": "iVBORw0…" },
    "depth": { "encoding": "png-base64", "width": 800, "height": 534, "data": "iVBORw0…", "near": 0.6, "far": 9.4, "invert": false },
    "shading": { "encoding": "png-base64", "width": 400, "height": 267, "data": "iVBORw0…" }
  },

  "light": {
    "kind": "photo-luma",
    "strength": 0.92,
    "blurRadius": 0.04,
    "sun": { "azimuthDeg": 214, "elevationDeg": 31, "strength": 0.4 }
  },

  "warnings": ["Sol partiellement masqué au premier plan"]
}
```

---

## Champs, un par un

### `schema`

Chaîne versionnée. Le front refuse une majeure inconnue plutôt que de peindre
n'importe quoi. Aujourd'hui : `pose-parquet/scene@1`.

### `source` et `confidence`

`manual` | `precalibrated` | `ai`. Le front s'en sert **uniquement** pour ce
qu'il affiche à l'utilisateur. Tant que `source !== 'ai'`, aucune interface ne
prononce le mot « détection » ni « analyse ». `confidence` sous 0,6 devra
ouvrir l'écran de correction au lieu d'aller droit au rendu.

### `image`

Dimensions de l'image **telle qu'analysée**. Toutes les coordonnées de la
réponse sont normalisées (0 → 1 sur cette image), jamais en pixels : le front
retaille librement la photo sans invalider la scène. Les valeurs légèrement
hors [0, 1] sont permises et utiles — un plan de sol se prolonge souvent
au-delà du cadre.

### `camera`

`horizon` est le seul champ dont le front a réellement besoin aujourd'hui :
il borne le plan du sol et sert de garde-fou (aucune texture au-dessus).
`vanishingPoints`, `fovDeg`, `tiltDeg` et `heightM` servent à une V2 : dériver
la géométrie du sol sans quadrilatère, et à terme reconstruire les murs.

### `surfaces`

La notion qui rend le multi-pièces cohérent. Deux zones qui partagent un
`surfaceId` sont **le même sol** : elles reçoivent forcément le même matériau,
la même largeur de lame, le même motif. Une chambre au fond d'un couloir peut
en revanche appartenir à une autre surface si le projet prévoit deux parquets
différents.

### `floorZones`

Une zone = **un plan de perspective** + **un masque**. C'est la distinction
importante :

- `plane.quad` définit la projection (homographie carré unité → quadrilatère).
  Il peut largement dépasser la zone visible ; c'est un repère, pas un contour.
- `plane.meters` donne l'échelle réelle : sans elle, une lame de 14 cm n'a pas
  de taille.
- `plane.origin` (en mètres, dans le repère du sol) décale le motif. C'est ce
  qui permet à un parquet de **se prolonger** d'une pièce à l'autre à travers
  une ouverture : deux projections différentes, une seule trame.
- `plane.rotationDeg` oriente les lames par zone, en plus de l'orientation
  globale choisie par l'utilisateur.
- `mask.polygon` est le contour réellement peint, `mask.holes` les trous
  (pied de meuble, tapis, trémie).
- `order` trie les zones de la plus lointaine à la plus proche.

### `occluders`

Ce qui doit rester **devant** le parquet. Le rendu restaure les pixels
d'origine dans ces polygones : un canapé n'est jamais repeint. `contact` est
la ligne de contact avec le sol, utile pour poser une ombre de contact.
`depth` (0 = collé à la caméra, 1 = au fond) sert au tri quand les objets se
recouvrent.

Un occluder est une donnée de scène, pas un trou de masque : il vaut pour
toutes les zones et survit à une correction du contour.

### `maps`

Cartes optionnelles, en PNG base64 ou en URL. Elles sont **plus petites que
l'image** : une carte de profondeur en 800 px suffit largement, une carte
d'éclairement en 400 px aussi (c'est une basse fréquence par nature).

- `floorMask` : alternative pixel-exacte au polygone. Si elle est présente, le
  front la préfère et garde le polygone comme poignée d'édition.
- `depth` : gris 8 bits, `near`/`far` en mètres. Aujourd'hui le front calcule
  la profondeur analytiquement à partir du plan — c'est exact pour les pixels
  de sol. La carte servira pour ce qui n'est **pas** le sol : trier les
  occlusions, atténuer la netteté au fond, poser un contact.
- `shading` : luminance basse fréquence de la photo, déjà séparée du détail.
  Le front sait la calculer lui-même ; la recevoir évite de le refaire.

### `light`

`kind` vaut `photo-luma` (l'éclairement est repris de la photo) ou `estimated`
(un modèle a estimé une source). `strength` dose le report, `blurRadius` (en
fraction de la largeur d'image) sépare l'éclairement du détail : c'est ce qui
évite que les lames de l'ancien sol réapparaissent en fantôme sous le nouveau.

### `warnings`

Phrases prêtes à afficher. Jamais d'erreur silencieuse : si le sol est à
moitié masqué, l'utilisateur doit le savoir avant de juger le rendu.

---

## Codes de réponse

| code | situation                            | comportement du front                            |
| ---- | ------------------------------------ | ------------------------------------------------ |
| 200  | analyse complète                     | rendu direct, correction possible                |
| 206  | analyse partielle (`warnings` remplis) | ouvre l'écran de correction                     |
| 415  | format non pris en charge            | message, retour au choix de photo                |
| 422  | aucun sol trouvé                     | bascule sur la sélection manuelle, sans erreur   |
| 429  | quota                                | bascule sur la sélection manuelle                |
| 5xx  | panne                                | bascule sur la sélection manuelle                |

**Règle de conception :** aucune panne du service ne doit priver l'utilisateur
du Visualiseur. Le mode manuel est le socle, l'analyse automatique est une
accélération. C'est pour cette raison que le front est construit dans cet
ordre, et pas l'inverse.

---

## GET /health

```json
{ "status": "ok", "models": { "segmentation": "…", "depth": "…" }, "queue": 0 }
```

Sert à décider si l'on propose l'analyse automatique. Si le service ne répond
pas, l'interface ne mentionne pas la fonction : elle n'existe pas ce jour-là.

---

## Ce qui ne change pas quand le service arrive

- le schéma `SceneData` (`js/scene/schema.js`) ;
- le moteur de rendu (`js/scene/renderer*.js`) ;
- les masques, les matériaux, la comparaison, l'export ;
- l'écran de correction — il reste utile, il devient facultatif.

Une seule étape disparaît du parcours : placer les points à la main.

Voir aussi [future-python-architecture.md](future-python-architecture.md) et
[renderer-canvas-vs-webgl.md](renderer-canvas-vs-webgl.md).
