const fs = require('fs');
const path = require('path');


let PRODUIT;
try {
  PRODUIT = require('../js/scene/product.js');
} catch (erreur) {
  throw new Error(
    "Impossible de charger js/scene/product.js depuis le générateur.\n" +
      `Node ${process.version} — il en faut au moins 22.12 pour charger un module ES ` +
      "depuis CommonJS.\n" +
      `Cause : ${erreur && erreur.message}`
  );
}

const RACINE = path.join(__dirname, '..');
const lire = (relatif) => JSON.parse(fs.readFileSync(path.join(RACINE, relatif), 'utf8'));



function catalogue() {
  const manifeste = lire('data/render-families.json');
  const familles = manifeste.familles || {};

  const profils = manifeste.profils ? lire(manifeste.profils).profils || {} : {};
  const sources = Array.isArray(manifeste.catalogues)
    ? manifeste.catalogues
    : [{ fichier: manifeste.catalogue || 'data/parquets.json', source: 'demonstration' }];

  const toutes = [];
  for (const s of sources) {
    const data = lire(s.fichier);
    const brutes = Array.isArray(data.produits) ? data.produits : data.parquets;
    if (!Array.isArray(brutes)) throw new Error(`catalogue vide ou mal formé : ${s.fichier}`);
    brutes.forEach((r) => toutes.push(PRODUIT.normalizeProduct({ source: s.source, ...r }, familles, profils)));
  }

  const proposes = toutes.filter(PRODUIT.estProposable);
  return {
    proposes,
    rejetes: toutes.filter((f) => !proposes.includes(f)),
    sources: sources.map((s) => s.fichier),
  };
}

const CATALOGUE = catalogue();
const NB_PARQUETS = CATALOGUE.proposes.length;



const PAR_SOURCE = CATALOGUE.proposes.reduce((acc, f) => {
  const s = f.source || 'inconnue';
  acc[s] = (acc[s] || 0) + 1;
  return acc;
}, {});
const NB_DEMONSTRATION = PAR_SOURCE.demonstration || 0;
const NB_REELS = NB_PARQUETS - NB_DEMONSTRATION;


const NB_PREMIBEL = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].filter((f) => f.source === 'premibel' && f.active).length;
const NB_PREMIBEL_VISU = CATALOGUE.proposes.filter((f) => f.source === 'premibel').length;

const NB_PREMIBEL_FIDELE = CATALOGUE.proposes.filter((f) => f.source === 'premibel' && f.visualStatus === 'ready').length;



const MENTION_RENDU = { ready: 'rendu fidèle', approximate: 'rendu indicatif' };
function mentionRendu(sku) {
  const f = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].find((x) => x.sku === sku || x.id === sku);
  return (f && MENTION_RENDU[f.visualStatus]) || null;
}


const NB_MOTIFS = PRODUIT.KNOWN_PATTERNS.length;

const EN_LETTRES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];


function enLettres(n) {
  return EN_LETTRES[n] || String(n);
}

module.exports = {
  CATALOGUE,
  NB_PARQUETS,
  NB_PREMIBEL,
  NB_PREMIBEL_VISU,
  NB_PREMIBEL_FIDELE,
  mentionRendu,
  NB_MOTIFS,
  PAR_SOURCE,
  NB_DEMONSTRATION,
  NB_REELS,
  enLettres,
  catalogue,
};
