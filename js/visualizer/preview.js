/**
 * Démonstration avant / après de la page d'accueil.
 *
 * Ce n'est pas une image truquée : le parquet est calculé ici, avec le moteur
 * du visualiseur (même texture, même perspective, même masque de sol). Ce que
 * l'on voit sur l'accueil est donc exactement ce que produit l'outil.
 *
 * Le module ne se charge que lorsque la section approche de l'écran, et il
 * travaille sur une version réduite de la photo : la page d'accueil ne paie
 * pas le prix d'un rendu plein format.
 */
import { buildTexture, buildMips, TONES, PATTERNS } from './patterns.js';
import { renderFloor } from './texture-renderer.js';
import { createMask } from './mask.js';
import { loadImage } from './image-loader.js';
import { getRoom } from './rooms.js';

const MAX_WIDTH = 1200;
const CHIPS = [
  { tone: 'naturel', pattern: 'lames', label: 'Chêne naturel' },
  { tone: 'miel', pattern: 'point-de-hongrie', label: 'Point de Hongrie' },
  { tone: 'fume', pattern: 'baton-rompu', label: 'Chêne fumé' },
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
  const room = getRoom(root.dataset.room || 'sejour');

  root.classList.add('vzp');
  root.innerHTML = `
    <figure class="vzp__figure">
      <div class="vzp__stage" data-stage>
        <img class="vzp__photo" alt="${room.alt}" width="1600" height="1067" data-photo />
        <canvas class="vzp__canvas" data-canvas></canvas>
        <span class="vzp__tag vzp__tag--before">Avant</span>
        <span class="vzp__tag vzp__tag--after">Après</span>
        <input class="vzp__range" type="range" min="0" max="100" value="52"
          aria-label="Curseur de comparaison entre la pièce d’origine et le parquet simulé" data-range />
        <span class="vzp__handle" aria-hidden="true"></span>
      </div>
      <figcaption class="vzp__caption">
        <span data-caption>Chêne naturel, lames droites</span> — rendu calculé dans votre navigateur.
        Photo : ${room.credit}.
      </figcaption>
    </figure>
    <div class="vzp__chips" role="group" aria-label="Aperçu d’autres finitions" data-chips></div>`;

  const stage = root.querySelector('[data-stage]');
  const photo = root.querySelector('[data-photo]');
  const canvas = root.querySelector('[data-canvas]');
  const range = root.querySelector('[data-range]');
  const caption = root.querySelector('[data-caption]');
  const chips = root.querySelector('[data-chips]');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let source = null;
  let sourceData = null;
  let targetData = null;
  let mask = null;
  let current = CHIPS[0];
  const textures = new Map();

  const applyRange = () => stage.style.setProperty('--compare', `${range.value}%`);
  range.addEventListener('input', applyRange);
  applyRange();

  CHIPS.forEach((chip) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vzp__chip';
    button.dataset.chip = chip.tone;
    button.setAttribute('aria-pressed', String(chip === current));
    button.textContent = chip.label;
    button.addEventListener('click', () => {
      current = chip;
      chips
        .querySelectorAll('[data-chip]')
        .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.chip === chip.tone)));
      const pattern = PATTERNS.find((p) => p.id === chip.pattern);
      const tone = TONES.find((t) => t.id === chip.tone);
      caption.textContent = `${tone.label}, ${pattern.label.toLowerCase()}`;
      draw();
    });
    chips.appendChild(button);
  });

  const mips = (config) => {
    const key = `${config.pattern}|${config.tone}`;
    if (!textures.has(key)) textures.set(key, buildMips(buildTexture({ ...config, plankWidth: 0.14 })));
    return textures.get(key);
  };

  function draw() {
    if (!source) return;
    renderFloor({
      source: sourceData,
      target: targetData,
      quad: room.quad.map((p) => ({ x: p.x * source.width, y: p.y * source.height })),
      mask: mask.getAlpha(),
      mips: mips(current),
      angle: 0,
      roomWidth: room.room.width,
      roomDepth: room.room.depth,
      shading: 0.92,
    });
    ctx.putImageData(targetData, 0, 0);
    root.dataset.ready = 'true';
  }

  async function load() {
    try {
      const prepared = downscale(await loadImage(`${base}assets/images/${room.file}`));
      source = prepared;
      canvas.width = prepared.width;
      canvas.height = prepared.height;
      photo.src = `${base}assets/images/${room.file}`;
      sourceData = prepared.canvas
        .getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, prepared.width, prepared.height);
      targetData = ctx.createImageData(prepared.width, prepared.height);
      mask = createMask(prepared.width, prepared.height);
      mask.setPolygon(room.mask || room.quad);
      draw();
    } catch (error) {
      // Sans rendu, la section garde la photo d'origine : rien ne casse.
      root.dataset.ready = 'photo';
      void error;
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
