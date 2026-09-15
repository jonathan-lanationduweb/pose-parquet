# Formulaire projet : état réel et ce qu'il manque avant le lancement

Mis à jour le 7 septembre 2026, après le branchement du formulaire sur le
backend WordPress (lot 5).

## État constaté

Le formulaire de `projet/` envoie pour de vrai, là où un backend existe.
`js/forms/api-config.js` associe chaque hôte du front à sa racine REST :

| Hôte | Backend | Ce que vit le visiteur |
|---|---|---|
| `localhost` (développement) | WordPress dédié sur `http://pose-parquet-dev.local` | la demande est enregistrée, la référence du serveur s'affiche |
| `jonathan-lanationduweb.github.io` | **aucun** (`null`) | le formulaire annonce qu'il n'est pas relié et renvoie vers la page contact |
| `pose-parquet.com`, `www.` | **aucun** (`null`) | idem |

Ce qui a disparu au lot 5 : le mode démonstration, qui écrivait la demande dans
le `localStorage` du visiteur et **annonçait un succès** sans qu'aucune requête
ne parte. Il n'y a plus de chemin de ce genre. L'écran de confirmation
n'apparaît que sur un `201` réellement reçu, et affiche la référence rendue par
le serveur.

L'ancienne piste — service de formulaire hébergé, fonction serverless, relais
SMTP appelé depuis le navigateur — est abandonnée : le site parle à un
WordPress qui porte la base, les emails, l'anti-spam et l'administration des
demandes. Voir `docs/backend/`.

La règle « jamais de clé d'API dans le JavaScript du site » reste entière, et
elle est respectée : le front n'a aucun secret. Le jeton anti-spam est public
par construction, à usage unique et de courte durée, et ne quitte jamais la
mémoire du navigateur.

## Définir l'API au déploiement, sans toucher au code (14/09/2026)

Le tableau ci-dessus reste le défaut, mais il n'est plus le seul chemin — et ce
n'était pas tenable : l'adresse du backend est une donnée d'environnement, et
elle demandait jusqu'ici un commit dans `js/forms/api-config.js`, c'est-à-dire
une modification de code métier pour une valeur de configuration.

Le générateur écrit désormais un fichier `config.js` à la racine, **neutre** :

```js
window.POSE_PARQUET_CONFIG = window.POSE_PARQUET_CONFIG || {};
```

Aucune adresse n'y est posée, donc le tableau des hôtes décide seul, exactement
comme avant. Seule la page `projet/index.html` le charge — c'est la seule qui
parle au backend — et en script classique, donc avant les modules.

Au déploiement, si la variable de dépôt `API_BASE_URL` est définie, le workflow
remplace **ce seul fichier** :

```js
window.POSE_PARQUET_CONFIG.apiBaseUrl = "https://admin.pose-parquet.com/wp-json/pose-parquet/v1";
```

Le workflow refuse une adresse qui n'est pas en HTTPS, et vérifie que le fichier
a bien été écrit. Rien d'autre n'est réécrit : le code métier n'est jamais
touché par un déploiement.

Conséquence pratique : brancher le formulaire sur le backend, le jour venu, ne
demandera **ni commit ni reconstruction** — seulement de renseigner une variable
et de relancer le déploiement. Et le débrancher, en cas de problème, est aussi
rapide.

## L'indisponibilité se dit maintenant AVANT la saisie (14/09/2026)

Le message existait déjà, et il était honnête. Il arrivait seulement trop tard :
le visiteur remplissait cinq étapes, cliquait « Envoyer », et apprenait à ce
moment-là que rien ne partirait.

Quand aucun backend n'est configuré pour l'hôte, le formulaire affiche
maintenant, **au-dessus de la première étape**, un bandeau qui dit ce qu'il en
est et donne l'adresse email qui, elle, fonctionne. Le bouton d'envoi est
désactivé — un bouton actif au bout de cinq étapes est une promesse, et
celle-là ne serait pas tenue. Les étapes restent navigables : elles servent
aussi à préparer ce qu'on va écrire.

Le bandeau disparaît de lui-même le jour où un backend est configuré. C'est un
état, pas une décision de conception, et rien n'est à défaire.

## Ce qu'il faut avant le lancement

### 1. Héberger le backend

Rien n'est déployé. Le WordPress de développement vit sur cette machine
seulement. Il faut un WordPress en préproduction puis en production, en HTTPS
avec un certificat valide — une page en `https://` ne peut pas appeler une API
en `http://`.

Puis, dans l'ordre : renseigner la racine REST réelle dans `PAR_HOTE`
(`js/forms/api-config.js`), déclarer les origines CORS autorisées côté plugin
(constante `POSE_PARQUET_ALLOWED_ORIGINS` ou filtre
`pose_parquet_allowed_origins`, jamais `*`), configurer un vrai SMTP, et
renseigner l'adresse destinataire dans « Pose Parquet → Réglages » — elle n'est
codée nulle part.

La liste détaillée est dans
[`docs/backend/front-integration.md`](backend/front-integration.md).

### 2. Conformité et robustesse

- [x] **Anti-spam** : pot de miel hors cadre, jeton temporel signé, limite de
      débit par condensat d'IP (lot 3).
- [x] **Accusé de réception** au demandeur et **notification** au destinataire,
      avec états d'envoi en base ; un échec d'email ne supprime jamais la
      demande enregistrée (lot 3).
- [x] **Sortie du `localStorage`** : plus aucune demande n'y est écrite.
- [x] **Consentement** : case explicite, non pré-cochée ; la date est celle du
      serveur, jamais celle du navigateur.
- [ ] **Politique de confidentialité** : le lien existe, la page reste à
      écrire.
- [ ] **RGPD** : finalité, base légale, **durée de conservation** et
      destinataire à formaliser. Le formulaire collecte une adresse email, un
      téléphone et la description d'un logement — ce sont des données
      personnelles. La purge automatique n'est pas écrite (prévue au lot 6).
- [ ] **Délai de réponse** : l'écran de confirmation ne promet rien de chiffré
      (« nous vous répondrons par email ou par téléphone »). Le jour où
      l'équipe s'engage sur un délai, c'est là qu'il s'écrit — et pas avant.
- [ ] **Test réel** de bout en bout depuis le domaine de production.

## Adresses email affichées

Le site affiche `projet@pose-parquet.com` et `bonjour@pose-parquet.com`
(`_generator/layout.js`, `contact/`, le `<noscript>` du formulaire).

**Je n'ai pas pu vérifier que ces boîtes existent et reçoivent.** Le domaine
`pose-parquet.com` pointe encore vers l'ancien hébergement (Online.net,
62.210.16.62) ; ses enregistrements MX ne sont pas sous notre contrôle depuis ce
dépôt, et rien dans le projet ne le documente.

C'est une **vérification humaine à faire avant le lancement** :

- [ ] `projet@pose-parquet.com` existe et arrive dans une boîte lue ;
- [ ] `bonjour@pose-parquet.com` idem ;
- [ ] test d'envoi réel depuis une adresse extérieure ;
- [ ] si elles n'existent pas : les créer, ou retirer les mentions du site.

Afficher une adresse qui ne reçoit pas est exactement le même défaut que le
faux envoi de formulaire — sauf que l'interface ne peut pas le détecter.

## Règle

**Ne jamais laisser en production un envoi qui ne part pas.** Elle est
désormais tenue par le code plutôt que par la vigilance : là où aucun backend
n'est configuré, le formulaire le dit et n'affiche aucun succès. Il n'y a plus
de chemin par lequel l'interface annonce « demande envoyée » alors que rien
n'est parti.
