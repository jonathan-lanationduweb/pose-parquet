/**
 * Visualiseur de parquet — orchestration.
 *
 * Enchaînement : photo (exemple ou import) → cadre de perspective (manuel) →
 * masque de couverture (contour + pinceau) → texture → projection → ombrage.
 *
 * Deux notions à ne pas confondre :
 *  - le **cadre** donne la perspective (4 points, homographie) ;
 *  - le **masque** dit où le parquet est peint. Retirer au pinceau laisse
 *    réapparaître la photo : c'est ainsi que meubles et tapis restent visibles.
 *
 * Rien n'est envoyé sur un serveur, et aucune détection automatique n'est
 * utilisée ni simulée (voir floor-mask.js pour le point d'extension).
 */
import { qs, on } from '../utils/dom.js';
import { getState, setState, subscribe } from './state.js';
import { buildTexture, buildMips, TILE_METERS } from './patterns.js';
import { renderFloor } from './texture-renderer.js';
import { createFloorEditor, detectFloor } from './floor-mask.js';
import { createMask } from './mask.js';
import { createControls } from './controls.js';
import { createCompare } from './compare.js';
import { createOnboarding } from './onboarding.js';
import { composeRender, downloadCanvas } from './export.js';
import { loadImage, loadFile } from './image-loader.js';
import { ROOMS, getRoom } from './rooms.js';

const CONFIG_KEYS = ['pattern', 'tone', 'plankWidth', 'angle', 'scale'];
const pick = (state) => CONFIG_KEYS.reduce((acc, key) => ({ ...acc, [key]: state[key] }), {});

