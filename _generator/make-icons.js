/**
 * Génère les icônes du site à partir du symbole d'identité — Concept C.
 *
 *   node _generator/make-icons.js
 *
 * Le symbole : trois lames verticales de largeurs inégales, séparées par des
 * joints, et traversées par des ruptures diagonales décalées — le rythme d'un
 * parquet réduit à sa structure. Pas de lettre, pas de chevron, pas de maison,
 * pas d'outil.
 *
 * La géométrie ci-dessous n'est pas dessinée à l'estime : elle est **relevée au
 * pixel** sur la planche d'identité validée, en décodant l'image et en mesurant
 * les bords de chaque lame et les bornes de chaque rupture. D'où des fractions
 * d'apparence bizarre : ce sont des mesures, pas des valeurs choisies.
 *
 * Rasteriseur maison : aucune dépendance, encodage PNG via zlib (Node),
 * anti-crénelage par suréchantillonnage 4×4.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'assets', 'icons');

/* ------------------------------------------------------------------ */
/* Couleurs                                                            */
/* ------------------------------------------------------------------ */

const INK = [22, 24, 26]; // --c-ink, charbon du site
const BONE = [242, 239, 232]; // --c-bone, blanc cassé du site
const GOLD = [200, 145, 82]; // relevé sur la planche, variante fond sombre

/* ------------------------------------------------------------------ */
/* Géométrie du symbole, relevée sur la planche                        */
/* ------------------------------------------------------------------ */

/**
 * Mesures brutes, en pixels de la planche.
 * Boîte du symbole : x 394→499, y 158→354, soit 106 × 197.
 */
const M = {
  width: 106,
  height: 197,
  // Bords gauche/droit des trois lames. Largeurs 36, 36, 19 : l'inégalité est
  // voulue, c'est elle qui empêche le symbole d'être une simple grille.
  bars: [
    [0, 36],
    [43, 79],
    [87, 106],
  ],
  /**
   * Une rupture par lame, repérée par son ordonnée au bord **droit** de la
   * lame. Deux hauteurs seulement : les lames extrêmes sont coupées à 110, la
   * centrale bien plus haut, à 48. C'est ce décalage qui fait lire des joints
   * de bout de parquet.
   */
  ruptures: [
    { bar: 0, yRight: 110 },
    { bar: 1, yRight: 48 },
    { bar: 2, yRight: 110 },
  ],
  // Pente commune aux trois ruptures : 16 px de descente pour 36 px vers la
  // gauche, soit environ 24° sous l'horizontale.
  slopeRun: 36,
  slopeRise: 16,
  // Largeur des joints, mesurée horizontalement. Les joints verticaux sont plus
  // épais (7 à 8 px) que les ruptures (9 px à l'horizontale, donc environ
  // 3,7 px perpendiculairement) : les diagonales se lisent comme des traits de
  // scie, pas comme des joints.
  jointWidth: 7.5,
  ruptureWidth: 9,
};

const ASPECT = M.width / M.height; // 0,538 — nettement vertical

/**
 * Aspect optiquement corrigé selon la taille.
 *
 * À 16 px, l'aspect réel donnerait un symbole large de 6 px pour trois lames et
 * deux joints : illisible. Les familles d'icônes soignées élargissent toujours
 * un peu le dessin aux petites tailles. On interpole donc vers un aspect plus
 * trapu, sans jamais toucher au nombre de lames, à leur inégalité ni aux
 * ruptures : l'identité est intacte, la proportion respire.
 */
function opticalAspect(size) {
  const t = Math.max(0, Math.min(1, (72 - size) / 56)); // 1 à 16 px, 0 à 72 px
  return ASPECT + (0.72 - ASPECT) * t;
}

const BAR_TOTAL = M.bars.reduce((sum, [a, b]) => sum + (b - a), 0);

/**
 * Dispose le symbole dans un carré de `size` pixels.
 *
 * Aux petites tailles, les bords de lame sont accrochés à la grille de pixels :
 * sans cela, trois lames de 2,04 px donnent trois gris différents.
 */
function layout(size, coverage) {
  const aspect = opticalAspect(size);
  let height = size * coverage;
  let width = height * aspect;

  if (size > 48) {
    return {
      crisp: false,
      x0: (size - width) / 2,
      y0: (size - height) / 2,
      width,
      height,
      bars: M.bars.map(([a, b]) => [a / M.width, b / M.width]),
    };
  }

  const joint = Math.max(1, Math.round((M.jointWidth / M.width) * width));
  const barSpace = Math.max(4, Math.round(width) - joint * 2);
  const widths = M.bars.map(([a, b]) => Math.max(1, Math.round(((b - a) / BAR_TOTAL) * barSpace)));
  width = widths.reduce((sum, w) => sum + w, 0) + joint * 2;
  height = Math.round(height);

  const bars = [];
  let cursor = 0;
  widths.forEach((w, i) => {
    bars.push([cursor / width, (cursor + w) / width]);
    cursor += w + (i < widths.length - 1 ? joint : 0);
  });

  return {
    crisp: true,
    x0: Math.round((size - width) / 2),
    y0: Math.round((size - height) / 2),
    width,
    height,
    bars,
  };
}

