const MAP_MAX = 460;



function blurWeighted(channels, weight, width, height, radius, passes = 3) {
  const buffers = channels.map((c) => Float32Array.from(c));
  const spare = channels.map(() => new Float32Array(channels[0].length));
  let w = Float32Array.from(weight);
  let wSpare = new Float32Array(w.length);

  const line = (src, dst, count, stride, lanes, laneStride) => {
    const span = radius * 2 + 1;
    for (let lane = 0; lane < lanes; lane += 1) {
      const base = lane * laneStride;
      let sum = 0;
      for (let i = -radius; i <= radius; i += 1) {
        sum += src[base + Math.min(count - 1, Math.max(0, i)) * stride];
      }
      for (let i = 0; i < count; i += 1) {
        dst[base + i * stride] = sum / span;
        sum +=
          src[base + Math.min(count - 1, Math.max(0, i + radius + 1)) * stride] -
          src[base + Math.min(count - 1, Math.max(0, i - radius)) * stride];
      }
    }
  };

  for (let pass = 0; pass < passes; pass += 1) {
    for (let c = 0; c < buffers.length; c += 1) {
      line(buffers[c], spare[c], width, 1, height, width);
      const tmp = buffers[c];
      buffers[c] = spare[c];
      spare[c] = tmp;
    }
    line(w, wSpare, width, 1, height, width);
    [w, wSpare] = [wSpare, w];

    for (let c = 0; c < buffers.length; c += 1) {
      line(buffers[c], spare[c], height, width, width, 1);
      const tmp = buffers[c];
      buffers[c] = spare[c];
      spare[c] = tmp;
    }
    line(w, wSpare, height, width, width, 1);
    [w, wSpare] = [wSpare, w];
  }

  return { channels: buffers, weight: w };
}


function medianePonderee(paires) {
  paires.sort((a, b) => a[0] - b[0]);
  const total = paires.reduce((s, p) => s + p[1], 0);
  let cumul = 0;
  for (const [valeur, poids] of paires) {
    cumul += poids;
    if (cumul >= total / 2) return valeur;
  }
  return paires.length ? paires[paires.length - 1][0] : 0;
}



function ecarterLesObjets(chan, weight, count) {
  const lum = [];
  const rn = [];
  const gn = [];
  for (let i = 0; i < count; i += 1) {
    const w = weight[i];
    if (w <= 0) continue;
    const r = chan[0][i] / w;
    const g = chan[1][i] / w;
    const b = chan[2][i] / w;
    const somme = Math.max(1, r + g + b);
    lum.push([0.2126 * r + 0.7152 * g + 0.0722 * b, w]);
    rn.push([r / somme, w]);
    gn.push([g / somme, w]);
  }
  if (lum.length < 8) return;
  const lMed = Math.max(4, medianePonderee(lum));
  const rMed = medianePonderee(rn);
  const gMed = medianePonderee(gn);
  for (let i = 0; i < count; i += 1) {
    const w = weight[i];
    if (w <= 0) continue;
    const r = chan[0][i] / w;
    const g = chan[1][i] / w;
    const b = chan[2][i] / w;
    const somme = Math.max(1, r + g + b);
    const rapport = (0.2126 * r + 0.7152 * g + 0.0722 * b) / lMed;
    const teinte = Math.hypot(r / somme - rMed, g / somme - gMed);
    let k = 1;
    if (rapport < 0.5) k *= Math.max(0, (rapport - 0.3) / 0.2);
    else if (rapport > 4) k *= Math.max(0, 1 - (rapport - 4) / 1.5);



    if (teinte > 0.075) k *= Math.max(0, 1 - (teinte - 0.075) / 0.055);
    k = Math.max(0.02, k);
    if (k < 1) {
      chan[0][i] *= k;
      chan[1][i] *= k;
      chan[2][i] *= k;
      weight[i] *= k;
    }
  }
}



