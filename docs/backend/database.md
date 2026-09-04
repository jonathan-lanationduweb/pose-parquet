# Backend — base de données

## Principe

Tables métier dédiées, jamais `wp_posts`. Préfixe dynamique `$wpdb->prefix`
(le WordPress de test utilise `ppdev_` pour que tout `wp_` en dur échoue).
Trois tables, toutes créées par `dbDelta()` à partir de `Database\Schema`,
seule description de la structure. Moteur InnoDB (celui du site) : les
écritures d'une demande se font sous transaction.

Schéma versionné par l'entier `POSE_PARQUET_DB_VERSION` (code) comparé à
l'option `pose_parquet_db_version` (base). Version actuelle : **3**.

## `{prefix}pp_projects` — une demande

| Groupe | Colonnes |
|---|---|
| Identité | `id`, `reference` (unique, nullable — voir plus bas), `status`, `first_name`, `last_name`, `email`, `phone` |
| Projet | `postal_code` (non collecté par le formulaire, reste vide), `city`, `department`, `region`, `housing_type`, `room_type`, `surface` (decimal 8,2), `parquet_type`, `support_type`, `installation_type`, `style` (schéma 2), `timeframe`, `message` |
| Visualiseur (facultatif) | `scene_id`, `product_id`, `pattern`, `orientation` (angle), `visualizer_config` (JSON) |
| Emails (schéma 3) | `internal_mail_status`, `internal_mail_sent_at`, `visitor_mail_status`, `visitor_mail_sent_at` |
| Traçabilité | `source_url`, `utm_source`, `utm_medium`, `utm_campaign`, `consent_at`, `created_at`, `updated_at` |

Index : `PRIMARY(id)`, `UNIQUE(reference)`, `status`, `created_at`, `email`,
`department`.

Choix : les champs de projet sont des `varchar` courts, pas des `ENUM` SQL —
ce sont des listes éditoriales du front qui évolueront sans migration ; leurs
valeurs autorisées vivent dans `Projects\Fields`. `visualizer_config` est du
**JSON** tel que le Visualiseur le produit, stocké tel quel, jamais interprété
par le plugin ; pas de PHP sérialisé. Seul `status` a un domaine fixé dans
`Projects\Status` : `new`, `to_contact`, `contacted`, `qualified`,
`completed`, `lost`, `spam`.

**Pas d'adresse IP.** Ni colonne, ni journal. La limite de débit s'appuie sur
un **condensat** HMAC de `REMOTE_ADDR` (voir `antispam.md`), rangé dans des
transients éphémères — jamais dans cette table.

**États des emails** (schéma 3) : `pending` (aucun envoi tenté — état initial,
et celui des demandes antérieures au lot 3), `sent`, `failed`, et `skipped`
pour la confirmation quand elle est désactivée dans les réglages. La date
n'est posée qu'en cas d'envoi réussi. Ces colonnes portent un mot et une
date : jamais le contenu d'un email, jamais une copie des données
personnelles. Voir `email.md`.

## `{prefix}pp_project_history` — transitions de statut

`id`, `project_id`, `old_status` (NULL à la création), `new_status`,
`user_id` (0 = automatique), `comment`, `created_at`. Index `project_id`,
`created_at`. Chaque demande créée par l'API a exactement un événement
initial `NULL → new`, `user_id` 0, daté du même instant que la demande.

## `{prefix}pp_project_notes` — notes internes

`id`, `project_id`, `user_id`, `content`, `created_at`, `updated_at`. Index
`project_id`. Jamais visibles du client. Inutilisée jusqu'au lot 4.

## Référence d'une demande

Format `PP-AAAA-NNNNNN` : année serveur (UTC) de la création, puis
l'identifiant auto-incrémenté sur six chiffres minimum (`PP-2026-000123` pour
l'id 123 ; au-delà de 999 999, sept chiffres, jamais de troncature). **Pas de
compteur annuel** : la première version de ce document en décrivait un, avec
`SELECT MAX … FOR UPDATE` ; il a été abandonné pour le lot 2. L'identifiant
est unique par construction, l'index unique sur `reference` le rappelle, et
il n'y a ni verrou ni rejeu à écrire. Le test de concurrence (six processus,
trente créations simultanées) le vérifie.

Séquence, dans `Projects\Service::create()`, sous `START TRANSACTION` :

1. `INSERT` de la demande avec `reference` NULL ;
2. `UPDATE` de `reference` à partir de l'id obtenu ;
3. `INSERT` de l'événement d'historique ;
4. `COMMIT`. Toute étape qui échoue → `ROLLBACK` : aucune ligne validée n'a de
   référence NULL, aucune référence n'existe sans historique.

C'est pour cette séquence que `reference` est devenue nullable au schéma 2 :
la valeur n'existe qu'après l'insertion, et une valeur de remplacement
(chaîne vide) ferait collision sur l'index unique dès la deuxième insertion
concurrente.

## Évolutions de schéma

`Installer::install()` rejoue `dbDelta` — qui ajoute colonnes et index
manquants sans toucher au reste — puis `migrate($from, $to)` exécute, dans
l'ordre, les étapes numérotées qui ne se réduisent pas à un ajout.

| Version | Contenu | Étape `migrate()` |
|---|---|---|
| 1 | création initiale | aucune |
| 2 | colonne `style varchar(40) NOT NULL DEFAULT ''` (ajoutée par dbDelta) ; `reference` passe de `NOT NULL` à `DEFAULT NULL` | `ALTER TABLE … MODIFY reference varchar(20) DEFAULT NULL` — dbDelta ne sait pas changer la nullabilité |
| 3 | quatre colonnes d'état des emails, `*_mail_status varchar(10) NOT NULL DEFAULT 'pending'` et `*_mail_sent_at datetime NULL` | aucune : dbDelta ajoute les colonnes, et les lignes existantes prennent le défaut `pending` — ce qui dit vrai, aucune demande antérieure n'a reçu d'email |

Testé (`tests/run-projects.php`) : une table remise à l'état 1 avec une ligne,
puis `maybe_upgrade()` → version 3, colonnes ajoutées, nullabilité changée,
index unique conservé, ligne intacte et ses états d'email à `pending` ;
seconde exécution sans effet.

Pour faire évoluer le schéma : modifier le SQL dans `Schema`, incrémenter
`POSE_PARQUET_DB_VERSION`, ajouter un `case` dans `migrate()` si nécessaire.
La version n'est enregistrée qu'une fois les trois tables vérifiées présentes.

## Suppression des données

`uninstall.php` conserve les tables par défaut. Elles ne sont supprimées que si
`wp-config.php` contient `define( 'POSE_PARQUET_UNINSTALL_DROP_TABLES', true );`
au moment de la suppression du plugin. Raison : une suppression de plugin peut
être une erreur ou une migration ; des demandes de visiteurs perdues ne se
récupèrent pas.
