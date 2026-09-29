# Pose-Parquet

Plateforme éditoriale et d'aide au choix autour de la pose du parquet.
Site statique en **HTML / CSS / JavaScript natif (ES Modules)**, sans framework
ni dépendance de production, généré par un outil Node ; backend métier en
extension WordPress.

Direction artistique : composition éditoriale plein cadre — photographies
immersives, très grande typographie serif (Instrument Serif), aplats minéraux,
carrousels et apparitions au scroll.

Dépôt : <https://github.com/jonathan-lanationduweb/pose-parquet>

---

## Présentation

Le site explique la pose du parquet et aide à décider. La V1 validée comprend :

| domaine | contenu |
| --- | --- |
| Guides | 8 guides éditoriaux, dont un cluster « sens de pose » (pilier + satellites) |
| Motifs | 6 fiches motif — droite, largeur, longueur, diagonale, point de Hongrie, bâton rompu |
| Tutoriels | 3 tutoriels de pose (flottant, collé, calepinage) |
| Inspirations | 8 cartes essayables, chacune ouvrant sa propre photographie dans le Studio |
| Mode Plan | simulateur de calepinage vectoriel, 5 motifs, dimensions et lumière |
| Visualiseur / Studio | rendu d'un parquet sur la photographie d'une pièce : 26 références, 3 motifs |
| Import photo | la photo du visiteur, traitée dans son navigateur |
| Comparaison | jusqu'à 3 versions enregistrées, au curseur ou côte à côte |
| Formulaire projet | description d'un projet, envoyée au backend |
| Backend WordPress | réception, stockage, administration et notification des demandes |

32 pages au total.

---

## État du projet

**V1 VALIDÉE — septembre 2026.**

Le site est complet et vérifié : construction reproductible, 9 contrôles
automatiques verts côté front, 812 vérifications vertes côté backend, aucun
débordement horizontal ni contenu masqué par l'en-tête sur les neuf tailles
d'écran de recette.

Ce qui reste avant une mise en ligne publique n'est pas du code : c'est de
l'infrastructure. Voir « Points externes restant avant production ».

---

## Lancer le site en local

Les modules ES ne se chargent pas via `file://` : il faut un serveur.

```bash
node _generator/build.js
node serve.js
```

Puis <http://localhost:5180>. Pour changer de port : `node serve.js 8080`.

**La construction n'est pas optionnelle.** Les pages chargent leurs scripts et
leurs feuilles depuis `assets/dist/<empreinte>/`, pas depuis `js/` et `css/`.
Modifier une source sans reconstruire ne change rien à ce qui s'affiche.

---

## Architecture

### Front

```
pose-parquet.com/
├── index.html, 404.html          pages générées — ne pas éditer à la main
├── a-propos/ contact/ guides/    idem (32 pages au total)
│   inspiration/ motifs/ outils/
│   projet/ tutoriels/
├── config.js                     configuration d'exécution (API), réécrite au déploiement
├── serve.js                      serveur statique de développement
├── sitemap.xml, robots.txt       générés
├── site.webmanifest
│
├── _generator/                   le générateur : 30 modules Node, aucune dépendance
├── _calibrage/                   outils de calibrage des scènes (hors site publié)
│
├── css/
│   ├── tokens.css reset.css global.css main.css
│   ├── fonts.css                 généré par _generator/fetch-fonts.js
│   ├── product.css product-app.css studio.css studio-app.css
│   └── components/               21 feuilles de composants
│
├── js/
│   ├── main.js                   point d'entrée du site éditorial
│   ├── animations/               reveal
│   ├── components/               accordion, before-after, carousel, filters,
│   │                             hero-media, modal, nav, scroll-carousel,
│   │                             tabs, toc, tooltip
│   ├── forms/                    api-config, project-payload, studio-handoff,
│   │                             submit-adapter
│   ├── product/                  visualiseur produit : app, main, tour, viewport
│   ├── scene/                    moteur : analyzer, editor, export, geometry,
│   │                             image-loader, mask, material, motifs-regles,
│   │                             perspective, preview, product, relief,
│   │                             renderer, renderer-canvas, renderer-gl,
│   │                             scenes-regles, schema, shading, texture,
│   │                             texture-worker
│   ├── studio/                   app, catalog, compare, help, main
│   ├── tools/                    floor-visualizer, patterns, plan-state
│   └── utils/                    diagnostic, dom, icons, motion, perf
│
├── components/project-form/      formulaire projet : html, css, js, config
│
├── data/
│   ├── parquets.json                    catalogue du Studio
│   ├── products.premibel-pilot.json     pilote : références Premibel réelles
│   ├── products.premibel-exemple.json   exemple de format d'échange
│   ├── render-families.json             familles de rendu
│   ├── room-tours.json                  visites de pièce
│   ├── contenus.json                    index de contenus, généré
│   └── scenes/                          manifeste et fiches des scènes
│
├── assets/
│   ├── dist/                     sortie de construction, empreintée
│   └── fonts/ icons/ images/ materials/ photos/ textures/ videos/
│
├── backend/                      extension WordPress + outils de déploiement
├── docs/                         31 documents d'ingénierie
└── design/                       références de direction artistique
```

