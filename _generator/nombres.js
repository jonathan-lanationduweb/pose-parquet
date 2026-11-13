const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');
const { NB_PREMIBEL_VISU, NB_MOTIFS, enLettres } = require('./catalogue');

const NB_MOTIFS_PLAN = require('../js/tools/patterns.js').PATTERNS.length;

const valeurs = () => ({
  guides: GUIDES.length,
  motifs: MOTIFS.length,
  tutoriels: TUTOS.length,
  parquets: NB_PREMIBEL_VISU,
  motifs_outils: NB_MOTIFS_PLAN,
  motifs_studio: NB_MOTIFS,
});

const majuscule = (s) => s.replace(/^./, (c) => c.toUpperCase());

function nombres(texte) {
  const n = valeurs();
  return String(texte == null ? '' : texte).replace(/\{([A-Za-z_]+?)(_lettres)?\}/g, (tout, cle, lettres) => {
    const minuscule = cle.toLowerCase();
    if (!(minuscule in n)) return tout;
    if (!lettres) return String(n[minuscule]);
    const mot = enLettres(n[minuscule]);
    return cle[0] === cle[0].toUpperCase() ? majuscule(mot) : mot;
  });
}

const AIDE_NOMBRES =
  'Nombres calculés : {guides}, {motifs}, {tutoriels}, {parquets}, {motifs_outils}, {motifs_studio} ; en lettres : {guides_lettres} ; en lettres avec majuscule : {Guides_lettres}.';

module.exports = { nombres, AIDE_NOMBRES };
