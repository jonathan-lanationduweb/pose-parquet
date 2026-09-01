/**
 * Rendu du parquet dans la photo.
 *
 * Pour chaque pixel du quadrilatère, on remonte aux coordonnées du sol via
 * l'homographie inverse, on y échantillonne la texture (avec choix du niveau
 * de réduction pour éviter le moiré au fond), puis on module le résultat par
 * la luminance de la photo d'origine : c'est ce report d'ombres et de reflets
 * qui rend l'incrustation crédible.
 *
 * Tout se fait en Canvas 2D + tableaux typés — pas de WebGL, pas de shader,
 * pas de dépendance.
 */
import { squareToQuad, invert, bounds } from './perspective.js';
import { TILE, TILE_METERS } from './patterns.js';

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Luminance moyenne de la zone du sol, servant de référence à l'ombrage. */
function referenceLuma(src, quadBounds, width) {
  const { x0, y0, x1, y1 } = quadBounds;
  let sum = 0;
  let count = 0;
  const stepX = Math.max(1, Math.round((x1 - x0) / 60));
  const stepY = Math.max(1, Math.round((y1 - y0) / 60));
  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * width + x) * 4;
      sum += 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
      count += 1;
    }
  }
  return count ? sum / count : 128;
}

/**
 * @param {object} options
 * @param {ImageData} options.source      photo d'origine (taille du canevas)
 * @param {ImageData} options.target      buffer de sortie (réutilisé)
 * @param {{x:number,y:number}[]} options.quad
 * @param {{size:number,data:Uint8ClampedArray}[]} options.mips
 * @param {number} options.angle          rotation du motif, en radians
 * @param {number} options.roomWidth      largeur réelle couverte par le quad (m)
 * @param {number} options.roomDepth      profondeur réelle couverte par le quad (m)
 * @param {number} options.shading        report des ombres de la photo (0 → 1)
 */
export function renderFloor({
  source,
  target,
  quad,
  mips,
  angle = 0,
  roomWidth = 4,
  roomDepth = 4,
  shading = 0.9,
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

  const box = bounds(quad, width, height);
  const ref = Math.max(24, referenceLuma(src, box, width));

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scaleU = (roomWidth / TILE_METERS) * TILE;
  const scaleV = (roomDepth / TILE_METERS) * TILE;

  const [a, b, c, d, e, f, g, h, i] = M;
  const maxLevel = mips.length - 1;

  for (let y = box.y0; y < box.y1; y += 1) {
    const py = y + 0.5;
    let nx = a * (box.x0 + 0.5) + b * py + c;
    let ny = d * (box.x0 + 0.5) + e * py + f;
    let nw = g * (box.x0 + 0.5) + h * py + i;

    for (let x = box.x0; x < box.x1; x += 1, nx += a, ny += d, nw += g) {
      if (nw === 0) continue;
      const invW = 1 / nw;
      const u = nx * invW;
      const v = ny * invW;
      if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) continue;

      // Dérivées : échelle locale (choix du mip) et distance aux bords (anticrénelage)
      const invW2 = invW * invW;
      const dudx = (a * nw - g * nx) * invW2;
      const dvdx = (d * nw - g * ny) * invW2;
      const dudy = (b * nw - h * nx) * invW2;
      const dvdy = (e * nw - h * ny) * invW2;

      const gradU = Math.hypot(dudx, dudy);
      const gradV = Math.hypot(dvdx, dvdy);
      const edge = Math.min(
        gradU > 0 ? Math.min(u, 1 - u) / gradU : 999,
        gradV > 0 ? Math.min(v, 1 - v) / gradV : 999
      );
      if (edge < -0.75) continue;
      const alpha = clamp(edge + 0.5, 0, 1);

      // Coordonnées dans le plan du sol, en pixels de texture
      const fx = u * scaleU;
      const fy = v * scaleV;
      const tx = fx * cos - fy * sin;
      const ty = fx * sin + fy * cos;

      // Niveau de réduction en fonction de la compression locale
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

      // Ombrage : on récupère la lumière de la photo d'origine
      const p = (y * width + x) * 4;
      const luma = 0.2126 * src[p] + 0.7152 * src[p + 1] + 0.0722 * src[p + 2];
      const shade = 1 + shading * (luma / ref - 1);
      const s = clamp(shade, 0.32, 1.75);

      const r = clamp(tr * s, 0, 255);
      const gg = clamp(tg * s, 0, 255);
      const bb = clamp(tb * s, 0, 255);

      if (alpha >= 1) {
        out[p] = r;
        out[p + 1] = gg;
        out[p + 2] = bb;
      } else {
        out[p] = src[p] + (r - src[p]) * alpha;
        out[p + 1] = src[p + 1] + (gg - src[p + 1]) * alpha;
        out[p + 2] = src[p + 2] + (bb - src[p + 2]) * alpha;
      }
    }
  }
  return true;
}
