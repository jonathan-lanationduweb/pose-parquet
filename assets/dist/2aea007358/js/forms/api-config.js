/**
 * Où vit l'API, et nulle part ailleurs.
 *
 * Une seule adresse, résolue une fois. Le reste du front n'écrit jamais
 * « localhost » ni un nom de domaine : il demande `apiBaseUrl()`. Le jour où le
 * backend déménage, un seul tableau change.
 *
 * Trois manières de définir l'adresse, de la plus forte à la plus faible :
 *
 *   1. `window.POSE_PARQUET_CONFIG = { apiBaseUrl: '…' }` posé avant le
 *      chargement des modules. C'est la porte de sortie : un environnement
 *      imprévu, un essai ponctuel, une page servie depuis un autre hôte.
 *   2. le tableau `PAR_HOTE` ci-dessous, qui associe un hôte connu à son
 *      backend ;
 *   3. rien — et c'est un état légitime, pas une panne : le formulaire le dit
 *      au visiteur au lieu de faire semblant d'envoyer.
 *
 * Ce qui n'existe pas encore n'est PAS écrit comme s'il existait. Au
 * 7 septembre 2026, aucun WordPress de préproduction ni de production n'est
 * déployé : les deux lignes correspondantes sont donc à `null`, avec l'adresse
 * prévue en commentaire. Mettre une URL qui répond 404 aurait produit le pire
 * des états — un formulaire qui essaie, échoue, et accuse le réseau.
 */

/**
 * Hôte du front → RACINE COMPLÈTE de l'espace REST, sans barre finale.
 *
 * `null` signifie « pas de backend pour cet hôte », et c'est dit à l'écran.
 *
 * On stocke la racine entière, et non un domaine auquel on ajouterait
 * `/wp-json/pose-parquet/v1`, parce que WordPress sert son API sous DEUX
 * formes selon la configuration des permaliens du site :
 *
 *   permaliens jolis    https://exemple.fr/wp-json/pose-parquet/v1
 *   permaliens simples  https://exemple.fr/index.php?rest_route=/pose-parquet/v1
 *
 * Les deux sont officielles et équivalentes. La seconde est celle du
 * WordPress de développement, servi par `php -S`, qui ne réécrit aucune URL :
 * sans fichier de routage, `/wp-json/…` y répond 301 puis 404, et c'est ce qui
 * a été constaté au branchement. Comme les deux formes se terminent par le
 * chemin de l'espace, une simple concaténation de `/form-token` ou
 * `/projects` fonctionne dans les deux cas — d'où le choix de garder la
 * racine complète ici plutôt que de recomposer un chemin.
 */
const PAR_HOTE = {
  // Développement : le serveur `node serve.js` du dépôt, et le WordPress
  // dédié de `C:\wamp64\www\pose-parquet-dev`. L'hôte est `localhost` et non
  // `127.0.0.1` : WordPress connaît le site sous ce nom, et une session
  // ouverte sur l'autre adresse pose son cookie sur le mauvais domaine.
  'localhost': 'http://localhost:8181/index.php?rest_route=/pose-parquet/v1',
  '127.0.0.1': 'http://localhost:8181/index.php?rest_route=/pose-parquet/v1',

  // Préproduction GitHub Pages. Aucun backend public ne lui répond
  // aujourd'hui : le formulaire y affiche son indisponibilité, il ne prétend
  // pas envoyer. Valeur prévue quand le WordPress de préproduction existera :
  // 'https://staging-admin.pose-parquet.com/wp-json/pose-parquet/v1'
  'jonathan-lanationduweb.github.io': null,

  // Production. Valeur prévue, permaliens jolis :
  // 'https://admin.pose-parquet.com/wp-json/pose-parquet/v1'
  'pose-parquet.com': null,
  'www.pose-parquet.com': null,
};

/** Configuration posée par la page, si elle l'a été. */
function surcharge() {
  const c = typeof window !== 'undefined' ? window.POSE_PARQUET_CONFIG : null;
  return c && typeof c === 'object' ? c : {};
}

/**
 * Racine de l'API, ou `null` si cet environnement n'a pas de backend.
 *
 * @returns {string|null} ex. 'http://localhost:8181/wp-json/pose-parquet/v1'
 */
export function apiBaseUrl() {
  const c = surcharge();

  /*
   * `apiBaseUrl: null` posé explicitement force l'état « sans backend ».
   *
   * Ce n'est pas une curiosité : c'est ce qui rend cet état vérifiable, et ce
   * qui permet à une préproduction de montrer l'écran d'indisponibilité sans
   * qu'on aille modifier le tableau des hôtes. La distinction se fait sur la
   * PRÉSENCE de la clé, pas sur sa valeur — un `undefined` (clé absente)
   * laisse décider le tableau, un `null` tranche.
   */
  if (Object.prototype.hasOwnProperty.call(c, 'apiBaseUrl') && c.apiBaseUrl === null) {
    return null;
  }

  if (typeof c.apiBaseUrl === 'string' && c.apiBaseUrl.trim() !== '') {
    return c.apiBaseUrl.trim().replace(/\/+$/, '');
  }

  const hote = typeof window !== 'undefined' ? window.location.hostname : '';
  const racine = Object.prototype.hasOwnProperty.call(PAR_HOTE, hote) ? PAR_HOTE[hote] : null;

  return racine ? racine.replace(/\/+$/, '') : null;
}

/** Vrai si un backend est joignable en principe pour cet environnement. */
export function apiConfigured() {
  return apiBaseUrl() !== null;
}

/** URL d'une route de l'espace, ou `null` si aucun backend n'est configuré. */
export function apiUrl(chemin) {
  const base = apiBaseUrl();
  return base ? base + (chemin.startsWith('/') ? chemin : `/${chemin}`) : null;
}

/**
 * Délai au-delà duquel on cesse d'attendre le réseau.
 *
 * Douze secondes : au-dessous, une connexion mobile lente sur un envoi qui
 * déclenche deux emails côté serveur se ferait couper alors qu'elle allait
 * aboutir ; au-dessus, le visiteur croit l'interface figée. La demande, elle,
 * peut très bien avoir été enregistrée — c'est pourquoi le message d'échec
 * réseau ne dit jamais que rien n'a été reçu.
 */
export const TIMEOUT_MS = 12000;

export default { apiBaseUrl, apiConfigured, apiUrl, TIMEOUT_MS };
