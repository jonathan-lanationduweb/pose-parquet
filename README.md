# pose-parquet.com

Média pratique et boîte à outils autour de la pose du parquet.
Site statique en **HTML / CSS / JavaScript natif (ES Modules)**, sans framework
ni dépendance externe.

Direction artistique : composition éditoriale plein cadre — photographies
immersives, très grande typographie serif (Instrument Serif), aplats minéraux,
carrousels et apparitions au scroll.

Dépôt : <https://github.com/jonathan-lanationduweb/pose-parquet>

---

## Lancer le site en local

Les modules ES ne se chargent pas via `file://` : il faut un serveur.
Un serveur statique minimal (Node, zéro dépendance) est fourni.

```bash
node serve.js
```

Puis ouvrir <http://localhost:5180>. Pour changer de port : `node serve.js 8080`.

---

## Architecture

```
pose-parquet.com/
├── index.html              Accueil
├── 404.html
├── guides/                 8 guides éditoriaux + index de rubrique
├── motifs/                 6 fiches motif + index
├── tutoriels/              3 tutoriels + index
├── inspiration/            Galerie + lightbox
├── outils/                 Index des outils + simulateur-pose.html
├── projet/                 Formulaire projet (point de montage)
├── contact/  a-propos/
│
├── css/
│   ├── main.css            Point d'entrée (importe fonts, tokens, reset, global, composants)
│   ├── fonts.css           @font-face auto-hébergés (généré)
│   ├── tokens.css          Couleurs, typographie, espacements, mouvements
│   ├── reset.css  global.css
│   ├── components/         Un fichier par composant du design system
│   └── pages/              Styles spécifiques à un gabarit de page
│
├── js/
│   ├── main.js             Chef d'orchestre : importe un module seulement si la page l'utilise
│   ├── utils/              dom.js, motion.js, icons.js
│   ├── animations/         reveal.js (apparition au scroll)
│   ├── components/         nav (menu plein écran), carousel (drag/swipe/clavier),
│   │                       accordion, tabs, modal/lightbox, tooltip, toc,
│   │                       before-after, filters, hero-media
│   ├── scene/              Le moteur du Visualiseur Parquet (voir plus bas)
│   ├── studio/             L'interface du Visualiseur Parquet (app, catalogue, comparaison)
│   ├── tools/              patterns.js (registre des motifs) + floor-visualizer.js (mode plan)
│   └── forms/              submit-adapter.js (abstraction d'envoi)
│
├── components/
│   └── project-form/       Composant formulaire projet, autonome et remplaçable
│
├── assets/
│   ├── images/             Photographies (JPEG) + schémas vectoriels + CREDITS.md
│   ├── fonts/              Instrument Serif + Inter (woff2 auto-hébergés)
│   ├── icons/favicon.svg
│   └── videos/             Emplacement de la vidéo du hero (voir README dédié)
│
├── data/
│   ├── contenus.json       Index machine des contenus (guides, motifs, tutoriels, outils)
│   ├── parquets.json       Catalogue des parquets de démonstration
│   └── scenes/             Pièces d'exemple calibrées à la main (index.json + une par pièce)
│
├── docs/                   Notes d'ingénierie et contrats à venir
├── _calibrage/             Outil interne de calibrage des scènes et banc d'essai des moteurs
├── robots.txt  sitemap.xml
├── serve.js                Serveur statique de développement
└── _generator/             Générateur Node optionnel des pages HTML (voir son README)
```

Le site livré est du HTML statique : il se modifie directement. `_generator/`
n'est qu'un confort pour régénérer l'en-tête, le pied de page et les balises
communes sur les 29 pages d'un coup (`node _generator/build.js`).

### Règles de code

- Aucun CSS ni JavaScript en ligne dans les fichiers HTML.
- Un composant = un fichier CSS + un fichier JS.
- Les modules JS sont importés dynamiquement selon la présence du composant dans la page.
- `prefers-reduced-motion` est respecté (CSS et JS).
- Toutes les images portent `width`/`height` (pas de CLS) et `loading="lazy"` hors hero.

