/**
 * Viewport : pan et zoom 2D sur la scène.
 *
 * Un seul état `{ z, x, y }` pilote TOUT ce qui est dans la scène — la photo,
 * le rendu, la version B d'une comparaison — parce que ces couches sont les
 * enfants d'un même conteneur et reçoivent la même transformation. Il n'y a
 * rien à synchroniser : c'est structurel.
 *
 *   z = 1   la photo COUVRE le cadre. C'est « 100 % », le cadrage immersif.
 *           Un geste ne descend jamais en dessous : il n'y a aucune raison de
 *           faire apparaître du vide en zoomant.
 *   z < 1   toute la photo est visible, avec des bandes. Seule la commande
 *           explicite « Ajuster » y mène.
 *
 * Deux règles héritées d'une stabilisation mesurée :
 *
 *   - le point sous le curseur reste sous le curseur pendant un zoom ;
 *   - l'ÉTAT est commis tout de suite, l'image seule est interpolée, par
 *     minuteur. `requestAnimationFrame` ne porte jamais d'état : il ne se
 *     déclenche pas dans un onglet qui ne peint pas, et cinq commandes étaient
 *     mortes pour cette seule raison.
 *
 * Ce n'est pas de la 3D : on ne se déplace pas dans la pièce, le point de vue
 * ne change pas.
 */
import { clamp as borne } from '../utils/dom.js';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

/**
 * @param {object} o
 * @param {HTMLElement} o.stage          le cadre : reçoit les gestes
 * @param {() => HTMLElement[]} o.layers les éléments à transformer
 * @param {() => {w:number,h:number}} o.sceneSize taille intrinsèque de la scène
 * @param {(vp: {z:number,x:number,y:number}) => void} [o.onChange]
 */
