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
| `eol.js` | Fins de ligne, types texte/binaire, empreintes — voir ci-dessous |
| `check-reproducible.js` | Contrôle que le build est reproductible entre systèmes |
| `check-studio-api.js` | Contrôle le contrat de pilotage `window.__studio` — voir ci-dessous |

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

## Ne pas utiliser le générateur

C'est possible : éditez directement les fichiers HTML. Pensez alors à supprimer
ce dossier, ou à ne plus lancer le script, sous peine d'écraser vos
modifications.

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