### Backend

```
backend/
├── pose-parquet-core/            l'extension WordPress (59 fichiers au dépôt)
│   ├── pose-parquet-core.php     amorce, version, constantes
│   ├── src/                      Admin, Antispam, Database, Mail, Projects,
│   │                             Rest, Security, Support
│   ├── templates/                écrans d'administration et gabarits d'email
│   ├── tests/                    5 scripts de vérification (non livrés)
│   └── readme.md                 fonctionnement détaillé (non livré)
├── deploy/
│   ├── faire-paquet.sh           construit le paquet de production (51 fichiers)
│   └── htaccess-hardening.conf   règles serveur
└── tools/traiter-file-mail.php   vidange manuelle de la file d'envoi
```

Base de données — trois tables, préfixées par celle du site :

| table | rôle |
| --- | --- |
| `pp_projects` | une demande de projet, telle que remplie par le visiteur |
| `pp_project_history` | chaque changement de statut d'une demande |
| `pp_project_notes` | les notes internes de l'équipe sur une demande |

Schéma en version **3**. Extension en version **0.5.0**.

### Règles de code

- Pas de framework, pas de bundler, pas de dépendance de production.
- Les pages sont **générées** : toute correction se fait dans `_generator/`.
- Un nombre affiché au public est lu dans sa source, jamais écrit à la main
  (`_generator/check-chiffres.js` le vérifie).
- Une règle métier vit à un seul endroit et se partage entre le front et le
  générateur (`js/scene/motifs-regles.js`, `js/scene/scenes-regles.js`).

---

## Visualiseur

Le Studio pose un parquet sur la photographie d'une pièce.

- **WebGL 2 écrit à la main**, avec repli sur un moteur Canvas 2D quand le
  contexte n'est pas disponible. Le choix et ses mesures :
  [docs/renderer-canvas-vs-webgl.md](docs/renderer-canvas-vs-webgl.md).
- **Worker** pour le calcul des textures, avec repli synchrone si `Worker` ou
  `OffscreenCanvas` manquent.
- **La photo est traitée dans le navigateur.** Aucune photographie personnelle
  n'est envoyée à un serveur : le site est statique et ne dispose d'aucun point
  de dépôt d'image.
- **Calibration manuelle** : la géométrie d'une pièce est relevée à la main et
  enregistrée dans `data/scenes/`. Il n'y a pas de détection automatique du sol
  en service — l'étude et la décision sont dans
  [docs/segmentation-automatique.md](docs/segmentation-automatique.md), le
  contrat d'une API d'analyse dans
  [docs/future-ai-api-contract.md](docs/future-ai-api-contract.md). Aucune de
  ces deux pistes n'est implémentée.
- **Motifs** : lames droites, point de Hongrie, bâton rompu. La compatibilité
  entre une référence et un motif vient de la donnée (`compatiblePatterns`),
  jamais du nom du produit ; l'interface désactive ce qui n'existe pas et le
  moteur applique la même règle en dernier ressort.
