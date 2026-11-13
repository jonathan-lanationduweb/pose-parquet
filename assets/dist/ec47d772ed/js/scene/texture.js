import { seeded } from '../utils/dom.js';

export const TILE = 1280;


export const TILE_METERS = 4.8;



export const DEFAULT_PROFILES = {
  lames: { width: null, length: null },
  'point-de-hongrie': { width: 0.09, length: 0.6, angleDeg: 45 },
  'baton-rompu': { width: 0.09, length: 0.45 },
};

export function patternProfile(material, pattern, widthOverride) {
  const declared = (material.patternProfiles && material.patternProfiles[pattern]) || {};
  const fallback = DEFAULT_PROFILES[pattern] || DEFAULT_PROFILES.lames;
  const width =
    widthOverride ||
    declared.width ||
    (pattern === 'lames' ? material.boardWidth : Math.min(material.boardWidth, fallback.width));
  const length =
    declared.length ||
    (pattern === 'lames' ? material.boardLength || width * 9 : fallback.length || width * 5);
  return {
    width,
    length,
    angleDeg: declared.angleDeg || fallback.angleDeg || 45,


    exactLength: Boolean(declared.exactLength),
  };
}



const PX_PAR_MM = TILE / (TILE_METERS * 1000);
export function dimensionsDessinees(profile, pattern) {
  const largeur = fit((profile.width / TILE_METERS) * TILE);
  let longueur;
  if (pattern === 'point-de-hongrie') longueur = (profile.length / TILE_METERS) * TILE;
  else if (pattern === 'baton-rompu') {
    longueur = profile.exactLength
      ? (profile.length / TILE_METERS) * TILE
      : largeur * Math.max(2, Math.round(profile.length / profile.width));
  } else {
    const brute = Math.min(TILE, (profile.length / TILE_METERS) * TILE);
    longueur = profile.exactLength ? brute : fit(brute);
  }
  return { largeur, longueur, largeurMm: largeur / PX_PAR_MM, longueurMm: longueur / PX_PAR_MM };
}

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));



function creerCanvas(largeur, hauteur) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = largeur;
    c.height = hauteur;
    return c;
  }
  return new OffscreenCanvas(largeur, hauteur);
}


const opaques = new Map();
const opaque = (r, g, b) => {
  const r8 = clampByte(r);
  const g8 = clampByte(g);
  const b8 = clampByte(b);
  const cle = (r8 << 16) | (g8 << 8) | b8;
  let v = opaques.get(cle);
  if (v === undefined) {
    v = `rgb(${r8},${g8},${b8})`;
    opaques.set(cle, v);
  }
  return v;
};

const rgb = (c, shift = 0, warm = 0) =>
  `rgb(${clampByte(c[0] + shift + warm)},${clampByte(c[1] + shift)},${clampByte(c[2] + shift - warm)})`;


const fit = (target) => TILE / Math.max(1, Math.round(TILE / target));


const seedOf = (id) => {
  let n = 17;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) % 100003;
  return n;
};






function streak(ctx, x, y, w, h, horizontal, t, wobble, random, trace = true) {
  const long = horizontal ? w : h;
  const across = horizontal ? h : w;
  const a = across * t;
  const w1 = across * wobble * (random() - 0.5);
  const w2 = across * wobble * (random() - 0.5);

  if (!trace) return;
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x - 4, y + a);
    ctx.bezierCurveTo(x + long * 0.28, y + a + w1, x + long * 0.66, y + a + w2, x + long + 4, y + a);
  } else {
    ctx.moveTo(x + a, y - 4);
    ctx.bezierCurveTo(x + a + w1, y + long * 0.28, x + a + w2, y + long * 0.66, x + a, y + long + 4);
  }
  ctx.stroke();
}



function accents(tex) {
  const lum = (0.2126 * tex.base[0] + 0.7152 * tex.base[1] + 0.0722 * tex.base[2]) / 255;
  const partClaire = Math.min(0.68, Math.max(0.16, 0.84 - lum * 0.94));
  const ecart = 58 - lum * 30;


  const viseeLum = (0.2126 * (tex.base[0] + ecart)
    + 0.7152 * (tex.base[1] + ecart * 0.95)
    + 0.0722 * (tex.base[2] + ecart * 0.8)) / 255;
  const gain = Math.min(viseeLum / Math.max(lum, 0.02), 255 / Math.max(tex.base[0], tex.base[1], tex.base[2], 1));
  return {
    deep: tex.grain,
    lift: [clampByte(tex.base[0] * gain), clampByte(tex.base[1] * gain), clampByte(tex.base[2] * gain)],
    partClaire,

    vigueur: 1 + (1 - lum) * 0.55,
  };
}



