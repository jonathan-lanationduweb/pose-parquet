# Publier le site depuis WordPress

    Enregistrer  →  Prévisualiser  →  Publier le site

Aucune ligne de commande pour publier une modification faite dans WordPress.

## Avant

1. modifier dans WordPress ;
2. ouvrir un terminal dans le dépôt ;
3. `node _generator/wordpress.js pull` (export → `data/wordpress/contenus.json`) ;
4. `node _generator/build.js` (ou `node _generator/contenus.js`, qui enchaîne 3 et 4) ;
5. publier le dépôt (push → GitHub Actions → GitHub Pages).

Dépendances : Node (≥ 18, `fetch`), le dépôt du site, le générateur, et —
piège relevé dans ce lot — `build.js` écrit par défaut dans
`%USERPROFILE%\Desktop\pose-parquet.com` : lancé par un autre compte (le
service Apache tourne en LocalSystem), il aurait écrit ailleurs. Le script de
publication et le workflow passent donc toujours `SITE_ROOT` explicitement.

## Après

Pose Parquet → **Tableau de bord** (panneau « Site public ») ou
Pose Parquet → **Publication** :

| État | Quand |
|---|---|
| Site à jour | l'export WordPress = l'instantané publié |
| Modifications à publier | ils diffèrent (liste des changements sur l'écran Publication) |
| Publication en cours | verrou posé ; bouton désactivé, l'écran se met à jour seul |
| Échec de publication | la dernière tentative a échoué et rien n'a été publié depuis ; raison lisible |

« Modifications à publier » se calcule, rien n'est à mémoriser : l'export
actuel est comparé à `data/wordpress/contenus.json` publié (dossier local du
site, sinon le site public). Guide, tutoriel, inspiration, page, Mon site,
maintenance : tout ce qui change ce que le site afficherait apparaît. Un
brouillon, qui n'est pas exporté, n'apparaît pas.

**Prévisualiser** ouvre l'écran Publication : chaque changement, avec l'aperçu
public des guides et tutoriels (gabarit réel du site) et le lien d'édition.

**Maintenance** : le bouton bascule WordPress immédiatement, le site statique à
la publication. Tant que ce n'est pas publié, l'écran Maintenance, le panneau
et le tableau de bord affichent « Maintenance activée — publication
nécessaire » (ou « désactivée »).

## Deux modes, choisis par l'installation

### Local — `node _generator/publier.js`

Choisi automatiquement quand le dossier du site est réglé (Réglages → Site
public) et que Node est trouvé (`POSE_PARQUET_NODE` dans wp-config.php, sinon
`C:\Program Files\nodejs\node.exe`, `/usr/local/bin/node`, `/usr/bin/node`).

WordPress lance, en tâche de fond, une commande FERMÉE :

    node <dépôt>/_generator/publier.js --etat <wp-content/pp-publication/publication-etat.json> --export <home>/wp-json/pose-parquet/v1/contenus

Les quatre valeurs sont calculées par le plugin et passées par
`escapeshellarg` ; le module ne lit aucun paramètre de la requête (testé). Le
script refuse tout autre nom de fichier d'état ou toute autre adresse
d'export.

1. export + validation (`valider-wordpress.js`) — une erreur arrête tout,
   l'instantané n'est pas écrit ;
2. build dans un processus séparé, 4 minutes au plus ;
3. échec du build → l'instantané d'avant est remis et le site reconstruit à
   l'identique (build déterministe) : aucun site à moitié construit.

L'état (`wp-content/pp-publication/`, interdit au web) est relu par
WordPress ; une publication sans nouvelles depuis 10 minutes est close en
échec. Durée mesurée : 6 à 12 s.

### Préproduction / production — GitHub Actions

Le WordPress distant n'a ni le dépôt ni Node. La chaîne :

    WordPress « Publier le site »
      → POST https://api.github.com/repos/jonathan-lanationduweb/pose-parquet/dispatches
        { "event_type": "wordpress-publish", "client_payload": { "demande_le": <date>, "par": <id utilisateur> } }
      → .github/workflows/deploy-pages.yml (déclencheur repository_dispatch)
      → node _generator/contenus.js "$WP_EXPORT_URL"   (export → validation → build)
      → contrôles de l'artefact → déploiement GitHub Pages
      → WordPress lit GET /repos/…/actions/runs?event=repository_dispatch&per_page=1
        et clôt la publication : succès seulement quand le run est « completed / success ».

Le signal ne transporte AUCUN contenu : le workflow va chercher l'export lui-même.

#### Prérequis (à faire par le propriétaire du dépôt — non faisables depuis WordPress)

1. **Le workflow sur la branche par défaut.** Un `repository_dispatch` ne
   déclenche QUE les workflows de la branche par défaut (`main`). Tant que la
   version de `deploy-pages.yml` qui écoute `wordpress-publish` n'y est pas,
   GitHub répond 204 mais ne lance rien ; WordPress le détecte après trois
   minutes et affiche « aucun workflow n'a démarré ».
2. **Un WordPress joignable depuis Internet.** Les runners GitHub tirent
   `WP_EXPORT_URL` et téléchargent les images téléversées (`/wp-content/uploads/`).
   Un WordPress local (`pose-parquet-dev.local`) ne l'est pas : la
   préproduction a besoin d'un WordPress de préproduction en ligne.
3. **Le jeton et la variable** (ci-dessous).

#### Le jeton : lequel, où, pour quoi, comment le révoquer

- **Quoi** : un *fine-grained personal access token* GitHub (ou, mieux pour
  une équipe, une GitHub App installée sur ce seul dépôt), restreint au dépôt
  `jonathan-lanationduweb/pose-parquet`, permissions **Contents : read and
  write** (exigée par l'API pour `repository_dispatch`) et **Actions : read**
  (suivre le run). Rien d'autre ; expiration courte (90 jours) recommandée.
- **Où** : UNIQUEMENT dans le `wp-config.php` du WordPress distant :

      define( 'POSE_PARQUET_GITHUB_REPO', 'jonathan-lanationduweb/pose-parquet' );
      define( 'POSE_PARQUET_GITHUB_TOKEN', '<jeton>' );
      // facultatif : define( 'POSE_PARQUET_PUBLICATION', 'github' );
      // facultatif : define( 'POSE_PARQUET_ENVIRONNEMENT', 'production' ); // sinon « Préproduction GitHub » dans le journal

  Jamais dans la base, jamais dans le dépôt, jamais dans GitHub (le workflow
  n'en a pas besoin), jamais dans le navigateur (testé : absent de la page).
- **Ce qu'il permet** : déclencher les workflows du dépôt et lire leurs runs.
  Avec « Contents : write », il pourrait aussi écrire dans le dépôt : c'est la
  raison de préférer une GitHub App ou un jeton à durée courte.
- **Révocation** : GitHub → Settings → Developer settings → Personal access
  tokens → Fine-grained tokens → le jeton → *Revoke* ; puis retirer la
  constante de `wp-config.php` (le bouton passe alors en « aucune
  publication configurée »).

Côté dépôt : Settings → Secrets and variables → Actions → **Variables** →
`WP_EXPORT_URL` = `https://<wordpress-preprod>/wp-json/pose-parquet/v1/contenus`.
C'est une variable, pas un secret : l'export est public (voir ci-dessous).

Avec `WP_EXPORT_URL` déclarée, CHAQUE déploiement (push compris) reconstruit
depuis WordPress : un push ne peut pas republier un ancien instantané. Sans
elle, le workflow publie le dépôt tel quel (comportement d'avant).

#### L'export est public, et ne contient que du publiable

`GET /wp-json/pose-parquet/v1/contenus` répond sans authentification. Audité
le 07/10/2026 : 102 Ko ; sections version, maintenance, guides, tutoriels,
inspirations, pages, site ; seulement les contenus **publiés** (les deux
contenus de test en corbeille n'y sont pas) ; aucun projet, aucune note,
aucune coordonnée (seule adresse : l'adresse publique du contact), aucun
utilisateur, aucun jeton, aucun nonce, aucun chemin de fichier ; hôtes cités :
le dossier d'images de WordPress, premibel.fr, allure-design.com.

#### Maintenance sur GitHub Pages

GitHub Pages ne sait pas répondre 503. La maintenance publiée y est un
**repli statique** : chaque page répond **HTTP 200** et redirige aussitôt
(script en tête de page) vers `maintenance.html` (`noindex`) ; `?apercu=1`
permet de voir le vrai site. Le vrai 503 + Retry-After n'existe que sur le
WordPress lui-même et avec `serve.js` en local.

## Sécurité

- droit `pp_manage_settings` (administrateurs) + jeton WordPress ; le
  gestionnaire des projets est refusé ;
- aucune commande, aucun chemin, aucun paramètre venant du navigateur ;
- une seule publication à la fois (verrou atomique `add_option`) ;
- journal des 15 dernières publications : date, environnement (Local /
  Préproduction GitHub / Production), utilisateur, résultat, durée, empreinte ;
- signal GitHub accepté mais aucun run au bout de 3 minutes : échec explicite.

Tests : `php tests/run-publication.php <racine WordPress>`.