- **Comparaison** : jusqu'à 3 versions, au curseur pour deux, côte à côte
  au-delà.
- **Sauvegarde** locale, dans le navigateur, et reprise à la réouverture.

Le manifeste compte 15 scènes ; 9 sont proposées dans « Changer de pièce », les
autres restent ouvrables par lien direct depuis leur carte d'inspiration.

Le **Mode Plan** (`js/tools/`) est un outil distinct : un plan de calepinage
vectoriel à 5 motifs, qui ne dessine aucune référence réelle.

---

## Backend / leads

Le formulaire projet (`components/project-form/`) envoie une demande à
l'extension WordPress par son API REST.

1. **Réception** — `POST /pose-parquet/v1/projects`, JSON uniquement, origine
   contrôlée, jeton de formulaire à usage unique, pot de miel, limite de débit.
2. **Création en base** — une ligne dans `pp_projects`, avec une référence
   lisible, et une première entrée d'historique.
3. **Historique** — chaque changement de statut est enregistré, avec son auteur.
4. **File d'envoi asynchrone** — les deux courriels (confirmation au visiteur,
   notification interne) partent d'une file portée par WP-Cron, et non de la
   requête HTTP. Quatre tentatives au plus, espacées de 0, 5 min, 30 min et 2 h.
   L'idempotence s'appuie sur le statut en base, et un verrou MySQL empêche deux
   crons simultanés de doubler un envoi.
5. **Administration WordPress** — liste des demandes, détail, statuts, notes
   internes, filtres « notification en attente » et « notification échouée »,
   relance manuelle d'un envoi.
6. **Diagnostics** — un écran d'état donne l'état de la file, la prochaine
   échéance, et avertit franchement quand `DISABLE_WP_CRON` vaut `true` sans
   cron système déclaré.

Détail : [docs/backend/](docs/backend/) et
[backend/pose-parquet-core/readme.md](backend/pose-parquet-core/readme.md).

---

## Environnements

| environnement | front | backend |
| --- | --- | --- |
| Local | `node _generator/build.js` puis `node serve.js` (port 5180) | WordPress local, `http://pose-parquet-dev.local` |
| Préproduction | GitHub Pages, `*.github.io`, marqué `noindex, nofollow` | non déployé |
| Production | GitHub Pages sur le domaine, indexable | non déployé |

Deux variables de dépôt pilotent le déploiement :

- `SITE_ENVIRONMENT` — `production` ou `staging`. **Absente, elle vaut
  `staging`** : l'artefact est alors marqué `noindex, nofollow`. C'est cette
  variable, et elle seule, qui décide de l'indexation ; la présence d'un `CNAME`
  ne fait l'objet que d'un avertissement de cohérence.
- `API_BASE_URL` — racine REST du backend. Obligatoirement en HTTPS, sinon le
  déploiement échoue. Absente, le formulaire projet affiche son indisponibilité
  au lieu d'échouer silencieusement.

Les fichiers du dépôt décrivent **toujours la production** : canoniques en
`pose-parquet.com`, `robots` en `index, follow`, sitemap complet. Aucun
`noindex` n'existe dans le dépôt, donc aucun ne peut fuiter en production.
Procédure : [docs/seo-environnements.md](docs/seo-environnements.md).

---

## Tests

### Front — 9 contrôles

```bash
node _generator/build.js
node _generator/check-images.js
node _generator/check-links.js
node _generator/check-inspiration.js
node _generator/check-reproducible.js
node _generator/check-product-visualizer.js
node _generator/check-studio-api.js
node _generator/check-chiffres.js
node _generator/check-fonts.js
node _generator/check-motifs.js
```

| contrôle | ce qu'il garantit |
| --- | --- |
| `check-images` | chaque image référencée existe, avec dimensions et texte alternatif |
| `check-links` | aucun lien interne mort |
| `check-inspiration` | chaque carte essayable ouvre bien sa propre photographie |
| `check-reproducible` | mêmes empreintes sous Windows et Linux (24 vérifications) |
| `check-product-visualizer` | contrat du visualiseur produit |
| `check-studio-api` | contrat de l'API de pilotage du Studio |
| `check-chiffres` | aucun nombre public écrit en dur (11 vérifications) |
| `check-fonts` | polices dédoublonnées, préchargements valides (10 vérifications) |
| `check-motifs` | aucune combinaison référence × motif impossible n'est posable (60 vérifications) |

