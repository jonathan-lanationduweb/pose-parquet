import { zoneTransform, lightDirection, tileLight } from './geometry.js';
import { TILE, TILE_METERS, patternProfile } from './texture.js';

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);


const KNEE = 0.86 * 255;
function knee(v) {
  if (v <= KNEE) return v < 0 ? 0 : v;
  const over = (v - KNEE) / 255;
  return Math.min(255, KNEE + (over / (1 + over * 4)) * 255);
}


function sampleTile(mip, sx, sy, out) {
  const size = mip.size;
  let x = sx - Math.floor(sx / size) * size;
  let y = sy - Math.floor(sy / size) * size;
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = x0 + 1 >= size ? 0 : x0 + 1;
  const y1 = y0 + 1 >= size ? 0 : y0 + 1;
  const tx = x - x0;
  const ty = y - y0;
  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;
  const data = mip.data;
  const i00 = (y0 * size + x0) * 4;
  const i10 = (y0 * size + x1) * 4;
  const i01 = (y1 * size + x0) * 4;
  const i11 = (y1 * size + x1) * 4;
  out[0] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
  out[1] = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
  out[2] = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
  return out;
}

export function createCanvasRenderer() {
  const albedo = new Float32Array(3);
  const relief = new Float32Array(3);
  const acc = new Float32Array(3);
  const accR = new Float32Array(3);
  const lit = new Float32Array(4);

  return {
    backend: 'canvas',



    paint({ source, target, scene, masks, shading, gloss, surfaces, step = 1 }) {
      const width = source.width;
      const height = source.height;
      const src = source.data;
      const out = target.data;
      out.set(src);

      const labels = masks.labels;
      const coverage = masks.coverage;
      const occlusion = masks.occlusion;
      const light = scene.light;
      const dir = lightDirection(shading);
      const px = Math.max(1, Math.round(step));

      scene.floorZones.forEach((zone, index) => {
        const surface = surfaces.get(zone.surfaceId);
        if (!surface) return;
        const box = masks.box(zone.id);
        if (!box) return;
        const transform = zoneTransform(zone, width, height);
        if (!transform) return;

        const label = index + 1;
        const { M, jac } = transform;
        const [a, b, c, d, e, f, g, h, i2] = M;
        const meters = zone.plane.meters;
        const origin = zone.plane.origin;
        const maps = surface.maps;
        const config = surface.config;
        const surf = maps.surface;



        const angle = ((config.angle || 0) + zone.plane.rotationDeg) * (Math.PI / 180);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const scaleMotif = config.scale || 1;
        const perMeter = TILE / (TILE_METERS * scaleMotif);
        const maxLevel = maps.albedo.length - 1;



        const { u: lightU, v: lightV } = tileLight(jac, dir, angle);



        const profil = patternProfile(surface.material, config.pattern, config.width || null);
        const rangees = config.pattern === 'lames' ? Math.max(1, Math.round(TILE_METERS / profil.width)) : 0;
        const hauteurRangee = rangees ? TILE / rangees : 0;
        const decalageRangee = rangees
          ? (ty) => {
              const r = Math.floor(ty / hauteurRangee);
              return (((r * 0.6180339887) % 1) + 1) % 1 * TILE;
            }
          : () => 0;

        const reliefGain = surf.relief * 0.9;
        const glossGain = gloss ? surf.clearcoat * 1.15 : 0;
        const strength = light.strength;
        const ambient = light.ambient;
        const tint = light.tint;

        for (let y = box.y0; y < box.y1; y += px) {
          const py = y + 0.5;
          const startX = box.x0 + 0.5;
          let nx = a * startX + b * py + c;
          let ny = d * startX + e * py + f;
          let nw = g * startX + h * py + i2;
          const ax = a * px;
          const dxs = d * px;
          const gxs = g * px;

          for (let x = box.x0; x < box.x1; x += px, nx += ax, ny += dxs, nw += gxs) {
            const index0 = y * width + x;
            if (labels[index0] !== label || nw === 0) continue;
            let cover = coverage[index0] / 255;
            if (occlusion) cover *= 1 - occlusion[index0] / 255;
            if (cover <= 0.004) continue;

            const invW = 1 / nw;
            const u = nx * invW;
            const v = ny * invW;




            const invW2 = invW * invW;
            const dudx = (a * nw - g * nx) * invW2 * meters.width;
            const dvdx = (d * nw - g * ny) * invW2 * meters.depth;
            const dudy = (b * nw - h * nx) * invW2 * meters.width;
            const dvdy = (e * nw - h * ny) * invW2 * meters.depth;


            const fu = u * meters.width + origin.u;
            const fv = v * meters.depth + origin.v;
            const ty = (fu * sin + fv * cos) * perMeter;




            const tx = (fu * cos - fv * sin) * perMeter + decalageRangee(ty);






            const ex = Math.hypot(dudx * cos - dvdx * sin, dudx * sin + dvdx * cos) * perMeter;
            const ey = Math.hypot(dudy * cos - dvdy * sin, dudy * sin + dvdy * cos) * perMeter;
            const major = Math.max(ex, ey);
            const minor = Math.max(0.35, Math.min(ex, ey));
            const taps = px > 1 ? 1 : clamp(Math.round(major / minor), 1, 4);
            const level = clamp(Math.round(Math.log2(Math.max(taps > 1 ? minor : major, 1))), 0, maxLevel);
            const mip = maps.albedo[level];
            const ratio = mip.size / TILE;

            acc[0] = 0;
            acc[1] = 0;
            acc[2] = 0;
            accR[0] = 0;
            accR[1] = 0;
            accR[2] = 0;
            if (taps === 1) {
              sampleTile(mip, tx * ratio, ty * ratio, albedo);
              sampleTile(maps.relief[level], tx * ratio, ty * ratio, relief);
              acc.set(albedo);
              accR.set(relief);
            } else {

              const majorIsX = ex >= ey;
              const mdx = majorIsX ? dudx * cos - dvdx * sin : dudy * cos - dvdy * sin;
              const mdy = majorIsX ? dudx * sin + dvdx * cos : dudy * sin + dvdy * cos;
              const norm = Math.hypot(mdx, mdy) || 1;
              const stepU = ((mdx / norm) * major * perMeter) / taps;
              const stepV = ((mdy / norm) * major * perMeter) / taps;
              const half = (taps - 1) / 2;
              for (let t = 0; t < taps; t += 1) {
                const off = t - half;
                const sx = (tx + stepU * off) * ratio;
                const sy = (ty + stepV * off) * ratio;
                sampleTile(mip, sx, sy, albedo);
                sampleTile(maps.relief[level], sx, sy, relief);
                acc[0] += albedo[0];
                acc[1] += albedo[1];
                acc[2] += albedo[2];
                accR[0] += relief[0];
                accR[1] += relief[1];
                accR[2] += relief[2];
              }
              acc[0] /= taps;
              acc[1] /= taps;
              acc[2] /= taps;
              accR[0] /= taps;
              accR[1] /= taps;
              accR[2] /= taps;
            }







            shading.sample(x, y, lit);
            const lum = 0.2126 * lit[0] + 0.7152 * lit[1] + 0.0722 * lit[2];
            const raw = 1 + strength * (Math.pow(Math.max(0.02, lum), 0.88) - 1);



            const aLum = (0.2126 * acc[0] + 0.7152 * acc[1] + 0.0722 * acc[2]) / 255;
            const lift = ambient * (1 - aLum);
            const shade = clamp(raw < 1 ? lift + (1 - lift) * raw : raw, 0.42, 1.9);
            const gainR = shade + tint * (lit[0] - lum) * strength;
            const gainG = shade + tint * (lit[1] - lum) * strength;
            const gainB = shade + tint * (lit[2] - lum) * strength;




            const nu = (accR[0] - 128) / 127;
            const nv = (accR[1] - 128) / 127;





            const footprint = major / perMeter;
            const near = clamp(0.006 / (footprint + 0.003), 0, 1);
            const bump = 1 + (nu * lightU + nv * lightV) * reliefGain * near;



            let specular = 0;
            if (glossGain > 0) {
              const rough = accR[2] / 255;
              specular = gloss[index0] * glossGain * (1 - rough) * near;
            }

            const factor = clamp(bump, 0.55, 1.6) * lit[3];






            const dose = specular * (0.35 + 0.65 * aLum);
            const r = knee(acc[0] * gainR * factor + (acc[0] * 0.45 + 210 * 0.55) * dose);
            const gg = knee(acc[1] * gainG * factor + (acc[1] * 0.45 + 205 * 0.55) * dose);
            const bb = knee(acc[2] * gainB * factor + (acc[2] * 0.45 + 195 * 0.55) * dose);



            for (let oy = 0; oy < px && y + oy < box.y1; oy += 1) {
              const row = (y + oy) * width;
              for (let ox = 0; ox < px && x + ox < box.x1; ox += 1) {
                const j = row + x + ox;
                if (labels[j] !== label) continue;
                let localCover = coverage[j] / 255;
                if (occlusion) localCover *= 1 - occlusion[j] / 255;
                if (localCover <= 0.004) continue;
                const q = j * 4;
                out[q] = src[q] + (r - src[q]) * localCover;
                out[q + 1] = src[q + 1] + (gg - src[q + 1]) * localCover;
                out[q + 2] = src[q + 2] + (bb - src[q + 2]) * localCover;
              }
            }
          }
        }
      });

      return true;
    },
  };
}
