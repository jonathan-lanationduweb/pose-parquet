/**
 * Quand, et seulement quand, on peut proposer la fiche produit d'un parquet.
 *
 * -----------------------------------------------------------------------------
 * LA RÈGLE
 * -----------------------------------------------------------------------------
 *
 * Un lien commercial n'existe que si la donnée le porte. `productUrl` est relu
 * dans `js/scene/product.js` par `lienSur()`, qui refuse tout ce qui n'est pas
 * une adresse https : une référence sans fiche vaut `null`, et `null` veut dire
 * pas de bouton. Jamais une adresse devinée à partir d'un identifiant, jamais
 * une recherche sur le nom du produit, jamais un lien vers l'accueil d'un
 * marchand « à défaut ».
 *
 * Les douze références de démonstration n'ont pas de fiche : elles ne
 * correspondent à aucun produit commercial. Elles n'auront donc pas de bouton,
 * et c'est le comportement voulu — proposer d'acheter ce qui n'existe pas
 * serait la pire chose que ce module puisse faire.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI ON VÉRIFIE LE DOMAINE
 * -----------------------------------------------------------------------------
 *
 * Le libellé du bouton nomme une entreprise. « Voir ce parquet chez Premibel »
 * est une affirmation : elle doit être vraie. Le catalogue est un fichier de
 * données, et le jour où il viendra d'un export fournisseur, rien ne garantit
 * que toutes les fiches soient hébergées au même endroit. On lit donc le
 * domaine, et une adresse qui n'est pas celle de Premibel obtient un libellé
 * neutre au lieu d'un nom emprunté.
 */

import { emettre } from '../analytics/events.js';

/** Les domaines qui autorisent à écrire le nom de Premibel sur un bouton. */
const HOTES_PREMIBEL = new Set(['premibel.fr', 'www.premibel.fr']);

/**
 * La fiche commerciale d'un matériau, ou `null`.
 *
 * @param {object} material fiche normalisée, telle que `js/scene/product.js` la rend
 * @returns {{url: string, premibel: boolean, libelle: string}|null}
 */
export function ficheProduit(material) {
  const url = material && material.productUrl;
  if (typeof url !== 'string' || !url) return null;

  let hote = '';
  try {
    hote = new URL(url).hostname.toLowerCase();
  } catch {
    // `lienSur` a déjà écarté ce cas ; on ne s'appuie pas dessus pour autant.
    return null;
  }

  const premibel = HOTES_PREMIBEL.has(hote);
  return {
    url,
    premibel,
    libelle: premibel ? 'Voir ce parquet chez Premibel' : 'Voir la fiche du produit',
  };
}

/** Raccourci lisible : cette référence a-t-elle une fiche à montrer ? */
export const aUneFiche = (material) => ficheProduit(material) !== null;

/**
 * Les attributs d'un lien sortant vers une fiche.
 *
 * `rel="noopener"` parce que le lien s'ouvre dans un onglet neuf et que la page
 * ouverte n'a aucune raison de pouvoir piloter la nôtre. Pas de `nofollow` :
 * le lien est éditorialement assumé, il pointe vers la fiche du produit qu'on
 * vient de montrer au visiteur, et le masquer aux moteurs reviendrait à dire
 * qu'on le cache.
 */
export const ATTRIBUTS_LIEN = 'target="_blank" rel="noopener"';

/**
 * Enregistre le clic. À appeler au moment du clic, pas à l'affichage.
 *
 * L'événement reste dans le navigateur — voir `js/analytics/events.js`. Il ne
 * porte que l'identifiant de la référence et le contexte : ni nom, ni adresse,
 * ni photo.
 *
 * @param {object} material
 * @param {string} contexte d'où part le clic — `studio`, `produit`, `motif`…
 */
export function suivreClic(material, contexte) {
  const fiche = ficheProduit(material);
  if (!fiche) return;
  emettre(fiche.premibel ? 'click_premibel' : 'view_product', {
    productId: (material && material.id) || '',
    contexte: contexte || '',
  });
}

/**
 * Cette référence vient-elle bien du catalogue Premibel, fiche à l'appui ?
 *
 * C'est le seul signal que `destinationRecommandee()` accepte aujourd'hui pour
 * orienter un lead. Il exige les deux : la provenance déclarée ET une fiche
 * réelle. Une des deux seules ne suffit pas — l'une sans l'autre décrirait un
 * produit qu'on ne saurait pas montrer.
 */
export function estReferencePremibel(material) {
  const fiche = ficheProduit(material);
  return Boolean(fiche && fiche.premibel && material && material.source === 'premibel');
}

export default { ficheProduit, aUneFiche, estReferencePremibel, suivreClic, ATTRIBUTS_LIEN };
