/**
 * Contrôle : le Visualiseur produit (`js/product/`).
 *
 * Deux natures de contrôle, comme pour `check-studio-api.js` :
 *
 *   node _generator/check-product-visualizer.js
 *       la FORME, en lisant la source : l'application importe le vrai moteur
 *       et rien d'autre, n'embarque ni iframe ni pont `__studio`, ne dessine
 *       aucun parquet elle-même, tient son état en un seul objet, ne porte
 *       aucun état par requestAnimationFrame, et est publiée dans le bundle.
 *
 *   node _generator/check-product-visualizer.js --script
 *   node _generator/check-product-visualizer.js --script-import
 *       le COMPORTEMENT : le code à exécuter dans la page ouverte avec
 *       `?dev=1`. Viewport (couverture, Ajuster, plancher de zoom), choix de
 *       B annulé à la fermeture, A = B refusé, dernier clic gagne.
 *
 * Les tests textuels ne disent pas que l'interface fonctionne ; ils empêchent
 * de réintroduire ce qu'on a retiré. Le fonctionnement se prouve dans Chrome.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const sansCommentaires = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------ */
/* Comportement — dans la page, ?dev=1                                */
/* ------------------------------------------------------------------ */

function verifierApp(pv) {
  const r = [];
  const ok = (nom, c, detail = '') => r.push({ nom, ok: !!c, detail: String(detail) });
  if (!pv || !pv.state) { ok('la poignée de diagnostic est là (?dev=1)', false); return r; }
  const s = pv.state;
  const stage = document.querySelector('[data-stage]');
  const box = () => stage.getBoundingClientRect();
  const photo = () => document.querySelector('[data-layer="photo"]').getBoundingClientRect();
  /* DOMRect : width/height, pas w/h — une faute de frappe ici rendait NaN et faisait échouer deux contrôles à tort. */
  const vide = () => { const b = box(); const p = photo(); return Math.max(p.x - b.x, p.y - b.y, (b.x + b.width) - (p.x + p.width), (b.y + b.height) - (p.y + p.height)); };

  ok('cinq références pilote', pv.products.length === 5, pv.products.join(' '));
  ok('une pièce est ouverte', !!s.scene && s.room && s.room.type === 'demo', s.room && s.room.type);

  /* viewport */
  pv.viewport.fitToView();
  ok('100 % couvre le cadre', pv.viewport.vp.z === 1 && vide() <= 0.5, vide());
  pv.viewport.zoomAt(0.01, null, null, false);
  ok('un geste ne descend jamais sous la couverture', pv.viewport.vp.z === 1);
  pv.viewport.fitAll();
  ok('Ajuster montre toute la photo sous 100 %', pv.viewport.vp.z < 1 && Math.abs(pv.viewport.vp.z - pv.viewport.zContain) < 1e-9, pv.viewport.vp.z);
  const zAj = pv.viewport.vp.z;
  pv.viewport.zoomAt(1 / 1.5, null, null, false);
  ok('zoomer en arrière depuis Ajuster ne saute pas à 100 %', Math.abs(pv.viewport.vp.z - zAj) < 1e-9);
  pv.viewport.zoomAt(1.5, null, null, false); pv.viewport.zoomAt(1 / 1.5, null, null, false); pv.viewport.zoomAt(1 / 1.5, null, null, false);
  ok('revenir en arrière s arrête à la couverture', Math.abs(pv.viewport.vp.z - 1) < 1e-9, pv.viewport.vp.z);
  const b = box();
  pv.viewport.zoomAt(2, 300, 200, false);
  const s0 = pv.viewport.cssScale();
  const u = (300 - pv.viewport.vp.x) / s0; const v = (200 - pv.viewport.vp.y) / s0;
  pv.viewport.zoomAt(1.5, 300, 200, false);
  const s1 = pv.viewport.cssScale();
  ok('le point sous le curseur reste sous le curseur',
    Math.abs(u - (300 - pv.viewport.vp.x) / s1) < 1.5 && Math.abs(v - (200 - pv.viewport.vp.y) / s1) < 1.5);
  pv.viewport.setVp({ z: 2, x: 99999, y: 99999 }, false);
  ok('le pan ne laisse jamais sortir l image', pv.viewport.vp.x <= 0.01 && pv.viewport.vp.y <= 0.01 && vide() <= 0.5);
  pv.viewport.fitToView();
  void b;

  /* une seule transformation pour toutes les couches */
  const t = [...document.querySelectorAll('.pv-layer')].map((l) => l.style.transform);
  ok('les couches portent la même transformation', t.length === 3 && t.every((x) => x === t[0]));

  /* intention : produit, picking, A = B */
  const p0 = s.product;
  const autre = pv.products.find((id) => id !== p0);
  pv.startCompare();
  ok('Comparer ouvre le catalogue en mode choix de B', s.ui.picking === true && s.ui.panel === 'catalog');
  pv.closeAll();
  ok('fermer le catalogue annule le choix de B', s.ui.picking === false && s.comparison === null);
  pv.select(autre);
  ok('le clic suivant change de sol, il ne compare pas', s.product === autre && s.comparison === null);
  pv.startCompare(); pv.select(autre);
  ok('comparer une référence à elle-même est refusé', s.comparison === null && s.ui.picking === true);
  pv.select(p0);
  ok('une autre référence est acceptée comme B', s.comparison && s.comparison.b === p0 && s.ui.picking === false);
  pv.startCompare();
  ok('Comparer referme la comparaison', s.comparison === null);
  const vpAvant = JSON.stringify(pv.viewport.vp);
  pv.select(p0);
  ok('changer de produit conserve le viewport', JSON.stringify(pv.viewport.vp) === vpAvant);

  /* aucun bouton mort dans l'en-tête ni le menu */
  ok('pas de bouton Enregistrer', !document.querySelector('[data-save], [data-h-save]'));
  ok('rien de permanent sur les cotes', !document.querySelector('.pv-nav, .pv-card, .pv-sheet'));
  ok('trois objets flottants au repos', ['[data-tools]', '[data-bar]', '[data-zoom]'].every((q) => { const e = document.querySelector(q); return e && !e.hidden; }) && document.querySelector('[data-drawer]').hidden);
  const liens = [...document.querySelectorAll('[data-menu] a')];
  ok('les liens du menu mènent quelque part', liens.length === 2 && liens.every((a) => /\.html$/.test(a.getAttribute('href'))));
  /* Une revue humaine a comparé des captures de l'ANCIEN prototype au rapport
     du produit intégré. Ces deux contrôles rendent la confusion impossible :
     l'ancienne carcasse n'est pas dans la page, et la signature dit laquelle
     tourne. */
  ok('aucun reste de l ancienne interface dans la page',
    !document.querySelector('.pv-nav, .pv-card, .pv-sheet, #nav, #card, [data-nav], [data-sheet]'));
  ok('la signature de build est lisible en dev', !!pv.build && !!pv.build.bundle, pv.build && `${pv.build.branch || '?'} ${pv.build.commitCourt || ''} ${pv.build.bundle}`);

  const fiche = document.querySelector('[data-bar] [data-fiche]');
  ok('la fiche Premibel s ouvre dans un nouvel onglet, sans opener',
    fiche && fiche.getAttribute('target') === '_blank' && /noopener/.test(fiche.getAttribute('rel')) && /premibel\.fr/.test(fiche.getAttribute('href')));
  return r;
}

