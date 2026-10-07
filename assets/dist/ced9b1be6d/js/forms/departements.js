/**
 * Le département dit la région. Une fois, et pour tout le monde.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 * -----------------------------------------------------------------------------
 *
 * Le formulaire demandait trois choses pour un seul fait : une zone
 * (« Île-de-France » ou « ailleurs »), une région, et un département. Rien
 * n'empêchait de répondre « hors Île-de-France » puis « 75 », ni de cocher
 * « Île-de-France » avec un département breton. Trois champs, trois vérités
 * possibles, et une orientation commerciale qui dépendait de celui qu'on
 * décidait de croire.
 *
 * Il n'en reste qu'un. Le département détermine la région, complètement et
 * sans exception, et c'est lui que le visiteur saisit. La zone et la région
 * ne sont plus des questions : ce sont des conséquences.
 *
 * -----------------------------------------------------------------------------
 * LA LISTE DES DÉPARTEMENTS FRANCILIENS N'EST ÉCRITE NULLE PART
 * -----------------------------------------------------------------------------
 *
 * Elle se déduit de la table : sont franciliens les départements dont la
 * région est l'Île-de-France. C'est volontaire — une liste de huit numéros
 * recopiée à côté d'une table qui les contient déjà finit par diverger, et
 * personne ne s'en aperçoit avant qu'un chantier parte au mauvais endroit.
 *
 * -----------------------------------------------------------------------------
 * CETTE TABLE EXISTE AUSSI EN PHP
 * -----------------------------------------------------------------------------
 *
 * `backend/pose-parquet-core/src/Projects/Departements.php` en porte une
 * copie, parce que le serveur doit normaliser la région sans faire confiance
 * au navigateur, et qu'une extension WordPress ne lit pas les fichiers du
 * site statique. `_generator/check-routage.js` compare les deux entrée par
 * entrée et échoue si elles diffèrent d'un seul département.
 *
 * C'est une duplication assumée et surveillée, pas une duplication oubliée.
 */

/**
 * Les libellés de région, tels qu'ils sont stockés et affichés.
 *
 * Ce sont exactement les valeurs de la liste fermée `region` du serveur. Les
 * cinq départements d'outre-mer partagent « Outre-mer » : c'est le découpage
 * qu'emploie déjà la base, et le changer demanderait une migration pour une
 * précision dont personne ne se sert ici.
 */
export const REGIONS = {
  'Auvergne-Rhône-Alpes': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  'Bourgogne-Franche-Comté': ['21', '25', '39', '58', '70', '71', '89', '90'],
  Bretagne: ['22', '29', '35', '56'],
  'Centre-Val de Loire': ['18', '28', '36', '37', '41', '45'],
  Corse: ['2A', '2B'],
  'Grand Est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  'Hauts-de-France': ['02', '59', '60', '62', '80'],
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  Normandie: ['14', '27', '50', '61', '76'],
  'Nouvelle-Aquitaine': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  Occitanie: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'Pays de la Loire': ['44', '49', '53', '72', '85'],
  "Provence-Alpes-Côte d'Azur": ['04', '05', '06', '13', '83', '84'],
  'Outre-mer': ['971', '972', '973', '974', '976'],
};

/** Le libellé exact de l'Île-de-France. Écrit une fois, comparé partout. */
export const ILE_DE_FRANCE = 'Île-de-France';

/** Table inverse : département → région. Construite, jamais recopiée. */
const PAR_DEPARTEMENT = new Map();
for (const [region, departements] of Object.entries(REGIONS)) {
  for (const departement of departements) PAR_DEPARTEMENT.set(departement, region);
}

/**
 * Met un département saisi sous sa forme canonique.
 *
 * Deux chiffres pour la métropole, trois pour l'outre-mer, et la Corse en
 * majuscules. Quelqu'un qui tape « 2a », « 6 » ou «  75  » a répondu
 * correctement : c'est la saisie qu'on normalise, pas la personne qu'on
 * corrige.
 *
 * `6` devient `06` — un département à un chiffre n'existe pas dans la
 * nomenclature, et le zéro initial se perd facilement quand la valeur passe
 * par un tableur ou un champ numérique.
 *
 * @param {string|number} valeur
 * @returns {string} forme canonique, ou chaîne vide si rien d'exploitable
 */
export function normaliserDepartement(valeur) {
  const brut = String(valeur == null ? '' : valeur).trim().toUpperCase();
  if (brut === '') return '';
  if (/^[1-9]$/.test(brut)) return `0${brut}`;
  if (/^2[AB]$/.test(brut)) return brut;
  if (/^\d{2,3}$/.test(brut)) return brut;
  return '';
}

/**
 * La région d'un département, ou une chaîne vide.
 *
 * Vide veut dire « on ne sait pas », et surtout pas « métropole par
 * défaut ». Un numéro que la table ne connaît pas — une collectivité
 * d'outre-mer comme 975, une faute de frappe qui tombe juste au format —
 * n'est pas rattaché de force à une région qu'on aurait devinée.
 */
export function regionDe(valeur) {
  return PAR_DEPARTEMENT.get(normaliserDepartement(valeur)) || '';
}

/**
 * Ce département est-il en Île-de-France ?
 *
 * La seule question qui décide de l'éligibilité d'Allure Design. La réponse
 * sort de la table, pas d'une liste tenue à part.
 */
export function estIdf(valeur) {
  return regionDe(valeur) === ILE_DE_FRANCE;
}

/** Le département est-il connu de la nomenclature ? */
export function departementConnu(valeur) {
  return PAR_DEPARTEMENT.has(normaliserDepartement(valeur));
}

/** Les départements franciliens, déduits — jamais écrits à la main. */
export const DEPARTEMENTS_IDF = REGIONS[ILE_DE_FRANCE];

/** Tous les départements connus, pour les contrôles. */
export const TOUS = [...PAR_DEPARTEMENT.keys()];

export default {
  REGIONS,
  ILE_DE_FRANCE,
  DEPARTEMENTS_IDF,
  TOUS,
  normaliserDepartement,
  regionDe,
  estIdf,
  departementConnu,
};
