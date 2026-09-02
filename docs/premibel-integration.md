# Brancher le catalogue parquet de Premibel sur le visualiseur

## Les quatre couches, et pourquoi les séparer

Le visualiseur manipule quatre choses distinctes. Les confondre est exactement
ce qui empêchait d'y brancher un vrai catalogue.

| | couche | où | ce qu'elle décrit |
| --- | --- | --- | --- |
| A | **scène** | `data/scenes/`, `js/scene/schema.js` | la pièce : géométrie du sol, contour, occlusions, éclairement |
| B | **motif de pose** | `data/parquets.json` → `patterns` | lames droites, point de Hongrie, bâton rompu |
| C | **produit** | `js/scene/product.js` | la référence vendue : essence, gamme, teinte, finition, dimensions, motifs autorisés |
| D | **rendu matière** | `data/render-families.json`, `js/scene/texture.js` | les paramètres visuels qui dessinent la tuile |

Un export Premibel fournira **C**. Il ne fournira jamais **D** : personne ne
saisit un `grainAlpha` dans un ERP. C'est le rôle de la **famille de rendu** —
le produit dit à quelle famille visuelle il appartient, la famille porte le
dessin. Sans cette charnière, chaque nouvelle référence obligeait à écrire un
bloc de texture à la main.

## La fiche canonique

`js/scene/product.js` ramène toute fiche à cette forme (`CHAMPS_PRODUIT`) :

| champ | type | note |
| --- | --- | --- |
| `id` | texte | identifiant **stable**, jamais réutilisé |
| `nom` | texte | libellé commercial affiché |
| `essence` | texte | chêne, frêne, noyer… |
| `gamme` | texte | ligne de produits |
| `teinte` | texte | clair / naturel / miel / foncé… |
| `finition` | texte | huilé mat, vernis satiné, brossé… |
| `largeurLame` | nombre | **en mètres** |
| `longueurLame` | nombre | en mètres, `null` si variable |
| `typeParquet` | texte | massif, contrecollé, stratifié |
| `motifsAutorises` | tableau | filtré sur ce que le moteur sait poser |
| `motifParDefaut` | texte | proposé à l'ouverture |
| `familleRendu` | texte | clé dans `data/render-families.json` |
| `ordreAffichage` | nombre | tri croissant du catalogue |
| `actif` | booléen | `false` = masqué du catalogue public |

`null` veut dire « non renseigné », jamais « zéro » : une largeur absente doit
se voir, pas se confondre avec une lame de 0 mm.

## Trois formes d'entrée acceptées

`normaliserProduit()` accepte indifféremment :

1. la forme historique de `data/parquets.json` (`name`, `wood`, `tone`,
   `boardWidth`, `texture`…) — **rien à migrer, c'est la source actuelle** ;
2. la forme canonique ci-dessus ;
3. une forme `snake_case` d'export d'ERP : `largeur_lame`,
   `motifs_autorises`, `famille_rendu`, `ordre_affichage`, `reference`…

Deux conversions valent d'être connues :

- **millimètres → mètres.** Un ERP écrit volontiers `180` et non `0,18`. Au
  delà de 3, la valeur est tenue pour des millimètres. Sans cela on obtenait
  des lames de 180 m — invisible dans les données, crevant les yeux à l'écran.
- **motifs en chaîne.** `"lames, point-de-hongrie"` est découpé, et tout motif
  que le moteur ne sait pas poser est **écarté, jamais deviné**.

## Comment une fiche trouve son apparence

`resoudreFamille()` essaie dans cet ordre, et **trace la raison retenue** dans
`familleRaison` :

1. la famille déclarée (`famille_rendu`) ;
2. une famille homonyme du produit — le cas des douze références actuelles ;
3. essence + teinte ;
4. teinte seule ;
5. à défaut, la famille dont la luminance est la plus proche de celle attendue
   pour le mot de teinte.

L'étape 5 garantit qu'une référence inconnue reçoive **toujours** une
apparence plausible plutôt qu'aucune. C'est un rapprochement, pas une vérité :
une gamme qui compte visuellement doit déclarer sa famille.

## Le branchement, le jour venu

```bash
# 1. produire l'export au format attendu
#    (voir data/products.premibel-exemple.json pour un modèle commenté)
cp export-premibel.json data/products.json
```

C'est tout. `chargerProduits()` donne la priorité à `data/products.json` s'il
existe et retombe sur `data/parquets.json` sinon. Ni l'interface, ni le moteur
de rendu, ni les scènes ne changent : le catalogue, la recherche, les filtres
et les vignettes fonctionnent déjà sur un nombre quelconque de références.

Une fiche incomplète n'interrompt pas la page — un catalogue de production en
comporte toujours quelques-unes. Elle est signalée dans la console avec la
liste de ce qui manque (`[catalogue] fiches incomplètes : …`), et c'est là
qu'on verra les trous d'un export réel.

## Ce qui reste à décider avec Premibel

- [ ] **Nomenclature des teintes.** Les familles actuelles sont classées par
      `tone` (`clair`, `naturel`, `chaud`, `fonce`). Si Premibel emploie
      d'autres mots, soit on les mappe, soit chaque fiche déclare sa famille.
- [ ] **Photos de produit.** `material.maps` réserve déjà la place de vraies
      cartes (albedo / normal / rugosité). Une photo de lame bien cadrée
      remplacerait le dessin procédural pour les références phares ; le moteur
      les accepte, elles ne sont simplement pas fournies.
- [ ] **Largeurs réelles par motif.** `profilsMotifs` permet à une référence de
      déclarer des dimensions différentes selon la pose. À défaut, elles sont
      dérivées ; un point de Hongrie posé avec des lames de 22 cm n'est pas un
      point de Hongrie.
- [ ] **Identifiants.** `id` doit être l'identifiant Premibel, pas un slug
      recalculé : c'est lui qui circulera dans les liens profonds
      (`?parquet=…`) et dans les demandes de devis.
- [ ] **Références inactives.** Elles sont filtrées à l'affichage, mais un lien
      profond vers une référence retirée doit dégrader proprement — à traiter
      quand le catalogue bougera vraiment.

## Ce qui n'est pas fait

Aucune API n'est appelée, aucun réseau n'est ajouté. La couche produit est en
service — les douze références actuelles la traversent à chaque chargement —
mais elle lit un fichier. Brancher un service distant demandera un chargeur de
plus dans `chargerProduits()`, sur le modèle de la stratégie `remote` prévue
dans `js/scene/analyzer.js` pour les scènes.
