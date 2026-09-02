/**
 * Outil interne de calibrage des scènes.
 *
 * Sert à préparer à la main ce qu'un service d'analyse produira plus tard :
 * zones de sol, plans de perspective, trous, occlusions. La page n'est ni
 * liée, ni indexée, ni construite — elle vit dans _calibrage/ et n'est
 * chargée que par le développeur.
 *
 * Elle sert aussi de banc d'essai entre les deux moteurs de rendu.
 */
import { analyzeScene, loadSceneIndex } from '../js/scene/analyzer.js';
import { createSceneRenderer } from '../js/scene/renderer.js';
import { createMaterial } from '../js/scene/material.js';
import { loadImage } from '../js/scene/image-loader.js';
import { zoneTransform } from '../js/scene/geometry.js';

const BASE = '../';
const $ = (id) => document.getElementById(id);
const log = (...parts) => {
  $('log').textContent += `${parts.join(' ')}\n`;
  $('log').scrollTop = $('log').scrollHeight;
};

const catalog = await fetch(`${BASE}data/parquets.json`).then((r) => r.json());
const materials = catalog.parquets.map(createMaterial);
const index = await loadSceneIndex(BASE);

const renderer = createSceneRenderer();
$('backend').textContent = `${renderer.backend} · aniso ×${renderer.anisotropy}`;

index.scenes.forEach((entry) => {
  $('scene').append(new Option(`${entry.id} — ${entry.label}`, entry.id));
});
materials.forEach((m) => $('material').append(new Option(m.name, m.id)));
catalog.patterns.forEach((p) => $('pattern').append(new Option(p.label, p.id)));
$('material').value = 'chene-naturel';

let scene = null;
let showOverlay = true;
let forceCanvas = false;

const config = () => ({
  material: materials.find((m) => m.id === $('material').value),
  pattern: $('pattern').value,
  angle: Number($('angle').value) || 0,
  width: null,
  scale: 1,
});

async function load(id) {
  scene = await analyzeScene({ sceneId: id, base: BASE });
  const prepared = await loadImage(`${BASE}assets/images/${scene.image.file}`);
  renderer.setScene(scene, prepared);
  log(
    `\n=== ${scene.id} — ${prepared.width}×${prepared.height} — ${scene.floorZones.length} zone(s), ` +
      `${scene.surfaces.length} surface(s), ${scene.occluders.length} occlusion(s)`
  );
  scene.floorZones.forEach((zone) => {
    const box = renderer.masks.box(zone.id);
    const t = zoneTransform(zone, prepared.width, prepared.height);
    log(
      `  ${zone.id.padEnd(20)} surface=${zone.surfaceId.padEnd(12)} ` +
        `${zone.plane.meters.width}×${zone.plane.meters.depth} m  ` +
        `boîte=${box ? `${box.x1 - box.x0}×${box.y1 - box.y0}` : 'VIDE'}  ` +
        `origine=(${zone.plane.origin.u}, ${zone.plane.origin.v})  ` +
        `${t ? 'plan ok' : 'PLAN INVALIDE'}`
    );
  });
  draw();
  paintOverlay();
}

function draw() {
  const canvas = $('out');
  const t0 = performance.now();
  const ok = forceCanvas ? renderer.paintWithCanvas(canvas, config()) : renderer.paint(canvas, config());
  const ms = performance.now() - t0;
  if (!ok) log('  rendu refusé');
  paintLoupe();
  $('backend').textContent = `${forceCanvas ? 'canvas (forcé)' : renderer.backend} · aniso ×${
    renderer.anisotropy
  } · ${ms.toFixed(1)} ms`;
}

/* ---------------- Repères ---------------- */

const ns = 'http://www.w3.org/2000/svg';
const el = (name, attrs) => {
  const node = document.createElementNS(ns, name);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
};
const path = (points) => points.map((p) => `${p.x * 1000},${p.y * 1000}`).join(' ');

