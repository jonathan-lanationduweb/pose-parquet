/**
 * Matériau.
 *
 * Un parquet n'est pas une teinte : c'est une essence, une largeur de lame,
 * une finition, un veinage — et, à terme, un jeu de cartes physiques.
 *
 * Le modèle de données prévoit dès maintenant les trois cartes usuelles :
 *
 *   albedo     couleur du bois, sans lumière
 *   normal     relief : chanfreins, veines creusées, joints
 *   roughness  brillance locale : une veine ouverte est plus mate qu'un nœud
 *
 * Aucune n'est fournie sous forme de fichier aujourd'hui : nous n'avons pas de
 * ressources photographiques adaptées, et fabriquer de fausses normal maps
 * n'apporterait rien. L'albedo est donc dessiné par le moteur procédural
 * (js/scene/texture.js), et le relief est dérivé de sa luminance — une
 * approximation honnête, remplacée sans rien casser le jour où de vraies
 * cartes existent :
 *
 *   assets/materials/chene-naturel/
 *     albedo.webp  normal.webp  roughness.webp  thumbnail.webp
 *
 * Il suffit alors de déclarer `maps` dans data/parquets.json.
 */
import { buildTexture, buildMips, TILE, TILE_METERS } from './texture.js';

/** Rugosité de référence par finition : ce qui distingue mat, satiné, verni. */
const FINISH = {
  brut: { roughness: 0.95, clearcoat: 0.0 },
  huile: { roughness: 0.82, clearcoat: 0.04 },
  mat: { roughness: 0.74, clearcoat: 0.08 },
  satine: { roughness: 0.5, clearcoat: 0.22 },
  vernis: { roughness: 0.34, clearcoat: 0.38 },
  cire: { roughness: 0.6, clearcoat: 0.16 },
};

/** Devine la finition à partir de son libellé — le catalogue est en français. */
function finishProfile(label = '', declared) {
  if (declared && FINISH[declared]) return { key: declared, ...FINISH[declared] };
  const text = label.toLowerCase();
  // « brossé » : la brosse creuse le grain et mate la surface. Sans ce cas, un
  // « Fumé brossé » retombait sur « mat » et recevait un reflet qu'il n'a pas.
  const key = text.includes('brut') || text.includes('bross')
    ? 'brut'
    : text.includes('satin')
      ? 'satine'
      : text.includes('vernis')
        ? text.includes('mat')
          ? 'mat'
          : 'vernis'
        : text.includes('cir')
          ? 'cire'
          : text.includes('huil')
            ? 'huile'
            : 'mat';
  return { key, ...FINISH[key] };
}

/**
 * Enrichit une entrée de data/parquets.json en matériau complet.
 * L'entrée d'origine reste accessible : le catalogue et les vignettes
 * continuent de fonctionner à l'identique.
 */
export function createMaterial(entry) {
  const finish = finishProfile(entry.finish, entry.finishKind);
  return {
    ...entry,
    plank: {
      width: entry.boardWidth,
      length: entry.boardLength || entry.boardWidth * 9,
      bevel: entry.texture.bevel,
    },
    surface: {
      roughness: Number.isFinite(entry.roughness) ? entry.roughness : finish.roughness,
      clearcoat: Number.isFinite(entry.clearcoat) ? entry.clearcoat : finish.clearcoat,
      // Amplitude du relief, en fraction de la largeur de lame. Le bois brut
      // accroche la lumière, un vernis épais l'aplanit.
      relief: Number.isFinite(entry.relief) ? entry.relief : 0.45 - finish.clearcoat * 0.6,
      finishKind: finish.key,
    },
    variation: Number.isFinite(entry.variation) ? entry.variation : entry.texture.spread / 30,
    /**
     * Cartes physiques. Vides aujourd'hui : voir assets/materials/README.md.
     * `hasMaps` dit si le moteur peut s'en servir ; sinon il retombe sur le
     * dessin procédural, qui reste la source de vérité par défaut.
     */
    maps: {
      albedo: (entry.maps && entry.maps.albedo) || null,
      normal: (entry.maps && entry.maps.normal) || null,
      roughness: (entry.maps && entry.maps.roughness) || null,
    },
    hasMaps: Boolean(entry.maps && entry.maps.albedo),
    proceduralFallback: entry.proceduralFallback !== false,
    /** Dimensions et angle propres à chaque motif. Voir js/scene/texture.js. */
    patternProfiles: entry.patternProfiles || null,
  };
}

