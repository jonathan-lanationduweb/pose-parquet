import { clamp as borne } from '../utils/dom.js';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;



export function createViewport({ stage, layers, sceneSize, onChange }) {
  const REDUCED = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  })();

  let vp = { z: 1, x: 0, y: 0 };
  let shown = null;
  let anim = null;
  let pendingFit = false;

  const box = () => stage.getBoundingClientRect();


  function coverScale() {
    const b = box();
    const { w, h } = sceneSize();
    if (!b.width || !b.height || !w || !h) return 1;
    return Math.max(b.width / w, b.height / h);
  }

  function containScale() {
    const b = box();
    const { w, h } = sceneSize();
    if (!b.width || !b.height || !w || !h) return 1;
    return Math.min(b.width / w, b.height / h);
  }
  const zContain = () => containScale() / coverScale();
  const cssScale = () => coverScale() * vp.z;


  const zoomFloor = () => Math.min(ZOOM_MIN, vp.z);


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


  function fitToView(animate) {
    pendingFit = false;
    const b = box();
    const { w, h } = sceneSize();
    const sc = coverScale();
    setVp({ z: 1, x: (b.width - w * sc) / 2, y: (b.height - h * sc) / 2 }, animate);
  }

  function fitAll(animate) {
    pendingFit = false;
    setVp({ z: zContain(), x: 0, y: 0 }, animate);
  }


  function scheduleFit() {
    pendingFit = true;
    setTimeout(() => { if (pendingFit) fitToView(false); }, 0);
  }


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


  const pointers = new Map();
  let pinch = null;
  const ignore = (e, extra) => e.target.closest(`.pv-tools, .pv-bar, .pv-zoom, .pv-note, .pv-split, .pv-drawer, .pv-menu${extra || ''}`);

  function onDown(e) {
    if (ignore(e)) return;
    e.preventDefault();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId); } catch {   }
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
