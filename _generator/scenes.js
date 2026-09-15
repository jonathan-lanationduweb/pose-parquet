/**
 * Compte des pièces d'exemple réellement proposées.
 *
 * Ce nombre apparaît dans trois pages, et il était écrit en dur : le jour où
 * une cinquième scène a été validée, les trois textes sont devenus faux sans
 * que rien ne le signale. Il est maintenant lu dans le manifeste, avec la même
 * règle que le visualiseur — seules les scènes `validated` comptent, une scène
 * expérimentale existe pour le contrôle qualité, pas pour être proposée.
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'data', 'scenes', 'index.json');

function scenesValidees() {
  const manifeste = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  return (manifeste.scenes || []).filter((s) => s.geometryStatus === 'validated' && s.visualStatus === 'validated');
}

const EN_LETTRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

const PIECES = scenesValidees();
const NB_PIECES = PIECES.length;
const NB_PIECES_LETTRES = EN_LETTRES[NB_PIECES] || String(NB_PIECES);

/**
 * La fiche complète d'une scène, lue dans son fichier.
 *
 * Le manifeste ne porte que l'identité et les statuts ; les dimensions de la
 * photo, son texte alternatif et son crédit vivent dans le fichier de la
 * scène. L'accueil en a besoin pour réserver la place de l'aperçu AVANT que
 * le JavaScript ne s'exécute — sans quoi le composant apparaît d'un coup et
 * pousse tout ce qui le suit.
 *
 * @param {string} id identifiant de scène, ex. 'sejour'
 * @returns {{id:string,label:string,image:{file:string,width:number,height:number,alt:string,credit?:string}}}
 */
function scene(id) {
  const fichier = path.join(__dirname, '..', 'data', 'scenes', `${id}.json`);
  if (!fs.existsSync(fichier)) {
    throw new Error(`Scène inconnue : ${id} (attendu ${fichier})`);
  }
  const donnees = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  if (!donnees.image || !donnees.image.width || !donnees.image.height) {
    throw new Error(`Scène ${id} : dimensions de photo absentes, la place ne peut pas être réservée.`);
  }
  return donnees;
}

module.exports = { PIECES, NB_PIECES, NB_PIECES_LETTRES, scene };
