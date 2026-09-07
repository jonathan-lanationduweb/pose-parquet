# Front ↔ backend — branchement du formulaire réel

Lot 5. Le formulaire public de `/projet/` n'est plus une démonstration : il
demande un jeton, envoie une vraie demande, et affiche la référence rendue par
le serveur. Ce document décrit l'adresse de l'API, l'enchaînement des appels,
la charge exacte, le traitement des erreurs, et ce qu'il reste à faire le jour
d'une mise en production.

Le formulaire lui-même n'a pas changé : mêmes étapes, mêmes champs, même
direction artistique. Ce lot n'a touché que la couche d'envoi.

## Les quatre fichiers

| Fichier | Rôle |
|---|---|
| `js/forms/api-config.js` | où vit l'API, et nulle part ailleurs |
| `js/forms/project-payload.js` | traduction `FormData` → JSON du contrat |
| `js/forms/submit-adapter.js` | jeton, envoi, erreurs typées, réessai unique |
| `components/project-form/project-form.js` | l'interface : états, messages, focus |

Le découpage n'est pas décoratif. L'adresse est isolée pour qu'un déménagement
du backend soit un tableau à modifier ; la traduction est isolée pour qu'il
n'existe **qu'un seul** endroit où un nom de champ français devient un nom
d'API ; l'envoi est isolé pour que l'interface n'ait jamais à connaître un code
HTTP.

## Adresse de l'API

`apiBaseUrl()` résout la racine REST dans cet ordre :

1. `window.POSE_PARQUET_CONFIG = { apiBaseUrl: '…' }`, posé par la page avant
   le chargement des modules — la porte de sortie pour un environnement
   imprévu. `apiBaseUrl: null` explicite force l'état « sans backend », ce qui
   rend cet état testable sans toucher au code ;
2. le tableau `PAR_HOTE`, qui associe l'hôte du front à sa racine REST ;
3. rien — et c'est un état légitime, pas une panne.

| Hôte du front | Racine REST | État |
|---|---|---|
| `localhost`, `127.0.0.1` | `http://localhost:8181/index.php?rest_route=/pose-parquet/v1` | en service |
| `jonathan-lanationduweb.github.io` | `null` — prévu : `https://staging-admin.pose-parquet.com/wp-json/pose-parquet/v1` | **n'existe pas** |
| `pose-parquet.com`, `www.pose-parquet.com` | `null` — prévu : `https://admin.pose-parquet.com/wp-json/pose-parquet/v1` | **n'existe pas** |

Les deux dernières lignes sont à `null` parce qu'aucun WordPress de
préproduction ni de production n'est déployé au 7 septembre 2026. Les adresses
sont **prévues**, pas actives. Écrire une URL qui répond 404 aurait produit le
pire des états : un formulaire qui essaie, échoue, et accuse le réseau du
visiteur. À la place, le formulaire dit clairement qu'il n'est pas relié et
renvoie vers la page contact.

### Pourquoi la racine complète et non un domaine

WordPress sert son API sous deux formes, selon les permaliens du site :

```
permaliens jolis    https://exemple.fr/wp-json/pose-parquet/v1
permaliens simples  https://exemple.fr/index.php?rest_route=/pose-parquet/v1
```

Les deux sont officielles. La seconde est celle du WordPress de développement,
servi par `php -S`, qui ne réécrit aucune URL : `/wp-json/…` y répond 301 puis
404. Comme les deux formes se terminent par le chemin de l'espace, concaténer
`/form-token` ou `/projects` fonctionne dans les deux cas — d'où le choix de
stocker la racine entière plutôt que de recomposer un chemin.

## Enchaînement

```
montage du formulaire        GET  /form-token      → { token, issuedAt }
                                                     jeton gardé en mémoire JS
clic sur « Envoyer »         POST /projects        → 201 { reference }
jeton refusé (422)           GET  /form-token      → un seul réessai
```

Le jeton est demandé **au montage**, pas au clic : il porte un horodatage
signé, et le serveur refuse une soumission de moins de deux secondes. Le
demander au clic garantirait le refus.

