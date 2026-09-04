# Backend — architecture

## Décision

Le backend métier de pose-parquet.com est **WordPress + un plugin dédié**
(`Pose Parquet`, dossier `pose-parquet-core`). WordPress ne sert pas le site :
il est un back-office et une API. Le site public reste le front HTML/CSS/JS de
ce dépôt, généré par `_generator/build.js`, déployé à part.

```
navigateur ── site statique (GitHub Pages aujourd'hui, hébergeur définitif demain)
     │
     │  fetch JSON
     ▼
/wp-json/pose-parquet/v1/…  ──►  plugin pose-parquet-core  ──►  tables {prefix}pp_*
                                  (WordPress : users, options, roles, wp_mail)
```

Ce que WordPress apporte sans qu'on l'écrive : comptes et connexion de
l'équipe, rôles et capabilities, options et Settings API, envoi d'email
(`wp_mail`, dont le transport SMTP est réglé au niveau du site, pas du
plugin), transients pour la limite de débit, sels pour signer un jeton, REST
avec authentification par cookie + nonce pour l'administration.

Ce qu'on refuse : convertir le front en thème, stocker les demandes en articles,
dépendre d'ACF, WooCommerce ou d'un constructeur de pages.

## Périmètre du plugin (à terme)

Demandes de projet, statuts, notes, historique, emails, anti-spam, réglages,
permissions, API REST publique (dépôt d'une demande) et privée (administration).

## Le pipeline d'un dépôt public

Un seul chemin d'écriture, `Projects\SubmissionService`, et un ordre qui ne
change pas :

```
POST /projects
  contrôle de transport (corps présent, JSON lisible, ≤ 16 Ko)   ProjectsController
  limite de tentatives · pot de miel · jeton temporel            Antispam\Guard
  limite de créations                                            Antispam\RateLimiter
  ── validation métier                                           Projects\Validator
  ── transaction : demande → référence → historique → COMMIT     Projects\Service
  ── notification interne, puis confirmation visiteur            Mail\Notifier
  201 { success, reference }
```

Deux règles de séparation, tenues par cette architecture :

- **avant le COMMIT**, rien n'écrit hors de la transaction ; ce qui est refusé
  ne laisse aucune trace (ni demande, ni historique, ni email) ;
- **après le COMMIT**, rien ne peut défaire la demande. Un email en échec
  n'est qu'un état en base. La base est la source de vérité, l'email une
  notification. Aucun email n'annonce donc une demande non enregistrée.

`SubmissionService` orchestre, il ne fait rien lui-même : chaque étape a sa
classe (`Guard`, `Validator`, `Service`, `Notifier`), et `Service` — validation
et écriture — est resté celui du lot 2.

Plus tard, et seulement plus tard : catalogue et synchronisation Premibel
(gelés aujourd'hui), passerelle vers un service Python d'analyse d'image.

## Ce que le plugin ne fera jamais

Il ne rend pas de parquet, ne lit pas WebGL, n'interprète pas `SceneData`. Le
jour où le service Python existera, WordPress ne fera que **transporter** —
`analysis_id`, `status`, `scene_data_version`, `scene_data` — et jouer le rôle
de garde : authentification, quota, journalisation. Le rendu reste dans le
navigateur. Voir `docs/future-ai-api-contract.md` et
`docs/future-python-architecture.md`, écrits côté front et toujours valables.

## Emplacement dans le dépôt

`backend/pose-parquet-core/`. Le dossier `backend/` est exclu du déploiement
GitHub Pages par une ligne ajoutée au workflow (`--exclude 'backend'`), vérifiée
en rejouant la liste d'exclusions : du PHP sur un hébergement statique serait
au mieux inutile, au pire lisible par n'importe qui. Le plugin n'a aucune
dépendance vers le reste du dépôt : il est prêt à partir dans son propre
dépôt quand ce sera utile.

## Environnement de test

Un WordPress local dédié (`C:\wamp64\www\pose-parquet-dev`, base
`pose_parquet_dev`, préfixe `ppdev_`, servi par le serveur PHP intégré sur
`127.0.0.1:8181`) — jamais un site client. Le préfixe volontairement différent
de `wp_` fait échouer tout `wp_` codé en dur.
