import { qs, on } from '../utils/dom.js';

/** Comparateur avant / apres pilote par un input range (clavier compris). */
export function initBeforeAfter(root) {
  const range = qs('.ba__range', root);
  if (!range) return;
  const apply = () => root.style.setProperty('--ba-pos', `${range.value}%`);
  apply();
  on(range, 'input', apply);
}
