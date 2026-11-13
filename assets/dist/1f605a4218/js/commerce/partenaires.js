import { apiUrl } from '../forms/api-config.js';

const DELAI_MS = 4000;


export const DOMAINES = {
  premibel: ['premibel.fr'],
  allure: ['allure-design.com'],
};

const OUVERT = Object.freeze({ premibel: true, allure: true });

let promesse = null;


export function etatPartenaires() {
  if (promesse) return promesse;
  const url = apiUrl('/partenaires');
  if (!url || typeof fetch !== 'function') {
    promesse = Promise.resolve(OUVERT);
    return promesse;
  }
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const minuteur = ctrl ? setTimeout(() => ctrl.abort(), DELAI_MS) : null;
  promesse = fetch(url, { credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => ({

      premibel: !(d && d.premibel === false),
      allure: !(d && d.allure === false),
    }))
    .catch(() => OUVERT)
    .finally(() => minuteur && clearTimeout(minuteur));
  return promesse;
}


export function partenaireDe(href) {
  let hote = '';
  try {
    hote = new URL(href, window.location.href).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [cle, domaines] of Object.entries(DOMAINES)) {
    if (domaines.some((d) => hote === d || hote.endsWith(`.${d}`))) return cle;
  }
  return null;
}



export async function surveillerPartenaires() {
  const etat = await etatPartenaires();
  const racine = document.documentElement;
  racine.toggleAttribute('data-premibel-indisponible', !etat.premibel);
  racine.toggleAttribute('data-allure-indisponible', !etat.allure);
  if (etat.premibel && etat.allure) return etat;
  document.addEventListener(
    'click',
    (e) => {
      const lien = e.target instanceof Element ? e.target.closest('a[href]') : null;
      const cle = lien && partenaireDe(lien.getAttribute('href'));
      if (cle && !etat[cle]) e.preventDefault();
    },
    true
  );
  return etat;
}
