# Backend — feuille de route

Ordre retenu. Un lot ne commence pas avant que le précédent soit accepté.

| Lot | Contenu | État |
|---|---|---|
| **0 / 1 — Fondation** | Plugin `pose-parquet-core` : bootstrap, versions, activation idempotente, trois tables versionnées, capabilities, REST `pose-parquet/v1` avec `/health`, page « État », désinstallation prudente, tests de fondation, documentation. | **validé** (4 septembre 2026, `4b03ce9` intégré à `develop`) |
| **2 — Création d'une demande** | `POST /projects` : contrat relevé sur le formulaire réel (`project-form-contract.md`), `Projects\Fields` / `Validator` / `Repository` / `Service`, référence `PP-AAAA-NNNNNN` dérivée de l'id, transaction InnoDB, historique initial, erreurs `{code, message, fields}`, CORS à liste fermée, schéma 2 (`style`, `reference` nullable), plugin 0.2.0, quatre suites de tests (validateur, fondation, WordPress réel + concurrence, HTTP). Branche `feature/backend-formulaire`. | **livré, en attente de revue** |
| 3 — Emails + anti-spam | `Mail\Mailer` sur `wp_mail()`, accusé de réception au client, notification à l'équipe ; honeypot, temps minimum, limite de débit (429), Turnstile si nécessaire. | à venir |
| 4 — Administration des demandes | Menu « Demandes » : liste, filtres (statut, département, date), fiche, changement de statut avec historique, notes. Menu « Réglages ». Routes REST d'administration. | à venir |
| 5 — Connexion au vrai front | `submit-adapter.js` pointé sur l'API, traduction `FormData` → JSON du contrat, envoi du contexte Visualiseur, message de confirmation réel, fin du mode démonstration. | à venir |
| 6 — Sécurité / tests / préproduction | Revue de sécurité, CORS du reste du site, durée de conservation RGPD, tests d'intégration, WordPress de préproduction hébergé. | à venir |
| Plus tard | Catalogue et synchronisation Premibel (`feature/backend-premibel-sync`, gelée). | gelé |
| Encore plus tard | Passerelle vers le service Python d'analyse d'image : WordPress transporte `analysis_id`, `status`, `scene_data_version`, `scene_data` et joue le rôle de garde (authentification, quota). Voir `docs/future-python-architecture.md`. | non commencé |

## Hors périmètre du backend WordPress

Moteur du Visualiseur, WebGL, `SceneData`, calibration, génération de parquet,
IA, segmentation, profondeur, Python, WooCommerce, comptes clients, paiement.

## Branches

`develop` porte la fondation. `feature/backend-formulaire` (lot 2) part de
`develop` et n'y est pas encore fusionnée. `feature/backend-demandes` (lot 4)
et `feature/backend-premibel-sync` (gelée) sont encore à `3ac4cd3` ; elles
seront remises sur `develop` au moment d'ouvrir leur lot.
