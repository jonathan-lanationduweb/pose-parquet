/**
 * Contrôle : un parquet ne peut pas être posé dans un motif qu'il ne propose pas.
 *
 *   node _generator/check-motifs.js
 *
 * CE QUI EST VÉRIFIÉ, ET DANS QUEL ORDRE
 *
 *   §1  la donnée     — chaque référence déclare des motifs, et un défaut
 *                       qui en fait partie ;
 *   §2  la règle      — `js/scene/motifs-regles.js`, sur des cas construits
 *                       exprès, dont les trois de la recette ;
 *   §3  le moteur     — aucune résolution de motif ne contourne la règle ;
 *   §4  l'interface   — le Studio désactive, replie, et refuse ;
 *   §5  les entrants  — lien profond, état repris, versions comparées ;
 *   §6  l'accueil     — les paires écrites à la main y sont encore valides.
 *
 * POURQUOI §3 ET §4 SÉPARÉMENT. Une interface qui grise est une explication,
 * pas une garantie : elle se contourne par une URL, par la console, par un
 * état sauvegardé avant que le catalogue ne change. Les deux couches sont donc
 * contrôlées séparément — si l'une tombe, l'autre doit tenir, et le contrôle
 * doit le dire.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const REGLES = require('../js/scene/motifs-regles.js');
const PRODUIT = require('../js/scene/product.js');

let reussis = 0;
const echecs = [];

function verifier(nom, condition, detail = '') {
  if (condition) {
    reussis += 1;
    console.log(`  OK   ${nom}`);
  } else {
    echecs.push(nom + (detail ? ` — ${detail}` : ''));
    console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`);
  }
}

const titre = (t) => console.log(`\n== ${t} ==`);
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* §1 — La donnée est la source de vérité                              */
/* ------------------------------------------------------------------ */

titre('Données : la compatibilité est déclarée, jamais devinée');

const manifeste = JSON.parse(lire('data/render-families.json'));
const familles = manifeste.familles || {};
const sources = manifeste.catalogues || [{ fichier: 'data/parquets.json', source: 'demonstration' }];

const fiches = [];
for (const s of sources) {
  const data = JSON.parse(lire(s.fichier));
  const brutes = Array.isArray(data.produits) ? data.produits : data.parquets;
  brutes.forEach((r) => fiches.push(PRODUIT.normalizeProduct({ source: s.source, ...r }, familles)));
}
const proposees = fiches.filter(PRODUIT.estProposable);

verifier(`${fiches.length} références lues, ${proposees.length} proposées`, proposees.length > 0);

const sansMotif = proposees.filter((f) => REGLES.motifsDe(f).length === 0);
verifier(
  'aucune référence proposée sans motif déclaré',
  sansMotif.length === 0,
  sansMotif.map((f) => f.id).join(', ')
);

const defautHorsListe = proposees.filter((f) => !REGLES.motifsDe(f).includes(f.defaultPattern));
verifier(
  'le motif par défaut appartient toujours aux motifs déclarés',
  defautHorsListe.length === 0,
  defautHorsListe.map((f) => `${f.id} : ${f.defaultPattern} ∉ [${f.compatiblePatterns}]`).join(' | ')
);

const motifInconnu = proposees.filter((f) =>
  (f.compatiblePatterns || []).some((m) => !REGLES.MOTIFS_CONNUS.includes(m))
);
verifier(
  'aucun motif déclaré que le moteur ne sait pas poser',
  motifInconnu.length === 0,
  motifInconnu.map((f) => f.id).join(', ')
);

/* Les écartées le sont pour une raison écrite, pas par oubli. */
const ecartees = fiches.filter((f) => !PRODUIT.estProposable(f));
verifier(
  `${ecartees.length} référence(s) écartée(s), chacune avec sa raison`,
  ecartees.every((f) => f.unsupportedPattern || REGLES.motifsDe(f).length === 0),
  ecartees.map((f) => `${f.id} (${f.unsupportedPattern || 'sans motif'})`).join(', ')
);

