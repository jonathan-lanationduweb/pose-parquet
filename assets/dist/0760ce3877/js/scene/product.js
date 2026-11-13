import { lienSur } from '../utils/dom.js';







export const PRODUCT_FIELDS = [
  'id', 'externalId', 'sku', 'name', 'slug',
  'woodSpecies', 'range', 'tone', 'finish', 'parquetType',
  'dimensions', 'compatiblePatterns', 'defaultPattern',
  'visual', 'visualStatus', 'displayOrder', 'active',
];


export const KNOWN_PATTERNS = ['lames', 'point-de-hongrie', 'baton-rompu'];



export const VISUAL_STATUS = ['ready', 'approximate', 'unavailable'];







export const TEXTURE_KEYS = {
  base: 'rgb', grain: 'rgb',
  warm: [0, 30], spread: [0, 40],
  grainLines: [0, 30], grainAlpha: [0, 0.6], grainWidth: [0.004, 0.06],
  knots: [0, 4], knotSize: [0, 0.2], knotDepth: [0, 1],
  contrast: [0, 2], bevel: [0, 0.08], joint: [0, 1], sheen: [0, 0.2], cracks: [0, 0.6],
};

const SURFACE_KEYS = { roughness: [0.05, 1], clearcoat: [0, 0.6] };

export const CONTROLES_MATIERE = ['motif', 'largeur', 'couleur', 'variation', 'finition', 'comparaison'];

export const SEUIL_DELTA_E = 8;



export function validerProfilMatiere(profil, fiche) {
  const raisons = [];
  const non = (r) => raisons.push(r);
  if (!profil || typeof profil !== 'object') return { ok: false, raisons: ['profil absent'] };
  if (profil.verdict !== 'ready') non(`verdict « ${profil.verdict || 'absent'} »`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(profil.valideLe || ''))) non('date de validation absente');

  const d = fiche.dimensions || {};
  if (profil.motif !== fiche.defaultPattern || !(fiche.compatiblePatterns || []).includes(profil.motif)) {
    non(`motif validé « ${profil.motif} » ≠ motif du produit « ${fiche.defaultPattern} »`);
  }
  if (!Number.isFinite(profil.largeurMm) || profil.largeurMm !== d.widthMm) non(`largeur validée ${profil.largeurMm} ≠ fiche ${d.widthMm}`);
  if (!Number.isFinite(profil.longueurMm) || profil.longueurMm !== d.lengthMm) non(`longueur validée ${profil.longueurMm} ≠ fiche ${d.lengthMm}`);
  if (fiche.unsupportedPattern) non('motif non pris en charge');

  const tex = profil.texture || {};
  for (const [cle, borne] of Object.entries(TEXTURE_KEYS)) {
    const v = tex[cle];
    if (borne === 'rgb') {
      if (!Array.isArray(v) || v.length !== 3 || !v.every((c) => Number.isInteger(c) && c >= 0 && c <= 255)) non(`texture.${cle} : couleur invalide`);
    } else if (!Number.isFinite(v) || v < borne[0] || v > borne[1]) non(`texture.${cle} hors bornes [${borne}] : ${v}`);
  }
  Object.keys(tex).filter((k) => !(k in TEXTURE_KEYS)).forEach((k) => non(`texture.${k} : réglage inconnu du moteur`));
  for (const [cle, v] of Object.entries(profil.surface || {})) {
    const borne = SURFACE_KEYS[cle];
    if (!borne) non(`surface.${cle} : réglage inconnu du moteur`);
    else if (!Number.isFinite(v) || v < borne[0] || v > borne[1]) non(`surface.${cle} hors bornes : ${v}`);
  }
  if (profil.angleDeg !== undefined && (profil.motif !== 'point-de-hongrie' || !(profil.angleDeg >= 15 && profil.angleDeg <= 75))) {
    non(`angleDeg réservé au point de Hongrie, entre 15 et 75° : ${profil.angleDeg}`);
  }

  const ref = profil.reference || {};
  const vignette = fiche.visual && fiche.visual.thumbnail;
  if (!vignette || ref.image !== vignette) non('la référence n’est pas la vignette de cette fiche');
  if (ref.propreAuProduit !== true) non('photo de référence non vérifiée comme propre au produit');

  const c = profil.controle || {};
  CONTROLES_MATIERE.filter((k) => c[k] !== true).forEach((k) => non(`contrôle « ${k} » non validé`));
  if (c.contradiction !== false) non('contradiction non écartée');
  const de = profil.mesure && profil.mesure.deltaE;
  if (!Number.isFinite(de) || de > SEUIL_DELTA_E) non(`écart de couleur ${de} > ${SEUIL_DELTA_E}`);

  return { ok: raisons.length === 0, raisons };
}





