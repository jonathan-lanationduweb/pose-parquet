# Contrat de synchronisation Premibel → visualiseur

> **Connecté depuis le 5 octobre 2026.** Le catalogue Premibel est synchronisé
> à la construction par `_generator/sync-premibel.js`, depuis la Store API
> (option B bis ci-dessous). Les sections qui suivent celle-ci décrivent le
> contrat d'origine ; celle-ci décrit ce qui tourne.

## Synchronisation en place

### Exécution

```bash
node _generator/sync-premibel.js     # interroge Premibel, écrit data/products.premibel.json
node _generator/build.js             # construit le site à partir du dernier fichier valide
node _generator/check-catalogue-premibel.js
```

La synchronisation n'est **pas** lancée par le build : un build normal ne fait
aucun appel réseau et utilise le dernier fichier synchronisé. Options :
`--dry-run` (rapporte sans écrire), `--from <dossier>` (rejoue des pages
téléchargées `raw-N.json` + `cats.json`, sans réseau), `--accepter-disparitions`
(voir plus bas).

Aucun appel à Premibel n'a lieu depuis le navigateur d'un visiteur : la Store API
n'envoie pas d'en-tête CORS, et le site ne sert que le fichier produit.

### Source et pagination

| | |
| --- | --- |
| Endpoint | `https://www.premibel.fr/wp-json/wc/store/v1/products` (+ `/products/categories`) |
| Pagination | `per_page=100`, pages 1 à `X-WP-TotalPages` |
| Complétude | nombre reçu = `X-WP-Total`, identifiants uniques, chaque page pleine sauf la dernière |
| Réseau | délai 30 s par requête, 3 tentatives (attente 1 s puis 2 s) sur erreur réseau, 429 ou 5xx ; User-Agent `PoseParquetCatalogSync/1.0` |
| Relevé du 05/10/2026 | 783 produits, 8 pages, 30 s |

### Qu'est-ce qu'un parquet

Un produit est retenu s'il est dans le sous-arbre de la catégorie **Parquet**
et dans aucun sous-arbre exclu, et si ses attributs ne le désignent pas comme
autre chose. **Le nom n'entre jamais dans la décision.**

| Exclusion | Donnée | Produits (05/10) |
| --- | --- | --- |
| hors sous-arbre Parquet | catégories | 215 |
| sol stratifié | catégorie `parquet-sol-stratifie` | 79 |
| accessoire | catégorie `accessoires` | 33 |
| finition Stratifié | `pa_finition` | 28 |
| lame de terrasse | catégorie `lames-de-terrasse` | 23 |
| famille PLINTHE | `pa_famille` | 6 |
| panneau mural | catégorie `panneaux-muraux` | 5 |

Résultat : **394 parquets** sur 783 produits.

### Normalisation

| Champ | Source | Règle |
| --- | --- | --- |
| `id`, `sku` | `sku` | identiques ; `id` circule dans les liens profonds |
| `externalId` | `id` WooCommerce | |
| `name` | `name` | entités décodées ; titre majoritairement en capitales → casse de phrase ; nom relu au pilote prioritaire ; original dans `nameSource` |
| `species` | `pa_essence` | |
| `range` | `pa_famille` | code fabricant |
| `tone` | catégorie de couleur | ramenée au vocabulaire du Studio : blanc/clair → clair, naturel/gris → naturel, miel/cuivre → chaud, brun/foncé → foncé ; original dans `toneSource` ; plusieurs couleurs → `null` |
| `finish` | `pa_finition` | |
| `treatment` | `pa_aspect` | |
| `type` | catégorie | `Massif` / `Flottant` / `null` |
| `dimensions` | `pa_largeur`, `pa_longueur` ou `pa_longueur_variable`, `pa_epaisseur` | unité de la source conservée, virgule décimale → point |
| `compatiblePatterns` | **catégories de motif uniquement** | voir ci-dessous |
| `thumbnail`, `image` | `images[0]` | HTTPS + domaine Premibel, sinon `null` ; **jamais une texture** |
| `productUrl` | `permalink` | HTTPS + domaine Premibel (`js/commerce/premibel-hotes.js`, partagé avec le navigateur) |
| `sample`, `maps`, `plankVariants` | — | `null` / vides : aucune matière capturée à ce jour |

Le moteur (`js/scene/product.js`) accepte ces noms (`species`, `treatment`,
`type`, `visualFamily`, `visualReason`) en plus de ses noms historiques.

### Motifs

Lus dans les catégories de motif de Premibel, et nulle part ailleurs :
`lames-droites` → `lames` ; `point-de-hongrie`, `point-de-hongrie-massif`,
`parquet-flottant-point-de-hongrie` → `point-de-hongrie` ; `baton-rompu`,
`parquet-massif-baton-rompu`, `parquet-flottant-baton-rompu` → `baton-rompu`.
`versailles` → `unsupportedPattern`, aucun motif posable.

