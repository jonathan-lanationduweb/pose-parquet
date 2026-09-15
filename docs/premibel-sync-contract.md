# Contrat de synchronisation Premibel → visualiseur

> **Rien n'est connecté.** Ce document définit ce qu'il faudra échanger, dans
> quel format, et selon quelles règles. La décision du mécanisme revient à
> l'humain : quatre options sont comparées à la fin, aucune n'est implémentée.

## Le principe

**Premibel est la source de vérité produit. Pose Parquet est consommateur.**

`data/products.premibel-pilot.json` est un fichier **temporaire**, tenu à la
main pour comprendre les problèmes sur 14 références. Il ne doit pas devenir un
catalogue parallèle : une copie manuelle divergente serait pire que pas de
catalogue du tout, parce qu'elle aurait l'air à jour.

## Champs attendus

Le visualiseur consomme la fiche canonique de `js/scene/product.js`. Colonne
« obligatoire » : sans ce champ, la fiche est écartée du visualiseur.

| champ | type | obligatoire | source Premibel | transformation |
| --- | --- | --- | --- | --- |
| `id` | texte | **oui** | SKU | aucune — **stable, jamais réutilisé** |
| `externalId` | texte | non | ID produit WordPress | à exposer, absent du JSON-LD aujourd'hui |
| `sku` | texte | non | `sku` / `mpn` | aucune |
| `name` | texte | **oui** | titre | normaliser la casse |
| `slug` | texte | non | slug WP | à défaut, dérivé du nom |
| `woodSpecies` | texte | non | spéc. `Essence` | aucune |
| `range` | texte | non | spéc. `Famille` | code fabricant, faute de mieux |
| `tone` | texte | non | catégorie de teinte | **absente sur une partie du catalogue** |
| `finish` | texte | non | spéc. `Finition` | aucune |
| `surfaceTreatment` | texte | non | spéc. `Aspect` | **champ distinct de `finish`** |
| `parquetType` | texte | non | catégorie (`Massif` / `Flottant` / `Stratifié`) | aucune |
| `dimensions.widthMm` | nombre + unité | **oui** | spéc. `Largeur` | unité **explicite** |
| `dimensions.lengthMm` | nombre + unité | non | spéc. `Longueur` ou `Longueur variable` | intervalle → moyenne, bornes conservées |
| `dimensions.thicknessMm` | nombre + unité | non | spéc. `Épaisseur` | unité explicite |
| `compatiblePatterns` | liste | non | **catégories de motif** | motif inconnu du moteur écarté ; à défaut, `['lames']` seul |
| `unsupportedPattern` | texte | non | catégorie `Versailles` | fiche écartée du visualiseur |
| `visual.thumbnail` | URL | non | image principale | **jamais utilisée au rendu** |
| `visual.albedo` | URL | non | — | à produire, voir `premibel-material-capture.md` |
| `displayOrder` | nombre | non | ordre de catégorie | tri croissant |
| `active` | booléen | non | statut de publication | `false` = hors catalogue |

## Unités

**Règle absolue : l'unité est déclarée, jamais devinée.**

Deux formes acceptées :

```json
"dimensions": { "widthMm": "120mm", "lengthMm": "455 à 910mm" }
```
```json
"dimensionUnit": "mm",
"dimensions": { "widthMm": 120, "lengthMm": 520 }
```

Un nombre nu sans unité connue est **refusé** et signalé
(`unité absente pour la valeur 120`). Une valeur hors bornes de vraisemblance
(largeur 40–1200 mm, longueur 200–3000 mm, épaisseur 5–40 mm) est **rejetée**,
pas seulement signalée : une valeur fausse utilisée est pire qu'une valeur
absente.

Ce n'est pas de la théorie. `DASSP3903` déclare aujourd'hui
`Longueur : 1,38mm` pour une lame de 1380 mm. L'ancienne heuristique corrigeait
en silence ; la règle actuelle rejette et le dit.

## Identifiants, suppression, désactivation

