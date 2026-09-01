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
│   ├── tools/              patterns.js (registre des motifs) + floor-visualizer.js (simulateur)
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
├── data/contenus.json      Index machine des contenus (guides, motifs, tutoriels, outils)
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

## Simulateur de pose (Studio de pose)

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

## Visualiseur de parquet (`js/visualizer/`)

Page : `outils/visualiseur.html`. Deux modes en onglets — **Visualiser ma pièce**
(photo) et **Mode plan** (l'ancien simulateur vu du dessus).

| Fichier | Rôle |
| --- | --- |
| `image-loader.js` | Chargement et redimensionnement (max 1600 × 1200) des pièces d'exemple et des photos importées |
| `rooms.js` | Catalogue des pièces d'exemple : fichier, crédit, dimensions supposées, quadrilatère du sol |
| `floor-mask.js` | Sélection manuelle du sol + interface `detectFloor(strategy, ctx)` |
| `perspective.js` | Homographie 4 points (carré unité → quadrilatère) et son inverse |
| `patterns.js` | Textures procédurales répétables : lames droites, Point de Hongrie, bâton rompu, 6 teintes |
| `texture-renderer.js` | Rendu pixel par pixel : projection, choix du niveau de réduction, report des ombres |
| `controls.js` | Panneau de réglages (natif, accessible au clavier) |
| `compare.js` | Avant / après piloté par un `input[type=range]` |
| `state.js` | État partagé avec le mode plan (localStorage) |
| `index.js` | Orchestration |

**Ce que fait réellement la V1** : la zone de sol est délimitée **à la main**
(quatre poignées souris / tactile / clavier). Aucune détection automatique
n'est utilisée ni simulée. La texture est ensuite projetée dans le
quadrilatère par homographie — d'où la perspective — et modulée par la
luminance de la photo d'origine, ce qui reporte ombres et reflets.

**Brancher une détection automatique plus tard** :

```js
import { registerDetector, detectFloor } from './floor-mask.js';
registerDetector('auto', async ({ canvas }) => quadNormalise); // modèle ou service
await detectFloor('auto', { canvas });
```

Les photos importées ne quittent jamais le navigateur : lecture via
`URL.createObjectURL`, traitement en Canvas, aucun envoi réseau.

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

## Icônes

`node _generator/make-icons.js` produit `favicon-16/32/48.png`,
`apple-touch-icon.png` (180) et `icon-192/512.png` (maskable) à partir du
monogramme double chevron, via un rasteriseur maison (aucune dépendance).
Les sources vectorielles sont `assets/icons/favicon.svg` et `maskable.svg` ;
`site.webmanifest` référence l'ensemble en chemins relatifs.

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

## SEO

- `title`, `meta description`, `canonical`, Open Graph et Twitter Card sur chaque page.
- Données structurées : `WebSite`, `Article`, `HowTo`, `FAQPage`, `BreadcrumbList`, `WebApplication`.
- Fil d'Ariane visible et balisé.
- `sitemap.xml` et `robots.txt` à la racine (domaine à ajuster avant mise en ligne).
- Cluster « sens de pose » : guide pilier + guides satellites + simulateur, reliés entre eux.

---

## Liens externes

Le site est indépendant. Un unique lien éditorial vers `premibel.fr` figure dans
le guide « Parquet massif ou contrecollé », là où il complète réellement le propos.
