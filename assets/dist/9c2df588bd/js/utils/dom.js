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
/**
 * Maintient le focus dans un ou plusieurs conteneurs.
 * @param {Element|Element[]} container un conteneur, ou plusieurs (le bouton de
 *   fermeture d'un menu vit souvent hors du panneau qu'il ferme).
 */
export function trapFocus(container, event) {
  const roots = Array.isArray(container) ? container : [container];
  const focusables = roots
    .flatMap((root) =>
      qsa(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        root
      )
    )
    .filter((el) => el.offsetParent !== null);
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

/**
 * Echappement HTML, pour les valeurs qui viennent d'un fichier de donnees.
 *
 * Tant que le catalogue etait ecrit a la main dans le depot, interpoler un nom
 * de produit dans un litteral de gabarit ne risquait rien : personne d'autre
 * que nous n'ecrivait ces chaines. Ouvrir le catalogue a une source externe
 * change la nature du probleme — un nom commercial saisi ailleurs devient du
 * HTML sur notre page.
 *
 * L'apostrophe est echappee elle aussi : sans elle, la fonction serait sure
 * pour du contenu et fausse pour un attribut entre apostrophes, et c'est le
 * genre de nuance qu'on oublie au troisieme appel.
 *
 * @param {unknown} valeur
 * @returns {string}
 */
export const echapper = (valeur) =>
  String(valeur == null ? '' : valeur).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * Lien externe sur lequel on accepte d'envoyer quelqu'un.
 *
 * Une URL de fiche produit finit dans un `href`. Un `javascript:` y devient
 * du code au clic, un `data:` une page que nous n'ecrivons pas. Seuls `http`
 * et `https` passent ; tout le reste rend `null`, et l'appelant n'affiche
 * alors pas de lien du tout plutot qu'un lien mort.
 *
 * `http` n'est tolere que pour une adresse locale : en production, un lien en
 * clair vers une fiche produit n'a aucune raison d'exister.
 *
 * @param {unknown} valeur
 * @returns {string|null} URL absolue normalisee, ou null
 */
export function lienSur(valeur) {
  if (typeof valeur !== 'string' || valeur.trim() === '') return null;
  let url;
  try {
    url = new URL(valeur, typeof location !== 'undefined' ? location.href : 'https://pose-parquet.com');
  } catch {
    return null;
  }
  if (url.protocol === 'https:') return url.href;
  if (url.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) return url.href;
  return null;
}
