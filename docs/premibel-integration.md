# Brancher le catalogue parquet de Premibel sur le visualiseur

> Rien n'est connecté à Premibel à ce jour. Ce document décrit ce qu'il faudra
> récupérer, sous quelle forme, et ce qui est déjà prêt à le recevoir.

## Les quatre couches, et pourquoi les séparer

| | couche | où | ce qu'elle décrit |
| --- | --- | --- | --- |
| A | **scène** | `data/scenes/`, `js/scene/schema.js` | la pièce : plan de perspective, contour du sol, occlusions, éclairement |
| B | **motif de pose** | `data/parquets.json` → `patterns` | lames droites, point de Hongrie, bâton rompu |
| C | **produit** | `js/scene/product.js` | la référence vendue : essence, gamme, teinte, finition, dimensions, motifs autorisés |
| D | **rendu matière** | `data/render-families.json`, `js/scene/texture.js` | ce qui dessine la surface |

Un export Premibel fournit **C**. Il ne fournira jamais **D** : personne ne
saisit un `grainAlpha` dans un ERP. C'est le rôle de la **famille de rendu** —
le produit dit à quelle famille visuelle il appartient, la famille porte le
dessin.

## Deux règles qui ne se négocient pas

**Une photo de fiche produit n'est pas une texture de sol.** L'image principale
d'une fiche WooCommerce est cadrée pour une vignette : perspective, ombre
portée, fond, recadrage. La répéter sur 30 m² donne une surface qui répète ses
propres ombres. D'où la séparation dans `visual` :

| champ | usage | contrainte |
| --- | --- | --- |
| `thumbnail` | vignette de catalogue | aucune |
| `sample` | photo d'échantillon, fiche produit | aucune |
| `albedo` | **rendu du sol** | raccordable, à plat, sans ombre ni perspective |
| `normal` | rendu du sol, facultatif | même cadrage que l'albedo |
| `roughness` | rendu du sol, facultatif | même cadrage que l'albedo |
| `plankVariants` | rendu du sol, facultatif | plusieurs lames, pour casser la répétition |

**Les motifs autorisés ne s'inventent pas.** Un produit n'existe pas en point de
Hongrie parce que le moteur sait le dessiner : il existe en point de Hongrie
parce que le fabricant le débite. Faute d'information, `normalizeProduct()` ne
propose **que la pose droite** et l'inscrit dans `warnings`. `material-review.html`
refuse de dessiner un motif que la référence ne déclare pas.

## Tableau de correspondance

| Champ visualiseur | Source Premibel envisagée | Obligatoire | Fallback | Transformation |
| --- | --- | --- | --- | --- |
| `id` | identifiant stable choisi côté visualiseur (souvent le SKU) | **oui** | fiche écartée | aucune |
| `externalId` | ID produit WordPress (`post_id`) | non | `null` | aucune |
| `sku` | référence produit | non | `null` | aucune |
| `name` | titre du produit | **oui** | `id` | aucune |
| `slug` | slug WP | non | dérivé du nom | accents retirés, minuscules, tirets |
| `woodSpecies` | attribut « essence » | non | `null` | aucune |
| `range` | catégorie / collection | non | `null` | aucune |
| `tone` | attribut « teinte » | non | `null` | sert au rapprochement de famille |
| `finish` | attribut « finition » | non | `null` | mot-clé → rugosité et brillance (voir plus bas) |
| `parquetType` | attribut « type » (massif / contrecollé / stratifié) | non | `null` | aucune |
| `dimensions.widthMm` | attribut « largeur » | **oui** | fiche écartée | **valeur < 3 tenue pour des mètres** ; arrondi au mm |
| `dimensions.lengthMm` | attribut « longueur » | non | dérivée (9 × largeur) | idem |
| `dimensions.thicknessMm` | attribut « épaisseur » | non | `null` | idem ; non utilisée au rendu à ce jour |
| `compatiblePatterns` | attribut « poses possibles », ou règle explicite par gamme | non | **`['lames']` seule** | chaîne découpée sur `,;\|` ; motif inconnu du moteur écarté |
| `defaultPattern` | choix éditorial | non | premier motif autorisé | vérifié appartenir aux motifs autorisés |
| `visual.familyId` | table de correspondance à établir | non | rapprochement automatique | voir « comment une fiche trouve son apparence » |
| `visual.thumbnail` | image principale WP | non | `null` | **jamais utilisée au rendu** |
| `visual.sample` | photo d'échantillon | non | `null` | **jamais utilisée au rendu** |
| `visual.albedo` | carte préparée pour le sol | non | famille de rendu | doit être raccordable et sans ombre |
| `displayOrder` | ordre de la catégorie | non | `0` | tri croissant |
| `active` | statut de publication | non | `true` | `false` = hors catalogue |
| `visualStatus` | *calculé* | — | — | `ready` si `albedo`, sinon `approximate`, sinon `unavailable` |

