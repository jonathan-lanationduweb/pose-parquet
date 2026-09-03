# Flux Git et rôle des branches

> **Aucune décision backend n'est prise ici.** Ce document organise le dépôt
> pour accueillir un backend. Le langage, le framework, la base de données,
> l'hébergeur et l'architecture serveur restent à décider en phase de
> conception — les branches sont vides à dessein.

## Les six branches

| Branche | Rôle | Se crée depuis | Fusionne dans |
| --- | --- | --- | --- |
| `main` | Le site **déployé**. Seul état considéré public. | — | — |
| `develop` | Intégration. Les branches feature s'y rejoignent et s'y testent ensemble. | `main` | `main` |
| `feature/backend-foundation` | Socle : structure du projet serveur, configuration, conventions, outillage. Rien de fonctionnel. | `develop` | `develop` |
| `feature/backend-formulaire` | Réception du formulaire de projet côté serveur. Voir `docs/formulaire-production.md`. | `develop` | `develop` |
| `feature/backend-premibel-sync` | Synchronisation du catalogue Premibel. Voir `docs/premibel-sync-contract.md`. | `develop` | `develop` |
| `feature/backend-demandes` | Stockage et suivi des demandes reçues. | `develop` | `develop` |

Les quatre branches feature sont créées **vides**, au même commit que
`develop`. Elles n'existent que pour fixer le découpage : chaque lot backend
a sa place avant qu'on écrive la première ligne, ce qui évite de tout empiler
dans un seul chantier « backend ».

## Ce qui n'est délibérément pas créé

- `feature/backend-ai-room-analysis` — l'analyse automatique de pièce n'est pas
  décidée. Voir `docs/future-ai-api-contract.md` et
  `docs/segmentation-automatique.md`, qui restent des documents d'étude.
- Authentification, comptes utilisateurs, paiement.

Une branche est une promesse de travail. En créer pour des modules
hypothétiques donne à l'arborescence l'air d'un plan arrêté et rend le vrai
périmètre illisible. Elles se créeront le jour où le module sera décidé.

## Le flux

```
feature/<lot>  →  develop  →  (tests)  →  main  →  déploiement
```

1. Travailler sur `feature/<lot>`, jamais directement sur `develop` ni `main`.
2. Rebaser ou fusionner `develop` dans la branche feature avant d'ouvrir la
   pull request, pour que les conflits se règlent chez soi.
3. Pull request `feature/<lot>` → `develop`.
4. Tester sur `develop`, l'intégration comprise : c'est là qu'on voit ce que
   deux lots se font l'un à l'autre, et nulle part ailleurs.
5. Pull request `develop` → `main` quand l'état est jugé livrable.
6. Le push sur `main` déclenche le déploiement.

**Jamais `feature/*` → `main`.** La seule exception est un correctif urgent sur
un site en production, et elle se documente : branche `hotfix/<sujet>` depuis
`main`, pull request vers `main`, puis **report immédiat sur `develop`** — sans
ce report, le correctif est perdu à la fusion suivante.

## Déploiement : `main` seulement

`.github/workflows/deploy-pages.yml` se déclenche sur `on: push: branches:
[main]`. Créer ou pousser `develop` et les branches feature ne déploie donc
rien, et l'URL publique ne bouge pas.

Une réserve : le workflow accepte aussi `workflow_dispatch`. Un déclenchement
manuel depuis l'interface GitHub agit sur la référence choisie — lancer le
workflow sur `develop` publierait `develop`. Ne pas le faire ; le déclencheur
manuel existe pour rejouer un déploiement de `main`.

Le marquage `noindex` de la préproduction ne dépend pas de la branche mais de
la présence d'un `CNAME`. Voir `docs/seo-environnements.md`.

## Protections de `main` : à activer à la main

**Ces protections ne sont pas configurées.** La CLI `gh` n'est pas installée sur
le poste et aucun jeton n'est disponible : l'API GitHub n'est pas joignable
depuis ici. Le réglage se fait dans *Settings → Branches → Add branch
protection rule*, motif `main` :

- **Require a pull request before merging** — empêche le push direct sur
  `main`, qui est la seule vraie erreur possible ici.
- **Require linear history** — l'historique de `main` reste lisible.
- **Do not allow bypassing the above settings** : à laisser **décoché**.
  Coché, il s'applique aussi aux administrateurs, donc au seul mainteneur
  actuel : plus aucun correctif direct ne serait possible sur un site en
  production.

À ne **pas** activer tant que le dépôt n'a qu'un mainteneur :

- **Require approvals** — une revue par un tiers, alors qu'il n'y a pas de
  tiers. Toute pull request serait bloquée.
- **Require status checks to pass** — il n'y a pas encore de CI. La règle
  attendrait un contrôle qui n'existe pas.

Ces deux règles deviennent les bonnes le jour où il y a un second contributeur
ou une CI. Les activer aujourd'hui bloquerait le flux décrit plus haut, ce qui
est le contraire du but.

## Vérification

```bash
git branch -a
```

Doit lister les six branches en local et leurs six équivalents sur `origin`.