**Politique prudente.** Un produit sans catégorie de motif n'est pas supposé
« lames » : il n'a aucun motif posable, donc aucun rendu. Le chêne ne rend pas
tous les motifs possibles. Seule exception : un motif saisi au pilote est repris
quand Premibel n'en déclare aucun (une référence, BTRP26001, rangée seulement en
« fin de série »).

### Statut de rendu

| Statut | Règle | Produits actifs (05/10) |
| --- | --- | --- |
| `ready` | carte matière capturée et validée (`maps.albedo`) | 0 |
| `approximate` | chêne + **une** catégorie de couleur + un motif posable + une largeur ≤ 400 mm → famille procédurale de même couleur ; ou famille choisie à l'œil au pilote | 211 |
| `unavailable` | tout le reste, avec `visualReason` | 183 |

Raisons d'indisponibilité au 05/10 : aucune catégorie de motif (95), essence sans
famille de rendu — bambou, exotiques, frêne (53), aucune catégorie de couleur
(22), Versailles (11), largeur absente (1), dalle de 600 mm (1).

Aucune famille n'est attribuée « à la luminance la plus proche » : une fiche
déclarée `unavailable` sans famille n'en reçoit pas du moteur.

Dans le Studio : `approximate` porte l'étiquette « Rendu indicatif » ;
`unavailable` n'est pas visualisable et apparaît dans la liste repliée
« autres références Premibel, sans rendu », avec « Voir la fiche chez Premibel ».

### Champs ignorés

`prices`, `price_html`, `on_sale`, et les attributs `pa_qualite` (mêle qualité
et textes promotionnels), `pa_nation_tarif_promo_date_fin`, `pa_codetarif`,
`pa_colisage`, `pa_unity`, `pa_type_unity`, `pa_poids_brut`. L'écriture échoue si
une clé de prix, de tarif ou de promotion apparaît dans le fichier.

### Produits disparus — `active: false`

Une référence présente dans le fichier précédent et absente d'une
synchronisation **complète** passe à `active: false` avec `deactivatedAt` ; la
ligne n'est jamais supprimée. À la première synchronisation, le pilote tient lieu
de fichier précédent : CHENF36006 (Chêne Artemis), absent de l'API, est conservé
inactif.

Garde-fou : si plus de 25 % des références actives disparaîtraient d'un coup,
la synchronisation refuse (export tronqué ou changement de structure probable).
Un humain vérifie, puis relance avec `--accepter-disparitions`. Un rejeu
`--from` ne désactive jamais rien : il ne peut pas prouver sa complétude.

### Erreurs

| Cas | Effet |
| --- | --- |
| réseau, délai, 429, 5xx après 3 tentatives | échec, code 1, fichier intact |
| réponse non JSON, en-têtes de pagination absents, page incomplète, total différent | échec, fichier intact |
| SKU, slug ou identifiant source vide ou en doublon parmi les parquets | échec, rien n'est écrasé |
| plus de 25 % de disparitions | échec, sauf `--accepter-disparitions` |
| clé de prix dans le fichier produit | échec |

L'écriture est atomique (fichier voisin puis renommage, `ecrireAtomique`) : un
échec à n'importe quel moment laisse le dernier fichier valide en place.

### Données manuelles

`data/products.premibel-pilot.json` n'est plus lu par le Studio. Il devient une
couche d'override : familles de rendu choisies sur les photos produit (12
références), ordre d'affichage, noms relus, et motif quand Premibel n'en déclare
aucun. Il ne crée aucune fiche. DASSP3903 et DAHRB6010_1, deux stratifiés Decoart
du pilote, sont désormais exclus par la règle « pas un parquet bois » ; leurs
données restent dans le pilote.

### Images — vignettes locales (depuis le 05/10/2026)

**Photo ≠ rendu.** La photo commerciale identifie le produit dans le catalogue ;
elle n'est jamais une texture. Le rendu dans la pièce reste procédural, et la
carte dit ce qu'il vaut (« Rendu indicatif », « Rendu fidèle »,
« Visualisation non disponible »).

- La synchronisation télécharge **la seule vignette principale** de chaque fiche
  active (`images[0].thumbnail`, 324 × 324), en demandant `Accept: image/webp` :
  Premibel la sert alors en WebP quand il en a une. Les images pleine taille ne
  sont jamais téléchargées.
- Le format est lu dans le **contenu** (signature JPEG, PNG, WEBP, GIF), jamais
  dans l'extension ni le Content-Type. WebP valide → gardé tel quel. JPEG, PNG
  ou GIF → converti par `_generator/vignette-webp.py` (Pillow : orientation EXIF,
  transparence sur fond blanc, carré centré 324 px, WebP qualité 80). Pillow est
  une dépendance de la **seule synchronisation** ; le build n'en a pas besoin.
  Source au-delà de 8 Mo, HTML ou format inconnu → refus.
