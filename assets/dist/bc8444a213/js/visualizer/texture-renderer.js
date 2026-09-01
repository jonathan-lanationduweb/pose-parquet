/**
 * Rendu du parquet dans la photo.
 *
 * Chaîne de rendu :
 *   photo d'origine
 *     → texture projetée par homographie (perspective)
 *     → masque de couverture (polygone + pinceau)
 *     → ombrage repris de la luminance de la photo
 *     → pixels d'origine conservés hors masque (meubles, tapis, objets)
 *
 * Tout se fait en Canvas 2D + tableaux typés : pas de WebGL, pas de shader,
 * pas de dépendance. Le paramètre `step` permet un rendu allégé pendant les
 * interactions (curseurs, pinceau), puis un rendu pleine résolution au repos.
 */
import { squareToQuad, invert, bounds } from './perspective.js';
import { TILE, TILE_METERS } from '../studio/texture.js';

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Luminance moyenne de la zone couverte, référence de l'ombrage. */
function referenceLuma(src, box, width, mask) {
  let sum = 0;
  let count = 0;
  const stepX = Math.max(1, Math.round((box.x1 - box.x0) / 60));
  const stepY = Math.max(1, Math.round((box.y1 - box.y0) / 60));
  for (let y = box.y0; y < box.y1; y += stepY) {
    for (let x = box.x0; x < box.x1; x += stepX) {
      const i = y * width + x;
      if (mask && mask[i] < 128) continue;
      const p = i * 4;
      sum += 0.2126 * src[p] + 0.7152 * src[p + 1] + 0.0722 * src[p + 2];
      count += 1;
    }
  }
  return count ? sum / count : 128;
}

