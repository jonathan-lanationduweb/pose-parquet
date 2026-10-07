/**
 * Contrôle du catalogue Premibel synchronisé.
 *
 *   node _generator/check-catalogue-premibel.js
 *
 * Il relit `data/products.premibel.json` tel que `sync-premibel.js` l'a écrit,
 * puis tel que le moteur le comprend (`normalizeProduct`), et vérifie :
 *
 *   §1  l'enveloppe   — source, date de génération, endpoint, rapport ;
 *   §2  l'identité    — chaque fiche ACTIVE a id, sku, nom, slug ; SKU, slug et
 *                        identifiant source uniques ; id === sku (liens profonds) ;
 *   §3  les adresses  — productUrl : HTTPS et domaine Premibel (même règle que
 *                        le navigateur, `premibel-hotes.js`) ; aucune URL d'image
 *                        distante dans le fichier public ;
 *   §3b les vignettes — chemin local sûr, fichier présent, vrai WebP, taille
 *                        raisonnable, jamais 0 octet ;
 *   §4  les motifs    — uniquement des motifs connus ; motif par défaut dans la liste ;
 *                        un Versailles ne déclare aucun motif posable ;
 *   §5  le rendu      — statut parmi ready / approximate / unavailable ; un
 *                        « approximate » cite une famille existante ; un
 *                        « unavailable » dit pourquoi ; aucun « ready » sans carte ;
 *                        une photo produit n'est jamais une carte de texture ;
 *   §6  aucun prix    — aucune clé de prix, de tarif ou de promotion, à aucun niveau ;
 *   §7  le moteur     — ce que le Studio proposera correspond au fichier : seules
 *                        les fiches actives et non « unavailable » sont proposées.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const PRODUIT = require('../js/scene/product.js');
const { urlPremibel } = require('../js/commerce/premibel-hotes.js');
const { sansPrix, dimensionsWebp, CHEMIN_PUBLIC_VIGNETTES } = require('./sync-premibel.js');

const RACINE = path.join(__dirname, '..');
const lire = (rel) => JSON.parse(fs.readFileSync(path.join(RACINE, rel), 'utf8'));

let reussis = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { reussis += 1; console.log(`  OK   ${nom}`); }
  else { echecs.push(nom); console.log(`  KO   ${nom}${detail ? ` — ${String(detail).slice(0, 400)}` : ''}`); }
}
const titre = (t) => console.log(`\n== ${t} ==`);

const doc = lire('data/products.premibel.json');
const manifeste = lire('data/render-families.json');
const familles = manifeste.familles || {};
const fiches = doc.produits || [];
const actives = fiches.filter((f) => f.active);

titre('Enveloppe');
verifier('source « premibel »', doc.source === 'premibel');
verifier('date de génération présente et lisible', !Number.isNaN(Date.parse(doc.generatedAt)), doc.generatedAt);
verifier('endpoint Store API déclaré', /^https:\/\/www\.premibel\.fr\/wp-json\/wc\/store\/v1\/products$/.test(doc.endpoint || ''));
verifier('rapport de synchronisation présent', doc.rapport && Number.isInteger(doc.rapport.produitsApi) && doc.rapport.produitsApi >= fiches.filter((f) => f.active).length);
verifier('le manifeste de rendu charge ce fichier', (manifeste.catalogues || []).some((c) => c.fichier === 'data/products.premibel.json' && c.source === 'premibel'));
verifier(`${actives.length} fiches actives, ${fiches.length - actives.length} inactive(s)`, actives.length > 0);

titre('Identité');
const sansIdentite = actives.filter((f) => !f.id || !f.sku || !f.name || !f.slug);
verifier('aucune fiche active sans id, sku, nom ou slug', sansIdentite.length === 0, sansIdentite.map((f) => f.name || f.id).join(', '));
verifier('id === sku pour chaque fiche (les liens profonds citent le SKU)', fiches.every((f) => f.id === f.sku), fiches.filter((f) => f.id !== f.sku).map((f) => f.id).join(', '));
for (const cle of ['sku', 'slug', 'externalId']) {
  const vus = new Map(); const doubles = [];
  for (const f of fiches) {
    if (f[cle] === null || f[cle] === undefined) continue;
    if (vus.has(f[cle])) doubles.push(f[cle]); else vus.set(f[cle], true);
  }
  verifier(`${cle} unique`, doubles.length === 0, doubles.join(', '));
}
const inactivesSansDate = fiches.filter((f) => !f.active && !f.deactivatedAt);
verifier('chaque fiche inactive porte sa date de retrait', inactivesSansDate.length === 0, inactivesSansDate.map((f) => f.id).join(', '));

titre('Adresses');
const urlsHors = fiches.filter((f) => f.productUrl !== null && f.productUrl !== undefined && urlPremibel(f.productUrl) !== f.productUrl).map((f) => f.id);
verifier('toutes les fiches produit sont HTTPS et sur un domaine Premibel', urlsHors.length === 0, urlsHors.join(', '));
const distantes = fiches.filter((f) => ['thumbnail', 'image', 'sample', 'sourceThumbnail'].some((k) => typeof f[k] === 'string' && /^(https?:)?\/\//i.test(f[k])) || 'image' in f || 'sourceThumbnail' in f);
verifier('aucune URL d’image distante dans le fichier public', distantes.length === 0, distantes.map((f) => f.id).join(', '));

titre('Vignettes locales');
const avecVignette = fiches.filter((f) => f.thumbnail);
const prefixe = `${CHEMIN_PUBLIC_VIGNETTES}/`;
const cheminSur = /^assets\/images\/products\/premibel\/[A-Za-z0-9_-]+\.webp$/;
const cheminInsur = avecVignette.filter((f) => !f.thumbnail.startsWith(prefixe) || !cheminSur.test(f.thumbnail));
verifier('chemin relatif sûr (assets/images/products/premibel/<sku>.webp)', cheminInsur.length === 0, cheminInsur.map((f) => `${f.id}:${f.thumbnail}`).join(', '));
const absents = []; const pasWebp = []; const tailles = []; let octets = 0;
for (const f of avecVignette) {
  const fichier = path.join(RACINE, f.thumbnail);
  if (!fs.existsSync(fichier)) { absents.push(f.id); continue; }
  const buf = fs.readFileSync(fichier);
  octets += buf.length;
  if (!dimensionsWebp(buf)) pasWebp.push(f.id);
  if (buf.length === 0 || buf.length < 200 || buf.length > 200 * 1024) tailles.push(`${f.id}:${buf.length}`);
}
verifier(`${avecVignette.length} vignettes présentes sur le disque`, absents.length === 0, absents.join(', '));
verifier('chaque vignette est un vrai WebP (en-tête RIFF/WEBP/VP8)', pasWebp.length === 0, pasWebp.join(', '));
verifier('aucune vignette vide ni hors bornes (200 o – 200 Ko)', tailles.length === 0, tailles.join(', '));
const dossier = path.join(RACINE, CHEMIN_PUBLIC_VIGNETTES);
const residus = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((n) => !/^[A-Za-z0-9_-]+\.webp$/.test(n)) : [];
verifier('aucun fichier temporaire dans le dossier des vignettes', residus.length === 0, residus.join(', '));
console.log(`       ${avecVignette.length} vignettes, ${Math.round(octets / 1024)} Ko au total`);
const actifsSansFiche = actives.filter((f) => !f.productUrl);
verifier('chaque fiche active a une adresse de fiche produit', actifsSansFiche.length === 0, actifsSansFiche.map((f) => f.id).join(', '));

titre('Motifs');
const connus = PRODUIT.KNOWN_PATTERNS;
const inconnus = fiches.filter((f) => (f.compatiblePatterns || []).some((m) => !connus.includes(m)));
verifier('aucun motif inconnu du moteur', inconnus.length === 0, inconnus.map((f) => f.id).join(', '));
const defautHors = fiches.filter((f) => (f.compatiblePatterns || []).length ? !f.compatiblePatterns.includes(f.defaultPattern) : f.defaultPattern !== null);
verifier('motif par défaut dans les motifs déclarés (ou null sans motif)', defautHors.length === 0, defautHors.map((f) => `${f.id}:${f.defaultPattern}`).join(', '));
const versaillesPosables = fiches.filter((f) => f.unsupportedPattern && (f.compatiblePatterns || []).length);
verifier('un motif non supporté ne déclare aucun motif posable', versaillesPosables.length === 0, versaillesPosables.map((f) => f.id).join(', '));

titre('Rendu');
const statuts = new Set(PRODUIT.VISUAL_STATUS);
verifier('statut visuel connu pour chaque fiche', fiches.every((f) => statuts.has(f.visualStatus)));
const approxSansFamille = fiches.filter((f) => f.visualStatus === 'approximate' && !familles[f.visualFamily]);
verifier('chaque « approximate » cite une famille de rendu existante', approxSansFamille.length === 0, approxSansFamille.map((f) => `${f.id}:${f.visualFamily}`).join(', '));
const approxSansMotif = fiches.filter((f) => f.visualStatus === 'approximate' && !(f.compatiblePatterns || []).length);
verifier('chaque « approximate » a au moins un motif posable', approxSansMotif.length === 0, approxSansMotif.map((f) => f.id).join(', '));
const indispoMuettes = fiches.filter((f) => f.visualStatus === 'unavailable' && !f.visualReason);
verifier('chaque « unavailable » dit pourquoi', indispoMuettes.length === 0, indispoMuettes.map((f) => f.id).join(', '));
const pretsSansCarte = fiches.filter((f) => f.visualStatus === 'ready' && !(f.maps && f.maps.albedo));
verifier('aucun « ready » sans carte matière capturée', pretsSansCarte.length === 0, pretsSansCarte.map((f) => f.id).join(', '));
const photoEnTexture = fiches.filter((f) => f.maps && Object.values(f.maps).some((v) => v && (v === f.thumbnail || /premibel\.fr\/wp-content\/uploads|products\/premibel\//.test(v))));
verifier('aucune photo produit utilisée comme carte de texture', photoEnTexture.length === 0, photoEnTexture.map((f) => f.id).join(', '));

titre('Aucun prix');
const prix = sansPrix(doc);
verifier('aucune clé de prix, tarif ou promotion dans le fichier', prix.length === 0, prix.slice(0, 10).join(', '));
const texte = fs.readFileSync(path.join(RACINE, 'data/products.premibel.json'), 'utf8');
verifier('aucun montant en euros dans le fichier', !/\d+[.,]\d{2}\s*(€|EUR)\b|price_html|currency_/i.test(texte));

titre('Ce que le moteur en fera');
// Avec les profils matière validés, exactement comme le Studio lit le catalogue.
const profilsMatiere = manifeste.profils ? lire(manifeste.profils).profils || {} : {};
const normalisees = fiches.map((r) => PRODUIT.normalizeProduct({ source: 'premibel', ...r }, familles, profilsMatiere));
const proposees = normalisees.filter(PRODUIT.estProposable);
const attendues = fiches.filter((f) => f.active && f.visualStatus !== 'unavailable');
verifier(`le moteur propose exactement les ${attendues.length} fiches actives visualisables`, proposees.length === attendues.length, `${proposees.length} proposées`);
// Seule requalification admise : « approximate » → « ready » par un profil validé.
const statutChange = normalisees.filter((n, i) => n.visualStatus !== fiches[i].visualStatus && fiches[i].visualStatus !== 'ready' && !(n.materialProfile && n.visualStatus === 'ready'));
verifier('le moteur ne requalifie aucun statut, hors profil matière validé', statutChange.length === 0, statutChange.slice(0, 10).map((n) => `${n.id}:${n.visualStatus}`).join(', '));
const validation = PRODUIT.validateCatalog(proposees, familles);
verifier('validateCatalog : aucune fiche proposée bloquante', validation.ok, validation.problemes.filter((p) => p.gravite === 'bloquant').slice(0, 6).map((p) => `${p.id}: ${p.quoi}`).join(' | '));

titre('Catalogue public : seulement des références Premibel');
const { NB_PREMIBEL, NB_PREMIBEL_VISU } = require('./catalogue.js');
verifier(`compteur public = références Premibel actives (${NB_PREMIBEL})`, NB_PREMIBEL === actives.length, `${NB_PREMIBEL} annoncé, ${actives.length} dans le fichier`);
verifier(`à essayer = Premibel actives visualisables (${NB_PREMIBEL_VISU})`, NB_PREMIBEL_VISU === attendues.length, `${NB_PREMIBEL_VISU} annoncé, ${attendues.length} attendues`);
const demos = (lire('data/parquets.json').parquets || []).map((d) => d.id);
const demoDansPremibel = fiches.filter((f) => demos.includes(f.id) || demos.includes(f.sku));
verifier(`aucune des ${demos.length} démonstrations dans le fichier Premibel`, demoDansPremibel.length === 0, demoDansPremibel.map((f) => f.id).join(', '));
const catalogueJs = fs.readFileSync(path.join(RACINE, 'js/studio/catalog.js'), 'utf8');
verifier('le tiroir du Studio ne liste que les fiches de source « premibel »', /catalog\.parquets\.filter\(\(m\) => m\.product && m\.product\.source === 'premibel'\)/.test(catalogueJs));
const appJs = fs.readFileSync(path.join(RACINE, 'js/studio/app.js'), 'utf8');
verifier('une démonstration ouverte par lien est signalée « Démonstration »', /selected__status--demo">Démonstration/.test(appJs));

titre('Accueil : la sélection éditoriale');
const preview = fs.readFileSync(path.join(RACINE, 'js/scene/preview.js'), 'utf8');
const bloc = preview.match(/const CHIPS = \[([\s\S]*?)\];/);
const paires = bloc ? [...bloc[1].matchAll(/material:\s*'([^']+)',\s*pattern:\s*'([^']+)'/g)].map((m) => ({ id: m[1], motif: m[2] })) : [];
verifier(`${paires.length} références sur l'accueil`, paires.length === 3);
for (const { id, motif } of paires) {
  const f = fiches.find((x) => x.id === id);
  verifier(`accueil ${id} : référence Premibel active`, Boolean(f && f.active), f ? '' : 'absente du fichier');
  if (!f) continue;
  verifier(`accueil ${id} : visualisable et motif « ${motif} » compatible`, f.visualStatus !== 'unavailable' && f.compatiblePatterns.includes(motif), `${f.visualStatus} [${f.compatiblePatterns}]`);
  verifier(`accueil ${id} : vignette locale présente`, Boolean(f.thumbnail) && fs.existsSync(path.join(RACINE, f.thumbnail)), f.thumbnail || 'aucune');
  verifier(`accueil ${id} : fiche produit précise`, urlPremibel(f.productUrl) === f.productUrl && new URL(f.productUrl).pathname.length > 1, f.productUrl);
}

titre('Repli d’image : seulement sur une vraie erreur');
const echecsImage = (doc.rapport && doc.rapport.vignettes && doc.rapport.vignettes.detailEchecs) || [];
const sansVignette = actives.filter((f) => !f.thumbnail).map((f) => f.sku);
const ecarteesRapport = (doc.rapport && doc.rapport.vignettes && doc.rapport.vignettes.ecartees) || [];
const expliques = new Set([...echecsImage.map((e) => e.sku), ...ecarteesRapport.map((e) => e.sku)]);
verifier('chaque fiche sans vignette a son échec ou sa mise à l’écart documentés', sansVignette.every((s) => expliques.has(s)), sansVignette.filter((s) => !expliques.has(s)).join(', '));
const convertibles = echecsImage.filter((e) => ['JPEG', 'PNG', 'GIF', 'WEBP'].includes(e.format) && e.etape !== 'decode');
verifier('aucun repli pour une source JPEG/PNG convertible', convertibles.length === 0, convertibles.map((e) => `${e.sku} (${e.format}, ${e.etape}: ${e.raison})`).join(' | '));
const indexVignettes = JSON.parse(fs.readFileSync(path.join(__dirname, 'premibel-thumbs.json'), 'utf8'));
const converties = Object.values(indexVignettes).filter((v) => v.converti).length;
console.log(`       ${sansVignette.length} repli(s), ${converties} vignette(s) converties depuis JPEG/PNG`);

/* ------------------------------------------------------------------ */
/* Qualité des vignettes : placeholders, bandeaux, photos partagées.    */
/* ERROR fait échouer ; WARNING se lit, ne bloque pas : deux variantes   */
/* d'un même produit ont le droit de partager leur photo.               */
/* ------------------------------------------------------------------ */
titre('Qualité des vignettes');
const QUALITE = require('./vignettes-qualite.js');
const affichees = actives.filter((f) => f.thumbnail);
const sansEmpreinte = affichees.filter((f) => !(indexVignettes[f.sku] && indexVignettes[f.sku].empreinte));
verifier(`chaque vignette affichée a son empreinte (${affichees.length})`, sansEmpreinte.length === 0, sansEmpreinte.map((f) => f.sku).join(', '));
const placeholdersAffiches = affichees.filter((f) => QUALITE.vignetteEcartee(f.sku, indexVignettes[f.sku]));
verifier('ERROR · aucun placeholder ni bandeau de prix affiché comme photo produit', placeholdersAffiches.length === 0, placeholdersAffiches.map((f) => f.sku).join(', '));
const ecarteesMal = actives.filter((f) => f.thumbnailIssue).filter((f) => f.thumbnail || fs.existsSync(path.join(RACINE, CHEMIN_PUBLIC_VIGNETTES, `${f.sku}.webp`)));
verifier(`ERROR · chaque vignette écartée est absente du site (${actives.filter((f) => f.thumbnailIssue).length})`, ecarteesMal.length === 0, ecarteesMal.map((f) => f.sku).join(', '));

