# Audit du catalogue parquet Premibel

Relevé le **3 septembre 2026** sur `www.premibel.fr`, en **lecture seule**.
Aucune modification n'a été faite sur le site Premibel, et aucun import massif
n'a été lancé : 14 fiches ont été lues à la main pour comprendre les problèmes
avant de généraliser.

## Ce qu'on a en face

WooCommerce sur WordPress. Le catalogue annonce **402 résultats** sur
`/parquet/`, accessoires et sous-couches compris.

Le permalien d'un produit n'est pas stable dans sa forme : il porte la
catégorie principale, qui peut changer.

```
https://www.premibel.fr/parquet-flottant-chene-verni/CHENF36006/
https://www.premibel.fr/parquet-massif-chene-verni/POIN36015/
https://www.premibel.fr/accueil/DASSP3903/
```

`/accueil/<SKU>/` fonctionne pour toutes les fiches testées et semble être
l'entrée neutre. **Le SKU, lui, est stable** — c'est sur lui qu'il faut
s'appuyer, pas sur l'URL.

## Trois gisements de données, de qualité très inégale

### 1. JSON-LD — structuré, fiable

Chaque fiche expose un `<script type=application/ld+json>` contenant un
`Product` :

| champ | exemple | remarque |
| --- | --- | --- |
| `name` | `CHÊNE ARTEMIS 120X12` | casse incohérente d'une fiche à l'autre |
| `sku` / `mpn` | `CHENF36006` | identique, **stable** |
| `url` | `…/parquet-flottant-chene-verni/CHENF36006/` | dépend de la catégorie |
| `image` | `…/uploads/2026/07/CHENF36006.jpg` | **photo d'ambiance**, voir plus bas |
| `category` | liste plate, virgules | **c'est là qu'est le motif** |
| `offers.price` | `32.00` | non utilisé : pose-parquet.com n'est pas une boutique |
| `description` | texte + liste à puces | riche mais non structuré |

Les pages de catégorie exposent un `ItemList` de `Product` : de quoi énumérer
un rayon entier sans parcourir le HTML de chaque fiche.

### 2. Tableau de spécifications — structuré, riche, à unités explicites

Balisage `<tr><th scope=row>LABEL</th><td>VALEUR</td></tr>`. Vingt-et-un
champs sur les fiches testées :

| label | exemple | ce qu'on en fait |
| --- | --- | --- |
| `Essence` | Chêne | → `woodSpecies` |
| `Largeur` | **120mm** | → `dimensions.widthMm` |
| `Longueur` | **520mm** | → `dimensions.lengthMm` |
| `Longueur variable` | **455 à 910mm** | intervalle : moyenne retenue, bornes conservées |
| `Épaisseur` | **12mm** | → `dimensions.thicknessMm` |
| `Finition` | Verni / Huilé / Stratifié | → `finish` |
| `Aspect` | Brossé / Mat / « Brossé, Mat » | → `surfaceTreatment` |
| `Famille` | FLCHEN08 / MCHEN-08 / VERSAILL | code fabricant → `range` |
| `Chanfrein`, `Couche d'usure`, `Support`, `Pose`, `Nombre de frises`, `Qualité`, `Chauffage au sol`, `Colisage`, `Classement au feu`, `Formaldéhyde`, `ISO`, `Labels`, `Poids brut` | | non utilisés au rendu |

**Les valeurs portent leur unité.** C'est ce qui a permis de supprimer
l'heuristique « moins de 3, ce sont des mètres » : l'unité est lue, jamais
devinée.

### 3. Titre et description — texte, à ne pas parser

Le titre encode les dimensions (`120X12`, `92X12X520`, `193X7X1380mm`) mais
sans ordre garanti ni unité, et la description répète l'information en prose
(« Format 120 x 12 mm », « Finition vernie et brossée »). Utilisable comme
**contrôle croisé**, pas comme source.

## Le motif est une catégorie, et c'est une bonne nouvelle

Le motif de pose n'est pas un attribut mais une **catégorie WooCommerce** :

| catégorie | motif visualiseur |
| --- | --- |
| `Lames droites` | `lames` |
| `Point de Hongrie`, `Parquet Flottant Point de Hongrie`, `Point de Hongrie Massif` | `point-de-hongrie` |
| `Bâton rompu`, `Parquet Massif Bâton Rompu`, `Parquet Flottant Bâton Rompu` | `baton-rompu` |
| `Versailles`, `Parquet Flottant Versailles` | **non pris en charge** |

C'est une donnée fiable, et elle rend inutile toute extrapolation : on n'a
jamais besoin de supposer qu'un produit existe en point de Hongrie.

