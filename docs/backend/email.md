# Backend — emails transactionnels

Deux emails par demande, envoyés **après** le COMMIT : une notification
interne à l'équipe, un accusé de réception au visiteur. La base est la source
de vérité ; l'email est une notification. Un envoi qui échoue laisse un état
en base et ne défait rien.

## Où c'est écrit

```
src/Mail/Mailer.php                le seul appel à wp_mail() du plugin
src/Mail/Notifier.php              enchaîne les deux envois, enregistre leur sort
src/Mail/InternalNotification.php  sujet et corps de la notification interne
src/Mail/VisitorConfirmation.php   sujet et corps de l'accusé de réception
src/Mail/Template.php              rendu des gabarits, lignes et sections
src/Mail/Labels.php                libellés français des valeurs codées
templates/mail/layout.php          enveloppe commune
templates/mail/internal.php
templates/mail/visitor.php
```

Le code métier ne contient aucun gabarit : `InternalNotification` compose des
lignes, `Template` les rend. Aucun HTML dans une classe de service.

## Fournisseur

`wp_mail()`, rien d'autre. Le plugin ignore Brevo, SendGrid, Mailgun et tout
SMTP particulier : le transport se règle au niveau de WordPress ou de
l'hébergement (plugin SMTP, `phpmailer_init`). Changer de fournisseur ne
touchera pas une ligne de `src/Mail/`.

Le plugin ne fixe pas le `From` : c'est l'adresse légitime du site ou du
transport. L'adresse du visiteur n'est **jamais** un `From` — elle est un
`Reply-To` sur la notification interne, pour répondre d'un clic.

## Notification interne

Sujet : `Nouvelle demande Pose Parquet — PP-2026-000123`. Rien d'autre : ni
email, ni téléphone, ni adresse dans le sujet.

Corps : la référence, puis quatre blocs — **Client** (nom, email, téléphone),
**Projet** (région, département, ville, logement, pièce, surface, style,
parquet, support, pose, délai, message), **Configuration Visualiseur**
(seulement si présente), **Source** (page d'origine, campagne, date UTC).

Les valeurs codées sont traduites (`sejour` → « Séjour », `baton-rompu` →
« Bâton rompu »). Un champ vide n'affiche pas sa ligne ; un bloc sans ligne
n'apparaît pas. Aucun JSON brut, aucun nom de colonne, aucun champ technique.

Destinataire : le réglage **Adresse de réception des demandes**, par défaut
`get_option('admin_email')`. Aucune adresse personnelle n'est écrite dans le
code — un test le vérifie.

## Accusé de réception

Sujet : `Votre demande Pose Parquet a bien été reçue`. Corps : « Bonjour
&lt;prénom&gt; », la référence, un résumé d'une ligne (pièce, surface, pose,
département), « Nous reviendrons vers vous prochainement. » Pas de prix, pas
de délai chiffré, pas de discours commercial. Désactivable par réglage.

## HTML

Tableau centré, 560 px au plus, police système, styles en ligne, aucun script,
aucun framework. Le texte se comprend sans style : un test lit le corps
dépouillé de ses balises. Toutes les valeurs venant du visiteur passent par
`esc_html()` **dans le gabarit**, au moment d'écrire — un `<script>` saisi
dans un prénom s'affiche comme du texte.

## États en base

Quatre colonnes de `pp_projects` (schéma 3) :

| Colonne | Valeurs |
|---|---|
| `internal_mail_status` | `pending` `sent` `failed` |
| `internal_mail_sent_at` | date UTC si `sent`, NULL sinon |
| `visitor_mail_status` | `pending` `sent` `failed` `skipped` |
| `visitor_mail_sent_at` | date UTC si `sent`, NULL sinon |

`pending` : aucun envoi tenté (état initial, et celui des demandes créées
avant ce lot). `skipped` : confirmation désactivée dans les réglages.
Le **contenu** des emails n'est jamais stocké, et aucune donnée personnelle
n'est recopiée : ces colonnes ne portent qu'un mot et une date.

## Échecs

`wp_mail()` ne lève pas d'exception ; il rend `false`. Alors :

- la demande **reste** enregistrée, avec son historique ;
- la colonne d'état passe à `failed` ;
- une ligne de journal note `request_id`, `project_id`, `mail_type`,
  `error_code` — jamais l'adresse, le nom, le téléphone ni le corps ;
- la réponse publique reste `201` avec la référence. Le visiteur n'apprend
  pas qu'un email interne a échoué.

Les deux envois sont indépendants : l'un peut échouer sans empêcher l'autre.
Testé dans les quatre combinaisons (les deux réussissent, interne seul,
visiteur seul, les deux échouent) ; dans tous les cas la demande survit.

## Pas de doublon

`Notifier` est appelé **une fois**, en séquence, par `SubmissionService`.
Aucun `add_action` sur `wp_mail`, `pre_wp_mail` ou `phpmailer_init` : un hook
enregistré deux fois enverrait deux fois. Deux tests le garantissent — un POST
produit exactement deux appels à `wp_mail()`, et le plugin n'en contient qu'un
seul (`Mail\Mailer`).

## Réglages

*Pose Parquet → Réglages*, capability `pp_manage_settings`, Settings API
WordPress (nonce et vérification par `options.php`, capability abaissée par
le filtre `option_page_capability_pose_parquet_settings`). Une option,
`pose_parquet_settings`, deux clés :

- `notification_email` — validée par `is_email()` avant enregistrement ; une
  adresse invalide n'écrase pas l'ancienne et affiche une erreur ;
- `visitor_confirmation` — booléen, case à cocher.

Deux réglages, pas vingt : ce lot n'en a pas besoin de plus.

## Tests

Aucun email réel n'est envoyé : les tests court-circuitent `wp_mail()` par le
filtre `pre_wp_mail`, ce qui permet de lire destinataire, sujet, en-têtes et
corps, et de simuler un échec. Voir `readme.md` du plugin pour les commandes.
