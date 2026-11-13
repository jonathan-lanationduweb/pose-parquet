import { lienSur } from '../utils/dom.js';


export const HOTES_PREMIBEL = new Set(['premibel.fr', 'www.premibel.fr']);



export function urlPremibel(valeur) {
  const sure = lienSur(valeur);
  if (!sure) return null;
  let url;
  try {
    url = new URL(sure);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return HOTES_PREMIBEL.has(url.hostname.toLowerCase()) ? url.href : null;
}