`submitProject()` attend le reste des deux secondes (plus 400 ms de marge)
avant d'envoyer si le jeton est trop jeune. Un formulaire rempli en cinq
étapes n'attend jamais : le temps est déjà passé.

### Le jeton ne quitte pas la mémoire

Ni `localStorage`, ni `sessionStorage`, ni cookie, ni URL, ni analytics. Il
vit dans une variable du composant et meurt avec la page. Vérifié en recette :
après un envoi réussi, aucune clé de stockage ne contient de jeton.

### Réessai : une fois, jamais en boucle

Un jeton peut expirer pendant que le visiteur remplit ses cinq étapes. Dans ce
cas seul — `422` avec `code: form_token_invalid` ou `fields.formToken` —
`submitProject()` redemande un jeton et rejoue l'envoi **une** fois. Tout autre
échec remonte immédiatement. Un second refus de jeton n'est pas réessayé : il
signale un désaccord durable, pas un aléa.

## Charge envoyée

La traduction est unique et vit dans `project-payload.js` :

| Champ du formulaire | Champ de l'API |
|---|---|
| `zone` | `zone` |
| `region` | `region` |
| `departement` | `department` |
| `ville` | `city` |
| `logement` | `housingType` |
| `piece` | `roomType` |
| `surface` | `surface` (nombre) |
| `support` | `supportType` |
| `parquet` | `parquetType` |
| `orientation` | `installationType` |
| `style` | `style` |
| `delai` | `timeframe` |
| `prenom` | `firstName` |
| `nom` | `lastName` |
| `email` | `email` |
| `telephone` | `phone` |
| `message` | `message` |
| `consentement` (case cochée) | `consent: true` |
| `website` (pot de miel) | `website` — toujours envoyé, vide si tout va bien |

S'y ajoutent `formToken`, `sourceUrl` (le chemin de la page), les `utmSource` /
`utmMedium` / `utmCampaign` relevés dans l'URL, et `visualizer` si le visiteur
vient du Studio.

`orientation` → `installationType` mérite d'être remarqué : le mot
« orientation » désigne deux choses différentes de part et d'autre. Côté
formulaire, c'est le **sens de pose** choisi par le visiteur
(`longueur`, `point-de-hongrie`…). Côté `visualizer`, c'est un **angle en
degrés**. Les deux voyagent dans la même charge sans se confondre.

Ne sont jamais envoyés : `id`, `reference`, `status`, `createdAt`, `updatedAt`,
`consentAt`, `mailStatus`. Ce sont des décisions du serveur ; le serveur les
refuse explicitement (422) si on les fournit, et le front ne les fournit pas.
Aucune date de consentement n'est calculée par le navigateur : l'horloge d'un
visiteur n'est pas une preuve.

Les champs vides sont omis, pas envoyés à `''` : le serveur traite l'absence.

### Le contexte du Studio, sans la photo

Quand le visiteur arrive du Studio par « Décrire ce projet », l'URL porte
`parquet`, `motif` et `orientation`. `visualizerFromParams()` en tire un bloc
`visualizer` léger :

```json
{
  "pattern": "lames",
  "orientation": 90,
  "config": { "origine": "studio", "motif": "lames", "angle": 90 }
}
```

Mesuré en recette : charge complète de 777 octets, dont environ 105 pour
`config`. Le plafond du contrat est de 4 Ko.

**Aucune photo, jamais.** La photo importée dans le Studio ne quitte pas le
navigateur : ni en base64, ni en blob, ni en data URL, ni dans `config`, ni
ailleurs. Il n'y a pas non plus de `SceneData`, de masque, de texture. Le
backend V1 n'a aucune raison de recevoir l'intérieur de chez quelqu'un, et le
formulaire le dit au visiteur : « Votre photo n'a pas été transmise. »

Le nom commercial du parquet (`Chêne Fumé`) n'est pas un identifiant : il ne
passe pas le motif `^[a-z0-9][a-z0-9_-]{0,59}$` et n'est donc pas envoyé comme
`productId`. Il reste lisible dans le message prérempli, ce qui est sa place.

