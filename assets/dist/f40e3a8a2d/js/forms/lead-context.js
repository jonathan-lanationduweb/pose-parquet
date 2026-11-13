/**
 * D'où vient le visiteur, ce qu'il cherche, et vers qui l'orienter.
 *
 * Une seule fois, pour toutes les pages. Le Studio, le Mode Plan, les guides
 * et le formulaire lisent et écrivent le même contexte ; c'est ce qui permet à
 * une demande envoyée depuis `/projet/` de savoir que la visite a commencé sur
 * un guide trois clics plus tôt.
 *
 * -----------------------------------------------------------------------------
 * CE QUI EST MÉMORISÉ, ET OÙ
 * -----------------------------------------------------------------------------
 *
 * `sessionStorage`, donc : le temps d'une visite, dans cet onglet, jamais
 * partagé, effacé à la fermeture. Pas de cookie, pas de `localStorage`, rien
 * qui suive quelqu'un d'un jour à l'autre. Trois choses seulement :
 *
 *   la page d'entrée      le premier chemin de la visite
 *   l'origine             la famille éditoriale de cette page
 *   les UTM               ce que la campagne a écrit dans l'URL d'arrivée
 *
 * Aucun nom, aucune adresse, aucun identifiant de personne. Aucune photo — ni
 * ici, ni ailleurs, jamais.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI « PREMIÈRE PAGE » ET PAS « PAGE DU FORMULAIRE »
 * -----------------------------------------------------------------------------
 *
 * `sourceUrl` dit déjà depuis quelle page la demande a été envoyée — et c'est
 * presque toujours `/projet/`, ce qui n'apprend rien. La page d'entrée dit
 * quel contenu a fait venir la personne. Les deux se complètent : l'une ferme
 * le parcours, l'autre l'ouvre.
 *
 * -----------------------------------------------------------------------------
 * ORIGINE ET CANAL D'ACQUISITION
 * -----------------------------------------------------------------------------
 *
 * `leadSource` décrit la FAMILLE ÉDITORIALE de la page d'entrée, pas le canal.
 * Une même fiche motif peut être atteinte par une recherche Google, par une
 * campagne, ou par un lien depuis un autre site : la page est la même, le
 * canal non. Écrire « seo-motif » dans un seul champ reviendrait à deviner.
 *
 * La réponse se lit donc à deux champs : `leadSource` dit QUOI, les `utm_*`
 * disent PAR OÙ. Une entrée sur un guide sans aucun UTM est du référencement
 * naturel ou un lien direct ; la même entrée avec `utm_medium=cpc` est une
 * campagne. Aucune des deux n'a été inventée.
 */

import { emettre } from '../analytics/events.js';
import { estIdf } from './departements.js';

/* ------------------------------------------------------------------ */
/* Origine                                                             */
/* ------------------------------------------------------------------ */

/**
 * Familles de pages d'entrée. Liste fermée : le serveur applique la même.
 */
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

/**
 * La famille éditoriale d'un chemin.
 *
 * Les deux pages d'outils sont distinguées à dessein : « j'ai posé un parquet
 * sur ma photo » et « j'ai calculé un calepinage » ne sont pas la même
 * intention, et la suite du parcours ne devrait pas leur proposer la même
 * chose.
 *
 * @param {string} chemin un `location.pathname`
 * @returns {string} une valeur de `LEAD_SOURCES`
 */
export function sourceDepuisChemin(chemin) {
  const brut = String(chemin || '').toLowerCase();
  // `/guides/index.html` et `/guides/` sont la même page : on retire le nom de
  // fichier d'index avant de comparer, pour que les deux formes se rangent
  // ensemble. Un serveur statique sert l'une, un lien interne écrit l'autre.
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

/* ------------------------------------------------------------------ */
/* UTM                                                                 */
/* ------------------------------------------------------------------ */

/** Les cinq paramètres de campagne, et leur nom dans la charge de l'API. */
export const UTM = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
};

/** Le serveur applique la même limite. Au-delà, ce n'est plus une campagne. */
export const MAX_UTM = 100;

/* ------------------------------------------------------------------ */
/* Mémoire de visite                                                   */
/* ------------------------------------------------------------------ */

const CLE = 'pose-parquet:lead';

/** Longueur maximale d'un chemin mémorisé. La colonne en fait 500. */
const MAX_CHEMIN = 500;

/**
 * Lit la mémoire de visite.
 *
 * `sessionStorage` peut lever — navigation privée, stockage bloqué, page
 * ouverte dans un contexte restreint. Un contexte absent n'est pas une panne :
 * la demande part sans son origine, ce qui est moins bien mais parfaitement
 * fonctionnel.
 */
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
    /* Rien à faire, et rien de grave. Voir `lire`. */
  }
}

