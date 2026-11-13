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


export const modeDiagnostic = () => actif;



export function avertir(...args) {
  if (actif) console.warn(...args);
}