Relevé du 29/09/2026 : **9 contrôles verts**, construction en code 0.

### Backend — 812 vérifications

```bash
php backend/pose-parquet-core/tests/run-validator.php   <racine WordPress>
php backend/pose-parquet-core/tests/run-foundation.php  <racine WordPress>
php backend/pose-parquet-core/tests/run-projects.php    <racine WordPress>
php backend/pose-parquet-core/tests/run-admin.php       <racine WordPress>
php backend/pose-parquet-core/tests/run-http.php        <URL WordPress>
```

| suite | vérifications |
| --- | --- |
| `run-validator` | 166 |
| `run-foundation` | 97 |
| `run-projects` | 287 |
| `run-admin` | 202 |
| `run-http` | 60 |
| **total** | **812**, 0 échec |

`run-http` laisse des demandes de test que `run-projects` efface : le relancer
ensuite. Rien d'autre n'est ordonné.

### Recette responsive

Neuf tailles — 320×568, 390×844, 568×320, 844×390, 768×1024, 1024×768,
1440×900, 1920×1080, 2560×1440 — sur l'accueil, l'inspiration, le Studio, le
Mode Plan, le formulaire projet et la page 404. Relevé du 29/09/2026 :
**0 débordement horizontal, 0 contenu sous l'en-tête** sur les 54 combinaisons.

---

## Sécurité

Côté API :

- **Jeton de formulaire** à usage unique, délivré par une route dédiée, réclamé
  de façon atomique par un verrou MySQL.
- **Limite de débit** par identité client : 5 créations par heure par défaut,
  réponse `429` avec `Retry-After`, sans divulguer d'identifiant ni d'adresse.
- **Pot de miel** et contrôles de forme dans le validateur.
- **JSON uniquement** : un `Content-Type` autre est refusé.
- **CORS** restreint à une liste fermée d'origines, à la place du CORS permissif
  de WordPress.

Côté WordPress :

- Réduction de la surface publique : énumération des utilisateurs, XML-RPC,
  points REST superflus.
- Capacités et rôles dédiés, vérifiés à chaque action d'administration ; nonces
  sur les actions.
- Le paquet de production ne contient ni `tests/` ni `readme.md` — 51 fichiers
  livrés sur 59 au dépôt — et les règles `.htaccess` ferment ces chemins en
  seconde barrière.

Côté front :

- Toute donnée externe est échappée avant insertion dans le document.
- Les `productUrl` du catalogue sont validées avant d'être posées en lien.
- Aucune photographie du visiteur ne quitte son navigateur.

Détail : [docs/backend/security.md](docs/backend/security.md),
[docs/backend/antispam.md](docs/backend/antispam.md).

---

## Déploiement

GitHub Pages, par `.github/workflows/deploy-pages.yml`.

1. **Construction** — `node _generator/build.js` sur le coureur.
2. **Artefact** — le workflow recopie le SITE, et rien d'autre : `docs`,
   `design`, `backend`, `_generator`, `_calibrage`, `.github`, `.claude`,
   `.vscode`, `.kilo`, `README.md`, `js`, `css` et `components` sont exclus.
   Une étape de contrôle échoue si l'un de ces chemins se retrouve dans `_site`.
3. **Configuration** — `config.js` est réécrit avec `API_BASE_URL` (HTTPS
   obligatoire).
4. **Indexation** — `SITE_ENVIRONMENT != 'production'` marque l'artefact
   `noindex, nofollow`.

Le paquet du plugin WordPress se construit séparément :

```bash
bash backend/deploy/faire-paquet.sh
```

Il part d'une liste d'**inclusion** : ce qui n'est pas nommé ne part pas. Il
échoue s'il trouve un fichier indésirable, et échoue aussi s'il manque un
fichier indispensable.

---

## Points externes restant avant production

Rien de ce qui suit n'est du code. Tout est encore à faire.

