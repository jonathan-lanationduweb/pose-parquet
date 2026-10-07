/**
 * Contrôle : un « Rendu fidèle » est-il mérité, et reste-t-il honnête ?
 *
 *   node _generator/check-matieres.js
 *
 * « ready » ne veut pas dire « ça ressemble ». Il veut dire : une matière a
 * été construite pour CETTE référence, comparée à sa photo et validée
 * (data/material-profiles.json, js/scene/product.js `validerProfilMatiere`).
 * Ce contrôle vérifie ce qu'une relecture ne voit pas :
 *
 *   §1  chaque profil « ready » passe le validateur contre sa fiche, chaque
 *       refus dit ce qui manque ;
 *   §2  ready ⇔ profil validé — aucun ready sans profil, aucun refus en ready ;
 *   §3  les réglages déclarés sont ceux que le moteur lit, et eux seuls ;
 *   §4  la largeur et la longueur DESSINÉES sont celles du produit ;
 *   §5  les motifs restent ceux de la fiche ;
 *   §6  aucune photo commerciale n'est posée au sol ;
 *   §7  l'interface ne présente jamais un indicatif comme fidèle.
 *
 * La partie §7 lit l'accueil CONSTRUIT : à exécuter après le build.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRODUIT = require('../js/scene/product.js');
const TEXTURE = require('../js/scene/texture.js');
const { CATALOGUE, NB_PREMIBEL, NB_PREMIBEL_VISU, NB_PREMIBEL_FIDELE, mentionRendu } = require('./catalogue');

const RACINE = path.join(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const json = (rel) => JSON.parse(lire(rel));

let reussis = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { reussis += 1; console.log(`  OK   ${nom}`); }
  else { echecs.push(nom + (detail ? ` — ${detail}` : '')); console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`); }
}
const titre = (t) => console.log(`\n== ${t} ==`);

const manifeste = json('data/render-families.json');
const source = json('data/products.premibel.json').produits;
const parSku = new Map(source.map((f) => [f.sku, f]));
const fiches = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].filter((f) => f.source === 'premibel');
const ficheDe = new Map(fiches.map((f) => [f.sku, f]));

/* ------------------------------------------------------------------ */
titre('§1 Profils');
verifier('le manifeste déclare le fichier des profils', typeof manifeste.profils === 'string' && fs.existsSync(path.join(RACINE, manifeste.profils)), String(manifeste.profils));
const profils = json(manifeste.profils).profils || {};
const entrees = Object.entries(profils);
const prets = entrees.filter(([, p]) => p.verdict === 'ready');
const refus = entrees.filter(([, p]) => p.verdict !== 'ready');
verifier(`verdict connu pour chaque profil (${entrees.length})`, entrees.every(([, p]) => ['ready', 'approximate'].includes(p.verdict)));
const orphelins = entrees.filter(([sku]) => !parSku.has(sku) || !parSku.get(sku).active);
verifier('chaque profil désigne une fiche Premibel active', orphelins.length === 0, orphelins.map(([s]) => s).join(', '));
const refusMuets = refus.filter(([, p]) => !(typeof p.raison === 'string' && p.raison.length >= 30 && Array.isArray(p.manque) && p.manque.length));
verifier(`chaque refus dit pourquoi et ce qui manque (${refus.length})`, refusMuets.length === 0, refusMuets.map(([s]) => s).join(', '));
for (const [sku, p] of prets) {
  const f = ficheDe.get(sku);
  // La fiche telle qu'elle était AVANT le profil : on revalide de zéro.
  const brute = f && PRODUIT.normalizeProduct({ source: 'premibel', ...parSku.get(sku) }, manifeste.familles || {});
  const v = brute ? PRODUIT.validerProfilMatiere(p, brute) : { ok: false, raisons: ['fiche introuvable'] };
  verifier(`${sku} : profil validé (${p.motif}, ${p.largeurMm} × ${p.longueurMm} mm, ΔE ${p.mesure && p.mesure.deltaE})`, v.ok, v.raisons.join(' ; '));
}

