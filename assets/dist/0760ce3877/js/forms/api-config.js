const PAR_HOTE = {


  'localhost': 'http://pose-parquet-dev.local/wp-json/pose-parquet/v1',
  '127.0.0.1': 'http://pose-parquet-dev.local/wp-json/pose-parquet/v1',





  'jonathan-lanationduweb.github.io': null,



  'pose-parquet.com': null,
  'www.pose-parquet.com': null,
};


function surcharge() {
  const c = typeof window !== 'undefined' ? window.POSE_PARQUET_CONFIG : null;
  return c && typeof c === 'object' ? c : {};
}



export function apiBaseUrl() {
  const c = surcharge();



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


export function apiConfigured() {
  return apiBaseUrl() !== null;
}


export function apiUrl(chemin) {
  const base = apiBaseUrl();
  return base ? base + (chemin.startsWith('/') ? chemin : `/${chemin}`) : null;
}



export const TIMEOUT_MS = 12000;



export async function apiDisponible(delai = 6000) {
  const url = apiUrl('/health');
  if (!url || typeof fetch !== 'function') return false;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const minuteur = ctrl ? setTimeout(() => ctrl.abort(), delai) : null;
  try {
    const r = await fetch(url, { method: 'GET', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined });
    if (!r.ok) return false;
    const corps = await r.json().catch(() => null);
    return Boolean(corps && corps.status === 'ok');
  } catch {
    return false;
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}



export function hoteLocalNonRelie() {
  const h = typeof window !== 'undefined' ? window.location.hostname : '';
  if (Object.prototype.hasOwnProperty.call(PAR_HOTE, h)) return false;
  return /^\[?::1\]?$|\.localhost$|\.local$|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

export default { apiBaseUrl, apiConfigured, apiUrl, apiDisponible, hoteLocalNonRelie, TIMEOUT_MS };
