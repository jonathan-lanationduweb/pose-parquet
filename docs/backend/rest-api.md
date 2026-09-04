# Backend — API REST

Espace de noms : **`pose-parquet/v1`**, soit `/wp-json/pose-parquet/v1/…`
(ou `/?rest_route=/pose-parquet/v1/…` sans permaliens).

Déclaration centralisée dans `Rest\Routes::register()`, un contrôleur par
route avec deux méthodes statiques : `permission()` et `handle()`.

## Routes du lot 1

### `GET /health` — publique

Réponse `200` si le plugin est prêt, `503` sinon (`status: degraded`), toujours
avec `Cache-Control: no-store`.

```json
{
  "status": "ok",
  "pluginVersion": "0.1.0",
  "databaseStatus": {
    "ready": true,
    "schemaVersion": 1,
    "expectedVersion": 1,
    "tables": { "projects": true, "history": true, "notes": true }
  }
}
```

Ce qu'elle ne dit volontairement pas : version de WordPress, chemins, nom de
base ou préfixe de table (les clés `tables` sont des noms logiques), rien qui
décrive le serveur. C'est ce qui l'autorise à rester sans authentification, et
ce qu'un test vérifie (`health n'expose ni préfixe de table ni chemin ni
version WP`).

Toute autre méthode que GET → 404 ; toute route non déclarée → 404.

## Routes prévues

| Lot | Route | Accès |
|---|---|---|
| 2 | `POST /projects` | publique, anti-spam (lot 3), validation serveur complète |
| 4 | `GET /admin/projects`, `GET /admin/projects/{id}`, `PATCH /admin/projects/{id}/status`, `POST /admin/projects/{id}/notes` | cookie WordPress + nonce `X-WP-Nonce`, capabilities `pp_view_projects` / `pp_manage_projects` |

Pas de JWT, pas de jeton en `localStorage` : l'administration utilise
l'authentification native de WordPress. Le front public, lui, n'a besoin
d'aucun compte pour déposer une demande.

## Contrat côté front

Le front appelle l'API via `js/forms/submit-adapter.js` (`configureSubmit({
endpoint })`). Rien n'est branché dans ce lot ; le formulaire reste en mode
démonstration honnête. Le lot 5 reliera les deux.