const repartition = {};
for (const f of proposees) {
  const k = REGLES.motifsDe(f).join('+');
  repartition[k] = (repartition[k] || 0) + 1;
}
console.log('       répartition : ' + JSON.stringify(repartition));

/* ------------------------------------------------------------------ */
/* §2 — La règle, sur des cas construits                               */
/* ------------------------------------------------------------------ */

titre('Règle : les trois cas de la recette');

const A = { id: 'A', name: 'Parquet A', compatiblePatterns: ['lames'], defaultPattern: 'lames' };
const B = { id: 'B', name: 'Parquet B', compatiblePatterns: ['lames', 'point-de-hongrie'], defaultPattern: 'lames' };
const C = { id: 'C', name: 'Parquet C', compatiblePatterns: ['point-de-hongrie'], defaultPattern: 'point-de-hongrie' };

verifier('A : lames accepté', REGLES.motifAutorise(A, 'lames'));
verifier('A : point de Hongrie refusé', !REGLES.motifAutorise(A, 'point-de-hongrie'));
verifier('A : bâton rompu refusé', !REGLES.motifAutorise(A, 'baton-rompu'));

verifier('B : lames accepté', REGLES.motifAutorise(B, 'lames'));
verifier('B : point de Hongrie accepté', REGLES.motifAutorise(B, 'point-de-hongrie'));
verifier('B : bâton rompu refusé', !REGLES.motifAutorise(B, 'baton-rompu'));

verifier('C : ouvre sur son motif par défaut', REGLES.motifParDefaut(C) === 'point-de-hongrie');
verifier('C : lames refusé', !REGLES.motifAutorise(C, 'lames'));

verifier('motif inconnu refusé', !REGLES.motifAutorise(B, 'motif-bidon'));
verifier('motif vide refusé', !REGLES.motifAutorise(B, '') && !REGLES.motifAutorise(B, null));

/* Une liste vide veut dire « aucun », jamais « tous ». */
const vide = { id: 'V', name: 'Dalle Versailles', compatiblePatterns: [], defaultPattern: null };
verifier('liste vide : aucun motif autorisé', REGLES.MOTIFS_CONNUS.every((m) => !REGLES.motifAutorise(vide, m)));
verifier('liste vide : pas de motif par défaut', REGLES.motifParDefaut(vide) === null);

/* Un champ absent est une information manquante, pas une permission. */
const muet = { id: 'M', name: 'Sans donnée' };
verifier('compatiblePatterns absent : rien n’est autorisé', REGLES.MOTIFS_CONNUS.every((m) => !REGLES.motifAutorise(muet, m)));

/* defaultPattern qui ment : on retombe sur le premier disponible. */
const menteur = { id: 'X', name: 'X', compatiblePatterns: ['baton-rompu'], defaultPattern: 'lames' };
verifier('defaultPattern hors liste : replié sur un motif réel', REGLES.motifParDefaut(menteur) === 'baton-rompu');

titre('Règle : le repli au changement de parquet');

const depart = { materialId: 'B', pattern: 'point-de-hongrie' };
const versA = REGLES.normaliserConfig({ ...depart, materialId: 'A' }, A);
verifier('B + point de Hongrie → A : repli sur lames', versA.config.pattern === 'lames', versA.config.pattern);
verifier('B + point de Hongrie → A : le repli est signalé', versA.adapte === true);

const entree = { materialId: 'B', pattern: 'point-de-hongrie' };
const versB = REGLES.normaliserConfig(entree, B);
verifier('motif déjà compatible : rien n’est touché', versB.config.pattern === 'point-de-hongrie' && versB.adapte === false);
verifier('motif déjà compatible : la configuration est rendue telle quelle', versB.config === entree);

const inconnu = REGLES.normaliserConfig({ materialId: 'B', pattern: 'motif-bidon' }, B);
verifier('lien profond invalide : normalisé sur le défaut', inconnu.config.pattern === 'lames' && inconnu.adapte === true);

