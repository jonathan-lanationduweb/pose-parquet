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
  ok('une pièce est ouverte', !!s.scene && s.room, s.room);

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
  const fiche = document.querySelector('[data-bar] [data-fiche]');
  ok('la fiche Premibel s ouvre dans un nouvel onglet, sans opener',
    fiche && fiche.getAttribute('target') === '_blank' && /noopener/.test(fiche.getAttribute('rel')) && /premibel\.fr/.test(fiche.getAttribute('href')));
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
  for (const clef of ['room', 'scene', 'photo', 'product', 'rendererSettings', 'comparison', 'favoriteIds', 'originalMode', 'ui', 'intent']) {
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
  console.log('Visualiseur produit');
  const echecs = controlerSource();
  console.log(echecs === 0 ? '\nConforme. Comportement : --script, dans la page ouverte avec ?dev=1.' : `\n${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

module.exports = { verifierApp, controlerSource };
