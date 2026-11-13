import { analyzeScene } from './analyzer.js';
import { createSceneRenderer } from './renderer.js';
import { loadSceneImage } from './image-loader.js';
import { loadCatalog } from '../studio/catalog.js';
import { motifEffectif, motifAutorise } from './motifs-regles.js';
import { VITRINE } from './vitrine.js';
import { quandCartesPretes } from './material.js';

const MAX_WIDTH = 1200;


const choisirPuces = (catalog) =>
  VITRINE.map(({ pattern, candidats }) => {
    const id = candidats.find((c) => {
      const m = catalog.get(c);
      return m && motifAutorise(m, pattern);
    });
    return id ? { material: id, pattern } : null;
  }).filter(Boolean);

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



  const CROCHETS = ['[data-stage]', '[data-photo]', '[data-canvas]', '[data-range]', '[data-caption]', '[data-credit]', '[data-chips]'];
  const squeletteComplet = CROCHETS.every((sel) => root.querySelector(sel));

  if (!squeletteComplet) root.innerHTML = `
    <figure class="vzp__figure">
      <div class="vzp__stage" data-stage>
        <img class="vzp__photo" alt="" width="1600" height="1067" data-photo />
        <canvas class="vzp__canvas" data-canvas aria-hidden="true"></canvas>
        <span class="vzp__tag vzp__tag--before">Avant</span>
        <span class="vzp__tag vzp__tag--after">Après</span>



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
  let CHIPS = [];
  let current = null;
  let catalog = null;

  const applyRange = () => stage.style.setProperty('--compare', `${range.value}%`);
  range.addEventListener('input', applyRange);
  applyRange();


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


      const vignette = material.product && material.product.visual && material.product.visual.thumbnail;
      if (vignette) {
        const img = document.createElement('img');
        img.className = 'vzp__chip-photo';
        img.src = `${base}${vignette}`;
        img.alt = '';
        img.width = 24;
        img.height = 24;
        img.loading = 'lazy';
        img.decoding = 'async';
        button.appendChild(img);
      }
      button.appendChild(document.createTextNode(material.name));
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



  const motifCourant = () => motifEffectif(catalog.get(current.material), current.pattern);

  function setCaption() {
    const material = catalog.get(current.material);
    const pattern = catalog.patterns.find((item) => item.id === motifCourant());
    if (material && pattern) {


      const fiche = material.product && material.product.source === 'premibel' ? material.product : null;
      const mention = fiche ? { ready: ' (rendu fidèle)', approximate: ' (rendu indicatif)' }[fiche.visualStatus] || '' : '';
      caption.textContent = `${material.name}, ${pattern.label.toLowerCase()}${mention}`;
    }
  }



  function syncLien() {
    const liens = document.querySelectorAll('[data-vz-open]');
    if (!liens.length) return;
    liens.forEach((lien) => {


      const url = new URL(lien.href, window.location.href);
      url.searchParams.set('piece', sceneId);
      url.searchParams.set('parquet', current.material);
      url.searchParams.set('motif', motifCourant());
      url.searchParams.set('orientation', '0');
      lien.setAttribute('href', url.pathname + url.search);
    });
  }



  let attente = null;
  function draw() {
    if (!renderer.ready || !catalog) return;
    const material = catalog.get(current.material);
    const peint = renderer.paint(canvas, { material, pattern: motifCourant(), angle: 0, width: null, scale: 1 });
    if (peint) {
      root.dataset.ready = 'true';
      if (attente) { attente(); attente = null; }
      return;
    }
    root.dataset.ready = 'attente';
    if (!attente) attente = quandCartesPretes(() => draw());
  }

  async function load() {
    try {
      catalog = await loadCatalog(base);
      CHIPS = choisirPuces(catalog);
      current = CHIPS[0] || null;
      if (!current) throw new Error('aucune référence de vitrine dans le catalogue');
      buildChips();
      const scene = await analyzeScene({ sceneId, base });
      const charge = await loadSceneImage(base, scene.image.file);
      const prepared = downscale(charge);
      renderer.setScene(scene, prepared);
      syncLien();
      photo.src = charge.src;
      photo.alt = scene.image.alt;
      if (scene.image.credit) credit.textContent = `Photo : ${scene.image.credit}.`;
      draw();
    } catch (error) {

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
