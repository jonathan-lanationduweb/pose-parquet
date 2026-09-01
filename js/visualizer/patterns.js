/**
 * Textures de parquet.
 *
 * Deux sources possibles :
 *  - **procédurale** (par défaut) : le motif est dessiné dans un canevas carré
 *    parfaitement répétable — dimensions arrondies à un diviseur de la tuile,
 *    formes redessinées décalées d'une tuile pour un raccord sans couture ;
 *  - **photographique** : une tuile image répétable déposée dans
 *    assets/textures/<id>/tile.jpg (voir le README du dossier).
 *
 * Ajouter un motif = ajouter une entrée dans PATTERNS.
 * Ajouter une teinte = ajouter une entrée dans TONES (avec ou sans `file`).
 */
import { seeded } from '../utils/dom.js';

export const TILE = 1024;
/** Côté de la tuile, exprimé en mètres de sol : échelle de référence. */
export const TILE_METERS = 2.4;

export const TONES = [
  {
    id: 'clair',
    label: 'Chêne très clair',
    base: [228, 212, 190],
    grain: [203, 183, 156],
    warm: 4,
    spread: 16,
  },
  {
    id: 'naturel',
    label: 'Chêne naturel',
    base: [204, 176, 141],
    grain: [176, 146, 110],
    warm: 6,
    spread: 20,
  },
  {
    id: 'miel',
    label: 'Chêne miel',
    base: [190, 146, 94],
    grain: [162, 118, 70],
    warm: 8,
    spread: 22,
  },
  {
    id: 'brun',
    label: 'Chêne brun',
    base: [146, 106, 73],
    grain: [116, 81, 54],
    warm: 6,
    spread: 20,
  },
  {
    id: 'fume',
    label: 'Chêne fumé',
    base: [102, 83, 70],
    grain: [76, 61, 51],
    warm: 3,
    spread: 16,
  },
  {
    id: 'graphite',
    label: 'Chêne graphite',
    base: [78, 76, 74],
    grain: [56, 55, 54],
    warm: 0,
    spread: 14,
  },
];

export const PATTERNS = [
  { id: 'lames', label: 'Lames droites', hint: 'Pose droite, joints décalés' },
  { id: 'point-de-hongrie', label: 'Point de Hongrie', hint: 'Chevrons, pointe continue' },
  { id: 'baton-rompu', label: 'Bâton rompu', hint: 'Lames à angle droit' },
];

export const getTone = (id) => TONES.find((t) => t.id === id) || TONES[1];

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c, shift = 0, warm = 0) =>
  `rgb(${clampByte(c[0] + shift + warm)},${clampByte(c[1] + shift)},${clampByte(c[2] + shift - warm)})`;

/** Divise TILE en un nombre entier de pas proche de la valeur souhaitée. */
const fit = (target) => TILE / Math.max(1, Math.round(TILE / target));

/** Veinage : stries longitudinales irrégulières, densité variable par lame. */
function grain(ctx, x, y, w, h, tone, random) {
  const long = Math.max(w, h);
  const across = Math.min(w, h);
  const horizontal = w >= h;
  const lines = 7 + Math.floor(random() * 7);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (let i = 0; i < lines; i += 1) {
    const t = 0.06 + random() * 0.88;
    const alpha = 0.06 + random() * 0.2;
    // Stries fines et inégales : quelques-unes plus marquées que les autres
    ctx.lineWidth = Math.max(0.6, across * (0.008 + random() * 0.022));
    const tint = Math.round((random() - 0.5) * 14);
    ctx.strokeStyle = `rgba(${clampByte(tone.grain[0] + tint)},${clampByte(
      tone.grain[1] + tint
    )},${clampByte(tone.grain[2] + tint)},${alpha})`;
    ctx.beginPath();
    if (horizontal) {
      const gy = y + across * t;
      const wobble = across * 0.1 * (random() - 0.5);
      ctx.moveTo(x - 4, gy);
      ctx.bezierCurveTo(x + long * 0.3, gy + wobble, x + long * 0.7, gy - wobble, x + long + 4, gy);
    } else {
      const gx = x + across * t;
      const wobble = across * 0.1 * (random() - 0.5);
      ctx.moveTo(gx, y - 4);
      ctx.bezierCurveTo(gx + wobble, y + long * 0.3, gx - wobble, y + long * 0.7, gx, y + long + 4);
    }
    ctx.stroke();
  }

  // Quelques nœuds discrets, seulement sur une lame sur trois
  if (random() > 0.66) {
    const kx = x + w * (0.2 + random() * 0.6);
    const ky = y + h * (0.3 + random() * 0.4);
    const kr = across * (0.06 + random() * 0.06);
    const knot = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    knot.addColorStop(0, `rgba(${tone.grain[0]},${tone.grain[1]},${tone.grain[2]},0.45)`);
    knot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = knot;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Une lame : teinte propre, dégradé longitudinal, veinage, chanfrein, joint. */
function plank(ctx, x, y, w, h, tone, random) {
  const shift = Math.round((random() - 0.5) * tone.spread * 2);
  const warm = Math.round((random() - 0.5) * tone.warm);
  const horizontal = w >= h;

  ctx.save();
  // Fond + très léger dégradé dans la longueur (bois non uniforme)
  const gradient = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, rgb(tone.base, shift - 9, warm));
  gradient.addColorStop(0.45, rgb(tone.base, shift + 5, warm));
  gradient.addColorStop(1, rgb(tone.base, shift - 6, warm));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  grain(ctx, x, y, w, h, tone, random);

  // Chanfrein : légère arête claire en haut/gauche, ombre plus nette en bas/droite
  const bevel = Math.max(0.7, Math.min(w, h) * 0.03);
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fillRect(x, y, w, bevel);
  ctx.fillRect(x, y, bevel, h);
  ctx.fillStyle = 'rgba(34,23,14,0.2)';
  ctx.fillRect(x, y + h - bevel, w, bevel);
  ctx.fillRect(x + w - bevel, y, bevel, h);

  // Joint : micro-ombre entre deux lames, plus sombre que le chanfrein
  ctx.strokeStyle = 'rgba(38,26,16,0.46)';
  ctx.lineWidth = Math.max(0.8, Math.min(w, h) * 0.026);
  ctx.strokeRect(x + 0.4, y + 0.4, w - 0.8, h - 0.8);
  ctx.restore();
}

/** Dessine une forme et ses répliques décalées d'une tuile (raccord). */
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
    // Décalage variable : évite l'effet d'escalier trop régulier
    const offset = (((r % 3) + (r % 5) * 0.13) * w) / 3;
    for (let c = -1; c <= cols; c += 1) {
      const x = c * w + offset;
      const y = r * h;
      wrapped(ctx, () => plank(ctx, x, y, w, h, tone, random));
    }
  }
}