const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return Number.isFinite(n) ? n : null;
};



const UNITES = { mm: 1, millimetre: 1, millimètre: 1, cm: 10, centimetre: 10, centimètre: 10, m: 1000, metre: 1000, mètre: 1000 };

function dimension(valeur, unite) {
  if (valeur === undefined || valeur === null || valeur === '') {
    return { mm: null, rangeMm: null, probleme: null };
  }
  const texte = String(valeur).trim().toLowerCase().replace(/\s+/g, ' ');




  const inter = texte.match(/^([\d.,]+)\s*(?:à|a|-|–)\s*([\d.,]+)\s*([a-zà-ÿ]*)$/);
  if (inter) {
    const u = UNITES[inter[3] || String(unite || '').toLowerCase()];
    if (!u) return { mm: null, rangeMm: null, probleme: `unité inconnue dans « ${valeur} »` };
    const a = num(inter[1]) * u;
    const b = num(inter[2]) * u;
    if (a === null || b === null) return { mm: null, rangeMm: null, probleme: `intervalle illisible : « ${valeur} »` };
    return { mm: Math.round((a + b) / 2), rangeMm: [Math.round(a), Math.round(b)], probleme: null };
  }

  const simple = texte.match(/^([\d.,]+)\s*([a-zà-ÿ²]*)$/);
  if (!simple) return { mm: null, rangeMm: null, probleme: `valeur illisible : « ${valeur} »` };
  const n = num(simple[1]);
  if (n === null) return { mm: null, rangeMm: null, probleme: `valeur illisible : « ${valeur} »` };
  const suffixe = simple[2] || String(unite || '').toLowerCase();
  const u = UNITES[suffixe];
  if (!u) {
    return {
      mm: null,
      rangeMm: null,
      probleme: suffixe ? `unité inconnue : « ${suffixe} »` : `unité absente pour la valeur ${n}`,
    };
  }
  return { mm: Math.round(n * u), rangeMm: null, probleme: null };
}


const PLAUSIBLE = {
  widthMm: [40, 1200],
  lengthMm: [200, 3000],
  thicknessMm: [5, 40],
};

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');



function patternsOf(raw, warnings) {
  const brut = raw.compatiblePatterns ?? raw.motifs_autorises ?? raw.motifsAutorises ?? raw.patterns;
  const nonSupporte = first(raw.unsupportedPattern, raw.motif_non_supporte);
  if (brut === undefined || brut === null) {
    if (!nonSupporte) warnings.push('motifs non déclarés : pose droite seule');
    return nonSupporte ? [] : ['lames'];
  }
  const liste = (Array.isArray(brut) ? brut : String(brut).split(/[,;|]/))
    .map((m) => String(m).trim())
    .filter((m) => KNOWN_PATTERNS.includes(m));
  if (!liste.length) {



    if (!nonSupporte) warnings.push('aucun motif reconnu : pose droite seule');
    return [];
  }
  return [...new Set(liste)];
}



export function resolveFamily(fiche, familles) {
  const cles = Object.keys(familles);
  if (!cles.length) return { id: null, reason: 'aucune famille chargée' };

  const declaree = fiche.visual && fiche.visual.familyId;
  if (declaree && familles[declaree]) return { id: declaree, reason: 'déclarée' };
  if (familles[fiche.id]) return { id: fiche.id, reason: 'famille homonyme du produit' };

  const norm = (s) => String(s || '').toLowerCase().trim();
  const parDeux = cles.find(
    (k) => norm(familles[k].essence) === norm(fiche.woodSpecies) && norm(familles[k].teinte) === norm(fiche.tone)
  );
  if (parDeux) return { id: parDeux, reason: 'essence + teinte' };

  const parTeinte = cles.find((k) => norm(familles[k].teinte) === norm(fiche.tone));
  if (parTeinte) return { id: parTeinte, reason: 'teinte' };

  const attendue = { clair: 0.85, naturel: 0.72, moyen: 0.6, miel: 0.6, fonce: 0.32, 'foncé': 0.32 }[norm(fiche.tone)];
  const cible = attendue ?? 0.65;
  const proche = cles.reduce((meilleur, k) =>
    Math.abs((familles[k].luminance ?? 0.65) - cible) < Math.abs((familles[meilleur].luminance ?? 0.65) - cible)
      ? k : meilleur
  );
  return { id: proche, reason: `luminance la plus proche de ${cible}` };
}



