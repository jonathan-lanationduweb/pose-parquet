/**
 * Compte des pièces d'exemple réellement proposées.
 *
 * Ce nombre apparaît dans trois pages, et il était écrit en dur : le jour où
 * une cinquième scène a été validée, les trois textes sont devenus faux sans
 * que rien ne le signale. Il est maintenant lu dans le manifeste.
 *
 * Mais lire le manifeste ne suffisait pas : encore fallait-il le lire AVEC LA
 * MÊME RÈGLE que le Studio. Ce fichier appliquait « géométrie et rendu
 * validés » ; le front ajoute « et pas retirée de la bibliothèque ». Les deux
 * comptes étaient justes, chacun de son côté, et le site a annoncé dix pièces
 * pendant que le Studio en proposait neuf — `couloir-enfilade` est validée
 * mais réservée à sa carte d'inspiration.
 *
 * La règle vient donc désormais de `js/scene/scenes-regles.js`, le fichier
 * que le front lui-même applique. Il n'y a plus deux versions à garder
 * d'accord, et `check-chiffres.js` vérifie que le nombre écrit dans les pages
 * est bien celui que le Studio offre.
 */
const fs = require('fs');
const path = require('path');

/*
 * `scenes-regles.js` est un module ES — c'est le front qui le charge en
 * premier lieu. Node sait le charger depuis CommonJS depuis la version 22.12 ;
 * en dessous, il faut le dire clairement plutôt que de laisser tomber une
 * trace illisible, parce que le repli silencieux serait précisément le défaut
 * qu'on vient de corriger.
 */
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

/** Exactement la liste que le Studio affiche dans « Changer de pièce ». */
const PIECES = REGLES.scenesBibliotheque(manifeste());
const NB_PIECES = PIECES.length;
const NB_PIECES_LETTRES = EN_LETTRES[NB_PIECES] || String(NB_PIECES);

/**
 * Les scènes publiables mais volontairement hors bibliothèque.
 *
 * Elles restent ouvrables par lien direct — c'est ce qui permet à une carte
 * d'inspiration d'ouvrir sa propre photographie. On les expose ici pour que
 * les contrôles puissent nommer l'écart au lieu de le constater.
 */
const HORS_BIBLIOTHEQUE = REGLES.scenesPubliques(manifeste()).filter(
  (s) => !REGLES.estDansBibliotheque(s)
);

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

module.exports = { PIECES, NB_PIECES, NB_PIECES_LETTRES, HORS_BIBLIOTHEQUE, scene, REGLES, manifeste };
