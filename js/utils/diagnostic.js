/**
 * Le site parle-t-il à un développeur, ou à un visiteur ?
 *
 * Certaines vérifications internes méritent d'être dites — une fiche produit
 * incomplète, une donnée qui ne passe pas le validateur — mais elles méritent
 * d'être dites À QUELQU'UN QUI PEUT AGIR. Écrites dans la console de tout le
 * monde, elles n'informent personne et donnent à voir ce qui ne regarde
 * personne : le relevé du 28/09/2026 a trouvé, sur chaque chargement du
 * Visualiseur,
 *
 *   [catalogue] fiches incomplètes : DASSP3903 (lengthMm rejetée, …)
 *
 * — une référence produit interne et le détail d'une règle de validation,
 * répétés à chaque visite.
 *
 * Ce module ne fait qu'une chose : dire si l'on est en mode diagnostic.
 *
 *   ?dev=1 ou ?perf=1 dans l'URL, ou `window.__dev = true` avant le
 *   démarrage ;
 *   toujours vrai sur une machine de développement (localhost, .local,
 *   .test), parce qu'on n'y pense jamais au bon moment.
 *
 * En dehors de ces cas, `avertir()` ne fait rien — pas un appel, pas une
 * chaîne construite.
 */

const actif = (() => {
  if (typeof window === 'undefined') return false;
  if (window.__dev === true) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1' || params.get('perf') === '1') return true;
    const hote = window.location.hostname;
    return hote === 'localhost' || hote === '127.0.0.1' || hote === '[::1]'
      || /\.(local|test|localhost)$/.test(hote);
  } catch {
    return false;
  }
})();

/** Vrai quand les messages de diagnostic sont les bienvenus. */
export const modeDiagnostic = () => actif;

/**
 * Un avertissement destiné à celui qui développe, jamais à celui qui visite.
 *
 * @param {...unknown} args passés tels quels à console.warn
 */
export function avertir(...args) {
  if (actif) console.warn(...args);
}
