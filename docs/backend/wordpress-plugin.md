# Plugin `pose-parquet-core` — fonctionnement

Version 0.1.0 — fondation. Nom affiché : **Pose Parquet**. PHP ≥ 8.2,
WordPress ≥ 6.5. Aucune dépendance externe.

## Démarrage

`pose-parquet-core.php` :

1. refuse l'accès direct (`ABSPATH`) ;
2. définit `POSE_PARQUET_VERSION` (livraison) et `POSE_PARQUET_DB_VERSION`
   (schéma, entier) — deux compteurs distincts, parce que la plupart des
   versions ne touchent pas à la base ;
3. s'arrête avec une notice d'administration si PHP < 8.2, **avant** de charger
   une classe (une classe PHP 8 sur PHP 7 est une erreur fatale de syntaxe) ;
4. enregistre un autoloader `PoseParquet\Core\…` → `src/…` ;
5. branche activation (`Installer::activate`), désactivation
   (`Plugin::deactivate`, volontairement vide) et `plugins_loaded`
   (`Plugin::boot`).

`Plugin::boot()` : `Installer::maybe_upgrade()` (comparaison d'entiers dans
le cas courant), `Capabilities::ensure()`, routes REST sur `rest_api_init`,
menu d'administration si `is_admin()`.

## Arborescence réelle

```
pose-parquet-core.php
src/Plugin.php
src/Database/Schema.php        tables, SQL dbDelta, état des tables
src/Database/Installer.php     install(), maybe_upgrade(), migrate()
src/Projects/Status.php        les 7 statuts et leurs libellés
src/Security/Capabilities.php  3 capabilities, octroi à administrator
src/Rest/Routes.php            espace pose-parquet/v1
src/Rest/HealthController.php  GET /health
src/Admin/Menu.php             menu « Pose Parquet » → page « État »
src/Support/Logger.php         journal sans donnée personnelle
templates/admin-status.php
tests/run-foundation.php
uninstall.php
readme.md
```

Pas de `Mail/` ni de `Security/AntiSpam` : rien ne les utilise encore, et une
classe vide n'est pas une architecture. Leur place est prévue (voir roadmap).

## Administration

Un menu **Pose Parquet** avec une seule page, **État**, réservée à
`pp_manage_settings`. Elle lit la base au moment de l'affichage : version du
plugin, schéma attendu et installé, présence des trois tables, droits du rôle
administrateur, statuts, URL de la route de santé. Pas de « Tableau de bord »
ni de « Demandes » tant que ces écrans n'ont pas de contenu.

## Activation, désactivation, suppression

- **Activation** : `Installer::install()` — dbDelta des trois tables,
  migrations éventuelles, droits, options `pose_parquet_db_version` et
  `pose_parquet_installed_at`. Idempotente : testée par double activation
  avec une ligne de données qui survit.
- **Désactivation** : rien. Tables, options et droits restent.
- **Suppression** (`uninstall.php`) : retire options et capabilities ;
  **conserve les tables** sauf si `POSE_PARQUET_UNINSTALL_DROP_TABLES` vaut
  `true` dans `wp-config.php`. Voir `database.md`.

## Journal

`Support\Logger` écrit via `error_log()` uniquement si `WP_DEBUG` est actif,
préfixe `[pose-parquet]`, contexte en JSON. Les clés `email`, `phone`,
`first_name`, `last_name`, `message`, `ip` sont retirées du contexte quoi
qu'il arrive. Testé : un email passé en contexte n'apparaît pas dans
`debug.log`.

## Tests

`php tests/run-foundation.php <racine WordPress>` — 53 vérifications contre
un WordPress réel : chargement, activation, tables et colonnes, index, version
de schéma, réactivation idempotente avec survie des données, statuts, droits,
REST (enregistrement, 200 anonyme, contenu, absence de données sensibles,
`Cache-Control`, méthode refusée, route future absente), journal, désactivation
non destructive. Résultat au 4 septembre 2026 : 53 / 53.

Compléments faits à la main en HTTP réel (serveur PHP intégré) : `/health`
200 avec `no-store`, POST 404, route inexistante 404, accès direct à un fichier
PHP du plugin → réponse vide, page « État » rendue après connexion.

Il n'existe pas de suite PHPUnit : la fondation est précisément ce qui parle à
WordPress, et c'est contre WordPress qu'elle est testée. PHPUnit arrivera avec
la logique métier (validation d'une demande, génération de référence), qui se
teste isolément.
