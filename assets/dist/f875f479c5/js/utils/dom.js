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


export function mountAll(selector, factory, scope = document) {
  return qsa(selector, scope).map((el) => factory(el));
}




export function trapFocus(container, event) {
  const roots = Array.isArray(container) ? container : [container];
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusables = roots
    .flatMap(root => [...(root.matches(selector) ? [root] : []), ...qsa(selector, root)])
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


export function seeded(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}



export const echapper = (valeur) =>
  String(valeur == null ? '' : valeur).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );



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
