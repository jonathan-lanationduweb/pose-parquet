/**
 * Allure Design : la pose et les travaux, à Paris et en Île-de-France.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS
 * -----------------------------------------------------------------------------
 *
 * Il prend note d'un départ vers allure-design.com, et rien d'autre. Il ne
 * décide pas de l'orientation — c'est `js/forms/lead-context.js` — et il
 * n'ouvre aucun lien à la place de la personne.
 *
 * Le pendant de `js/commerce/premibel.js`, avec une différence qui compte :
 * Premibel a des fiches produit, une par référence, et le lien se déduit de
 * la donnée du catalogue. Allure Design n'a pas de catalogue ici : il y a un
 * site, et une page de devis. Les deux adresses sont donc écrites, une fois.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI SI PEU DE LIENS SORTANTS
 * -----------------------------------------------------------------------------
 *
 * Un visiteur envoyé directement sur un formulaire de devis extérieur est un
 * lead perdu pour Pose-Parquet : on ne sait plus ce qu'il cherchait, d'où il
 * venait, ni ce qu'il est devenu. Le parcours privilégie donc
 * `/projet/`, qui qualifie, mesure, et oriente ensuite en connaissance de
 * cause.
 *
 * Le lien direct reste utile à un seul endroit : la page qui explique les
 * relations commerciales. Quelqu'un qui lit « Allure Design, pose et
 * rénovation en Île-de-France » a le droit d'aller vérifier par lui-même, et
 * l'en empêcher serait le contraire de la transparence qu'on affiche.
 */

import { emettre } from '../analytics/events.js';

/** Le site, tel qu'il est publié. */
export const SITE = 'https://www.allure-design.com/';

/**
 * La page de devis.
 *
 * Écrite ici pour être trouvable, et volontairement pas utilisée dans le
 * parcours : c'est `/projet/` qui doit recueillir la demande. Le jour où un
 * contexte justifie d'y envoyer directement, l'adresse est là et le clic sera
 * suivi comme les autres.
 */
export const DEVIS = 'https://www.allure-design.com/demander-un-devis/';

/** Le domaine, pour reconnaître un lien sortant sans se fier à son libellé. */
const HOTE = 'allure-design.com';

/**
 * La zone d'intervention annoncée, en toutes lettres.
 *
 * Reprise du site officiel : Paris et l'Île-de-France. Elle n'est pas
 * élargie ici, et ne doit pas l'être sans que le site l'annonce — promettre
 * un déplacement à quelqu'un revient à le lui devoir.
 */
export const ZONE = 'Paris et Île-de-France';

/** Ce lien part-il vers Allure Design ? */
export function estLienAllure(href) {
  if (typeof href !== 'string' || !href) return false;
  try {
    return new URL(href, location.href).hostname.toLowerCase().endsWith(HOTE);
  } catch {
    return false;
  }
}

/**
 * Prend note du départ.
 *
 * L'événement reste dans le navigateur — voir `js/analytics/events.js`. Il ne
 * porte que du contexte de parcours : la page, l'origine de la visite, le
 * besoin et la région s'ils sont connus. Aucun nom, aucune adresse, aucun
 * téléphone, aucune photo.
 *
 * @param {object} [contexte]
 * @param {string} [contexte.source] famille de la page d'entrée
 * @param {string} [contexte.besoin] valeur de `LEAD_NEEDS`, si elle est connue
 * @param {string} [contexte.region] région du projet, si elle est connue
 */
export function suivreClic({ source, besoin, region } = {}) {
  emettre('click_allure_design', {
    source: source || '',
    besoin: besoin || '',
    region: region || '',
  });
}

/**
 * Branche l'écoute sur la page entière, une fois.
 *
 * Par délégation, et sans `preventDefault` : le lien suit son cours normal —
 * nouvel onglet, clic milieu, ouverture au clavier — on ne fait qu'en prendre
 * note au passage. Un lien ajouté plus tard dans la page est couvert sans
 * qu'on ait à y penser.
 *
 * @param {object} [contexte] ce qu'on sait du parcours au moment du branchement
 */
export function brancherLiens(contexte = {}) {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'click',
    (evenement) => {
      const lien = evenement.target && evenement.target.closest && evenement.target.closest('a[href]');
      // `data-suivi` : le lien mesure lui-même son clic, avec un contexte plus
      // riche (écran d'orientation du projet). On ne le compte pas deux fois.
      if (lien && !lien.hasAttribute('data-suivi') && estLienAllure(lien.getAttribute('href'))) suivreClic(contexte);
    },
    // En phase de capture : un composant qui arrêterait la propagation plus
    // bas ne doit pas faire disparaître la mesure d'un clic bien réel.
    true
  );
}

export default { SITE, DEVIS, ZONE, estLienAllure, suivreClic, brancherLiens };
