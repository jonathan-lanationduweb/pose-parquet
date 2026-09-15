# Mettre le backend WordPress en production

> Ce document décrit ce qu'il faut faire **sur le serveur**, pas dans le dépôt.
> Rien de ce qui suit n'est appliqué automatiquement, et rien n'y est inventé :
> chaque valeur à fournir est signalée comme telle, avec ce qui arrive si elle
> manque.
>
> État au 14 septembre 2026 : le durcissement applicatif et serveur est en
> place et vérifié en local. Ce qui reste demande un hébergement, un domaine et
> un compte SMTP — c'est-à-dire des décisions humaines, listées en fin de page.

## 1. wp-config de production

Le wp-config local n'est pas un modèle : il déclare `WP_ENVIRONMENT_TYPE =
'local'` et laisse le débogage actif, ce qui est juste en recette et faux en
production. Voici ce que la production doit déclarer, et pourquoi.

```php
/* L'environnement, d'abord : c'est lui qui pilote le CORS du plugin. */
define( 'WP_ENVIRONMENT_TYPE', 'production' );

/* Débogage : rien à l'écran, rien dans la racine web. */
define( 'WP_DEBUG',         false );
define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_DEBUG_LOG',     false );   // ou un chemin HORS de la racine web
@ini_set( 'display_errors', '0' );     // PHP peut être plus bavard que WordPress

/* Personne ne modifie du code depuis l'administration. */
define( 'DISALLOW_FILE_EDIT',  true );
define( 'DISALLOW_FILE_MODS',  true );  // ni installation ni mise à jour par l'admin

/* Administration et connexion en HTTPS uniquement. */
define( 'FORCE_SSL_ADMIN', true );

/* Révisions et corbeille : ce site n'a pas de contenu éditorial. */
define( 'WP_POST_REVISIONS', false );
define( 'EMPTY_TRASH_DAYS', 7 );
```

**À ne pas recopier du local** : les huit clés de sécurité
(`AUTH_KEY`, `SECURE_AUTH_KEY`, …). Celles du wp-config local sont des chaînes
lisibles, écrites à la main pour une base jetable. La production doit en
générer de nouvelles, aléatoires, par
`https://api.wordpress.org/secret-key/1.1/salt/`.

`WP_DEBUG_LOG = false` plutôt qu'un chemin : en production on veut le journal
d'erreurs **du serveur**, pas un second fichier à surveiller. Si un
diagnostic ponctuel l'exige, donner un chemin absolu situé hors de la racine
web — jamais `true`, qui écrit dans `wp-content/debug.log`, c'est-à-dire dans
un dossier servi. C'est exactement le défaut relevé en local le 14/09/2026 :
265 Ko de journal lisibles en HTTP.

## 2. Règles serveur

Copier `backend/deploy/htaccess-hardening.conf` **au-dessus** du bloc
`# BEGIN WordPress` du `.htaccess`, ou transposer les mêmes règles dans la
configuration nginx. Elles ferment :

| Chemin | Avant | Après |
| --- | --- | --- |
| `/wp-content/debug.log` | 200 | 403 |
| `/readme.html` | 200 | 403 |
| `/license.txt` | 200 | 403 |
| `/xmlrpc.php` | 405 | 403 |
| `/wp-config.php.*.bak` | 200 | 403 |
| `/install-*.php` | 200 | 403 |

Le reste — énumération des utilisateurs par l'API REST, XML-RPC côté PHP,
archives d'auteur, balise `generator`, en-tête `X-Pingback` — est traité par le
plugin lui-même (`src/Security/Hardening.php`), donc sans rien à configurer.

Une sauvegarde de `wp-config` ne doit **jamais** rester sous la racine web. Sur
le serveur local, Apache l'exécutait au lieu d'en servir la source, ce qui a
masqué le problème ; sur un serveur ordinaire, elle rend le mot de passe de la
base en clair.

## 3. En-têtes de sécurité

À poser sur l'hébergement du backend **et** sur celui du site public. Aucun
n'est actif aujourd'hui : GitHub Pages ne permet pas de les définir, ce qui est
l'une des raisons de prévoir un autre hébergement pour la suite.

```apache
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
# HSTS : UNIQUEMENT quand le HTTPS est en place et vérifié. Un preload posé trop
# tôt rend le domaine inaccessible en HTTP pendant des mois.
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains"
```

Pour le **site public**, une politique de contenu stricte est possible parce
que le site ne charge aucun script tiers — vérifié : zéro requête sortante vers
un autre domaine.

