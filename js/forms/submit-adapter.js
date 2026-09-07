/**
 * Envoi d'une demande de projet à l'API WordPress.
 *
 *   GET  /wp-json/pose-parquet/v1/form-token   au montage du formulaire
 *   POST /wp-json/pose-parquet/v1/projects     à la soumission
 *
 * CE QUI A DISPARU DE CE FICHIER, et pourquoi c'est le point important du lot.
 *
 * Il contenait un mode de secours : sans point d'envoi configuré, la demande
 * était écrite dans le `localStorage` du visiteur, l'adaptateur attendait
 * 700 ms et renvoyait `{ ok: true }`. Le formulaire affichait alors « Merci,
 * votre projet est bien décrit » à quelqu'un qui venait de saisir son nom, son
 * adresse et son téléphone — et personne ne recevait rien. Ce n'était pas une
 * imprécision d'interface, c'était une promesse fausse.
 *
 * Il n'y a plus de succès sans 201. Quand aucun backend n'est configuré pour
 * l'environnement, l'envoi échoue avec le code `not_configured`, et l'écran le
 * dit. Un formulaire indisponible est désagréable ; un formulaire qui remercie
 * dans le vide est autre chose.
 *
 * @see docs/backend/front-integration.md
 */
import { apiUrl, apiConfigured, TIMEOUT_MS } from './api-config.js';

/** Âge minimum d'un jeton accepté par le serveur, en millisecondes. */
const AGE_MINIMUM_MS = 2000;
/** Marge au-dessus du minimum : l'horloge d'un client n'est pas celle du serveur. */
const MARGE_AGE_MS = 400;

/**
 * Codes rendus par `submitProject`. Ce sont eux que l'interface traduit en
 * phrases ; elle ne lit jamais le corps d'une réponse HTTP.
 */
export const ERREURS = {
  NON_CONFIGURE: 'not_configured',
  VALIDATION: 'validation',
  DEBIT: 'rate_limited',
  JETON: 'form_token_invalid',
  REFUS: 'submission_rejected',
  SERVEUR: 'server',
  RESEAU: 'network',
  DELAI: 'timeout',
};

/** Erreur d'envoi, porteuse d'un code et, en 422, des champs fautifs. */
export class SubmitError extends Error {
  constructor(code, { fields = {}, status = 0, retryAfter = null } = {}) {
    super(code);
    this.name = 'SubmitError';
    this.code = code;
    this.fields = fields;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * `fetch` avec plafond de temps et annulation propre.
 *
 * Sans cela, une requête peut rester en vol indéfiniment : le bouton reste
 * désactivé, le message « Envoi en cours… » ne bouge plus, et le visiteur n'a
 * aucun moyen de reprendre la main. `AbortController` la coupe, et le `finally`
 * libère le minuteur même quand la requête aboutit — un minuteur oublié
 * annulerait une requête suivante.
 */
async function fetchAvecDelai(url, options = {}, signalExterne = null) {
  const controleur = new AbortController();
  const minuteur = window.setTimeout(() => controleur.abort(), TIMEOUT_MS);

  // Le formulaire peut annuler lui-même (changement de page) : les deux
  // signaux comptent.
  if (signalExterne) {
    if (signalExterne.aborted) controleur.abort();
    else signalExterne.addEventListener('abort', () => controleur.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controleur.signal });
  } catch (erreur) {
    if (erreur && erreur.name === 'AbortError') {
      throw new SubmitError(ERREURS.DELAI);
    }
    // TypeError de `fetch` : DNS, connexion refusée, CORS bloqué, hors ligne.
    throw new SubmitError(ERREURS.RESEAU);
  } finally {
    window.clearTimeout(minuteur);
  }
}

/**
 * Demande un jeton au serveur.
 *
 * Le jeton reste EN MÉMOIRE, dans la fermeture de l'appelant. Ni
 * `localStorage`, ni cookie, ni paramètre d'URL, ni mesure d'audience : c'est
 * un secret à courte vie, et un secret rangé quelque part de persistant n'en
 * est plus un.
 *
 * @returns {Promise<{token:string, issuedAt:number}>}
 */
export async function fetchFormToken(signal = null) {
  const url = apiUrl('/form-token');
  if (!url) throw new SubmitError(ERREURS.NON_CONFIGURE);

  const reponse = await fetchAvecDelai(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    // Un jeton mis en cache serait un jeton périmé, et le serveur le refuserait.
    cache: 'no-store',
  }, signal);

  if (!reponse.ok) throw new SubmitError(ERREURS.SERVEUR, { status: reponse.status });

  let corps = null;
  try {
    corps = await reponse.json();
  } catch {
    throw new SubmitError(ERREURS.SERVEUR, { status: reponse.status });
  }

  const token = corps && typeof corps.token === 'string' ? corps.token : '';
  if (!token) throw new SubmitError(ERREURS.SERVEUR, { status: reponse.status });

  return { token, issuedAt: Date.now() };
}