Le formulaire fonctionne évidemment sans le Visualiseur : sans paramètres,
`visualizer` est simplement absent.

## Pot de miel

```html
<div class="pf__trap" aria-hidden="true">
  <label for="…-website">Site web (ne pas remplir)</label>
  <input type="text" name="website" tabindex="-1" autocomplete="off" />
</div>
```

Sorti du cadre par `position: absolute; left: -9999px`, **pas** masqué par
`display: none`. La différence est tout l'intérêt du piège : `display: none`
est la première chose qu'un robot un peu écrit vérifie, et un champ ainsi
marqué lui dit de ne pas y toucher. `aria-hidden` et `tabindex="-1"` le
retirent en revanche du clavier et de l'arbre d'accessibilité : aucun humain
ne peut le remplir, et un anti-spam qui écarte des humains serait pire que pas
d'anti-spam.

## Erreurs

`submit-adapter.js` expose des codes, pas des statuts HTTP. L'interface associe
une phrase à chaque code, et n'affiche jamais de PHP, de trace, de JSON brut ni
d'identifiant interne.

| Code | Origine | Ce que voit le visiteur |
|---|---|---|
| `not_configured` | aucun backend pour cet hôte | « Ce formulaire n'est pas encore relié à nos serveurs sur cette version du site : votre demande n'a pas été envoyée. Écrivez-nous depuis la page contact. » |
| `validation` | 422 avec `fields` | le message du serveur sur le champ fautif, focus déplacé sur ce champ |
| `form_token_invalid` | 422 jeton, après le réessai | « L'envoi n'a pas pu aboutir. Rechargez la page et réessayez. » |
| `submission_rejected` | 422 pot de miel | la phrase générale — voir plus bas |
| `rate_limited` | 429 | « Trop de demandes ont été envoyées. Veuillez réessayer plus tard. » |
| `server` | 5xx, réponse illisible | « L'envoi n'a pas pu aboutir. Réessayez dans un instant. » |
| `network`, `timeout` | échec réseau, 12 s dépassées | « L'envoi n'a pas pu aboutir. Vérifiez votre connexion et réessayez. » |

Le pot de miel reçoit **la même phrase** qu'une erreur générale. Dire « vous
avez rempli le champ piège » apprendrait à un robot ce qu'il doit éviter la
prochaine fois, et n'aiderait aucun humain — un humain n'a pas pu le remplir.

Après un échec, rien n'est vidé : aucune étape perdue, aucun champ réinitialisé,
le bouton redevient actif. Quelqu'un qui vient de remplir cinq étapes ne doit
pas les ressaisir parce que le réseau a hoqueté.

Le message d'échec réseau ne dit jamais que rien n'a été reçu : au-delà du
délai, la demande peut très bien avoir été enregistrée.

### Délai

12 secondes. Au-dessous, une connexion mobile lente sur un envoi qui déclenche
deux emails côté serveur se ferait couper alors qu'elle allait aboutir ;
au-dessus, le visiteur croit l'interface figée.

### Accessibilité des états

Le bloc d'échec porte `role="alert"` et prend le focus, sauf quand un champ
précis est en cause : dans ce cas le focus va au champ, pas à l'alerte. L'écran
de confirmation prend le focus à son apparition.

## Jamais de fausse réussite

C'est la règle qui a motivé la réécriture de `submit-adapter.js` : l'ancien
mode démonstration écrivait la demande en `localStorage` et affichait
« demande envoyée » sans qu'aucun POST n'ait eu lieu. Ce chemin n'existe plus.

L'écran de confirmation n'apparaît **que** sur un `201` réellement reçu, et
affiche la référence rendue par le serveur (`PP-2026-007829`), rien d'autre :
pas d'identifiant interne, pas d'état d'email, pas de détail technique.

Le texte de confirmation ne promet rien qui ne soit tenu : « Nous avons reçu
votre demande et nous vous répondrons par email ou par téléphone. » Pas de
« rappel sous 24 heures » — personne ne s'est engagé là-dessus.

