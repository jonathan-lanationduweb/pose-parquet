# Backend — API REST

Espace de noms : **`pose-parquet/v1`**, soit `/wp-json/pose-parquet/v1/…`
(ou `/?rest_route=/pose-parquet/v1/…` sans permaliens).

Déclaration centralisée dans `Rest\Routes::register()`, un contrôleur par
route, `permission_callback` explicite partout. Les en-têtes CORS de l'espace
sont posés par `Rest\Cors` (voir plus bas et `security.md`).

| Route | Méthode | Accès |
|---|---|---|
| `/health` | GET | publique |
| `/form-token` | GET | publique |
| `/projects` | POST | publique, anti-spam |

## `GET /health` — publique (lot 1)

Réponse `200` si le plugin est prêt, `503` sinon (`status: degraded`), toujours
avec `Cache-Control: no-store`.

```json
{
  "status": "ok",
  "pluginVersion": "0.3.0",
  "databaseStatus": {
    "ready": true,
    "schemaVersion": 3,
    "expectedVersion": 3,
    "tables": { "projects": true, "history": true, "notes": true }
  }
}
```

Elle ne dit ni version de WordPress, ni chemin, ni nom de base ou préfixe.

## `GET /form-token` — publique (lot 3)

Un jeton temporel signé, à joindre à chaque dépôt. Sans session, sans
stockage serveur, `Cache-Control: no-store`.

```json
{ "token": "v1.1757068800.9c1f0a2b3d4e5f60.7ab3…", "minAge": 2, "expiresIn": 7200 }
```

`minAge` : secondes à attendre avant de pouvoir soumettre. `expiresIn` :
durée de validité. Voir `antispam.md` pour la mécanique et ses limites.
Toute autre méthode que GET → 404.

## `POST /projects` — publique (lot 2)

Dépôt d'une demande de projet. Corps JSON, clés en camelCase ; le contrat
complet champ par champ est dans `project-form-contract.md`, la source de
vérité dans `src/Projects/Fields.php`.

```http
POST /wp-json/pose-parquet/v1/projects
Content-Type: application/json
Origin: https://pose-parquet.com

{
  "zone": "autre",
  "region": "Bretagne",
  "department": "35",
  "city": "Rennes",
  "housingType": "appartement",
  "roomType": "sejour",
  "surface": 32,
  "supportType": "chape",
  "parquetType": "contrecolle",
  "installationType": "baton-rompu",
  "style": "naturel-chene",
  "timeframe": "1-3-mois",
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "phone": "06 12 34 56 78",
  "message": "Séjour à rénover.",
  "consent": true,
  "sourceUrl": "/projet/",
  "visualizer": { "sceneId": "sejour", "pattern": "baton-rompu", "orientation": 45, "config": { } },
  "formToken": "v1.1757068800.9c1f0a2b3d4e5f60.7ab3…",
  "website": ""
}
```

`formToken` (obligatoire) et `website` (pot de miel, à laisser vide) sont des
**champs techniques** : acceptés par l'API, retirés avant la validation
métier, jamais stockés, jamais journalisés. Voir `antispam.md`.

Réponse `201 Created` — rien d'autre : ni id interne, ni écho des données.

```json
{ "success": true, "reference": "PP-2026-000123" }
```

En-têtes : `Cache-Control: no-store`, `X-Request-Id` (16 hexadécimaux, à
citer en cas de problème ; le même identifiant figure dans le journal).

### Erreurs

Format unique : `{ "code": "…", "message": "…", "fields": { "champ": "raison" } }`.
`fields` est vide sauf en 422. Aucune erreur ne contient de SQL, de chemin, de
trace, ni de donnée saisie (l'email en particulier n'est jamais renvoyé).

| HTTP | `code` | Quand |
|---|---|---|
| 400 | `empty_body` | corps vide |
| 400 | `invalid_json` | JSON illisible (corps non déclaré `application/json`) |
| 400 | `rest_invalid_json` | JSON illisible, corps déclaré `application/json` — intercepté par WordPress avant le plugin ; format WordPress (`code`, `message`, `data.status`), sans `fields` |
| 413 | `payload_too_large` | corps > 16 384 octets, refusé avant lecture |
| 422 | `validation_failed` | au moins un champ invalide ; `fields` nomme **tous** les champs en cause et distingue : « Champ obligatoire absent. », « Type invalide : … attendu. », « Valeur hors de la liste autorisée. », « Longueur maximale dépassée (N caractères). », « Hors plage : entre 1 et 2000 m². », « Champ inconnu. », « Champ réservé au serveur : … » |
| 422 | `form_token_invalid` | jeton absent, invalide, expiré, ou soumission trop rapide ; `fields.formToken` dit lequel, sans révéler le contenu signé |
| 422 | `submission_rejected` | pot de miel rempli. Refus générique : ni le motif, ni le nom du champ |
| 429 | `rate_limited` | limite de débit atteinte ; en-tête `Retry-After` en secondes |
| 500 | `storage_failed` | écriture impossible ; la transaction a été annulée |
| 503 | `service_unavailable` | tables absentes ou schéma en retard ; rien n'est écrit |