/** Pente des ruptures, en fractions de la boîte du symbole. */
const SLOPE = (M.slopeRise / M.height) / (M.slopeRun / M.width);

/**
 * Le symbole couvre-t-il ce point ?
 *
 * @param {number} nx position dans la boîte du symbole, 0 → 1
 * @param {number} ny idem, vertical
 * @param {object} box résultat de layout()
 * @param {number} minRupture épaisseur minimale d'une rupture, en fraction de
 *        largeur : garantit qu'elle survive à 16 px.
 */
function insideSymbol(nx, ny, box, minRupture) {
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;
  const index = box.bars.findIndex(([a, b]) => nx >= a && nx <= b);
  if (index < 0) return false; // dans un joint vertical

  const rupture = M.ruptures.find((r) => r.bar === index);
  if (!rupture) return true;

  // Ordonnée de la rupture à cette abscisse, dans le repère de la lame telle
  // qu'elle est réellement disposée (accrochage à la grille compris).
  const [barA, barB] = box.bars[index];
  const t = (barB - nx) / Math.max(1e-6, barB - barA); // 0 au bord droit, 1 au gauche
  const barWidthTrue = (M.bars[index][1] - M.bars[index][0]) / M.width;
  const yTop = rupture.yRight / M.height + t * barWidthTrue * SLOPE;
  const bandX = Math.max(M.ruptureWidth / M.width, minRupture);
  return ny < yTop || ny > yTop + bandX * SLOPE;
}

/** Distance signée à un carré arrondi (négative à l'intérieur). */
function roundedRect(px, py, size, radius) {
  const q = Math.abs(px - size / 2) - (size / 2 - radius);
  const r = Math.abs(py - size / 2) - (size / 2 - radius);
  return Math.hypot(Math.max(q, 0), Math.max(r, 0)) + Math.min(Math.max(q, r), 0) - radius;
}

/**
 * Dessine une icône en RGBA.
 *
 * @param {number} size côté en pixels
 * @param {object} o
 * @param {'rounded'|'square'} o.shape fond
 * @param {number[]} o.ground couleur de fond
 * @param {number[]} o.mark   couleur du symbole
 * @param {number} o.coverage hauteur du symbole, en fraction du côté
 */
function drawIcon(size, { shape = 'rounded', ground = BONE, mark = INK, coverage = 0.66 } = {}) {
  const S = 4;
  const data = Buffer.alloc(size * size * 4);
  const box = layout(size, coverage);
  const radius = shape === 'rounded' ? size * 0.2 : 0;
  // À 16 px, une rupture de 9/106 de largeur ne fait pas un demi-pixel : on la
  // force à environ un pixel, sinon le dessin perd ses ruptures.
  const minRupture = box.crisp ? 1.7 / Math.max(1, box.width) : 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgHits = 0;
      let markHits = 0;
      for (let sy = 0; sy < S; sy += 1) {
        for (let sx = 0; sx < S; sx += 1) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          if (shape === 'square' || roundedRect(px, py, size, radius) <= 0) bgHits += 1;
          const nx = (px - box.x0) / box.width;
          const ny = (py - box.y0) / box.height;
          if (insideSymbol(nx, ny, box, minRupture)) markHits += 1;
        }
      }
      const n = S * S;
      const bgA = bgHits / n;
      const markA = markHits / n;
      const alpha = Math.max(bgA, markA);
      const idx = (y * size + x) * 4;
      if (alpha === 0) {
        data[idx + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c += 1) {
        const base = bgA > 0 ? ground[c] : mark[c];
        data[idx + c] = Math.round(base * (1 - markA) + mark[c] * markA);
      }
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* SVG                                                                 */
/* ------------------------------------------------------------------ */

const f = (v) => Number(v.toFixed(4));

/**
 * Le symbole en chemins SVG, dans un repère 0 → 1.
 * Chaque lame est découpée par sa rupture en deux quadrilatères — c'est-à-dire
 * en deux morceaux de lame, ce qu'ils sont.
 */
function symbolPaths() {
  const band = (M.ruptureWidth / M.width) * SLOPE;
  return M.bars
    .map(([a, b], index) => {
      const x0 = a / M.width;
      const x1 = b / M.width;
      const rupture = M.ruptures.find((r) => r.bar === index);
      if (!rupture) return `M${f(x0)} 0H${f(x1)}V1H${f(x0)}Z`;
      const yRight = rupture.yRight / M.height;
      const yLeft = yRight + (x1 - x0) * SLOPE;
      return (
        `M${f(x0)} 0H${f(x1)}V${f(yRight)}L${f(x0)} ${f(yLeft)}Z` +
        `M${f(x0)} ${f(yLeft + band)}L${f(x1)} ${f(yRight + band)}V1H${f(x0)}Z`
      );
    })
    .join('');
}

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** Symbole seul, sans fond : c'est cette version que l'interface utilise. */
function symbolSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M.width} ${M.height}" fill="currentColor" role="img" aria-label="Pose Parquet">
  <title>Pose Parquet</title>
  <g transform="scale(${M.width} ${M.height})"><path d="${symbolPaths()}"/></g>
