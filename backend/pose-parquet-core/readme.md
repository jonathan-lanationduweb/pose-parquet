# Pose Parquet — plugin WordPress (`pose-parquet-core`)

Backend métier de pose-parquet.com. WordPress ne sert pas le site public : il
héberge les demandes de projet, leur administration et l'API REST que le front
HTML/CSS/JS appelle. Le front reste dans le dépôt, indépendant, déployé à part.

```
front (statique)  →  REST /wp-json/pose-parquet/v1/…  →  ce plugin  →  tables pp_*
```

## Ce que contient la version 0.4.1

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

Emails et anti-spam (0.3.0) :

- notification interne à l'équipe et accusé de réception au visiteur, envoyés
  **après** le COMMIT par `Mail\Notifier` sur `wp_mail()` ; gabarits HTML
  sobres, valeurs échappées ; un échec d'envoi ne défait jamais une demande ;
- états d'envoi en base (schéma 3) : `pending` / `sent` / `failed` /
  `skipped`, avec la date d'envoi ;
- page « Réglages » : adresse de réception (par défaut `admin_email`) et
  confirmation automatique au visiteur ;
- anti-spam : pot de miel `website`, jeton temporel signé
  (`GET /form-token`), limite de débit par identité réseau condensée, avec
  `429` et `Retry-After` ; aucune adresse IP stockée ni journalisée ;
- pipeline unique `Projects\SubmissionService` : anti-spam → validation →
  écriture → emails.

Administration des demandes (0.4.0) — **schéma inchangé (3)** :