export function normalizeProduct(raw, familles = {}, profils = {}) {
  const warnings = [];

  const id = first(raw.id, raw.sku, raw.reference, raw.ref, raw.slug);
  if (!id) warnings.push('identifiant absent');
  const name = first(raw.name, raw.nom, raw.libelle, raw.label, id);
  if (!name) warnings.push('libellé absent');




  const uniteSource = first(raw.dimensionUnit, raw.dimensions && raw.dimensions.unit, raw.unite_dimensions);
  const lire = (nom, ...candidats) => {
    const brut = first(...candidats);
    const d = dimension(brut, uniteSource);
    if (d.probleme) warnings.push(`${nom} : ${d.probleme}`);
    else if (d.mm !== null) {
      const [min, max] = PLAUSIBLE[nom];
      if (d.mm < min || d.mm > max) {



        warnings.push(`${nom} rejetée, invraisemblable : ${d.mm} mm (attendu ${min}–${max})`);
        return { mm: null, rangeMm: null, probleme: null };
      }
    }
    return d;
  };

  const w = lire('widthMm', raw.dimensions && raw.dimensions.widthMm, raw.widthMm, raw.largeur_lame, raw.boardWidth, raw.largeur);
  if (w.mm === null && !w.probleme) warnings.push('largeur de lame absente');
  const l = lire('lengthMm', raw.dimensions && raw.dimensions.lengthMm, raw.lengthMm, raw.longueur_lame, raw.boardLength, raw.longueur, raw.longueur_variable);
  const t = lire('thicknessMm', raw.dimensions && raw.dimensions.thicknessMm, raw.thicknessMm, raw.epaisseur, raw.epaisseur_mm);
  const widthMm = w.mm;
  const lengthMm = l.mm;
  const thicknessMm = t.mm;

  const compatiblePatterns = patternsOf(raw, warnings);
  const demande = first(raw.defaultPattern, raw.motif_par_defaut, raw.motifParDefaut);
  const defaultPattern = compatiblePatterns.includes(demande) ? demande : compatiblePatterns[0];

  const rawVisual = raw.visual || {};
  const fiche = {
    id: id || null,
    externalId: first(raw.externalId, raw.external_id, raw.wp_id, raw.post_id) || null,
    sku: first(raw.sku, raw.reference, raw.ref) || null,
    name: name || null,
    slug: first(raw.slug, slugify(name)) || null,
    woodSpecies: first(raw.woodSpecies, raw.species, raw.essence, raw.wood, raw.bois) || null,
    range: first(raw.range, raw.gamme, raw.collection) || null,
    tone: first(raw.tone, raw.teinte, raw.couleur) || null,
    toneSource: first(raw.toneSource) || null,





    finish: first(raw.finish, raw.finition) || null,
    surfaceTreatment: first(raw.surfaceTreatment, raw.treatment, raw.aspect, raw.traitement_surface) || null,
    parquetType: first(raw.parquetType, raw.type_parquet, raw.typeParquet, raw.type) || null,
    dimensions: { widthMm, lengthMm, thicknessMm, lengthRangeMm: l.rangeMm },
    compatiblePatterns,
    defaultPattern,
    visual: {
      familyId: first(rawVisual.familyId, raw.visualFamily, raw.famille_rendu, raw.familleRendu, raw.renderFamily) || null,

      thumbnail: first(rawVisual.thumbnail, raw.thumbnail, raw.image) || null,
      image: first(rawVisual.image, raw.image) || null,
      sample: first(rawVisual.sample, raw.sample, raw.samplePhoto) || null,

      albedo: first(rawVisual.albedo, raw.albedo, raw.maps && raw.maps.albedo) || null,
      normal: first(rawVisual.normal, raw.normal, raw.maps && raw.maps.normal) || null,
      roughness: first(rawVisual.roughness, raw.roughness, raw.maps && raw.maps.roughness) || null,
      plankVariants: rawVisual.plankVariants || raw.plankVariants || null,
    },









    productUrl: lienSur(first(raw.productUrl, raw.product_url, raw.url)),



    unsupportedPattern: first(raw.unsupportedPattern, raw.motif_non_supporte) || null,

    visualReason: first(raw.visualReason) || null,
    source: first(raw.source, raw.origine) || null,
    displayOrder: num(first(raw.displayOrder, raw.ordre_affichage, raw.ordreAffichage, raw.order)) ?? 0,
    active: first(raw.active, raw.actif, raw.enabled) !== false,
    warnings,
  };



  const declareeSansRendu = first(raw.visualStatus, raw.visual_status) === 'unavailable' && !fiche.visual.familyId && !fiche.visual.albedo;
  const famille = declareeSansRendu ? { id: null, reason: 'aucun rendu déclaré par la source' } : resolveFamily(fiche, familles);
  fiche.visual.familyId = famille.id;
  fiche.visual.familyReason = famille.reason;



  fiche.visual.params = declareeSansRendu ? null : raw.texture || (familles[famille.id] && familles[famille.id].texture) || null;
  fiche.patternProfiles = first(raw.patternProfiles, raw.profils_motifs, raw.profilsMotifs) || null;



  fiche.materialProfile = null;
  const profil = profils[fiche.sku] || profils[fiche.id];
  if (profil && !declareeSansRendu) {
    const verdict = validerProfilMatiere(profil, fiche);
    if (verdict.ok) {
      fiche.materialProfile = profil;
      fiche.visual.params = profil.texture;
      fiche.visual.familyReason = 'profil matière validé';
    } else if (profil.verdict === 'ready') {
      warnings.push(`profil matière refusé : ${verdict.raisons.join(' ; ')}`);
    }
  }







  const declare = first(raw.visualStatus, raw.visual_status);
  if (fiche.unsupportedPattern) {
    fiche.visualStatus = 'unavailable';
    warnings.push(`motif non pris en charge par le moteur : ${fiche.unsupportedPattern}`);
  } else if (fiche.visual.albedo || fiche.materialProfile) fiche.visualStatus = 'ready';
  else if (fiche.visual.params) fiche.visualStatus = 'approximate';
  else {
    fiche.visualStatus = 'unavailable';
    warnings.push('aucun rendu disponible');
  }





  const cede = declare === 'approximate' && fiche.materialProfile;
  if (declare && !cede && VISUAL_STATUS.indexOf(declare) > VISUAL_STATUS.indexOf(fiche.visualStatus)) {
    fiche.visualStatus = declare;
  }



  if (fiche.dimensions.widthMm === null && fiche.visualStatus !== 'unavailable') {
    fiche.visualStatus = 'unavailable';
    warnings.push('largeur inutilisable : rendu à l’échelle impossible');
  }

  return fiche;
}