```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' data: blob:;
  style-src 'self';
  script-src 'self';
  worker-src 'self' blob:;
  connect-src 'self' https://<hôte du backend>;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

`worker-src blob:` n'est pas une concession : le moteur de rendu fabrique ses
textures dans un Web Worker. `connect-src` doit nommer l'hôte du backend, qui
n'est pas encore décidé — c'est la seule directive en attente.

**Ne pas déclarer ces en-têtes comme actifs tant qu'ils n'ont pas été observés
sur l'hébergement réel.** Une politique écrite dans un document ne protège rien.

## 4. Emails

### Ce que le plugin fait, et ne fait pas

Il appelle `wp_mail()`, et rien d'autre. Aucun fournisseur n'est câblé, aucune
clé n'est stockée, aucun en-tête d'expéditeur n'est forcé. Le transport est une
affaire d'environnement, et il le reste : c'est ce qui permet de changer de
fournisseur sans toucher au code métier.

### Ce qu'il faut fournir

1. **Un transport SMTP authentifié.** Soit une extension de transport, soit un
   `phpmailer_init` dans un mu-plugin, soit les constantes SMTP de l'hébergeur.
   Le plugin détecte les trois et le dit dans *Pose Parquet → État*.
2. **Une adresse de réception**, dans *Pose Parquet → Réglages*. Tant qu'elle
   n'a pas été **enregistrée**, elle est héritée de l'adresse d'administration
   du site — et l'écran le dit désormais en toutes lettres. En local elle vaut
   `dev@example.test`, un domaine réservé par la RFC 2606 qui ne peut recevoir
   aucun message.
3. **Un expéditeur sur le domaine**, et **SPF, DKIM et DMARC alignés** sur lui.
   Sans cela les messages partiront, et finiront en indésirable — ce qui est
   pire qu'un échec, parce que rien ne le signale.

### La procédure de test réel, à exécuter une fois le SMTP en place

1. *Pose Parquet → Réglages* : saisir l'adresse de réception et **enregistrer**,
   même si la valeur affichée est déjà la bonne. L'enregistrement est ce qui
   fait passer l'adresse de « héritée » à « choisie ».
2. *Pose Parquet → État* : la section Emails doit montrer un transport détecté,
   un domaine joignable, et ne plus afficher l'avertissement de production.
3. Déposer une **vraie demande** depuis le formulaire public du site, avec une
   adresse de visiteur que vous relevez réellement.
4. Vérifier la réception des **deux** messages : la notification interne et
   l'accusé de réception du visiteur.
5. Ouvrir l'en-tête complet d'un message reçu et vérifier `spf=pass`,
   `dkim=pass`, `dmarc=pass`.
6. Dans *Pose Parquet → Demandes*, ouvrir la fiche : les deux états d'email
   doivent être `sent`, avec leur horodatage.
7. Répondre à la notification interne : le `Reply-To` doit ramener à l'adresse
   du visiteur, et le `From` rester celui du site.

Tant que ces sept points ne sont pas tous vérifiés, **le SMTP de production
n'est pas fonctionnel**, quoi qu'en dise n'importe quel écran.

### Comportement local, et pourquoi il est acceptable

Sur WAMP, `sendmail_path` est vide et aucun serveur n'écoute sur le port 25 :
`wp_mail()` rend `false`. Le plugin enregistre alors `failed` dans les colonnes
d'état et écrit une ligne de journal **sans aucune donnée personnelle** — et il
ne défait jamais la demande. Une demande reçue et non notifiée reste une
demande reçue. C'est le comportement voulu, et il est couvert par les tests.

## 5. Rétention des demandes

**Rien n'est purgé aujourd'hui, et rien ne doit l'être avant une décision.**

Une demande contient un nom, une adresse email, un téléphone, une ville et un
message libre. Le RGPD demande une durée de conservation *déterminée*, pas
nécessairement courte — mais déterminée, et écrite.

### Ce qui est décidé

Rien. La durée est la décision humaine qui manque, et elle ne s'invente pas :
trois mois effaceraient des prospects encore vivants, cinq ans conserveraient
des données sans usage. Elle dépend du cycle commercial réel.

### L'architecture prévue, quand la durée sera connue

| Point | Choix prévu |
| --- | --- |
| Réglage | une durée en mois dans *Réglages*, `0` = pas de purge |
| Déclenchement | une tâche planifiée quotidienne, jamais à la volée d'une requête |
| Critère | `updated_at`, pas `created_at` — une demande rouverte reste vivante |
| Demandes concernées | uniquement les statuts terminaux (`lost`, `done`) |
| Historique et notes | supprimés avec la demande, par la clé étrangère logique |
| Trace | une ligne de journal avec le **nombre** purgé, jamais une référence |
| Réversibilité | aucune — d'où la double condition de statut et de durée |

### Droit à l'effacement, en attendant

Il est déjà exerçable, manuellement : une demande se retrouve par sa référence
ou par l'adresse email dans *Pose Parquet → Demandes*. Ce qui manque est la
**procédure écrite** — qui traite la demande d'effacement, sous quel délai, et
ce qu'on répond. C'est un document d'exploitation, pas du code.

## 6. Ce qui reste bloqué sur une décision humaine

| Décision | Sans elle | Valeur attendue |
| --- | --- | --- |
| Hôte public du backend | le formulaire du site reste sans destinataire | un nom de domaine, ex. `admin.pose-parquet.com` |
| DNS de `pose-parquet.com` | le site reste sur l'adresse de préproduction | pointage vers l'hébergement retenu |
| Identifiants SMTP | aucun email ne peut partir | hôte, port, compte, mot de passe (jamais dans le dépôt) |
| Adresse de réception finale | les demandes arrivent à l'adresse d'administration | une boîte réellement relevée |
| Durée de conservation | aucune purge, donc conservation indéfinie | une durée en mois |
| Hébergement cible | aucun en-tête de sécurité possible | un hébergeur permettant de définir les en-têtes |