Cas réel à connaître : **`DAHRB6010_1` est catégorisé à la fois en « Bâton
rompu » et en « Lames droites »** — le même élément de 133 × 665 mm se pose des
deux façons. Deux motifs sont donc légitimes pour une seule référence, et c'est
la source qui le dit.

Le type de parquet vient aussi des catégories (`Parquet Massif`,
`Parquet Flottant` → contrecollé, `Parquet Sol Stratifié`), ainsi que des
tranches de largeur (`/90mm/`, `/90-120mm/`, `/120-160mm/`, `/160-200mm/`,
`/200mm/`) et des teintes (`/clair/`, `/naturel/`, `/brun/`, `/foncé/`,
`/blanc/`, `/brut/`, `/cuivre/`…).

## Absent, et c'est le point bloquant

**Aucune carte matière.** L'image principale d'une fiche est une **photo
d'ambiance** : une pièce meublée, en perspective, avec ses ombres portées et sa
lumière propre. Les quatorze images du panel pilote sont toutes de ce type.

Elle est parfaite pour une vignette de catalogue. Elle est **inutilisable comme
texture de sol** : la répéter produirait un sol qui répète des meubles et des
ombres. C'est la raison d'être de la séparation `visual.thumbnail` /
`visual.albedo` dans le schéma produit, et de `docs/premibel-material-capture.md`.

Absents également : `externalId` (l'ID WordPress n'est pas exposé dans le
JSON-LD) et toute galerie exploitable comme matière.

## Ambigu, à faire trancher par Premibel

| sujet | ce qu'on observe |
| --- | --- |
| **Teinte** | catégorisée sur certaines fiches (`Naturel`, `Clair`, `Foncé`), **absente sur d'autres** — `CHENF36006`, `CHENF36015`, `CHENF36014`, `POINF36005`, `POINF39026` n'ont aucune catégorie de teinte. Un nom commercial (« Colza », « Artemis », « Pivoine ») ne dit pas une teinte, et nous ne l'inventons pas : `tone` reste `null` et la famille de rendu est un **choix éditorial** de notre côté. |
| **`POIN36015`** | s'appelle « village **fumé** » mais sa catégorie de teinte dit `Naturel` et sa photo ne montre pas un bois fumé. Le nom et la donnée se contredisent. |
| **`Aspect` multiple** | « Brossé, Mat » : deux informations dans un champ. Recopiées telles quelles ; `finishProfile()` lit les mots-clés. |
| **`Finition` = « Stratifié »** | ce n'est pas une finition mais un type de produit. Le champ mélange deux natures d'information. |
| **`Famille`** | code fabricant (`FLCHEN08`) utilisé comme `range` faute de nom de gamme lisible. `FLCHEN08` couvre des produits très différents (lames droites, point de Hongrie, bâton rompu) : ce n'est pas une collection commerciale. |
| **Casse des titres** | `CHÊNE ARTEMIS 120X12` en capitales, `Point de hongrie campagne mat 90X14mm` en minuscules. Normalisée à la main dans le pilote. |

## Une donnée franchement fausse, et ce qu'elle prouve

`DASSP3903` — *Decoart chêne naturel été 193X7X1380mm* — déclare dans son
tableau :

```
Longueur : 1,38mm
```

Le nom du produit dit 1380 mm. Une lame de 1,38 mm n'existe pas.

Cette fiche est dans le pilote **avec la valeur fausse recopiée telle quelle**,
volontairement. Le validateur la rejette :

```
lengthMm rejetée, invraisemblable : 1 mm (attendu 200–3000)
```

L'ancienne heuristique « moins de 3, ce sont des mètres » aurait converti
1,38 → 1380 mm et donné le bon résultat **par accident**, en effaçant au
passage le fait que la donnée source est fausse. C'est exactement pourquoi
deviner une unité est interdit : ça marche jusqu'au jour où ça ne marche plus,
et alors personne ne le voit.

## Ce que le pilote démontre

- 14 références réelles lues, 13 utilisables, 1 écartée (dalle Versailles).
- Les dimensions de la fiche pilotent le rendu : 120 / 150 / 193 mm donnent
  38,7 / 31 / 24,1 lames en travers d'un sol de 4,65 m.
- Un point de Hongrie de 92 × 520 mm se rend en 92 × 520 mm, pas au 90 mm
  générique.
- Un produit en lames droites **refuse** de se rendre en point de Hongrie.
- Une dalle Versailles est écartée, pas transformée en pose droite.
- Toutes les références sont `approximate` : aucune n'a de matière réelle.
