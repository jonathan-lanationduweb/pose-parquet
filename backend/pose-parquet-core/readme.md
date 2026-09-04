# Pose Parquet — plugin WordPress (`pose-parquet-core`)

Backend métier de pose-parquet.com. WordPress ne sert pas le site public : il
héberge les demandes de projet, leur administration et l'API REST que le front
HTML/CSS/JS appelle. Le front reste dans le dépôt, indépendant, déployé à part.

```
front (statique)  →  REST /wp-json/pose-parquet/v1/…  →  ce plugin  →  tables pp_*
```

## Ce que contient la version 0.2.0

Fondation (0.1.0) :

- bootstrap avec garde PHP ≥ 8.2, autoloader d'espace de noms, versions du
  plugin et du schéma séparées ;
- installation idempotente des trois tables métier (`pp_projects`,
  `pp_project_history`, `pp_project_notes`) par `dbDelta`, migrations
  numérotées ;
- capabilities `pp_view_projects`, `pp_manage_projects`, `pp_manage_settings`,
  accordées au rôle administrateur ;
- route `GET /wp-json/pose-parquet/v1/health` publique, sans donnée sensible ;
- menu « Pose Parquet » → page « État » ;
- désactivation non destructive ; désinstallation prudente (tables conservées).

Création d'une demande (0.2.0) :

- `POST /wp-json/pose-parquet/v1/projects` : validation serveur complète
  (`Projects\Validator` sur le contrat `Projects\Fields`), normalisation,
  insertion + référence `PP-AAAA-NNNNNN` + historique initial sous
  transaction, réponse `201 { success, reference }` ;
- erreurs `{ code, message, fields }` en 400 / 413 / 422 / 500 / 503, sans
  SQL, chemin, trace ni écho des données ;
- CORS à liste fermée sur l'espace `pose-parquet/v1` (jamais `*`) ;
- schéma 2 : colonne `style`, `reference` nullable ;
- page « État » : nombre de demandes en base.

Pas encore : emails, anti-spam, écrans de gestion, connexion du formulaire
public. Voir `docs/backend/roadmap.md` à la racine du dépôt.

## Prérequis

WordPress 6.5+, PHP 8.2+, MySQL 8 / MariaDB 10.6+ avec InnoDB. Aucune
dépendance : ni Composer, ni ACF, ni WooCommerce, ni constructeur de pages.

## Installation

Copier (ou lier) ce dossier dans `wp-content/plugins/pose-parquet-core/`, puis
activer « Pose Parquet » dans Extensions. L'activation crée les tables et pose
les droits. Vérifier sur *Pose Parquet → État* ou sur `/wp-json/pose-parquet/v1/health`.

Origines CORS : par défaut `http://localhost:5180`,
`https://jonathan-lanationduweb.github.io`, `https://pose-parquet.com`,
`https://www.pose-parquet.com`. Pour les remplacer, dans `wp-config.php` :

```php
define( 'POSE_PARQUET_ALLOWED_ORIGINS', [ 'https://pose-parquet.com', 'https://www.pose-parquet.com' ] );
```

ou par code, filtre `pose_parquet_allowed_origins`. Une étoile est ignorée.

## Arborescence

```
pose-parquet-core.php   bootstrap, constantes, hooks d'activation
src/Plugin.php          assemblage des modules
src/Database/           Schema (tables, SQL dbDelta), Installer (versions, migrations)
src/Projects/           Fields (contrat), Validator, Reference, Repository, Service, Status
src/Security/           Capabilities
src/Rest/               Routes, HealthController, ProjectsController, Cors
src/Admin/              Menu (page État)
src/Support/            Logger (sans donnée personnelle)
templates/              gabarits d'administration
tests/                  quatre suites (voir ci-dessous)
uninstall.php           suppression prudente
```

## Tests

Tous en ligne de commande, contre un WordPress installé où ce dossier est
copié dans les extensions (`<wp>` = racine WordPress) :

```
php tests/run-validator.php <wp>          validation et normalisation, sans écriture
php tests/run-foundation.php <wp>         activation, schéma, droits, /health, désactivation
php tests/run-projects.php <wp>           POST réel, 422 sans écriture, injections, 503,
                                          migration 1→2, concurrence (6 processus), méthodes,
                                          CORS (fonctions), journal sans donnée personnelle
php tests/run-http.php http://127.0.0.1:8181   preflight OPTIONS, en-têtes CORS réels,
                                          méthodes, accès direct aux fichiers
```

`run-http.php` suppose un serveur HTTP devant le WordPress (par exemple
`php -S 127.0.0.1:8181` dans `<wp>`). Les demandes qu'il crée sont supprimées
par `run-projects.php`. Résultat au 4 septembre 2026 : 115 + 54 + 111 + 27,
aucun échec. Un `php -l` sur chaque fichier fait office de vérification
statique.

## Développement

Ce dossier est prévu pour être extrait dans son propre dépôt : il n'a aucune
dépendance vers le reste de `pose-parquet.com`. Il est exclu du déploiement
GitHub Pages du front (`.github/workflows`, `--exclude 'backend'`).