/* ------------------------------------------------------------------ */
/* Comportement — toutes les pièces, une seule interface (async)      */
/* ------------------------------------------------------------------ */

/**
 * Une scène ne change pas la structure de l'écran. Le refus humain montrait
 * une pièce où « plusieurs contrôles produit disparaissent » : ce contrôle
 * ouvre chaque pièce de la bibliothèque et vérifie que la carcasse est la
 * même partout — capsule, barre produit, zoom, aucun panneau latéral.
 */
async function verifierPieces(pv) {
  const r = [];
  const ok = (nom, c, detail = '') => r.push({ nom, ok: !!c, detail: String(detail) });
  if (!pv || !pv.state) { ok('la poignée de diagnostic est là (?dev=1)', false); return r; }
  const s = pv.state;
  const pause = (ms) => new Promise((res) => setTimeout(res, ms));
  const attendre = async (test, msMax = 25000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < msMax) { if (test()) return true; await pause(30); }
    return false;
  };
  const pieces = pv.pieces ? pv.pieces() : [];
  ok('la bibliothèque a ses pièces', pieces.length >= 9, pieces.length);
  for (const p of pieces) {
    await pv.openRoom(p.id);
    const charge = await attendre(() => s.room && s.room.type === 'demo' && s.room.id === p.id && pv.canvases.a.width > 0);
    const structure = ['[data-tools]', '[data-bar]', '[data-zoom]'].every((q) => { const e = document.querySelector(q); return e && !e.hidden; });
    const lateraux = !!document.querySelector('.pv-nav, .pv-card, .pv-sheet, #nav, #card');
    const commandes = ['[data-seg]', '[data-cmp]', '[data-open-catalog]', '[data-open-custom]', '[data-fav]', '[data-z-in]', '[data-fit]']
      .filter((q) => { const e = document.querySelector(q); return !e || e.hidden; });
    ok(`${p.label} : rendu du moteur`, charge, pv.canvases.a.width);
    ok(`${p.label} : même carcasse, aucun panneau latéral`, structure && !lateraux);
    ok(`${p.label} : aucune commande produit ne disparaît`, commandes.length === 0, commandes.join(' '));
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* Comportement — l'import, de bout en bout (async)                   */
/* ------------------------------------------------------------------ */

/**
 * Non-régression du parcours d'import : une photo importée EST la pièce.
 * Le refus humain portait sur un écran intermédiaire ; ce contrôle vérifie
 * qu'aucun overlay ne couvre le viewport, qu'aucun dialogue ne s'ouvre, et
 * que tout ce qui manipule la pièce marche comme sur une pièce d'exemple.
 */
async function verifierImport(pv) {
  const r = [];
  const ok = (nom, c, detail = '') => r.push({ nom, ok: !!c, detail: String(detail) });
  if (!pv || !pv.state) { ok('la poignée de diagnostic est là (?dev=1)', false); return r; }
  const s = pv.state;
  const pause = (ms) => new Promise((res) => setTimeout(res, ms));
  const stage = document.querySelector('[data-stage]');
  const box = () => stage.getBoundingClientRect();
  const photo = () => document.querySelector('[data-layer="photo"]').getBoundingClientRect();
  const vide = () => { const b = box(); const p = photo(); return Math.max(p.x - b.x, p.y - b.y, (b.x + b.width) - (p.x + p.width), (b.y + b.height) - (p.y + p.height)); };
  const attendre = async (test, msMax = 15000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < msMax) { if (test()) return true; await pause(30); }
    return false;
  };
  /* Une photo de test fabriquée sur place : le contrôle ne dépend d'aucun fichier. */
  const fichier = async (nom, w, h, teinte) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = teinte; g.fillRect(0, 0, w, h);
    g.fillStyle = '#333'; g.fillRect(0, Math.round(h * 0.62), w, Math.round(h * 0.38));
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    return new File([blob], nom, { type: 'image/png' });
  };

  const demoDepart = s.room && s.room.type === 'demo' ? s.room.id : null;

  /* --- premier import --- */
  await pv.importPhoto(await fichier('salon-perso.png', 1200, 800, '#c8b79a'));
  ok('la photo importée devient la pièce', await attendre(() => s.room && s.room.type === 'uploaded'), s.room && s.room.type);
  ok('l état porte la photo, pas un second écran',
    s.room && s.room.fileName === 'salon-perso.png' && s.room.width > 0 && s.room.height > 0 && typeof s.room.url === 'string' && s.scene === null,
    JSON.stringify({ f: s.room && s.room.fileName, w: s.room && s.room.width, u: !!(s.room && s.room.url) }));
  const texte = document.body.innerText;
  ok('plus aucun écran « moteur IA »', !/moteur IA|maquette|quand même/i.test(texte));
  ok('aucun dialogue bloquant', !document.querySelector('dialog[open]') && !document.querySelector('[data-drawer]:not([hidden])'));
  /* Rien ne couvre le viewport : au centre de la pièce, l'élément touché est la scène. */
  const b0 = box();
  const cible = document.elementFromPoint(Math.round(b0.x + b0.width / 2), Math.round(b0.y + b0.height / 2));
  ok('aucun overlay ne couvre le viewport', !!cible && !cible.closest('.pv-note, [data-drawer], .pv-menu') && !!cible.closest('[data-stage]'), cible && cible.className);
  ok('l information est une note discrète de deux lignes au plus',
    (() => { const n = document.querySelector('[data-note]'); if (!n || n.hidden) return false; const p = n.querySelector('[data-note-text]'); const lignes = p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight); return lignes <= 2.2 && n.getBoundingClientRect().width <= 420; })());
  ok('la note se ferme et ne revient pas', (() => { document.querySelector('[data-note-close]').click(); return document.querySelector('[data-note]').hidden; })());
  ok('la barre et le zoom restent là', !document.querySelector('[data-bar]').hidden && !document.querySelector('[data-zoom]').hidden);
  ok('avant / après et comparer s effacent sans parquet posé',
    document.querySelector('[data-seg]').hidden && document.querySelector('[data-cmp]').hidden && !document.querySelector('[data-tools]').hidden);

  /* --- viewport : exactement comme une pièce d'exemple --- */
  pv.viewport.fitToView();
  ok('100 % couvre le cadre sur une photo importée', pv.viewport.vp.z === 1 && vide() <= 0.5, vide());
  pv.viewport.zoomAt(2, 300, 200, false);
  ok('le zoom marche après import', pv.viewport.vp.z > 1, pv.viewport.vp.z);
  const x0 = pv.viewport.vp.x;
  pv.viewport.setVp({ z: pv.viewport.vp.z, x: x0 - 60, y: pv.viewport.vp.y }, false);
  ok('le pan marche après import', pv.viewport.vp.x !== x0);
  pv.viewport.fitAll();
  ok('Ajuster marche après import', pv.viewport.vp.z < 1 && Math.abs(pv.viewport.vp.z - pv.viewport.zContain) < 1e-9);
  pv.viewport.fitToView();
  pv.setImmersive(true);
  ok('le plein écran marche après import', s.ui.immersive === true && getComputedStyle(document.querySelector('.pv__header')).display === 'none');
  pv.setImmersive(false);

  /* --- produit sans sol connu : aucun faux parquet --- */
  const canvasA = pv.canvases.a;
  const cible2 = pv.products.find((id) => id !== s.product) || pv.products[0];
  const rendus = s.renders;
  pv.select(cible2);
  await pause(200);
  ok('cliquer un parquet n invente aucun rendu', canvasA.width === 0 && s.renders === rendus, `${canvasA.width}px, ${s.renders} rendus`);
  ok('le clic produit répond par une information non bloquante',
    !document.querySelector('[data-note]').hidden && /après analyse de la pièce/.test(document.querySelector('[data-note-text]').textContent));
  ok('la photo reste visible et le viewport manipulable', pv.canvases.photo.width > 0 && (() => { const z = pv.viewport.vp.z; pv.viewport.zoomAt(1.5, null, null, false); const bougé = pv.viewport.vp.z !== z; pv.viewport.fitToView(); return bougé; })());
  ok('comparer reste refusé proprement, sans crash', (() => { pv.startCompare(); return s.comparison === null && s.ui.picking === false; })());
  ok('le catalogue reste consultable', (() => { pv.openPanel('catalog'); const n = document.querySelectorAll('[data-prods] .pcard').length; const note = document.querySelector('[data-drawer-body] .grid__note'); pv.closeAll(); return n === pv.products.length && !!note; })());

  /* --- second import : rien de la première photo ne survit --- */
  const url1 = s.room.url;
  const w1 = s.room.width;
  await pv.importPhoto(await fichier('cuisine-perso.png', 900, 1200, '#a9b7c8'));
  ok('un second import remplace la photo', await attendre(() => s.room && s.room.fileName === 'cuisine-perso.png'), s.room && s.room.fileName);
  ok('l ancienne URL est révoquée', s.room.url !== url1);
  ok('la nouvelle taille remplace l ancienne', s.room.width !== w1 && s.room.width === 900 && s.room.height === 1200, `${s.room.width}x${s.room.height}`);
  pv.viewport.fitToView();
  ok('le viewport est réinitialisé sur la nouvelle photo', pv.viewport.vp.z === 1 && vide() <= 0.5, vide());
  ok('aucun parquet hérité de la première photo', pv.canvases.a.width === 0 && s.comparison === null && s.originalMode === 'off');

  /* --- retour à une pièce d'exemple --- */
  if (demoDepart) {
    await pv.openRoom(demoDepart);
    ok('retour à une pièce d exemple', await attendre(() => s.room && s.room.type === 'demo' && !!s.scene), s.room && s.room.type);
    ok('le rendu revient sur une pièce d exemple', await attendre(() => pv.canvases.a.width > 0 && s.renders > 0), pv.canvases.a.width);
    ok('avant / après et comparer reviennent', !document.querySelector('[data-seg]').hidden && !document.querySelector('[data-cmp]').hidden);
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* Forme                                                              */
/* ------------------------------------------------------------------ */

function controlerSource() {
  let echecs = 0;
  const ok = (nom, c, detail = '') => { if (!c) echecs += 1; console.log(`  ${c ? 'OK  ' : 'KO  '} ${nom}${detail ? ` — ${detail}` : ''}`); };

  const app = lire('js/product/app.js');
  const vp = lire('js/product/viewport.js');
  const main = lire('js/product/main.js');
  const code = sansCommentaires(app + '\n' + vp + '\n' + main);

  /* Le moteur, et rien qui le double. */
  ok('importe le vrai moteur', /from '\.\.\/scene\/renderer\.js'/.test(app) && /createSceneRenderer\(\)/.test(app));
  ok('importe les scènes calibrées du front', /from '\.\.\/scene\/analyzer\.js'/.test(app) && /analyzeScene\(\{ sceneId/.test(app));
  ok('importe le catalogue par la couche produit', /from '\.\.\/studio\/catalog\.js'/.test(app) && /loadCatalog\(base\)/.test(app));
  ok('aucune iframe, aucun pont __studio', !/<iframe/.test(code) && !/__studio/.test(code) && !/contentWindow/.test(code));
  ok('aucune capture statique comme moteur', !/DEMO_RENDERINGS|renderings\//.test(code) && !/drawStatic/.test(code));
  for (const [quoi, re] of [
    ['remplissage de canevas', /fillRect|fillStyle|createPattern|createLinearGradient/],
    ['tracé de chemin', /moveTo|lineTo|beginPath|\.arc\(/],
    ['écriture de pixels', /putImageData|createImageData/],
    ['motif CSS', /repeating-linear-gradient/],
  ]) ok(`aucun ${quoi} : l application ne dessine pas de parquet`, !re.test(code));
  ok('les seuls dessins sont des copies (drawImage) et le rendu du moteur',
    /renderer\.paint\(canvasA/.test(code) && /renderer\.paint\(canvasB/.test(code));

  /* Un seul état. */
  ok('un seul objet d état', (code.match(/const state = \{/g) || []).length === 1);
  for (const clef of ['room', 'scene', 'product', 'rendererSettings', 'comparison', 'favoriteIds', 'originalMode', 'ui', 'intent']) {
    ok(`l état porte ${clef}`, new RegExp(`\\n\\s+${clef}:`).test(app));
  }
  ok('la largeur n est pas un réglage : elle vient du produit', /width: null/.test(code) && !/setWidth/.test(code));
  ok('trois orientations, toutes rendues par le moteur', /\[0, '0°', 'Dans la longueur'/.test(app) && /\[90,/.test(app) && /\[45,/.test(app));
  /* Direction V2 : rien de permanent sur les cotes, un tiroir bas, une barre produit. */
  ok('aucun panneau lateral permanent', !/pv-nav|pv-card|pv-sheet/.test(app + vp) && /class="pv-bar"/.test(app) && /class="pv-drawer"/.test(app));
  ok('trois objets flottants au repos', ['pv-tools', 'pv-bar', 'pv-zoom'].every((c) => app.includes(`class="${c}"`)) && !/pv-status/.test(app));
  ok('la premiere impression est une piece, pas un accueil', /if \(rooms\.length\) openRoom\(rooms\[0\]\.id\);/.test(app) && !/pv__start/.test(app));
  ok('avant / apres est un segment a deux etats', /data-ba="off"/.test(app) && /data-ba="ba"/.test(app));
  ok('la fiche Premibel est un lien discret', /data-fiche>Voir la fiche Premibel/.test(app) && !/VOIR LA FICHE PREMIBEL/.test(app));
  ok('le chrome s attenue pendant un deplacement', /document\.body\.classList\.add\('panning'\)/.test(app));
  ok('aucun curseur décoratif', !/type="range"/.test(app));

  /* Robustesse héritée de la stabilisation. */
  ok('aucun état porté par requestAnimationFrame', !/requestAnimationFrame/.test(code));
  ok('le viewport commet l état avant d animer', /vp = c;\s*\n\s*const dur = 200;/.test(vp) && /anim\.timer = setTimeout\(step, 16\)/.test(vp));
  ok('le plancher d un geste est la couverture', /zoomFloor = \(\) => Math\.min\(ZOOM_MIN, vp\.z\)/.test(vp));
  ok('le cadre est observé en taille', /new ResizeObserver\(reborner\)\.observe\(stage\)/.test(vp) && /visibilitychange/.test(vp));
  ok('fermer le catalogue annule le choix de B', /function closeAll\(\) \{[\s\S]{0,400}state\.ui\.picking = false;/.test(app));
  ok('A = B est refusé', /if \(id === state\.product\) \{ toast\(/.test(app));
  ok('un chargement périmé s ignore', (app.match(/if \(intent !== state\.intent\) return;/g) || []).length >= 3);
  ok('le plein écran natif est rattrapé', /Promise\.resolve\(root\.requestFullscreen\(\)\)\.catch\(nop\)/.test(app));
  ok('le champ fichier est remis à zéro', /fileInput\.value = '';/.test(app));
  ok('pas de bouton Enregistrer ni Partager', !/Enregistrer|Partager/.test(app));
  ok('la fiche produit ouvre un nouvel onglet sans opener', /target="_blank" rel="noopener noreferrer"/.test(app));
  ok('la photo importée ne reçoit aucun parquet', /canvasA\.width = 0; canvasA\.height = 0;/.test(app));
  /* Import : la photo est la pièce, et rien ne s'interpose. */
  ok('la pièce dit sa provenance, il n y a pas deux écrans',
    /type: 'demo'/.test(app) && /type: 'uploaded'/.test(app) && !/ui\.screen|state\.photo\b/.test(code));
  ok('aucun écran bloquant après un import',
    !/pv-veil|moteur IA|quand même|Explorer ma photo/.test(app) && !/<dialog/.test(app));
  ok('l information d import est une note, pas un obstacle',
    /class="pv-note"/.test(app) && /NOTE_IMPORT/.test(app) && !/jargon|segmentation|floor ?mask|prototype/i.test(app.replace(/\/\*[\s\S]*?\*\//g, '')));
  ok('un sol inconnu bloque le rendu, rien d autre',
    /const posable = \(\) => Boolean\(state\.scene\)/.test(app) && /if \(!posable\(\)\) \{\s*\n?\s*state\.product = id;/.test(app));
  ok('l URL de la photo précédente est révoquée', /URL\.revokeObjectURL\(state\.room\.url\)/.test(app) && /libererPhoto\(\);/.test(app));
  ok('un nom de fichier ne devient jamais du HTML', /txt\(state\.room\.fileName/.test(app));
  /* Une seule architecture d'UI vivante, et aucune route vers le prototype :
     la confusion entre les deux applications a coûté une revue entière. */
  const cssProduit = lire('css/product-app.css');
  ok('aucun composant de l ancienne interface ne survit',
    !/pv-nav|pv-card|pv-sheet|pv-status|data-nav\b|data-sheet\b/.test(app + cssProduit));
  ok('aucune route du produit ne mène au prototype',
    !/product-concept/.test(sansCommentaires(app + main + vp)) && !/product-concept/.test(lire('outils/visualiseur-produit.html')));
  ok('aucun service worker ne peut servir une ancienne interface',
    !/serviceWorker|navigator\.serviceWorker/.test(app + main) && !fs.existsSync(path.join(RACINE, 'sw.js')));
  ok('la signature de build est écrite par le générateur, jamais publiée',
    /assets\/dev-build\.json/.test(lire('_generator/build.js')) && /assets\/dev-build\.json/.test(lire('.gitignore')));
  ok('la signature ne se charge qu en dev', /if \(DEV\) \{[\s\S]{0,600}dev-build\.json/.test(app));

  /* Publication. */
  const dist = path.join(RACINE, 'assets', 'dist');
  const arbres = fs.readdirSync(dist).filter((n) => fs.statSync(path.join(dist, n)).isDirectory());
  ok('un seul arbre JS publié', arbres.length === 1, arbres.join(' '));
  if (arbres.length === 1) {
    const publie = path.join(dist, arbres[0], 'js', 'product', 'app.js');
    ok('la copie publiée de app.js est à jour', fs.existsSync(publie) && fs.readFileSync(publie, 'utf8').replace(/\r\n/g, '\n') === app.replace(/\r\n/g, '\n'), 'relancer node _generator/build.js');
    const page = lire('outils/visualiseur-produit.html');
    ok('la page charge cet arbre et sa feuille', page.includes(`assets/dist/${arbres[0]}/js/product/main.js`) && /assets\/dist\/product\.[0-9a-f]+\.css/.test(page));
    ok('la page monte [data-product]', /<div data-product data-base=/.test(page) && /app app--product/.test(page));
  }
  const pilote = JSON.parse(lire('data/products.premibel-pilot.json'));
  const ids = ['POINF36005', 'BTRPF39009', 'CHENF39031', 'CHENF36014', 'CHENF36015'];
  ok('les cinq références pilote sont dans le catalogue', ids.every((id) => pilote.produits.some((p) => p.id === id)));
  const fam = Object.fromEntries(pilote.produits.filter((p) => ids.includes(p.id)).map((p) => [p.id, p.visual.familyId]));
  ok('les familles de rendu sont celles mesurées', fam.POINF36005 === 'chene-naturel' && fam.BTRPF39009 === 'chene-sable' && fam.CHENF39031 === 'chene-naturel' && fam.CHENF36014 === 'chene-miel' && fam.CHENF36015 === 'chene-sable', JSON.stringify(fam));
  ok('aucune référence pilote ne porte de prix', !pilote.produits.some((p) => 'price' in p || 'prix' in p || (p.offers && p.offers.price)));
  return echecs;
}

if (require.main === module) {
  if (process.argv.includes('--script')) {
    console.log(`(${verifierApp.toString()})(window.__pv)`);
    process.exit(0);
  }
  if (process.argv.includes('--script-import')) {
    console.log(`await (${verifierImport.toString()})(window.__pv)`);
    process.exit(0);
  }
  if (process.argv.includes('--script-pieces')) {
    console.log(`await (${verifierPieces.toString()})(window.__pv)`);
    process.exit(0);
  }
  /* Quelle version DEVRAIT tourner : à comparer à la ligne « build » que la
     page écrit en console avec `?dev=1`. */
  if (process.argv.includes('--build')) {
    const git = (args) => { try { return require('child_process').execFileSync('git', args, { cwd: RACINE, encoding: 'utf8' }).trim(); } catch { return 'inconnu'; } };
    const dist = fs.readdirSync(path.join(RACINE, 'assets', 'dist')).filter((n) => fs.statSync(path.join(RACINE, 'assets', 'dist', n)).isDirectory());
    console.log(JSON.stringify({
      commitCourt: git(['rev-parse', '--short', 'HEAD']),
      branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
      propre: git(['status', '--porcelain']) === '' ? 'oui' : 'non',
      page: 'outils/visualiseur-produit.html',
      bundle: dist.length === 1 ? dist[0] : dist.join(' + '),
    }, null, 2));
    process.exit(0);
  }
  console.log('Visualiseur produit');
  const echecs = controlerSource();
  console.log(echecs === 0 ? '\nConforme. Comportement : --script, --script-import et --script-pieces, dans la page ouverte avec ?dev=1.\nQuelle version tourne : --build ici, ligne « build » en console là-bas.' : `\n${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

module.exports = { verifierApp, verifierImport, verifierPieces, controlerSource };
