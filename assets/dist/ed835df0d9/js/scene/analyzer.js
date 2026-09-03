/**
 * Analyse d'une pièce : le seul endroit qui sait d'où viennent les données.
 *
 *   IMAGE  →  analyzeScene()  →  SceneData  →  moteur de rendu
 *
 * Deux stratégies existent aujourd'hui, et aucune ne fait d'analyse d'image :
 *
 *   - `precalibrated` : lit data/scenes/<id>.json, calibré à la main ;
 *   - `manual`        : fabrique une scène minimale que l'utilisateur ajuste.
 *
 * Une troisième viendra un jour, sans que le reste du visualiseur change :
 *
 *   registerAnalyzer('remote', async ({ file }) => {
 *     const body = new FormData();
 *     body.append('image', file);
 *     const res = await fetch(`${API}/analyze-room`, { method: 'POST', body });
 *     return res.json(); // normalisée automatiquement ci-dessous
 *   });
 *
 * Le contrat de cette réponse est écrit dans docs/future-ai-api-contract.md.
 * Tant que cette stratégie n'est pas enregistrée, l'interface ne parle ni
 * d'analyse ni de détection : ce serait faux.
 */
import { normalizeScene, createBlankScene } from './schema.js';

const analyzers = new Map();

export function registerAnalyzer(name, fn) {
  analyzers.set(name, fn);
}
export const hasAnalyzer = (name) => analyzers.has(name);
export const availableAnalyzers = () => [...analyzers.keys()];

/**
 * @param {object} context
 * @param {string} [context.sceneId]  pièce d'exemple à charger
 * @param {number} [context.width]    dimensions de l'image, pour une photo
 * @param {number} [context.height]
 * @param {File}   [context.file]     photo d'origine (pour une future analyse)
 * @param {string} [context.base]     préfixe des chemins du site
 * @param {string} [strategy]         défaut : `precalibrated` si un id est fourni
 * @returns {Promise<object>} SceneData normalisée
 */
export async function analyzeScene(context = {}, strategy) {
  const name = strategy || (context.sceneId ? 'precalibrated' : 'manual');
  const analyzer = analyzers.get(name) || analyzers.get('manual');
  const raw = await analyzer(context);
  return raw && raw.schema && raw.floorZones && raw.surfaces ? raw : normalizeScene(raw);
}

/* ------------------------------------------------------------------ */
/* Pièces d'exemple : scènes calibrées à la main                       */
/* ------------------------------------------------------------------ */

const cache = new Map();

/** Manifeste des pièces d'exemple. */
export async function loadSceneIndex(base = '') {
  if (!cache.has('__index__')) {
    cache.set(
      '__index__',
      fetch(`${base}data/scenes/index.json`).then((response) => {
        if (!response.ok) throw new Error('Pièces d’exemple indisponibles');
        return response.json();
      })
    );
  }
  return cache.get('__index__');
}

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
    cache.delete(key); // une panne réseau ne doit pas être mise en cache
    throw error;
  }
});

/* ------------------------------------------------------------------ */
/* Photo importée : sélection manuelle                                 */
/* ------------------------------------------------------------------ */

/**
 * Aucune analyse : on renvoie un plan de départ plausible pour un intérieur
 * photographié debout, que l'utilisateur déplace ensuite. Le seul indice
 * exploité est le format de l'image, qui décale un peu la ligne d'horizon.
 */
registerAnalyzer('manual', ({ width = 0, height = 0, label, quad, meters } = {}) => {
  const ratio = width && height ? width / height : 1.5;
  const horizon = ratio > 1.6 ? 0.6 : 0.64;
  return createBlankScene({
    width,
    height,
    label,
    meters,
    quad:
      quad ||
      [
        { x: 0.18, y: horizon },
        { x: 0.82, y: horizon },
        { x: 1.03, y: 1.0 },
        { x: -0.03, y: 1.0 },
      ],
  });
});