verifier('motifEffectif rend toujours un motif posable', REGLES.MOTIFS_CONNUS
  .concat(['motif-bidon', '', null])
  .every((m) => {
    const r = REGLES.motifEffectif(C, m);
    return r === null || REGLES.motifAutorise(C, r);
  }));

titre('Règle : ce qui est dit à l’utilisateur');

verifier(
  'la raison nomme le parquet',
  REGLES.raisonIndisponible(A, 'Point de Hongrie').includes('Parquet A')
);
verifier(
  'un parquet à motif unique le dit',
  REGLES.messageAdaptation(A, 'Lames droites').includes('uniquement')
);
verifier(
  'un parquet multi-motifs ne dit pas « uniquement »',
  !REGLES.messageAdaptation(B, 'Lames droites').includes('uniquement')
);

/* ------------------------------------------------------------------ */
/* §3 — Le moteur ne contourne pas la règle                            */
/* ------------------------------------------------------------------ */

titre('Moteur : aucune résolution de motif hors de la règle');

/*
 * `config.pattern || material.defaultPattern` acceptait n'importe quelle
 * valeur : c'est ce motif-là qu'on interdit de revoir. On lit le code sans
 * ses commentaires, sinon l'explication du défaut compterait comme le défaut.
 */
const sansCommentaires = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const MOTEUR = ['js/scene/material.js', 'js/scene/texture-worker.js', 'js/scene/preview.js', 'js/product/app.js'];
for (const fichier of MOTEUR) {
  const code = sansCommentaires(lire(fichier));
  verifier(
    `${fichier} : pas de « pattern || defaultPattern »`,
    !/\.pattern\s*\|\|\s*\w*\.?defaultPattern/.test(code)
  );
}