export function buildShadingMap(source, coverage, light) {
  const fullW = source.width;
  const fullH = source.height;
  const src = source.data;

  const ratio = Math.min(1, MAP_MAX / Math.max(fullW, fullH));
  const width = Math.max(8, Math.round(fullW * ratio));
  const height = Math.max(8, Math.round(fullH * ratio));
  const stepX = fullW / width;
  const stepY = fullH / height;
  const count = width * height;


  const chan = [new Float32Array(count), new Float32Array(count), new Float32Array(count)];
  const weight = new Float32Array(count);
  for (let y = 0; y < height; y += 1) {
    const sy0 = Math.floor(y * stepY);
    const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * stepY));
    for (let x = 0; x < width; x += 1) {
      const sx0 = Math.floor(x * stepX);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * stepX));
      let r = 0;
      let g = 0;
      let b = 0;
      let cover = 0;
      for (let sy = sy0; sy < sy1; sy += 1) {
        const row = sy * fullW;
        for (let sx = sx0; sx < sx1; sx += 1) {
          const i = row + sx;
          const c = coverage[i] / 255;
          if (c <= 0.02) continue;
          const p = i * 4;
          r += src[p] * c;
          g += src[p + 1] * c;
          b += src[p + 2] * c;
          cover += c;
        }
      }
      const index = y * width + x;
      chan[0][index] = r;
      chan[1][index] = g;
      chan[2][index] = b;
      weight[index] = cover;
    }
  }

  if (light.robust) ecarterLesObjets(chan, weight, count);



  const radius = Math.max(2, Math.round(light.blurRadius * width));
  const blurred = blurWeighted(chan, weight, width, height, radius);




  const totals = [0, 0, 0];
  let mass = 0;
  for (let i = 0; i < count; i += 1) {
    if (blurred.weight[i] <= 1e-4) continue;
    for (let c = 0; c < 3; c += 1) totals[c] += blurred.channels[c][i];
    mass += blurred.weight[i];
  }
  const refRgb = totals.map((t) => (mass > 0 ? Math.max(12, t / mass) : 128));
  const reference = 0.2126 * refRgb[0] + 0.7152 * refRgb[1] + 0.0722 * refRgb[2];






  const solid = new Float32Array(count);
  for (let i = 0; i < count; i += 1) solid[i] = weight[i] > 0 ? 1 : 0;
  const ones = new Float32Array(count).fill(1);
  const contactRadius = Math.max(1, Math.round(width * 0.012));
  const contact = blurWeighted([solid], ones, width, height, contactRadius, 2).channels[0];



  const rgba = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    const known = blurred.weight[i] > 1e-4;
    for (let c = 0; c < 3; c += 1) {


      rgba[p + c] = known ? blurred.channels[c][i] / blurred.weight[i] / refRgb[c] : 1;
    }


    rgba[p + 3] = 1 - light.contact * (1 - Math.min(1, contact[i]));
  }

  const sample = (x, y, out) => {
    const fx = Math.min(width - 1.001, Math.max(0, (x / fullW) * width - 0.5));
    const fy = Math.min(height - 1.001, Math.max(0, (y / fullH) * height - 0.5));
    const x0 = fx | 0;
    const y0 = fy | 0;
    const tx = fx - x0;
    const ty = fy - y0;
    const i00 = (y0 * width + x0) * 4;
    const i10 = i00 + 4;
    const i01 = i00 + width * 4;
    const i11 = i01 + 4;
    const w00 = (1 - tx) * (1 - ty);
    const w10 = tx * (1 - ty);
    const w01 = (1 - tx) * ty;
    const w11 = tx * ty;
    for (let c = 0; c < 4; c += 1) {
      out[c] = rgba[i00 + c] * w00 + rgba[i10 + c] * w10 + rgba[i01 + c] * w01 + rgba[i11 + c] * w11;
    }
    return out;
  };

  const scratch = new Float32Array(4);
  return {
    width,
    height,
    rgba,
    reference,
    referenceRgb: refRgb,
    sample,

    luminance(x, y) {
      sample(x, y, scratch);
      return 0.2126 * scratch[0] + 0.7152 * scratch[1] + 0.0722 * scratch[2];
    },
  };
}



export function buildGlossMap(source, coverage, shading) {
  const width = source.width;
  const height = source.height;
  const src = source.data;
  const gloss = new Float32Array(width * height);
  const out = new Float32Array(4);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const i = row + x;
      if (coverage[i] <= 2) continue;
      const p = i * 4;
      const luma = 0.2126 * src[p] + 0.7152 * src[p + 1] + 0.0722 * src[p + 2];
      shading.sample(x, y, out);
      const local = (0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]) * shading.reference;
      const excess = (luma - local) / Math.max(24, local);
      gloss[i] = excess > 0.04 ? Math.min(1, excess) : 0;
    }
  }
  return gloss;
}
