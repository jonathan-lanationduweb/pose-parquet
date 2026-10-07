# Profils matière — « Rendu fidèle »

`ready` ne veut pas dire « ça ressemble ». Il veut dire : **une matière a été
construite pour cette référence, comparée à sa photo et validée.** Le moteur
reste procédural ; ce qui change, c'est que ses réglages sont calés sur UN
produit au lieu d'une famille partagée.

| Statut | Badge | Ce que c'est |
|---|---|---|
| `ready` | Rendu fidèle | profil matière validé pour la référence |
| `approximate` | Rendu indicatif | famille de rendu partagée (couleur, largeur) |
| `unavailable` | Visualisation non disponible | pas d'essai possible ; la fiche reste au catalogue |

## Où ça vit

- **`data/material-profiles.json`** — un profil par SKU, déclaré par le
  manifeste (`data/render-families.json`, champ `profils`). C'est le seul
  fichier à toucher pour ajouter une matière.
- **`js/scene/product.js`** — `validerProfilMatiere(profil, fiche)` décide ;
  `normalizeProduct` applique le profil validé au point d'entrée unique du
  catalogue. Studio, accueil et compteurs du générateur voient donc le même
  statut.
- **`js/scene/texture.js`** — le dessin. Les profils n'y ajoutent rien de
  spécial : ils règlent les paramètres que toutes les familles utilisent.
- **`_generator/check-matieres.js`** — le contrôle.

## Le validateur — ce qui fait un « ready »

Tout est vérifiable sans regarder d'image : le regard a eu lieu avant, il est
consigné dans le profil.

1. `verdict: "ready"` et une date de validation ;
2. **même produit** : `motif`, `largeurMm`, `longueurMm` identiques à la fiche
   normalisée. Si Premibel change une dimension, le profil cesse de valoir et
   la fiche redevient « Rendu indicatif » d'elle-même ;
3. **réglages connus et bornés** : exactement les clés de `TEXTURE_KEYS`, que
   le moteur lit toutes (le contrôle le vérifie dans le code) ; `surface`
   (`roughness`, `clearcoat`) lue par `createMaterial` ; `angleDeg` réservé au
   point de Hongrie ;
4. **référence** : la vignette locale de CETTE fiche, vérifiée propre au
   produit (empreinte perceptuelle comparée aux 394 vignettes : 191 paires de
   photos partagées existent dans le catalogue). Elle sert au regard, jamais
   au sol ;
5. **six contrôles visuels** validés — motif, largeur, couleur, variation,
   finition, comparaison — et `contradiction: false` ;
6. **ΔE CIE76 ≤ 8** entre la tuile et le sol de la photo de référence.

## Méthode de construction

1. Inventaire de la fiche (Store API, lecture seule) : attributs, galerie.
   Ne garder du champ « Qualité » que la classe (Rustique, Select…), jamais le
   texte promotionnel qui l'accompagne.
2. Photo pleine taille récupérée **pour le pilote seulement**, hors du site.
3. Zone de sol choisie à la main, mesurée : Lab moyen, σL.
4. Réglages de caractère relevés sur la photo (nœuds, gerces, variation,
   brillance, chanfrein), puis couleur calée automatiquement sur le Lab
   mesuré (base et veinage glissent ensemble, le dessin ne change pas).
5. Épreuve dans le Studio : séjour, une deuxième pièce, gros plan, photo à
   côté. Verdict sur teinte, grain, variation, largeur, motif, finition.
6. Refus consignés avec `raison` et `manque` : ils disent ce que le moteur
   devrait apprendre.

## Ce que le moteur a appris pour ce pilote

Trois enrichissements, **neutres pour les rendus indicatifs** : les 211 tuiles
existantes sont identiques au pixel près (banc A/B ancien/nouveau moteur, trois
motifs).

- **Longueur réelle** (`exactLength`, posé par `toMaterial` pour un profil
  validé). Lames : une lame de 1900 mm était dessinée à 1600 mm (arrondi à un
  diviseur de la tuile de 4,80 m) ; elle l'est maintenant à 1900 mm, chaque
  rangée refermée par une coupe. Bâton rompu : 90 × 600 était dessiné en
  90 × 634 ; le pavage n'exige pas de rapport entier longueur/largeur
  (recouvrement vérifié sans trou ni chevauchement), il l'est en 90 × 600.
- **Plusieurs nœuds par lame** : `knots` < 1 reste une probabilité (tirage
  historique à l'identique) ; au-delà, c'est un nombre moyen par lame.
- **`knotDepth`** (0 à 1) : cœur de nœud sombre et net, halo resserré. À 0, le
  nœud historique.

## Ce que le moteur ne sait pas faire (raisons de refus)

- **Angle du point de Hongrie** : non publié par Premibel et non mesurable sur
  une photo en perspective. Tant qu'il n'est pas confirmé, aucun point de
  Hongrie n'est « ready ». Le jour où il l'est : `angleDeg` dans le profil.
- **Gerces ouvertes** (choix Campagne) : tracées sur un demi-pixel.
- **Déviation du fil autour des nœuds**, figure large des chênes rustiques :
  les nœuds sont des disques posés sur un fil régulier.
- **Pores blanchis**, **sciage**, **patine / vieilli**.
- **Photo inexploitable ou partagée** entre références de teintes différentes.

## Ajouter une matière fidèle

1. Ajouter (ou compléter) l'entrée du SKU dans `data/material-profiles.json` ;
2. `node _generator/check-matieres.js` — le validateur dit ce qui manque ;
3. build : les compteurs, le tiroir, la légende de l'accueil suivent seuls.

Aucun fichier JS à modifier.
