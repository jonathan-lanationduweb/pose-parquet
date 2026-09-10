/**
 * État partagé entre le visualiseur photo et le mode plan.
 *
 * Volontairement minimal : un objet, des abonnés, une persistance locale.
 * Les deux outils lisent et écrivent les mêmes clés, ce qui permet de
 * choisir un motif dans le visualiseur et de le retrouver en mode plan.
 */
const KEY = 'pose-parquet:visualiseur';

const DEFAULTS = {
  pattern: 'lames', // lames | point-de-hongrie | baton-rompu
  tone: 'naturel',
  plankWidth: 0.14, // mètres
  angle: 0, // degrés
  scale: 1, // multiplicateur d'échelle du motif
};

/** Correspondance des identifiants de motif entre les deux outils. */
export const PATTERN_TO_PLAN = {
  lames: 'longueur',
  'point-de-hongrie': 'point-de-hongrie',
  'baton-rompu': 'baton-rompu',
};
export const PLAN_TO_PATTERN = {
  longueur: 'lames',
  largeur: 'lames',
  diagonale: 'lames',
  'point-de-hongrie': 'point-de-hongrie',
  'baton-rompu': 'baton-rompu',
};

function read() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...stored };
  } catch (error) {
    void error;
    return { ...DEFAULTS };
  }
}

const state = read();
const listeners = new Set();

export function getState() {
  return { ...state };
}

export function setState(patch, options = {}) {
  Object.assign(state, patch);
  if (!options.silent) listeners.forEach((fn) => fn(getState(), patch));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    void error; // navigation privée : on continue sans persistance
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
