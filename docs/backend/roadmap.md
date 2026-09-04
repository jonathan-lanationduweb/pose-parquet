# Backend — feuille de route

Ordre retenu. Un lot ne commence pas avant que le précédent soit accepté.

| Lot | Contenu | État |
|---|---|---|
| **0 / 1 — Fondation** | Plugin `pose-parquet-core` : bootstrap, versions, activation idempotente, trois tables versionnées, capabilities, REST `pose-parquet/v1` avec `/health`, page « État », désinstallation prudente, tests de fondation, documentation. Branche `feature/backend-foundation`. | **livré, en attente de revue** |
| 2 — Formulaire / création de demande | `POST /projects` : validation serveur, référence `PP-AAAA-NNNNNN`, insertion + historique initial, réponse minimale au front. Tests unitaires de la validation. | à venir |
| 3 — Emails + anti-spam | `Mail\Mailer` sur `wp_mail()`, accusé de réception au client, notification à l'équipe ; honeypot, temps minimum, limite de débit, Turnstile si nécessaire. | à venir |
| 4 — Administration des demandes | Menu « Demandes » : liste, filtres (statut, département, date), fiche, changement de statut avec historique, notes. Menu « Réglages ». Routes REST d'administration. | à venir |
| 5 — Connexion au vrai front | `submit-adapter.js` pointé sur l'API, message de confirmation réel, fin du mode démonstration. | à venir |
| 6 — Sécurité / tests / préproduction | Revue de sécurité, durée de conservation RGPD, tests d'intégration, WordPress de préproduction hébergé. | à venir |
| Plus tard | Catalogue et synchronisation Premibel (`feature/backend-premibel-sync`, gelée). | gelé |
| Encore plus tard | Passerelle vers le service Python d'analyse d'image : WordPress transporte `analysis_id`, `status`, `scene_data_version`, `scene_data` et joue le rôle de garde (authentification, quota). Voir `docs/future-python-architecture.md`. | non commencé |

## Hors périmètre du backend WordPress

Moteur du Visualiseur, WebGL, `SceneData`, calibration, génération de parquet,
IA, segmentation, profondeur, Python, WooCommerce, comptes clients, paiement.

## Branches

`feature/backend-foundation` (ce lot), `feature/backend-formulaire` (lot 2),
`feature/backend-demandes` (lot 4), `feature/backend-premibel-sync` (gelée).
Les trois autres branches backend sont encore à `3ac4cd3` ; elles seront
remises sur `develop` au moment d'ouvrir leur lot, comme celle-ci l'a été.