/**
 * Enregistre le début de la visite, si ce n'est pas déjà fait.
 *
 * Appelée au chargement de CHAQUE page. Elle n'écrit qu'une fois : la page
 * d'entrée est la première, pas la dernière, et une visite qui passe par six
 * pages ne doit pas finir par prétendre avoir commencé sur le formulaire.
 *
 * Les UTM font exception et sont mis à jour s'ils arrivent plus tard : un
 * visiteur peut revenir par une campagne au milieu d'une visite déjà
 * commencée, et c'est alors la campagne qui a produit la conversion.
 *
 * @param {Location|{pathname: string, search: string}} [emplacement]
 * @returns {object} le contexte de visite
 */
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

/**
 * Le contexte de visite, sans rien écrire.
 *
 * Rend un contexte vide plutôt que `null` : les appelants composent une charge
 * et n'ont pas à distinguer « pas de contexte » de « contexte sans UTM ».
 */
export function contexteVisite() {
  return lire() || { entryPage: null, leadSource: null, utm: {} };
}

/* ------------------------------------------------------------------ */
/* Besoin                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ce que le visiteur cherche.
 *
 * Six valeurs, et cette fois elles nomment des choses que quelqu'un sait
 * faire. La version precedente en comptait quatre, volontairement neutres :
 * le perimetre d'Allure Design n'etait pas etabli, et nommer un besoin que
 * personne ne s'etait engage a servir aurait ete une promesse en l'air.
 *
 * Il l'est desormais — pose, revetements de sol, renovation interieure,
 * amenagement, second oeuvre — et le vocabulaire peut enfin distinguer ce
 * qu'il faut distinguer : acheter, faire poser, les deux, renover.
 *
 *   produit        trouver un parquet
 *   pose           faire poser un parquet qu'on a deja, ou qu'on trouvera
 *   produit-pose   les deux, et c'est le cas le plus frequent
 *   renovation     un chantier plus large que le sol
 *   renseignement  se documente, sans projet date
 *   indetermine    ne sait pas encore, ou n'a rien dit
 *
 * `renseignement` et `indetermine` ne disent pas la meme chose. Le premier
 * est une reponse — « je me renseigne » — et se traite avec patience. Le
 * second est une absence, et demande qu'un humain appelle.
 *
 * Aucune migration : `lead_need` est un varchar, seule la liste fermee
 * s'allonge. Trois demandes existaient en base, toutes anterieures au champ.
 */
export const LEAD_NEEDS = ['produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine'];

const NEEDS = new Set(LEAD_NEEDS);

/**
 * Le besoin, a partir de ce qui a ete repondu.
 *
 * La reponse EXPLICITE gagne toujours. Quelqu'un qui regardait une reference
 * Premibel puis coche « faire poser mon parquet » a deja son parquet en
 * tete : deduire « produit » de ce qu'il regardait reviendrait a lui
 * expliquer son propre besoin.
 *
 * Sans reponse explicite — un ancien lien, un formulaire rempli avant ce
 * lot — on retombe sur la deduction precedente, qui vaut mieux que rien.
 *
 * @param {object} signaux
 * @param {string}  [signaux.besoin]           reponse du champ « De quoi avez-vous besoin ? »
 * @param {boolean} [signaux.produitIdentifie] une reference reelle etait ouverte
 * @param {string}  [signaux.timeframe]        `timeframe` du formulaire
 * @param {number}  [signaux.surface]          surface renseignee, en m²
 * @returns {string} une valeur de `LEAD_NEEDS`
 */
export function besoinRecommande({ besoin, produitIdentifie, timeframe, surface } = {}) {
  if (NEEDS.has(besoin) && besoin !== 'indetermine') return besoin;

  /*
   * « Je ne sais pas encore » plus « je me renseigne » : on retient le
   * second, qui est la seule chose que la personne ait affirmee. Avec un
   * delai serre, en revanche, ne pas savoir de quoi on a besoin est
   * precisement ce qu'il faut signaler a un humain.
   */
  if (timeframe === 'renseignement') return 'renseignement';
  if (besoin === 'indetermine') return 'indetermine';

  if (produitIdentifie) return 'produit';
  if (timeframe && Number(surface) > 0) return 'produit-pose';
  return 'indetermine';
}

/* ------------------------------------------------------------------ */
/* Geographie                                                          */
/* ------------------------------------------------------------------ */

