/**
 * Les sites partenaires sont-ils en ligne ?
 *
 * WordPress contrôle Premibel et Allure Design toutes les quinze minutes
 * (backend : src/Partenaires/Surveillance.php) et publie le résultat en
 * lecture seule sur GET /pose-parquet/v1/partenaires :
 *   { "premibel": true, "allure": false, "verifie": "…" }
 *
 * Un partenaire indisponible (panne, erreur serveur, maintenance) n'est plus
 * proposé : un attribut sur <html> masque, par CSS, tous les liens vers son
 * domaine — y compris ceux qu'un composant ajoute plus tard — et le
 * formulaire « Mon projet » ne l'inclut plus dans l'orientation.
 *
 * Ouvert par défaut : sans backend configuré, sans réponse en quelques
 * secondes ou devant une réponse illisible, les partenaires restent
 * proposés. Une panne de NOTRE serveur ne doit pas cacher les leurs.
 *
 * Rien n'est stocké dans le navigateur : la réponse est mise en cache une
 * minute par HTTP, et une seule requête part par page.
 */
import { apiUrl } from '../forms/api-config.js';

const DELAI_MS = 4000;

/** Domaines de chaque partenaire, pour le marquage et le garde-fou au clic. */
export const DOMAINES = {
  premibel: ['premibel.fr'],
  allure: ['allure-design.com'],
};

const OUVERT = Object.freeze({ premibel: true, allure: true });

let promesse = null;

/** Lit l'état une fois par page. Ne rejette jamais. */
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
      // Seul un `false` explicite retire un partenaire.
      premibel: !(d && d.premibel === false),
      allure: !(d && d.allure === false),
    }))
    .catch(() => OUVERT)
    .finally(() => minuteur && clearTimeout(minuteur));
  return promesse;
}

/** Le partenaire d'une adresse, ou null. */
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

/**
 * Applique l'état à la page : attributs sur <html> (le CSS masque les liens)
 * et garde-fou au clic pour un lien qui échapperait au sélecteur.
 */
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
