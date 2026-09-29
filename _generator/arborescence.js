/**
 * Ce qui, à la racine du dépôt, n'est jamais une page du site.
 *
 * Trois outils parcourent l'arborescence pour y trouver les pages :
 * `build.js` (contrôle du rattachement des feuilles de style),
 * `check-links.js` et `check-images.js`. Chacun tenait sa propre liste
 * d'exclusions, écrite à la main, et les trois avaient divergé — aucune ne
 * connaissait `.kilo`, deux ignoraient `_site`.
 *
 * Le 28/09/2026 la construction s'est arrêtée pour cette raison exacte :
 * l'éditeur avait posé un arbre de travail Git complet dans
 * `.kilo/worktrees/<nom>/`, le parcours de `build.js` y est descendu, et les
 * dix-neuf pages d'un vieux commit ont été jugées incohérentes avec les
 * feuilles du jour. Diagnostic juste, périmètre faux.
 *
 * D'où cette règle, tenue à un seul endroit :
 *
 *   1. UN DOSSIER COMMENÇANT PAR UN POINT N'EST JAMAIS DU SITE.
 *      `.git`, `.github`, `.vscode`, `.claude`, `.kilo`, et tous ceux que le
 *      prochain outil installera sans prévenir. C'est la seule forme de règle
 *      qui protège de ce qu'on ne connaît pas encore.
 *
 *      La règle ne porte QUE SUR LES DOSSIERS. Les fichiers cachés de la
 *      racine — `.nojekyll`, `.gitignore`, `.gitattributes` — sont utiles et
 *      restent lisibles : aucun d'eux n'est une page, aucun n'est parcouru.
 *
 *   2. QUATRE DOSSIERS NOMMÉS, qui sont du travail et non du site :
 *      les dépendances, le générateur lui-même, les pages de calibrage, et
 *      la copie d'artefact que le déploiement fabrique.
 *
 * Ce module est le plancher commun. Chaque outil garde le droit d'exclure en
 * plus ce qui ne le concerne pas — `check-images` ne regarde pas `data`,
 * `build` ne relit pas `components` — mais aucun n'a plus à se souvenir des
 * dossiers d'outillage.
 */

/** Dossiers de travail, nommés. Le reste est couvert par la règle du point. */
const DOSSIERS_OUTILS = new Set(['node_modules', '_generator', '_calibrage', '_site']);

/**
 * Ce dossier doit-il rester hors du parcours des pages ?
 *
 * @param {string} nom nom du dossier, sans son chemin
 * @returns {boolean}
 */
function horsSite(nom) {
  return nom.startsWith('.') || DOSSIERS_OUTILS.has(nom);
}

/**
 * Fabrique le prédicat d'exclusion d'un outil : le plancher commun, plus ce
 * que cet outil-là ne regarde pas.
 *
 * @param {string[]} [enPlus] dossiers propres à l'appelant
 * @returns {(nom: string) => boolean}
 */
function exclusions(enPlus = []) {
  const propres = new Set(enPlus);
  return (nom) => horsSite(nom) || propres.has(nom);
}

module.exports = { DOSSIERS_OUTILS, horsSite, exclusions };
