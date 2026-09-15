/**
 * Démonstration avant / après de la page d'accueil.
 *
 * Ce n'est pas une image truquée : le parquet est calculé ici, avec le moteur
 * du visualiseur et la scène calibrée de la pièce — même géométrie, mêmes
 * masques, même éclairement, mêmes matériaux. Ce que l'on voit sur l'accueil
 * est donc exactement ce que produit l'outil, y compris la salle à manger
 * derrière l'ouverture, qui change en même temps que le séjour.
 *
 * Le module ne se charge que lorsque la section approche de l'écran, et il
 * travaille sur une version réduite de la photo : la page d'accueil ne paie
 * pas le prix d'un rendu plein format.
 */
import { analyzeScene } from './analyzer.js';
import { createSceneRenderer } from './renderer.js';
import { loadImage } from './image-loader.js';
import { loadCatalog } from '../studio/catalog.js';

const MAX_WIDTH = 1200;
/** Trois références du catalogue, choisies pour montrer l'écart de rendu. */
const CHIPS = [
  { material: 'chene-naturel', pattern: 'lames' },
  { material: 'chene-miel', pattern: 'point-de-hongrie' },
  { material: 'chene-fume', pattern: 'baton-rompu' },
];

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

export function mountPreview(root) {
  const base = root.dataset.base || '';
  const sceneId = root.dataset.room || 'sejour';

  root.classList.add('vzp');

  /*
   * Le squelette peut déjà être là.
   *
   * `_generator/home.js` l'écrit dans le HTML pour que la place soit réservée
   * avant toute exécution de JavaScript — c'est ce qui supprime les 317 px de
   * poussée mesurés sur l'accueil. Le réécrire ici les ferait revenir : on
   * vide et on reconstruit un DOM identique, mais entre les deux la boîte
   * passe par zéro.
   *
   * On ne se contente pas de tester la présence du conteneur : on vérifie que
   * CHAQUE élément attendu existe. Si le gabarit du générateur venait à
   * diverger de celui-ci, la condition tombe et on reconstruit tout — un
   * décalage vaut mieux qu'un composant à moitié câblé.
   */
  const CROCHETS = ['[data-stage]', '[data-photo]', '[data-canvas]', '[data-range]', '[data-caption]', '[data-credit]', '[data-chips]'];
  const squeletteComplet = CROCHETS.every((sel) => root.querySelector(sel));

  if (!squeletteComplet) root.innerHTML = `
    <figure class="vzp__figure">
      <div class="vzp__stage" data-stage>
        <img class="vzp__photo" alt="" width="1600" height="1067" data-photo />
        <canvas class="vzp__canvas" data-canvas aria-hidden="true"></canvas>
        <span class="vzp__tag vzp__tag--before">Avant</span>
        <span class="vzp__tag vzp__tag--after">Après</span>
        <!-- Course bornée à 3–97 % : le bouton de la poignée est centré sur le
             trait, donc à moitié hors cadre à 0 et à 100 %, où l'overflow de la
             scène le coupait net. Le trait et le découpage restent identiques. -->
        <input class="vzp__range" type="range" min="3" max="97" value="52"
          aria-label="Curseur de comparaison entre la pièce d’origine et le parquet simulé" data-range />
        <span class="vzp__handle" aria-hidden="true"></span>
      </div>
      <figcaption class="vzp__caption">
        <span data-caption>Chêne naturel, lames droites</span> — rendu calculé dans votre navigateur.
        <span data-credit></span>
      </figcaption>
    </figure>
    <div class="vzp__chips" role="group" aria-label="Aperçu d’autres finitions" data-chips></div>`;

  const stage = root.querySelector('[data-stage]');
  const photo = root.querySelector('[data-photo]');
  const canvas = root.querySelector('[data-canvas]');
  const range = root.querySelector('[data-range]');
  const caption = root.querySelector('[data-caption]');
  const credit = root.querySelector('[data-credit]');
  const chips = root.querySelector('[data-chips]');

  const renderer = createSceneRenderer();
  let current = CHIPS[0];
  let catalog = null;

  const applyRange = () => stage.style.setProperty('--compare', `${range.value}%`);
  range.addEventListener('input', applyRange);
  applyRange();

  /** Les pastilles reprennent trois références du catalogue du visualiseur. */
  function buildChips() {
    chips.innerHTML = '';
    CHIPS.forEach((chip) => {
      const material = catalog.get(chip.material);
      if (!material) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vzp__chip';
      button.dataset.chip = chip.material;
      button.setAttribute('aria-pressed', String(chip === current));
      button.textContent = material.name;
      button.addEventListener('click', () => {
        current = chip;
        chips
          .querySelectorAll('[data-chip]')
          .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.chip === chip.material)));
        setCaption();
        syncLien();
        draw();
      });
      chips.appendChild(button);
    });
    setCaption();
  }

  function setCaption() {
    const material = catalog.get(current.material);
    const pattern = catalog.patterns.find((item) => item.id === current.pattern);
    if (material && pattern) caption.textContent = `${material.name}, ${pattern.label.toLowerCase()}`;
  }

  /**
   * Le lien « Visualiser mon parquet » porte ce que l'aperçu montre.
   *
   * Sans cela, le visiteur choisit une teinte et un motif sur l'accueil, clique,
   * et retrouve le Studio sur sa configuration par défaut : son choix est perdu
   * entre deux écrans qui parlent pourtant du même parquet.
   *
   * Aucun contrat nouveau n'est inventé ici. Ce sont exactement les quatre
   * paramètres que `js/studio/app.js` lit déjà et que la page Inspiration
   * utilise pour son « Essayer ce style » :
   *
   *   ?piece=<scène>&parquet=<référence>&motif=<motif>&orientation=<degrés>
   *
   * L'orientation vaut 0 parce que l'aperçu rend à 0 — on transmet l'état réel,
   * pas un état souhaitable.
   */
  function syncLien() {
    const liens = document.querySelectorAll('[data-vz-open]');
    if (!liens.length) return;
    liens.forEach((lien) => {
      // `lien.href` est déjà absolu et déjà correct : on ne recompose pas un
      // chemin, on ajoute seulement des paramètres à celui qui marche.
      const url = new URL(lien.href, window.location.href);
      url.searchParams.set('piece', sceneId);
      url.searchParams.set('parquet', current.material);
      url.searchParams.set('motif', current.pattern);
      url.searchParams.set('orientation', '0');
      lien.setAttribute('href', url.pathname + url.search);
    });
  }

  function draw() {
    if (!renderer.ready || !catalog) return;
    const material = catalog.get(current.material);
    renderer.paint(canvas, { material, pattern: current.pattern, angle: 0, width: null, scale: 1 });
    root.dataset.ready = 'true';
  }

  async function load() {
    try {
      catalog = await loadCatalog(base);
      buildChips();
      const scene = await analyzeScene({ sceneId, base });
      const prepared = downscale(await loadImage(`${base}assets/images/${scene.image.file}`));
      renderer.setScene(scene, prepared);
      syncLien();
      photo.src = `${base}assets/images/${scene.image.file}`;
      photo.alt = scene.image.alt;
      if (scene.image.credit) credit.textContent = `Photo : ${scene.image.credit}.`;
      draw();
    } catch (error) {
      // Sans rendu, la section garde la photo d'origine : rien ne casse.
      root.dataset.ready = 'photo';
      console.warn('[accueil] aperçu indisponible', error);
    }
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    load();
  };

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(root);
    // Filet : dans un onglet en arrière-plan, l'observateur ne se déclenche pas.
    // On vérifie donc nous-mêmes, sans requestAnimationFrame.
    const sweep = window.setInterval(() => {
      if (started) {
        window.clearInterval(sweep);
        return;
      }
      const box = root.getBoundingClientRect();
      if (box.top < window.innerHeight + 300 && box.bottom > -300) {
        window.clearInterval(sweep);
        observer.disconnect();
        start();
      }
    }, 900);
  } else {
    start();
  }

  return { element: root, render: draw };
}
