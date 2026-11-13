const actif = (() => {
  if (typeof window === 'undefined') return false;
  if (window.__perf === true) return true;
  try {
    return new URLSearchParams(window.location.search).get('perf') === '1';
  } catch {
    return false;
  }
})();

const releves = [];

const taches = [];

if (actif && typeof PerformanceObserver === 'function') {
  try {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => taches.push({ debut: Math.round(e.startTime), duree: Math.round(e.duration) }));
    }).observe({ entryTypes: ['longtask'] });
  } catch {

  }
}

export const perfActif = actif;

export const mark = actif
  ? (nom) => { try { performance.mark(nom); } catch {   } }
  : () => {};



export const mesure = actif
  ? (nom, debut, fin) => {
    try {
      const e = performance.measure(nom, debut, fin);
      const duree = Math.round(e.duration * 100) / 100;
      releves.push({ nom, duree });







      performance.clearMeasures(nom);
      performance.clearMarks(fin);
      return duree;
    } catch {
      return null;
    }
  }
  : () => null;


export const chrono = actif
  ? (nom, fn) => {
    const t0 = performance.now();
    const r = fn();
    releves.push({ nom, duree: Math.round((performance.now() - t0) * 100) / 100 });
    return r;
  }
  : (nom, fn) => fn();



export const noter = actif
  ? (nom, duree) => { if (Number.isFinite(duree)) releves.push({ nom, duree: Math.round(duree * 100) / 100 }); }
  : () => {};



export function rapport() {
  const parNom = new Map();
  releves.forEach(({ nom, duree }) => {
    if (!parNom.has(nom)) parNom.set(nom, []);
    parNom.get(nom).push(duree);
  });
  const lignes = [...parNom.entries()].map(([nom, v]) => {
    const tri = [...v].sort((a, b) => a - b);
    return {
      nom,
      n: v.length,
      mediane: tri[tri.length >> 1],
      min: tri[0],
      max: tri[tri.length - 1],
      total: Math.round(v.reduce((s, x) => s + x, 0) * 10) / 10,
    };
  });
  return {
    lignes: lignes.sort((a, b) => b.total - a.total),
    tachesLongues: { n: taches.length, max: taches.length ? Math.max(...taches.map((t) => t.duree)) : 0, liste: taches.slice(-12) },
  };
}


export function raz() {
  releves.length = 0;
  taches.length = 0;
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch {

  }
}

if (actif && typeof window !== 'undefined') {
  window.__perfRapport = rapport;
  window.__perfRaz = raz;
}
