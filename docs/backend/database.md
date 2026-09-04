# Backend — base de données

## Principe

Tables métier dédiées, jamais `wp_posts`. Préfixe dynamique `$wpdb->prefix`
(le WordPress de test utilise `ppdev_` pour que tout `wp_` en dur échoue).
Trois tables, toutes créées par `dbDelta()` à partir de `Database\Schema`,
seule description de la structure.

Schéma versionné par l'entier `POSE_PARQUET_DB_VERSION` (code) comparé à
l'option `pose_parquet_db_version` (base). Version actuelle : **1**.

## `{prefix}pp_projects` — une demande

| Groupe | Colonnes |
|---|---|
| Identité | `id`, `reference` (unique), `status`, `first_name`, `last_name`, `email`, `phone` |
| Projet | `postal_code`, `city`, `department`, `region`, `housing_type`, `room_type`, `surface` (decimal 8,2), `parquet_type`, `support_type`, `installation_type`, `timeframe`, `message` |
| Visualiseur (facultatif) | `scene_id`, `product_id`, `pattern`, `orientation`, `visualizer_config` (JSON) |
| Traçabilité | `source_url`, `utm_source`, `utm_medium`, `utm_campaign`, `consent_at`, `created_at`, `updated_at` |

Index : `PRIMARY(id)`, `UNIQUE(reference)`, `status`, `created_at`, `email`,
`department`.

Choix : les champs de projet sont des `varchar` courts, pas des `ENUM` SQL —
ce sont des listes éditoriales du front qui évolueront sans migration.
`visualizer_config` est du **JSON** tel que le Visualiseur le produit, stocké
tel quel, jamais interprété par le plugin (le rendu reste côté front) ; pas de
PHP sérialisé. Seul `status` a un domaine fixé, dans `Projects\Status` :
`new`, `to_contact`, `contacted`, `qualified`, `completed`, `lost`, `spam`.

## `{prefix}pp_project_history` — transitions de statut

`id`, `project_id`, `old_status` (NULL à la création), `new_status`,
`user_id` (0 = automatique), `comment`, `created_at`. Index `project_id`,
`created_at`.

## `{prefix}pp_project_notes` — notes internes

`id`, `project_id`, `user_id`, `content`, `created_at`, `updated_at`. Index
`project_id`. Jamais visibles du client.

## Référence d'une demande (prévu, lot 2)

Format `PP-AAAA-NNNNNN` : année de création, puis un compteur sur six chiffres
remis à zéro chaque année. Attribution à l'insertion, dans une transaction :
`SELECT MAX(reference)` de l'année courante `FOR UPDATE`, incrément, insert ;
l'index unique sur `reference` protège contre toute collision résiduelle
(l'insertion échoue et se rejoue). Rien de cela n'est écrit dans le lot 1 :
la colonne et son index existent, le mécanisme est documenté ici.

## Évolutions de schéma

`Installer::install()` rejoue `dbDelta` — qui ajoute colonnes et index
manquants sans toucher au reste — puis `migrate($from, $to)` exécute, dans
l'ordre, les étapes numérotées qui ne se réduisent pas à un ajout (renommage,
transformation de données). Aucune étape n'existe aujourd'hui. Pour faire
évoluer le schéma : modifier le SQL dans `Schema`, incrémenter
`POSE_PARQUET_DB_VERSION`, ajouter un `case` dans `migrate()` si nécessaire.
La version n'est enregistrée qu'une fois les trois tables vérifiées présentes.

## Suppression des données

`uninstall.php` conserve les tables par défaut. Elles ne sont supprimées que si
`wp-config.php` contient `define( 'POSE_PARQUET_UNINSTALL_DROP_TABLES', true );`
au moment de la suppression du plugin. Raison : une suppression de plugin peut
être une erreur ou une migration ; des demandes de visiteurs perdues ne se
récupèrent pas.