verifier(
  'material.js applique motifEffectif',
  /motifEffectif\(/.test(lire('js/scene/material.js'))
);
verifier(
  'texture-worker.js applique la règle de son côté du postMessage',
  /motifEffectif\(/.test(lire('js/scene/texture-worker.js'))
);
verifier(
  'la clé de cache porte le motif effectif, pas le motif demandé',
  /const key = \(material, config\) =>[\s\S]{0,120}motifEffectif\(/.test(lire('js/scene/material.js'))
);

/* ------------------------------------------------------------------ */
/* §4 — L'interface du Studio                                          */
/* ------------------------------------------------------------------ */

titre('Studio : désactive, replie, refuse');

const studio = lire('js/studio/app.js');
const studioNu = sansCommentaires(studio);

verifier('la grille décide avec motifAutorise', /const allowed = motifAutorise\(item, pattern\.id\)/.test(studioNu));
verifier('la carte incompatible est disabled', /card\.disabled = !allowed/.test(studioNu));
verifier('la carte incompatible porte une raison visible', /tile-card__note/.test(studio));
verifier('la carte incompatible porte un nom accessible', /setAttribute\('aria-label', raison\)/.test(studioNu));
verifier('le clic revalide malgré disabled', /if \(!motifAutorise\(material\(\), pattern\.id\)\) return;/.test(studioNu));
verifier('changer de parquet normalise la configuration', /normaliserConfig\(\s*\{ \.\.\.config, materialId: id \}/.test(studioNu));
verifier('changer de parquet rafraîchit la grille', /syncPatterns\(\);\s*\n\s*if \(adapte\)/.test(studioNu));
verifier('le repli est annoncé à l’utilisateur', /poserNote\(messageAdaptation\(/.test(studioNu));
/*
 * Le message doit SURVIVRE au rendu. `paint()` se termine par un
 * `setStatus`, qui effaçait la phrase avant qu'on ait pu la lire : c'est
 * pour cela que la note de repos existe, et c'est cela qu'on vérifie.
 */
verifier('le message d’adaptation survit au rendu', /setStatus\(noteMotif\);/.test(studioNu));
verifier('choisir un motif soi-même efface le message', (studioNu.match(/effacerNote\(\);/g) || []).length >= 3);
verifier('setPattern refuse un motif incompatible', /setPattern: \(id\) => \{\s*\n\s*if \(!motifAutorise\(material\(\), id\)\) return false;/.test(studioNu));
verifier('setPattern rend un booléen', /return true;\s*\n\s*\},\s*\n[\s\S]{0,400}getCapabilities/.test(studioNu));

const css = lire('css/studio-app.css');
verifier('la carte désactivée reste visible, pas masquée', !/\.tile-card\[disabled\][^{]*\{[^}]*display:\s*none/.test(css));
verifier('la raison garde son contraste', /\.tile-card__note[\s\S]{0,200}color: var\(--text-muted\)/.test(css));

/* ------------------------------------------------------------------ */
/* §5 — Tout ce qui entre est normalisé                                */
/* ------------------------------------------------------------------ */

titre('Entrants : lien profond, reprise, comparaison');

verifier('lien profond : normalisé', /const lien = normaliserConfig\(config, chosen\);/.test(studioNu));
verifier('état repris du navigateur : normalisé', /config = normaliserConfig\(fusion, catalog\.get\(fusion\.materialId\)\)\.config;/.test(studioNu));
verifier('versions enregistrées : normalisées à la reprise du stockage', /variants = stored\.variants[\s\S]{0,260}normaliserConfig\(v\.config/.test(studioNu));
verifier('comparateur : « utiliser cette version » revalide', /onUse: \(variant\) => \{[\s\S]{0,400}normaliserConfig\(\{ \.\.\.variant\.config \}, vise\)/.test(studioNu));

/*
 * Chaque version enregistrée garde SON produit et SON motif — mais chaque
 * paire doit être valide. On le vérifie sur la règle, pour toutes les
 * combinaisons que le catalogue réel permet.
 */
let paires = 0;
let invalides = 0;
for (const f of proposees) {
  for (const m of REGLES.MOTIFS_CONNUS) {
    paires += 1;
    const r = REGLES.normaliserConfig({ materialId: f.id, pattern: m }, f);
    if (!REGLES.motifAutorise(f, r.config.pattern)) invalides += 1;
  }
}
verifier(
  `${paires} paires produit × motif : toutes normalisées vers une paire valide`,
  invalides === 0,
  `${invalides} invalide(s)`
);

/* ------------------------------------------------------------------ */
/* §6 — L'accueil                                                      */
/* ------------------------------------------------------------------ */

titre('Accueil : les paires écrites à la main sont encore valides');

const preview = lire('js/scene/preview.js');
const bloc = preview.match(/const CHIPS = \[([\s\S]*?)\];/);
verifier('les paires de l’aperçu sont repérables', Boolean(bloc));
if (bloc) {
  const pairs = [...bloc[1].matchAll(/material:\s*'([^']+)',\s*pattern:\s*'([^']+)'/g)];
  verifier(`${pairs.length} paires déclarées`, pairs.length > 0);
  for (const [, id, motif] of pairs) {
    const fiche = proposees.find((f) => f.id === id);
    verifier(
      `accueil : ${id} accepte « ${motif} »`,
      Boolean(fiche) && REGLES.motifAutorise(fiche, motif),
      fiche ? `déclare [${REGLES.motifsDe(fiche)}]` : 'référence absente du catalogue'
    );
  }
}

/*
 * Le Mode Plan n'est pas concerné, et cela doit rester vrai : il ne dessine
 * aucune référence réelle. Si un jour il importait la règle, c'est que les
 * deux mondes auraient été confondus.
 */
verifier(
  'le Mode Plan reste hors de cette règle (5 motifs génériques)',
  !/motifs-regles/.test(lire('js/tools/floor-visualizer.js')) &&
    require('../js/tools/patterns.js').PATTERNS.length === 5
);

/* ------------------------------------------------------------------ */
console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
console.log(
  `${proposees.length} références, ${paires} paires produit × motif : aucune combinaison impossible ne peut être posée.`
);
