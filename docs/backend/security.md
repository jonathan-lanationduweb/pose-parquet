# Backend — sécurité (état après le lot 2)

## En place

- **Accès direct** : chaque fichier PHP sort si `ABSPATH` n'est pas défini ;
  `uninstall.php` exige `WP_UNINSTALL_PLUGIN`. Vérifié en HTTP à chaque lot
  (`tests/run-http.php`).
- **Requêtes SQL** : `$wpdb->insert/update/prepare()` partout où une valeur
  entre. Les seuls noms interpolés sont les noms de tables, formés du préfixe
  du site et d'une constante. Un nom de famille `'; DROP TABLE …; --` est
  stocké littéralement, la table est toujours là (test).
- **Validation serveur complète** (`Projects\Validator`, `Projects\Fields`) :
  listes fermées pour tout champ à domaine, bornes de longueur en caractères,
  surface entière 1–2000, email par `is_email()`, téléphone par motif
  français, HTML retiré des textes (`sanitize_text_field` /
  `sanitize_textarea_field`), URL d'origine réduite à son chemin. La
  validation du front est un confort ; celle-ci fait foi.
- **Champs sous contrôle du serveur** : `status`, `reference`, dates, `id`,
  `userId` sont **refusés** (422) s'ils arrivent dans la requête — pas
  ignorés. Tout champ inconnu est refusé aussi. `consent_at` est l'heure
  serveur ; une date fournie par le client n'est jamais prise en compte.
- **Bornes de charge** : corps > 16 Ko → 413 avant lecture ;
  `visualizer.config` > 4 Ko → 422 ; profondeur JSON limitée à 8. Aucun
  fichier, aucune image, aucun base64 n'a de place.
- **Écriture atomique** : insertion, référence et historique sous transaction
  InnoDB ; échec → rollback. Pas de ligne à moitié créée.
- **Droits** : trois capabilities accordées au rôle administrateur. Vérifié au
  lot 2 : `Capabilities::ensure()` n'écrit que si un droit manque
  (`has_cap` avant `add_cap`), et `maybe_upgrade()` se réduit à une
  comparaison d'entiers — aucune écriture en base à chaque requête.
- **REST** : `permission_callback` explicite sur chaque route. `/health` et
  `POST /projects` sont publiques ; aucune route de lecture n'existe.
- **Réponses d'erreur** : format `{code, message, fields}`, jamais de SQL, de
  chemin, de trace ni d'écho des données saisies (l'email n'est jamais
  renvoyé — testé).
- **Journal** : `Logger` n'écrit que si `WP_DEBUG`, et retire du contexte
  `email`, `phone`, `first_name`/`firstName`, `last_name`/`lastName`,
  `message`, `city`, `ip`, ainsi que toute clé qui transporterait un corps
  entier (`payload`, `body`, `input`, `data`, `fields`). Ce qui est journalisé :
  identifiant de requête, code, route, durée, id de demande, étape en échec.
  Testé : un dépôt avec email, prénom et téléphone sentinelles ne laisse rien
  dans `debug.log`.
- **Adresse IP** : ni stockée dans `pp_projects`, ni journalisée.
- **Secrets** : aucun dans le code ni dans le dépôt.
- **Publication** : `backend/` est exclu du déploiement GitHub Pages.

## CORS n'est pas une authentification

`Rest\Cors` restreint `Access-Control-Allow-Origin` à quatre origines sur
`/pose-parquet/v1/*`, sans jamais répondre `*`, et retire les en-têtes
permissifs que WordPress pose par défaut. Ce que cela fait : empêcher qu'un
site tiers utilise le navigateur d'un visiteur pour poster sur l'API à son
insu, et empêcher un script d'une autre origine de lire la réponse. Ce que
cela ne fait pas : arrêter un `curl`, un robot, ou quiconque forge la requête
sans navigateur — le test HTTP le montre, un POST depuis une origine inconnue
est traité (201) mais sans en-tête CORS. La protection de la route, ce sont
la validation, les bornes, et l'anti-spam du lot 3.

Le reste de l'API WordPress (`/wp/v2/*`) garde le CORS par défaut de
WordPress : hors périmètre du plugin, et à traiter au niveau du site en
préproduction (lot 6).

## Règles pour les lots suivants

- Anti-spam du dépôt de demande (lot 3) : honeypot, temps minimum de
  remplissage, limite de débit (transients éphémères, pas de colonne IP),
  puis Turnstile si le bruit le justifie. Le code 429 est réservé.
- Actions d'administration : nonce WordPress (`X-WP-Nonce` en REST),
  capabilities `pp_view_projects` / `pp_manage_projects`.
- Jamais de JWT ni de jeton en `localStorage` : authentification native.
- Emails : `wp_mail()` via une classe `Mail\Mailer` unique ; aucun couplage à un
  fournisseur.
- Données personnelles : durée de conservation et purge à décider avant la
  mise en production (RGPD), à documenter ici.
