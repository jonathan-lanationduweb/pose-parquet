# Contrat formulaire → API → base

Relevé du formulaire réel le 4 septembre 2026, en lecture seule :
`components/project-form/project-form.config.js` (champs, options, règles) et
`components/project-form/project-form.js` (construction de la charge :
`Object.fromEntries(new FormData(form))` + `source = location.pathname`).
Le front n'est **pas** branché sur l'API dans ce lot ; ce document est le
contrat que le lot 5 (`submit-adapter.js`) devra honorer. Côté plugin, la
seule source de vérité est `src/Projects/Fields.php` : si ce tableau et le
code divergent, c'est le code qui a raison et ce tableau qu'il faut corriger.

## Traduction champ par champ

| Champ front (`name`) | Champ API (JSON) | Colonne `pp_projects` | Type | Obligatoire | Validation serveur |
|---|---|---|---|---|---|
| `zone` | `zone` | — (sert à déduire `region`) | chaîne | oui | liste `idf` \| `autre` |
| `region` | `region` | `region` varchar(80) | chaîne | **si `zone` = `autre`** | liste fermée des 13 libellés du select (valeur = libellé, casse exacte). Si `zone` = `idf`, le serveur écrit `Île-de-France` et ignore la valeur reçue |
| `departement` | `department` | `department` varchar(3) | chaîne | oui | motif du formulaire `^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$`, `2a`/`2b` remis en majuscules |
| `ville` | `city` | `city` varchar(120) | chaîne | non | texte nettoyé (`sanitize_text_field`), ≤ 120 caractères |
| `logement` | `housingType` | `housing_type` varchar(40) | chaîne | oui | liste `appartement` `maison` `commerce` `bureaux` `autre` |
| `piece` | `roomType` | `room_type` varchar(40) | chaîne | oui | liste `sejour` `chambre` `cuisine` `couloir` `plusieurs` `autre` |
| `surface` | `surface` | `surface` decimal(8,2) | entier | oui | entier (ou chaîne de chiffres) de **1 à 2000** — bornes du champ `min/max/step` |
| `support` | `supportType` | `support_type` varchar(40) | chaîne | oui | liste `dalle` `chape` `carrelage` `parquet` `autre` `inconnu` |
| `parquet` | `parquetType` | `parquet_type` varchar(40) | chaîne | oui | liste `massif` `contrecolle` `autre` `inconnu` |
| `orientation` | `installationType` | `installation_type` varchar(40) | chaîne | oui | liste `longueur` `largeur` `diagonale` `point-de-hongrie` `baton-rompu` `inconnu` |
| `style` | `style` | `style` varchar(40) — **ajoutée au schéma 2** | chaîne | non | liste `clair-scandinave` `naturel-chene` `haussmannien` `contemporain-fume` `brut-atelier` ; `''` = absent |
| `delai` | `timeframe` | `timeframe` varchar(40) | chaîne | oui | liste `urgent` `mois` `1-3-mois` `plus-tard` `renseignement` |
| `prenom` | `firstName` | `first_name` varchar(100) | chaîne | oui | texte nettoyé, HTML retiré, ≤ 100 caractères ; aucune autre transformation (apostrophes, tirets, accents conservés) |
| `nom` | `lastName` | `last_name` varchar(100) | chaîne | oui | idem |
| `email` | `email` | `email` varchar(190) | chaîne | oui | `is_email()` WordPress, ≤ 190 ; domaine mis en minuscules ; **jamais renvoyé dans une erreur ni journalisé** |
| `telephone` | `phone` | `phone` varchar(40) | chaîne | oui | voir règle téléphone ci-dessous |
| `message` | `message` | `message` text | chaîne | non | `sanitize_textarea_field` (sauts de ligne gardés, HTML retiré), ≤ 4000 caractères |
| `consentement` | `consent` | `consent_at` datetime | booléen | oui | doit valoir exactement `true` ; le serveur écrit **sa** date UTC. Toute date fournie par le client (`consentAt`, `consent_at`) est refusée |
| `source` | `sourceUrl` | `source_url` varchar(500) | chaîne | non | réduit au **chemin** (`wp_parse_url` → `PHP_URL_PATH`) : requête et fragment tombent, donc rien de sensible ne finit en base ; ≤ 500 |
| — | `utmSource` `utmMedium` `utmCampaign` | `utm_*` varchar(100) | chaîne | non | texte nettoyé, ≤ 100. Le formulaire ne les envoie pas aujourd'hui ; réservés au lot 5 |
| — | `visualizer` | voir ci-dessous | objet | non | structure contrôlée, jamais interprétée |

