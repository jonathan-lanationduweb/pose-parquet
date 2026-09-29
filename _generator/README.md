# Générateur de pages

Le site est **généré**. Ce dossier contient le générateur Node (zéro
dépendance) qui produit les 32 pages, leurs visuels, `sitemap.xml`,
`data/contenus.json`, et surtout les **assets empreintés** de `assets/dist/`.

```bash
node _generator/build.js
```

Ce n'est pas un confort. Les pages chargent leurs scripts et leurs feuilles
depuis `assets/dist/<empreinte>/`, pas depuis `js/` et `css/` : **modifier une
source sans reconstruire ne change rien à ce que le navigateur exécute.**
`check-studio-api.js` et `check-reproducible.js` le vérifient chacun à leur
manière.

Le script réécrit les fichiers HTML, les visuels de `assets/images/`,
`data/contenus.json`, `sitemap.xml` et `assets/dist/`. Il ne touche jamais aux
sources `css/`, `js/`, `components/` ni à `serve.js`.

## Quand l'utiliser

- Après toute modification de `css/`, `js/` ou `components/` — sans quoi elle
  n'atteint pas le navigateur.
- Ajouter un guide, un motif ou un tutoriel.
- Modifier la navigation, le pied de page ou les balises communes.
- Régénérer les visuels SVG.

## Les modules

### Assemblage

| Fichier | Rôle |
| --- | --- |
| `build.js` | assemblage des pages, listes, sitemap ; point d'entrée |
| `layout.js` | gabarit HTML commun : `<head>`, en-tête, pied de page, fil d'Ariane |
| `home.js` | composition de la page d'accueil |
| `visualiseur.js` | les deux pages du Visualiseur : présentation et application |
| `ui.js` | fragments éditoriaux : encadrés, tableaux, étapes, FAQ, avant/après |
| `assets.js` | chaîne d'assets : un seul CSS, un seul arbre JS, et une empreinte qui change avec le contenu |
| `arborescence.js` | ce qui, à la racine du dépôt, n'est jamais une page du site |
| `eol.js` | fins de ligne, types texte/binaire, empreintes — voir plus bas |

### Contenu

| Fichier | Rôle |
| --- | --- |
| `content-guides.js` | contenu des 8 guides |
| `content-motifs.js` | contenu des 6 fiches motif |
| `content-tutos.js` | contenu des 3 tutoriels |
| `sources.js` | références citées en bas d'article |
| `photos.js` | photographies du site et leurs crédits |
| `scenes.js` | les pièces d'exemple réellement proposées, avec la règle du front |
| `catalogue.js` | combien de parquets le Studio propose vraiment, avec le prédicat du front |
| `polices.js` | ce que `css/fonts.css` déclare vraiment, lisible depuis le générateur |

### Visuels et ressources

| Fichier | Rôle |
| --- | --- |
| `images.js` | visuels SVG : compositions d'intérieur abstraites |
| `responsive.js` | images réactives (`<picture>`, `srcset`, `sizes`) |
| `make-icons.js` | icônes, favicons et manifeste, à partir du symbole d'identité |
| `fetch-fonts.js` | télécharge et auto-héberge les polices, écrit `css/fonts.css` |
| `fetch-photos.js` | télécharge les photographies depuis Pexels |

### Contrôles

Neuf, tous exécutables séparément, tous en code 0 quand ils passent.

| Fichier | Ce qu'il garantit |
| --- | --- |
| `check-images.js` | chaque image référencée existe, avec dimensions et texte alternatif |
| `check-links.js` | aucun lien interne mort |
| `check-inspiration.js` | chaque carte essayable ouvre bien sa propre photographie |
| `check-reproducible.js` | mêmes empreintes sous Windows et Linux |
| `check-product-visualizer.js` | contrat du Visualiseur produit (`js/product/`) |
| `check-studio-api.js` | contrat de pilotage `window.__studio` (apiVersion 1) |
| `check-chiffres.js` | aucun nombre public écrit en dur |
| `check-fonts.js` | polices auto-hébergées uniques et utiles, préchargements valides |
| `check-motifs.js` | aucune combinaison référence × motif impossible n'est posable |

`fetch-fonts.js` et `fetch-photos.js` sortent sur le réseau : ils ne font pas
partie de la construction et ne se lancent qu'à la demande.

## `sitemap.xml` : `lastmod` et date de build

`buildMeta()` date chaque URL par `item.updated || item.date`, et **retombe
sur la date du jour** quand l'entrée n'en porte aucune. Les 8 guides ont une
date éditoriale ; les 21 autres URL — accueil, index, motifs, tutoriels,
outils, pages annexes — reçoivent donc la date du build.