function profilsDepuisDimensions(fiche) {
  const w = fiche.dimensions.widthMm;
  const l = fiche.dimensions.lengthMm;
  if (w === null) return null;
  const profil = { width: w / 1000 };
  if (l !== null) profil.length = l / 1000;


  const mp = fiche.materialProfile;
  if (mp && l !== null) profil.exactLength = true;
  const out = {};
  fiche.compatiblePatterns.forEach((p) => {
    out[p] = { ...profil };
    if (mp && p === 'point-de-hongrie' && mp.angleDeg) out[p].angleDeg = mp.angleDeg;
  });
  return out;
}

export function toMaterial(fiche) {
  return {
    id: fiche.id,
    name: fiche.name,
    slug: fiche.slug,
    wood: fiche.woodSpecies,
    tone: fiche.tone,



    finish: [fiche.finish, fiche.surfaceTreatment].filter(Boolean).join(' ') || null,
    boardWidth: fiche.dimensions.widthMm !== null ? fiche.dimensions.widthMm / 1000 : null,
    boardLength: fiche.dimensions.lengthMm !== null ? fiche.dimensions.lengthMm / 1000 : null,
    defaultPattern: fiche.defaultPattern,
    compatiblePatterns: fiche.compatiblePatterns,
    texture: fiche.visual.params,


    ...((fiche.materialProfile && fiche.materialProfile.surface) || {}),







    patternProfiles: fiche.patternProfiles || profilsDepuisDimensions(fiche),
    maps: {
      albedo: fiche.visual.albedo,
      normal: fiche.visual.normal,
      roughness: fiche.visual.roughness,
    },
    proceduralFallback: !fiche.visual.albedo,
    dimensions: {
      width: fiche.dimensions.widthMm !== null ? fiche.dimensions.widthMm / 1000 : null,
      length: fiche.dimensions.lengthMm !== null ? fiche.dimensions.lengthMm / 1000 : null,
    },
    product: fiche,
  };
}









const fichiers = new Map();
export function lireJson(url) {
  if (!fichiers.has(url)) {
    fichiers.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`introuvable : ${url}`);
      return r.json();
    }).catch(error => {
      fichiers.delete(url);
      throw error;
    }));
  }
  return fichiers.get(url);
}



export const estProposable = (fiche) =>
  Boolean(fiche && fiche.active && fiche.id && fiche.visualStatus !== 'unavailable');

