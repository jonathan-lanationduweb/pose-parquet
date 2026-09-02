# IKEA Home Design / Kreativ — observation et écarts avec le Studio

*Relevé du 1er septembre 2026, sur `ikea.com/fr/fr/home-design/` puis dans le
planificateur lui-même (`/home-design/room/`), en 1440 × 900 et en 390 × 844.
Bannière de cookies refusée (« Continuer sans accepter »).*

Ce document sert de référence UX. **Rien de graphique n'est repris** : ni
couleurs, ni typographies, ni icônes, ni textes. Ce qui est étudié, c'est
l'organisation d'une session de conception.

## 1. La page d'entrée

- Un titre, une phrase, une vidéo de démonstration. Rien d'autre au-dessus de
  la ligne de flottaison.
- Puis **« Comment commencer »** avec exactement trois portes d'entrée, du plus
  rapide au plus personnel : *Démarrage rapide → Choisir une pièce*,
  *Personnalisable → Créez une pièce*, *Personnalisation maximale → Scannez
  votre pièce*.
- Ensuite deux galeries de **grandes photographies de pièces** (« Pièces
  vides », « Pièces meublées »), chaque carte portant un nom d'ambiance, une
  surface en m² et un seul bouton : « Aménager cette pièce ».

À retenir : on choisit une pièce **en la regardant**, pas en lisant une liste.

## 2. L'entrée dans l'application

Aucun onboarding, aucune explication, aucune fenêtre modale. On clique sur une
pièce, la pièce s'affiche, on peut travailler. L'interface se comprend parce
qu'elle ne montre presque rien.

## 3. La composition sur grand écran (1440 px)

| Zone | Largeur / hauteur | Part |
| --- | --- | --- |
| Barre supérieure | ~30 px de haut | négligeable |
| Panneau catalogue (gauche) | ~296 px | 20,5 % |
| Pièce | ~1 140 px | **79 %** |
| Barre d'outils | **flottante au-dessus de la pièce**, centrée en bas | 0 % de surface volée |
| Zoom | flottant, coin haut droit de la pièce | 0 % |

Le point important n'est pas le pourcentage : c'est que **rien de permanent ne
prend une bande à la pièce**. Les outils de vue flottent au-dessus d'elle. La
seule surface réellement soustraite est le catalogue.

Contenu de la barre supérieure, de gauche à droite : onglets *Ajouter /
Panier / Favoris*, puis « ‹ Projet sans titre », puis six petites icônes, le
total, et un bouton d'action principal. Tout tient sur une ligne très fine.

## 4. Le catalogue

- Champ de recherche.
- Sélecteur de pièce (« Salon ▾ »).
- **Puces de catégories** : « Canapés convertibles », « Canapés »,
  « Bibliothèques et étagères », « Toutes les catégories ▾ ».
- Grille de produits sur 3 colonnes : photo sur fond blanc, nom en capitales,
  description courte, prix, disponibilité.

La navigation entre familles se fait par puces, pas par menus déroulants
imbriqués. On voit toujours la grille.

## 5. Le geste central : un clic, ça change

Cliquer une carte **pose immédiatement le produit dans la pièce**. Pas de
bouton « Appliquer », pas de confirmation, pas d'étape intermédiaire. Le total
en haut se met à jour dans la foulée.

Au survol, la carte affiche un rond sombre avec un **+** et le libellé
« Ajouter à la pièce » : l'action est nommée sur la carte elle-même.

## 6. La sélection d'un objet

Cliquer un objet déjà posé produit trois choses simultanément :

1. un **contour jaune** épais sur l'objet — état actif impossible à manquer ;
2. une **barre contextuelle flottante juste au-dessus de l'objet** : pilule
   sombre, six actions en icône + micro-libellé (Ajouter au…, Pivoter,
   Remplacer, Compléter, Dupliquer, Supprimer) ;
3. le panneau de gauche **change de contexte** : il devient « Options du
   produit », avec une croix pour revenir au catalogue.

Le panneau n'affiche donc **jamais deux contextes à la fois**.

## 7. Les variantes

Dans « Options du produit », les déclinaisons (ici les housses) sont une
**grille dense de vraies photos**, six par ligne dans un panneau de 300 px,
l'active entourée d'un cadre. Un clic change la housse immédiatement.

Enseignement direct pour nous : pour des variantes d'une même surface, une
grille visuelle dense vaut mieux que des grandes cartes détaillées.

## 8. La quantité de texte

Quasi nulle pendant l'utilisation. Les libellés font un ou deux mots. Aucun
paragraphe explicatif nulle part dans l'outil. Les seules phrases sont des
avertissements légaux (« Le prix final peut différer »).

## 9. Mobile (390 px)

Observation honnête : **le planificateur web mobile d'IKEA est décevant**. À
l'ouverture, le catalogue occupe tout l'écran et la pièce n'est pas visible ;
il faut passer par « Revenir à la conception » pour la retrouver. La grille de
produits déborde horizontalement à cette largeur.

Nous n'avons donc **rien à copier ici** : garder la pièce visible en
permanence, comme le fait notre Studio, est un meilleur choix. En revanche,
l'application iOS/Android d'IKEA (non testable ici) est mise en avant par le
site pour l'usage mobile — signe qu'ils n'ont pas résolu le problème sur le web.

---

# Audit d'écart avec le Studio Pose Parquet

| | IKEA | Pose Parquet (avant) | Écart | Correction |
| --- | --- | --- | --- | --- |
| **A. Importance de la pièce** | 79 % de la largeur, rien de permanent par-dessus | 73 % de largeur, mais une barre d'actions pleine largeur lui prend une bande en bas | Modéré | Barre d'actions **flottante au-dessus de la pièce**, barre supérieure amincie |
| **B. Surface des contrôles** | 296 px de catalogue, outils flottants | 384 px de panneau + 72 px de barre | Réel | Panneau ramené à 22 rem max |
| **C. Changer de produit** | 1 clic, aucune confirmation | 1 clic, aucune confirmation | Aucun | — |
| **D. Présentation du catalogue** | Photo produit + nom + méta ; survol « + Ajouter à la pièce » | Échantillon + nom + méta, sans libellé d'action | Léger | Voile au survol « Poser ce parquet », état actif marqué d'une coche |
| **E. Nombre d'actions visibles** | ~6 en haut, 4 flottantes | 4 actions + 3 onglets + menu | Aucun | — |
| **F. Navigation entre catégories** | Puces qui rechargent la grille | Onglets Parquet / Motif / Orientation | Aucun | — |
| **G. Réglages secondaires** | Menus contextuels | Tiroir « Réglages avancés » et « Corriger le sol » | Aucun | — |
| **H. Comparaison** | Inexistante chez IKEA | Existe, mais noyée parmi quatre boutons | Spécifique | Zone « Mes variantes n/3 » identifiée, action d'ajout mise en avant |
| **I. Mobile** | Catalogue plein écran, pièce cachée | Pièce visible en haut, catalogue dessous | **À notre avantage** | Ajout d'un **défileur horizontal de matières** sous la pièce, pour essayer au pouce sans ouvrir le panneau |
| **J. Impression d'application** | Application franche | Application, mais un peu plus « encadrée » | Léger | Cumul des corrections ci-dessus |

## Ce qu'on retient, en une phrase

Chez IKEA, **la seule chose qui prend de la place, c'est le catalogue** ; tout
le reste flotte au-dessus de la pièce ou n'existe qu'au moment où l'on en a
besoin. C'est ce principe, et non l'apparence, que le Studio applique.
