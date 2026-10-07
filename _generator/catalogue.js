/**
 * Combien de parquets le Studio propose-t-il, vraiment ?
 *
 * L'accueil et la page Outils annonçaient « douze parquets », écrit à la
 * main le jour où `data/parquets.json` en contenait douze. Quatorze
 * références Premibel ont été ajoutées depuis, et le texte est resté. Le
 * tiroir « Parquet » en présente vingt-six ; le site en promettait moins de
 * la moitié.
 *
 * Le nombre est donc calculé ici, à partir des MÊMES fichiers et du MÊME
 * prédicat que le front :
 *
 *   data/render-families.json  déclare les catalogues à charger ;
 *   normalizeProduct()         ramène chaque fiche à sa forme canonique ;
 *   estProposable()            décide ce qui est offert au visiteur.
 *
 * Les trois viennent de `js/scene/product.js` — le fichier que le Studio
 * exécute. Rien n'est réécrit ici : on refait le chemin de lecture, pas la
 * règle. Le jour où le catalogue passe à trente, cent ou cinq cent trente
 * références, les textes suivent sans que personne n'y pense.
 *
 * Ce qui n'est PAS fait ici : fabriquer les matériaux. `createMaterial()`
 * calcule des textures et n'a rien à faire dans un générateur de pages ; le
 * comptage n'en a pas besoin.
 */
const fs = require('fs');
const path = require('path');

/* Module ES, chargé depuis CommonJS — voir la note de _generator/scenes.js. */
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

/**
 * Le catalogue tel que le Studio le voit.
 *
 * @returns {{proposes: object[], rejetes: object[], sources: string[]}}
 */
function catalogue() {
  const manifeste = lire('data/render-families.json');
  const familles = manifeste.familles || {};
  // Les profils matière validés, lus comme le Studio les lit.
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

/**
 * Combien viennent d'où.
 *
 * Le catalogue n'est plus homogène : une moitié est procédurale et ne
 * correspond à aucun produit, l'autre relève de références Premibel réelles.
 * Une réponse de FAQ qui dit « ce sont douze références de démonstration »
 * est donc fausse sur le nombre ET sur la nature. Elle est reconstruite à
 * partir de ce décompte.
 */
const PAR_SOURCE = CATALOGUE.proposes.reduce((acc, f) => {
  const s = f.source || 'inconnue';
  acc[s] = (acc[s] || 0) + 1;
  return acc;
}, {});
const NB_DEMONSTRATION = PAR_SOURCE.demonstration || 0;
const NB_REELS = NB_PARQUETS - NB_DEMONSTRATION;
/*
 * Les chiffres PUBLICS du catalogue : seulement les références Premibel actives.
 * Les parquets de démonstration restent chargés (inspirations, liens profonds
 * historiques) mais ne sont plus présentés comme faisant partie du catalogue.
 */
const NB_PREMIBEL = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].filter((f) => f.source === 'premibel' && f.active).length;
const NB_PREMIBEL_VISU = CATALOGUE.proposes.filter((f) => f.source === 'premibel').length;
/* Parmi elles, celles dont la matière a été construite et validée pour la référence. */
const NB_PREMIBEL_FIDELE = CATALOGUE.proposes.filter((f) => f.source === 'premibel' && f.visualStatus === 'ready').length;

/**
 * Le statut de rendu d'une référence, tel que le Studio le calcule.
 * Sert aux textes générés (légende de l'accueil) : aucun « rendu fidèle »
 * ni « indicatif » n'y est écrit à la main.
 */
const MENTION_RENDU = { ready: 'rendu fidèle', approximate: 'rendu indicatif' };
function mentionRendu(sku) {
  const f = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].find((x) => x.sku === sku || x.id === sku);
  return (f && MENTION_RENDU[f.visualStatus]) || null;
}

/** Les motifs de pose que le Studio sait rendre. */
const NB_MOTIFS = PRODUIT.KNOWN_PATTERNS.length;

const EN_LETTRES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
];

/** Un nombre en toutes lettres tant que la langue reste simple, en chiffres après. */
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
