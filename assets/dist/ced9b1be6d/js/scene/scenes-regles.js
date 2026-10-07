/**
 * Quelles pièces d'exemple on propose, et à qui. La règle, une seule fois.
 *
 * Ce fichier ne contient que des fonctions pures sur le manifeste
 * `data/scenes/index.json`. Aucune importation, aucun accès réseau, aucun
 * DOM : c'est délibéré, parce qu'il est lu des deux côtés.
 *
 *   à l'exécution   `js/scene/analyzer.js` le réexporte ; le Studio et le
 *                   visualiseur produit s'en servent pour construire la
 *                   bibliothèque « Changer de pièce » ;
 *   à la fabrique   `_generator/scenes.js` le charge pour écrire le nombre
 *                   de pièces annoncé dans les textes du site.
 *
 * POURQUOI ICI ET PLUS AILLEURS. Les deux côtés portaient chacun leur
 * version de la règle. Elles ont divergé sur un seul drapeau :
 * `_generator/scenes.js` comptait les scènes publiables, le front n'en
 * proposait que celles de la bibliothèque. Le site a donc annoncé « dix
 * pièces d'exemple » pendant que le Studio en offrait neuf — l'écart
 * s'appelle `couloir-enfilade`, validée mais réservée à sa carte
 * d'inspiration. Aucun test ne pouvait le voir : les deux comptes étaient
 * justes, chacun selon sa propre règle.
 *
 * L'en-tête de `_generator/scenes.js` mettait pourtant déjà en garde contre
 * exactement cela. Écrire deux fois une règle métier suffit à la faire
 * mentir ; la commenter ne suffit pas à l'en empêcher.
 */

/**
 * Statut d'une pièce d'exemple.
 *
 *   validated     calibrée, relue, proposée aux visiteurs ;
 *   experimental  gardée pour le contrôle qualité, pas proposée ;
 *   disabled      conservée dans le dépôt mais hors service.
 *
 * Une scène difficile a de la valeur : elle montre où le moteur plie. La
 * supprimer pour faire propre, c'est perdre le seul cas qui apprenait quelque
 * chose. Le statut permet de la garder sans l'imposer à un visiteur.
 *
 * **Le défaut est `experimental`, pas `validated`.** Une scène dont le statut
 * a été oublié n'apparaît donc pas publiquement : l'oubli fait rater une
 * scène, il ne publie pas un rendu que personne n'a regardé.
 */
export const STATUTS = ['validated', 'experimental', 'disabled'];

/**
 * DEUX statuts, parce qu'une scène peut être juste et laide.
 *
 * `geometryStatus` dit si la perspective, l'échelle et le contour sont
 * prouvés : deux directions mesurées, une focale déduite, un quadrilatère
 * orthogonal, des résidus au pixel. `visualStatus` dit si le RENDU est
 * présentable.
 *
 * Les deux ne se déduisent pas l'un de l'autre, et c'est la leçon de cette
 * passe. Trois scènes portaient `status: validated` sur la seule foi de leur
 * géométrie :
 *
 *   - piece-claire : masque qui monte sur le mur de gauche, bord en dents de
 *     scie, occulteurs en boîtes englobantes ;
 *   - appartement-ancien : une bande du MÊME sol, le long du mur droit, n'est
 *     pas couverte par le masque — le visiteur voit la moitié du couloir
 *     changer ;
 *   - contraste : ce n'est pas une pièce. Un mur, un rai de soleil, une
 *     lisière de sol. Excellente pour éprouver le report de lumière, absurde
 *     comme « pièce d'exemple » offerte au visiteur.
 *
 * Aucun chiffre géométrique ne dit cela. Il faut regarder.
 *
 * Le défaut de `visualStatus`, en cas d'oubli, est `experimental` : une
 * scène qu'on n'a pas regardée ne se publie pas.
 */
const lire = (liste, valeur, defaut) => (liste.includes(valeur) ? valeur : defaut);

/**
 * Le vocabulaire du visuel a un mot de plus : `failed`.
 *
 * `experimental` veut dire « pas encore regardé, ou gardé comme cas de test ».
 * `failed` veut dire « regardé, et rejeté pour une raison écrite ». Les deux
 * excluent du public, mais pas pour la même raison, et confondre les deux
 * revient à perdre la trace du travail de revue : on ne saurait plus si une
 * scène attend un regard ou si elle a déjà été jugée.
 */
export const STATUTS_VISUELS = ['validated', 'experimental', 'failed', 'disabled'];

/** Géométrie prouvée ? `status` est encore lu pour les manifestes anciens. */
export const geometrieDe = (entry) => lire(STATUTS, entry && entry.geometryStatus, lire(STATUTS, entry && entry.status, 'experimental'));

/** Rendu regardé et jugé présentable ? */
export const visuelDe = (entry) => lire(STATUTS_VISUELS, entry && entry.visualStatus, 'experimental');

/**
 * Statut d'ensemble, pour l'affichage : le moins avancé des deux.
 * `disabled` d'un côté ferme la scène ; sinon il faut deux `validated`.
 */
export const statutDe = (entry) => {
  const g = geometrieDe(entry);
  const v = visuelDe(entry);
  if (g === 'disabled' || v === 'disabled') return 'disabled';
  if (v === 'failed') return 'failed';
  return g === 'validated' && v === 'validated' ? 'validated' : 'experimental';
};

/** Une scène publiable : géométrie ET rendu validés. */
export const estPubliable = (entry) => geometrieDe(entry) === 'validated' && visuelDe(entry) === 'validated';

/**
 * Une scène offerte dans la bibliothèque.
 *
 * `showInRoomLibrary: false` retire une scène de la liste sans la déclasser.
 * Le défaut est VRAI : une scène validée se propose, sauf décision contraire
 * écrite dans le manifeste. Un oubli garde donc le comportement d'avant.
 */
export const estDansBibliotheque = (entry) => estPubliable(entry) && entry.showInRoomLibrary !== false;

/** Le tableau des scènes d'un manifeste, quelle qu'en soit la forme. */
const entrees = (index) => (index && Array.isArray(index.scenes) ? index.scenes : []);

/** Les pièces publiables : géométrie ET rendu validés. */
export const scenesPubliques = (index) => entrees(index).filter(estPubliable);

/**
 * Les pièces listées dans « Changer de pièce », et le nombre que le site
 * annonce.
 *
 * Publiable et proposée dans la bibliothèque sont deux choses différentes.
 * Une scène calibrée pour une carte d'inspiration est essayable par son lien
 * sans devoir figurer dans la liste principale : les huit inspirations
 * calibrées, la bibliothèque doublerait et le choix deviendrait un catalogue
 * à faire défiler.
 *
 * C'est CETTE liste que les textes du site comptent. Annoncer les scènes
 * publiables reviendrait à promettre une pièce que personne ne trouve.
 */
export const scenesBibliotheque = (index) => entrees(index).filter(estDansBibliotheque);

/**
 * Les pièces qu'on accepte d'ouvrir sur demande explicite (lien direct).
 * Une scène expérimentale reste atteignable pour la relecture ; une scène
 * `disabled` ne s'ouvre pas.
 */
export const sceneOuvrable = (index, id) => {
  const entry = entrees(index).find((e) => e.id === id);
  return entry && geometrieDe(entry) !== 'disabled' ? entry : null;
};
