/**
 * Contrôle : le mode « Ma photo » — coordonnées, cadre, découplage, affichage.
 *
 *   node _generator/check-photo.js
 *
 * POURQUOI. Le 05/10/2026, sur une photo importée, un coin du sol ne pouvait
 * pas être ramené au bord : l'éditeur reconstruisait ses poignées à chaque
 * mouvement (la poignée tenue perdait la capture du pointeur après un pas),
 * le cadre de départ posait deux coins hors de l'image (rognés, insaisissables)
 * et le tiroir couvrait la photo. Ce contrôle vérifie ce qui se teste sans
 * navigateur ; le comportement réel (glisser souris et doigt aux quatre coins,
 * 320 à 1920 px) a été recetté dans Chrome — voir le rapport de la mission.
 *
 *   §1  écran → image → écran : bords atteints, aller-retour < 1 px
 *   §2  le cadre de départ est large, dans l'image, et valide
 *   §3  la validation de « Terminer » refuse un cadre croisé ou minuscule
 *   §4  ce qui a causé le blocage ne revient pas (garde-fous dans le code)
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const EDITEUR = require('../js/scene/editor.js');
const SCHEMA = require('../js/scene/schema.js');

let reussis = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { reussis += 1; console.log(`  OK   ${nom}`); }
  else { echecs.push(nom + (detail ? ` — ${detail}` : '')); console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`); }
}
const titre = (t) => console.log(`\n== ${t} ==`);

/* ------------------------------------------------------------------ */
titre('§1 Écran → image → écran');
// Boîtes d'affichage de la photo : panneau ouvert / fermé, téléphone, tablette,
// photos paysage, portrait, carrée, panoramique. La boîte est celle de l'IMAGE
// affichée (aucune bande de letterbox : la couche épouse le canevas).
const BOITES = [
  { nom: 'bureau, tiroir ouvert, paysage 3:2', left: 22, top: 137, width: 1012, height: 675 },
  { nom: 'bureau, tiroir fermé, paysage 3:2', left: 214, top: 88, width: 1012, height: 675 },
  { nom: 'bureau, portrait 500×582', left: 312, top: 110, width: 580, height: 675.2 },
  { nom: 'téléphone 390, portrait', left: 14, top: 62, width: 362.4, height: 421.9 },
  { nom: 'téléphone 844 paysage', left: 148.3, top: 58, width: 276.1, height: 321.4 },
  { nom: 'tablette 768, carrée', left: 22, top: 170.5, width: 339, height: 339 },
  { nom: 'panoramique 21:9', left: 22, top: 300.2, width: 1500, height: 642.9 },
];
for (const r of BOITES) {
  const coins = [[r.left, r.top], [r.left + r.width, r.top], [r.left + r.width, r.top + r.height], [r.left, r.top + r.height]]
    .map(([x, y]) => EDITEUR.versImage(x, y, r));
  const attendus = [[0, 0], [1, 0], [1, 1], [0, 1]];
  verifier(`${r.nom} : les quatre bords de l'écran donnent x, y ∈ {0, 1}`,
    // À 1e-9 près : une boîte à coordonnées décimales donne 0,9999999999999998,
    // soit un millionième de pixel — le bord est atteint.
    coins.every((p, i) => Math.abs(p.x - attendus[i][0]) < 1e-9 && Math.abs(p.y - attendus[i][1]) < 1e-9), JSON.stringify(coins));
  // Un doigt qui dépasse le bord s'arrête AU bord de l'image, ni avant ni après.
  const dehors = EDITEUR.versImage(r.left - 80, r.top + r.height + 80, r);
  verifier(`${r.nom} : au-delà du bord, le point reste au bord (0, 1)`, dehors.x === 0 && dehors.y === 1, JSON.stringify(dehors));
  let pire = 0;
  for (let k = 0; k <= 40; k += 1) {
    for (let j = 0; j <= 40; j += 1) {
      const p = { x: k / 40, y: j / 40 };
      const e = EDITEUR.versEcran(p, r);
      const q = EDITEUR.versImage(e.x, e.y, r);
      pire = Math.max(pire, Math.abs(q.x - p.x) * r.width, Math.abs(q.y - p.y) * r.height);
    }
  }
  verifier(`${r.nom} : aller-retour écran → image → écran, écart max ${pire.toExponential(1)} px (< 1 px)`, pire < 1);
}
// Panneau ouvert ou fermé : la même portion de photo, deux boîtes différentes,
// les mêmes coordonnées image.
{
  const [ouvert, ferme] = BOITES;
  const p = { x: 0.37, y: 0.81 };
  const a = EDITEUR.versImage(...Object.values(EDITEUR.versEcran(p, ouvert)), ouvert);
  const b = EDITEUR.versImage(...Object.values(EDITEUR.versEcran(p, ferme)), ferme);
  verifier('tiroir ouvert / fermé : un même point du sol garde ses coordonnées image', Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
}

/* ------------------------------------------------------------------ */
titre('§2 Cadre de départ');
const dansImage = (q) => q.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
const aire = (q) => Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % 4].y - q[(i + 1) % 4].x * p.y, 0)) / 2;
verifier('DEFAULT_QUAD (schéma) = DEFAULT_FRAME (éditeur)', JSON.stringify(SCHEMA.DEFAULT_QUAD) === JSON.stringify(EDITEUR.DEFAULT_FRAME));
verifier('cadre par défaut entièrement dans l’image', dansImage(SCHEMA.DEFAULT_QUAD));
// Le cadre ne donne plus que la fuite : ce qui doit être LARGE au départ,
// c'est la zone peinte (le contour, prolongé jusqu'au bas de la photo).
const aireP = (q) => Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % q.length].y - q[(i + 1) % q.length].x * p.y, 0)) / 2;
const scenePhoto = SCHEMA.createBlankScene({ width: 1600, height: 1067 });
const zonePhoto = scenePhoto.floorZones[0];
verifier(`zone peinte au départ large (aire ${aireP(zonePhoto.mask.polygon).toFixed(2)} ≥ 0,35), jusqu’au bas de la photo`,
  aireP(zonePhoto.mask.polygon) >= 0.35 && zonePhoto.mask.polygon.some((p) => p.y === 1) && dansImage(zonePhoto.mask.polygon));
