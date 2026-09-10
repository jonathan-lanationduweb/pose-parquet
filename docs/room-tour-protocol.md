# Visiter une pièce — ce qu'il faut photographier

`js/product/tour.js` · `data/room-tours.json`

## Où nous en sommes

Le visualiseur produit permet de zoomer, déplacer, ajuster et passer en plein
écran. C'est l'exploration d'une **photographie** : le point de vue ne change
pas, parce qu'une seule photo ne contient qu'un seul point de vue. Se déplacer
réellement dans la pièce demande des images que nous n'avons pas.

**Audit des scènes calibrées, fait avant d'écrire une ligne de visite :**

| | |
| --- | --- |
| scènes calibrées | 16 |
| images distinctes | 16 |
| séries multi-angle d'une même pièce | 0 |

Cinq photographes, seize lieux différents. Deux scènes partagent parfois un
auteur — `entree-cadree` et `salon-angle` viennent visiblement du même
appartement — mais ce sont deux **pièces** distinctes, sans recouvrement, et
non deux positions dans une même pièce. Les coudre ensemble donnerait « j'ai
changé d'image », jamais « je me suis déplacé ». Aucune visite n'est donc
proposée, et le manifeste est vide.

Ce qui existe déjà, en revanche, c'est le **contrat de données** et sa
validation : le jour où les photos arrivent, il n'y a plus qu'à les décrire.

## Le contrat

```json
{
  "schema": "pose-parquet/room-tours@1",
  "tours": [
    {
      "id": "sejour-maison-a",
      "label": "Séjour",
      "room": "maison-a/sejour",
      "viewpoints": [
        {
          "id": "vp-entree",
          "sceneId": "sejour-vp-entree",
          "room": "maison-a/sejour",
          "label": "Depuis l'entrée",
          "position": { "x": 0.18, "y": 0.88 },
          "heading": 20,
          "connections": [
            { "to": "vp-fenetre", "at": { "x": 0.62, "y": 0.74 }, "label": "Vers la fenêtre" }
          ]
        }
      ]
    }
  ]
}
```

`room` est le lieu réellement photographié. Chaque point de vue le redéclare, et
une visite dont deux points de vue ne portent pas le même `room` est **refusée**.
C'est la garde qui rend une fausse visite impossible par construction. Sont
refusés de la même façon : une visite d'un seul point de vue, une `sceneId` qui
n'est pas une scène calibrée, une liaison vers un point de vue inconnu, une
liaison à sens unique, une scène revendiquée par deux visites, un `position` ou
un `at` hors de l'image. Ces six refus sont couverts par les contrôles.

`position` situe l'appareil dans la pièce et `at` place l'indicateur de
déplacement sur l'image, tous deux en coordonnées normalisées de 0 à 1.

## Protocole de prise de vue

Pour rendre une pièce visitable :

1. **Quatre à six positions** dans la même pièce, jamais ailleurs. Une pièce
   moyenne se lit bien avec quatre ; au-delà de six, l'utilisateur se perd.
2. **Recouvrement d'un tiers au moins** entre deux positions reliées. C'est ce
   recouvrement qui fait la sensation de déplacement : sans repère commun, le
   passage est un saut.
3. **Le sol visible sur chaque vue**, et le même sol partout : c'est lui que le
   moteur habille.
4. **Hauteur d'appareil constante**, environ 1,50 m, et pas de bascule. Un
   changement de hauteur entre deux vues se lit comme un changement de pièce.
5. **Lumière identique** : même heure, même éclairage artificiel, même balance
   des blancs. Le moteur reporte l'éclairement de la photo ; deux ambiances
   différentes donnent deux parquets différents.
6. **Focale constante**, autour de 24 à 28 mm en équivalent 35 mm. Pas de
   fisheye : la calibration de perspective ne le rattrape pas.
7. **Pièce vide de préférence.** Un meuble au sol devient une occlusion à
   décrire scène par scène.

Pour chaque photo, il faut ensuite ce que toute scène du site possède déjà :
une `SceneData` calibrée — horizon, points de fuite, plan du sol en mètres,
masque du sol, occlusions, ambiance lumineuse. Le studio de calibrage existant
produit ce fichier. Puis, dans le manifeste : la position de l'appareil, le cap,
et les liaisons réciproques vers les vues voisines.

Aucune reconstruction 3D n'est nécessaire pour cette première version.

## Ce qui reste à construire, le jour où les photos existent

Rien de tout cela n'est écrit aujourd'hui, faute de pouvoir l'éprouver sur de
vraies images :

- l'indicateur de déplacement, qui n'apparaît qu'à l'approche du curseur d'une
  zone navigable — un petit repère au sol, pas un panneau ;
- la transition, 250 à 450 ms, fondu directionnel léger, sans flash ;
- la séparation franche du double clic, qui doit rester le zoom et ne jamais
  déclencher un déplacement par accident ;
- le recadrage : à l'arrivée, la nouvelle vue reprend un cadrage couvrant
  centré, jamais le `x`/`y` de la vue précédente ;
- le préchargement des seules vues voisines, que `aPrecharger()` désigne déjà.

Ce qui, en revanche, est déjà décidé :

- **le parquet ne change pas en se déplaçant.** Le produit choisi, son motif,
  sa largeur et l'orientation vivent dans `state`, indépendamment de la scène :
  changer de point de vue appelle `renderer.setScene()` puis repeint le même
  `state.product`. C'est déjà ce que fait `openRoom()`.
- **avant/après suit le point de vue.** Le comparatif oppose la photo d'origine
  de la vue courante à son propre rendu ; il n'a rien à transporter.
- **la comparaison A/B se ferme en se déplaçant.** C'est le choix retenu :
  garder deux rendus vivants à travers un changement de scène demande de
  garantir que B est disponible sur la vue d'arrivée, ce qui multiplie les états
  d'attente pour un gain douteux. Se déplacer est un geste sur la pièce ;
  comparer est un geste sur le produit. On ne les empile pas.

## Les trois niveaux d'immersion

**Niveau 1 — multi-vues photographiques.** Ce que décrit ce document. Plusieurs
points de vue réels, liés entre eux. Coût : une séance photo par pièce et une
calibration par vue. Rien d'inventé.

**Niveau 2 — panorama 360.** Une seule position mais une rotation continue.
Demande un appareil 360 ou un assemblage, et une calibration du sol en
projection équirectangulaire : le moteur actuel travaille en perspective plane
et ne sait pas encore poser un parquet là-dessus.

**Niveau 3 — reconstruction volumétrique** (photogrammétrie, NeRF, Gaussian
Splatting). Déplacement libre. Demande des dizaines de vues par pièce, une
chaîne de traitement lourde et un moteur de rendu différent.

Aucun niveau 3 n'est engagé. Et tant qu'aucune photo supplémentaire n'existe,
le niveau 1 lui-même reste un contrat de données, pas une fonction.