function cathedral(ctx, x, y, w, h, horizontal, random, poseEncre, tex, vigueur) {
  const long = horizontal ? w : h;
  const across = horizontal ? h : w;

  const combien = 1 + Math.round(random() * 1.6);
  for (let k = 0; k < combien; k += 1) {
    const centre = long * (0.12 + random() * 0.76);
    const cote = random() < 0.5 ? 0.34 : 0.66;
    const base = across * cote;
    const sens = cote < 0.5 ? 1 : -1;
    const arcs = 3 + Math.round(random() * 3);
    const etendue = long * (0.1 + random() * 0.16);
    for (let a = 0; a < arcs; a += 1) {
      const t = (a + 1) / (arcs + 1);
      const demi = etendue * (1 - t * 0.62);
      const fleche = across * (0.1 + 0.3 * t) * sens;




      poseEncre(tex.grainAlpha * vigueur * (0.7 + t * 1.1), 12);
      ctx.lineWidth = Math.max(1.2, across * (0.05 + 0.09 * t));
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(x + centre - demi, y + base);
        ctx.quadraticCurveTo(x + centre, y + base + fleche, x + centre + demi, y + base);
      } else {
        ctx.moveTo(x + base, y + centre - demi);
        ctx.quadraticCurveTo(x + base + fleche, y + centre, x + base, y + centre + demi);
      }
      ctx.stroke();
    }
  }
}





