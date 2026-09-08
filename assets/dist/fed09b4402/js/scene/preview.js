/**
 * Démonstration avant / après de la page d'accueil.
 *
 * Ce n'est pas une image truquée : le parquet est calculé ici, avec le moteur
 * du visualiseur et la scène calibrée de la pièce — même géométrie, mêmes
 * masques, même éclairement, mêmes matériaux. Ce que l'on voit sur l'accueil
 * est donc exactement ce que produit l'outil, y compris la salle à manger
 * derrière l'ouverture, qui change en même temps que le séjour.
 *
 * ## Sur l'accueil, ce module ne construit plus la section
 *
 * Le balisage de l'accueil vit dans `_generator/home.js`, en HTML, et ce
 * module s'y branche. C'est ce qui permet à la section d'exister sans
 * JavaScript — poster, légende et liens — et au curseur de fonctionner avant
 * même que le moteur arrive, puisque `js/home/visualizer-teaser.js` le relie
 * au découpage CSS pour quelques centaines d'octets.
 *
 * Trois autres pages portent le même aperçu avec un conteneur vide
 * (`outils/`, `outils/visualiseur.html`, `tutoriels/`). Pour elles, et pour
 * elles seules, `construireStructure()` fabrique la même chose sans poster.
 *
 * ## Deux axes, jamais mêlés
 *
 * Une pastille de teinte ne change que la teinte ; une pastille de motif ne
 * change que le motif. Avant ce lot, les trois pastilles changeaient les deux
 * à la fois — « Chêne Miel » signifiait aussi « point de Hongrie » — de sorte
 * qu'on ne pouvait pas savoir laquelle des deux variables avait produit la
 * différence. Or le sens de pose est justement ce que ce site sait expliquer,
 * et ce qu'aucun visualiseur généraliste ne propose comme choix.
 *
 * ## Le coût, et comment il est étalé
 *
 * La fabrication d'une tuile est du travail de fil principal : mesuré sur un
 * poste de bureau, 181 ms pour des lames, 415 ms pour un bâton rompu et
 * 1 072 ms pour un point de Hongrie — comptez trois à six fois plus sur un
 * téléphone modeste. Le rendu lui-même, une fois les cartes en cache, coûte
 * moins d'une milliseconde.
 *
 * D'où l'ordre du préchauffage : lames, puis bâton rompu, puis point de
 * Hongrie. Du moins cher au plus cher, à l'inactivité, jamais dans le chemin
 * du premier rendu. Et si le visiteur clique avant, la pastille concernée
 * annonce son attente au lieu de laisser croire à un gel.
 */
import { analyzeScene } from './analyzer.js';
import { createSceneRenderer } from './renderer.js';
import { loadImage } from './image-loader.js';
import { loadCatalog } from '../studio/catalog.js';
import { warmMaterial, enCache } from './material.js';

/**
 * Largeur de travail de la photo.
 *
 * La page d'accueil ne paie pas le prix d'un rendu plein format : la scène est
 * ramenée à 1 200 px, ce qui reste au-dessus de la taille d'affichage réelle
 * — 1 216 px de large sur un écran de 1 440, moins partout ailleurs — tout en
 * divisant par près de deux le nombre de pixels à composer.
 */
const MAX_WIDTH = 1200;

/** Angle de pose de la démonstration. L'accueil n'offre pas ce réglage. */
const ANGLE = 0;

/** Ordre de préchauffage : du moins cher au plus cher. */
const ORDRE_PRECHAUFFAGE = ['lames', 'baton-rompu', 'point-de-hongrie'];

/** Exécute une tâche quand le fil principal souffle, ou faute de mieux plus tard. */
const aLInactivite = (tache) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(tache, { timeout: 3000 })
    : window.setTimeout(tache, 400);

/**
 * Vrai si le visiteur a demandé qu'on économise ses données.
 *
 * L'API n'existe pas partout, et son absence ne doit rien changer : on
 * préchauffe alors normalement. Elle ne sert qu'à renoncer à un confort,
 * jamais à retirer une fonction.
 */
function economieDeDonnees() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c && c.saveData === true) return true;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-data: reduce)').matches
  );
}

function downscale(prepared) {
  if (prepared.width <= MAX_WIDTH) return prepared;
  const ratio = MAX_WIDTH / prepared.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(prepared.width * ratio);
  canvas.height = Math.round(prepared.height * ratio);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(prepared.canvas, 0, 0, canvas.width, canvas.height);
  return { canvas, width: canvas.width, height: canvas.height };
}