/* ------------------------------------------------------------------ */
titre('§2 Ready ⇔ profil validé');
const readies = fiches.filter((f) => f.active && f.visualStatus === 'ready');
const readySansProfil = readies.filter((f) => !f.materialProfile && !f.visual.albedo);
verifier(`aucun « ready » sans profil validé ni carte (${readies.length} ready)`, readySansProfil.length === 0, readySansProfil.map((f) => f.sku).join(', '));
const refusEnReady = refus.filter(([sku]) => ficheDe.get(sku) && ficheDe.get(sku).visualStatus === 'ready');
verifier('aucune référence refusée ne se présente en « ready »', refusEnReady.length === 0, refusEnReady.map(([s]) => s).join(', '));
verifier(`chaque profil « ready » donne une fiche « ready » (${prets.length})`, prets.every(([sku]) => ficheDe.get(sku) && ficheDe.get(sku).visualStatus === 'ready'));
const parStatut = fiches.filter((f) => f.active).reduce((a, f) => ((a[f.visualStatus] = (a[f.visualStatus] || 0) + 1), a), {});
verifier(`catalogue : ${NB_PREMIBEL} actives = ${parStatut.ready || 0} ready + ${parStatut.approximate || 0} approximate + ${parStatut.unavailable || 0} unavailable`,
  NB_PREMIBEL === (parStatut.ready || 0) + (parStatut.approximate || 0) + (parStatut.unavailable || 0));
verifier(`visualisables : ${NB_PREMIBEL_VISU} = ready + approximate, dont ${NB_PREMIBEL_FIDELE} fidèles`,
  NB_PREMIBEL_VISU === (parStatut.ready || 0) + (parStatut.approximate || 0) && NB_PREMIBEL_FIDELE === (parStatut.ready || 0));

/* ------------------------------------------------------------------ */
titre('§3 Des réglages que le moteur lit');
const codeTexture = lire('js/scene/texture.js');
const codeMatiere = lire('js/scene/material.js');
const nonLus = Object.keys(PRODUIT.TEXTURE_KEYS).filter((k) => !new RegExp(`tex\\.${k}\\b`).test(codeTexture) && !new RegExp(`texture\\.${k}\\b`).test(codeMatiere));
verifier(`les ${Object.keys(PRODUIT.TEXTURE_KEYS).length} réglages de texture sont tous lus par le moteur`, nonLus.length === 0, nonLus.join(', '));
verifier('rugosité et vernis du profil sont lus par createMaterial', /entry\.roughness/.test(codeMatiere) && /entry\.clearcoat/.test(codeMatiere));
verifier('l’angle du point de Hongrie est lu par patternProfile', /declared\.angleDeg/.test(codeTexture));

/* ------------------------------------------------------------------ */
titre('§4 Largeur et longueur dessinées');
for (const f of readies) {
  const m = PRODUIT.toMaterial(f);
  const motif = f.materialProfile.motif;
  const profil = TEXTURE.patternProfile(m, motif);
  const d = TEXTURE.dimensionsDessinees(profil, motif);
  const ecartL = Math.abs(d.largeurMm - f.dimensions.widthMm) / f.dimensions.widthMm;
  const ecartLong = Math.abs(d.longueurMm - f.dimensions.lengthMm) / f.dimensions.lengthMm;
  verifier(`${f.sku} : dessiné ${d.largeurMm.toFixed(1)} × ${d.longueurMm.toFixed(0)} mm pour ${f.dimensions.widthMm} × ${f.dimensions.lengthMm} (≤ 2 %)`,
    profil.exactLength && ecartL <= 0.02 && ecartLong <= 0.02, `largeur ${(ecartL * 100).toFixed(1)} %, longueur ${(ecartLong * 100).toFixed(1)} %`);
}
// Les rendus indicatifs ne changent pas : l'arrondi historique reste le leur.
const approxExact = fiches.filter((f) => f.visualStatus === 'approximate').filter((f) => {
  const m = PRODUIT.toMaterial(f);
  return f.compatiblePatterns.some((p) => TEXTURE.patternProfile(m, p).exactLength);
});
verifier('aucun rendu indicatif ne passe en géométrie exacte (pas de régression)', approxExact.length === 0, approxExact.slice(0, 8).map((f) => f.sku).join(', '));

