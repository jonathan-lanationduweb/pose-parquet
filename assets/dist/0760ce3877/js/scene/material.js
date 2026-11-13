import { buildTexture, buildMips, etendreMips, TILE, TILE_METERS } from './texture.js';
import { reliefFromAlbedo } from './relief.js';
import { chrono, noter } from '../utils/perf.js';
import { motifEffectif } from './motifs-regles.js';


const FINISH = {
  brut: { roughness: 0.95, clearcoat: 0.0 },
  huile: { roughness: 0.82, clearcoat: 0.04 },
  mat: { roughness: 0.74, clearcoat: 0.08 },
  satine: { roughness: 0.5, clearcoat: 0.22 },
  vernis: { roughness: 0.34, clearcoat: 0.38 },
  cire: { roughness: 0.6, clearcoat: 0.16 },
};


function finishProfile(label = '', declared) {
  if (declared && FINISH[declared]) return { key: declared, ...FINISH[declared] };
  const text = label.toLowerCase();


  const key = text.includes('brut') || text.includes('bross')
    ? 'brut'
    : text.includes('satin')
      ? 'satine'
      : text.includes('vernis')
        ? text.includes('mat')
          ? 'mat'
          : 'vernis'
        : text.includes('cir')
          ? 'cire'
          : text.includes('huil')
            ? 'huile'
            : 'mat';
  return { key, ...FINISH[key] };
}



export function createMaterial(entry) {
  const finish = finishProfile(entry.finish, entry.finishKind);
  return {
    ...entry,
    plank: {
      width: entry.boardWidth,
      length: entry.boardLength || entry.boardWidth * 9,
      bevel: entry.texture.bevel,
    },
    surface: {
      roughness: Number.isFinite(entry.roughness) ? entry.roughness : finish.roughness,
      clearcoat: Number.isFinite(entry.clearcoat) ? entry.clearcoat : finish.clearcoat,


      relief: Number.isFinite(entry.relief) ? entry.relief : 0.45 - finish.clearcoat * 0.6,
      finishKind: finish.key,
    },
    variation: Number.isFinite(entry.variation) ? entry.variation : entry.texture.spread / 30,


    maps: {
      albedo: (entry.maps && entry.maps.albedo) || null,
      normal: (entry.maps && entry.maps.normal) || null,
      roughness: (entry.maps && entry.maps.roughness) || null,
    },
    hasMaps: Boolean(entry.maps && entry.maps.albedo),
    proceduralFallback: entry.proceduralFallback !== false,

    patternProfiles: entry.patternProfiles || null,
  };
}





const cache = new Map();
const MAX_CACHE = 12;

const NIVEAUX = 5;


const key = (material, config) =>
  `${material.id}|${motifEffectif(material, config.pattern)}|${config.width || 'auto'}|${config.plankLength || 'auto'}`;



const EBAUCHE = 320;
const SUFFIXE_EBAUCHE = '|ebauche';
const cleEbauche = (material, config) => key(material, config) + SUFFIXE_EBAUCHE;



const MOTIFS_LENTS = new Set(['point-de-hongrie', 'baton-rompu']);








function assemble(material, tile, albedo0, relief0) {
  const albedo = [albedo0];
  const relief = [relief0];
  const maps = {
    albedo,
    relief,
    tile,
    meters: TILE_METERS,


    size: albedo0.size,
    surface: material.surface,


    completer() {
      if (albedo.length >= NIVEAUX) return maps;
      chrono('texture.mips+', () => etendreMips(albedo, NIVEAUX));
      chrono('texture.relief+', () => {
        for (let i = relief.length; i < albedo.length; i += 1) relief.push(reliefFromAlbedo(albedo[i], material.surface));
      });
      return maps;
    },
  };
  return maps;
}

function retenir(id, maps) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(id, maps);
  return maps;
}







let worker = null;


let workerRapide = null;
let workerIndisponible = false;
const enCours = new Map();
const abonnes = new Set();
let compteur = 0;

function creerWorker() {
  const w = new Worker(new URL('./texture-worker.js', import.meta.url), { type: 'module' });
  w.onmessage = recevoir;
  w.onerror = panne;
  return w;
}


function obtenirWorker(rapide = false) {
  if (workerIndisponible) return null;
  if (rapide ? workerRapide : worker) return rapide ? workerRapide : worker;
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
    workerIndisponible = true;
    return null;
  }
  try {
    if (rapide) workerRapide = creerWorker();
    else worker = creerWorker();
  } catch {
    workerIndisponible = true;
    return null;
  }
  return rapide ? workerRapide : worker;
}


