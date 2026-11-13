const fs = require('fs');
const path = require('path');



let REGLES;
try {
  REGLES = require('../js/scene/scenes-regles.js');
} catch (erreur) {
  throw new Error(
    "Impossible de charger js/scene/scenes-regles.js depuis le générateur.\n" +
      `Node ${process.version} — il en faut au moins 22.12 pour charger un module ES ` +
      "depuis CommonJS. Mettre Node à jour, ou dupliquer la règle ici EN LE SACHANT.\n" +
      `Cause : ${erreur && erreur.message}`
  );
}

const INDEX = path.join(__dirname, '..', 'data', 'scenes', 'index.json');

function manifeste() {
  return JSON.parse(fs.readFileSync(INDEX, 'utf8'));
}

const EN_LETTRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];


const PIECES = REGLES.scenesBibliotheque(manifeste());
const NB_PIECES = PIECES.length;
const NB_PIECES_LETTRES = EN_LETTRES[NB_PIECES] || String(NB_PIECES);



const HORS_BIBLIOTHEQUE = REGLES.scenesPubliques(manifeste()).filter(
  (s) => !REGLES.estDansBibliotheque(s)
);



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

module.exports = { PIECES, NB_PIECES, NB_PIECES_LETTRES, HORS_BIBLIOTHEQUE, scene, REGLES, manifeste };