const codeAnalyseur = lire('js/scene/analyzer.js');
const manuel = codeAnalyseur.slice(codeAnalyseur.indexOf("registerAnalyzer('manual'"));
verifier('photo importée (analyseur « manual ») : le cadre de départ commun, sans quadrilatère codé en dur',
  /createBlankScene\(\{ width, height, label, meters, quad: quad \|\| undefined \}\)/.test(manuel) && !/\{ x: /.test(manuel.slice(0, 600))
  && JSON.stringify(zonePhoto.cadre) === JSON.stringify(SCHEMA.DEFAULT_QUAD));
verifier('cadre par défaut valide pour « Terminer »', EDITEUR.problemeCadre(SCHEMA.DEFAULT_QUAD) === null);

/* ------------------------------------------------------------------ */
titre('§2 bis Photo importée : une perspective crédible (06/10/2026)');
const CADRE = require('../js/scene/cadre-photo.js');
const pts = (a) => a.map(([x, y]) => ({ x, y }));
const largeurPx = (a, b, W, H) => Math.hypot((b.x - a.x) * W, (b.y - a.y) * H);
{
  const q = zonePhoto.plane.quad;
  const r = largeurPx(q[0], q[1], 1600, 1067) / largeurPx(q[3], q[2], 1600, 1067);
  const ancien = SCHEMA.CADRE_SECOND_SOL;
  const r0 = largeurPx(ancien[0], ancien[1], 1600, 1067) / largeurPx(ancien[3], ancien[2], 1600, 1067);
  verifier(`cadre de départ en perspective : fond = ${(r * 100).toFixed(0)} % du devant (ancien cadre frontal : ${(r0 * 100).toFixed(0)} %)`, r <= 0.7 && r0 > 0.85);
  verifier('le cadre de départ n’est pas signalé « plat », l’ancien l’est', !CADRE.cotesParalleles(CADRE.CADRE_DEPART, 1600, 1067) && CADRE.cotesParalleles(ancien, 1600, 1067));
  verifier('poignées tirées aux coins d’une photo large : conseil « plat »', CADRE.cotesParalleles(pts([[0.1, 0.5], [0.9, 0.5], [1, 1], [0, 1]]), 1600, 1067));
}
// Les poignées du bas glissent le long des côtés : le plan reste le MÊME
// rectangle de sol. Vérifié sur la pièce « salon en angle », calibrée à la
// main : coin avant gauche hors photo à (−0,2258 ; 0,75).
{
  const calib = JSON.parse(lire('data/scenes/salon-angle.json'));
  const zc = calib.floorZones[0];
  const plan = (zc.plane && zc.plane.quad ? zc.plane : calib.planes[zc.planeRef]).quad;
  const t = 0.14;
  const surLeCote = { x: plan[0].x + (plan[3].x - plan[0].x) * t, y: plan[0].y + (plan[3].y - plan[0].y) * t };
  const rebati = CADRE.planDuCadre([plan[0], plan[1], plan[2], surLeCote], 1600, 1067);
  const ecart = rebati ? Math.hypot((rebati[3].x - plan[3].x) * 1600, (rebati[3].y - plan[3].y) * 1067) : Infinity;
  verifier(`poignée du bas posée le long du côté : le rectangle de sol est retrouvé (écart ${ecart.toFixed(1)} px sur 1600)`, ecart < 4);
  verifier('poignées retournées (devant au-dessus du fond) : aucun plan inventé', CADRE.planDuCadre(pts([[0.2, 0.8], [0.8, 0.8], [0.9, 0.6], [0.1, 0.6]]), 1600, 1067) === null);
}
// Dimensions lues dans la photo : sur les pièces calibrées à deux points de
// fuite, les proportions du sol sont celles mesurées à la main.
{
  const index = JSON.parse(lire('data/scenes/index.json'));
  const ids = (index.scenes || index).map((s) => s.id || s);
  let deuxFuites = 0;
  let pire = 0;
  for (const id of ids) {
    const s = JSON.parse(lire(`data/scenes/${id}.json`));
    const z = s.floorZones[0];
    const pl = z.plane && z.plane.quad ? z.plane : (s.planes || {})[z.planeRef];
    if (!pl) continue;
    const d = CADRE.dimensionsDuCadre(pl.quad, s.image.width, s.image.height);
    if (!d || d.focale === CADRE.FOCALE_DEFAUT) continue;
    deuxFuites += 1;
    pire = Math.max(pire, Math.abs(d.width / d.depth / (pl.meters.width / pl.meters.depth) - 1));
  }
  verifier(`proportions du sol lues dans la perspective : ${deuxFuites} pièces calibrées, écart max ${(pire * 100).toFixed(1)} % (< 5 %)`, deuxFuites >= 5 && pire < 0.05);
}
{
  const contour = CADRE.contourDuCadre(zonePhoto.plane.quad);
  verifier('contour du sol principal prolongé jusqu’au bas de la photo, coupé à l’image',
    contour.some((p) => p.y === 1 && p.x === 0) && contour.some((p) => p.y === 1 && p.x === 1) && dansImage(contour));
  const app = lire('js/studio/app.js');
  verifier('le plan suit les poignées (rectangle reconstruit, dimensions relues) sur une photo importée seulement',
    /target\.cadre = next\.map/.test(app) && /plan = planDuCadre\(next/.test(app) && /dimensionsDuCadre\(plan/.test(app) && /const photoImportee = renderer\.scene\.source === 'manual';/.test(app));
  verifier('l’éclairement est relu à la fin de chaque geste sur une poignée', /onGestureEnd\(\) \{\s*renderer\.refreshLighting\(\);/.test(app) && /finDeGeste\(\);/.test(lire('js/scene/editor.js')));
  verifier('éclairement robuste aux objets : réservé aux photos importées', /light: \{ robust: true \}/.test(lire('js/scene/schema.js')) && /robust: light\.robust === true/.test(lire('js/scene/schema.js')) && /if \(light\.robust\) ecarterLesObjets/.test(lire('js/scene/shading.js')));
}

/* ------------------------------------------------------------------ */
titre('§3 Terminer : un sol utilisable');
const P = (a) => a.map(([x, y]) => ({ x, y }));
verifier('cadre croisé refusé', EDITEUR.problemeCadre(P([[0.1, 0.5], [0.9, 0.5], [0.1, 1], [0.9, 1]])) !== null);
verifier('cadre minuscule refusé', EDITEUR.problemeCadre(P([[0.5, 0.5], [0.55, 0.5], [0.56, 0.55], [0.49, 0.55]])) !== null);
verifier('trois points confondus refusés', EDITEUR.problemeCadre(P([[0.2, 0.5], [0.2, 0.5], [1, 1], [0, 1]])) !== null);
verifier('cadre aux quatre coins de l’image accepté', EDITEUR.problemeCadre(P([[0, 0], [1, 0], [1, 1], [0, 1]])) === null);
verifier('cadre en trapèze de perspective accepté', EDITEUR.problemeCadre(P([[0.05, 0.515], [0.57, 0.553], [1, 1], [0, 1]])) === null);

/* ------------------------------------------------------------------ */
titre('§3 bis Scènes pré-calibrées : point réel et poignée affichée');
// Zone saisissable typique d'un téléphone de 390 px : la photo plus 8 px de
// marge de chaque côté, en fractions de l'image.
const ZONE = { x0: -0.02, x1: 1.02, y0: -0.03, y1: 1.03 };
const cas = [
  ['x = −0,2 → bord gauche', { x: -0.2, y: 0.6 }, { x: ZONE.x0, y: 0.6 }, 'gauche'],
  ['x = 1,25 → bord droit', { x: 1.25, y: 0.8 }, { x: ZONE.x1, y: 0.8 }, 'droite'],
  ['y < 0 → bord haut', { x: 0.4, y: -0.3 }, { x: 0.4, y: ZONE.y0 }, 'haut'],
  ['y > 1 → bord bas', { x: 0.5, y: 1.76 }, { x: 0.5, y: ZONE.y1 }, 'bas'],
  ['coin (1,132 ; 1,132) → angle bas droit', { x: 1.132, y: 1.132 }, { x: ZONE.x1, y: ZONE.y1 }, 'bas-droite'],
];
for (const [nom, reel, attendu, cote] of cas) {
  const copie = { ...reel };
  const ui = EDITEUR.projeterPoignee(reel, ZONE);
  verifier(`${nom} : poignée affichée au bord, côté « ${cote} »`, Math.abs(ui.x - attendu.x) < 1e-12 && Math.abs(ui.y - attendu.y) < 1e-12 && ui.hors === cote, JSON.stringify(ui));
  verifier(`${nom} : le point réel n’est pas modifié (${reel.x}, ${reel.y})`, reel.x === copie.x && reel.y === copie.y);
}
const visible = { x: -0.015, y: 0.5 };
const uiVisible = EDITEUR.projeterPoignee(visible, ZONE);
verifier('point hors photo mais visible à l’écran : affiché à sa place, sans indicateur', uiVisible.x === visible.x && uiVisible.hors === null);
const dansPhoto = EDITEUR.projeterPoignee({ x: 0, y: 1 }, { x0: 0, x1: 1, y0: 0, y1: 1 });
verifier('photo importée : un point au bord exact n’est jamais déplacé', dansPhoto.x === 0 && dansPhoto.y === 1 && dansPhoto.hors === null);
// Glisser : la valeur enregistrée reste la valeur réelle, jamais la valeur affichée.
const d0 = EDITEUR.deplacerPoint({ x: -0.2, y: 1.25 }, 0, 0);
verifier('prise sans mouvement : le point garde −0,2 et 1,25 (pas de saut vers la poignée)', d0.x === -0.2 && d0.y === 1.25);
const d1 = EDITEUR.deplacerPoint({ x: 1.25, y: 0.8 }, -0.05, 0.01);
verifier('déplacement d’un point hors photo : 1,25 → 1,20, sans être ramené à 1', Math.abs(d1.x - 1.2) < 1e-12 && Math.abs(d1.y - 0.81) < 1e-12);
const d2 = EDITEUR.deplacerPoint({ x: 1.25, y: 0.8 }, 0.3, 0);
verifier('jamais plus loin que son point de départ (1,25 reste la borne)', d2.x === 1.25);
const d3 = EDITEUR.deplacerPoint({ x: 1.25, y: 0.8 }, -0.6, 0);
verifier('ramené dans la photo : la valeur suit (0,65)', Math.abs(d3.x - 0.65) < 1e-12);
const d4 = EDITEUR.deplacerPoint({ x: 0.3, y: 0.5 }, -0.5, 0.9);
verifier('photo importée : bornes [0, 1] inchangées, bords atteints exactement', d4.x === 0 && d4.y === 1);

/* ------------------------------------------------------------------ */
titre('§3 ter Poignées trop proches : écartées à l’affichage seulement');
{
  // Seuil = diamètre de la zone de prise, lu dans la feuille de style : cercle
  // de 30 px + marge de saisie de 7 px de chaque côté.
  const css = lire('css/components/floor-editor.css');
  const largeur = Number((css.match(/\.floor-mask__handle \{[^}]*?width: (\d+)px;/) || [])[1]);
  const marge = Number((css.match(/\.floor-mask__handle::before \{[^}]*?inset: -(\d+)px;/) || [])[1]);
  const S = largeur + 2 * marge;
  verifier(`seuil = zone de prise du contrôle (${largeur} + 2 × ${marge} = ${S} px)`, S === 44);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ecran = { x0: -8, y0: -8, x1: 400, y1: 300 };
  const memes = (a, b) => a.every((p, i) => p.x === b[i].x && p.y === b[i].y);

  // CAS 1 — poignées espacées : rien ne bouge.
  const espaces = [{ x: 40, y: 200 }, { x: 260, y: 200 }, { x: 300, y: 240 }, { x: 40, y: 260 }];
  verifier('CAS 1 — centres à plus de 44 px : positions affichées inchangées', memes(EDITEUR.deconflire(espaces, S, ecran), espaces));

  // CAS 2 — le salon en angle à 390 px : 13 px entre les deux poignées de gauche.
  const proches = [{ x: 41.9, y: 220.8 }, { x: 275.7, y: 220.8 }, { x: 316.3, y: 243.1 }, { x: 29.1, y: 223.6 }];
  const vus = EDITEUR.deconflire(proches, S, ecran);
  const minPaires = (l) => Math.min(...l.flatMap((a, i) => l.slice(i + 1).map((b) => dist(a, b))));
  verifier(`CAS 2 — centres à ${dist(proches[0], proches[3]).toFixed(0)} px : deux cibles distinctes (${minPaires(vus).toFixed(1)} px ≥ ${S})`, minPaires(vus) >= S - 0.05);
  verifier('CAS 2 — les poignées déjà espacées ne bougent pas', vus[1].x === proches[1].x && vus[2].y === proches[2].y);

  // CAS 3 — points confondus : toujours deux contrôles.
  const confondus = EDITEUR.deconflire([{ x: 100, y: 100 }, { x: 100, y: 100 }], S, ecran);
  verifier('CAS 3 — points mathématiques identiques : deux contrôles sélectionnables', dist(confondus[0], confondus[1]) >= S - 0.05);
  const auBord = EDITEUR.deconflire([{ x: -8, y: 150 }, { x: -8, y: 152 }], S, ecran);
  verifier('point hors image ramené au bord + autre point au bord : deux contrôles dans l’écran',
    dist(auBord[0], auBord[1]) >= S - 0.05 && auBord.every((p) => p.x >= ecran.x0 && p.y >= ecran.y0 && p.y <= ecran.y1));

  // CAS 4 et 5 — glisser A (puis B) : seul SON point réel bouge. Le glisser
  // agit sur `prise.point`, le point de la poignée saisie, jamais sur un
  // voisin ; l'affichage n'écrit jamais dans les points.
  const reels = [{ x: 0.0575, y: 0.6532 }, { x: 0.7331, y: 0.6532 }, { x: 0.8506, y: 0.7498 }, { x: 0.0206, y: 0.6654 }];
  for (const [nom, k] of [['CAS 4 — glisser la poignée haute gauche (A)', 0], ['CAS 5 — glisser la poignée basse gauche (B)', 3]]) {
    const apres = reels.map((p) => ({ ...p }));
    apres[k] = EDITEUR.deplacerPoint(reels[k], 0, 0.03);
    verifier(`${nom} : seul son point bouge`, apres.every((p, i) => (i === k ? p.y !== reels[i].y : p.x === reels[i].x && p.y === reels[i].y)));
  }
  verifier('CAS 4/5 — l’affichage n’écrit jamais dans les points (positions d’affichage calculées à part)',
    /const affiche = |let affiche = /.test(codeEditeurDeconf()) && !/points\[index\] = .*affiche/.test(codeEditeurDeconf()));

  // CAS 6 — une fois éloignées, plus aucun écart d'affichage.
  const eloignes = [{ x: 41.9, y: 220.8 }, { x: 275.7, y: 220.8 }, { x: 316.3, y: 243.1 }, { x: 29.1, y: 290 }];
  verifier('CAS 6 — après éloignement (> 44 px) : écart d’affichage supprimé', memes(EDITEUR.deconflire(eloignes, S, ecran), eloignes));

  // Poignée tenue : elle reste sous le doigt, ce sont les autres qui s'écartent.
  const tenue = EDITEUR.deconflire(proches, S, ecran, 0);
  verifier('poignée tenue : elle ne bouge pas, l’autre s’écarte d’elle', tenue[0].x === proches[0].x && tenue[0].y === proches[0].y && dist(tenue[0], tenue[3]) >= S - 0.05);
  verifier('écart figé à la prise, relâché au lâcher', /tenue = \{\s*index,/.test(codeEditeurDeconf()) && /tenue = null;\s*placerPoignees\(activePoints\(\)\);/.test(codeEditeurDeconf()));
  verifier('seuil lu sur le contrôle (zone de prise), pas un nombre fixe', /deconflire\(px, diametrePrise\(boutons\[0\]\)/.test(codeEditeurDeconf()));
  verifier('trait vers le vrai point, seulement quand la poignée est écartée',
    /\.floor-mask__handle\[data-decale\]:not\(\[data-hors\]\) \.floor-mask__lien \{ display: block; \}/.test(css) && /\.floor-mask__lien \{\s*display: none;/.test(css));
}
function codeEditeurDeconf() { return lire('js/scene/editor.js'); }

/* ------------------------------------------------------------------ */
titre('§4 Garde-fous');
const codeEditeur = lire('js/scene/editor.js');
verifier('les poignées ne sont pas reconstruites pendant un glisser', /if \(cle !== construits\)/.test(codeEditeur) && /placerPoignees\(points\)/.test(codeEditeur));
verifier('capture du pointeur perdue gérée', /lostpointercapture/.test(codeEditeur));
verifier('pas de saut à la prise (glisser relatif depuis le point réel)', /prise = \{ x: event\.clientX, y: event\.clientY/.test(codeEditeur) && /deplacerPoint\(prise\.point/.test(codeEditeur));
verifier('bornes des poignées = bords de l’image', /export const clampPt = \(v\) => Math\.max\(0, Math\.min\(1, v\)\)/.test(codeEditeur));
const codeApp = lire('js/studio/app.js');
verifier('contour retouché : le cadre ne l’écrase plus', /!contoursRetouches\.has\(target\.id\)/.test(codeApp));
verifier('Terminer valide le cadre (les poignées posées, sur une photo importée) et le contour', codeApp.includes('problemeCadre(item.cadre || item.plane.quad)'));
const cssEditeur = lire('css/components/floor-editor.css');
verifier('aucun voile sur le rendu pendant le réglage', /\.floor-mask__shape \{\s*fill: none;/.test(cssEditeur));
verifier('zone de prise de 44 px (30 px + 2 × 7)', /width: 30px;/.test(cssEditeur) && /\.floor-mask__handle::before \{[^}]*inset: -7px;/.test(cssEditeur));
const cssStudio = lire('css/studio-app.css');
verifier('édition : poignées de bord non rognées', /\.studio__stage\[data-editing="true"\] \.stage__media \{ overflow: visible; \}/.test(cssStudio));
verifier('édition : la photo ne passe pas sous le tiroir (bureau, paysage, portrait)',
  /\.studio\[data-drawer="zone"\] \.studio__stage \{ padding-right:/.test(cssStudio) && /\.studio\[data-drawer="zone"\] \.studio__drawer \{\s*top: auto;/.test(cssStudio));
verifier('photo 100 % locale : aucun envoi réseau dans l’import', !/fetch\(|XMLHttpRequest|sendBeacon|FormData/.test(codeApp.slice(codeApp.indexOf('async function openPhoto'), codeApp.indexOf('async function openPhoto') + 1500)));

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