function noeud(ctx, x, y, w, h, across, tex, random) {
  const kx = x + w * (0.15 + random() * 0.7);
  const ky = y + h * (0.2 + random() * 0.6);
  const kr = across * tex.knotSize * (0.58 + random() * 0.6);
  const prof = tex.knotDepth || 0;
  const portee = kr * (2.4 - 1.3 * prof);
  const halo = ctx.createRadialGradient(kx, ky, kr * 0.2, kx, ky, portee);
  halo.addColorStop(0, `rgba(${tex.grain[0]},${tex.grain[1]},${tex.grain[2]},${0.3 * (1 - 0.5 * prof)})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(kx, ky, portee, 0, Math.PI * 2);
  ctx.fill();
  const noir = 1 + prof * 3.2;
  ctx.fillStyle = `rgba(${clampByte(tex.grain[0] - 26 * noir)},${clampByte(tex.grain[1] - 24 * noir)},${clampByte(
    tex.grain[2] - 20 * noir
  )},${0.5 + 0.38 * prof})`;
  ctx.beginPath();
  ctx.ellipse(kx, ky, kr, kr * 0.72, random() * Math.PI, 0, Math.PI * 2);
  ctx.fill();
}

function grain(ctx, x, y, w, h, tex, random) {
  const long = Math.max(w, h);
  const across = Math.min(w, h);
  const horizontal = w >= h;
  const acc = accents(tex);



  const vigueurLame = acc.vigueur * (0.72 + random() * 0.62);


  const poseEncre = (alpha, ecartTeinte) => {
    const c = random() < acc.partClaire ? acc.lift : acc.deep;
    const t = Math.round((random() - 0.5) * ecartTeinte);
    ctx.strokeStyle = opaque(c[0] + t, c[1] + t, c[2] + t);
    ctx.globalAlpha = Math.min(1, Math.max(0, Math.round(alpha * 1000) / 1000));
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();





  const bandes = 2 + Math.round(random() * 2);
  for (let i = 0; i < bandes; i += 1) {
    poseEncre(tex.grainAlpha * vigueurLame * (0.5 + random() * 0.5), 10);
    ctx.lineWidth = across * (0.14 + random() * 0.2);
    streak(ctx, x, y, w, h, horizontal, 0.1 + random() * 0.8, 0.3, random);
  }



  cathedral(ctx, x, y, w, h, horizontal, random, poseEncre, tex, vigueurLame);









  const fibres = Math.max(26, Math.round(across * 1.15));
  for (let i = 0; i < fibres; i += 1) {
    poseEncre(tex.grainAlpha * vigueurLame * 0.62 * (0.3 + random()), 11);
    ctx.lineWidth = Math.max(0.5, across * 0.0065 * (0.6 + random()));
    streak(ctx, x, y, w, h, horizontal, 0.015 + random() * 0.97, 0.05, random, dessinFin);
  }





  const lines = Math.max(2, Math.round(tex.grainLines * (0.7 + random() * 0.6)));
  for (let i = 0; i < lines; i += 1) {
    poseEncre(tex.grainAlpha * vigueurLame * (0.3 + Math.pow(random(), 0.45) * 0.95), 16);
    ctx.lineWidth = Math.max(0.6, across * tex.grainWidth * (0.5 + random()));
    streak(ctx, x, y, w, h, horizontal, 0.05 + random() * 0.9, 0.14, random);
  }




  ctx.globalAlpha = 1;








  const noeudsSurs = Math.floor(tex.knots);
  for (let k = 0; k < noeudsSurs; k += 1) noeud(ctx, x, y, w, h, across, tex, random);
  if (random() < tex.knots - noeudsSurs) noeud(ctx, x, y, w, h, across, tex, random);


  if (tex.cracks && random() < tex.cracks) {
    const cx = x + w * (0.1 + random() * 0.8);
    const cy = y + h * (0.15 + random() * 0.7);
    const len = long * (0.08 + random() * 0.22);
    ctx.strokeStyle = `rgba(${clampByte(tex.grain[0] - 40)},${clampByte(tex.grain[1] - 38)},${clampByte(
      tex.grain[2] - 34
    )},0.5)`;
    ctx.lineWidth = Math.max(0.6, across * 0.012);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + len, cy + across * 0.04 * (random() - 0.5));
    } else {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + across * 0.04 * (random() - 0.5), cy + len);
    }
    ctx.stroke();
  }

  ctx.restore();
}



function board(ctx, x, y, w, h, tex, random) {
  const horizontal = w >= h;









  const varLame = Math.min(1.5, 0.6 + (Math.max(w, h) / TILE) * 4);
  const shift = Math.round((random() - 0.5) * tex.spread * varLame);
  const warm = Math.round((random() - 0.5) * tex.warm * varLame);

  ctx.save();
  const gradient = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  const amp = 5 * tex.contrast;
  gradient.addColorStop(0, rgb(tex.base, shift - amp, warm));
  gradient.addColorStop(0.45, rgb(tex.base, shift + amp * 0.55, warm));
  gradient.addColorStop(1, rgb(tex.base, shift - amp * 0.7, warm));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  grain(ctx, x, y, w, h, tex, random);


  if (tex.sheen > 0.01) {
    const sheen = horizontal
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);
    sheen.addColorStop(0, `rgba(255,255,255,${(tex.sheen * 0.9).toFixed(3)})`);
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, `rgba(0,0,0,${(tex.sheen * 0.35).toFixed(3)})`);
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);
  }


  const bevel = Math.max(0.7, Math.min(w, h) * tex.bevel);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  if (horizontal) ctx.fillRect(x, y, w, bevel);
  else ctx.fillRect(x, y, bevel, h);
  ctx.fillStyle = 'rgba(34,23,14,0.17)';
  if (horizontal) ctx.fillRect(x, y + h - bevel, w, bevel);
  else ctx.fillRect(x + w - bevel, y, bevel, h);




  const lw = Math.max(0.7, Math.min(w, h) * 0.016);
  ctx.lineWidth = lw;
  const longSides = () => {
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x, y + 0.4); ctx.lineTo(x + w, y + 0.4);
      ctx.moveTo(x, y + h - 0.4); ctx.lineTo(x + w, y + h - 0.4);
    } else {
      ctx.moveTo(x + 0.4, y); ctx.lineTo(x + 0.4, y + h);
      ctx.moveTo(x + w - 0.4, y); ctx.lineTo(x + w - 0.4, y + h);
    }
    ctx.stroke();
  };
  const buttSides = () => {
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x + 0.4, y); ctx.lineTo(x + 0.4, y + h);
      ctx.moveTo(x + w - 0.4, y); ctx.lineTo(x + w - 0.4, y + h);
    } else {
      ctx.moveTo(x, y + 0.4); ctx.lineTo(x + w, y + 0.4);
      ctx.moveTo(x, y + h - 0.4); ctx.lineTo(x + w, y + h - 0.4);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = `rgba(38,26,16,${(tex.joint * 0.6).toFixed(3)})`;
  longSides();




  ctx.strokeStyle = `rgba(38,26,16,${(tex.joint * 0.32).toFixed(3)})`;
  buttSides();
  ctx.restore();
}



function wrapped(ctx, draw, box) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (box) {
        const x = box.x + dx * TILE;
        const y = box.y + dy * TILE;
        if (x + box.w <= 0 || x >= TILE || y + box.h <= 0 || y >= TILE) continue;
      }
      ctx.save();
      ctx.translate(dx * TILE, dy * TILE);
      draw();
      ctx.restore();
    }
  }
}





function drawStraight(ctx, tex, profile, random) {
  const { largeur: h, longueur: w } = dimensionsDessinees(profile, 'lames');
  const rows = Math.round(TILE / h);
  if (profile.exactLength) {
    drawStraightExact(ctx, tex, h, w, rows, random);
    return;
  }
  const cols = Math.round(TILE / w);

  for (let r = 0; r < rows; r += 1) {

    const offset = (((r % 3) + (r % 5) * 0.13) * w) / 3;
    for (let c = -1; c <= cols; c += 1) {
      const x = c * w + offset;
      const y = r * h;
      wrapped(ctx, () => board(ctx, x, y, w, h, tex, random), { x, y, w, h });
    }
  }
}



function drawStraightExact(ctx, tex, h, L, rows, random) {
  const n = Math.max(1, Math.floor(TILE / L));
  const reste = TILE - n * L;
  const segments = Array(n).fill(L);
  if (reste > 0.5) {
    if (reste < L / 3 && n > 1) {
      segments.pop();
      segments.push((L + reste) / 2, (L + reste) / 2);
    } else segments.push(reste);
  }
  for (let r = 0; r < rows; r += 1) {
    const offset = (((r % 3) + (r % 5) * 0.13) * L) / 3;
    const debut = r % segments.length;
    let x = offset;
    for (let k = 0; k < segments.length; k += 1) {
      const w = segments[(debut + k) % segments.length];
      const x0 = x;
      const y = r * h;
      wrapped(ctx, () => board(ctx, x0, y, w, h, tex, random), { x: x0, y, w, h });
      x += w;
    }
  }
}

function drawHerringbone(ctx, tex, profile, random) {



  const { largeur: w, longueur: l } = dimensionsDessinees(profile, 'baton-rompu');
  const steps = Math.ceil((TILE * 1.6) / w) + 2;


  const marge = (Math.SQRT2 - 1) * (TILE / 2) + l + w;

  ctx.save();
  ctx.translate(TILE / 2, TILE / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-TILE / 2, -TILE / 2);
  for (let i = -steps; i <= steps; i += 1) {
    for (let j = -steps; j <= steps; j += 1) {
      const ox = TILE / 2 + i * l + j * w;
      const oy = TILE / 2 + i * l - j * w;
      if (ox < -marge || ox > TILE + marge || oy < -marge || oy > TILE + marge) continue;
      board(ctx, ox, oy, l, w, tex, random);
      board(ctx, ox + l, oy, w, l, tex, random);
    }
  }
  ctx.restore();
}



function drawChevron(ctx, tex, profile, random) {
  const { largeur: w } = dimensionsDessinees(profile, 'point-de-hongrie');
  const rad = (Math.min(75, Math.max(15, profile.angleDeg)) * Math.PI) / 180;
  const length = (profile.length / TILE_METERS) * TILE;
  const armX = length * Math.sin(rad);
  const armY = length * Math.cos(rad);


  const step = fit(w / Math.sin(rad));
  const cols = Math.ceil(TILE / (armX * 2)) + 2;
  const rows = Math.ceil((TILE + armY) / step) + 2;



  const plank = (x0, y0, dir) => {
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dir * armX, y0 + armY);
    ctx.lineTo(x0 + dir * armX, y0 + armY + step);
    ctx.lineTo(x0, y0 + step);
    ctx.closePath();

    ctx.save();
    ctx.clip();
    const ux = (dir * armX) / length;
    const uy = armY / length;

    const nx = -uy * dir;
    const ny = ux * dir;
    ctx.transform(ux, uy, nx, ny, x0, y0);


    const debord = step * Math.cos(rad);
    board(ctx, -1, 0, length + debord + 2, w, tex, random);
    ctx.restore();



    ctx.strokeStyle = `rgba(38,26,16,${(tex.joint * 0.6).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.1, w * 0.05);
    ctx.stroke();
    ctx.restore();
  };

  for (let c = -1; c <= cols; c += 1) {
    for (let r = -2; r <= rows; r += 1) {
      const x0 = c * armX * 2;
      const y0 = r * step - armY;
      wrapped(
        ctx,
        () => {
          plank(x0, y0, 1);
          plank(x0 + armX * 2, y0, -1);
        },
        { x: x0 - armX, y: y0, w: armX * 3, h: armY + step }
      );
    }
  }
}



let noiseTile = null;
function noise() {
  if (noiseTile) return noiseTile;
  const size = 128;
  noiseTile = creerCanvas(size, size);
  const ctx = noiseTile.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const random = seeded(9173);
  for (let i = 0; i < data.length; i += 4) {
    const value = random() < 0.5 ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = Math.round(random() * 26);
  }
  ctx.putImageData(image, 0, 0);
  return noiseTile;
}

function filmGrain(ctx, w, h, amount) {
  const tile = noise();
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, amount / 12);
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}









