/**
 * Les événements du parcours, enregistrés dans le navigateur et nulle part ailleurs.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CE MODULE NE FAIT PAS
 * -----------------------------------------------------------------------------
 *
 * Il n'envoie rien. Aucune requête, aucun pixel, aucun script tiers, aucun
 * cookie. Ce n'est pas une précaution provisoire en attendant de brancher un
 * fournisseur : c'est le contrat du module. Le jour où un outil de mesure sera
 * choisi, il s'abonnera par `surEvenement()` et ce fichier n'aura pas à
 * changer — c'est précisément pourquoi le bus existe avant le fournisseur, et
 * pas l'inverse.
 *
 * Tant que personne ne s'abonne, les événements vivent dans un tampon en
 * mémoire et disparaissent avec l'onglet.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI UNE LISTE FERMÉE
 * -----------------------------------------------------------------------------
 *
 * `emettre('slect_product')` avec une faute de frappe créerait une métrique
 * fantôme : elle compterait, elle serait vide, et personne ne s'en
 * apercevrait avant d'avoir cherché pendant une heure pourquoi les chiffres ne
 * tombent pas juste. Un nom inconnu est donc refusé, bruyamment en
 * développement et silencieusement en production.
 *
 * -----------------------------------------------------------------------------
 * CE QUI NE DOIT JAMAIS ENTRER DANS UN ÉVÉNEMENT
 * -----------------------------------------------------------------------------
 *
 * La photographie importée dans le Studio, sous quelque forme que ce soit. Un
 * nom, un prénom, une adresse électronique, un téléphone. Le contenu du champ
 * message. Les événements décrivent des GESTES — un produit regardé, un motif
 * choisi, un lien suivi — pas des personnes.
 */

import { avertir } from '../utils/diagnostic.js';

/**
 * Les événements que le parcours sait produire.
 *
 * Les noms sont en anglais et en snake_case parce qu'ils sont destinés à être
 * lus par un outil de mesure, et que c'est la convention qu'ils emploient
 * tous. Le reste du module parle français, comme le reste du dépôt.
 */
export const EVENEMENTS = [
  'view_product',
  'open_visualizer',
  'select_product',
  'select_pattern',
  'click_premibel',
  'click_allure_design',
  'start_project',
  'submit_project',
];

const CONNUS = new Set(EVENEMENTS);

/**
 * Combien d'événements on garde.
 *
 * Assez pour relire un parcours entier pendant une recette — ouvrir le Studio,
 * essayer huit parquets, comparer, partir vers le formulaire — et assez peu
 * pour qu'une session très longue ne fasse pas grossir la mémoire sans fin.
 */
const TAILLE_TAMPON = 200;

/** Longueur maximale d'une valeur de détail. Au-delà, ce n'est plus un repère. */
const MAX_VALEUR = 120;

const tampon = [];
const abonnes = new Set();

/**
 * Ne garde d'un détail que ce qui est court, plat et lisible.
 *
 * Un objet imbriqué, un tableau, un blob, un canvas : rien de tout cela n'a de
 * sens dans un événement, et tout cela est un moyen de faire voyager sans le
 * vouloir quelque chose qui ne devait pas voyager. On accepte des chaînes, des
 * nombres et des booléens, un seul niveau de profondeur.
 */
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
    // Tout le reste est écarté sans bruit : un objet passé ici est une erreur
    // d'appel, pas une donnée, et le signaler à l'utilisateur ne servirait à rien.
  }
  return out;
}

/**
 * Émet un événement.
 *
 * Ne lève jamais : un abonné défaillant ou un appel malformé ne doit pas
 * casser la page qui l'entoure. Mesurer un parcours ne vaut pas de
 * l'interrompre.
 *
 * @param {string} nom un nom de `EVENEMENTS`
 * @param {object} [details] repères courts : identifiants, motifs, chemins
 * @returns {boolean} faux si le nom est inconnu
 */
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
      /* Un abonné qui échoue n'empêche pas les autres d'être servis. */
    }
  }

  return true;
}

/**
 * S'abonne aux événements. Rend la fonction de désabonnement.
 *
 * L'abonné reçoit d'abord ce qui s'est déjà produit : un outil branché après
 * le chargement de la page ne perd pas l'ouverture du Studio.
 *
 * @param {(evenement: object) => void} rappel
 * @returns {() => void}
 */
export function surEvenement(rappel) {
  if (typeof rappel !== 'function') return () => {};
  for (const passe of tampon) {
    try {
      rappel(passe);
    } catch {
      /* idem */
    }
  }
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** Copie du tampon, pour la recette. Jamais la référence : personne ne le modifie. */
export function evenements() {
  return tampon.slice();
}

export default { EVENEMENTS, emettre, surEvenement, evenements };