/**
 * Le projet est-il dans la zone d'Allure Design ?
 *
 * Une seule donnee repond : le DEPARTEMENT. La table de
 * `js/forms/departements.js` en deduit la region, et sont franciliens les
 * departements dont la region est l'Ile-de-France. La liste des huit numeros
 * n'est ecrite nulle part — elle se lit dans la table.
 *
 * Le formulaire demandait auparavant une zone, une region ET un departement
 * pour un seul fait. Rien n'empechait de repondre « hors Ile-de-France » puis
 * « 75 », et l'orientation dependait alors de celui des trois champs qu'on
 * decidait de croire. Les deux premiers ont disparu de la saisie : ce ne sont
 * pas des questions, ce sont des consequences.
 *
 * Un departement absent ou inconnu rend `false` : pas de localisation
 * fiable, donc pas d'orientation automatique vers une entreprise qui a une
 * zone d'intervention. C'est `destinationRecommandee` qui en tire les
 * consequences besoin par besoin.
 *
 * @param {object} lieu
 * @param {string} [lieu.department] numero de departement
 * @returns {boolean}
 */
export function dansZoneIdf({ department } = {}) {
  return estIdf(department);
}

/* ------------------------------------------------------------------ */
/* Destination                                                         */
/* ------------------------------------------------------------------ */

/**
 * Vers qui la demande devrait partir.
 *
 * -----------------------------------------------------------------------------
 * LES TROIS ROLES, ET POURQUOI ILS NE SE MELANGENT PAS
 * -----------------------------------------------------------------------------
 *
 *   Pose-Parquet   fait venir, explique, fait essayer, qualifie
 *   Premibel       le parquet : references, fourniture, showroom
 *   Allure Design  la pose et les travaux, a Paris et en Ile-de-France
 *
 * Une demande qui part au mauvais endroit coute deux fois : le visiteur
 * attend une reponse que personne ne peut lui donner, et l'entreprise recoit
 * un dossier qui n'est pas le sien.
 *
 * -----------------------------------------------------------------------------
 * LA ZONE N'EST PAS UN DETAIL
 * -----------------------------------------------------------------------------
 *
 * Allure Design annonce Paris et l'Ile-de-France. Hors de cette zone, aucun
 * besoin de pose ou de travaux ne part automatiquement vers elle : la demande
 * reste `undetermined`, ce qui veut dire « un humain doit regarder », pas
 * « perdue ». Un besoin de PRODUIT, lui, n'a pas de frontiere : un parquet
 * se livre.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CETTE FONCTION NE FAIT PAS
 * -----------------------------------------------------------------------------
 *
 * Elle n'envoie rien. Elle RECOMMANDE, la recommandation s'affiche en
 * administration avec sa raison, et un humain confirme ou corrige. Aucun
 * courriel, aucune transmission a un tiers ne depend d'elle.
 */
export const LEAD_DESTINATIONS = ['premibel', 'allure_design', 'mixed', 'undetermined'];

/**
 * @param {object} signaux
 * @param {string}  [signaux.besoin] valeur de `LEAD_NEEDS`
 * @param {boolean} [signaux.idf]    le projet est en Ile-de-France
 * @returns {string} une valeur de `LEAD_DESTINATIONS`
 */
export function destinationRecommandee({ besoin, idf } = {}) {
  switch (besoin) {
    // Un parquet se livre : la zone ne limite rien.
    case 'produit':
      return 'premibel';

    case 'pose':
    case 'renovation':
      return idf ? 'allure_design' : 'undetermined';

    /*
     * Produit + pose hors Ile-de-France : `premibel`, et non `undetermined`.
     *
     * La moitie de la demande est servable — le parquet se livre partout — et
     * repondre « on ne sait pas » a quelqu'un dont on sait servir la moitie du
     * besoin serait faux et lui ferait perdre son temps. L'administration
     * affiche la raison, qui nomme la moitie non couverte.
     */
    case 'produit-pose':
      return idf ? 'mixed' : 'premibel';

    default:
      return 'undetermined';
  }
}

/* ------------------------------------------------------------------ */
/* Charge                                                              */
/* ------------------------------------------------------------------ */

/**
 * Les champs de qualification à joindre à la demande.
 *
 * Ne pose que ce qui est réellement connu : un champ absent se lit « on ne
 * sait pas », alors qu'un champ rempli par défaut se lit « on sait », et la
 * différence compte quand quelqu'un décide à qui envoyer un client.
 *
 * @param {object} options
 * @param {string}  [options.besoin]          réponse au champ « De quoi avez-vous besoin ? »
 * @param {boolean} [options.produitPremibel] une référence réelle était ouverte
 * @param {string}  [options.timeframe]
 * @param {number}  [options.surface]
 * @param {string}  [options.department]      la seule donnée géographique
 * @returns {object}
 */
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

/**
 * Branche le contexte sur la page courante.
 *
 * À appeler une fois par page, au démarrage. Enregistre la visite si elle
 * commence ici, et signale l'ouverture du Visualiseur — le seul événement de
 * parcours qui se déduit de la page elle-même plutôt que d'un geste.
 */
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