---

## Simulateur de pose (mode plan)

Point de montage :

```html
<div data-visualizer data-base="../"></div>
<div data-visualizer data-mode="compact" data-base="../"></div>
```

- `data-base` : préfixe de chemin vers la racine (`""` à la racine, `"../"` ailleurs).
- `data-mode="compact"` : version courte, intégrée dans les articles.
- Rendu 100 % SVG, recalculé à chaque changement d'état.
- Paramètres : longueur, largeur, largeur de lame, position de la fenêtre,
  position de l'entrée, teinte, motif.
- Sorties : surface, chutes estimées, nombre de lames, conseil contextuel.

### Ajouter un motif

Tout se passe dans `js/tools/patterns.js` : ajouter une entrée au tableau `PATTERNS`.

```js
{
  id: 'mon-motif',
  label: 'Mon motif',
  short: 'Description courte.',
  build: (ctx) => [],
  advice: (ctx) => 'Conseil affiché sous le rendu.',
}
```

`build(ctx)` renvoie une liste de lames `{ points: [[x, y], ...], shade: 0..1 }`.
`ctx` fournit `length`, `width`, `plankWidth`, `plankLength` (en centimètres) et
la configuration de la pièce. Le sélecteur, les miniatures et le rendu se mettent
à jour automatiquement.

---

## Carrousels

Deux carrousels, un seul composant (`js/components/carousel.js`) :

- **éditorial** (guides) : image, catégorie, titre, extrait, lien ;
- **galerie** (inspiration) : grandes photographies, formats alternés.

Marquage attendu :

```html
<section data-carousel>
  <button data-carousel-prev></button>
  <button data-carousel-next></button>
  <span data-carousel-count></span>
  <div class="carousel carousel--editorial">
    <div class="carousel__viewport" data-carousel-viewport tabindex="0" role="region">
      <article class="carousel__slide">…</article>
    </div>
    <div class="carousel__progress"><span data-carousel-progress></span></div>
  </div>
</section>
```

Fonctions : glisser-déposer à la souris, swipe tactile natif, boutons
précédent / suivant, clavier (flèches, Origine, Fin), barre de progression,
compteur, et affleurement de la slide suivante sur desktop.

Le défilement programmé utilise un tween maison plutôt que
`scrollTo({ behavior: 'smooth' })` : le `scroll-snap-type: mandatory` annule
les animations de défilement déclenchées en JavaScript.

---

## Polices

`node _generator/fetch-fonts.js` télécharge Instrument Serif (titres) et Inter
(interface) depuis Google Fonts — licence SIL OFL — vers `assets/fonts/`, puis
régénère `css/fonts.css`. Aucune requête externe à l'exécution du site.

---

## Formulaire projet

Le formulaire est un **composant indépendant** monté sur un conteneur neutre :

```html
<div data-project-form></div>
```

- `components/project-form/project-form.config.js` : toutes les étapes et tous les champs.
- `components/project-form/project-form.js` : rendu, navigation, validation, états.
- `components/project-form/project-form.css` : styles isolés sous `.project-form`.
- `components/project-form/project-form.html` : bloc de montage à copier dans une page.

> **État réel : le formulaire n'envoie rien.** Sans `endpoint` configuré, la
> demande est conservée dans le `localStorage` du visiteur et personne ne la
> reçoit. L'écran de fin le dit explicitement (« Mode démonstration — votre
> demande n'a pas été envoyée »), et redevient un remerciement normal dès qu'un
> point de réception existe. Ce qu'il reste à faire avant le lancement, y
> compris la vérification des adresses email affichées :
> [docs/formulaire-production.md](docs/formulaire-production.md).

### Brancher un backend