function paintOverlay() {
  const svg = $('overlay');
  svg.innerHTML = '';
  svg.style.display = showOverlay ? 'block' : 'none';
  if (!showOverlay || !scene) return;

  const grid = el('g', { class: 'grid' });
  for (let i = 0; i <= 20; i += 1) {
    const v = i * 50;
    const major = i % 2 === 0;
    grid.append(el('line', { x1: v, y1: 0, x2: v, y2: 1000, class: major ? 'major' : '' }));
    grid.append(el('line', { x1: 0, y1: v, x2: 1000, y2: v, class: major ? 'major' : '' }));
    if (major && i > 0 && i < 20) {
      grid.append(Object.assign(el('text', { x: v + 2, y: 11 }), { textContent: (i / 20).toFixed(2) }));
      grid.append(Object.assign(el('text', { x: 2, y: v - 2 }), { textContent: (i / 20).toFixed(2) }));
    }
  }
  svg.append(grid);

  if (scene.camera.horizon !== null) {
    svg.append(el('line', { x1: 0, y1: scene.camera.horizon * 1000, x2: 1000, y2: scene.camera.horizon * 1000, class: 'horizon' }));
  }

  scene.floorZones.forEach((zone) => {
    svg.append(el('polygon', { points: path(zone.plane.quad), class: 'quadline' }));
    svg.append(el('polygon', { points: path(zone.mask.polygon), class: 'zone' }));
    zone.mask.holes.forEach((hole) => svg.append(el('polygon', { points: path(hole), class: 'hole' })));
    zone.mask.polygon.forEach((p, i) => {
      svg.append(el('circle', { cx: p.x * 1000, cy: p.y * 1000, r: 3, class: 'pt' }));
      svg.append(Object.assign(el('text', { x: p.x * 1000 + 5, y: p.y * 1000 - 4, class: 'lbl' }), { textContent: i }));
    });
    const c = zone.mask.polygon.reduce((s, p) => ({ x: s.x + p.x / zone.mask.polygon.length, y: s.y + p.y / zone.mask.polygon.length }), { x: 0, y: 0 });
    svg.append(Object.assign(el('text', { x: c.x * 1000, y: c.y * 1000, class: 'lbl' }), { textContent: zone.id }));
  });

  scene.occluders.forEach((occ) => {
    svg.append(el('polygon', { points: path(occ.polygon), class: 'occ' }));
  });
}


/* ---------------- Orientation réelle du plancher ---------------- */

/**
 * Direction des lames du sol **d'origine**, mesurée par tenseur de structure.
 *
 * C'est la mesure qui manquait, et l'absence de laquelle tout le reste était
 * faux. Un quadrilatère de perspective n'a de sens que s'il est **l'image d'un
 * rectangle réel du sol** : son axe u doit suivre une direction réelle de la
 * pièce. En posant à la place un trapèze symétrique « qui couvre le sol », on
 * force l'axe des lames à l'horizontale de l'écran — et le rendu donne une
 * plaque qui remonte, avec sa propre perspective, indépendante de la pièce.
 *
 * Le plancher photographié porte déjà l'information : ses joints sont des
 * droites parallèles à un axe de la pièce. On lit donc l'orientation locale
 * du motif, en plusieurs points, et on en déduit le point de fuite.
 *
 * Méthode : dans une fenêtre autour du point, on somme le tenseur des
 * gradients J = Σ [[gx², gxgy], [gxgy, gy²]]. Le vecteur propre dominant donne
 * la direction du **gradient** ; les joints sont perpendiculaires. La cohérence
 * (rapport des valeurs propres) dit si la mesure vaut quelque chose : sur une
 * zone lisse ou bruitée, elle tombe à zéro et il faut choisir un autre point.
 *
 * @returns {{angle:number, coherence:number, dir:{x,y}}} angle en degrés,
 *          mesuré depuis l'horizontale de l'image, dans le sens des y croissants
 */
