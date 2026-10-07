/**
 * Les adresses que le site accepte d'attribuer à Premibel.
 *
 * Une seule définition, partagée par le navigateur (`premibel.js`, qui écrit
 * « Voir ce parquet chez Premibel » sur un bouton) et par la synchronisation
 * du catalogue (`_generator/sync-premibel.js`, qui décide quelles adresses
 * entrent dans `data/products.premibel.json`). Deux listes divergeraient : la
 * synchronisation garderait une adresse que le bouton refuserait d'étiqueter,
 * ou l'inverse.
 *
 * Aucune dépendance au DOM : ce module se charge aussi bien depuis Node.
 */
import { lienSur } from '../utils/dom.js';

/** Les domaines officiels. Un sous-domaine n'entre ici qu'après vérification. */
export const HOTES_PREMIBEL = new Set(['premibel.fr', 'www.premibel.fr']);

/**
 * L'adresse si elle est sûre ET officiellement Premibel, sinon `null`.
 *
 * Sûre : HTTPS, via `lienSur` (le même filtre que toutes les URL de fiche).
 * Officielle : son hôte est dans `HOTES_PREMIBEL`.
 *
 * @param {unknown} valeur
 * @returns {string|null}
 */
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