export async function loadProducts(base = '') {
  const manifeste = await fetch(`${base}data/render-families.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  const families = manifeste.familles || {};

  const profils = manifeste.profils ? ((await lireJson(`${base}${manifeste.profils}`).catch(() => ({}))).profils || {}) : {};
  const sources = Array.isArray(manifeste.catalogues)
    ? manifeste.catalogues
    : [{ fichier: manifeste.catalogue || 'data/parquets.json', source: 'demonstration' }];

  const toutes = [];
  for (const s of sources) {
    const data = await lireJson(`${base}${s.fichier}`);
    const brutes = Array.isArray(data.produits) ? data.produits : data.parquets;
    if (!Array.isArray(brutes)) throw new Error(`catalogue vide ou mal formé : ${s.fichier}`);
    brutes.forEach((r) => toutes.push(normalizeProduct({ source: s.source, ...r }, families, profils)));
  }
  const source = sources.map((s) => s.fichier).join(' + ');
  const products = toutes.filter(estProposable).sort((a, b) => a.displayOrder - b.displayOrder);

  return { products, rejected: toutes.filter((f) => !products.includes(f)), families, source };
}







export function validateCatalog(fiches, families = {}) {
  const problemes = [];
  const vus = new Set();
  const parStatut = { ready: 0, approximate: 0, unavailable: 0 };

  fiches.forEach((f) => {
    const dire = (gravite, quoi) => problemes.push({ id: f.id || '(sans id)', gravite, quoi });

    if (!f.id) dire('bloquant', 'identifiant absent');
    else if (vus.has(f.id)) dire('bloquant', 'identifiant en doublon');
    else vus.add(f.id);

    if (!f.name) dire('bloquant', 'libellé absent');
    if (f.dimensions.widthMm === null) dire('bloquant', 'largeur de lame absente');
    else if (f.dimensions.widthMm < PLAUSIBLE.widthMm[0] || f.dimensions.widthMm > PLAUSIBLE.widthMm[1]) {
      dire('bloquant', `largeur invraisemblable : ${f.dimensions.widthMm} mm`);
    } else if (f.dimensions.widthMm > 400 && !f.unsupportedPattern) {



      dire('bloquant', `largeur de ${f.dimensions.widthMm} mm sans motif non supporté déclaré`);
    }
    if (f.dimensions.lengthMm !== null && f.dimensions.lengthMm < f.dimensions.widthMm) {
      dire('bloquant', 'longueur inférieure à la largeur');
    }

    if (!f.visual.familyId && !f.visual.albedo && !f.materialProfile) dire('bloquant', 'ni famille de rendu ni carte matière');
    else if (f.visual.familyId && !families[f.visual.familyId] && !f.visual.albedo) {
      dire('bloquant', `famille de rendu inconnue : ${f.visual.familyId}`);
    }

    const inconnus = f.compatiblePatterns.filter((p) => !KNOWN_PATTERNS.includes(p));
    if (inconnus.length) dire('bloquant', `motifs inconnus : ${inconnus.join(', ')}`);
    if (f.compatiblePatterns.length && !f.compatiblePatterns.includes(f.defaultPattern)) {
      dire('bloquant', 'motif par défaut hors des motifs autorisés');
    }
    if (!f.compatiblePatterns.length && !f.unsupportedPattern) {
      dire('bloquant', 'aucun motif posable, et aucun motif non supporté déclaré');
    }
    if (f.unsupportedPattern) dire('signalement', `motif « ${f.unsupportedPattern} » non pris en charge — produit écarté`);

    if (!VISUAL_STATUS.includes(f.visualStatus)) dire('bloquant', `statut visuel inconnu : ${f.visualStatus}`);
    parStatut[f.visualStatus] = (parStatut[f.visualStatus] || 0) + 1;


    if (!f.sku) dire('signalement', 'référence commerciale absente');
    if (!f.externalId) dire('signalement', 'identifiant source absent');
    if (!f.range) dire('signalement', 'gamme absente');
    if (!f.finish) dire('signalement', 'finition absente : la brillance sera devinée');
    if (!f.parquetType) dire('signalement', 'type de parquet absent');
    if (f.dimensions.thicknessMm === null) dire('signalement', 'épaisseur absente');
    if (f.visualStatus === 'approximate') {
      dire('signalement', `rendu approché (famille « ${f.visual.familyId} », ${f.visual.familyReason})`);
    }
    if (!f.visual.thumbnail) dire('signalement', 'vignette catalogue absente');
    f.warnings.forEach((w) => dire('signalement', w));
  });

  return {
    ok: !problemes.some((p) => p.gravite === 'bloquant'),
    total: fiches.length,
    parStatut,
    problemes,
  };
}
