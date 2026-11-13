const KEY = 'pose-parquet:visualiseur';

const DEFAULTS = {
  pattern: 'lames',
  tone: 'naturel',
  plankWidth: 0.14,
  angle: 0,
  scale: 1,
};


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
    void error;
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
