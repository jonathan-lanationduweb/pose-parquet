import { avertir } from '../utils/diagnostic.js';



export const EVENEMENTS = [
  'view_product',
  'open_visualizer',
  'select_product',
  'select_pattern',
  'click_premibel',
  'click_allure_design',
  'start_project',
  'submit_project',


  'view_orientation',
];

const CONNUS = new Set(EVENEMENTS);



const TAILLE_TAMPON = 200;


const MAX_VALEUR = 120;

const tampon = [];
const abonnes = new Set();



function detailsPropres(details) {
  if (!details || typeof details !== 'object') return {};
  const out = {};
  for (const [cle, brute] of Object.entries(details)) {
    if (brute === null || brute === undefined) continue;
    if (typeof brute === 'number' && Number.isFinite(brute)) out[cle] = brute;
    else if (typeof brute === 'boolean') out[cle] = brute;
    else if (typeof brute === 'string') {
      const v = brute.trim();
      if (v) out[cle] = v.slice(0, MAX_VALEUR);
    }


  }
  return out;
}



export function emettre(nom, details) {
  if (!CONNUS.has(nom)) {
    avertir(`[events] événement inconnu : ${nom}. Les noms admis sont dans js/analytics/events.js.`);
    return false;
  }

  const evenement = {
    nom,
    at: Date.now(),
    page: typeof location !== 'undefined' ? location.pathname : '',
    ...detailsPropres(details),
  };

  tampon.push(evenement);
  if (tampon.length > TAILLE_TAMPON) tampon.shift();

  for (const abonne of abonnes) {
    try {
      abonne(evenement);
    } catch {

    }
  }

  return true;
}



export function surEvenement(rappel) {
  if (typeof rappel !== 'function') return () => {};
  for (const passe of tampon) {
    try {
      rappel(passe);
    } catch {

    }
  }
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}


export function evenements() {
  return tampon.slice();
}

export default { EVENEMENTS, emettre, surEvenement, evenements };
