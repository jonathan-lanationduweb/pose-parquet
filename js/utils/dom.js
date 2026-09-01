/** Helpers DOM minimalistes partages par tous les composants. */

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export function ready(callback) {
  if (document.readyState !== 'loading') callback();
  else document.addEventListener('DOMContentLoaded', callback, { once: true });
}

/** Initialise un composant sur tous les elements portant un attribut donne. */
export function mountAll(selector, factory, scope = document) {
  return qsa(selector, scope).map((el) => factory(el));
}

/** Piege le focus dans un conteneur (modale, drawer). */
export function trapFocus(container, event) {
  const focusables = qsa(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    container
  ).filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Generateur pseudo-aleatoire deterministe : rendu stable entre deux rendus. */
export function seeded(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