</svg>
`;
}

/**
 * Favicon : fond crème, symbole charbon.
 *
 * Volontairement **pas** de bascule en mode sombre : un carré crème se détache
 * aussi bien sur une barre d'onglets claire que sombre, alors qu'un symbole
 * doré sur charbon perd sa lisibilité à 16 px. La variante dorée existe dans
 * l'interface, sur les surfaces sombres, là où elle a du sens.
 */
function faviconSvg() {
  const coverage = 0.74;
  const w = coverage * opticalAspect(32);
  const x = ((1 - w) / 2) * 32;
  const y = ((1 - coverage) / 2) * 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Pose Parquet">
  <title>Pose Parquet</title>
  <rect width="32" height="32" rx="6.4" fill="${hex(BONE)}"/>
  <g transform="translate(${f(x)} ${f(y)}) scale(${f(w * 32)} ${f(coverage * 32)})" fill="${hex(INK)}">
    <path d="${symbolPaths()}"/>
  </g>
</svg>
`;
}

/** Icône « maskable » Android : fond plein, symbole dans la zone de sécurité. */
function maskableSvg() {
  const coverage = 0.5; // 80 % du côté seulement est garanti visible
  const w = coverage * ASPECT;
  const x = ((1 - w) / 2) * 512;
  const y = ((1 - coverage) / 2) * 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Pose Parquet">
  <title>Pose Parquet</title>
  <rect width="512" height="512" fill="${hex(BONE)}"/>
  <g transform="translate(${f(x)} ${f(y)}) scale(${f(w * 512)} ${f(coverage * 512)})" fill="${hex(INK)}">
    <path d="${symbolPaths()}"/>
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Encodage PNG minimal                                                */
/* ------------------------------------------------------------------ */

function crc32(buf) {
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Int32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
      }
      return t;
    })());
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Sortie                                                              */
/* ------------------------------------------------------------------ */

const targets = [
  { name: 'favicon-16.png', size: 16, options: { coverage: 0.82 } },
  { name: 'favicon-24.png', size: 24, options: { coverage: 0.79 } },
  { name: 'favicon-32.png', size: 32, options: { coverage: 0.76 } },
  { name: 'favicon-48.png', size: 48, options: { coverage: 0.72 } },
  { name: 'apple-touch-icon.png', size: 180, options: { coverage: 0.6 } },
  { name: 'icon-192.png', size: 192, options: { coverage: 0.6 } },
  { name: 'icon-512.png', size: 512, options: { coverage: 0.6 } },
  { name: 'maskable-512.png', size: 512, options: { shape: 'square', coverage: 0.5 } },
  // Variante dorée sur charbon : icône d'application sur fond sombre.
  { name: 'icon-512-dark.png', size: 512, options: { ground: INK, mark: GOLD, coverage: 0.6 } },
];

function main() {
  fs.mkdirSync(DIR, { recursive: true });
  targets.forEach(({ name, size, options }) => {
    const png = encodePng(size, drawIcon(size, options));
    fs.writeFileSync(path.join(DIR, name), png);
    process.stdout.write(`${name.padEnd(24)} ${String(size).padStart(3)} px  ${(png.length / 1024).toFixed(1)} Ko\n`);
  });
  fs.writeFileSync(path.join(DIR, 'favicon.svg'), faviconSvg());
  fs.writeFileSync(path.join(DIR, 'maskable.svg'), maskableSvg());
  fs.writeFileSync(path.join(DIR, 'symbol.svg'), symbolSvg());
  process.stdout.write('favicon.svg, maskable.svg, symbol.svg\n');
  console.log('\nIcônes générées dans assets/icons/ — symbole Concept C.');
}

if (require.main === module) main();

module.exports = { symbolPaths, symbolSvg, M, INK, BONE, GOLD };
