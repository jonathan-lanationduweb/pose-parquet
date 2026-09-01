/**
 * Visualiseur de parquet — orchestration.
 *
 * Enchaînement : photo (exemple ou import) → zone de sol (manuelle) →
 * texture procédurale → projection en perspective → ombrage → rendu.
 */
import { qs, on } from '../utils/dom.js';
import { getState, setState, subscribe } from './state.js';
import { buildTexture, buildMips, TILE_METERS } from './patterns.js';
import { renderFloor } from './texture-renderer.js';
import { createFloorMask, detectFloor } from './floor-mask.js';
import { createControls } from './controls.js';
import { createCompare } from './compare.js';
import { loadImage, loadFile } from './image-loader.js';
import { ROOMS, getRoom } from './rooms.js';

export function mountVisualizer(root) {
  const base = root.dataset.base || '';

  root.classList.add('vz');
  root.innerHTML = `
    <div class="vz__main">
      <div class="vz__stage" data-stage>
        <img class="vz__photo" alt="" data-photo />
        <canvas class="vz__canvas" data-canvas></canvas>
        <p class="vz__status" data-status role="status"></p>
      </div>
      <div class="vz__bar">
        <p class="vz__credit" data-credit></p>
        <div class="vz__bar-actions">
          <a class="link-arrow" href="${base}outils/simulateur-pose.html">Besoin de réfléchir au calepinage ? Passer en mode Plan</a>
        </div>
      </div>
    </div>
    <div class="vz__aside" data-aside></div>`;

  const stage = qs('[data-stage]', root);
  const photo = qs('[data-photo]', root);
  const canvas = qs('[data-canvas]', root);
  const status = qs('[data-status]', root);
  const credit = qs('[data-credit]', root);
  const aside = qs('[data-aside]', root);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let source = null; // { canvas, width, height }
  let sourceData = null;
  let targetData = null;
  let quad = null; // normalisé (0 → 1)
  let roomId = null;
  let roomDims = { width: 4.2, depth: 4 };
  let mips = null;
  let textureKey = '';
  let pending = false;
  let lastRender = 0;

  const controls = createControls(aside, {
    set(patch, options) {
      setState(patch);
      schedule(options && options.live);
    },
    loadRoom(id) {
      loadRoomById(id);
    },
    loadUserFile(file) {
      loadUserPhoto(file);
    },
    action(name, button) {
      if (name === 'edit-floor') toggleMask(button);
      if (name === 'compare') toggleCompare(button);
      if (name === 'fullscreen') toggleFullscreen();
    },
  });

  const mask = createFloorMask(stage, (next) => {
    quad = next;
    schedule(true);
  });

  const compare = createCompare(stage);

  const setStatus = (message, tone = 'info') => {
    status.textContent = message || '';
    status.dataset.tone = tone;
    status.hidden = !message;
  };

  /* ---------------- Rendu ---------------- */

  const ensureTexture = (state) => {
    const key = `${state.pattern}|${state.tone}|${state.plankWidth}`;
    if (key === textureKey && mips) return;
    mips = buildMips(buildTexture(state));
    textureKey = key;
  };

  const draw = () => {
    pending = false;
    if (!source || !quad) return;
    const state = getState();
    ensureTexture(state);

    const pixels = quad.map((p) => ({ x: p.x * source.width, y: p.y * source.height }));
    const scale = state.scale || 1;
    const ok = renderFloor({
      source: sourceData,
      target: targetData,
      quad: pixels,
      mips,
      angle: (state.angle * Math.PI) / 180,
      roomWidth: roomDims.width / scale,
      roomDepth: roomDims.depth / scale,
      shading: 0.92,
    });
    if (!ok) {
      setStatus('Zone de sol invalide : déplacez les points pour former un quadrilatère.', 'warn');
      return;
    }
    ctx.putImageData(targetData, 0, 0);
    setStatus('');
    lastRender = Date.now();
    controls.sync(state, { roomId });
  };

  /** Rendu différé : une image par frame au maximum, et pas plus d'un rendu / 60 ms en direct. */
  function schedule(live) {
    if (pending) return;
    pending = true;
    const delay = live ? Math.max(0, 60 - (Date.now() - lastRender)) : 0;
    window.setTimeout(() => {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(draw);
      else draw();
      // Filet si rAF est suspendu (onglet en arrière-plan)
      window.setTimeout(() => {
        if (pending) draw();
      }, 140);
    }, delay);
  }

  /* ---------------- Sources ---------------- */

  const applySource = (prepared, meta = {}) => {
    source = prepared;
    canvas.width = prepared.width;
    canvas.height = prepared.height;
    photo.src = prepared.canvas.toDataURL('image/jpeg', 0.9);
    photo.alt = meta.alt || 'Photo de la pièce';
    const sctx = prepared.canvas.getContext('2d', { willReadFrequently: true });
    sourceData = sctx.getImageData(0, 0, prepared.width, prepared.height);
    targetData = ctx.createImageData(prepared.width, prepared.height);
    credit.textContent = meta.credit ? `Photo : ${meta.credit}` : 'Votre photo — traitée dans votre navigateur, sans envoi.';
    stage.dataset.ready = 'true';
  };

  async function loadRoomById(id) {
    const room = getRoom(id);
    setStatus('Chargement de la pièce…');
    try {
      const prepared = await loadImage(`${base}assets/images/${room.file}`);
      applySource(prepared, { alt: room.alt, credit: room.credit });
      roomId = room.id;
      roomDims = room.room;
      quad = await detectFloor('manual', { canvas: prepared.canvas, suggestion: room.quad });
      mask.setQuad(quad);
      schedule();
      setStatus('');
    } catch (error) {
      setStatus("La pièce n'a pas pu être chargée.", 'warn');
      void error;
    }
  }

  async function loadUserPhoto(file) {
    setStatus('Lecture de la photo…');
    try {
      const prepared = await loadFile(file);
      applySource(prepared, {});
      roomId = null;
      roomDims = { width: 4.2, depth: 4 };
      quad = await detectFloor('manual', { canvas: prepared.canvas });
      mask.setQuad(quad);
      schedule();
      // Sur une photo importée, la zone doit être ajustée : on ouvre l'outil.
      toggleMask(qs('[data-action="edit-floor"]', root), true);
      setStatus('Placez les quatre points aux angles de votre sol, puis validez.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.', 'warn');
    }
  }

  /* ---------------- Actions ---------------- */

  function toggleMask(button, force) {
    const next = force !== undefined ? force : !mask.isActive();
    mask.setActive(next);
    stage.dataset.editing = String(next);
    if (button) {
      button.textContent = next ? 'Valider la zone' : 'Modifier la zone du sol';
      button.setAttribute('aria-pressed', String(next));
    }
    if (!next) setStatus('');
  }

  function toggleCompare(button) {
    const next = !compare.isActive();
    compare.setActive(next);
    if (button) button.setAttribute('aria-pressed', String(next));
  }

  function toggleFullscreen() {
    const target = root.closest('[data-visualiseur-shell]') || root;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
    else target.dataset.pseudoFullscreen = 'true';
  }

  /* ---------------- Cycle de vie ---------------- */

  subscribe(() => controls.sync(getState(), { roomId }));
  on(window, 'resize', () => controls.sync(getState(), { roomId }));

  // Boutons d'appel situés hors du panneau (hero de la page)
  document.querySelectorAll('[data-vz-import]').forEach((button) =>
    on(button, 'click', (event) => {
      event.preventDefault();
      controls.openFileDialog();
    })
  );

  controls.sync(getState(), { roomId });
  loadRoomById(root.dataset.room || ROOMS[0].id);

  return {
    element: root,
    loadRoom: loadRoomById,
    render: () => schedule(),
  };
}

export { TILE_METERS };