function recevoir(event) {
  const { id, albedo, relief, erreur, bitmap, durees } = event.data || {};
  const attente = enCours.get(id);
  if (!attente) return;
  enCours.delete(id);
  if (durees) {

    const voie = attente.ebauche ? 'ebauche' : 'definitive';
    Object.entries(durees).forEach(([k, v]) => noter(`worker.${voie}.${k}`, v));
    noter(`worker.${voie}.aller-retour`, performance.now() - attente.poste);
  }
  if (erreur) {
    attente.reject(new Error(erreur));
    return;
  }
  if (bitmap) {

    apercus.set(attente.cle, bitmap);
    attente.resolve(bitmap);
    return;
  }


  const a0 = { size: albedo.size, data: new Uint8ClampedArray(albedo.data.buffer || albedo.data) };
  const r0 = { size: relief.size, data: new Uint8ClampedArray(relief.data.buffer || relief.data) };
  const maps = retenir(attente.cle, assemble(attente.material, null, a0, r0));


  if (!attente.ebauche) cache.delete(attente.cle + SUFFIXE_EBAUCHE);


  if (attente.ebauche && cache.has(attente.cle.slice(0, -SUFFIXE_EBAUCHE.length))) cache.delete(attente.cle);
  attente.resolve(maps);
  abonnes.forEach((cb) => { try { cb(attente.cle, maps); } catch {   } });
}



function panne() {
  enCours.forEach((att) => att.reject(new Error('worker de texture indisponible')));
  enCours.clear();
  [worker, workerRapide].forEach((w) => w && w.terminate());
  worker = null;
  workerRapide = null;
  workerIndisponible = true;
  abonnes.forEach((cb) => { try { cb(null, null); } catch {   } });
}



export function quandCartesPretes(cb) {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}


export function enFabrication(material, config) {
  return [...enCours.values()].some((a) => a.cle === key(material, config));
}



export function materialMapsAsync(material, config = {}) {
  const cle = key(material, config);
  if (cache.has(cle)) return Promise.resolve(cache.get(cle));
  const deja = [...enCours.values()].find((a) => a.cle === cle);
  if (deja) return deja.promesse;
  const w = obtenirWorker();
  if (!w) return Promise.resolve(materialMaps(material, config));



  if (MOTIFS_LENTS.has(motifEffectif(material, config.pattern))) {
    posterTuile(obtenirWorker(true) || w, material, config, true);
  }
  return posterTuile(w, material, config, false);
}



function posterTuile(w, material, config, ebauche) {
  const cle = ebauche ? cleEbauche(material, config) : key(material, config);
  if (cache.has(cle)) return Promise.resolve(cache.get(cle));
  const deja = [...enCours.values()].find((a) => a.cle === cle);
  if (deja) return deja.promesse;

  let resolve; let reject;
  const promesse = new Promise((res, rej) => { resolve = res; reject = rej; });
  const id = (compteur += 1);
  enCours.set(id, { cle, material, resolve, reject, promesse, ebauche, poste: performance.now() });

  w.postMessage({
    id,
    material: JSON.parse(JSON.stringify(material)),
    config: {
      pattern: motifEffectif(material, config.pattern),
      width: config.width || null,
      size: ebauche ? EBAUCHE : undefined,
    },
  });
  return promesse;
}





const apercus = new Map();
const MAX_APERCUS = 24;



export function apercuAsync(material, pattern, size = 320) {
  const cle = `apercu|${material.id}|${pattern}|${size}`;
  if (apercus.has(cle)) return Promise.resolve(apercus.get(cle));
  const deja = [...enCours.values()].find((a) => a.cle === cle);
  if (deja) return deja.promesse;
  const wk = obtenirWorker(true);
  if (!wk) return Promise.resolve(buildTexture(material, { pattern, size }));
  if (apercus.size >= MAX_APERCUS) {
    const premier = apercus.keys().next().value;
    const vieux = apercus.get(premier);
    if (vieux && vieux.close) vieux.close();
    apercus.delete(premier);
  }
  let resolve; let reject;
  const promesse = new Promise((res, rej) => { resolve = res; reject = rej; });
  const id = (compteur += 1);
  enCours.set(id, { cle, material, resolve, reject, promesse });
  wk.postMessage({ id, kind: 'apercu', material: JSON.parse(JSON.stringify(material)), config: { pattern, size } });
  return promesse;
}


export const fabricationAsynchrone = () => Boolean(obtenirWorker());



export function materialMaps(material, config = {}) {
  const id = key(material, config);
  if (cache.has(id)) return cache.get(id);
  if (obtenirWorker()) {
    materialMapsAsync(material, config);


    return cache.get(cleEbauche(material, config)) || null;
  }




  const tile = chrono('texture.tuile', () => buildTexture(material, {
    pattern: motifEffectif(material, config.pattern),
    width: config.width || null,
  }));


  const albedo0 = chrono('texture.mips0', () => buildMips(tile, 1))[0];
  const relief0 = chrono('texture.relief0', () => reliefFromAlbedo(albedo0, material.surface));
  return retenir(id, assemble(material, tile, albedo0, relief0));
}




export function enCache(material, config) {
  return cache.has(key(material, config));
}



export function warmMaterial(material, config) {
  if (cache.has(key(material, config))) return;
  const run = () => { materialMapsAsync(material, config).catch(() => {}); };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run);
  else window.setTimeout(run, 400);
}

export const clearMaterialCache = () => cache.clear();
