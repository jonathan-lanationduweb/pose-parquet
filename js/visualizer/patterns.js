/**
 * Génération procédurale des textures de parquet.
 *
 * Les motifs sont dessinés dans un canevas carré parfaitement répétable :
 * les dimensions des lames sont arrondies à un diviseur de la tuile, et
 * chaque forme est aussi dessinée décalée d'une tuile pour que les bords
 * se raccordent sans couture.
 *
 * Ajouter un motif = ajouter une entrée dans PATTERNS.
 */
import { seeded } from '../utils/dom.js';

export const TILE = 1024;
/** Côté de la tuile, exprimé en mètres de sol : sert d'échelle de référence. */
export const TILE_METERS = 2.4;

export const TONES = [
  { id: 'clair', label: 'Chêne très clair', base: [226, 209, 186], grain: [206, 186, 158] },
  { id: 'naturel', label: 'Chêne naturel', base: [206, 178, 143], grain: [184, 154, 118] },
  { id: 'miel', label: 'Chêne miel', base: [193, 149, 96], grain: [170, 126, 76] },
  { id: 'brun', label: 'Chêne brun', base: [149, 108, 74], grain: [124, 87, 58] },
  { id: 'fume', label: 'Chêne fumé', base: [104, 84, 71], grain: [82, 65, 55] },
  { id: 'graphite', label: 'Chêne graphite', base: [78, 76, 74], grain: [60, 58, 57] },
];

export const PATTERNS = [
  { id: 'lames', label: 'Lames droites', hint: 'Pose droite, joints décalés' },
  { id: 'point-de-hongrie', label: 'Point de Hongrie', hint: 'Chevrons, pointe continue' },
  { id: 'baton-rompu', label: 'Bâton rompu', hint: 'Lames à angle droit' },
];

export const getTone = (id) => TONES.find((t) => t.id === id) || TONES[1];

const rgb = ([r, g, b], shift = 0) =>
  `rgb(${Math.max(0, Math.min(255, r + shift))},${Math.max(0, Math.min(255, g + shift))},${Math.max(
    0,
    Math.min(255, b + shift)
  )})`;

/** Divise TILE en un nombre entier de pas proche de la valeur souhaitée. */
const fit = (target) => TILE / Math.max(1, Math.round(TILE / target));