- menu « Pose Parquet » → **Demandes** (l'entrée parente), **Réglages**,
  **État** ; l'écran de travail s'ouvre par défaut, « État » descend en
  dernier et reste sur `pp_manage_settings` ;
- liste paginée de vingt, ordonnée `created_at DESC, id DESC`, avec les sept
  filtres de statut et leurs compteurs, et une recherche sur référence,
  prénom, nom, email, téléphone, ville et département ;
- fiche métier : client avec `mailto:` et `tel:`, projet, message, Visualiseur
  rendu lisible (jamais le JSON brut), notes internes, statut, états des
  emails, historique, acquisition. Les champs facultatifs vides ne sont pas
  affichés ;
- changement de statut en **POST** sur `admin-post.php`, avec capability puis
  nonce puis redirection ; historique automatique, aucun événement quand le
  statut ne change pas ; **refus de l'écrasement concurrent** par
  `expected_status`, porté jusque dans le `WHERE` de l'UPDATE ;
- notes internes en texte brut, 5 000 caractères, auteur = utilisateur
  connecté, **ni modifiables ni supprimables** ;
- rôle **« Gestionnaire Pose Parquet »** : `read`, `pp_view_projects`,
  `pp_manage_projects`, et rien d'autre ;
- aucune route REST d'administration, aucun fichier JavaScript, aucune
  suppression de demande, aucune action groupée.

Libellés du Visualiseur (0.4.1) — **schéma inchangé (3)** :

- la fiche affiche « Séjour et salle à manger (sejour) » et « Chêne Fumé
  (chene-fume) » quand le front a joint le nom humain, l'identifiant seul
  sinon. Les noms sont lus dans `visualizer_config` (`nomScene`, `nom`) : ce
  sont des instantanés pris à l'envoi, pas des traductions, et le plugin ne
  recopie aucun catalogue ;
- `visualizer.config` est désormais **borné et nettoyé** à l'écriture :
  120 caractères par chaîne et par nom de champ, trois niveaux d'imbrication,
  `sanitize_text_field()` sur chaque valeur et chaque clé. Ce qui dépasse est
  refusé en 422 plutôt que tronqué en silence — le plafond de 4 Ko reste ;
- aucune migration, aucune demande existante modifiée.

Pas encore : renvoi d'un email, suppression de demande, Turnstile. Voir
`docs/backend/roadmap.md` à la racine du dépôt.

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

Adresse de réception des demandes : *Pose Parquet → Réglages*. Le transport
des emails (SMTP, Brevo…) se règle au niveau de WordPress, pas ici.

Limites d'anti-spam par défaut : 5 demandes et 30 tentatives par heure et par
identité réseau, jeton valide 2 heures avec 2 secondes d'âge minimum.
Ajustables par le filtre `pose_parquet_rate_limits`.

## Arborescence

```
pose-parquet-core.php   bootstrap, constantes, hooks d'activation
src/Plugin.php          assemblage des modules
src/Database/           Schema (tables, SQL dbDelta), Installer (versions, migrations)
src/Projects/           Fields (contrat), Validator, Reference, Repository, Service,
                        SubmissionService (pipeline), Status
src/Antispam/           Guard, FormToken, Honeypot, RateLimiter, ClientIdentity
src/Mail/               Mailer, Notifier, InternalNotification, VisitorConfirmation,
                        Template, Labels
src/Security/           Capabilities
src/Rest/               Routes, HealthController, ProjectsController, FormTokenController, Cors
src/Admin/              Menu, Projects (liste + fiche), Actions, Notices, View, Settings
src/Support/            Logger (sans donnée personnelle)
assets/admin.css        styles des écrans Demandes
templates/              gabarits d'administration et d'email (templates/mail/)
tests/                  cinq suites (voir ci-dessous)
uninstall.php           suppression prudente
```

## Tests

Tous en ligne de commande, contre un WordPress installé où ce dossier est
copié dans les extensions (`<wp>` = racine WordPress) :

```
php tests/run-validator.php <wp>          validation, normalisation, jeton, pot de miel,
                                          identité réseau — aucune écriture
php tests/run-foundation.php <wp>         activation, schéma, droits, /health, désactivation
php tests/run-http.php http://pose-parquet-dev.local
                                          HTTP réel : /form-token, preflight OPTIONS,
                                          en-têtes CORS, 429, méthodes, accès aux fichiers
php tests/run-projects.php <wp>           POST réel, emails simulés, réglages, gabarits,
                                          jeton, pot de miel, limite de débit, 503,
                                          migration 1→3, concurrence (6 processus)
php tests/run-admin.php <wp>              administration : liste, pagination, filtres,
                                          recherche, statut, historique, concurrence,
                                          notes, droits des trois rôles, nonce,
                                          échappement, 1000 demandes chronométrées
```

`run-http.php` suppose un serveur HTTP devant le WordPress. En local, c'est
Apache (Wamp), qui sert le WordPress dédié sur `http://pose-parquet-dev.local`
via un VirtualHost et une entrée du fichier hosts — avec `mod_rewrite`, donc
aussi les permaliens jolis de `/wp-json/`. Le lancer **avant**
`run-projects.php`, qui nettoie ses demandes et ses compteurs de débit.

> Jusqu'au lot 5 le WordPress était servi par le serveur intégré de PHP
> (`php -S 127.0.0.1:8181`), qui ne réécrit aucune URL : l'API n'y répondait
> que sous la forme `?rest_route=`. C'est l'origine des adresses en `:8181`
> que l'on peut croiser dans les traces des anciennes recettes.

Aucun email réel n'est envoyé : les tests court-circuitent `wp_mail()` par le
filtre `pre_wp_mail`, ce qui permet de lire destinataire, sujet, en-têtes et
corps, et de simuler un échec. `run-admin.php` fait de même pour les sorties
de l'administration : deux filtres, `wp_redirect` et `wp_die_handler`, lèvent
une exception au lieu de terminer le processus, ce qui permet d'appeler les
vraies poignées d'écriture avec leur `$_POST` et leur nonce.

Résultat au 7 septembre 2026 : 134 + 57 + 45 + 227 + 202, soit **665
vérifications**, aucun échec. Un `php -l` sur chaque fichier fait office de
vérification statique.

## Développement

Ce dossier est prévu pour être extrait dans son propre dépôt : il n'a aucune
dépendance vers le reste de `pose-parquet.com`. Il est exclu du déploiement
GitHub Pages du front (`.github/workflows`, `--exclude 'backend'`).