/* ------------------------------------------------------------------ */
titre('§5 Motifs');
for (const f of readies) {
  const m = PRODUIT.toMaterial(f);
  const cles = Object.keys(m.patternProfiles || {}).sort().join(',');
  verifier(`${f.sku} : motif validé « ${f.materialProfile.motif} » dans [${f.compatiblePatterns}], aucun motif ajouté`,
    f.compatiblePatterns.includes(f.materialProfile.motif) && cles === [...f.compatiblePatterns].sort().join(','), cles);
}
const pdhSansAngle = prets.filter(([, p]) => p.motif === 'point-de-hongrie' && !p.angleDeg);
verifier('un point de Hongrie « ready » déclare l’angle relevé', pdhSansAngle.length === 0, pdhSansAngle.map(([s]) => s).join(', '));

/* ------------------------------------------------------------------ */
titre('§6 Photo ≠ texture');
const cartesPhoto = fiches.filter((f) => {
  const maps = PRODUIT.toMaterial(f).maps || {};
  return Object.values(maps).some((v) => v && (/products\/premibel\/|premibel\.fr|^https?:/i.test(v) || v === f.visual.thumbnail));
});
verifier('aucune fiche ne pose une photo produit comme carte matière', cartesPhoto.length === 0, cartesPhoto.map((f) => f.sku).join(', '));
const texteEnTexture = readies.filter((f) => Object.values(f.visual.params).some((v) => typeof v === 'string'));
verifier('les réglages d’un profil sont des nombres, jamais une image', texteEnTexture.length === 0, texteEnTexture.map((f) => f.sku).join(', '));
verifier('le moteur de texture ne lit aucune vignette', !/thumbnail|\.webp|\.jpg/.test(codeTexture) && !/visual\.thumbnail/.test(codeMatiere));
const empreinte = (rel) => crypto.createHash('sha1').update(fs.readFileSync(path.join(RACINE, rel))).digest('hex');
const empreintes = new Map();
source.filter((f) => f.active && f.thumbnail).forEach((f) => {
  const e = empreinte(f.thumbnail);
  empreintes.set(e, [...(empreintes.get(e) || []), f.sku]);
});
for (const [sku, p] of prets) {
  const ref = p.reference || {};
  const existe = typeof ref.image === 'string' && fs.existsSync(path.join(RACINE, ref.image));
  const partage = existe ? (empreintes.get(empreinte(ref.image)) || []).filter((s) => s !== sku) : [];
  verifier(`${sku} : photo de référence locale et propre au produit`, existe && ref.propreAuProduit === true && partage.length === 0, partage.join(', ') || (existe ? '' : 'absente'));
}

// Même photo à l'empreinte perceptuelle (réencodage, recadrage léger) — pas
// seulement à l'octet près — et jamais un visuel « image indisponible ».
const QUALITE = require('./vignettes-qualite.js');
const indexVignettes = json('_generator/premibel-thumbs.json');
const actifsAvecEmpreinte = source.filter((f) => f.active && indexVignettes[f.sku] && indexVignettes[f.sku].empreinte);
for (const [sku] of prets) {
  const e = indexVignettes[sku];
  const jumeaux = actifsAvecEmpreinte.filter((f) => f.sku !== sku && QUALITE.memePhoto(e, indexVignettes[f.sku])).map((f) => f.sku);
  verifier(`${sku} : photo unique à l'empreinte, ni placeholder ni bandeau`, Boolean(e && e.empreinte) && jumeaux.length === 0 && !QUALITE.vignetteEcartee(sku, e), jumeaux.join(', '));
}

/* ------------------------------------------------------------------ */
titre('§7 Affichage');
const catalogJs = lire('js/studio/catalog.js');
verifier('tiroir : « ready » seulement si la fiche est « ready »', /fiche\.visualStatus === 'ready' \? 'ready' : 'approximate'/.test(catalogJs));
verifier('tiroir : les trois libellés gardent leur sens',
  /approximate: \['approx', 'Rendu indicatif'\]/.test(catalogJs) && /ready: \['ready', 'Rendu fidèle'\]/.test(catalogJs) && /Visualisation non disponible/.test(catalogJs));