## Trois formes d'entrée acceptées

`normalizeProduct()` accepte indifféremment la source historique
(`data/parquets.json` : `name`, `wood`, `tone`, `boardWidth`…), la forme
canonique, et un `snake_case` d'export d'ERP (`largeur_lame`,
`motifs_autorises`, `famille_rendu`, `ordre_affichage`, `reference`…).

Deux conversions valent d'être connues :

- **millimètres.** L'unité canonique est le millimètre — celle des fiches
  techniques. Une valeur inférieure à 3 est tenue pour des mètres. Sans cette
  règle, un `180` pris tel quel donnait des lames de 180 m : invisible dans les
  données, crevant les yeux à l'écran.
- **motifs en chaîne.** `"lames, point-de-hongrie"` est découpé, et tout motif
  que le moteur ne sait pas poser est écarté, jamais deviné.

## Dimensions réelles

Le rendu utilise la **largeur réelle de la référence**, pas un réglage
décoratif : 190 mm déclarés donnent des lames de 190 mm au sol, et le comptage
de lames en travers de la pièce doit le confirmer. La conversion mm → m se fait
en un seul endroit, `toMaterial()`, et nulle part ailleurs.

`patternProfiles` permet à une référence de déclarer des dimensions
**différentes selon la pose** : un point de Hongrie ne se pose pas avec des
lames de 22 cm. À défaut, elles sont dérivées.

## Finitions

`finishProfile()` (`js/scene/material.js`) lit le libellé et en tire la
rugosité et la brillance :

| libellé contient | profil | rugosité | brillance |
| --- | --- | --- | --- |
| `brut`, `brossé` | brut | 0,95 | 0,00 |
| `huilé` | huilé | 0,82 | 0,04 |
| `vernis` + `mat`, ou défaut | mat | 0,74 | 0,08 |
| `ciré` | ciré | 0,60 | 0,16 |
| `satiné` | satiné | 0,50 | 0,22 |
| `vernis` seul | vernis | 0,34 | 0,38 |

Les écarts restent volontairement modestes : un sol de pièce d'habitation ne
réfléchit pas comme un miroir. Une finition non reconnue retombe sur « mat » et
c'est signalé dans le rapport de validation. Un `finishKind` explicite dans la
fiche court-circuite la devinette.

## Couleur du produit

Quand une vraie matière Premibel sera disponible, **sa couleur est la
référence**. Le moteur adapte l'exposition et la teinte de la lumière de la
pièce ; il ne doit pas transformer l'identité du produit pour la faire entrer
dans une catégorie « Miel » ou « Fumé ». Les catégories servent au classement et
au rapprochement de famille, pas à recolorer.

## Comment une fiche trouve son apparence

`resolveFamily()` essaie dans cet ordre et **trace la raison** dans
`visual.familyReason` :

1. la famille déclarée ;
2. une famille homonyme du produit — le cas des douze références actuelles ;
3. essence + teinte ;
4. teinte seule ;
5. à défaut, la famille dont la luminance est la plus proche de celle attendue
   pour le mot de teinte.

L'étape 5 garantit qu'une référence inconnue reçoive **toujours** une apparence
plausible plutôt qu'aucune. C'est un rapprochement, pas une vérité : une gamme
qui compte visuellement doit déclarer sa famille.

## Niveau de fidélité