`js/forms/submit-adapter.js` isole l'envoi. Sans `endpoint`, la demande est
stockée en local (`localStorage`) et l'écran de confirmation s'affiche.

```js
import { configureSubmit } from './js/forms/submit-adapter.js';
configureSubmit({ endpoint: 'https://api.exemple.fr/leads' });
```

### Remplacer le formulaire

Aucune page ne dépend de la structure interne du composant : il suffit de ne plus
monter `mountProjectForm` (dans `js/main.js`) et de placer le formulaire
partenaire dans le conteneur `[data-project-form]`.

---

## Visualiseur Parquet (`js/scene/` + `js/studio/`)

Pages : `outils/visualiseur.html` (la landing) et `outils/studio.html`
(l'application). Le nom public est **Visualiseur Parquet** ; « studio » ne
subsiste que comme nom technique — fichiers, classes CSS, stockage local — parce
que l'URL est indexée et qu'un identifiant interne n'a pas à porter le nom
commercial.

### Le principe : une SCÈNE, puis un rendu

```
IMAGE  →  analyzeScene()  →  SceneData  →  moteur de rendu  →  canevas
```

Le moteur de rendu **ne sait pas d'où viennent les données**. Elles arrivent
aujourd'hui de deux endroits, et un troisième est déjà prévu :

| stratégie | source | statut |
| --- | --- | --- |
| `precalibrated` | `data/scenes/<id>.json`, calibré à la main | en service |
| `manual` | plan de départ que l'utilisateur ajuste | en service |
| `remote` | service d'analyse d'image | **non implémenté**, contrat écrit |

Une **scène** décrit tout ce qu'il faut savoir d'une photo pour y poser un
parquet : plusieurs zones de sol, chacune avec son plan de perspective et son
contour, les objets qui doivent rester devant, l'éclairement, la caméra.
Deux zones qui partagent une `surfaceId` sont le même sol : elles reçoivent
forcément le même bois. Deux zones qui partagent un `planeRef` sont sur le même
plan : la trame se prolonge exactement d'une pièce à l'autre.

Le schéma complet est commenté dans `js/scene/schema.js`. Le contrat de la
future API est dans [docs/future-ai-api-contract.md](docs/future-ai-api-contract.md).

### Les fichiers

| Fichier | Rôle |
| --- | --- |
| `scene/schema.js` | Le format `SceneData` : zones, plans, surfaces, occlusions, lumière |
| `scene/analyzer.js` | `analyzeScene()` et le registre des stratégies — le seul point de branchement |
| `scene/texture.js` | Albedo du bois : tuile procédurale répétable, **mesurée en mètres** (4,80 m / 1280 px) |
| `scene/material.js` | Le matériau : lame, finition, rugosité, relief ; emplacements prévus pour de vraies cartes |
| `scene/mask.js` | Étiquettes de zones + couverture + occlusions, en deux cartes quel que soit le nombre de zones |
| `scene/shading.js` | Éclairement basse fréquence **en couleur**, reflets, ombre de contact |
| `scene/geometry.js` | Homographies de zone et direction de la lumière — partagé par les deux moteurs |
| `scene/renderer.js` | Choisit le moteur, calcule une fois ce qui ne dépend que de la photo |
| `scene/renderer-gl.js` | WebGL 2 sans bibliothèque : un quadrilatère par zone, filtrage anisotrope matériel |
| `scene/renderer-canvas.js` | Canvas 2D : même chaîne, en tableaux typés. Recours et référence |
| `scene/editor.js` | Correction du sol : cadre, contour, pinceau |
| `scene/preview.js` | La démonstration avant / après de l'accueil, sur le vrai moteur |
| `scene/export.js` | Composition et téléchargement du rendu |
| `studio/app.js` | L'application : trois écrans, un panneau, un tiroir |
| `studio/catalog.js` | Catalogue de parquets, échantillons dessinés à la demande |
| `studio/compare.js` | Comparaison de deux ou trois variantes sur la même scène |

### Ce que fait réellement la version en service

- Les quatre pièces d'exemple sont **calibrées à la main** avec `_calibrage/`.
  Aucune analyse d'image, aucune détection, aucune IA — et l'interface ne
  prononce aucun de ces mots, parce que ce serait faux.
- Sur une photo importée, l'utilisateur place le cadre du sol, affine le contour
  et efface au pinceau ce qui doit rester devant.
- Le motif est calculé **dans le plan du sol, en mètres**, puis projeté. Une
  lame de 18 cm mesure 18 cm au premier plan comme au fond : elle rétrécit et
  converge d'elle-même. Idem pour le point de Hongrie et le bâton rompu, dont
  les chevrons appartiennent au sol.
- L'éclairement est repris de la photo, séparé en basse et haute fréquence : on
  garde le soleil et les ombres, on jette la trame de l'ancien revêtement.
- La profondeur est dérivée analytiquement du plan (exacte pour les pixels de
  sol) ; le champ `scene.depth` prévoit une carte d'image pour la suite.

### Brancher une analyse automatique, plus tard

Un seul point à toucher :

```js
import { registerAnalyzer } from './js/scene/analyzer.js';

registerAnalyzer('remote', async ({ file }) => {
  const body = new FormData();
  body.append('image', file);
  const response = await fetch(`${API}/analyze-room`, { method: 'POST', body });
  return response.json(); // même schéma que data/scenes/*.json
});
```

Rien d'autre ne change : ni le schéma, ni les moteurs, ni les masques, ni les
matériaux, ni la comparaison, ni l'export. L'écran de correction ne disparaît
pas non plus — il devient facultatif. Voir
[docs/future-python-architecture.md](docs/future-python-architecture.md).

**Contrainte tenue aujourd'hui** : les photos importées ne quittent jamais le
navigateur — lecture par `URL.createObjectURL`, traitement en Canvas, aucun
envoi réseau. Un service distant changerait cela : ce devra être un choix
explicite, jamais le comportement par défaut.

### Le matériau

Un parquet n'est pas une teinte. `js/scene/material.js` en fait un objet complet :
dimensions de lame, finition, rugosité et brillance déduites du libellé de
finition, amplitude du relief — et **trois emplacements de cartes physiques**
(`albedo`, `normal`, `roughness`).

Ces cartes sont **vides aujourd'hui**, à dessein : nous n'avons pas de ressource
photographique dont la licence autorise cet usage, et fabriquer de fausses
normal maps n'apporterait rien. Les douze références sont donc **procédurales** —
calculées, pas photographiées — et le relief est dérivé de la luminance de
l'albedo : faux physiquement, mais visuellement juste sur du bois. Le modèle de
données est prêt à recevoir de vraies cartes ; les formats attendus et les
pièges sont dans [assets/materials/README.md](assets/materials/README.md).

**Dimensions par motif.** Une largeur de lame unique pour les trois motifs n'a
pas de sens : on ne pose pas un point de Hongrie avec des lames de 22 cm. Chaque
référence déclare donc un profil par motif (`patternProfiles`) :

```json
"patternProfiles": {
  "lames":            { "width": 0.18, "length": 1.8 },
  "point-de-hongrie": { "width": 0.09, "length": 0.6, "angleDeg": 45 },
  "baton-rompu":      { "width": 0.09, "length": 0.45 }
}
```

**L'angle du point de Hongrie est un paramètre, pas une constante.** 45° est le
plus répandu, mais 30° et 60° existent et changent nettement le rendu. Le moteur
prend l'angle en entrée ; les contenus éditoriaux ne présentent plus 45° comme
une règle.

### L'interface

Une seule règle de composition : **la pièce est le sujet.**

- La photo n'est pas dans une carte : elle va au bord du cadre, sans rayon ni
  marge décorative. Le pourtour est charbon — une photo d'intérieur se juge sur
  fond sombre, et le blanc cassé du site lui vole sa clarté.
- **Une action = un contexte.** Parquet, Motif et Orientation ne cohabitent
  jamais empilés. Le panneau n'affiche qu'un contexte, et quand on le referme la
  colonne passe à zéro : la pièce reprend toute la largeur.
- Sur téléphone, une **feuille basse à trois niveaux** (32 / 58 / 86 svh) et un
  rail horizontal de matières au niveau replié. La photo se recentre dans la
  partie visible : on ne cache jamais la pièce.
- Cibles tactiles à 44 px **sur pointeur grossier seulement** — les pilules
  restent compactes à la souris.
- En hauteur critique (paysage téléphone, zoom 200 %), l'application libère le
  défilement au lieu d'écraser des contrôles jusqu'à les rendre inatteignables.

### Calibrer une pièce

```bash
node serve.js
```

puis `http://localhost:5180/_calibrage/` — page interne, ni liée ni indexée.
Elle affiche les contours sur la photo, propose une loupe cotée pour relever un
point au centième, aide au relevé du bas des murs, et sert de banc d'essai entre
les deux moteurs (temps de rendu et écart pixel à pixel). Voir
[docs/renderer-canvas-vs-webgl.md](docs/renderer-canvas-vs-webgl.md).

---

## Carrousels pilotés par le scroll

Sur écran large (≥ 62rem) et hors « mouvement réduit », les deux grandes
sections carrousel deviennent des sections hautes à contenu collant :
la progression verticale dans la section est convertie en défilement
horizontal (`js/components/scroll-carousel.js`). La molette n'est jamais
interceptée — on lit `scrollY`, rien de plus. Dans ce mode les flèches
déplacent la page ; le glisser est désactivé pour éviter tout conflit.

En dessous de 62rem, retour au carrousel classique : scroll-snap, swipe,
flèches et glisser.

---

## Identité visuelle et icônes

Le symbole de marque est le **Concept C** : trois lames verticales de largeurs
inégales — 36, 36 et 19 unités — séparées par des joints et traversées par des
ruptures diagonales décalées à deux hauteurs. Le rythme d'un parquet réduit à sa
structure. Pas de lettre, pas de chevron, pas de maison, pas d'outil.

Sa géométrie n'est pas redessinée à l'estime : elle est **relevée au pixel** sur
la planche d'identité validée, et vit dans un seul endroit,
`_generator/make-icons.js`. Ce fichier alimente à la fois les icônes et le SVG
inséré dans l'interface : le symbole ne peut donc pas diverger d'un support à
l'autre.

```bash
node _generator/make-icons.js
```

produit dans `assets/icons/` :

| fichier | usage |
| --- | --- |
| `favicon.svg` | favicon vectoriel — fond crème, symbole charbon |
| `favicon-16/24/32/48.png` | favicon matriciel, géométrie **accrochée à la grille de pixels** |
| `apple-touch-icon.png` (180) | iOS |
| `icon-192.png`, `icon-512.png` | manifeste web |
| `maskable-512.png` | Android, fond plein, symbole dans la zone de sécurité |
| `icon-512-dark.png` | variante dorée sur charbon, pour les surfaces sombres |
| `symbol.svg` | symbole seul, sans fond |

Deux décisions à connaître avant d'y toucher :

- **Aspect optiquement corrigé aux petites tailles.** L'aspect réel du symbole
  est 0,538 (nettement vertical). À 16 px cela donnerait un dessin large de 6 px
  pour trois lames et deux joints : de la bouillie. On interpole donc vers un
  aspect plus trapu en dessous de 72 px, sans jamais toucher au nombre de lames,
  à leur inégalité ni aux ruptures.
- **Pas de bascule en mode sombre pour le favicon.** Un carré crème se détache
  aussi bien sur une barre d'onglets claire que sombre ; un symbole doré sur
  charbon perd sa lisibilité à 16 px. La variante dorée existe, mais pour les
  surfaces sombres de l'interface.

Contrôle visuel : `node serve.js` puis
`http://localhost:5180/_calibrage/icones.html` — tailles réelles sur fond clair
et sombre, grille de pixels au ×10, simulation d'onglet Chrome.

Le symbole apparaît **deux fois par page** : en-tête et pied de page. Jamais en
motif décoratif répété — c'est sa rareté qui lui donne sa force.

---

## Médias

Les photographies proviennent de **Pexels** (licence gratuite, usage commercial
autorisé). Elles sont téléchargées localement dans `assets/images/` : aucun appel
à un service externe à l'exécution. Les auteurs sont listés dans
`assets/images/CREDITS.md`.

Pour changer une image : modifier son identifiant Pexels dans
`_generator/photos.js`, puis relancer le téléchargement.

```bash
node _generator/fetch-photos.js --force
```

Sans `--force`, seules les images manquantes sont téléchargées. Il reste
évidemment possible de déposer simplement un fichier de même nom dans
`assets/images/`.

Trois visuels restent vectoriels car ils expliquent un principe plutôt qu'ils
n'illustrent une ambiance : `guide-sens-proportions.svg`, `lumiere-avant.svg`
et `lumiere-apres.svg`. Ils sont produits par `node _generator/build.js`.

Vidéo du hero : déposer `assets/videos/hero.mp4` puis renseigner l'attribut
`data-src` de la balise vidéo de `index.html`. Tant qu'il est vide, l'image
`hero-poster.jpg` sert de fallback et aucune vidéo n'est téléchargée.

---

## Indexation : préproduction et production

Les fichiers du dépôt décrivent **toujours la production** (canoniques en
`pose-parquet.com`, `robots` en `index, follow`, sitemap complet). C'est le
déploiement qui marque la préproduction `github.io` en `noindex, nofollow`,
selon la présence d'un fichier `CNAME`. Aucun `noindex` n'existe donc dans le
dépôt et aucun ne peut fuiter en production. Détail et procédure de mise en
ligne : [docs/seo-environnements.md](docs/seo-environnements.md).

---

## SEO

- `title`, `meta description`, `canonical`, Open Graph et Twitter Card sur chaque page.
- Données structurées : `WebSite`, `Article`, `HowTo`, `FAQPage`, `BreadcrumbList`, `WebApplication`.
- Fil d'Ariane visible et balisé.
- `sitemap.xml` et `robots.txt` à la racine (domaine à ajuster avant mise en ligne).
- Cluster « sens de pose » : guide pilier + guides satellites + simulateur, reliés entre eux.

---

## Notes d'ingénierie

| document | sujet |
| --- | --- |
| [docs/renderer-canvas-vs-webgl.md](docs/renderer-canvas-vs-webgl.md) | pourquoi WebGL 2 écrit à la main, pourquoi pas Three.js, avec les mesures |
| [docs/future-ai-api-contract.md](docs/future-ai-api-contract.md) | contrat de l'API d'analyse d'image — spécifié, non implémenté |
| [docs/future-python-architecture.md](docs/future-python-architecture.md) | architecture Python prévue — aucune ligne écrite |
| [docs/seo-environnements.md](docs/seo-environnements.md) | indexation préproduction / production |
| [docs/formulaire-production.md](docs/formulaire-production.md) | état réel du formulaire, ce qu'il manque avant le lancement |
| [docs/benchmark-ikea-home-design.md](docs/benchmark-ikea-home-design.md) | observation d'IKEA Home Design et écarts |
| [docs/hebergement.md](docs/hebergement.md) | hébergement et DNS |
| [assets/materials/README.md](assets/materials/README.md) | formats attendus pour de vraies cartes de matière |

---

## Liens externes

Le site est indépendant. Un unique lien éditorial vers `premibel.fr` figure dans
le guide « Parquet massif ou contrecollé », là où il complète réellement le propos.