/** Teintes et motifs de la rangée de commandes, quand ce module la construit. */
const TEINTES = [
  { id: 'chene-craie', label: 'Craie' },
  { id: 'chene-naturel', label: 'Naturel' },
  { id: 'chene-miel', label: 'Miel' },
  { id: 'chene-fume', label: 'Fumé' },
];
const MOTIFS = [
  { id: 'lames', label: 'Lames' },
  { id: 'point-de-hongrie', label: 'Point de Hongrie' },
  { id: 'baton-rompu', label: 'Bâton rompu' },
];

/**
 * Construit la structure quand la page ne la fournit pas.
 *
 * L'accueil écrit son balisage en HTML, avec un poster, pour exister sans
 * JavaScript. Les trois autres pages qui portent cet aperçu — `outils/`,
 * `outils/visualiseur.html`, `tutoriels/` — se contentent d'un conteneur vide :
 * elles n'ont pas de poster pré-rendu, et leur section n'est pas la promesse
 * principale de la page. On leur fabrique donc la même structure, sans poster.
 *
 * Sans cette branche, le passage du balisage dans le gabarit de l'accueil
 * aurait éteint l'aperçu sur ces trois pages : elles seraient tombées dans le
 * garde-fou « structure inconnue » et n'auraient plus montré que leur photo.
 */
function construireStructure(root, id) {
  const pastille = (item, groupe, actif) =>
    `<button class="vzp__chip" type="button" data-${groupe}="${item.id}" aria-pressed="${item.id === actif}">${item.label}</button>`;

  root.classList.add('vzp');
  root.innerHTML = `
    <figure class="vzp__figure">
      <div class="vzp__stage" data-stage>
        <img class="vzp__photo" alt="" width="1600" height="1067" data-photo />
        <canvas class="vzp__canvas" data-canvas></canvas>
        <span class="vzp__tag vzp__tag--before">Avant</span>
        <span class="vzp__tag vzp__tag--after">Après</span>
        <input class="vzp__range" type="range" min="3" max="97" value="52"
          aria-label="Curseur de comparaison entre la pièce d’origine et le parquet simulé" data-range />
        <span class="vzp__handle" aria-hidden="true"></span>
      </div>
      <figcaption class="vzp__caption">
        <span data-caption>Chêne Naturel · lames droites</span> — rendu calculé dans votre navigateur.
        <span data-credit></span>
      </figcaption>
    </figure>
    <div class="vzp__controls" data-controls hidden>
      <div class="vzp__row">
        <span class="vzp__label" id="${id}-teinte">Teinte</span>
        <div class="vzp__chips" role="group" aria-labelledby="${id}-teinte" data-tones>
          ${TEINTES.map((t) => pastille(t, 'tone', 'chene-naturel')).join('')}
        </div>
      </div>
      <div class="vzp__row">
        <span class="vzp__label" id="${id}-motif">Motif de pose</span>
        <div class="vzp__chips" role="group" aria-labelledby="${id}-motif" data-patterns>
          ${MOTIFS.map((m) => pastille(m, 'pattern', 'lames')).join('')}
        </div>
      </div>
      <p class="vzp__live" aria-live="polite" data-live></p>
    </div>`;
}

/**
 * Relie le curseur au découpage, si personne ne l'a déjà fait.
 *
 * Sur l'accueil, `js/home/visualizer-teaser.js` s'en charge avant que ce
 * module n'arrive. Sur les pages dont la structure est fabriquée ici, le
 * curseur n'existait pas encore à ce moment-là : il faut donc le brancher.
 * Le drapeau évite deux écouteurs pour un seul curseur.
 */
function relierCurseur(root) {
  const range = root.querySelector('[data-range]');
  const stage = root.querySelector('[data-stage]');
  if (!range || !stage || range.dataset.relie === 'true') return;
  range.dataset.relie = 'true';
  const appliquer = () => stage.style.setProperty('--compare', `${range.value}%`);
  range.addEventListener('input', appliquer);
  appliquer();
}

