import { emettre } from '../analytics/events.js';


export const SITE = 'https://www.allure-design.com/';



export const DEVIS = 'https://www.allure-design.com/demander-un-devis/';


const HOTE = 'allure-design.com';



export const ZONE = 'Paris et Île-de-France';


export function estLienAllure(href) {
  if (typeof href !== 'string' || !href) return false;
  try {
    return new URL(href, location.href).hostname.toLowerCase().endsWith(HOTE);
  } catch {
    return false;
  }
}



export function suivreClic({ source, besoin, region } = {}) {
  emettre('click_allure_design', {
    source: source || '',
    besoin: besoin || '',
    region: region || '',
  });
}



export function brancherLiens(contexte = {}) {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'click',
    (evenement) => {
      const lien = evenement.target && evenement.target.closest && evenement.target.closest('a[href]');


      if (lien && !lien.hasAttribute('data-suivi') && estLienAllure(lien.getAttribute('href'))) suivreClic(contexte);
    },


    true
  );
}

export default { SITE, DEVIS, ZONE, estLienAllure, suivreClic, brancherLiens };
