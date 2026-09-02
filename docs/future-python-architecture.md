# Architecture Python d'analyse — prévue, pas écrite

**Aucune ligne de Python n'existe dans ce dépôt et il ne faut pas en ajouter
maintenant.** Ce document sert à s'assurer que le front, tel qu'il est écrit
aujourd'hui, n'aura rien à renier le jour où ce service existera.

Il complète [future-ai-api-contract.md](future-ai-api-contract.md), qui fixe le
format d'échange. Ici on parle du dedans.

---

## Le pipeline visé

```
photo
  │
  ├─► segmentation ───────► masque du sol, régions distinctes
  │
  ├─► profondeur ─────────► carte métrique relative
  │
  ├─► détection d'objets ─► meubles, tapis, plinthes, portes
  │
  └─► géométrie ──────────► horizon, points de fuite, plans, échelle
                              │
                              ▼
                          SceneData  ──►  Visualiseur (JS/WebGL)
```

Chaque étage est indépendant et dégradable : sans profondeur, le rendu perd la
netteté variable ; sans détection d'objets, l'utilisateur retouche au pinceau ;
sans géométrie, on retombe sur le quadrilatère manuel. **Rien n'est bloquant.**

---

## Découpage envisagé

```
analyse/                        (dépôt séparé, ou sous-dossier isolé)
  pyproject.toml
  api/
    main.py                     FastAPI : /analyze-room, /health
    schema.py                   modèles Pydantic ← miroir du contrat JSON
    limits.py                   taille, quotas, délais
  segmentation/
    floor.py                    masque du sol
    regions.py                  découpage en zones distinctes
  depth/
    estimate.py                 carte de profondeur
    scale.py                    calage métrique approché
  geometry/
    horizon.py                  horizon et points de fuite
    planes.py                   plans de sol → quadrilatères
    fit.py                      ajustement au masque
  occlusion/
    objects.py                  meubles et tapis
    contact.py                  lignes de contact au sol
  encode/
    maps.py                     cartes PNG, réduction, base64
    scene.py                    assemblage de la SceneData
  tests/
    fixtures/                   les mêmes photos que data/scenes/
```

### Le test qui compte

Les quatre pièces calibrées à la main dans `data/scenes/` sont la **vérité
terrain**. Le jour où le service tourne, la mesure n'est pas « le modèle
segmente-t-il bien » mais :

> l'IoU entre le masque produit et le masque calibré à la main dépasse-t-il
> 0,92, et le quadrilatère de plan est-il à moins de 2 % de celui calibré ?

C'est un critère mesurable, écrit avant le code. Les fixtures existent déjà.

---

## Choix de modèles — à trancher plus tard

Rien n'est arrêté. Les candidats, avec ce qui les recommande et ce qui les
disqualifie :

| étage         | candidats                                    | à vérifier                                        |
| ------------- | -------------------------------------------- | ------------------------------------------------- |
| segmentation  | SAM 2 (invite = point bas de l'image), modèles de segmentation sémantique d'intérieur (ADE20K : classes `floor`, `rug`, `carpet`) | licence, poids, temps CPU acceptable |
| profondeur    | modèles de profondeur monoculaire relative   | échelle métrique absente → calage à faire         |
| objets        | détection/segmentation d'instances généraliste | classes mobilier réellement utiles              |
| géométrie     | pas de modèle : moindres carrés sur les droites du masque + horizon | souvent suffisant, très rapide |

La géométrie mérite d'être tentée **sans réseau de neurones** : le contour du
sol, une fois segmenté proprement, contient déjà les droites mur/sol dont on
déduit l'horizon et les points de fuite. Un solveur de 200 lignes peut suffire.

---

## Contraintes non négociables

**Confidentialité.** Aujourd'hui la photo ne quitte jamais le navigateur, et
c'est écrit dans l'interface. Un service distant change cela. Donc, quand il
arrivera :

- l'envoi est un **choix explicite**, jamais le comportement par défaut ;
- aucune conservation : la photo est traitée en mémoire et jetée ;
- le mode local reste accessible en un clic ;
- la phrase affichée à l'utilisateur devra être réécrite en conséquence.

**Alternative sérieuse à étudier avant tout serveur :** exécuter la
segmentation **dans le navigateur** (ONNX Runtime Web, WebGPU, modèle quantifié
de quelques dizaines de Mo). Plus lent au premier chargement, mais la photo ne
bouge pas, il n'y a pas de serveur à payer ni à sécuriser, et la promesse
actuelle du site reste vraie. Le contrat JSON est identique : seul l'analyseur
enregistré change.

**Dégradation.** Panne, quota, timeout, 422 : le Visualiseur continue de
fonctionner en manuel. Le service est une accélération, pas une dépendance.

**Pas de vocabulaire d'IA sans IA.** Tant que ce dossier n'existe pas,
l'interface ne dit ni « analyse », ni « détection », ni « intelligence
artificielle ». Les pièces d'exemple sont **précalibrées**, la photo importée
est **délimitée par l'utilisateur**. C'est exact, et ça reste vrai.

---

## Ordre de travail suggéré, le jour venu

1. `api/schema.py` — traduire le contrat en Pydantic, sans aucun modèle. Un
   `/analyze-room` qui renvoie une scène codée en dur suffit à valider le
   branchement front de bout en bout.
2. `segmentation/floor.py` — le seul étage réellement indispensable.
3. `geometry/` — sans modèle, à partir du masque.
4. `depth/` puis `occlusion/` — les deux étages de raffinement.
5. Mesure contre les fixtures calibrées, à chaque étape.

Le front n'a besoin d'être touché à aucun de ces cinq points.
