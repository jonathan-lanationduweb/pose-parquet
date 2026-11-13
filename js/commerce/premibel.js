import { emettre } from '../analytics/events.js';


import { HOTES_PREMIBEL } from './premibel-hotes.js';



export function ficheProduit(material) {
  const url = material && material.productUrl;
  if (typeof url !== 'string' || !url) return null;

  let hote = '';
  try {
    hote = new URL(url).hostname.toLowerCase();
  } catch {

    return null;
  }

  const premibel = HOTES_PREMIBEL.has(hote);
  return {
    url,
    premibel,
    libelle: premibel ? 'Voir ce parquet chez Premibel' : 'Voir la fiche du produit',
  };
}


export const aUneFiche = (material) => ficheProduit(material) !== null;



export const ATTRIBUTS_LIEN = 'target="_blank" rel="noopener"';



export function suivreClic(material, contexte) {
  const fiche = ficheProduit(material);
  if (!fiche) return;
  emettre(fiche.premibel ? 'click_premibel' : 'view_product', {
    productId: (material && material.id) || '',
    sku: (material && material.sku) || '',
    contexte: contexte || '',
  });
}



export function estReferencePremibel(material) {
  const fiche = ficheProduit(material);
  return Boolean(fiche && fiche.premibel && material && material.source === 'premibel');
}

export default { ficheProduit, aUneFiche, estReferencePremibel, suivreClic, ATTRIBUTS_LIEN };