/* ------------------------------------------------------------------ */
/* Fabrication des cartes                                              */
/* ------------------------------------------------------------------ */

const cache = new Map();
const MAX_CACHE = 12;
const key = (material, config) =>
  `${material.id}|${config.pattern}|${config.width || 'auto'}|${config.plankLength || 'auto'}`;

/**
 * Relief dérivé de l'albedo.
 *
 * Faute de vraie normal map, on lit le relief dans la luminance de la tuile :
 * un joint sombre est un creux, un chanfrein clair une arête. C'est faux d'un
 * point de vue physique, mais visuellement juste sur du bois — et ça suffit à
 * faire accrocher la lumière sur les joints, ce qui est précisément le détail
 * qui manque quand un parquet a l'air peint.
 *
 * Sortie : une carte RG (dérivées x et y), packée dans les canaux 0 et 1, plus
 * la rugosité locale dans le canal 2. Un seul échantillonnage suffit au shader.
 */
function reliefFromAlbedo(mip, { relief, roughness }) {
  const size = mip.size;
  const src = mip.data;
  const out = new Uint8ClampedArray(size * size * 4);
  const luma = new Float32Array(size * size);
  for (let i = 0, p = 0; i < luma.length; i += 1, p += 4) {
    luma[i] = (0.2126 * src[p] + 0.7152 * src[p + 1] + 0.0722 * src[p + 2]) / 255;
  }
  const amp = relief * 160;
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    const row = y * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const dx = luma[row + right] - luma[row + left];
      const dy = luma[down + x] - luma[up + x];
      const p = (row + x) * 4;
      out[p] = 128 + dx * amp;
      out[p + 1] = 128 + dy * amp;
      // Une zone sombre (joint, veine ouverte) est plus mate qu'une zone claire
      out[p + 2] = Math.round(255 * Math.min(1, roughness * (1.25 - luma[row + x] * 0.45)));
      out[p + 3] = 255;
    }
  }
  return { size, data: out };
}

/**
 * Cartes prêtes à échantillonner pour un matériau et une configuration.
 *
 * @returns {{albedo: {size,data}[], relief: {size,data}[], tile: HTMLCanvasElement,
 *            meters: number, surface: object}}
 */
export function materialMaps(material, config = {}) {
  const id = key(material, config);
  if (cache.has(id)) return cache.get(id);
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);

  // `width` n'est transmis que si l'utilisateur l'a explicitement réglé : sans
  // quoi on court-circuiterait le choix de largeur propre au motif (une lame
  // droite de 18 cm, un chevron de 9 cm).
  const tile = buildTexture(material, {
    pattern: config.pattern || material.defaultPattern,
    width: config.width || null,
  });
  const albedo = buildMips(tile);
  const relief = albedo.map((mip) => reliefFromAlbedo(mip, material.surface));

  const maps = { albedo, relief, tile, meters: TILE_METERS, size: TILE, surface: material.surface };
  cache.set(id, maps);
  return maps;
}

/** Prépare des cartes sans bloquer : sert à précharger les références voisines. */
export function warmMaterial(material, config) {
  if (cache.has(key(material, config))) return;
  const run = () => materialMaps(material, config);
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1200 });
  else window.setTimeout(run, 120);
}

export const clearMaterialCache = () => cache.clear();