/**
 * Attend, si besoin, que le jeton ait l'âge minimum exigé par le serveur.
 *
 * Le serveur refuse un jeton de moins de deux secondes : c'est ce qui
 * distingue un formulaire rempli d'un script qui demande et poste dans la même
 * foulée. Le jeton étant obtenu au montage du formulaire, un humain a toujours
 * franchi ce seuil depuis longtemps ; cette attente ne se déclenche que dans le
 * cas du renouvellement après expiration, où l'on vient d'en demander un neuf.
 */
async function attendreAgeMinimum(issuedAt) {
  const age = Date.now() - issuedAt;
  const reste = AGE_MINIMUM_MS + MARGE_AGE_MS - age;
  if (reste > 0) await new Promise((r) => window.setTimeout(r, reste));
}

/** Le refus porte-t-il sur le jeton ? */
function estErreurDeJeton(corps) {
  if (!corps || typeof corps !== 'object') return false;
  if (corps.code === ERREURS.JETON) return true;

  return Boolean(corps.fields && corps.fields.formToken);
}

/** Traduit une réponse d'échec en `SubmitError`. */
async function erreurDepuisReponse(reponse) {
  let corps = null;
  try {
    corps = await reponse.json();
  } catch {
    corps = null;
  }

  if (reponse.status === 429) {
    const entete = reponse.headers.get('Retry-After');
    const secondes = entete ? Number.parseInt(entete, 10) : null;
    return new SubmitError(ERREURS.DEBIT, {
      status: 429,
      retryAfter: Number.isFinite(secondes) ? secondes : null,
    });
  }

  if (reponse.status === 422) {
    if (estErreurDeJeton(corps)) return new SubmitError(ERREURS.JETON, { status: 422 });
    /*
     * Pot de miel rempli : le serveur répond `submission_rejected` avec un
     * message volontairement neutre. On garde ce code distinct pour le
     * journal, mais l'interface affichera la même phrase que pour une erreur
     * générale — dire « vous avez rempli le pot de miel » apprendrait à un
     * robot exactement ce qu'il doit éviter la fois suivante.
     */
    if (corps && corps.code === ERREURS.REFUS) return new SubmitError(ERREURS.REFUS, { status: 422 });

    return new SubmitError(ERREURS.VALIDATION, {
      status: 422,
      fields: corps && corps.fields && typeof corps.fields === 'object' ? corps.fields : {},
    });
  }

  return new SubmitError(ERREURS.SERVEUR, { status: reponse.status });
}

/**
 * Envoie la charge, une fois.
 *
 * @returns {Promise<{reference:string}>}
 */
async function posterUneFois(payload, signal) {
  const url = apiUrl('/projects');
  if (!url) throw new SubmitError(ERREURS.NON_CONFIGURE);

  const reponse = await fetchAvecDelai(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  }, signal);

  if (!reponse.ok) throw await erreurDepuisReponse(reponse);

  let corps = null;
  try {
    corps = await reponse.json();
  } catch {
    corps = null;
  }

  const reference = corps && typeof corps.reference === 'string' ? corps.reference : '';

  /*
   * 201 sans référence lisible : la demande EXISTE côté serveur — on ne
   * relance rien, et on ne présente pas cela comme un échec. Le visiteur voit
   * une confirmation sans numéro plutôt qu'une erreur mensongère.
   */
  return { reference };
}

/**
 * Envoie une demande. Une seule reprise, et seulement si le jeton était périmé.
 *
 * Le formulaire peut rester ouvert deux heures — un jeton dure exactement ce
 * temps. Le cas « je remplis, je vais déjeuner, je reviens et j'envoie » est
 * donc réel, et il ne doit pas coûter la saisie. On redemande alors un jeton,
 * on attend son âge minimum, et on retente UNE fois. Pas de boucle : si le
 * second essai échoue aussi, c'est autre chose, et l'insistance ne ferait que
 * multiplier les demandes chez le destinataire.
 *
 * @param {object} options
 * @param {() => object} options.buildPayload    fabrique la charge avec le jeton courant
 * @param {() => Promise<void>} options.renewToken  redemande un jeton et le pose
 * @param {() => number} options.tokenIssuedAt   horodatage du jeton courant
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{reference:string, retried:boolean}>}
 */
export async function submitProject({ buildPayload, renewToken, tokenIssuedAt, signal = null }) {
  if (!apiConfigured()) throw new SubmitError(ERREURS.NON_CONFIGURE);

  try {
    const resultat = await posterUneFois(buildPayload(), signal);
    return { ...resultat, retried: false };
  } catch (erreur) {
    const estJeton = erreur instanceof SubmitError && erreur.code === ERREURS.JETON;
    if (!estJeton) throw erreur;

    await renewToken();
    await attendreAgeMinimum(tokenIssuedAt());

    const resultat = await posterUneFois(buildPayload(), signal);
    return { ...resultat, retried: true };
  }
}

export default submitProject;