function plankOrientation(nx, ny, radiusPx = 60) {
  const photo = renderer.photo;
  const w = photo.width;
  const h = photo.height;
  const ctx = photo.getContext('2d', { willReadFrequently: true });
  const cx = Math.round(nx * w);
  const cy = Math.round(ny * h);
  const r = radiusPx;
  const x0 = Math.max(1, cx - r);
  const y0 = Math.max(1, cy - r);
  const x1 = Math.min(w - 1, cx + r);
  const y1 = Math.min(h - 1, cy + r);
  const img = ctx.getImageData(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2).data;
  const stride = x1 - x0 + 2;
  const lum = (x, y) => {
    const p = ((y + 1) * stride + (x + 1)) * 4;
    return 0.2126 * img[p] + 0.7152 * img[p + 1] + 0.0722 * img[p + 2];
  };

  let jxx = 0;
  let jxy = 0;
  let jyy = 0;
  for (let y = 0; y < y1 - y0; y += 1) {
    for (let x = 0; x < x1 - x0; x += 1) {
      const gx = lum(x + 1, y) - lum(x - 1, y);
      const gy = lum(x, y + 1) - lum(x, y - 1);
      jxx += gx * gx;
      jxy += gx * gy;
      jyy += gy * gy;
    }
  }
  // Valeurs propres du tenseur 2×2
  const tr = jxx + jyy;
  const det = jxx * jyy - jxy * jxy;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const coherence = l1 > 1e-6 ? (l1 - l2) / (l1 + l2) : 0;
  // Vecteur propre dominant = direction du gradient ; les joints sont à 90°
  const gAngle = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
  const angle = ((gAngle * 180) / Math.PI + 90 + 180) % 180;
  const rad = (angle * Math.PI) / 180;
  return { angle: +angle.toFixed(2), coherence: +coherence.toFixed(3), dir: { x: Math.cos(rad), y: Math.sin(rad) } };
}

/** Intersection de deux droites données par un point et une direction. */
function intersect(p1, d1, p2, d2) {
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null; // parallèles à l'écran : fuite à l'infini
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

/**
 * Point de fuite de la direction des lames, en coordonnées normalisées.
 * Trois points ou plus : on prend la médiane des intersections deux à deux,
 * bien plus robuste qu'une seule paire.
 */
function plankVanishingPoint(points, radiusPx = 60) {
  const w = renderer.size.width;
  const h = renderer.size.height;
  const samples = points.map(([nx, ny]) => {
    const o = plankOrientation(nx, ny, radiusPx);
    return { p: { x: nx * w, y: ny * h }, d: o.dir, angle: o.angle, coherence: o.coherence, at: [nx, ny] };
  });
  const hits = [];
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const q = intersect(samples[i].p, samples[i].d, samples[j].p, samples[j].d);
      if (q) hits.push(q);
    }
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const vp = hits.length ? { x: median(hits.map((q) => q.x)), y: median(hits.map((q) => q.y)) } : null;
  return {
    samples: samples.map((s) => ({ at: s.at, angle: s.angle, coherence: s.coherence })),
    vp: vp ? { x: +(vp.x / w).toFixed(4), y: +(vp.y / h).toFixed(4) } : null,
    intersections: hits.length,
  };
}

/**
 * Quadrilatère de plan construit à partir de la géométrie de la pièce.
 *
 * @param {object} o
 * @param {{x,y}} o.vpU  point de fuite de l'axe u (le long des lames), normalisé
 * @param {{x,y}} o.vpV  point de fuite de l'axe v (perpendiculaire)
 * @param {{x,y}} o.corner  un coin du rectangle, sur le sol
 * @param {{x,y}} o.alongU  second point du rectangle, dans la direction u
 * @param {{x,y}} o.alongV  second point, dans la direction v
 * @returns {{x,y}[]} quatre points, dans l'ordre attendu par le moteur
 *
 * Le quatrième coin n'est pas choisi : il est **imposé** par la perspective —
 * intersection de la droite (alongU → vpV) et de (alongV → vpU). C'est ce qui
 * garantit que le quadrilatère est bien l'image d'un rectangle, et donc que
 * l'homographie a un sens.
 */
