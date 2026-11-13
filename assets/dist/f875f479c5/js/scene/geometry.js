import { squareToQuad, invert } from './perspective.js';



export function zoneTransform(zone, width, height) {
  const quad = zone.plane.quad.map((p) => ({ x: p.x * width, y: p.y * height }));
  const H = squareToQuad(quad);
  if (!H) return null;
  const M = invert(H);
  if (!M) return null;

  const at = (u, v) => {
    const w = H[6] * u + H[7] * v + H[8];
    return { x: (H[0] * u + H[1] * v + H[2]) / w, y: (H[3] * u + H[4] * v + H[5]) / w };
  };
  const center = at(0.5, 0.5);
  const du = at(0.52, 0.5);
  const dv = at(0.5, 0.52);
  const stepU = 0.02 * zone.plane.meters.width;
  const stepV = 0.02 * zone.plane.meters.depth;

  return {
    H,
    M,
    center,
    jac: [(du.x - center.x) / stepU, (dv.x - center.x) / stepV, (du.y - center.y) / stepU, (dv.y - center.y) / stepV],
  };
}



export function lightDirection(shading) {
  const { width, height, rgba } = shading;
  const lum = (index) => {
    const p = index * 4;
    return 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
  };
  let gx = 0;
  let gy = 0;
  for (let y = 1; y < height - 1; y += 1) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      gx += lum(row + x + 1) - lum(row + x - 1);
      gy += lum(row + width + x) - lum(row - width + x);
    }
  }
  const length = Math.hypot(gx, gy);


  if (length < 1e-3) return { x: -0.55, y: -0.83 };
  return { x: gx / length, y: gy / length };
}



export function tileLight(jac, dir, angleRad) {
  const det = jac[0] * jac[3] - jac[1] * jac[2];
  const inv = Math.abs(det) > 1e-9 ? 1 / det : 0;
  const lu = inv * (jac[3] * dir.x - jac[1] * dir.y);
  const lv = inv * (-jac[2] * dir.x + jac[0] * dir.y);
  const norm = Math.hypot(lu, lv) || 1;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    u: (lu / norm) * cos + (lv / norm) * sin,
    v: -(lu / norm) * sin + (lv / norm) * cos,
  };
}