Conséquence à connaître : **toute construction, même sans changement
éditorial, modifie `sitemap.xml`.** Un lot qui ne touche qu'à du code — une
API développeur du Studio, par exemple — n'a aucune raison d'annoncer aux
moteurs de recherche que 21 pages ont été mises à jour. Dans ce cas, restaurer
le fichier après le build est légitime :

```
git checkout <avant-le-lot> -- sitemap.xml
```

Ce n'est pas un défaut à corriger dans ce README : c'est un choix du
générateur, et le changer demanderait de décider quelle date porter pour une
page sans date éditoriale — ce qui dépasse la simple mécanique.

## Fins de ligne et empreintes

**Politique : LF partout**, dans les objets Git comme dans la copie de travail.
`.gitattributes` l'impose par `eol=lf`, ce qui neutralise `core.autocrlf` —
réglé à `true` par défaut sur Git for Windows — quelle que soit la
configuration de qui clone. Le générateur écrit lui aussi toutes ses sorties en
LF.

**Pourquoi l'empreinte normalise.** Les noms des assets contiennent une
empreinte du contenu (`assets/dist/site.<empreinte>.css`), qui sert de
cache-buster. Avant correction, cette empreinte était calculée sur les copies
de travail telles que le checkout les avait posées : sous Windows en CRLF, sous
Linux en LF. Le même commit produisait donc des noms différents selon la
machine, et le bundle du Visualiseur avait même des fins de ligne mixtes parce
que `css/studio-app.css` était en CRLF et les cinq autres feuilles en LF.
Désormais `eol.js` ramène le texte en LF **en mémoire, le temps du calcul** :
les sources ne sont jamais réécrites pour être hachées.

**Texte ou binaire.** `eol.js` porte la liste des extensions texte, pendant de
celle de `.gitattributes` ; `check-reproducible.js` vérifie que les deux ne
divergent pas. Un fichier d'extension inconnue est traité comme binaire, donc
haché octet pour octet : c'est le choix sûr, puisque hacher du texte comme un
binaire ne fait que perdre l'insensibilité aux fins de ligne, alors que hacher
un binaire comme du texte le corrompt. Un octet `0x0D` dans un PNG ou une
police est une donnée, pas une fin de ligne.

**Sous Windows, à quoi s'attendre.** Après clonage, les fichiers texte sont sur
disque en LF — ce n'est pas une anomalie, c'est la politique. Les éditeurs
courants s'en accommodent. `git status` doit être franchement propre après un
build : si des fichiers générés apparaissent modifiés alors que leur contenu
est identique, c'est le signe que quelque chose écrit du CRLF, et
`node _generator/check-reproducible.js` le dira.

Le projet est attendu **en UTF-8**. `eol.js` refuse de décoder un fichier texte
qui n'en est pas — il lève plutôt que d'abîmer silencieusement le contenu — et
le contrôle vérifie les fichiers texte suivis par Git.

## Ajouter un guide

Ajouter une entrée dans `content-guides.js` (slug, title, h1, description,
category, tags, date, reading, excerpt, cover, lead, body, faq, related) puis
relancer le script. La page, la liste de rubrique, le sitemap, les liens
« À lire ensuite » et l'index JSON se mettent à jour.

## Éditer le HTML à la main

À éviter, et ce n'est plus seulement une question de discipline : une page
modifiée à la main ne porte plus l'empreinte que `assets.js` attend, et
`verifierRattachements()` fait échouer la construction suivante. La page et
ses assets sont solidaires — c'est ce qui garantit qu'aucune page n'est
publiée sans sa feuille de style.

La correction se fait donc dans `_generator/`, puis `node _generator/build.js`.

## Le contrat de pilotage du Visualiseur

`?perf=1` expose `window.__studio`, à l'origine pour instrumenter le rendu.
L'outil d'analyse de photo qui vit dans un autre dépôt s'en sert aussi pour
appliquer un produit sans toucher à l'état interne du studio : il appelle
`selectMaterial`, `setPattern`, `setWidth`, `setAngle`, lit
`getCapabilities()` et attend `onRendered()`. `apiVersion` vaut `1` ; un
appelant qui ne sait pas conduire cette version doit refuser plutôt que
deviner.

Ce point d'accroche **reste derrière `?perf=1`** : aucune page publique n'en
dépend, et `check-studio-api.js` le vérifie. Il vérifie aussi que la copie
publiée dans `assets/dist/<empreinte>/` porte bien le même contrat que la
source — une modification de `js/studio/app.js` sans `node _generator/build.js`
ne change rien à ce que le navigateur exécute.

```
node _generator/check-studio-api.js            la forme, en lisant la source
node _generator/check-studio-api.js --script   le comportement, à coller dans
                                               la console d'un studio ?perf=1
```