Traductions à faire par l'adaptateur du lot 5 : renommer les clés (`prenom` →
`firstName`…), convertir `surface` en entier, convertir `consentement` (`"on"`)
en `true`, passer `source` dans `sourceUrl`, **ne pas envoyer `zone`/`region`
autrement que tels quels** (le serveur déduit).

### Pourquoi `orientation` → `installationType`

Le champ front `orientation` propose des *modes de pose* (dans la longueur, en
diagonale, en point de Hongrie…). La colonne `orientation` de la base, elle,
est l'angle numérique du Visualiseur (0 / 90 / 45 / −45). Deux notions, deux
colonnes : le choix du formulaire va dans `installation_type`, l'angle du
Studio dans `orientation` via `visualizer.orientation`.

### Colonne sans champ : `postal_code`

Le formulaire ne demande pas de code postal (département + ville suffisent).
La colonne reste, vide, pour une évolution éventuelle ; l'API ne l'accepte pas
(un `postalCode` reçu est un champ inconnu → 422).

## Objet `visualizer` (facultatif)

Le Studio ne transmet rien au formulaire aujourd'hui hormis des paramètres
d'URL (`parquet`, `motif`, `orientation`) qui préremplissent le mode de pose
et le message. L'objet est prévu pour le lot 5, quand le front enverra le
contexte du Visualiseur.

| Clé | Colonne | Validation |
|---|---|---|
| `sceneId` | `scene_id` varchar(60) | identifiant `[a-z0-9][a-z0-9_-]*`, ≤ 60 |
| `productId` | `product_id` varchar(60) | idem |
| `pattern` | `pattern` varchar(40) | liste `lames` `point-de-hongrie` `baton-rompu` |
| `orientation` | `orientation` smallint | entier parmi 0, 90, 45, −45 |
| `config` | `visualizer_config` longtext | objet JSON, **≤ 4096 octets** une fois encodé ; stocké tel quel, jamais lu par le serveur. Aucune image ni base64 ne tient dans cette borne |

Toute autre clé → `visualizer.<clé>` : « Champ inconnu. » Un `visualizer` qui
n'est pas un objet → type invalide.

## Règle téléphone

Le formulaire est français et le dit (`pattern` du champ). Le serveur accepte :

- `0X XX XX XX XX` avec X ∈ 1–9, séparateurs espace, point, tiret ou rien
  (`0612345678`, `06.12.34.56.78`, `06-12-34-56-78`) ;
- `+33 X XX XX XX XX` avec les mêmes séparateurs, ou `+33612345678` ;
- à titre de tolérance, un numéro international `+` suivi de 8 à 15 chiffres
  (un client frontalier ne doit pas être bloqué).

Il refuse ce qui n'est manifestement pas un numéro : moins de 10 chiffres,
lettres, `00…`, plus de 40 caractères. Il ne reformate pas : la saisie
nettoyée (espaces multiples réduits) est stockée telle quelle, lisible par
l'équipe.

## Champs refusés

- **Inconnus** : toute clé absente de `Fields::ROOT` → 422, `fields.<clé> =
  "Champ inconnu."`.
- **Réservés au serveur** : `id`, `status`, `reference`, `createdAt`,
  `created_at`, `updatedAt`, `updated_at`, `consentAt`, `consent_at`,
  `userId` → 422, `fields.<clé> = "Champ réservé au serveur : il ne peut pas
  être fourni."`. Refus explicite plutôt qu'ignorance silencieuse : une
  tentative doit se voir.

## Ce qui est décidé côté serveur, toujours

`status` = `new`, `reference` = `PP-<année>-<id sur 6 chiffres>`, `consent_at`
= `created_at` = `updated_at` = heure UTC du serveur, `region` =
`Île-de-France` si `zone` = `idf`, premier événement d'historique
(`old_status` NULL → `new`, `user_id` 0).
