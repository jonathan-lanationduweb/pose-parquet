/**
 * Le déclencheur de la démonstration de l'accueil — et rien de plus.
 *
 * Ce module est volontairement minuscule, parce qu'il est le seul de la chaîne
 * du Visualiseur que la page d'accueil paie au chargement. Le moteur, lui, pèse
 * environ 190 Ko de sources (≈ 66 Ko compressés) répartis sur seize modules :
 * il n'a rien à faire dans le chemin critique d'une page dont l'essentiel est
 * éditorial. Avant ce lot, `main.js` l'importait dès que la section existait
 * dans le document, c'est-à-dire toujours, et le premier module partait à
 * 192 ms — un commentaire de `preview.js` promettait pourtant l'inverse.
 *
 * Deux responsabilités, donc :
 *
 *   1. faire fonctionner le curseur avant / après **sans le moteur**, sur le
 *      poster pré-rendu. Cinq lignes, et la comparaison marche dès le premier
 *      octet : souris, doigt et clavier, puisque c'est un `input[type=range]` ;
 *   2. charger le moteur quand la démonstration devient utile, puis s'effacer.
 *
 * Deux déclencheurs plutôt qu'un :
 *
 *   - l'approche à l'écran (`IntersectionObserver`, marge de 400 px), le cas
 *     ordinaire ;
 *   - l'arrivée du focus dans la section, pour qui navigue au clavier et
 *     atteint les commandes avant que la section n'entre dans le cadre.
 *
 * Si `IntersectionObserver` manque — navigateur très ancien — on charge tout
 * de suite : mieux vaut une page lourde qu'une section morte.
 */

/** Marge d'anticipation : le moteur part avant que la section soit visible. */
const MARGE = '400px';

/**
 * Relie le curseur au découpage CSS.
 *
 * `--compare` est lu par `.vzp__canvas` et `.vzp__poster` (`clip-path`) et par
 * `.vzp__handle` (position du trait). Le curseur pilote donc l'affichage sans
 * qu'aucun rendu soit nécessaire : avant le moteur, il compare la photo
 * d'origine et le poster ; après, la photo et le rendu calculé.
 */
function relierCurseur(root) {
  const range = root.querySelector('[data-range]');
  // La propriété se pose sur la SCÈNE et non sur la section : `.vzp__stage`
  // déclare sa propre valeur par défaut (`--compare: 52%`), qui l'emporterait
  // sur une valeur simplement héritée du parent.
  const stage = root.querySelector('[data-stage]');
  if (!range || !stage) return;
  // Drapeau partagé avec preview.js : un seul écouteur pour un seul curseur.
  range.dataset.relie = 'true';
  const appliquer = () => stage.style.setProperty('--compare', `${range.value}%`);
  range.addEventListener('input', appliquer);
  appliquer();
}

/**
 * Charge le moteur une seule fois, puis monte la démonstration.
 *
 * L'échec est prévu et silencieux pour le visiteur : la section garde son
 * poster, son texte et ses deux liens. Une page d'accueil ne doit pas dépendre
 * d'un rendu.
 */
function chargerUneFois(root) {
  let lance = false;

  return async () => {
    if (lance) return;
    lance = true;
    try {
      const { mountPreview } = await import('../scene/preview.js');
      mountPreview(root);
    } catch (error) {
      root.dataset.ready = 'photo';
      console.warn('[accueil] démonstration indisponible', error);
    }
  };
}

/**
 * Prépare une section de démonstration.
 *
 * @param {HTMLElement} root conteneur `[data-vz-preview]`
 */
export function initVisualizerTeaser(root) {
  if (!root || root.dataset.teaser === 'true') return;
  root.dataset.teaser = 'true';

  relierCurseur(root);

  const demarrer = chargerUneFois(root);

  // Le focus clavier compte comme une intention : quelqu'un qui tabule jusqu'aux
  // commandes ne doit pas attendre que le défilement les amène à l'écran.
  root.addEventListener('focusin', demarrer, { once: true });

  if (typeof IntersectionObserver !== 'function') {
    demarrer();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      demarrer();
    },
    { rootMargin: MARGE }
  );
  observer.observe(root);
}

export default initVisualizerTeaser;