const ecarteesSku = new Set(actives.filter((f) => f.thumbnailIssue === 'placeholder').map((f) => f.sku));
const avecEmpreinte = actives.filter((f) => indexVignettes[f.sku] && indexVignettes[f.sku].empreinte).map((f) => f.sku);
const parSkuActif = new Map(actives.map((f) => [f.sku, f]));
const groupes = QUALITE.groupesPhotos(avecEmpreinte, indexVignettes).map((skus) => {
  const fiches = skus.map((s) => parSkuActif.get(s));
  return { skus, ...QUALITE.classerGroupe(fiches, ecarteesSku) };
});
const parClasse = groupes.reduce((a, g) => ((a[g.classe] = (a[g.classe] || 0) + 1), a), {});
const incorrects = groupes.filter((g) => g.gravite === 'error');
verifier('ERROR · aucune photo partagée entre motifs incompatibles ou essences différentes', incorrects.length === 0, incorrects.map((g) => `${g.skus.join('+')} : ${g.raisons.join(' ; ')}`).join(' | '));
const fideles = new Set(normalisees.filter((n) => n.visualStatus === 'ready').map((n) => n.sku));
const fidelesPartages = groupes.filter((g) => g.skus.some((s) => fideles.has(s)));
verifier(`ERROR · aucune référence « Rendu fidèle » ne partage sa photo (${fideles.size})`, fidelesPartages.length === 0, fidelesPartages.map((g) => g.skus.join('+')).join(' | '));
const douteux = groupes.filter((g) => g.gravite === 'warning');
console.log(`       ${groupes.length} groupes de photos partagées, ${groupes.reduce((n, g) => n + g.skus.length, 0)} SKU : ${Object.entries(parClasse).map(([k, v]) => `${v} ${k}`).join(', ')}`);
douteux.forEach((g) => console.log(`  WARN ${g.skus.join(', ')} — ${g.raisons.join(' ; ')}`));

const pct = (n) => `${Math.round((100 * n) / actives.length)} %`;
const rempli = (fn) => pct(actives.filter(fn).length);
console.log(`\nComplétude (fiches actives) : sku ${rempli((f) => f.sku)} · url ${rempli((f) => f.productUrl)} · image ${rempli((f) => f.thumbnail)} · essence ${rempli((f) => f.species)} · finition ${rempli((f) => f.finish)} · aspect ${rempli((f) => f.treatment)} · largeur ${rempli((f) => f.dimensions && f.dimensions.widthMm)} · épaisseur ${rempli((f) => f.dimensions && f.dimensions.thicknessMm)} · longueur ${rempli((f) => f.dimensions && f.dimensions.lengthMm)} · motif ${rempli((f) => (f.compatiblePatterns || []).length || f.unsupportedPattern)} · teinte ${rempli((f) => f.tone)}`);

if (echecs.length) {
  console.error(`\n${echecs.length} échec(s), ${reussis} réussite(s).`);
  process.exit(1);
}
console.log(`\n${reussis} vérifications réussies, 0 échec.`);
