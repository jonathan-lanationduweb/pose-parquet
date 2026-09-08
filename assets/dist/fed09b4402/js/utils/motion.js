/** Detection centralisee de la preference de mouvement reduit. */
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = () => query.matches;

export function onMotionPreferenceChange(callback) {
  query.addEventListener('change', () => callback(query.matches));
}