function quadFromRoom({ vpU, vpV, corner, alongU, alongV }) {
  const dir = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const fourth = intersect(alongU, dir(alongU, vpV), alongV, dir(alongV, vpU));
  if (!fourth) throw new Error('quatrième coin indéterminé');
  const round = (p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) });
  // ordre du moteur : fond-gauche, fond-droite, proche-droite, proche-gauche
  return [round(corner), round(alongU), round(fourth), round(alongV)];
}

/* ---------------- Loupe ---------------- */

/**
 * Une capture d'écran est réduite : à 1 pixel écran pour 2 pixels de canevas,
 * on ne peut juger ni la netteté des lames au fond, ni la propreté d'un bord.
 * La loupe recopie une portion du rendu à l'échelle voulue.
 */
let loupeOn = false;
let focus = { x: 0.5, y: 0.82 };

function paintLoupe() {
  const target = $('loupe');
  target.hidden = !loupeOn;
  target.style.display = loupeOn ? 'block' : 'none';
  // La loupe remplace la vue d'ensemble : les deux côte à côte ne tiennent
  // pas à l'écran, et on ne regarde jamais les deux en même temps.
  document.querySelector('main').style.display = loupeOn ? 'none' : 'block';
  if (!loupeOn) return;
  const zoom = Number($('loupe-zoom').value) || 2;
  const source = $('out');
  const w = Math.round(target.width / zoom);
  const h = Math.round(target.height / zoom);
  const sx = Math.round(focus.x * source.width - w / 2);
  const sy = Math.round(focus.y * source.height - h / 2);
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(source, sx, sy, w, h, 0, 0, target.width, target.height);
  // Grille cotée en coordonnées normalisées de l'image : c'est elle qui
  // permet de relever un point au centième sans calcul mental.
  ctx.font = '13px ui-monospace, monospace';
  ctx.lineWidth = 1;
  const gridStep = zoom >= 4 ? 0.005 : 0.01;
  const drawLines = (horizontal) => {
    const span = horizontal ? h / source.height : w / source.width;
    const start = horizontal ? sy / source.height : sx / source.width;
    const first = Math.ceil(start / gridStep) * gridStep;
    for (let v = first; v < start + span; v += gridStep) {
      const t = ((v - start) / span) * (horizontal ? target.height : target.width);
      const strong = Math.abs(v / (gridStep * 5) - Math.round(v / (gridStep * 5))) < 1e-6;
      ctx.strokeStyle = strong ? '#ffd84daa' : '#ffffff33';
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(0, t);
        ctx.lineTo(target.width, t);
      } else {
        ctx.moveTo(t, 0);
        ctx.lineTo(t, target.height);
      }
      ctx.stroke();
      if (strong) {
        ctx.fillStyle = '#ffd84d';
        if (horizontal) ctx.fillText(v.toFixed(3), 4, t - 4);
        else ctx.fillText(v.toFixed(3), t + 3, target.height - 6);
      }
    }
  };
  drawLines(false);
  drawLines(true);

  // Contours de la scène, dans le repère de la loupe : c'est le seul moyen de
  // vérifier qu'une limite tombe bien au pied d'une plinthe, et pas 15 px
  // au-dessus. À l'échelle de la vue d'ensemble, cet écart ne se voit pas.
  if (scene && showOverlay) {
    const toLoupe = (p) => [
      ((p.x * source.width - sx) / w) * target.width,
      ((p.y * source.height - sy) / h) * target.height,
    ];
    const stroke = (points, color, dash) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      points.forEach((p, i) => {
        const [px, py] = toLoupe(p);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      points.forEach((p) => {
        const [px, py] = toLoupe(p);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };
    scene.floorZones.forEach((zone) => {
      stroke(zone.mask.polygon, '#3ad19a');
      zone.mask.holes.forEach((hole) => stroke(hole, '#ff9d4d', [6, 4]));
    });
    scene.occluders.forEach((occ) => stroke(occ.polygon, '#ff5d7a', [4, 3]));
  }

  ctx.strokeStyle = '#ffd84d';
  ctx.strokeRect(0.5, 0.5, target.width - 1, target.height - 1);
  ctx.fillStyle = '#000c';
  ctx.fillRect(0, 0, 640, 28);
  ctx.fillStyle = '#ffd84d';
  ctx.font = '16px ui-monospace, monospace';
  ctx.fillText(`×${zoom} · centre ${focus.x.toFixed(3)}, ${focus.y.toFixed(3)} · pas de grille ${gridStep}`, 10, 20);
}

/** Rend la photo brute : indispensable pour relever le bas des murs. */
function showPhoto() {
  const canvas = $('out');
  canvas.width = renderer.size.width;
  canvas.height = renderer.size.height;
  canvas.getContext('2d').drawImage(renderer.photo, 0, 0);
  paintLoupe();
}

/* ---------------- Relevé du bas des murs ---------------- */

/**
 * Aide au relevé, pas une détection.
 *
 * Le bas d'un mur est, dans une photo d'intérieur, la plus forte montée de
 * « chaleur » (R − B) quand on descend : la plinthe est claire et neutre, le
 * sol est chaud. On renvoie le **début** de cette montée et non son sommet :
 * la transition s'étale sur quelques pixels, et prendre le sommet place la
 * limite deux ou trois pixels trop bas — assez pour laisser une bande de
 * l'ancien sol visible sous la plinthe, ce qui saute aux yeux.
 *
 * Chaque valeur produite ici est ensuite vérifiée à la loupe, contour affiché,
 * avant d'entrer dans data/scenes/. C'est un outil de développement : rien de
 * tout cela ne tourne dans le visualiseur.
 */
function wallFoot(photo, nx, y0n, y1n) {
  const width = photo.width;
  const height = photo.height;
  const data = photo.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data;
  const x = Math.round(nx * width);
  const rows = [];
  for (let y = Math.round(y0n * height); y < Math.round(y1n * height); y += 1) {
    let warm = 0;
    let luma = 0;
    for (let dx = -4; dx <= 4; dx += 1) {
      const p = (y * width + Math.min(width - 1, Math.max(0, x + dx))) * 4;
      warm += data[p] - data[p + 2];
      luma += 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
    rows.push({ y, warm: warm / 9, luma: luma / 9 });
  }
  const score = rows.map((r, i) => {
    const a = rows[Math.max(0, i - 2)];
    const b = rows[Math.min(rows.length - 1, i + 2)];
    return (b.warm - a.warm) + (b.luma - a.luma) * 0.3;
  });
  let peak = 0;
  for (let i = 2; i < score.length - 2; i += 1) if (score[i] > score[peak]) peak = i;
  // Remontée jusqu'au pied de la pente : là commence réellement le sol.
  const floorLevel = score[peak] * 0.22;
  let start = peak;
  while (start > 1 && score[start - 1] > floorLevel) start -= 1;
  return { ny: +(rows[start].y / height).toFixed(4), force: +score[peak].toFixed(1) };
}

/** Relevé d'une série de colonnes, prêt à coller dans une scène. */
function survey(columns, y0, y1) {
  const rows = columns.map((nx) => {
    const found = wallFoot(renderer.photo, nx, y0, y1);
    return { nx, ...found };
  });
  log(`\n  relevé ${y0}–${y1} :`);
  log(`  [${rows.map((r) => `{ "x": ${r.nx}, "y": ${r.ny} }`).join(', ')}]`);
  return rows;
}

/* ---------------- Banc d'essai ---------------- */

async function bench() {
  const canvas = document.createElement('canvas');
  const cfg = config();
  const runs = 7;
  const time = (fn) => {
    fn(); // premier passage : compilation, textures, caches
    const t0 = performance.now();
    for (let i = 0; i < runs; i += 1) fn();
    return (performance.now() - t0) / runs;
  };

  log(`\n--- Banc d'essai · ${scene.id} · ${renderer.size.width}×${renderer.size.height} · ${scene.floorZones.length} zone(s)`);
  const cpuFull = time(() => renderer.paintWithCanvas(canvas, cfg, null, 1));
  const cpuDraft = time(() => renderer.paintWithCanvas(canvas, cfg, null, 2));
  log(`  Canvas 2D  pleine résolution : ${cpuFull.toFixed(1)} ms`);
  log(`  Canvas 2D  rendu allégé      : ${cpuDraft.toFixed(1)} ms`);
  if (renderer.backend === 'webgl2') {
    const glTime = time(() => renderer.paint(canvas, cfg));
    log(`  WebGL 2                      : ${glTime.toFixed(1)} ms   (×${(cpuFull / glTime).toFixed(1)})`);
    // Changement de matériau : c'est là que se joue le confort d'usage
    let i = 0;
    const swap = time(() => {
      i += 1;
      renderer.paint(canvas, { ...cfg, material: materials[i % materials.length] });
    });
    log(`  WebGL 2, changement de bois  : ${swap.toFixed(1)} ms`);
    let j = 0;
    const swapCpu = time(() => {
      j += 1;
      renderer.paintWithCanvas(canvas, { ...cfg, material: materials[j % materials.length] }, null, 1);
    });
    log(`  Canvas 2D, changement de bois: ${swapCpu.toFixed(1)} ms`);
  }
}

/* ---------------- Événements ---------------- */

$('scene').addEventListener('change', () => load($('scene').value));
['material', 'pattern', 'angle'].forEach((id) =>
  $(id).addEventListener('change', () => {
    draw();
  })
);
$('toggle-overlay').addEventListener('click', (e) => {
  showOverlay = !showOverlay;
  e.currentTarget.setAttribute('aria-pressed', String(showOverlay));
  paintOverlay();
});
$('toggle-engine').addEventListener('click', (e) => {
  forceCanvas = !forceCanvas;
  e.currentTarget.setAttribute('aria-pressed', String(forceCanvas));
  e.currentTarget.textContent = forceCanvas ? 'Canvas forcé' : 'Moteur Canvas';
  draw();
});
$('bench').addEventListener('click', bench);
$('loupe-btn').addEventListener('click', (e) => {
  loupeOn = !loupeOn;
  e.currentTarget.setAttribute('aria-pressed', String(loupeOn));
  paintLoupe();
});
$('loupe-zoom').addEventListener('change', paintLoupe);
$('wrap').addEventListener('click', (event) => {
  const rect = $('wrap').getBoundingClientRect();
  focus = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  paintLoupe();
});
$('dump').addEventListener('click', async () => {
  await navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
  log('  scène copiée dans le presse-papiers');
});

// Lecture directe des coordonnées sous le curseur : c'est avec ça qu'on
// calibre, en relevant les points sur la photo.
$('wrap').addEventListener('mousemove', (event) => {
  const rect = $('wrap').getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  $('cursor').textContent = `{ "x": ${x.toFixed(3)}, "y": ${y.toFixed(3)} }`;
});

await load($('scene').value);
window.calibrage = { renderer, get scene() { return scene; }, load, draw, bench, materials, showPhoto, wallFoot, survey, plankOrientation, plankVanishingPoint, quadFromRoom, intersect, setFocus(x, y, zoom) { focus = { x, y }; if (zoom) $('loupe-zoom').value = String(zoom); if (!loupeOn) $('loupe-btn').click(); else paintLoupe(); } };