Le double clic est bloqué : un drapeau `sending` et la désactivation du bouton
garantissent un seul POST. Vérifié à quatre clics successifs — un seul envoi.

Un rechargement après succès ne rejoue rien : le formulaire revient à l'étape 1,
sans écran de confirmation fantôme.

## Recette

Menée sur le WordPress dédié (`localhost:8181`) avec le front de développement
(`localhost:5180`).

| Cas | Résultat |
|---|---|
| Envoi complet depuis `/projet/` | 201, `PP-2026-007819`, `region` déduite par le serveur, `installationType` distinct de l'angle |
| Trois motifs depuis le Studio | `visualizer.config` à 105 octets, aucune image |
| Vrai lien « Décrire ce projet » du Studio | reprise affichée, `productId` absent, charge de 777 octets, `PP-2026-007828` |
| 422 sur un email invalide | message du serveur sur le champ email, focus sur le champ |
| 429 | phrase spécifique, données conservées |
| Pot de miel rempli | phrase générale, le piège n'est pas révélé |
| Jeton périmé | un seul réessai, 1 `form-token` + 2 `projects`, 201 |
| Quatre clics sur « Envoyer » | 1 POST |
| Backend arrêté | 0 POST, phrase honnête, aucun écran de succès |
| Sans backend configuré (`apiBaseUrl: null`) | phrase d'indisponibilité, renvoi vers contact |
| 390 × 844, parcours complet | 5 étapes sans débordement, 1 POST, `PP-2026-007826` |
| 1440 × 900, parcours complet | 1 POST, `PP-2026-007827` |
| Retour navigateur | les étapes ne créent pas d'entrée d'historique ; l'URL reste la source de vérité (UTM et reprise Studio conservés) |
| Rechargement après succès | étape 1, aucun POST, aucun succès fantôme |
| Fiche d'administration | demande visible dans la liste et la fiche, simulation lisible, aucune image |

Les cinq cas de jeton ont aussi été éprouvés directement sur l'API : absent,
vide, altéré, périmé, trop jeune — tous en `422 form_token_invalid` avec
`fields.formToken`, donc tous reconnus par le front.

Les emails apparaissent « en échec » sur ce WordPress : `php -S` n'a pas de
SMTP. C'est le comportement attendu du lot 3 — un échec d'email ne touche
jamais la demande enregistrée.

## À faire pour une mise en production

Rien de tout cela n'est fait, et aucune de ces valeurs n'est active
aujourd'hui.

1. **Héberger le WordPress** (préproduction puis production) en HTTPS, avec un
   certificat valide : une page en `https://` ne peut pas appeler une API en
   `http://`.
2. **Renseigner `PAR_HOTE`** dans `js/forms/api-config.js` avec la racine REST
   réelle, en vérifiant la forme des permaliens du site hébergé.
3. **Déclarer les origines CORS** côté plugin : constante
   `POSE_PARQUET_ALLOWED_ORIGINS` dans `wp-config.php`, ou filtre
   `pose_parquet_allowed_origins`. Jamais de `*`.
4. **Configurer un vrai SMTP** (le `wp_mail()` par défaut d'un hébergeur
   mutualisé finit en indésirables), puis renseigner l'adresse destinataire
   dans « Pose Parquet → Réglages » — elle n'est codée nulle part.
5. **Vérifier la limite de débit** en conditions réelles, et l'ajuster par
   `pose_parquet_rate_limits` si le trafic légitime la déclenche.
6. **Refaire la recette du tableau ci-dessus** sur l'environnement hébergé,
   au minimum : envoi complet, 422, 429, réseau coupé.

## Ce que ce lot n'a pas touché

Le plugin reste en **0.4.0** et le schéma de base en **3** : aucun défaut
d'intégration n'a été trouvé côté serveur, donc rien n'a été modifié dans
`backend/`. Le Studio, les Inspirations, le moteur de rendu et le CSS du site
sont inchangés. La branche Premibel reste gelée.
