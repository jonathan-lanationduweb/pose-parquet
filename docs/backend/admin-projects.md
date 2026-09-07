# Administration des demandes

Deux écrans dans l'administration WordPress : la **liste** des demandes et la
**fiche** de l'une d'elles. Aucun framework JavaScript, aucun fichier `.js`
ajouté par ce lot : du PHP côté serveur, du HTML, et une feuille de style de
deux cents lignes posée sur celle de WordPress.

## Menu

```
Pose Parquet
├── Demandes     l'écran de travail — c'est aussi l'entrée parente
├── Réglages     adresse de réception, confirmation visiteur (lot 3)
└── État         diagnostic technique
```

L'entrée parente **est** « Demandes ». Il n'y a pas de page d'accueil
intermédiaire : un tableau de bord séparé aurait répété la liste avec moins
d'informations. Les compteurs par statut qu'il aurait portés sont là où ils
servent, en onglets de filtre au-dessus du tableau.

« État » descend en dernier et reste réservée à `pp_manage_settings`. C'est une
page de diagnostic, pas un écran de gestion ; un gestionnaire ne la voit pas.

## Droits

| Écran ou action | Capability |
|---|---|
| Liste, fiche | `pp_view_projects` |
| Changer un statut, ajouter une note | `pp_manage_projects` |
| Réglages, État | `pp_manage_settings` |

La capability passée à `add_menu_page()` masque l'entrée de menu ; elle
**n'interdit pas l'URL**. Chaque page revérifie donc la sienne à l'affichage,
et chaque poignée d'écriture avant toute autre chose. Un abonné qui tape
`admin.php?page=pose-parquet` reçoit un 403, pas une liste de données
personnelles.

### Rôle « Gestionnaire Pose Parquet »

`pose_parquet_manager`, créé à l'activation et re-complété à chaque
chargement — les rôles vivent en base, un plugin de gestion de rôles ou une
restauration peut les avoir amputés.

```
read                  laissez-passer minimal de /wp-admin
pp_view_projects      lire les demandes
pp_manage_projects    changer un statut, écrire une note
```

Pas `pp_manage_settings` : les réglages touchent l'adresse de réception des
demandes, donc l'acheminement des emails.

Vérifié en session réelle : un utilisateur portant ce seul rôle voit trois
entrées de menu — Tableau de bord, Pose Parquet, Profil — et rien d'autre. Ni
Articles, ni Médias, ni Pages, ni Apparence, ni Extensions, ni Comptes, ni
Outils, ni Réglages. Cette simplicité vient de ce qu'il ne possède pas ces
droits, **pas** de ce qu'on lui cacherait des écrans : rien n'est retiré aux
administrateurs WordPress.

## Liste

Huit colonnes : Référence, Date, Client (nom + email), Téléphone, Ville,
Surface, Projet, Statut. La référence est le lien vers la fiche. Un état
`failed` de la notification interne s'affiche en rouge sous la référence — la
seule information d'email qui remonte dans la liste, parce que c'est la seule
qui demande une action.

**Ordre** : `created_at DESC, id DESC`. La date seule ne suffit pas à ordonner
deux demandes arrivées dans la même seconde, et une pagination dont l'ordre
n'est pas total répète ou saute des lignes entre deux pages.

**Pagination** : vingt par page (`Repository::PER_PAGE`), rendue par
`paginate_links()`. Une page demandée au-delà de la dernière ramène sur la
dernière au lieu d'afficher un tableau vide — ce qui arrive tout seul quand on
filtre depuis la page 4 vers un statut qui n'a qu'une page.

**Filtres** : les sept statuts plus « Tous », avec leur nombre. Les valeurs et
les libellés viennent de `Projects\Status`, jamais recopiés. Les compteurs
suivent la recherche courante, pour qu'ils décrivent ce que les onglets vont
réellement montrer ; ils ne suivent pas le statut affiché, ce qui serait
circulaire.

