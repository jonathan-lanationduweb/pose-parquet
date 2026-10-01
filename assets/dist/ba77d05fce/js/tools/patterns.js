/**
 * Registre des motifs de pose.
 *
 * Chaque motif expose :
 *  - id / label / short : identité éditoriale
 *  - build(ctx) : renvoie la liste des lames (polygones) en centimètres,
 *    dans le repère de la pièce (origine en haut à gauche, X = longueur).
 *  - advice(ctx) : conseil pédagogique contextuel.
 *
 * Ajouter un motif = ajouter une entrée dans PATTERNS, rien d'autre.
 */
import { seeded } from '../utils/dom.js';

const rotate = ([x, y], angleDeg, [cx, cy]) => {
  const a = (angleDeg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};

const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Rangées de lames droites, joints décalés, orientables. */
function straightRows(ctx, angleDeg) {
  const { length, width, plankWidth, plankLength } = ctx;
  const cx = length / 2;
  const cy = width / 2;
  const reach = Math.hypot(length, width) / 2 + plankLength;
  const random = seeded(Math.round(length * 7 + width * 13 + plankWidth));
  const planks = [];

  const rows = Math.ceil((reach * 2) / plankWidth) + 2;
  for (let r = 0; r < rows; r += 1) {
    const y = cy - reach + r * plankWidth;
    // Joints décalés d'un tiers de lame d'une rangée à l'autre
    const offset = (r % 3) * (plankLength / 3);
    const cols = Math.ceil((reach * 2) / plankLength) + 2;
    for (let c = 0; c < cols; c += 1) {
      const x = cx - reach - offset + c * plankLength;
      planks.push({
        points: rect(x, y, plankLength, plankWidth).map((p) => rotate(p, angleDeg, [cx, cy])),
        shade: random(),
      });
    }
  }
  return planks;
}

/**
 * Bâton rompu : lames à angle droit, bout contre chant.
 * Réseau généré par les vecteurs (L, L) et (W, -W), puis pivoté à 45°.
 */
function herringbone(ctx) {
  const { length, width, plankWidth: w, plankLength: l } = ctx;
  const cx = length / 2;
  const cy = width / 2;
  const reach = Math.hypot(length, width) / 2 + l * 1.5;
  const random = seeded(Math.round(length * 3 + width * 11 + w * 5));
  const planks = [];

  const steps = Math.ceil((reach * 2) / Math.min(l, w)) + 2;
  const half = Math.ceil(steps / 2);
  for (let i = -half; i <= half; i += 1) {
    for (let j = -half; j <= half; j += 1) {
      const ox = cx + i * l + j * w;
      const oy = cy + i * l - j * w;
      if (Math.abs(ox - cx) > reach + l || Math.abs(oy - cy) > reach + l) continue;
      planks.push({ points: rect(ox, oy, l, w).map((p) => rotate(p, 45, [cx, cy])), shade: random() });
      planks.push({ points: rect(ox + l, oy, w, l).map((p) => rotate(p, 45, [cx, cy])), shade: random() });
    }
  }
  return planks;
}

/**
 * Point de Hongrie : lames coupées à 45°, joints alignés en colonnes.
 * Chaque colonne empile deux parallélogrammes symétriques.
 */
function chevron(ctx) {
  const { length, width, plankWidth: w, plankLength: l } = ctx;
  const cx = length / 2;
  const cy = width / 2;
  const run = l / Math.SQRT2; // projection horizontale de la lame
  const step = w * Math.SQRT2; // décalage vertical entre deux lames
  const reach = Math.hypot(length, width) / 2 + l;
  const random = seeded(Math.round(length * 5 + width * 17 + w * 3));
  const planks = [];

  const cols = Math.ceil((reach * 2) / (run * 2)) + 2;
  const rows = Math.ceil((reach * 2 + run) / step) + 2;

  for (let c = -1; c <= cols; c += 1) {
    const x0 = cx - reach + c * run * 2;
    for (let r = -1; r <= rows; r += 1) {
      const y0 = cy - reach - run + r * step;
      planks.push({
        points: [
          [x0, y0],
          [x0 + run, y0 + run],
          [x0 + run, y0 + run + step],
          [x0, y0 + step],
        ],
        shade: random(),
      });
      planks.push({
        points: [
          [x0 + run * 2, y0],
          [x0 + run, y0 + run],
          [x0 + run, y0 + run + step],
          [x0 + run * 2, y0 + step],
        ],
        shade: random(),
      });
    }
  }
  return planks;
}

export const PATTERNS = [
  {
    id: 'longueur',
    label: 'Dans la longueur',
    short: 'Lames parallèles au grand côté de la pièce.',
    build: (ctx) => straightRows(ctx, 0),
    advice: (ctx) =>
      ctx.window === 'left' || ctx.window === 'right'
        ? 'Les lames suivent la longueur et filent vers la fenêtre : la lumière glisse le long des joints, qui se remarquent peu.'
        : 'Les lames suivent la longueur et étirent visuellement la pièce. Avec une fenêtre sur le grand côté, la lumière traverse les joints : vérifiez le rendu en lumière rasante.',
  },
  {
    id: 'largeur',
    label: 'Dans la largeur',
    short: 'Lames perpendiculaires au grand côté.',
    build: (ctx) => straightRows(ctx, 90),
    advice: () =>
      'Poser dans la largeur élargit visuellement un espace long et étroit, mais multiplie les coupes et souligne les joints en lumière rasante.',
  },
  {
    id: 'diagonale',
    label: 'Diagonale',
    short: 'Lames à 45° des murs.',
    build: (ctx) => straightRows(ctx, 45),
    advice: () =>
      'La pose en diagonale casse les lignes de la pièce et rattrape des murs non parallèles. Prévoyez 10 à 15 % de chutes supplémentaires.',
  },
  {
    id: 'point-de-hongrie',
    label: 'Point de Hongrie',
    short: 'Lames coupées à 45°, pointe continue.',
    build: chevron,
    advice: () =>
      'Le Point de Hongrie dessine une flèche continue qui guide le regard vers le fond de la pièce. Il demande des lames coupées à l’onglet, gauches et droites.',
  },
  {
    id: 'baton-rompu',
    label: 'Bâton rompu',
    short: 'Lames à angle droit, bout contre chant.',
    build: herringbone,
    advice: () =>
      'Le bâton rompu utilise des lames droites, sans coupe d’onglet : plus simple à approvisionner que le Point de Hongrie, pour un rendu très graphique.',
  },
];

export const getPattern = (id) => PATTERNS.find((pattern) => pattern.id === id) || PATTERNS[0];

/** Miniature SVG d'un motif, utilisée dans les listes et les sélecteurs. */
export function patternThumb(id, size = { w: 120, h: 90 }) {
  const ctx = { length: size.w, width: size.h, plankWidth: 8, plankLength: 34 };
  const pattern = getPattern(id);
  const planks = pattern.build(ctx);
  const uid = `thumb-${id}-${Math.round(size.w)}`;
  const shapes = planks
    .map(
      (plank) =>
        `<polygon points="${plank.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="hsl(${(34 + plank.shade * 8).toFixed(0)} ${(18 + plank.shade * 10).toFixed(0)}% ${(74 + plank.shade * 12).toFixed(0)}%)" stroke="rgba(60,50,40,.28)" stroke-width="0.7" />`
    )
    .join('');
  return `<svg viewBox="0 0 ${size.w} ${size.h}" role="img" aria-label="Motif ${pattern.label}" preserveAspectRatio="xMidYMid slice"><defs><clipPath id="${uid}"><rect width="${size.w}" height="${size.h}" /></clipPath></defs><g clip-path="url(#${uid})">${shapes}</g></svg>`;
}