function drawHerringbone(ctx, tone, plankWidthM) {
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
  const run = w * 3.4;
  const step = w * Math.SQRT2;
  const random = seeded(Math.round(plankWidthM * 1000) + 73);
  const cols = Math.ceil(TILE / (run * 2)) + 2;
  const rows = Math.ceil((TILE + run) / step) + 2;

  const para = (x0, y0, dir) => {
    const shift = Math.round((random() - 0.5) * tone.spread * 2);
    const warm = Math.round((random() - 0.5) * tone.warm);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dir * run, y0 + run);
    ctx.lineTo(x0 + dir * run, y0 + run + step);
    ctx.lineTo(x0, y0 + step);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(x0, y0, x0 + dir * run, y0 + run);
    gradient.addColorStop(0, rgb(tone.base, shift - 5, warm));
    gradient.addColorStop(0.5, rgb(tone.base, shift + 4, warm));
    gradient.addColorStop(1, rgb(tone.base, shift - 4, warm));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.save();
    ctx.clip();
    grain(ctx, x0 - run, y0, run * 2.2, step, tone, random);
    // Chanfrein sur l'arête haute
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(x0 - run, y0, run * 2.2, Math.max(0.8, w * 0.05));
    ctx.restore();
    ctx.strokeStyle = 'rgba(48,34,22,0.30)';
    ctx.lineWidth = Math.max(0.7, w * 0.022);
    ctx.stroke();
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

/** Grain fin appliqué à toute la tuile : casse l'aspect « image de synthèse ». */
function filmGrain(ctx, amount = 7) {
  const image = ctx.getImageData(0, 0, TILE, TILE);
  const data = image.data;
  const random = seeded(9173);
  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * amount;
    data[i] = clampByte(data[i] + noise);
    data[i + 1] = clampByte(data[i + 1] + noise);
    data[i + 2] = clampByte(data[i + 2] + noise);
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Fabrique la tuile de texture.
 * @param {{pattern:string, tone:string, plankWidth:number}} options
 * @returns {HTMLCanvasElement}
 */
export function buildTexture({ pattern, tone, plankWidth }) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const toneDef = getTone(tone);

  ctx.fillStyle = rgb(toneDef.grain, -12);
  ctx.fillRect(0, 0, TILE, TILE);

  if (pattern === 'point-de-hongrie') drawChevron(ctx, toneDef, plankWidth);
  else if (pattern === 'baton-rompu') drawHerringbone(ctx, toneDef, plankWidth);
  else drawStraight(ctx, toneDef, plankWidth);

  filmGrain(ctx);
  return canvas;
}

/**
 * Charge une tuile photographique (assets/textures/<id>/tile.jpg).
 * Renvoie null si le fichier n'existe pas : le motif procédural prend le relais.
 */
export function loadPhotoTexture(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TILE;
      canvas.height = TILE;
      canvas.getContext('2d').drawImage(img, 0, 0, TILE, TILE);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Pyramide de réduction : évite le moiré au fond de la pièce, là où la
 * texture est très compressée par la perspective.
 */
export function buildMips(base, levels = 5) {
  const mips = [base];
  for (let i = 1; i < levels; i += 1) {
    const prev = mips[i - 1];
    const size = Math.max(4, prev.width >> 1);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(prev, 0, 0, size, size);
    mips.push(canvas);
  }
  return mips.map((canvas) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return {
      size: canvas.width,
      data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    };
  });
}
