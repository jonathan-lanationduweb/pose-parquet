# Plugin `pose-parquet-core` — fonctionnement

Version 0.2.0 — fondation + création d'une demande. Nom affiché : **Pose
Parquet**. PHP ≥ 8.2, WordPress ≥ 6.5, InnoDB. Aucune dépendance externe.

## Démarrage

`pose-parquet-core.php` :

1. refuse l'accès direct (`ABSPATH`) ;
2. définit `POSE_PARQUET_VERSION` (livraison, `0.2.0`) et
   `POSE_PARQUET_DB_VERSION` (schéma, entier, `2`) — deux compteurs
   distincts, parce que la plupart des versions ne touchent pas à la base ;
3. s'arrête avec une notice d'administration si PHP < 8.2, **avant** de charger
   une classe ;
4. enregistre un autoloader `PoseParquet\Core\…` → `src/…` ;
5. branche activation (`Installer::activate`), désactivation
   (`Plugin::deactivate`, volontairement vide) et `plugins_loaded`
   (`Plugin::boot`).

`Plugin::boot()` : `Installer::maybe_upgrade()` (comparaison d'entiers dans
le cas courant), `Capabilities::ensure()` (n'écrit que si un droit manque),
routes REST sur `rest_api_init`, `Cors::register()`, menu d'administration si
`is_admin()`.

## Arborescence réelle

```
pose-parquet-core.php
src/Plugin.php
src/Database/Schema.php           tables, SQL dbDelta, état des tables
src/Database/Installer.php        install(), maybe_upgrade(), migrate() — étape 2 écrite
src/Projects/Fields.php           contrat d'une demande : champs, listes, bornes, colonnes
src/Projects/Validator.php        validation + normalisation, sans base
src/Projects/Reference.php        PP-AAAA-NNNNNN à partir de l'id
src/Projects/Repository.php       SQL sur pp_projects / pp_project_history, transaction
src/Projects/Service.php          valider → insérer → référence → historique, atomique
src/Projects/Status.php           les 7 statuts et leurs libellés
src/Security/Capabilities.php     3 capabilities, octroi à administrator
src/Rest/Routes.php               espace pose-parquet/v1 : GET /health, POST /projects
src/Rest/HealthController.php
src/Rest/ProjectsController.php   contrôleur mince : corps, tailles, traduction HTTP
src/Rest/Cors.php                 liste fermée d'origines, remplace le CORS WordPress sur l'espace
src/Admin/Menu.php                menu « Pose Parquet » → page « État »
src/Support/Logger.php            journal sans donnée personnelle
templates/admin-status.php
tests/support.php                 bootstrap, compteur, requête valide de référence
tests/run-validator.php
tests/run-foundation.php
tests/run-projects.php
tests/concurrency-worker.php      ouvrier lancé en parallèle par run-projects
tests/run-http.php
uninstall.php
readme.md
```

Pas de `Mail/` ni de `Security/AntiSpam` : rien ne les utilise encore.

## Création d'une demande

`ProjectsController::create()` lit le corps brut, refuse > 16 Ko (413), vide
(400) ou illisible (400), vérifie que le schéma est au niveau (sinon 503),
puis appelle `Service::create()`. Le service valide (`Validator`), et sous
`START TRANSACTION` : insère la ligne (`reference` NULL), pose la référence
`PP-<année>-<id sur 6>`, insère l'événement d'historique `NULL → new`
(`user_id` 0), `COMMIT`. Toute étape en échec → `ROLLBACK` et 500. Le
contrôleur répond `201 { success, reference }` et journalise identifiant de
requête, route, id de demande et durée — rien d'autre.

Le contrat des champs est dans `Fields` et documenté dans
`project-form-contract.md` ; l'API dans `rest-api.md`.

## Administration

Un menu **Pose Parquet** avec une seule page, **État**, réservée à
`pp_manage_settings` : version du plugin, schéma attendu et installé, tables,
droits, statuts, URLs des routes, et le **nombre** de demandes en base (pas de
liste : lot 4).

## Activation, désactivation, suppression

- **Activation** : `Installer::install()` — dbDelta des trois tables,
  `migrate()` (étape 2 : `reference` nullable), droits, options. Idempotente.
- **Désactivation** : rien. Tables, options et droits restent.
- **Suppression** (`uninstall.php`) : retire options et capabilities ;
  **conserve les tables** sauf si `POSE_PARQUET_UNINSTALL_DROP_TABLES` vaut
  `true`. Voir `database.md`.

## Journal

`Support\Logger` écrit via `error_log()` uniquement si `WP_DEBUG` est actif,
préfixe `[pose-parquet]`, niveaux ERREUR / ALERTE / INFO, contexte en JSON
après retrait des clés personnelles (voir `security.md`).

## Tests

Quatre scripts, tous contre un WordPress réel (voir `readme.md` du plugin
pour les commandes). Au 4 septembre 2026 : validateur 115, fondation 54,
WordPress réel 111 (dont concurrence 6 × 5 et migration 1 → 2), HTTP 27 ;
aucun échec. Il n'y a pas de suite PHPUnit : `run-validator.php` joue le rôle
des tests unitaires (aucune écriture, aucune requête SQL) tout en utilisant
les vraies fonctions WordPress que le validateur appelle en production.