**Recherche** : une zone, un `LIKE` sur sept colonnes — `reference`,
`first_name`, `last_name`, `email`, `phone`, `city`, `department`. Le terme est
borné à cent caractères et passé par `esc_like()` puis `prepare()`, donc `%` et
`_` y sont des caractères et non des jokers. Ce n'est pas un moteur
plein-texte, et c'est assumé : `reference`, `email` et `department` sont
indexés, les trois autres non, et un `LIKE %terme%` ne peut de toute façon pas
utiliser un index B-tree.

### Pourquoi pas `WP_List_Table`

C'est une API interne de WordPress, dont l'intérêt est de fournir gratuitement
pagination, colonnes triables, actions groupées et cases à cocher. Nous
n'avons besoin d'aucune des trois dernières : un ordre fixe, aucune action
groupée dans cette version, aucune sélection. Restait la pagination, que
`paginate_links()` rend en une ligne. Hériter d'une classe interne de quatre
cents méthodes pour une table de huit colonnes aurait coûté plus à maintenir
que la table elle-même.

### Responsive

Sous 900 px, quatre colonnes disparaissent : Téléphone, Ville, Surface, Projet.
Restent **Référence, Date, Client, Statut** — de quoi reconnaître une demande
et l'ouvrir. Le reste est sur la fiche, à un clic, et vaut mieux que huit
colonnes de six caractères. Vérifié à 768 × 1024 et 390 × 844 : quatre
colonnes, aucun débordement horizontal.

## Fiche

```
Demande PP-2026-000123          [Retour à la liste]
[Statut]  Reçue le 4 juillet 2026 à 14:32

CLIENT                          STATUT
  nom, email, téléphone           sélecteur + « Mettre à jour »
PROJET                          EMAILS
  zone, département, ville,        notification interne
  logement, pièce, surface,        confirmation visiteur
  ambiance, parquet, support,    HISTORIQUE
  sens de pose, délai              du plus ancien au plus récent
  message du visiteur            ACQUISITION
VISUALISEUR                        page d'origine, source, média,
  scène, produit, motif,           campagne
  orientation
NOTES INTERNES
```

Deux colonnes au-dessus de 960 px, une seule en dessous.

**Les champs facultatifs vides ne sont pas rendus.** Une fiche criblée de
« — » demande au lecteur de trier le vide du plein à chaque coup d'œil. Les
champs essentiels, eux, restent affichés même vides : leur absence est une
information. Les sections Visualiseur et Acquisition disparaissent entièrement
quand elles n'ont rien à montrer.

**Email et téléphone** sont des liens `mailto:` et `tel:`. Le numéro est
réduit aux chiffres et à un éventuel `+` pour le `href`, parce que `tel:`
n'accepte ni espace ni point ; le texte affiché garde sa mise en forme. Aucune
action n'est déclenchée automatiquement.

**Visualiseur** : quatre lignes lisibles — scène, produit, motif traduit,
orientation en degrés. Le JSON de `visualizer_config` **n'est pas montré** :
c'est un carnet du moteur de rendu, utile au front et illisible pour un
gestionnaire. Vérifié par test : une valeur placée dans la configuration
n'apparaît nulle part dans la page.

Le champ du Visualiseur s'appelle « Scène » et non « Pièce », parce que la
section Projet porte déjà un « Pièce » qui est le type de pièce déclaré. De
même, `utm_medium` s'appelle « Média » et non « Support », qui désigne déjà le
support de pose. Deux champs du même nom sur un même écran, avec deux sens
différents, est le genre de détail qui fait douter de tout le reste.

## Statuts

Source de vérité unique : `Projects\Status`.

| Valeur | Libellé |
|---|---|
| `new` | Nouveau |
| `to_contact` | À contacter |
| `contacted` | Contacté |
| `qualified` | Qualifié |
| `completed` | Terminé |
| `lost` | Perdu |
| `spam` | Spam |

### Changement

Un sélecteur et un bouton « Mettre à jour », en **POST** vers
`admin-post.php`, avec un nonce propre à la demande. Jamais en GET : un
changement de statut atteignable par un lien serait déclenché par un prefetch
de navigateur, un scanner d'URL ou une image dans un email.

