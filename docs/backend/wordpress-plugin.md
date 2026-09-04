# Plugin `pose-parquet-core` — fonctionnement

Version 0.3.0 — fondation, création d'une demande, emails et anti-spam. Nom
affiché : **Pose Parquet**. PHP ≥ 8.2, WordPress ≥ 6.5, InnoDB. Aucune
dépendance externe.

## Démarrage

`pose-parquet-core.php` :

1. refuse l'accès direct (`ABSPATH`) ;
2. définit `POSE_PARQUET_VERSION` (livraison, `0.3.0`) et
   `POSE_PARQUET_DB_VERSION` (schéma, entier, `3`) — deux compteurs
   distincts, parce que la plupart des versions ne touchent pas à la base ;
3. s'arrête avec une notice d'administration si PHP < 8.2, **avant** de charger
   une classe ;
4. enregistre un autoloader `PoseParquet\Core\…` → `src/…` ;
5. branche activation (`Installer::activate`), désactivation
   (`Plugin::deactivate`, volontairement vide) et `plugins_loaded`
   (`Plugin::boot`).

`Plugin::boot()` : `Installer::maybe_upgrade()` (comparaison d'entiers dans
le cas courant), `Capabilities::ensure()` (n'écrit que si un droit manque),
routes REST sur `rest_api_init`, `Cors::register()`, puis — seulement en
administration — `Menu::register()` et `Settings::register()`.

## Arborescence réelle

```
pose-parquet-core.php
src/Plugin.php
src/Database/Schema.php           tables, SQL dbDelta, état des tables
src/Database/Installer.php        install(), maybe_upgrade(), migrate() — étapes 2 et 3
src/Projects/Fields.php           contrat d'une demande : champs, listes, bornes, colonnes
src/Projects/Validator.php        validation + normalisation, sans base
src/Projects/Reference.php        PP-AAAA-NNNNNN à partir de l'id
src/Projects/Repository.php       SQL sur pp_projects / pp_project_history, transaction, états d'email
src/Projects/Service.php          valider → insérer → référence → historique, atomique
src/Projects/SubmissionService.php  le pipeline public : anti-spam → écriture → emails
src/Projects/Status.php           les 7 statuts et leurs libellés
src/Antispam/Guard.php            ordre des contrôles, codes de refus
src/Antispam/FormToken.php        jeton signé HMAC, âge minimum et expiration
src/Antispam/Honeypot.php         le champ website
src/Antispam/RateLimiter.php      compteurs et limites, sur transients
src/Antispam/ClientIdentity.php   identité réseau condensée, jamais l'IP
src/Mail/Mailer.php               le seul appel à wp_mail()
src/Mail/Notifier.php             les deux envois après COMMIT, et leur état en base
src/Mail/InternalNotification.php sujet et corps de la notification interne
src/Mail/VisitorConfirmation.php  sujet et corps de l'accusé de réception
src/Mail/Template.php             rendu des gabarits, lignes et sections
src/Mail/Labels.php               libellés français des valeurs codées
src/Security/Capabilities.php     3 capabilities, octroi à administrator
src/Rest/Routes.php               espace pose-parquet/v1 : GET /health, GET /form-token, POST /projects
src/Rest/HealthController.php
src/Rest/ProjectsController.php   contrôleur mince : corps, tailles, traduction HTTP
src/Rest/FormTokenController.php  émission du jeton
src/Rest/Cors.php                 liste fermée d'origines, remplace le CORS WordPress sur l'espace
src/Admin/Menu.php                menu « Pose Parquet » → pages « État » et « Réglages »
src/Admin/Settings.php            Settings API : destinataire, confirmation visiteur
src/Support/Logger.php            journal sans donnée personnelle
templates/admin-status.php
templates/admin-settings.php
templates/mail/layout.php         enveloppe commune des emails
templates/mail/internal.php
templates/mail/visitor.php
tests/support.php                 bootstrap, compteur, charges de référence
tests/run-validator.php
tests/run-foundation.php
tests/run-projects.php
tests/concurrency-worker.php      ouvrier lancé en parallèle par run-projects
tests/run-http.php
uninstall.php
readme.md
```

Pas de `Security/Turnstile` : rien ne l'utilise encore. Sa place est un
contrôle de plus dans `Antispam\Guard` (voir roadmap).

## Le dépôt d'une demande

`ProjectsController::create()` lit le corps brut, refuse > 16 Ko (413), vide
(400) ou illisible (400), vérifie que le schéma est au niveau (sinon 503),
puis appelle `SubmissionService::submit()`, qui enchaîne :

1. identité réseau (condensat de `REMOTE_ADDR`) ;
2. limite de tentatives, pot de miel, jeton temporel — `Antispam\Guard` ;
3. limite de créations réussies ;
4. retrait des champs techniques (`formToken`, `website`) ;
5. `Projects\Service::create()` — validation, puis sous transaction :
   insertion, référence, historique, COMMIT ;
6. incrément du compteur de créations ;
7. `Mail\Notifier::notify()` — notification interne, puis confirmation.

Le contrôleur traduit le résultat : `201 { success, reference }`, ou l'erreur
avec son code et son `Retry-After` s'il y en a un. Il journalise identifiant
de requête, route, id de demande, sort des emails et durée — rien d'autre.

Détails : `antispam.md`, `email.md`, `rest-api.md`, `project-form-contract.md`.

## Administration

Menu **Pose Parquet**, deux pages, toutes deux réservées à
`pp_manage_settings` :

- **État** : version du plugin, schéma attendu et installé, tables, droits,
  statuts, URLs des trois routes, nombre de demandes, adresse de notification
  configurée ou non, confirmation visiteur activée ou non, et les valeurs
  d'anti-spam en vigueur. Pas de liste de demandes : lot 4.
- **Réglages** : adresse de réception des demandes, confirmation automatique
  au visiteur. Deux réglages, pas vingt.

## Activation, désactivation, suppression

- **Activation** : `Installer::install()` — dbDelta des trois tables,
  `migrate()` (étape 2 : `reference` nullable ; étape 3 : rien au-delà de
  dbDelta), droits, options. Idempotente.
- **Désactivation** : rien. Tables, options et droits restent.
- **Suppression** (`uninstall.php`) : retire options et capabilities ;
  **conserve les tables** sauf si `POSE_PARQUET_UNINSTALL_DROP_TABLES` vaut
  `true`. Voir `database.md`.

## Journal

`Support\Logger` écrit via `error_log()` uniquement si `WP_DEBUG` est actif,
préfixe `[pose-parquet]`, niveaux ERREUR / ALERTE / INFO, contexte en JSON
après retrait des clés personnelles et techniques (voir `security.md`).

## Tests

Cinq fichiers, quatre suites, toutes contre un WordPress réel (commandes dans
le `readme.md` du plugin). Au 4 septembre 2026 : validateur 134, fondation 57,
WordPress réel 227 (dont emails simulés par `pre_wp_mail`, jeton, pot de miel,
limite de débit, réglages, gabarits, concurrence 6 × 5 et migration 1 → 3),
HTTP réel 45 ; aucun échec, 463 vérifications.

Il n'y a pas de suite PHPUnit : `run-validator.php` joue le rôle des tests
unitaires (aucune écriture, aucune requête SQL) tout en utilisant les vraies
fonctions WordPress que le code appelle en production. Aucun email réel n'est
envoyé : les tests court-circuitent `wp_mail()` par `pre_wp_mail`, ce qui
permet de lire destinataire, sujet, en-têtes et corps, et de simuler un échec.