verifier('sélection du Studio : « Rendu fidèle » conditionné au statut', /fiche\.visualStatus === 'ready' \? 'Rendu fidèle' : 'Rendu indicatif'/.test(lire('js/studio/app.js')));
const previewJs = lire('js/scene/preview.js');
verifier('accueil : la mention vient du statut de la fiche', /\{ ready: ' \(rendu fidèle\)', approximate: ' \(rendu indicatif\)' \}\[fiche\.visualStatus\]/.test(previewJs));
const enDur = fs.readdirSync(path.join(RACINE, '_generator')).filter((n) => n.endsWith('.js') && !n.startsWith('check-'))
  .filter((n) => /\(rendu (fidèle|indicatif)\)/i.test(lire(`_generator/${n}`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')));
verifier('aucune mention de rendu écrite en dur dans le générateur', enDur.length === 0, enDur.join(', '));
const accueil = fs.existsSync(path.join(RACINE, 'index.html')) ? lire('index.html') : '';
const attendue = `Chêne naturel Houston, lames droites${mentionRendu('CHENF39031') ? ` (${mentionRendu('CHENF39031')})` : ''}`;
verifier(`accueil construit : légende « ${attendue} »`, accueil.includes(attendue));
const puces = [...previewJs.matchAll(/material: '([A-Z0-9_]+)'/g)].map((m) => m[1]);
console.log(`       accueil : ${puces.map((s) => `${s} ${(ficheDe.get(s) || {}).visualStatus}`).join(' · ')}`);

/* ------------------------------------------------------------------ */
titre('§8 Rendu indicatif : le minimum respecté');
// « Indicatif » n'est pas « n'importe quoi » : clair / moyen / foncé, motif et
// largeur doivent rester ceux de la référence. Bandes de luminance des familles
// de rendu par teinte du catalogue (luminance relative de data/render-families.json).
const BANDES = { clair: [0.75, 0.9], naturel: [0.6, 0.82], chaud: [0.45, 0.65], fonce: [0.25, 0.45] };
const famillesRendu = manifeste.familles || {};
const indicatifs = fiches.filter((f) => f.active && f.visualStatus === 'approximate');
const horsBande = indicatifs.filter((f) => {
  const b = BANDES[f.tone]; const fam = famillesRendu[f.visual.familyId];
  return b && fam && !(fam.luminance >= b[0] && fam.luminance <= b[1]);
});
verifier(`teinte : famille de rendu dans la bande de la teinte catalogue (${indicatifs.filter((f) => BANDES[f.tone]).length} fiches à teinte connue)`,
  horsBande.length === 0, horsBande.map((f) => `${f.sku} ${f.tone}→${f.visual.familyId}`).join(', '));
const largeurFausse = indicatifs.filter((f) => {
  const m = PRODUIT.toMaterial(f);
  const d = TEXTURE.dimensionsDessinees(TEXTURE.patternProfile(m, f.defaultPattern), f.defaultPattern);
  return Math.abs(d.largeurMm - f.dimensions.widthMm) / f.dimensions.widthMm > 0.03;
});
verifier(`largeur dessinée = largeur produit à 3 % près (${indicatifs.length} indicatifs)`, largeurFausse.length === 0, largeurFausse.slice(0, 8).map((f) => f.sku).join(', '));
const motifHors = indicatifs.filter((f) => !f.compatiblePatterns.includes(f.defaultPattern));
verifier('motif par défaut parmi les motifs du produit', motifHors.length === 0, motifHors.map((f) => f.sku).join(', '));
// Avertissement seulement : un nom ne prouve pas une teinte (« Village Fumé »
// est mesuré à 0,54 sur sa photo, entre Houston et Couronne Impériale).
const SOMBRE = /fum[eé]|smoked|noir|weng[eé]|brown|\bnut\b|tabac|caf[eé]/i;
const nomsSombres = indicatifs.filter((f) => SOMBRE.test(f.name) && (famillesRendu[f.visual.familyId] || {}).luminance > 0.62);
nomsSombres.forEach((f) => console.log(`  WARN ${f.sku} « ${f.name} » → ${f.visual.familyId} (${famillesRendu[f.visual.familyId].luminance}) : nom foncé, famille claire — à confirmer sur la photo`));

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
console.log(`${NB_PREMIBEL} références Premibel : ${parStatut.ready || 0} ready, ${parStatut.approximate || 0} approximate, ${parStatut.unavailable || 0} unavailable — ${refus.length} refus motivés.`);