| point | état |
| --- | --- |
| **SMTP réel** | aucun serveur d'envoi n'est configuré. La file fonctionne et a été vérifiée, mais aucun courriel n'a été reçu par un destinataire réel. |
| **Cron système** | `DISABLE_WP_CRON` vaut `true` ici comme en production. Tant qu'une tâche système n'appelle pas `wp-cron.php`, la file ne se vide que manuellement. |
| **Backend public** | l'extension ne tourne que sur l'installation locale. Aucun WordPress n'est exposé. |
| **Hébergement** | à choisir pour le backend — [docs/hebergement.md](docs/hebergement.md). |
| **DNS** | le domaine ne pointe pas encore sur le déploiement. |
| **HTTPS** | à obtenir sur le backend une fois l'hébergement choisi. |
| **En-têtes de sécurité** | CSP, HSTS et consorts restent à poser au niveau serveur. |
| **Durée de rétention** | aucune politique de purge des demandes n'est définie ni implémentée. |

---

## V2 — orientation validée

**La V1 est validée. La V2 ne consiste pas à refaire le site.**

Pose-Parquet conserve sa valeur éditoriale et ses outils. Ce qui change, c'est
la suite du parcours : il doit progressivement orienter les visiteurs vers les
offres et services adaptés de **Premibel** et d'**Allure Design**.

Le rôle précis d'Allure Design dans ce parcours **reste à définir**. Rien n'est
arbitré à ce jour, et rien dans le code ne le préjuge.

### Roadmap V2

1. **Repositionnement commercial** — ce que le site promet, et à qui.
2. **Parcours de conversion** — du contenu à la demande qualifiée.
3. **Connexion du catalogue Premibel** — le pilote devient un flux ; voir
   [docs/premibel-sync-contract.md](docs/premibel-sync-contract.md).
4. **Intégration Allure Design** — périmètre à définir.
5. **Qualification et routage des leads** — qui reçoit quoi, et sur quel critère.
6. **Suivi des conversions**.
7. **Évolution du back-office** — ce que l'administration doit montrer une fois
   les leads qualifiés et routés.

### Branches prévues

Créées au moment où leur travail commence, pas avant :

```
feature/v2-commercial-positioning     (créée)
feature/v2-premibel-catalog
feature/v2-allure-design-routing
feature/v2-lead-qualification
feature/v2-conversion-tracking
```

Flux Git et rôle des branches : [docs/git-workflow.md](docs/git-workflow.md).

---

## Polices

Instrument Serif pour les titres, Inter pour le texte, auto-hébergées en woff2
dans `assets/fonts/` et déclarées par `css/fonts.css`, **généré** par
`_generator/fetch-fonts.js`.

Inter est une **police variable** : un seul binaire porte tout l'axe des
graisses, déclaré `font-weight: 100 900`. Six fichiers au total — 4 statiques
pour Instrument Serif, 2 variables pour Inter — soit 196 Ko. Les deux fichiers
préchargés sont lus dans `css/fonts.css` par `_generator/polices.js` : un
renommage ne peut pas laisser un `preload` pointer dans le vide.

---

## Identité visuelle et médias

Icônes, favicons et manifeste sont produits par `_generator/make-icons.js`. Les
photographies sont téléchargées par `_generator/fetch-photos.js`. Les formats
attendus pour de vraies cartes de matière sont décrits dans
[assets/materials/README.md](assets/materials/README.md).

La vidéo d'en-tête est optionnelle : tant que le `data-src` de la balise vidéo
est vide, l'image `hero-poster.jpg` sert de repli et aucune vidéo n'est
téléchargée.

---

## SEO

- `title`, `meta description`, `canonical`, Open Graph et Twitter Card sur
  chaque page.
- Données structurées : `WebSite`, `Article`, `HowTo`, `FAQPage`,
  `BreadcrumbList`, `WebApplication`.
- Fil d'Ariane visible et balisé.
- `sitemap.xml` et `robots.txt` générés à la racine.
- Cluster « sens de pose » : guide pilier, guides satellites et simulateur,
  reliés entre eux.

---