Un échec d'email ne produit **aucun** code d'erreur : la demande est
enregistrée, la réponse reste `201`, et le sort de l'envoi est consigné en
base (voir `email.md`).

Exemple 422 :

```json
{
  "code": "validation_failed",
  "message": "Certains champs sont invalides.",
  "fields": {
    "email": "Adresse email invalide.",
    "surface": "Hors plage : entre 1 et 2000 m².",
    "status": "Champ réservé au serveur : il ne peut pas être fourni."
  }
}
```

### Ce que « publique » veut dire

Pas d'authentification : un formulaire de contact n'en a pas. Mais : corps
borné à 16 Ko, `visualizer.config` à 4 Ko, aucun fichier ni base64, champs
inconnus et champs serveur refusés, toutes les valeurs revalidées, et
l'anti-spam du lot 3 — pot de miel, jeton temporel signé, limite de débit
(`antispam.md`). CORS restreint à quatre origines protège le navigateur d'un
visiteur, pas la route d'un script (voir `security.md`).

### Méthodes

Seul `POST` existe sur `/projects`. `GET /projects` **n'est pas une liste** :
404. `PUT`, `PATCH`, `DELETE` : 404. `GET /projects/{id}` : 404. La lecture
des demandes sera une route d'administration (lot 4), authentifiée.

## CORS

Sur `/pose-parquet/v1/*` uniquement, `Rest\Cors` remplace le comportement
WordPress (qui renvoie à toute origine l'origine demandeuse) :

- origine dans la liste → `Access-Control-Allow-Origin: <origine exacte>`,
  `Allow-Methods: GET, POST, OPTIONS`, `Allow-Headers: Content-Type`,
  `Expose-Headers: X-Request-Id`, `Max-Age: 600`, `Vary: Origin` ;
- origine absente ou inconnue → aucun en-tête `Access-Control-*` ;
- jamais `*`, même via le filtre.

Liste par défaut : `http://localhost:5180`, `https://jonathan-lanationduweb.github.io`,
`https://pose-parquet.com`, `https://www.pose-parquet.com`. Remplaçable par la
constante `POSE_PARQUET_ALLOWED_ORIGINS` (tableau, `wp-config.php`), ajustable
par le filtre `pose_parquet_allowed_origins`. Preflight `OPTIONS` testé en
HTTP réel (`tests/run-http.php`).

## Routes prévues

Le lot 4 a livré l'administration **sans route REST** : les écrans sont des
pages `wp-admin` et les écritures passent par `admin-post.php` avec nonce. Des
routes d'administration n'auraient d'intérêt qu'avec un client distinct de
wp-admin ; elles ne sont plus prévues à court terme.

Pas de JWT, pas de jeton en `localStorage`.

## Contrat côté front

Branché depuis le lot 5. Le front appelle l'API par trois modules :
`js/forms/api-config.js` (l'adresse, résolue une seule fois),
`js/forms/project-payload.js` (traduction `FormData` → JSON du contrat) et
`js/forms/submit-adapter.js` (jeton, envoi, erreurs typées, réessai unique sur
jeton périmé).

Le formulaire demande `GET /form-token` à son montage, garde le jeton en
mémoire JS seulement, puis envoie `POST /projects` au clic. Les réponses `422`
sont ramenées sur les champs, `429` a sa propre phrase, et l'écran de
confirmation n'apparaît que sur un `201` réellement reçu — l'ancien mode
démonstration, qui écrivait en `localStorage` et annonçait un succès sans
requête, n'existe plus.

Aucune photo ne circule : le contexte du Studio est réduit à `visualizer`
(scène, produit, motif, angle), quelques dizaines d'octets.

Détail complet, table de correspondance des champs, matrice d'erreurs et liste
des actions de mise en production : `front-integration.md`.
