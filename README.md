# pose-parquet.com

Média pratique et boîte à outils autour de la pose du parquet.
Site statique en **HTML / CSS / JavaScript natif (ES Modules)**, sans framework
ni dépendance externe.

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
│   ├── main.css            Point d'entrée (importe tokens, reset, global, layout, composants)
│   ├── tokens.css          Couleurs, typographie, espacements, mouvements
│   ├── reset.css  global.css  layout.css
│   ├── components/         Un fichier par composant du design system
│   └── pages/              Styles spécifiques à un gabarit de page
│
├── js/
│   ├── main.js             Chef d'orchestre : importe un module seulement si la page l'utilise
│   ├── utils/              dom.js, motion.js, icons.js
│   ├── animations/         reveal.js (apparition au scroll)
│   ├── components/         nav, accordion, tabs, carousel, modal/lightbox, tooltip,
│   │                       toc + progression de lecture, before-after, filters, hero-media
│   ├── tools/              patterns.js (registre des motifs) + floor-visualizer.js (simulateur)
│   └── forms/              submit-adapter.js (abstraction d'envoi)
│
├── components/
│   └── project-form/       Composant formulaire projet, autonome et remplaçable
│
├── assets/
│   ├── images/             Visuels SVG placeholders (remplaçables un pour un)
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
<div data-visualizer data-base="../"></div>          <!-- version complète -->
<div data-visualizer data-mode="compact" data-base="../"></div>  <!-- version courte -->
```

- `data-base` : préfixe de chemin vers la racine (`""` à la racine, `"../"` ailleurs).
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
  build: (ctx) => [ /* { points: [[x, y], ...], shade: 0..1 } */ ],
  advice: (ctx) => 'Conseil affiché sous le rendu.',
}
```

`ctx` fournit `length`, `width`, `plankWidth`, `plankLength` (en centimètres) et
la configuration de la pièce. Le sélecteur, les miniatures et le rendu se mettent
à jour automatiquement.

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

## Médias

Les visuels sont des **SVG placeholders** générés, dimensionnés comme les visuels
définitifs. Pour les remplacer, déposer un fichier de même nom (ou mettre à jour
le `src`) dans `assets/images/`.

Vidéo du hero : déposer `assets/videos/hero.mp4` puis renseigner l'attribut
`data-src` de la balise `<video>` de `index.html`. Tant qu'il est vide, l'image
`hero-poster.svg` sert de fallback et aucune vidéo n'est téléchargée.

Pour les partages sociaux, remplacer `assets/images/og-default.svg` par un JPG ou
PNG de 1200 × 630 px (les réseaux sociaux n'acceptent pas le SVG) et ajuster la
balise `og:image` dans les pages.

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
