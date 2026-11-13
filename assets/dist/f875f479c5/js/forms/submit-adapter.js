import { apiUrl, apiConfigured, TIMEOUT_MS } from './api-config.js';


const AGE_MINIMUM_MS = 2000;

const MARGE_AGE_MS = 400;



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



async function fetchAvecDelai(url, options = {}, signalExterne = null) {
  const controleur = new AbortController();
  const minuteur = window.setTimeout(() => controleur.abort(), TIMEOUT_MS);



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

    throw new SubmitError(ERREURS.RESEAU);
  } finally {
    window.clearTimeout(minuteur);
  }
}



export async function fetchFormToken(signal = null) {
  const url = apiUrl('/form-token');
  if (!url) throw new SubmitError(ERREURS.NON_CONFIGURE);

  const reponse = await fetchAvecDelai(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },

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



async function attendreAgeMinimum(issuedAt) {
  const age = Date.now() - issuedAt;
  const reste = AGE_MINIMUM_MS + MARGE_AGE_MS - age;
  if (reste > 0) await new Promise((r) => window.setTimeout(r, reste));
}


function estErreurDeJeton(corps) {
  if (!corps || typeof corps !== 'object') return false;
  if (corps.code === ERREURS.JETON) return true;

  return Boolean(corps.fields && corps.fields.formToken);
}


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


    if (corps && corps.code === ERREURS.REFUS) return new SubmitError(ERREURS.REFUS, { status: 422 });

    return new SubmitError(ERREURS.VALIDATION, {
      status: 422,
      fields: corps && corps.fields && typeof corps.fields === 'object' ? corps.fields : {},
    });
  }

  return new SubmitError(ERREURS.SERVEUR, { status: reponse.status });
}



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



  return { reference };
}



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