export function createViewport({ stage, layers, sceneSize, onChange }) {
  const REDUCED = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  })();

  let vp = { z: 1, x: 0, y: 0 };
  let shown = null;       /* ce qui est AFFICHÉ pendant une interpolation */
  let anim = null;
  let pendingFit = false;

  const box = () => stage.getBoundingClientRect();

  /** Échelle à laquelle la photo couvre le cadre : la base de 100 %. */
  function coverScale() {
    const b = box();
    const { w, h } = sceneSize();
    if (!b.width || !b.height || !w || !h) return 1;
    return Math.max(b.width / w, b.height / h);
  }
  /** Échelle à laquelle la photo tient entière dans le cadre. */
  function containScale() {
    const b = box();
    const { w, h } = sceneSize();
    if (!b.width || !b.height || !w || !h) return 1;
    return Math.min(b.width / w, b.height / h);
  }
  const zContain = () => containScale() / coverScale();
  const cssScale = () => coverScale() * vp.z;
  /* Plancher d'un geste : jamais sous la couverture, jamais plus bas qu'on
     n'est déjà (depuis « Ajuster », zoomer en arrière ne saute pas à 100 %). */
  const zoomFloor = () => Math.min(ZOOM_MIN, vp.z);

  /** Borne la translation : la scène couvre le cadre, ou se centre. */
  function clamp(v) {
    const b = box();
    const { w, h } = sceneSize();
    const s = coverScale() * v.z;
    const dw = w * s;
    const dh = h * s;
    return {
      z: v.z,
      x: dw <= b.width ? (b.width - dw) / 2 : Math.min(0, Math.max(b.width - dw, v.x)),
      y: dh <= b.height ? (b.height - dh) / 2 : Math.min(0, Math.max(b.height - dh, v.y)),
    };
  }

  function apply() {
    const { w, h } = sceneSize();
    const v = shown || vp;
    const s = coverScale() * v.z;
    const t = `translate3d(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
    layers().forEach((el) => {
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.transform = t;
    });
    if (onChange) onChange(vp);
  }

  function setVp(next, animate) {
    const c = clamp(next);
    const moved = Math.abs(c.z - vp.z) > 1e-4 || Math.abs(c.x - vp.x) > 0.5 || Math.abs(c.y - vp.y) > 0.5;
    if (anim) { clearTimeout(anim.timer); anim = null; }
    if (!moved || !animate || REDUCED) { shown = null; vp = c; apply(); return; }
    const from = { ...(shown || vp) };
    vp = c;
    const dur = 200;
    anim = { t0: performance.now(), timer: 0 };
    const step = () => {
      if (!anim) return;
      const k = Math.min(1, (performance.now() - anim.t0) / dur);
      const e = 1 - (1 - k) ** 3;
      if (k < 1) {
        shown = { z: from.z + (c.z - from.z) * e, x: from.x + (c.x - from.x) * e, y: from.y + (c.y - from.y) * e };
        apply();
        anim.timer = setTimeout(step, 16);
      } else {
        shown = null; anim = null; apply();
      }
    };
    step();
  }

  /** Cadrage immersif : la photo remplit le cadre, centrée. « 100 % ». */
  function fitToView(animate) {
    pendingFit = false;
    const b = box();
    const { w, h } = sceneSize();
    const sc = coverScale();
    setVp({ z: 1, x: (b.width - w * sc) / 2, y: (b.height - h * sc) / 2 }, animate);
  }
  /** Toute la photo : des bandes, mais rien de coupé. Sur demande seulement. */
  function fitAll(animate) {
    pendingFit = false;
    setVp({ z: zContain(), x: 0, y: 0 }, animate);
  }
  /* Le recentrage d'ouverture est différé d'un tour, le temps que le cadre ait
     une taille. Un geste fait d'ici là gagne. */
  function scheduleFit() {
    pendingFit = true;
    setTimeout(() => { if (pendingFit) fitToView(false); }, 0);
  }

  /** Zoome en gardant le point (px, py) du cadre sous le curseur. */
  function zoomAt(factor, px, py, animate) {
    pendingFit = false;
    const b = box();
    const cx = px == null ? b.width / 2 : px;
    const cy = py == null ? b.height / 2 : py;
    const z = borne(vp.z * factor, zoomFloor(), ZOOM_MAX);
    const s0 = coverScale() * vp.z;
    const s1 = coverScale() * z;
    if (!s0) return;
    const u = (cx - vp.x) / s0;
    const v = (cy - vp.y) / s0;
    setVp({ z, x: cx - u * s1, y: cy - v * s1 }, animate);
  }

  /* ---------------- Gestes ---------------- */
  const pointers = new Map();
  let pinch = null;
  const ignore = (e, extra) => e.target.closest(`.pv-tools, .pv-bar, .pv-zoom, .pv-note, .pv-split, .pv-drawer, .pv-menu${extra || ''}`);

  function onDown(e) {
    if (ignore(e)) return;
    e.preventDefault();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
    stage.classList.add('grabbing');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: vp.z };
    }
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pendingFit = false;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const b = box();
    if (pointers.size === 2 && pinch) {
      const [p1, p2] = [...pointers.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinch.dist > 4) {
        const mid = { x: (p1.x + p2.x) / 2 - b.left, y: (p1.y + p2.y) / 2 - b.top };
        const target = borne(pinch.z * (dist / pinch.dist), zoomFloor(), ZOOM_MAX);
        zoomAt(target / vp.z, mid.x, mid.y, false);
      }
      return;
    }
    setVp({ z: vp.z, x: vp.x + (e.clientX - prev.x), y: vp.y + (e.clientY - prev.y) }, false);
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) stage.classList.remove('grabbing');
  }
  function onWheel(e) {
    /* La molette dans le tiroir fait defiler le tiroir, pas zoomer la piece. */
    if (e.target.closest('.pv-drawer, .pv-menu, .pv-bar')) return;
    e.preventDefault();
    const b = box();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? b.height : 1;
    const d = e.deltaY * unit;
    const factor = Math.exp(-d * (e.ctrlKey ? 0.012 : 0.0022));
    zoomAt(factor, e.clientX - b.left, e.clientY - b.top, false);
  }
  function onDouble(e) {
    if (ignore(e)) return;
    const b = box();
    zoomAt(e.shiftKey ? 1 / 1.8 : 1.8, e.clientX - b.left, e.clientY - b.top, true);
  }

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('dblclick', onDouble);

  /* Le cadre change de taille : on garde le zoom, on reborne la position.
     `resize` ne dit rien d'un en-tête masqué ni d'un panneau du navigateur ;
     l'observateur du cadre, si. Et un onglet caché ne reçoit ni l'un ni
     l'autre : on reborne au retour. */
  const reborner = () => setVp(vp, false);
  window.addEventListener('resize', reborner);
  if (typeof ResizeObserver === 'function') new ResizeObserver(reborner).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reborner(); });

  return {
    get vp() { return { ...vp }; },
    get zContain() { return zContain(); },
    get zoomFloor() { return zoomFloor(); },
    cssScale,
    setVp,
    fitToView,
    fitAll,
    scheduleFit,
    zoomAt,
    reclamp: reborner,
    apply,
  };
}
