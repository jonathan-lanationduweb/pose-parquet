# Backend — sécurité (état du lot 1, règles pour la suite)

## En place

- **Accès direct** : chaque fichier PHP sort si `ABSPATH` n'est pas défini ;
  `uninstall.php` exige `WP_UNINSTALL_PLUGIN`. Vérifié en HTTP : un fichier du
  plugin appelé directement renvoie une réponse vide.
- **Requêtes SQL** : `$wpdb->prepare()` partout où une valeur entre (contrôle
  de présence des tables via `information_schema`). Les seuls noms interpolés
  sont les noms de tables, formés du préfixe du site et d'une constante — jamais
  d'une entrée utilisateur.
- **Droits** : trois capabilities (`pp_view_projects`, `pp_manage_projects`,
  `pp_manage_settings`) accordées au rôle administrateur, ré-appliquées à
  chaque chargement (un plugin de rôles ou une restauration peut les effacer).
  La page d'administration vérifie `current_user_can()` avant de rendre.
- **REST** : `permission_callback` explicite sur chaque route. `/health` est
  publique parce qu'elle ne révèle rien du serveur (test automatique). Les
  routes d'administration à venir exigeront cookie + nonce + capability.
- **Journal** : aucune donnée personnelle — `Logger` retire `email`, `phone`,
  `first_name`, `last_name`, `message`, `ip` du contexte, et n'écrit que si
  `WP_DEBUG`. Testé.
- **Secrets** : aucun dans le code ni dans le dépôt. Le `wp-config.php` du
  WordPress de test vit hors dépôt (`C:\wamp64\www\pose-parquet-dev`) avec des
  clés de développement sans valeur. Le transport SMTP (Brevo ou autre) se
  réglera dans WordPress, pas dans le plugin.
- **Publication** : `backend/` est exclu du déploiement GitHub Pages
  (`.github/workflows/deploy-pages.yml`).

## Règles pour les lots suivants

- Toute entrée du formulaire est validée **côté serveur** avec des listes
  fermées pour les champs à domaine (types, délais, statuts) et
  `sanitize_text_field` / `sanitize_email` / `wp_kses_post` selon le champ ;
  la validation front n'est qu'un confort.
- Anti-spam du dépôt de demande (lot 3) : honeypot, temps minimum de
  remplissage, limite de débit par IP (transients), puis Turnstile si le bruit
  le justifie. Aucun de ces mécanismes n'est écrit dans le lot 1.
- Actions d'administration : nonce WordPress (`wp_nonce_field` / `check_admin_referer`,
  ou `X-WP-Nonce` en REST).
- Jamais de JWT ni de jeton en `localStorage` : authentification native.
- Emails : `wp_mail()` via une classe `Mail\Mailer` unique ; aucun couplage à un
  fournisseur.
- Données personnelles : durée de conservation et purge à décider avant la
  mise en production (RGPD), à documenter ici.