/** Boîte englobante des pixels couverts par le masque. */
function maskBounds(mask, width, height) {
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < height; y += 2) {
    const row = y * width;
    for (let x = 0; x < width; x += 2) {
      if (mask[row + x] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return null;
  return {
    x0: Math.max(0, x0 - 2),
    y0: Math.max(0, y0 - 2),
    x1: Math.min(width, x1 + 3),
    y1: Math.min(height, y1 + 3),
  };
}

/**
 * @param {object} o
 * @param {ImageData} o.source     photo d'origine
 * @param {ImageData} o.target     buffer de sortie (réutilisé)
 * @param {{x:number,y:number}[]} o.quad  cadre de perspective, en pixels
 * @param {Uint8ClampedArray} [o.mask]    couverture (0 → 255), taille image
 * @param {{size:number,data:Uint8ClampedArray}[]} o.mips
 * @param {number} o.angle         rotation du motif (radians)
 * @param {number} o.roomWidth     largeur réelle couverte par le cadre (m)
 * @param {number} o.roomDepth     profondeur réelle couverte par le cadre (m)
 * @param {number} o.shading       report des ombres (0 → 1)
 * @param {number} [o.step]        1 = pleine résolution, 2 = rendu allégé
 */
export function renderFloor({
  source,
  target,
  quad,
  mask = null,
  mips,
  angle = 0,
  roomWidth = 4,
  roomDepth = 4,
  shading = 0.92,
  contrast = 1,
  step = 1,
}) {
  const width = source.width;
  const height = source.height;
  const src = source.data;
  const out = target.data;

  out.set(src);

  const H = squareToQuad(quad);
  if (!H) return false;
  const M = invert(H);
  if (!M) return false;

  const box = mask ? maskBounds(mask, width, height) : bounds(quad, width, height);
  if (!box) return true; // masque vide : la photo reste telle quelle
  const ref = Math.max(24, referenceLuma(src, box, width, mask));

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scaleU = (roomWidth / TILE_METERS) * TILE;
  const scaleV = (roomDepth / TILE_METERS) * TILE;

  const [a, b, c, d, e, f, g, h, i] = M;
  const maxLevel = mips.length - 1;
  const px = Math.max(1, Math.round(step));

  for (let y = box.y0; y < box.y1; y += px) {
    const py = y + 0.5;
    let nx = a * (box.x0 + 0.5) + b * py + c;
    let ny = d * (box.x0 + 0.5) + e * py + f;
    let nw = g * (box.x0 + 0.5) + h * py + i;
    const ax = a * px;
    const dx = d * px;
    const gx = g * px;

    for (let x = box.x0; x < box.x1; x += px, nx += ax, ny += dx, nw += gx) {
      const index = y * width + x;
      const cover = mask ? mask[index] / 255 : 1;
      if (cover <= 0.004) continue;
      if (nw === 0) continue;

      const invW = 1 / nw;
      const u = nx * invW;
      const v = ny * invW;

      const invW2 = invW * invW;
      const dudx = (a * nw - g * nx) * invW2;
      const dvdx = (d * nw - g * ny) * invW2;
      const dudy = (b * nw - h * nx) * invW2;
      const dvdy = (e * nw - h * ny) * invW2;
      const gradU = Math.hypot(dudx, dudy);
      const gradV = Math.hypot(dvdx, dvdy);

      // Coordonnées dans le plan du sol (le motif se prolonge hors du cadre)
      const fx = u * scaleU;
      const fy = v * scaleV;
      const tx = fx * cos - fy * sin;
      const ty = fx * sin + fy * cos;

      const texel = Math.max(gradU * scaleU, gradV * scaleV);
      const level = clamp(Math.round(Math.log2(Math.max(texel, 1))), 0, maxLevel);
      const mip = mips[level];
      const size = mip.size;
      const ratio = size / TILE;

      let sx = tx * ratio;
      let sy = ty * ratio;
      sx -= Math.floor(sx / size) * size;
      sy -= Math.floor(sy / size) * size;

      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 + 1 >= size ? 0 : x0 + 1;
      const y1 = y0 + 1 >= size ? 0 : y0 + 1;
      const fxr = sx - x0;
      const fyr = sy - y0;
      const tex = mip.data;
      const i00 = (y0 * size + x0) * 4;
      const i10 = (y0 * size + x1) * 4;
      const i01 = (y1 * size + x0) * 4;
      const i11 = (y1 * size + x1) * 4;
      const w00 = (1 - fxr) * (1 - fyr);
      const w10 = fxr * (1 - fyr);
      const w01 = (1 - fxr) * fyr;
      const w11 = fxr * fyr;

      const tr = tex[i00] * w00 + tex[i10] * w10 + tex[i01] * w01 + tex[i11] * w11;
      const tg = tex[i00 + 1] * w00 + tex[i10 + 1] * w10 + tex[i01 + 1] * w01 + tex[i11 + 1] * w11;
      const tb = tex[i00 + 2] * w00 + tex[i10 + 2] * w10 + tex[i01 + 2] * w01 + tex[i11 + 2] * w11;

      const p = index * 4;
      const luma = 0.2126 * src[p] + 0.7152 * src[p + 1] + 0.0722 * src[p + 2];
      // Ombrage doux : on suit la lumière de la photo sans écraser les couleurs
      const ratioLuma = luma / ref;
      const shade = clamp(1 + shading * (Math.pow(ratioLuma, 0.85) - 1), 0.3, 1.85);
      // Léger renforcement du contraste local, sans effet vernis
      const local = clamp(1 + (contrast - 1) * (ratioLuma - 1) * 0.6, 0.85, 1.15);

      const r = clamp(tr * shade * local, 0, 255);
      const gg = clamp(tg * shade * local, 0, 255);
      const bb = clamp(tb * shade * local, 0, 255);

      // Écriture (bloc px × px en rendu allégé)
      for (let oy = 0; oy < px && y + oy < box.y1; oy += 1) {
        for (let ox = 0; ox < px && x + ox < box.x1; ox += 1) {
          const q = ((y + oy) * width + (x + ox)) * 4;
          const localCover = mask ? (mask[(y + oy) * width + (x + ox)] / 255) * 1 : 1;
          if (localCover <= 0.004) continue;
          out[q] = src[q] + (r - src[q]) * localCover;
          out[q + 1] = src[q + 1] + (gg - src[q + 1]) * localCover;
          out[q + 2] = src[q + 2] + (bb - src[q + 2]) * localCover;
        }
      }
    }
  }
  return true;
}
