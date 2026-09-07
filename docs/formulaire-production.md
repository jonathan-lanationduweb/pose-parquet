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
