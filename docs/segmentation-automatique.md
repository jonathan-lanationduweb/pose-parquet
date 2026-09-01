# Détection automatique du sol : étude et décision

*Rédigé pendant la phase de finition du visualiseur. À relire avant toute
implémentation : les ordres de grandeur cités doivent être remesurés au moment
où la décision sera reprise.*

## Le besoin

Aujourd'hui, l'utilisateur délimite lui-même le sol : quatre coins pour la
perspective, un contour à N points, un pinceau pour les finitions et les
occlusions. C'est fiable et instantané, mais cela demande une minute d'effort.
Une détection automatique ferait gagner cette minute — à condition d'être
juste. Une sélection approximative coûterait **plus** de temps qu'elle n'en
fait gagner, puisqu'il faudrait la corriger au pinceau.

## Ce qui est réellement possible dans un navigateur, sans serveur

Trois familles de solutions existent aujourd'hui, toutes exécutables côté
client, donc compatibles avec notre règle : *la photo ne quitte pas
l'appareil*.

### 1. Segmentation sémantique généraliste (ADE20K)

Des modèles entraînés sur le jeu de données ADE20K reconnaissent une classe
`floor` parmi environ 150 classes d'intérieur. C'est la piste la plus
directement pertinente.

- **Modèles candidats** : SegFormer-B0 (le plus petit de la famille),
  DeepLabV3 sur ossature MobileNet.
- **Exécution** : ONNX Runtime Web ou Transformers.js, en WebAssembly
  (compatible partout) ou WebGPU (plus rapide, support encore inégal selon
  navigateur et machine).
- **Poids à télécharger** : de l'ordre de la dizaine de mégaoctets pour un
  modèle quantifié — à confirmer sur le fichier exact retenu. C'est **un à
  deux ordres de grandeur au-dessus du poids actuel de tout le site**.
- **Sortie** : un masque basse résolution (typiquement quelques centaines de
  pixels de côté) qu'il faut ensuite ré-échantillonner ; les bords sont mous,
  exactement là où la précision compte (plinthes, pieds de meubles).

### 2. Segmentation générique par points (SAM et dérivés)

Les variantes allégées de Segment Anything (MobileSAM, EdgeSAM) segmentent une
région à partir d'un clic. La qualité de contour est bien meilleure, mais :

- il faut toujours un clic de l'utilisateur, donc ce n'est pas « automatique » ;
- le modèle ne sait pas ce qu'est un sol : il segmente la région cliquée, ce
  qui donne souvent *une* zone de sol homogène, pas l'ensemble du sol visible ;
- le poids et le temps de chargement restent du même ordre que ci-dessus.

### 3. Heuristiques sans modèle

Détection de lignes de fuite, croissance de région depuis le bas de l'image,
segmentation par couleur. Ces méthodes sont légères mais échouent dès qu'un
tapis, une ombre portée ou un meuble clair traverse la zone — c'est-à-dire
dans la majorité des photos réelles. **Une heuristique de ce type présentée
comme une « détection automatique » serait trompeuse.**

## Ce que cela coûterait

| Poste | Situation actuelle | Avec un modèle embarqué |
| --- | --- | --- |
| Poids chargé pour utiliser l'outil | quelques dizaines de Ko de JavaScript | plus le poids du modèle (ordre de la dizaine de Mo) |
| Premier rendu | immédiat | après téléchargement puis initialisation du moteur |
| Comportement hors ligne / réseau lent | inchangé | dégradé, il faut un repli manuel |
| Dépendances | aucune | une bibliothèque d'inférence et son binaire WASM |

## Décision : ne pas l'embarquer dans cette version

Trois raisons, dans cet ordre.

1. **Le gain n'est pas garanti.** Sur une photo d'intérieur ordinaire, le
   masque obtenu demanderait de toute façon une retouche au pinceau. On
   remplacerait une minute de tracé par une minute de correction, plus un
   temps d'attente.
2. **Le coût est certain.** Le site entier tient aujourd'hui dans un poids très
   inférieur à celui d'un seul modèle. Charger celui-ci pour tout le monde
   contredit la sobriété qui fait la qualité de l'outil.
3. **Annoncer une reconnaissance automatique qui se trompe une fois sur trois
   ferait plus de mal que de bien.** Aucune fonctionnalité « IA » ne sera
   affichée tant qu'elle ne sera pas réellement fiable.

## Ce qui est prêt pour le jour où la réponse changera

Le point d'extension existe déjà et n'attend qu'un détecteur :

```js
import { registerDetector, detectFloor } from './js/visualizer/floor-mask.js';

registerDetector('auto', async ({ canvas }) => {
  // renvoyer un polygone en coordonnées normalisées (0 → 1)
});

const zone = await detectFloor('auto', { canvas });
```

`detectFloor` retombe sur la stratégie manuelle si la stratégie demandée n'est
pas enregistrée : brancher un modèle ne casse donc rien.

### Conditions à réunir avant de l'activer

- chargement **à la demande** seulement, derrière un bouton explicite
  (« Essayer la détection automatique »), jamais au chargement de la page ;
- annonce honnête : proposition à vérifier, pas résultat définitif ;
- repli manuel toujours accessible, sans rechargement ;
- mesures réelles à produire avant décision : poids transféré, délai jusqu'au
  premier masque sur une machine modeste, et taux de sélections exploitables
  sans retouche sur un échantillon de photos représentatives.