let dessinFin = true;

export function buildTexture(material, { pattern = 'lames', width, size = TILE } = {}) {
  dessinFin = size >= TILE / 2;
  try {
    return dessinerTuile(material, pattern, width, size);
  } finally {
    dessinFin = true;
  }
}

function dessinerTuile(material, pattern, width, size) {
  const tex = material.texture;
  const profile = patternProfile(material, pattern, width);
  const canvas = creerCanvas(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const random = seeded(seedOf(material.id) + Math.round(profile.width * 1000));



  if (size !== TILE) ctx.scale(size / TILE, size / TILE);
  ctx.fillStyle = rgb(tex.grain, -14);
  ctx.fillRect(0, 0, TILE, TILE);

  if (pattern === 'point-de-hongrie') drawChevron(ctx, tex, profile, random);
  else if (pattern === 'baton-rompu') drawHerringbone(ctx, tex, profile, random);
  else drawStraight(ctx, tex, profile, random);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  filmGrain(ctx, size, size, 6);
  return canvas;
}



export function buildMips(base, levels = 5) {
  const size0 = base.width;
  const data0 = base.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, size0, size0).data;
  return etendreMips([{ size: size0, data: data0 }], levels);
}



export function etendreMips(mips, levels = 5) {
  let previous = mips[mips.length - 1].data;
  let previousSize = mips[mips.length - 1].size;
  for (let level = mips.length; level < levels; level += 1) {
    const size = previousSize >> 1;
    if (size < 8) break;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      const row0 = (y * 2) * previousSize;
      const row1 = (y * 2 + 1) * previousSize;
      for (let x = 0; x < size; x += 1) {
        const a = (row0 + x * 2) * 4;
        const b = a + 4;
        const c = (row1 + x * 2) * 4;
        const d = c + 4;
        const out = (y * size + x) * 4;
        data[out] = (previous[a] + previous[b] + previous[c] + previous[d]) >> 2;
        data[out + 1] = (previous[a + 1] + previous[b + 1] + previous[c + 1] + previous[d + 1]) >> 2;
        data[out + 2] = (previous[a + 2] + previous[b + 2] + previous[c + 2] + previous[d + 2]) >> 2;
        data[out + 3] = 255;
      }
    }
    mips.push({ size, data });
    previous = data;
    previousSize = size;
  }
  return mips;
}



export function buildSwatch(material, { width = 260, height = 320, boards = 4 } = {}) {
  const tex = material.texture;
  const canvas = creerCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const random = seeded(seedOf(material.id) + 7);

  ctx.fillStyle = rgb(tex.grain, -14);
  ctx.fillRect(0, 0, width, height);



  const reference = 0.18;
  const count = Math.max(2, Math.round(boards * (reference / material.boardWidth)));
  const bw = width / count;


  const bh = height / 2.4;

  for (let c = -1; c <= count; c += 1) {
    const offset = ((c % 3) * bh) / 2.6;
    for (let r = -1; r * bh < height + bh; r += 1) {
      board(ctx, c * bw, r * bh + offset, bw, bh, tex, random);
    }
  }
  filmGrain(ctx, width, height, 5);
  return canvas;
}