L'ordre de chaque poignée est celui de la sécurité : capability, puis nonce,
puis données, puis écriture, puis redirection.

**POST → traitement → redirect → GET.** Sans cela, un rafraîchissement rejoue
l'action. Avec, la page finale est un GET sans effet, qu'on peut recharger,
mettre en favori ou partager. Le message ne voyage pas en clair dans l'URL :
seul un **code** y passe (`pp_notice=status_updated`), traduit côté serveur par
`Admin\Notices`. Un code inconnu ne produit aucun message — personne ne peut
faire dire ce qu'il veut à l'administration en envoyant un lien.

### Concurrence

Le formulaire porte un champ caché `expected_status`, le statut lu au moment du
rendu. Le dépôt en fait la condition de son UPDATE :

```sql
UPDATE …_pp_projects SET status = ?, updated_at = ? WHERE id = ? AND status = ?
```

Deux gestionnaires ouvrent la même fiche. Le premier passe la demande à
« Contacté ». Le second envoie encore `new → lost` depuis sa page périmée : sa
condition ne s'applique plus à aucune ligne, l'UPDATE ne touche rien, et il
reçoit **« Cette demande a été modifiée entre-temps. Rechargez la fiche. »** au
lieu d'écraser silencieusement le travail du premier.

Aucun numéro de version, aucune colonne de plus : la valeur attendue **est** le
jeton d'optimisme, et le SGBD arbitre. Vérifié en session réelle, et par test.

### Historique

Chaque transition écrit une ligne dans `pp_project_history` :
`project_id`, `old_status`, `new_status`, `user_id`, `created_at`.

- `old_status` NULL marque la **création** ;
- `user_id` 0 marque une action sans utilisateur connecté — le formulaire
  public — et s'affiche « **Système** » ;
- **aucun événement n'est écrit si l'ancien statut égale le nouveau.** Un
  historique qui note « new → new » se remplit de bruit et devient illisible,
  ce qui est la seule façon de perdre un historique.

Le nom de l'auteur n'est **jamais copié** dans la table : seul l'identifiant y
est, et le nom se résout depuis `wp_users` à l'affichage. Un utilisateur qui
change de nom le change partout ; un utilisateur supprimé ne laisse pas son nom
derrière lui dans une table métier, il devient « Utilisateur #14 (supprimé) ».

Ordre d'affichage : **chronologique croissant**. C'est le récit de la vie de la
demande, et un récit se lit du début.

## Notes internes

Un `textarea`, un bouton « Ajouter la note ». Texte brut, retours à la ligne
conservés — une note de chantier s'écrit en plusieurs lignes, et les aplatir
serait une perte. `sanitize_textarea_field()` retire les balises à
l'**enregistrement** ; l'affichage échappe puis convertit les sauts de ligne.
Deux barrières, dont une avant le stockage.

- non vide après `trim()` ;
- au plus **5 000 caractères** (`Notes::MAX_LENGTH`) ;
- auteur = utilisateur connecté, lu côté serveur. Aucun écran ne propose de
  choisir un auteur, aucune requête ne pourrait en imposer un.

Ordre d'affichage : **la plus récente d'abord**, l'inverse de l'historique.
C'est voulu : les notes sont un carnet de travail, où ce qui compte est la
dernière.

### Une note ne se modifie pas et ne se supprime pas

Ce n'est pas un oubli. Une note interne est datée et signée ; la corriger après
coup effacerait ce que l'équipe savait à ce moment-là. Une erreur se rectifie
par une note de plus, ce qui laisse les deux visibles. Cela évite du même coup
un historique des notes, une capability de suppression, et les suppressions
accidentelles. La colonne `updated_at` de la table reste NULL, et le dira
encore quand une version future ouvrira l'édition.

Vérifié par test : ni `Repository::update_note()`, ni `delete_note()`, ni
poignée d'administration correspondante n'existent.

## États des emails