- Fichier : `assets/images/products/premibel/<sku>.webp` (SKU réduit à
  `[A-Za-z0-9_-]`, jamais le titre). Écriture atomique.
- Cache : `_generator/premibel-thumbs.json` (non publié) associe chaque SKU à son
  URL source, sa taille, ses dimensions, le format et le poids de la source, et
  s'il y a eu conversion. Même URL et fichier local valide → aucun
  téléchargement ; URL changée → seule cette vignette est rafraîchie.
- Vérifications : en-tête RIFF/WEBP/VP8 lu sur le fichier, 200 o – 200 Ko.
- Échec d'une vignette : la fiche reste, `thumbnail: null`, l'échec est rapporté
  avec son étape (`download`, `decode`, `encode`), sa raison et le format reçu ;
  le Studio affiche un repli graphique (aplat de teinte, initiales de l'essence,
  motif, « Photo non disponible ») — jamais une fausse texture. Le même repli
  remplace une vignette locale qui ne se charge pas. Jamais bloquant.
- Le fichier public ne contient plus aucune URL d'image distante ; l'URL source
  ne vit que dans le cache, hors du site.

Relevé du 05/10/2026 : 394 fiches avec image source, 394 vignettes WebP locales,
**0 échec**. 371 servies en WebP par Premibel ; 23 converties localement. Cause de
ces 23 : `images[0].thumbnail` y pointe vers l'original téléversé (pas de
déclinaison 324 px ni de variante WebP) — HTTP 200, Content-Type exact, aucune
redirection ; 22 JPEG (45 à 223 Ko) et 1 PNG (BTRPF39009, « Notting Hill »,
1,5 Mo, présenté sur l'accueil). Seconde passe : 394 en cache, 0 téléchargement.

### Qualité des vignettes (depuis le 05/10/2026)

Module partagé `_generator/vignettes-qualite.js`, empreintes calculées par
`_generator/vignette-empreintes.py` (Pillow, synchronisation seulement) et
gardées dans le cache.

- **Même photo** : dHash 256 bits à 10 bits près ET couleur moyenne à 6 niveaux
  près. La couleur sépare une même scène dont le sol a été recoloré (sinon deux
  teintes différentes passeraient pour une seule photo).
- **Écartées** — `thumbnail: null`, `thumbnailIssue` dit pourquoi, fichier
  local supprimé, repli graphique dans le Studio :
  - `placeholder` : visuel « image produit indisponible » (empreinte connue, ou
    nom de fichier source `no-image`, `placeholder`, `indisponible`…) ;
  - `bandeau-commercial` : photo portant un prix ou une offre de lot, relevée à
    l'œil et liée au fichier source — si Premibel change la photo, l'exclusion
    tombe d'elle-même.
- **Photos partagées**, classées par `check-catalogue-premibel.js` :
  LÉGITIME (variantes d'un même produit), DOUTEUX (teintes éloignées ou noms
  commerciaux différents : avertissement), INCORRECT (motifs incompatibles ou
  essences différentes : erreur), PLACEHOLDER. Une référence « Rendu fidèle »
  ne peut pas partager sa photo (erreur).

Relevé du 05/10/2026 : 36 groupes, 111 SKU — 24 légitimes, 11 douteux,
0 incorrect, 1 placeholder (9 fiches) ; 3 photos à bandeau. 12 vignettes
écartées, 382 affichées.

### Catalogue public

Le tiroir du Studio ne liste que les fiches Premibel actives : 394 parquets, dont
211 en visualisation indicative. Les parquets de démonstration du moteur restent
chargés pour les cartes Inspiration et les anciens liens (`?parquet=chene-dore`),
mais n'y figurent plus ; ouverts par un lien, la sélection affiche
« Démonstration · parquet calculé par le moteur, pas une référence en vente ».
Les compteurs des pages (`NB_PREMIBEL`, `NB_PREMIBEL_VISU`) sont calculés dans
`_generator/catalogue.js` et vérifiés par `check-chiffres.js`.

### Contrôle

`_generator/check-catalogue-premibel.js` : enveloppe, identité, unicité des SKU,
slugs et identifiants source, adresses sûres et officielles, motifs connus, motif
par défaut compatible, statut valide et justifié, aucun prix, aucune photo en
texture, concordance avec ce que le moteur proposera, compteurs publics hors
démonstrations, produits de l'accueil (Premibel actifs, vignette locale) et repli
d'image réservé aux échecs réels (aucune source JPEG/PNG convertible en échec).

## Le principe

**Premibel est la source de vérité produit. Pose Parquet est consommateur.**

`data/products.premibel-pilot.json` était un fichier **temporaire**, tenu à la
main pour comprendre les problèmes sur 15 références ; il ne sert plus que
d'override (voir « Données manuelles »). Il ne doit pas devenir un
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