## Notes d'ingénierie

### Front et moteur

| document | sujet |
| --- | --- |
| [docs/renderer-canvas-vs-webgl.md](docs/renderer-canvas-vs-webgl.md) | pourquoi WebGL 2 écrit à la main, pourquoi pas Three.js, avec les mesures |
| [docs/segmentation-automatique.md](docs/segmentation-automatique.md) | détection automatique du sol : étude et décision |
| [docs/future-ai-api-contract.md](docs/future-ai-api-contract.md) | contrat de l'API d'analyse d'image — spécifié, non implémenté |
| [docs/future-python-architecture.md](docs/future-python-architecture.md) | architecture Python prévue — aucune ligne écrite |
| [docs/photo-lens-distortion.md](docs/photo-lens-distortion.md) | photos, objectifs et distorsion |
| [docs/room-tour-protocol.md](docs/room-tour-protocol.md) | visiter une pièce — ce qu'il faut photographier |
| [docs/inspiration-studio.md](docs/inspiration-studio.md) | inspiration → Studio : ce qui est essayable, et pourquoi pas le reste |
| [docs/product-visualizer-integration-v1.md](docs/product-visualizer-integration-v1.md) | visualiseur produit — intégration directe |
| [docs/front-global-audit.md](docs/front-global-audit.md) | recette globale du front |
| [docs/benchmark-ikea-home-design.md](docs/benchmark-ikea-home-design.md) | observation d'IKEA Home Design et écarts |

### Catalogue Premibel

| document | sujet |
| --- | --- |
| [docs/premibel-integration.md](docs/premibel-integration.md) | brancher le catalogue Premibel sur le visualiseur |
| [docs/premibel-data-audit.md](docs/premibel-data-audit.md) | audit du catalogue parquet Premibel |
| [docs/premibel-sync-contract.md](docs/premibel-sync-contract.md) | contrat de synchronisation Premibel → visualiseur |
| [docs/premibel-material-capture.md](docs/premibel-material-capture.md) | produire une vraie matière pour le visualiseur |

### Backend

| document | sujet |
| --- | --- |
| [docs/backend/architecture.md](docs/backend/architecture.md) | architecture de l'extension |
| [docs/backend/wordpress-plugin.md](docs/backend/wordpress-plugin.md) | fonctionnement de `pose-parquet-core` |
| [docs/backend/database.md](docs/backend/database.md) | base de données |
| [docs/backend/rest-api.md](docs/backend/rest-api.md) | API REST |
| [docs/backend/project-form-contract.md](docs/backend/project-form-contract.md) | contrat formulaire → API → base |
| [docs/backend/front-integration.md](docs/backend/front-integration.md) | branchement du formulaire réel |
| [docs/backend/admin-projects.md](docs/backend/admin-projects.md) | administration des demandes |
| [docs/backend/email.md](docs/backend/email.md) | emails transactionnels |
| [docs/backend/antispam.md](docs/backend/antispam.md) | anti-spam |
| [docs/backend/security.md](docs/backend/security.md) | sécurité |
| [docs/backend/production.md](docs/backend/production.md) | mise en production du backend |
| [docs/backend/roadmap.md](docs/backend/roadmap.md) | feuille de route backend |

### Exploitation

| document | sujet |
| --- | --- |
| [docs/seo-environnements.md](docs/seo-environnements.md) | indexation préproduction / production |
| [docs/hebergement.md](docs/hebergement.md) | hébergement et DNS |
| [docs/formulaire-production.md](docs/formulaire-production.md) | état réel du formulaire, ce qu'il manque avant le lancement |
| [docs/migration-url-map.md](docs/migration-url-map.md) | migration de l'ancien pose-parquet.com |
| [docs/git-workflow.md](docs/git-workflow.md) | flux Git et rôle des branches |
| [_generator/README.md](_generator/README.md) | le générateur, module par module |

---

## Liens externes

Le site est indépendant. Un unique lien éditorial vers `premibel.fr` figure
dans le guide « Parquet massif ou contrecollé », là où il complète réellement
le propos. La V2 fera évoluer ce point — c'est précisément son objet.
