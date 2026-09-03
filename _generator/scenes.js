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
  return (manifeste.scenes || []).filter((s) => s.status === 'validated');
}

const EN_LETTRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

const PIECES = scenesValidees();
const NB_PIECES = PIECES.length;
const NB_PIECES_LETTRES = EN_LETTRES[NB_PIECES] || String(NB_PIECES);

module.exports = { PIECES, NB_PIECES, NB_PIECES_LETTRES };
