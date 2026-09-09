# Visualiseur produit — intégration directe (v1)

`outils/visualiseur-produit.html` · `js/product/` · `css/product-app.css`

## Pourquoi on abandonne le pont et l'iframe

Le prototype `tools/product-concept.html` (pose-parquet-ai) a validé l'UX :
la pièce plein écran, une navigation flottante, une carte produit, un viewport
pan/zoom, la comparaison au curseur. Techniquement il pilotait **le Studio dans
une iframe** par `window.__studio` et copiait son canevas. Ça marchait, au prix
de : deux applications, deux viewports à synchroniser, un cache de captures à
invalider, une renégociation au rechargement de l'iframe, un repli statique
pour couvrir les délais du pont, des listeners à compter. Chaque passe de
stabilisation en trouvait une couche de plus. La base n'était pas fragile par
accident : elle l'était par construction.

Le prototype reste comme **référence UX uniquement** — il n'est pas une
intégration de production. `window.__studio` (branche
`feature/studio-control-api`) reste un outil de mesure derrière `?perf=1` ;
le Visualiseur produit n'en a pas besoin.

## Architecture

```
outils/visualiseur-produit.html     coquille appLayout({ app: 'product' })
  js/product/main.js                 monte l'application
  js/product/app.js                  UX + état + câblage
  js/product/viewport.js             pan / zoom 2D, un seul conteneur transformé
                │
                ├─ js/scene/renderer.js        createSceneRenderer()  — LE moteur, inchangé
                ├─ js/scene/analyzer.js        scènes calibrées (SceneData, floorZones, masques, occlusions)
                ├─ js/scene/image-loader.js    pièces d'exemple et photo importée
                ├─ js/scene/material.js        cache de tuiles (12 entrées), worker, quandCartesPretes
                └─ js/studio/catalog.js        loadCatalog → product.js → familles de rendu
```

Un clic produit fait : `state.product = id` → `renderer.paint(canvasA,
{ material, pattern, angle })`. Rien entre les deux. Le motif et la largeur ne
sont pas des réglages : `toMaterial()` fait des dimensions réelles de la fiche
le profil de son motif (Zeus = chevron 92 × 520 mm).

**Une seule source de vérité**, `state` : `room`, `scene`, `photo`, `product`,
`rendererSettings.angle`, `comparison`, `favoriteIds`, `originalMode`, `ui`
(écran, panneau, menu, `picking`, immersif, `split`, vue du catalogue),
`intent`. Tout l'écran se déduit de `state` dans `paintChrome()` ; aucun état
n'est relu dans le DOM.

**Le viewport** transforme un conteneur dont la photo, la version B et la
version A (dans un clip en espace écran) sont les enfants : ils ne peuvent
pas se désynchroniser. 100 % = la photo couvre le cadre ; « Ajuster » montre
toute la photo, sur demande. L'état est commis immédiatement, l'interpolation
passe par minuteur : `requestAnimationFrame` ne porte jamais d'état.

**Comparaison et avant/après** : la version B est `renderer.paint(canvasB,
configB)` — même scène, mêmes masques, même caméra, par construction. Le
curseur est un `clip-path` en espace écran sur la couche A.

**Dernier clic gagne** : les rendus sont synchrones ; ce qui est asynchrone
(cartes fabriquées dans le worker, chargement d'une pièce ou d'une photo)
relit l'état courant à l'arrivée ou porte un numéro d'intention et s'ignore
s'il est périmé.

## Catalogue

Les cinq références pilote viennent de `data/products.premibel-pilot.json`
(POINF36005 Zeus, BTRPF39009 Notting Hill, CHENF39031 Houston, CHENF36014
Colza, CHENF36015 Pivoine) : vrai nom, vraie référence, vraie fiche
(`productUrl`, nouvel onglet, `noopener noreferrer`), pas de prix. La vignette
est l'échantillon dessiné par le moteur lui-même (`swatchFor`), jamais une
photo de fiche plaquée au sol.

## Rendu : ce qui a été revu

La capture humaine refusait un point de Hongrie « trop pâle, délavé ». Mesuré
dans le studio, séjour, sur les pixels du sol :

| | luminance | pixels quasi blancs |
| --- | --- | --- |
| sol d'origine | 0,52 | 0,4 % |
| Zeus sur `chene-sable` (avant) | 0,75 | 11 % |
| Zeus sur `chene-naturel` (après) | 0,67 | 3,9 % |
| Notting Hill sur `chene-craie` (avant) | 0,81 | 18,8 % |
| Notting Hill sur `chene-sable` (après) | 0,75 | 10,8 % |
| Colza sur `chene-sable` (avant) | 0,75 | 11 % |
| Colza sur `chene-miel` (après) | 0,57 | 0,2 % |

Le compositing (`renderer-gl.js`) reporte l'éclairement de la photo en
**rapport** à la moyenne du sol : il ne pâlit rien. Le défaut venait de la
**famille de rendu** affectée aux fiches — trop pâle pour trois des cinq —
et de l'albédo des familles claires, que le genou de hautes lumières (0,86)
pousse au blanc dans une pièce ensoleillée. La photo produit de Zeus mesure
L = 0,71 ; `chene-naturel` mesure 0,71. Les familles ont été réaffectées sur
cette base (`products.premibel-pilot.json`). Le moteur n'a pas été touché.

## Limites matière Premibel

Les vraies cartes (albédo, normales, rugosité) n'existent pas : les cinq
références rendent par une famille de démonstration. **Motif, largeur et
orientation sont exacts ; teinte, veinage et finition sont approchés**, et le
panneau Personnaliser le dit. Colza et Pivoine partagent la géométrie
(lames 150) et ne se distinguent que par la teinte de leur famille.

Il reste un écart de contraste (écart-type 0,12 contre 0,15 sur le sol
d'origine) et une compression des hautes lumières sur les familles pâles :
c'est le renderer, hors du périmètre de ce lot.

## IA future

L'import d'une photo affiche la photo, permet pan et zoom, et dit qu'aucun
parquet ne sera posé sans connaître le sol. Le jour où un analyseur existe
(`registerAnalyzer('remote', …)` dans `analyzer.js`), `importPhoto()` appelle
`analyzeScene({ file })` et `renderer.setScene()` ; l'UX ne change pas.
LOT IA 2B non commencé.