export function mountPreview(root) {
  const base = root.dataset.base || '';
  const sceneId = root.dataset.room || 'sejour';

  if (!root.querySelector('[data-stage]')) {
    construireStructure(root, `vzp-${sceneId}`);
  }
  relierCurseur(root);

  const stage = root.querySelector('[data-stage]');
  const photo = root.querySelector('[data-photo]');
  const canvas = root.querySelector('[data-canvas]');
  const caption = root.querySelector('[data-caption]');
  const live = root.querySelector('[data-live]');
  const controls = root.querySelector('[data-controls]');
  const lienStudio = root.querySelector('[data-open-studio]');
  const boutonsTeinte = [...root.querySelectorAll('[data-tone]')];
  const boutonsMotif = [...root.querySelectorAll('[data-pattern]')];

  // Le balisage vient du gabarit : s'il manque, c'est une page qu'on ne
  // connaît pas, et mieux vaut ne rien faire que d'improviser une structure.
  if (!stage || !canvas || !photo) {
    root.dataset.ready = 'photo';
    return { element: root, render: () => {} };
  }

  const renderer = createSceneRenderer();
  let catalog = null;
  let teinte =
    boutonsTeinte.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.tone || 'chene-naturel';
  let motif =
    boutonsMotif.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.pattern || 'lames';

  const config = (pattern = motif) => ({ pattern, angle: ANGLE, width: null, scale: 1 });

  /* ---------------- Libellés ---------------- */

  const nomTeinte = () => catalog?.get(teinte)?.name || teinte;
  const nomMotif = () => catalog?.patterns.find((p) => p.id === motif)?.label || motif;

  function ecrireLegende() {
    if (!catalog) return;
    const texte = `${nomTeinte()} · ${nomMotif().toLowerCase()}`;
    if (caption) caption.textContent = texte;
    // La zone `aria-live` répète ce que la légende affiche déjà : elle sert à
    // qui n'a pas l'image, et reste invisible pour tous les autres.
    if (live) live.textContent = texte;
  }

  /* ---------------- Rendu ---------------- */

  /**
   * Jeton du dernier rendu demandé.
   *
   * Deux clics rapprochés lancent deux attentes ; sans jeton, la plus lente
   * peindrait en dernier et écraserait le choix le plus récent. On ne peint
   * donc que si l'on est encore la demande en cours.
   */
  let demande = 0;

  /**
   * Peint la scène, en attendant que les cartes du matériau soient prêtes.
   *
   * `paint()` est synchrone et rend `false` quand une tuile se fabrique encore :
   * le Studio, lui, sera prévenu et repeindra, mais cette section peint une
   * fois par choix et n'a pas ce signal. Sans `preparer()` elle lisait donc un
   * canevas vide, et le visiteur voyait la photo des deux côtés du curseur —
   * le moteur l'écrit noir sur blanc dans `renderer.js`, c'est le piège des
   * pages qui peignent une seule fois.
   *
   * Le bouton cliqué passe en `aria-busy` le temps de l'attente. C'est le seul
   * signal d'attente de la section : pas de voile sur la scène, pas de
   * blocage — le reste de la page continue de répondre, et le sol change
   * lorsqu'il est prêt. Cas concerné en pratique : le point de Hongrie
   * demandé avant la fin de son préchauffage.
   */
  async function dessiner(bouton) {
    if (!renderer.ready || !catalog) return;
    const material = catalog.get(teinte);
    if (!material) return;

    const cfg = { material, ...config() };
    const mien = ++demande;
    const froid = !enCache(material, config());

    if (froid && bouton) bouton.setAttribute('aria-busy', 'true');

    try {
      await renderer.preparer(cfg);
      if (mien !== demande) return; // un choix plus récent a pris la main
      renderer.paint(canvas, cfg);
      // Le poster laisse alors la place au canvas : même cadrage, même
      // découpage, la bascule ne se voit pas. Il reste en place jusqu'à ce
      // premier rendu, ce qui évite un instant de pièce nue.
      root.dataset.ready = 'true';
    } finally {
      if (bouton) bouton.removeAttribute('aria-busy');
    }
  }

  /* ---------------- Commandes ---------------- */

  const marquer = (boutons, cle, valeur) =>
    boutons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[cle] === valeur)));

  function motifsCompatibles() {
    const material = catalog?.get(teinte);
    const permis = material?.compatiblePatterns;

    boutonsMotif.forEach((b) => {
      // `chene-gris` et `chene-rustique` n'acceptent pas le point de Hongrie.
      // Un bouton désactivé dit la vérité ; un bouton qui ne ferait rien
      // mentirait. Aucune des quatre teintes de l'accueil n'est concernée
      // aujourd'hui, mais le catalogue peut changer sans que ce module bouge.
      b.disabled = Boolean(permis) && !permis.includes(b.dataset.pattern);
    });

    if (permis && !permis.includes(motif)) {
      motif = material.defaultPattern || permis[0];
      marquer(boutonsMotif, 'pattern', motif);
    }
  }

  /**
   * Tient à jour le lien « Ouvrir le Visualiseur ».
   *
   * Il porte l'état affiché, dans la convention de `js/forms/studio-handoff.js`
   * — la même que celle du Studio vers le formulaire, dans l'autre sens. Le
   * visiteur qui a choisi Chêne Fumé en point de Hongrie retrouve exactement
   * cela, et non les valeurs par défaut.
   */
  function synchroniserLienStudio() {
    if (!lienStudio) return;
    const params = new URLSearchParams({
      piece: sceneId,
      parquet: teinte,
      motif,
      orientation: String(ANGLE),
    });
    lienStudio.href = `${base}outils/studio.html?${params.toString()}`;
  }

  function brancherCommandes() {
    boutonsTeinte.forEach((bouton) =>
      bouton.addEventListener('click', () => {
        if (bouton.dataset.tone === teinte) return;
        teinte = bouton.dataset.tone;
        marquer(boutonsTeinte, 'tone', teinte);
        motifsCompatibles();
        ecrireLegende();
        synchroniserLienStudio();
        dessiner(bouton);
      })
    );

    boutonsMotif.forEach((bouton) =>
      bouton.addEventListener('click', () => {
        if (bouton.dataset.pattern === motif) return;
        motif = bouton.dataset.pattern;
        marquer(boutonsMotif, 'pattern', motif);
        ecrireLegende();
        synchroniserLienStudio();
        dessiner(bouton);
      })
    );
  }

  /* ---------------- Préchauffage ---------------- */

  /**
   * Prépare en tâche de fond ce que le visiteur peut demander ensuite.
   *
   * Uniquement la teinte affichée, pour ses motifs : préchauffer quatre
   * teintes × trois motifs ferait douze fabrications, dont dix que personne ne
   * regardera. Et rien du tout si le visiteur a demandé d'économiser ses
   * données.
   */
  function prechauffer() {
    if (economieDeDonnees()) return;
    const material = catalog?.get(teinte);
    if (!material) return;

    const restants = ORDRE_PRECHAUFFAGE.filter(
      (p) =>
        (!material.compatiblePatterns || material.compatiblePatterns.includes(p)) &&
        !enCache(material, config(p))
    );

    const suivant = () => {
      const p = restants.shift();
      if (!p) return;
      warmMaterial(material, config(p));
      aLInactivite(suivant);
    };
    aLInactivite(suivant);
  }

  /* ---------------- Démarrage ---------------- */

  async function load() {
    try {
      catalog = await loadCatalog(base);
      const scene = await analyzeScene({ sceneId, base });
      const prepared = downscale(await loadImage(`${base}assets/images/${scene.image.file}`));
      renderer.setScene(scene, prepared);

      // Structure fabriquée ici : la photo n'a pas encore de source. Sur
      // l'accueil elle vient du gabarit, avec son srcset et ses dimensions.
      if (!photo.getAttribute('src')) {
        photo.src = `${base}assets/images/${scene.image.file}`;
        photo.alt = scene.image.alt || '';
        const credit = root.querySelector('[data-credit]');
        if (credit && !credit.textContent && scene.image.credit) {
          credit.textContent = `Photo : ${scene.image.credit}.`;
        }
      }

      marquer(boutonsTeinte, 'tone', teinte);
      marquer(boutonsMotif, 'pattern', motif);
      motifsCompatibles();
      ecrireLegende();
      synchroniserLienStudio();
      brancherCommandes();

      await dessiner();

      // Les commandes n'apparaissent qu'ici : plus tôt, elles ne feraient rien.
      if (controls) controls.hidden = false;

      prechauffer();
    } catch (error) {
      // Sans rendu, la section garde son poster et ses liens : rien ne casse.
      root.dataset.ready = 'photo';
      console.warn('[accueil] aperçu indisponible', error);
    }
  }

  load();

  return { element: root, render: dessiner };
}

export default mountPreview;
