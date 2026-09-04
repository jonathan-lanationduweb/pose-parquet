# Pose Parquet — plugin WordPress (`pose-parquet-core`)

Backend métier de pose-parquet.com. WordPress ne sert pas le site public : il
héberge les demandes de projet, leur administration et l'API REST que le front
HTML/CSS/JS appelle. Le front reste dans le dépôt, indépendant, déployé à part.

```
front (statique)  →  REST /wp-json/pose-parquet/v1/…  →  ce plugin  →  tables pp_*
```

## Ce que contient la version 0.1.0 (fondation)

- bootstrap avec garde PHP ≥ 8.2, autoloader d'espace de noms, versions du
  plugin et du schéma séparées ;
- installation idempotente des trois tables métier (`pp_projects`,
  `pp_project_history`, `pp_project_notes`) par `dbDelta`, avec option de
  version de schéma et point d'entrée pour les migrations futures ;
- capabilities `pp_view_projects`, `pp_manage_projects`, `pp_manage_settings`,
  accordées au rôle administrateur ;
- route `GET /wp-json/pose-parquet/v1/health` publique, sans donnée sensible ;
- menu « Pose Parquet » avec une seule page, « État », qui montre ce qui est
  installé ;
- désactivation non destructive ; désinstallation prudente (tables conservées).

Pas encore : création de demande, emails, anti-spam, écrans de gestion. Voir
`docs/backend/roadmap.md` à la racine du dépôt.

## Prérequis

WordPress 6.5+, PHP 8.2+, MySQL 8 / MariaDB 10.6+. Aucune dépendance : ni
Composer, ni ACF, ni WooCommerce, ni constructeur de pages.

## Installation

Copier (ou lier) ce dossier dans `wp-content/plugins/pose-parquet-core/`, puis
activer « Pose Parquet » dans Extensions. L'activation crée les tables et pose
les droits. Vérifier sur *Pose Parquet → État* ou sur `/wp-json/pose-parquet/v1/health`.

## Arborescence

```
pose-parquet-core.php   bootstrap, constantes, hooks d'activation
src/Plugin.php          assemblage des modules
src/Database/           Schema (tables, SQL dbDelta), Installer (versions)
src/Projects/           Status (source de vérité des statuts)
src/Security/           Capabilities
src/Rest/               Routes, HealthController
src/Admin/              Menu (page État)
src/Support/            Logger (sans donnée personnelle)
templates/              gabarits d'administration
tests/                  tests de fondation (voir ci-dessous)
uninstall.php           suppression prudente
```

## Tests

`tests/run-foundation.php` s'exécute en ligne de commande contre un WordPress
installé, plugin copié dans ses extensions :

```
php tests/run-foundation.php C:/chemin/vers/wordpress
```

Il active le plugin, vérifie tables, version de schéma, droits, route de santé
et permissions, réactive pour prouver l'idempotence, désactive et vérifie que
rien n'a été détruit. Un simple `php -l` sur chaque fichier fait office de
vérification statique. Il n'y a pas de suite PHPUnit : elle viendra avec la
logique métier du lot 2.

## Développement

Ce dossier est prévu pour être extrait dans son propre dépôt : il n'a aucune
dépendance vers le reste de `pose-parquet.com`. Il est exclu du déploiement
GitHub Pages du front (`.github/workflows`, `--exclude 'backend'`).