/** Veinage : quelques stries longitudinales dans une lame. */
function grainStrokes(ctx, x, y, w, h, tone, random) {
  const lines = 2 + Math.floor(random() * 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineWidth = Math.max(1, h * 0.045);
  for (let i = 0; i < lines; i += 1) {
    const gy = y + h * (0.15 + random() * 0.7);
    ctx.strokeStyle = `rgba(${tone.grain[0]},${tone.grain[1]},${tone.grain[2]},${0.16 + random() * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(x - 4, gy);
    ctx.bezierCurveTo(x + w * 0.3, gy + h * 0.12 * (random() - 0.5), x + w * 0.7, gy - h * 0.12 * (random() - 0.5), x + w + 4, gy);
    ctx.stroke();
  }
  ctx.restore();
}

/** Une lame rectangulaire, avec sa teinte propre, son veinage et son joint. */
function plank(ctx, x, y, w, h, tone, random, rotate = 0) {
  const shift = Math.round((random() - 0.5) * 26);
  ctx.save();
  if (rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotate);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.fillStyle = rgb(tone.base, shift);
  ctx.fillRect(x, y, w, h);
  grainStrokes(ctx, x, y, w, h, tone, random);
  // Joint : ombre en haut/gauche, lumière en bas/droite
  ctx.strokeStyle = 'rgba(20,14,8,0.35)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.03);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

/** Dessine une forme et ses répliques décalées d'une tuile (raccord sans couture). */
function wrapped(ctx, draw) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      ctx.save();
      ctx.translate(dx * TILE, dy * TILE);
      draw();
      ctx.restore();
    }
  }
}

function drawStraight(ctx, tone, plankWidthM) {
  const h = fit((plankWidthM / TILE_METERS) * TILE);
  const w = fit(h * 7.5);
  const rows = Math.round(TILE / h);
  const cols = Math.round(TILE / w);
  const random = seeded(Math.round(plankWidthM * 1000) + 17);

  for (let r = 0; r < rows; r += 1) {
    const offset = ((r % 3) * w) / 3;
    for (let c = -1; c <= cols; c += 1) {
      const x = c * w + offset;
      const y = r * h;
      wrapped(ctx, () => plank(ctx, x, y, w, h, tone, random));
    }
  }
}

function drawHerringbone(ctx, tone, plankWidthM) {
  // Lame deux fois plus longue que large, réseau à 45°
  const w = fit((plankWidthM / TILE_METERS) * TILE);
  const l = w * 4;
  const random = seeded(Math.round(plankWidthM * 1000) + 41);
  const steps = Math.ceil((TILE * 1.6) / w) + 2;

  ctx.save();
  ctx.translate(TILE / 2, TILE / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-TILE / 2, -TILE / 2);
  for (let i = -steps; i <= steps; i += 1) {
    for (let j = -steps; j <= steps; j += 1) {
      const ox = TILE / 2 + i * l + j * w;
      const oy = TILE / 2 + i * l - j * w;
      if (Math.abs(ox - TILE / 2) > TILE * 1.6 || Math.abs(oy - TILE / 2) > TILE * 1.6) continue;
      plank(ctx, ox, oy, l, w, tone, random);
      plank(ctx, ox + l, oy, w, l, tone, random);
    }
  }
  ctx.restore();
}

function drawChevron(ctx, tone, plankWidthM) {
  const w = fit((plankWidthM / TILE_METERS) * TILE);
  const run = w * 3.4; // projection horizontale d'une lame
  const step = w * Math.SQRT2;
  const random = seeded(Math.round(plankWidthM * 1000) + 73);
  const cols = Math.ceil(TILE / (run * 2)) + 2;
  const rows = Math.ceil((TILE + run) / step) + 2;

  const para = (x0, y0, dir) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dir * run, y0 + run);
    ctx.lineTo(x0 + dir * run, y0 + run + step);
    ctx.lineTo(x0, y0 + step);
    ctx.closePath();
    ctx.fillStyle = rgb(tone.base, Math.round((random() - 0.5) * 26));
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,8,0.35)';
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    grainStrokes(ctx, x0 - run, y0, run * 2.2, step, tone, random);
    ctx.restore();
  };

  for (let c = -1; c <= cols; c += 1) {
    for (let r = -2; r <= rows; r += 1) {
      const x0 = c * run * 2;
      const y0 = r * step - run;
      wrapped(ctx, () => {
        para(x0, y0, 1);
        para(x0 + run * 2, y0, -1);
      });
    }
  }
}

/**
 * Fabrique la tuile de texture.
 * @param {{pattern:string, tone:string, plankWidth:number}} options
 *        plankWidth en mètres (0.09 → 0.26)
 * @returns {HTMLCanvasElement}
 */
export function buildTexture({ pattern, tone, plankWidth }) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  const toneDef = getTone(tone);

  ctx.fillStyle = rgb(toneDef.grain, -14);
  ctx.fillRect(0, 0, TILE, TILE);

  if (pattern === 'point-de-hongrie') drawChevron(ctx, toneDef, plankWidth);
  else if (pattern === 'baton-rompu') drawHerringbone(ctx, toneDef, plankWidth);
  else drawStraight(ctx, toneDef, plankWidth);

  return canvas;
}

/**
 * Pyramide de réduction : évite le moiré au fond de la pièce, là où
 * la texture est très compressée par la perspective.
 */
export function buildMips(base, levels = 4) {
  const mips = [base];
  for (let i = 1; i < levels; i += 1) {
    const prev = mips[i - 1];
    const size = Math.max(4, prev.width >> 1);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(prev, 0, 0, size, size);
    mips.push(canvas);
  }
  return mips.map((canvas) => {
    const ctx = canvas.getContext('2d');
    return {
      size: canvas.width,
      data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    };
  });
}