- `id` **stable et jamais réutilisé.** Il circule dans les liens profonds
  (`?parquet=CHENF36006`) et dans les demandes de devis. Réattribuer un
  identifiant à un autre produit ferait pointer d'anciens liens vers une
  référence différente — le pire des cas, parce qu'invisible.
- **Retrait du catalogue** : `active: false`. Le produit disparaît du
  visualiseur mais son identifiant reste connu.
- **Suppression** : ne pas supprimer la ligne. Une fiche absente d'un export
  est indistinguable d'un export tronqué. Un export doit être **complet ou
  rejeté**, jamais appliqué partiellement.
- Un lien profond vers une référence retirée doit **dégrader proprement** : le
  paramètre inconnu est déjà ignoré par `app.js`, qui retombe sur la sélection
  par défaut. Reste à décider si l'utilisateur doit être averti — à trancher
  quand le catalogue bougera vraiment.

## Fréquence et fraîcheur

Le visualiseur n'a pas besoin de temps réel : il ne montre ni prix ni stock.
Une fraîcheur **quotidienne** suffit, et une fraîcheur **hebdomadaire** serait
acceptable. Ce qui compte est de savoir **quand** l'export a été produit :
chaque export porte un `generatedAt`, affiché dans le rapport de validation.

## Gestion des erreurs

Trois niveaux, déjà en place dans `validateCatalog()` :

| niveau | effet | exemples |
| --- | --- | --- |
| **bloquant** | fiche écartée du visualiseur | identifiant absent ou en doublon, libellé absent, largeur absente ou invraisemblable, ni famille ni carte matière, motif inconnu |
| **signalement** | fiche utilisable, manque documenté | SKU, gamme, finition, épaisseur, vignette absents ; rendu approché |
| **rejet global** | export non appliqué, l'ancien reste en place | JSON illisible, clé racine absente, plus de 20 % de fiches bloquantes |

Le dernier niveau est le plus important : **un export dégradé ne doit pas
remplacer un catalogue sain.** Mieux vaut un catalogue d'hier que la moitié de
celui d'aujourd'hui.

Un produit invalide ne casse jamais le visualiseur — il est écarté et apparaît
dans le rapport.

## Quatre options de connecteur

Aucune n'est implémentée. À décider ensemble.

### A. Export JSON déposé

Premibel produit un fichier, on le récupère (dépôt, S3, URL statique).

- **simplicité** ★★★ — c'est déjà le format lu aujourd'hui
- **sécurité** ★★★ — aucune surface exposée, aucun secret
- **maintenance** ★★★ — un script côté Premibel, rien côté visualiseur
- **fraîcheur** ★★ — dépend de la planification de l'export
- *risque* : l'export peut se figer sans que personne s'en aperçoive → d'où le
  `generatedAt` obligatoire

### B. Endpoint WordPress REST (`/wp-json/wc/v3/products`)

- **simplicité** ★★★ — existe déjà, rien à écrire côté Premibel
- **sécurité** ★ — l'API WooCommerce demande des clés ; **une clé dans du
  JavaScript public est publique**. Il faudrait un intermédiaire, donc un
  serveur, que pose-parquet.com n'a pas (site statique sur GitHub Pages)
- **maintenance** ★★ — dépend des évolutions de WooCommerce
- **fraîcheur** ★★★ — temps réel
- *bloquant en l'état* : le site est statique

### B bis. Store API WooCommerce (`/wp-json/wc/store/v1/products`) — **relevée le 11/09/2026**

Cette option manquait à la comparaison, et elle change la donne : la Store API
n'est **pas** l'API d'administration. Elle est publique, en lecture seule, et
**ne demande aucune clé** — c'est celle que WooCommerce expose pour les
vitrines découplées.

Relevé effectué sur `www.premibel.fr` :

| Constat | Valeur |
| --- | --- |
| Réponse | `HTTP 200`, `application/json`, sans authentification |
| Volume | `X-WP-Total: 779` produits |
| Pagination | 100 par page, 8 pages |
| Attributs | taxonomies structurées : `pa_essence`, `pa_largeur`, `pa_epaisseur`, `pa_finition`, `pa_aspect`, `pa_famille`, `pa_longueur_variable`, `pa_pose`, `pa_qualite` |
| Identité | `sku`, `slug`, `permalink`, `images[]`, `categories[]` |
| CORS | **aucun `Access-Control-Allow-Origin`** — un appel depuis le navigateur est donc impossible |

