import { emettre } from '../analytics/events.js';
import { estIdf } from './departements.js';







export const LEAD_SOURCES = [
  'accueil',
  'guide',
  'motif',
  'tutoriel',
  'inspiration',
  'visualiseur',
  'mode-plan',
  'outils',
  'projet',
  'contact',
  'a-propos',
  'autre',
];

const SOURCES = new Set(LEAD_SOURCES);



export function sourceDepuisChemin(chemin) {
  const brut = String(chemin || '').toLowerCase();



  const p = brut.replace(/index\.html$/, '');

  if (p === '' || p === '/') return 'accueil';

  if (p.includes('/guides/')) return 'guide';
  if (p.includes('/motifs/')) return 'motif';
  if (p.includes('/tutoriels/')) return 'tutoriel';
  if (p.includes('/inspiration/')) return 'inspiration';
  if (p.includes('simulateur-pose')) return 'mode-plan';
  if (p.includes('studio') || p.includes('visualiseur')) return 'visualiseur';
  if (p.includes('/outils/')) return 'outils';
  if (p.includes('/projet/')) return 'projet';
  if (p.includes('/contact/')) return 'contact';
  if (p.includes('/a-propos/')) return 'a-propos';

  return 'autre';
}






export const UTM = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
};


export const MAX_UTM = 100;





const CLE = 'pose-parquet:lead';


const MAX_CHEMIN = 500;



function lire() {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const objet = JSON.parse(brut);
    return objet && typeof objet === 'object' ? objet : null;
  } catch {
    return null;
  }
}

function ecrire(contexte) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(contexte));
  } catch {

  }
}



export function ouvrirVisite(emplacement) {
  const lieu = emplacement || (typeof location !== 'undefined' ? location : { pathname: '/', search: '' });
  const params = new URLSearchParams(lieu.search || '');

  const existant = lire();
  const contexte = existant || {
    entryPage: String(lieu.pathname || '/').slice(0, MAX_CHEMIN),
    leadSource: sourceDepuisChemin(lieu.pathname),
    utm: {},
  };

  for (const [nomUrl, nomApi] of Object.entries(UTM)) {
    const valeur = (params.get(nomUrl) || '').trim();
    if (valeur) contexte.utm[nomApi] = valeur.slice(0, MAX_UTM);
  }

  ecrire(contexte);
  return contexte;
}



export function contexteVisite() {
  return lire() || { entryPage: null, leadSource: null, utm: {} };
}







export const LEAD_NEEDS = ['produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine'];

const NEEDS = new Set(LEAD_NEEDS);



export function besoinRecommande({ besoin, produitIdentifie, timeframe, surface } = {}) {
  if (NEEDS.has(besoin) && besoin !== 'indetermine') return besoin;



  if (timeframe === 'renseignement') return 'renseignement';
  if (besoin === 'indetermine') return 'indetermine';

  if (produitIdentifie) return 'produit';
  if (timeframe && Number(surface) > 0) return 'produit-pose';
  return 'indetermine';
}







export function dansZoneIdf({ department } = {}) {
  return estIdf(department);
}







export const LEAD_DESTINATIONS = ['premibel', 'allure_design', 'mixed', 'undetermined'];



export function destinationRecommandee({ besoin, idf } = {}) {
  switch (besoin) {

    case 'produit':
      return 'premibel';

    case 'pose':
    case 'renovation':
      return idf ? 'allure_design' : 'undetermined';



    case 'produit-pose':
      return idf ? 'mixed' : 'premibel';

    default:
      return 'undetermined';
  }
}







export function champsQualification({ besoin, produitPremibel, timeframe, surface, department } = {}) {
  const contexte = contexteVisite();
  const retenu = besoinRecommande({ besoin, produitIdentifie: produitPremibel, timeframe, surface });
  const idf = dansZoneIdf({ department });

  const champs = {
    leadNeed: retenu,
    leadDestination: destinationRecommandee({ besoin: retenu, idf }),
  };

  if (contexte.leadSource && SOURCES.has(contexte.leadSource)) champs.leadSource = contexte.leadSource;
  if (contexte.entryPage) champs.entryPage = contexte.entryPage;
  for (const [cle, valeur] of Object.entries(contexte.utm || {})) {
    if (valeur) champs[cle] = String(valeur).slice(0, MAX_UTM);
  }

  return champs;
}



export function initContexteLead() {
  const contexte = ouvrirVisite();
  const ici = sourceDepuisChemin(typeof location !== 'undefined' ? location.pathname : '/');
  if (ici === 'visualiseur') emettre('open_visualizer', { source: contexte.leadSource || 'direct' });
  return contexte;
}

export default {
  LEAD_SOURCES,
  LEAD_NEEDS,
  LEAD_DESTINATIONS,
  UTM,
  MAX_UTM,
  dansZoneIdf,
  sourceDepuisChemin,
  ouvrirVisite,
  contexteVisite,
  besoinRecommande,
  destinationRecommandee,
  champsQualification,
  initContexteLead,
};