Affichés, jamais renvoyés — ce lot ne crée aucun bouton « Renvoyer l'email ».

| Valeur | Affichage |
|---|---|
| `sent` | Envoyée — *date* |
| `failed` | Échec |
| `skipped` | Désactivée |
| `pending` | En attente |

La date n'apparaît que si `*_mail_sent_at` existe. Aucun détail de transport,
aucune erreur technique : vérifié par test que ni « SMTP » ni « PHPMailer »
n'apparaissent dans la page.

## Suppression : volontairement absente

Aucun bouton « Supprimer définitivement », aucune action groupée, aucune case à
cocher. Une demande se retire de la circulation par son statut — `spam`,
`lost`, `completed`. Les données métier ne doivent pas disparaître d'un clic
accidentel. La politique de conservation RGPD sera traitée séparément (lot 6).

## Dates

Les colonnes `*_at` sont écrites en **UTC** (`current_time( 'mysql', true )`) :
c'est la seule horloge qui a du sens pour un serveur. L'affichage passe par
`Admin\View::date()`, qui ajoute `' UTC'` à la chaîne avant `strtotime()` —
sans quoi PHP supposerait le fuseau du serveur — puis `wp_date()` avec le
format et le fuseau du site. Vérifié : `2026-07-01 10:00:00` en base s'affiche
`01/07/2026 12:00` pour un site réglé sur Europe/Paris.

## Journal

Les actions d'administration journalisent `project_id`, `user_id`,
`status_before`, `status_after`, `action`, `error_code`. Jamais un nom, un
email, un téléphone, ni le contenu d'une note. Le `Support\Logger` filtre en
plus les clés connues pour être personnelles — filet, pas permission.

## Requêtes et performance

`Repository::search()` et `count_search()` partagent la même construction de
`WHERE` : une seule fonction pour les deux, sinon le compte total finit par ne
plus décrire la page affichée, et une pagination qui mente est pire qu'absente.
`counts_by_status()` fait un `GROUP BY`, pas sept `COUNT`.

La liste ne lit que les colonnes qu'elle affiche : `SELECT *` ramènerait le
message du visiteur et le JSON du Visualiseur pour rien.

Mesuré sur **1 038 demandes**, WordPress local, MySQL de WampServer :

| requête | durée |
|---|---|
| page 1 (20 lignes) | 0,8 ms |
| page 2 (20 lignes) | 0,6 ms |
| compte total | 1,0 ms |
| recherche + filtre statut | 3,2 ms |
| compteurs des sept statuts | 5,3 ms |

`EXPLAIN` confirme que le filtre par statut passe par un index. Les index du
schéma 3 — `reference` (unique), `status`, `created_at`, `email`,
`department` — suffisent ; aucun index n'a été ajouté pour ce lot, et aucun ne
le sera sans mesure.

## Ce que ce lot ne change pas

Schéma de base (reste 3 : la table `pp_project_notes` existe depuis le
schéma 1), fonctionnement des emails du lot 3, anti-spam, formulaire public,
Studio, Inspirations, CSS et JS du site. Aucune route REST d'administration :
l'administration PHP appelle directement la couche métier, ce qui est plus
simple et n'expose rien de plus.

## Tests

`php tests/run-admin.php <racine WordPress>` — **202 vérifications**.

Liste et pagination, ordre total, filtres, compteurs, recherche sur les sept
colonnes, accès par identifiant et par référence, changement de statut,
historique et son ordre, concurrence, notes et leur ordre, droits des trois
rôles, URL directe, nonce (valide, absent, invalide, celui d'une autre
demande), échappement à l'affichage, dates au fuseau du site, états des
emails, absence de suppression, et mille demandes chronométrées.

Les poignées d'écriture sont appelées **pour de vrai**, avec leur `$_POST`,
leur nonce et leur redirection : deux filtres — `wp_redirect` et
`wp_die_handler` — lèvent une exception au lieu de terminer le processus. C'est
le seul moyen de tester le code qui protège réellement l'écran plutôt qu'une
copie de ce code.
