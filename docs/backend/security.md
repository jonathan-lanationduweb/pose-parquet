# Backend — sécurité (état après le lot 3)

## En place

- **Accès direct** : chaque fichier PHP sort si `ABSPATH` n'est pas défini ;
  `uninstall.php` exige `WP_UNINSTALL_PLUGIN`. Vérifié en HTTP à chaque lot
  (`tests/run-http.php`).
- **Requêtes SQL** : `$wpdb->insert/update/prepare()` partout où une valeur
  entre. Les seuls noms interpolés sont les noms de tables, formés du préfixe
  du site et d'une constante. Un nom de famille `'; DROP TABLE …; --` est
  stocké littéralement, la table est toujours là (test).
- **Ordre du pipeline** : contrôle de transport, anti-spam, validation, puis
  écriture sous transaction, puis emails. Rien n'écrit avant le COMMIT, rien
  ne défait après. Voir `architecture.md`.
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
- **Réglages** : page réservée à `pp_manage_settings`, Settings API — nonce et
  contrôle de capability par `options.php`, capability abaissée de
  `manage_options` par le filtre prévu. Adresse validée par `is_email()` avant
  enregistrement ; une valeur invalide n'écrase pas l'ancienne. Aucune adresse
  personnelle codée dans le plugin (testé).
- **Anti-spam** : pot de miel `website`, jeton temporel signé HMAC (2 s
  minimum, 2 h de validité), limite de débit 5 créations et 30 tentatives par
  heure et par identité réseau, avec `429` et `Retry-After`. Le compteur de
  tentatives s'incrémente **avant** la validation : pas de banc d'essai
  gratuit pour le validateur. Rien de refusé n'atteint la base ni les emails.
  Détails et limites assumées : `antispam.md`.
- **Adresse IP** : jamais stockée, jamais journalisée. Seul `REMOTE_ADDR` est
  lu (`X-Forwarded-For` et compagnie sont falsifiables et donc ignorés, sauf
  filtre explicite derrière un proxy de confiance), puis condensé en HMAC
  avec un sel du site. Les noms de transients ne portent que ce condensat.
- **Emails** : `wp_mail()` seul, aucun couplage fournisseur, `From` non forcé,
  adresse du visiteur en `Reply-To` uniquement (`is_email()` interdit toute
  injection d'en-tête). Envois **après** le COMMIT : un échec laisse la
  demande intacte et n'est qu'un état en base. Valeurs utilisateur échappées
  dans les gabarits ; aucun script, aucun HTML actif dans un email.
- **REST** : `permission_callback` explicite sur chaque route. `/health`,
  `/form-token` et `POST /projects` sont publiques ; aucune route de lecture
  de demande n'existe.
- **Réponses d'erreur** : format `{code, message, fields}`, jamais de SQL, de
  chemin, de trace ni d'écho des données saisies (l'email n'est jamais
  renvoyé — testé).
- **Journal** : `Logger` n'écrit que si `WP_DEBUG`, et retire du contexte
  `email`, `phone`, `first_name`/`firstName`, `last_name`/`lastName`,
  `message`, `city`, `ip`, toute clé qui transporterait un corps entier
  (`payload`, `body`, `input`, `data`, `fields`), et les clés techniques
  (`formToken`, `token`, `to`, `reply_to`, `remote_addr`, `website`). Ce qui
  est journalisé : identifiant de requête, code, route, durée, id de demande,
  type d'email, code d'erreur générique, étape en échec. Testé : un dépôt avec
  email, prénom et téléphone sentinelles ne laisse rien dans `debug.log`, et
  un échec d'email n'y écrit ni adresse ni corps de message.
- **Champs techniques** : `formToken` et `website` sont acceptés par l'API,
  retirés avant la validation métier, absents de `pp_projects` et du journal.
- **Secrets** : aucun dans le code ni dans le dépôt. Le secret du jeton et
  celui du condensat d'IP sont dérivés des sels du `wp-config.php` du site :
  rien à versionner, rien à faire tourner à la main. Un fichier du plugin
  appelé directement ne rend rien (testé sur `FormToken.php`).
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
la validation, les bornes, et l'anti-spam — **un bot serveur n'est pas soumis
à CORS**, et CORS ne remplace donc jamais l'anti-spam.

Le reste de l'API WordPress (`/wp/v2/*`) garde le CORS par défaut de
WordPress : hors périmètre du plugin, et à traiter au niveau du site en
préproduction (lot 6).

## Où vivent les données personnelles

L'email interne contient les coordonnées du prospect : c'est sa fonction, et
c'est le seul endroit hors base où elles circulent. Elles ne sont copiées **ni**
dans le journal, **ni** dans une option, **ni** dans l'historique de statut,
**ni** dans un transient d'anti-spam. Les colonnes d'état des emails ne
portent qu'un mot et une date.

## Règles pour les lots suivants

- Turnstile si le bruit le justifie (lot 6) : un contrôle de plus dans
  `Antispam\Guard`, sans toucher au reste.
- Actions d'administration : nonce WordPress (`X-WP-Nonce` en REST),
  capabilities `pp_view_projects` / `pp_manage_projects`.
- Jamais de JWT ni de jeton en `localStorage` : authentification native.
- Données personnelles : durée de conservation et purge à décider avant la
  mise en production (RGPD), à documenter ici.