- **simplicité** ★★★ — rien à écrire côté Premibel
- **sécurité** ★★★ — aucune clé, aucune donnée privée, lecture seule
- **maintenance** ★★★ — contrat WooCommerce stable et documenté
- **fraîcheur** ★★★ — temps réel à la construction du site
- *conséquence de l'absence de CORS* : la récupération se fait **à la
  construction**, dans un script Node du générateur, et produit un fichier
  `data/products.premibel.json` servi comme les autres. Ce n'est pas une
  limite : c'est exactement ce que veut un site statique, et cela rend le
  catalogue reproductible et versionné.

Cette option supprime l'objection qui rendait B « bloquant en l'état » : il n'y
a ni clé, ni serveur intermédiaire à prévoir.

**Ce que l'ancien relevé perdait.** Le pilote a été constitué en lisant le
JSON-LD et un tableau HTML de spécifications. La Store API rend les mêmes
informations sous forme de taxonomies — `pa_largeur` vaut `"190mm"`, unité
comprise — au lieu de les faire deviner à une expression régulière sur du
HTML. C'est la différence entre lire une donnée et l'extraire.

### C. Endpoint personnalisé côté Premibel

Une route publique en lecture seule qui rend exactement la fiche canonique.

- **simplicité** ★★ — il faut l'écrire
- **sécurité** ★★★ — lecture seule, aucun secret, données déjà publiques
- **maintenance** ★★ — le mapping vit chez Premibel, au plus près des données
- **fraîcheur** ★★★
- *avantage réel* : c'est la seule option où le mapping est maintenu par ceux
  qui connaissent les données

### D. Export ERP intermédiaire

- **simplicité** ★ — dépend entièrement de l'ERP
- **sécurité** ★★★
- **maintenance** ★ — deux systèmes à suivre
- **fraîcheur** ★★
- *intérêt* : si l'ERP porte des champs absents du site (épaisseur fiable,
  motifs disponibles, gamme réelle), c'est la meilleure source malgré le coût

### Recommandation

**B bis maintenant, C comme cible** — la recommandation change depuis le relevé
du 11/09/2026.

B bis ne demande rien à personne, elle existe, elle est publique, et elle rend
les spécifications déjà structurées. Elle remplace A pour la suite du pilote :
un export déposé à la main aurait la même fraîcheur qu'un fichier oublié, alors
que la Store API est interrogée à chaque construction du site.

C reste la cible : c'est la seule option qui place le mapping là où vivent les
données, et qui survit à une refonte de l'un des deux sites — mais elle demande
du travail côté Premibel et **ne doit pas être lancée sans décision explicite**.

A garde un intérêt de secours : si la Store API venait à être fermée, un export
déposé prend le relais sans rien changer en aval, puisque le format consommé
reste `data/products.premibel.json`.

B (`wc/v3`) reste écartée : elle demande des clés, et une clé dans un site
statique est une clé publiée. D dépend d'informations que nous n'avons pas.

## Ce qui reste à obtenir de Premibel

- [ ] **Les motifs réellement disponibles** par référence. Les catégories les
      donnent aujourd'hui, mais leur exhaustivité n'est pas garantie.
- [ ] **La teinte** pour les références qui n'en ont pas, ou la validation de
      nos affectations de famille — aujourd'hui un choix éditorial de notre
      côté, fait en regardant les photos.
- [ ] **Les cartes matière** pour les références phares.
- [ ] **L'ID WordPress** en plus du SKU, pour tracer un produit dont le SKU
      changerait.
- [ ] **La correction de `DASSP3903`** (`Longueur : 1,38mm`) et un contrôle de
      vraisemblance côté source.
- [ ] **Qui met à jour quoi**, et à quelle fréquence.
