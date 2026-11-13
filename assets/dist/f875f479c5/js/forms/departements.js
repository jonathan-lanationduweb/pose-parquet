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


export const ILE_DE_FRANCE = 'Île-de-France';


const PAR_DEPARTEMENT = new Map();
for (const [region, departements] of Object.entries(REGIONS)) {
  for (const departement of departements) PAR_DEPARTEMENT.set(departement, region);
}



export function normaliserDepartement(valeur) {
  const brut = String(valeur == null ? '' : valeur).trim().toUpperCase();
  if (brut === '') return '';
  if (/^[1-9]$/.test(brut)) return `0${brut}`;
  if (/^2[AB]$/.test(brut)) return brut;
  if (/^\d{2,3}$/.test(brut)) return brut;
  return '';
}



export function regionDe(valeur) {
  return PAR_DEPARTEMENT.get(normaliserDepartement(valeur)) || '';
}



export function estIdf(valeur) {
  return regionDe(valeur) === ILE_DE_FRANCE;
}


export function departementConnu(valeur) {
  return PAR_DEPARTEMENT.has(normaliserDepartement(valeur));
}


export const DEPARTEMENTS_IDF = REGIONS[ILE_DE_FRANCE];


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
