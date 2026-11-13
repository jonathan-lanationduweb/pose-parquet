import { normalizeScene, createBlankScene } from './schema.js';

const analyzers = new Map();

export function registerAnalyzer(name, fn) {
  analyzers.set(name, fn);
}
export const hasAnalyzer = (name) => analyzers.has(name);
export const availableAnalyzers = () => [...analyzers.keys()];



export async function analyzeScene(context = {}, strategy) {
  const name = strategy || (context.sceneId ? 'precalibrated' : 'manual');
  const analyzer = analyzers.get(name) || analyzers.get('manual');
  const raw = await analyzer(context);
  return raw && raw.schema && raw.floorZones && raw.surfaces ? raw : normalizeScene(raw);
}





const cache = new Map();


export async function loadSceneIndex(base = '') {
  if (!cache.has('__index__')) {
    cache.set(
      '__index__',





      fetch(`${base}data/scenes/index.json`, { cache: 'no-cache' }).then((response) => {
        if (!response.ok) throw new Error('Pièces d’exemple indisponibles');
        return response.json();
      })
    );
  }
  return cache.get('__index__');
}



export {
  STATUTS,
  STATUTS_VISUELS,
  geometrieDe,
  visuelDe,
  statutDe,
  estPubliable,
  estDansBibliotheque,
  scenesPubliques,
  scenesBibliotheque,
  sceneOuvrable,
} from './scenes-regles.js';

registerAnalyzer('precalibrated', async ({ sceneId, base = '' }) => {
  const key = `${base}|${sceneId}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`${base}data/scenes/${sceneId}.json`).then(async (response) => {
        if (!response.ok) throw new Error(`Pièce « ${sceneId} » introuvable`);
        return normalizeScene({ ...(await response.json()), source: 'precalibrated' });
      })
    );
  }
  try {
    return await cache.get(key);
  } catch (error) {
    cache.delete(key);
    throw error;
  }
});







registerAnalyzer('manual', ({ width = 0, height = 0, label, quad, meters } = {}) =>
  createBlankScene({ width, height, label, meters, quad: quad || undefined })
);