| statut | ce que ça veut dire | conséquence |
| --- | --- | --- |
| `ready` | vraies cartes matière, préparées pour le sol | affichable sans réserve |
| `approximate` | une famille de démonstration en tient lieu | **ne représente pas fidèlement la référence** |
| `unavailable` | ni carte ni famille | écarté du visualiseur au chargement |

Les douze références actuelles sont toutes `approximate` : aucune n'a de carte
photographique. Ce que l'interface en fera — les masquer, ou afficher « aperçu
indicatif » — se décidera plus tard. La donnée existe dès maintenant, et
`material-review.html` l'affiche pour chaque produit.

## Comparaison de produits

`material-review.html` rend chaque produit dans la **même** scène, sous la
**même** lumière, avec la **même** perspective et le **même** motif, en trois
cadrages (gros plan, pièce entière, fond de pièce). Ce qui diffère d'une ligne à
l'autre est donc le produit et rien d'autre — c'est la condition pour comparer
deux références honnêtement.

## Validation du catalogue

`validateCatalog()` rend un rapport à deux niveaux :

- **bloquant** — identifiant absent ou en doublon, libellé absent, largeur
  absente ou invraisemblable (hors 40–400 mm), longueur inférieure à la
  largeur, ni famille ni carte, famille inconnue, motif inconnu, motif par
  défaut hors des motifs autorisés, statut visuel inconnu ;
- **signalement** — SKU, identifiant source, gamme, finition, type, épaisseur,
  vignette absents ; rendu approché.

Un produit invalide **ne casse pas le visualiseur** : il est écarté au
chargement (`rejected`) et il apparaît dans le rapport. État actuel : 12 fiches,
0 bloquant, 84 signalements.

## Le branchement, le jour venu

```bash
cp export-premibel.json data/products.json
# puis, dans data/render-families.json :  "catalogue": "data/products.json"
```

La source est déclarée, pas devinée — sonder l'existence du fichier laissait un
404 dans la console de toutes les pages. Ni l'interface, ni le moteur, ni les
scènes ne changent.

`data/products.premibel-exemple.json` montre la forme attendue, avec
volontairement une fiche incomplète et une référence retirée.

## Liens profonds pendant la transition

Les cartes Inspiration passent aujourd'hui `parquet=chene-fume`. Demain elles
passeront un identifiant réel. `app.js` valide le paramètre contre le catalogue
chargé et ignore une valeur inconnue : **les deux formes cohabitent sans
travail supplémentaire**, aussi longtemps que les identifiants actuels restent
présents. Le jour où ils disparaissent, il faudra décider si un lien vers une
référence retirée dégrade silencieusement ou avertit.

## Ce qui reste à décider avec Premibel

- [ ] **Nomenclature des teintes.** Les familles actuelles sont classées par
      `tone` (`clair`, `naturel`, `chaud`, `fonce`). Si Premibel emploie
      d'autres mots, soit on les mappe, soit chaque fiche déclare sa famille.
- [ ] **Qui déclare les motifs disponibles**, et pour quelles gammes. Sans cette
      information, tout le catalogue sera proposé en pose droite seule.
- [ ] **Cartes matière** pour les références phares : une photo de lame à plat,
      raccordable, sans ombre. C'est ce qui fait passer un produit de
      `approximate` à `ready`.
- [ ] **Identifiants.** `id` doit être stable et ne jamais être réutilisé : il
      circule dans les liens profonds et dans les demandes de devis.
- [ ] **Références retirées.** Elles sont écartées de l'affichage ; le
      comportement d'un lien profond vers l'une d'elles reste à définir.
- [ ] **Épaisseur** : collectée, pas encore utilisée au rendu. Elle pourrait
      nourrir la hauteur du chanfrein.

## Ce qui n'est pas fait

Aucune API n'est appelée, aucun réseau n'est ajouté. La couche produit est en
service — les douze références la traversent à chaque chargement — mais elle lit
un fichier. Brancher un service distant demandera un chargeur de plus dans
`loadProducts()`, sur le modèle de la stratégie `remote` prévue dans
`js/scene/analyzer.js` pour les scènes.
