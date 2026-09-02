# Formulaire projet : état réel et ce qu'il manque avant le lancement

## État constaté

Le formulaire de `projet/` fonctionne : validation, étapes, résumé, envoi. Mais
**aucun destinataire n'est branché.**

`js/forms/submit-adapter.js` :

```js
export async function submitProject(payload) {
  if (!config.endpoint) {
    storeLocally(payload);                 // localStorage, 20 dernières demandes
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, mode: 'local' };    // ← succès annoncé
  }
  …
}
```

`config.endpoint` vaut `null` et rien n'appelle `configureSubmit()`. Donc, à ce
jour : la demande est écrite dans le `localStorage` du visiteur, l'adaptateur
renvoie un succès, et **personne ne reçoit rien.**

## Ce qui a été corrigé dans cette passe

Le comportement technique n'a pas changé — brancher un backend n'était pas
l'objet de cette passe. Ce qui a changé, c'est ce que le visiteur lit.

Avant, l'écran de fin affichait :

> **Demande enregistrée**
> Merci, votre projet est bien décrit.
> Nous revenons vers vous rapidement.

C'est une promesse fausse faite à quelqu'un qui vient de saisir son adresse, son
budget et le détail de son chantier. Désormais, quand l'adaptateur renvoie
`mode: 'local'` ou `mode: 'noop'`, l'écran de fin dit :

> **Mode démonstration**
> Votre demande n'a pas été envoyée.
> Ce formulaire fonctionne, mais aucun destinataire n'est encore branché : votre
> demande est restée dans ce navigateur et personne ne l'a reçue. Pour nous
> joindre dès maintenant, passez par la page contact.

Le message redevient vrai automatiquement le jour où un `endpoint` est
configuré : l'adaptateur renvoie alors `mode: 'remote'` et l'écran de
remerciement normal réapparaît. **Il n'y a rien à penser à enlever.**

## Ce qu'il faut avant le lancement

Trois choses, dans cet ordre.

### 1. Un point de réception

Le site est statique, hébergé sur GitHub Pages : il n'y a pas de serveur.
Options, de la plus légère à la plus lourde :

| solution | avantages | à vérifier |
| --- | --- | --- |
| Service de formulaire hébergé (Formspree, Basin, Web3Forms…) | branché en une ligne, pas de code serveur | traitement des données personnelles, sous-traitant hors UE, tarif au volume |
| Fonction serverless (Netlify / Vercel / Cloudflare Worker) | on maîtrise le code et la destination, coût quasi nul | il faut un compte et un déploiement à part du site |
| Boîte mail via un relais SMTP | simple à comprendre | une clé d'API dans du JavaScript public est exposée : il faut un intermédiaire |

Quel que soit le choix : **jamais de clé d'API dans le JavaScript du site.**
Le code est public, la clé aussi.

### 2. Le branchement

Une seule ligne, au démarrage :

```js
import { configureSubmit } from './js/forms/submit-adapter.js';
configureSubmit({ endpoint: 'https://…/leads' });
```

L'adaptateur existe précisément pour ça : aucun autre fichier n'est à toucher.

### 3. Conformité et robustesse

- [ ] **RGPD** : finalité, base légale, durée de conservation, destinataire.
      Le formulaire collecte au minimum une adresse email et la description d'un
      logement — ce sont des données personnelles.
- [ ] **Consentement** : une case explicite, non pré-cochée, et un lien vers la
      politique de confidentialité — qui reste à écrire.
- [ ] **Anti-spam** : sans protection, un formulaire public reçoit du spam sous
      quelques jours. Un piège à robots (champ caché) ou le mécanisme du
      prestataire.
- [ ] **Accusé de réception** au demandeur, avec un délai de réponse réaliste.
- [ ] **Notification** au destinataire, et une adresse de secours si l'envoi
      échoue.
- [ ] **Sortie du `localStorage`** : une fois un endpoint branché, la sauvegarde
      locale devient un filet en cas d'échec réseau, plus le mécanisme
      principal. Vérifier qu'elle ne conserve pas de données personnelles plus
      longtemps que nécessaire.
- [ ] **Test réel** de bout en bout, depuis le domaine de production.

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

**Ne jamais laisser en production un envoi qui ne part pas.** Si le point de
réception n'est pas prêt le jour du lancement, le formulaire doit soit être
retiré, soit annoncer clairement qu'il est en démonstration — ce qu'il fait
aujourd'hui.
