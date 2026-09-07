# Backend — feuille de route

Ordre retenu. Un lot ne commence pas avant que le précédent soit accepté.

| Lot | Contenu | État |
|---|---|---|
| **0 / 1 — Fondation** | Plugin `pose-parquet-core` : bootstrap, versions, activation idempotente, trois tables versionnées, capabilities, REST `pose-parquet/v1` avec `/health`, page « État », désinstallation prudente, tests de fondation, documentation. | **validé** (4 septembre 2026, `4b03ce9` intégré à `develop`) |
| **2 — Création d'une demande** | `POST /projects` : contrat relevé sur le formulaire réel (`project-form-contract.md`), `Projects\Fields` / `Validator` / `Repository` / `Service`, référence `PP-AAAA-NNNNNN` dérivée de l'id, transaction InnoDB, historique initial, erreurs `{code, message, fields}`, CORS à liste fermée, schéma 2 (`style`, `reference` nullable), plugin 0.2.0, quatre suites de tests (validateur, fondation, WordPress réel + concurrence, HTTP). | **validé** (4 septembre 2026, `5cb80f6` intégré à `develop`) |
| **3 — Emails + anti-spam** | `Mail\Mailer` sur `wp_mail()`, notification interne et accusé de réception, gabarits HTML sobres, états d'envoi en base (schéma 3), page « Réglages » (destinataire, confirmation) ; pot de miel, jeton temporel signé (`GET /form-token`), limite de débit par condensat d'IP avec 429 et `Retry-After` ; pipeline `SubmissionService`. Plugin 0.3.0. | **validé** (7 septembre 2026, `df20936` intégré à `develop`) |
| **4 — Administration des demandes** | Menu « Pose Parquet → Demandes / Réglages / État ». Liste paginée (20/page) avec les sept filtres de statut et leurs compteurs, recherche sur sept colonnes ; fiche métier — client, projet, Visualiseur lisible, notes, statut, états des emails, historique, acquisition ; changement de statut en POST avec nonce, historique automatique et refus de l'écrasement concurrent par `expected_status` ; notes internes non modifiables ; rôle « Gestionnaire Pose Parquet ». Aucune route REST d'administration, aucun JavaScript. Schéma inchangé (3). Plugin 0.4.0. Branche `feature/backend-demandes`. Voir `admin-projects.md`. | **validé** (7 septembre 2026, `9d336e0` intégré à `develop`) |
| **5 — Connexion au vrai front** | Trois modules front : `api-config.js` (adresse de l'API résolue une seule fois, `null` assumé là où aucun backend n'existe), `project-payload.js` (traduction unique `FormData` → JSON du contrat, contexte `visualizer` sans aucune photo), `submit-adapter.js` (jeton en mémoire seule, réessai unique sur jeton périmé, erreurs typées, délai de 12 s). Fin du mode démonstration : plus de fausse réussite en `localStorage`, l'écran de confirmation n'apparaît que sur un `201` réellement reçu et affiche la référence du serveur. Pot de miel hors cadre plutôt qu'en `display: none`, 422 ramenés sur les champs, 429 et pannes réseau distingués, double clic bloqué. Backend inchangé : plugin 0.4.0, schéma 3. Branche `feature/backend-front-connection`. Voir `front-integration.md`. | **livré, en attente de revue** |
| 6 — Sécurité / tests / préproduction | Revue de sécurité, Turnstile si le bruit le justifie, CORS du reste du site, durée de conservation RGPD, tests d'intégration, WordPress de préproduction hébergé. | à venir |
| Plus tard | Catalogue et synchronisation Premibel (`feature/backend-premibel-sync`, gelée). | gelé |
| Encore plus tard | Passerelle vers le service Python d'analyse d'image : WordPress transporte `analysis_id`, `status`, `scene_data_version`, `scene_data` et joue le rôle de garde (authentification, quota). Voir `docs/future-python-architecture.md`. | non commencé |

## Hors périmètre du backend WordPress

Moteur du Visualiseur, WebGL, `SceneData`, calibration, génération de parquet,
IA, segmentation, profondeur, Python, WooCommerce, comptes clients, paiement.

## Branches

`develop` porte les lots 1 à 4, ainsi que le front Inspiration → Studio.
`feature/backend-front-connection` (lot 5) part de ce `develop` et n'y est pas
encore fusionnée ; elle ne modifie aucun fichier de `backend/`.
`feature/backend-premibel-sync` (gelée) est encore à `3ac4cd3` ; elle sera
remise sur `develop` au moment d'ouvrir son lot, comme les précédentes l'ont
été.

Les branches de lot sont rebasées sur `develop` avant intégration, puis
fusionnées en **fast-forward** : l'historique reste linéaire, sans commit de
fusion. Les branches déjà publiées sont repoussées avec `--force-with-lease`,
jamais avec un `--force` aveugle.
