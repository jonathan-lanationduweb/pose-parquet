/**
 * Cœur de rendu du Studio.
 *
 * Une seule source de vérité pour la photo, le cadre de perspective et le
 * masque du sol. Toutes les vues (rendu principal, variantes, comparaison)
 * passent par ici : elles partagent donc exactement le même cadrage, la même
 * perspective et le même masque — c'est ce qui rend les comparaisons honnêtes.
 *
 * Le parquet est projeté comme UNE seule surface continue : le motif est
 * calculé dans le plan du sol, pas dans l'image. Un canapé ou un tapis ne
 * coupe pas le calcul, il masque simplement ce qui passe derrière lui.
 */
import { renderFloor } from '../visualizer/texture-renderer.js';
import { createMask } from '../visualizer/mask.js';
import { buildTexture, buildMips } from './texture.js';

const MAX_CACHE = 10;

export function createRenderer() {
  let source = null; // { canvas, width, height }
  let sourceData = null;
  let mask = null;
  let frame = null; // cadre de perspective, normalisé
  let room = { width: 4.2, depth: 4 };
  const buffers = new Map(); // canvas -> ImageData réutilisée
  const textures = new Map();
  let building = null;

  const key = (config) => `${config.materialId}|${config.pattern}|${config.width || 'auto'}`;

  /** Tuile + mips pour une configuration. Mise en cache : le second appel est instantané. */
  function texture(material, config) {
    const id = key(config);
    if (!textures.has(id)) {
      if (textures.size >= MAX_CACHE) textures.delete(textures.keys().next().value);
      textures.set(id, buildMips(buildTexture(material, { pattern: config.pattern, width: config.width })));
    }
    return textures.get(id);
  }

  /** Prépare une texture sans bloquer : sert à précharger les références voisines. */
  function warm(material, config) {
    if (textures.has(key(config))) return;
    const run = () => texture(material, config);
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1200 });
    else window.setTimeout(run, 120);
  }

  return {
    get ready() {
      return Boolean(source && frame && mask);
    },
    get size() {
      return source ? { width: source.width, height: source.height } : null;
    },
    get mask() {
      return mask;
    },
    get frame() {
      return frame;
    },
    get photo() {
      return source ? source.canvas : null;
    },

    setSource(prepared, dims) {
      source = prepared;
      sourceData = prepared.canvas
        .getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, prepared.width, prepared.height);
      mask = createMask(prepared.width, prepared.height);
      room = dims || { width: 4.2, depth: 4 };
      buffers.clear();
      building = null;
    },

    setZone(quad, shape) {
      frame = quad.map((p) => ({ ...p }));
      mask.setPolygon((shape || quad).map((p) => ({ ...p })));
    },
    setFrame(next) {
      frame = next.map((p) => ({ ...p }));
    },

    warm,

    /**
     * Peint une configuration dans un canevas.
     * @param {HTMLCanvasElement} canvas cible (redimensionnée si besoin)
     * @param {object} material
     * @param {object} config { materialId, pattern, angle, width, scale }
     * @param {number} [step] 1 = pleine résolution, 2 = rendu allégé
     */
    paint(canvas, material, config, step = 1) {
      if (!this.ready || !material) return false;
      if (canvas.width !== source.width) {
        canvas.width = source.width;
        canvas.height = source.height;
        buffers.delete(canvas);
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!buffers.has(canvas)) buffers.set(canvas, ctx.createImageData(source.width, source.height));

      const scale = config.scale || 1;
      const ok = renderFloor({
        source: sourceData,
        target: buffers.get(canvas),
        quad: frame.map((p) => ({ x: p.x * source.width, y: p.y * source.height })),
        mask: mask.getAlpha(),
        mips: texture(material, config),
        angle: ((config.angle || 0) * Math.PI) / 180,
        roomWidth: room.width / scale,
        roomDepth: room.depth / scale,
        shading: 0.92,
        step,
      });
      if (!ok) return false;
      ctx.putImageData(buffers.get(canvas), 0, 0);
      return true;
    },
  };
}