export function mountVisualizer(root) {
  const base = root.dataset.base || '';

  root.classList.add('vz');
  root.innerHTML = `
    <div class="vz__main">
      <div class="vz__stage" data-stage>
        <img class="vz__photo" alt="" data-photo />
        <canvas class="vz__canvas" data-canvas-a></canvas>
        <canvas class="vz__canvas vz__canvas--b" data-canvas-b hidden></canvas>
        <p class="vz__status" data-status role="status"></p>
      </div>
      <div class="vz__bar">
        <p class="vz__credit" data-credit></p>
        <div class="vz__bar-actions">
          <button class="vz__help" type="button" data-help aria-label="Revoir la prise en main">?</button>
          <button class="btn btn--ghost btn--xs" type="button" data-reset>Réinitialiser</button>
          <a class="link-arrow" href="${base}outils/simulateur-pose.html">Réfléchir au calepinage ? Passer en mode Plan</a>
        </div>
      </div>
    </div>
    <div class="vz__aside" data-aside></div>`;

  const stage = qs('[data-stage]', root);
  const photo = qs('[data-photo]', root);
  const canvasA = qs('[data-canvas-a]', root);
  const canvasB = qs('[data-canvas-b]', root);
  const status = qs('[data-status]', root);
  const credit = qs('[data-credit]', root);
  const aside = qs('[data-aside]', root);
  const ctxA = canvasA.getContext('2d', { willReadFrequently: true });
  const ctxB = canvasB.getContext('2d', { willReadFrequently: true });

  let source = null; // { canvas, width, height }
  let sourceData = null;
  const targets = { A: null, B: null };
  let frame = null; // cadre de perspective, normalisé
  let polygonEdited = false;
  let roomId = null;
  let userPhoto = false;
  let roomDims = { width: 4.2, depth: 4 };
  let mask = null;
  let pending = false;
  let refine = 0;
  let lastRender = 0;
  let quality = 1;

  const textures = new Map();
  const variants = { A: pick(getState()), B: null };
  let variant = 'A';

  const zone = { editing: false, mode: 'frame', brushMode: 'remove', brushSize: 42, canUndo: false, canRedo: false };

  const setStatus = (message, tone = 'info') => {
    status.textContent = message || '';
    status.dataset.tone = tone;
    status.hidden = !message;
  };

  const syncZone = () => {
    zone.canUndo = Boolean(mask && mask.canUndo());
    zone.canRedo = Boolean(mask && mask.canRedo());
    controls.syncZone(zone);
  };

  /* ---------------- Rendu ---------------- */

  const ensureMips = (config) => {
    const key = `${config.pattern}|${config.tone}|${config.plankWidth}`;
    if (!textures.has(key)) {
      if (textures.size > 6) textures.clear();
      textures.set(key, buildMips(buildTexture(config)));
    }
    return textures.get(key);
  };

  const drawVariant = (id, step) => {
    const config = variants[id];
    if (!config) return true;
    const pixels = frame.map((p) => ({ x: p.x * source.width, y: p.y * source.height }));
    const scale = config.scale || 1;
    const ok = renderFloor({
      source: sourceData,
      target: targets[id],
      quad: pixels,
      mask: mask.getAlpha(),
      mips: ensureMips(config),
      angle: (config.angle * Math.PI) / 180,
      roomWidth: roomDims.width / scale,
      roomDepth: roomDims.depth / scale,
      shading: 0.92,
      step,
    });
    if (!ok) return false;
    (id === 'A' ? ctxA : ctxB).putImageData(targets[id], 0, 0);
    return true;
  };

  const draw = () => {
    pending = false;
    if (!source || !frame || !mask) return;
    const step = quality;
    if (!drawVariant('A', step) || (compare.getMode() === 'ab' && !drawVariant('B', step))) {
      setStatus('Zone de sol invalide : déplacez les points pour former un quadrilatère.', 'warn');
      return;
    }
    setStatus('');
    lastRender = Date.now();
    controls.sync(getState(), { roomId, userPhoto });
    // Rendu allégé pendant l'interaction : on repasse en pleine résolution au repos.
    if (step > 1) {
      window.clearTimeout(refine);
      refine = window.setTimeout(() => {
        quality = 1;
        schedule();
      }, 220);
    }
  };

  /** Rendu différé : une image par frame au maximum, et pas plus d'un rendu / 60 ms en direct. */
  function schedule(live) {
    if (live) {
      quality = 2;
      window.clearTimeout(refine);
    }
    if (pending) return;
    pending = true;
    const delay = live ? Math.max(0, 55 - (Date.now() - lastRender)) : 0;
    window.setTimeout(() => {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(draw);
      else draw();
      // Filet si rAF est suspendu (onglet en arrière-plan)
      window.setTimeout(() => {
        if (pending) draw();
      }, 140);
    }, delay);
  }

  /* ---------------- Panneau ---------------- */

  const controls = createControls(aside, {
    set(patch, options) {
      variants[variant] = { ...variants[variant], ...patch };
      setState(patch);
      schedule(options && options.live);
    },
    loadRoom(id) {
      loadRoomById(id);
    },
    loadUserFile(file) {
      loadUserPhoto(file);
    },
    zone(name, value) {
      handleZone(name, value);
    },
    action(name, button) {
      if (name === 'edit-floor') toggleEditing();
      if (name === 'compare') setCompare(compare.getMode() === 'photo' ? 'off' : 'photo');
      if (name === 'compare-ab') setCompare(compare.getMode() === 'ab' ? 'off' : 'ab');
      if (name === 'fullscreen') toggleFullscreen();
      if (name === 'export') exportRender(button);
      if (name === 'variant') selectVariant(button.dataset.variant);
    },
  });

  const editor = createFloorEditor(stage, {
    onFrameChange(next) {
      frame = next;
      if (!polygonEdited) {
        mask.setPolygon(next);
        editor.setPolygon(next);
      }
      schedule(true);
    },
    onPolygonChange(next) {
      polygonEdited = true;
      mask.setPolygon(next);
      schedule(true);
    },
    onInsertPoint(point) {
      polygonEdited = true;
      mask.insertPointNear(point);
      editor.setPolygon(mask.getPolygon());
      schedule(true);
    },
    onRemovePoint(index) {
      const removed = mask.removePoint(index);
      if (removed) {
        polygonEdited = true;
        editor.setPolygon(mask.getPolygon());
        schedule(true);
      }
      return removed;
    },
    onStrokeStart(mode, radius, point) {
      mask.beginStroke(mode, toImageRadius(radius), point);
      schedule(true);
      syncZone();
    },
    onStrokeMove(point) {
      mask.extendStroke(point);
      schedule(true);
    },
    onStrokeEnd() {
      quality = 1;
      schedule();
      syncZone();
    },
  });

  const compare = createCompare(stage);
  const onboarding = createOnboarding(stage);

  /** Le pinceau est réglé en pixels écran : conversion vers les pixels image. */
  function toImageRadius(radius) {
    if (!source) return radius;
    const displayed = stage.clientWidth || source.width;
    return Math.max(2, (radius * source.width) / displayed);
  }

  /* ---------------- Sources ---------------- */

  const applySource = (prepared, meta = {}) => {
    source = prepared;
    [canvasA, canvasB].forEach((canvas) => {
      canvas.width = prepared.width;
      canvas.height = prepared.height;
    });
    photo.src = prepared.canvas.toDataURL('image/jpeg', 0.9);
    photo.alt = meta.alt || 'Photo de la pièce';
    const sctx = prepared.canvas.getContext('2d', { willReadFrequently: true });
    sourceData = sctx.getImageData(0, 0, prepared.width, prepared.height);
    targets.A = ctxA.createImageData(prepared.width, prepared.height);
    targets.B = ctxB.createImageData(prepared.width, prepared.height);
    mask = createMask(prepared.width, prepared.height);
    polygonEdited = false;
    textures.clear();
    credit.textContent = meta.credit
      ? `Photo : ${meta.credit}`
      : 'Votre photo — lue dans votre navigateur, ni envoyée ni conservée.';
    stage.dataset.ready = 'true';
  };

  /**
   * @param {{x:number,y:number}[]} quad    cadre de perspective
   * @param {{x:number,y:number}[]} [shape] contour du sol, si la pièce en fournit un
   */
  const applyZone = (quad, shape) => {
    const polygon = (shape || quad).map((p) => ({ ...p }));
    frame = quad;
    polygonEdited = Boolean(shape);
    editor.setFrame(quad);
    editor.setPolygon(polygon);
    mask.setPolygon(polygon);
    syncZone();
  };

  async function loadRoomById(id) {
    const room = getRoom(id);
    setStatus('Chargement de la pièce…');
    try {
      const prepared = await loadImage(`${base}assets/images/${room.file}`);
      applySource(prepared, { alt: room.alt, credit: room.credit });
      roomId = room.id;
      userPhoto = false;
      roomDims = room.room;
      applyZone(await detectFloor('manual', { canvas: prepared.canvas, suggestion: room.quad }), room.mask);
      setEditing(false);
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
      userPhoto = true;
      roomDims = { width: 4.2, depth: 4 };
      applyZone(await detectFloor('manual', { canvas: prepared.canvas }));
      schedule();
      // Sur une photo importée, la zone doit être ajustée : on ouvre l'outil.
      setEditing(true, 'frame');
      setStatus('Placez les quatre points aux angles de votre sol, puis affinez si besoin.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.', 'warn');
    }
  }

  /* ---------------- Zone du sol ---------------- */

  function setEditing(next, mode) {
    zone.editing = next;
    if (next && mode) zone.mode = mode;
    editor.setMode(next ? zone.mode : 'off');
    editor.setBrush({ mode: zone.brushMode, radius: zone.brushSize });
    stage.dataset.editing = String(next);
    if (!next) setStatus('');
    syncZone();
  }

  function toggleEditing() {
    setEditing(!zone.editing, 'frame');
  }

  function handleZone(name, value) {
    if (name === 'mode') {
      zone.mode = value;
      editor.setMode(value);
      syncZone();
      return;
    }
    if (name === 'brush-mode') {
      zone.brushMode = value;
      editor.setBrush({ mode: value });
      syncZone();
      return;
    }
    if (name === 'brush-size') {
      zone.brushSize = value;
      editor.setBrush({ radius: value });
      syncZone();
      return;
    }
    if (name === 'undo' && mask.undo()) schedule();
    if (name === 'redo' && mask.redo()) schedule();
    if (name === 'reset') {
      mask.clearStrokes();
      polygonEdited = false;
      const room = roomId ? getRoom(roomId) : null;
      applyZone(room ? room.quad.map((p) => ({ ...p })) : editor.getFrame(), room ? room.mask : null);
      schedule();
    }
    if (name === 'done') {
      setEditing(false);
      return;
    }
    syncZone();
  }

  /* ---------------- Comparaisons ---------------- */

  function setCompare(mode) {
    if (mode === 'ab' && !variants.B) {
      // La version B part de la configuration courante : on la rend distincte
      // pour que la comparaison ait un intérêt immédiat.
      const from = variants.A;
      variants.B = { ...from, tone: from.tone === 'naturel' ? 'fume' : 'naturel' };
    }
    canvasB.hidden = mode !== 'ab';
    compare.setMode(mode, mode === 'ab' ? ['Version A', 'Version B'] : ['Avant', 'Après']);
    if (mode !== 'ab' && variant === 'B') selectVariant('A');
    controls.syncCompare(mode, variant);
    schedule();
  }

  function selectVariant(id) {
    variant = id;
    if (!variants[id]) variants[id] = { ...variants.A };
    setState(variants[id]);
    controls.syncCompare(compare.getMode(), variant);
    controls.sync(getState(), { roomId, userPhoto });
  }

  const compareRatio = () => {
    const raw = stage.style.getPropertyValue('--compare') || '50%';
    return Math.min(1, Math.max(0, parseFloat(raw) / 100));
  };

  async function exportRender(button) {
    if (!source) return;
    const label = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Préparation…';
    }
    try {
      const image = composeRender({
        primary: canvasA,
        secondary: canvasB,
        photo,
        mode: compare.getMode(),
        ratio: compareRatio(),
      });
      await downloadCanvas(image, 'simulation-parquet.jpg');
      setStatus('Rendu enregistré dans vos téléchargements.');
      window.setTimeout(() => setStatus(''), 4000);
    } catch (error) {
      setStatus("Le rendu n'a pas pu être enregistré.", 'warn');
      void error;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
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

  function reset() {
    variants.A = pick(getState());
    variants.B = null;
    variant = 'A';
    setCompare('off');
    if (mask) mask.clearStrokes();
    polygonEdited = false;
    loadRoomById(roomId || ROOMS[0].id);
  }

  /* ---------------- Paramètres d'URL ---------------- */

  function applyQuery() {
    const params = new URLSearchParams(window.location.search);
    const patch = {};
    if (params.get('motif')) patch.pattern = params.get('motif');
    if (params.get('teinte')) patch.tone = params.get('teinte');
    if (params.get('sens')) patch.angle = Number(params.get('sens'));
    if (Object.keys(patch).length) {
      setState(patch);
      variants.A = { ...variants.A, ...patch };
    }
    return params.get('piece');
  }

  /* ---------------- Cycle de vie ---------------- */

  subscribe(() => controls.sync(getState(), { roomId, userPhoto }));
  on(window, 'resize', () => controls.sync(getState(), { roomId, userPhoto }));
  on(qs('[data-help]', root), 'click', () => onboarding.open());
  on(qs('[data-reset]', root), 'click', () => reset());

  // Boutons d'appel situés hors du panneau (hero de la page)
  document.querySelectorAll('[data-vz-import]').forEach((button) =>
    on(button, 'click', (event) => {
      event.preventDefault();
      controls.openFileDialog();
    })
  );

  const room = applyQuery();
  controls.sync(getState(), { roomId, userPhoto });
  controls.syncCompare('off', 'A');
  loadRoomById(room || root.dataset.room || ROOMS[0].id);
  if (!onboarding.seen) window.setTimeout(() => onboarding.open(), 700);

  return {
    element: root,
    loadRoom: loadRoomById,
    render: () => schedule(),
  };
}

export { TILE_METERS };
