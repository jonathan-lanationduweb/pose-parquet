# Générateur de pages (optionnel)

Le site livré est **du HTML statique pur** : il fonctionne et se modifie
directement, sans outil.

Ce dossier contient le petit générateur Node (zéro dépendance) qui a produit ces
pages. Il évite de répéter à la main l'en-tête, le pied de page, le fil d'Ariane
et les balises SEO sur 29 pages.

## Quand l'utiliser

- Ajouter un guide, un motif ou un tutoriel.
- Modifier la navigation, le pied de page ou les balises communes.
- Régénérer les visuels SVG placeholders.

## Comment

```bash
node _generator/build.js
```

Le script réécrit les fichiers HTML, les visuels de `assets/images/`,
`data/contenus.json`, `sitemap.xml` et `robots.txt`.
Il ne touche **jamais** à `css/`, `js/`, `components/` ni `serve.js`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `build.js` | Assemblage des pages, listes, accueil, sitemap |
| `layout.js` | Gabarit HTML commun : `<head>`, en-tête, pied de page, fil d'Ariane |
| `ui.js` | Fragments éditoriaux : encadrés, tableaux, étapes, FAQ, avant/après |
| `content-guides.js` | Contenu des 8 guides |
| `content-motifs.js` | Contenu des 6 fiches motif |
| `content-tutos.js` | Contenu des 3 tutoriels |
| `images.js` | Génération des visuels SVG placeholders |

## Ajouter un guide

Ajouter une entrée dans `content-guides.js` (slug, title, h1, description,
category, tags, date, reading, excerpt, cover, lead, body, faq, related) puis
relancer le script. La page, la liste de rubrique, le sitemap, les liens
« À lire ensuite » et l'index JSON se mettent à jour.

## Ne pas utiliser le générateur

C'est possible : éditez directement les fichiers HTML. Pensez alors à supprimer
ce dossier, ou à ne plus lancer le script, sous peine d'écraser vos
modifications.
