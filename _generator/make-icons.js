/**
 * Génère les icônes PNG du site à partir de la définition vectorielle du
 * monogramme (double chevron « Point de Hongrie »).
 *
 *   node _generator/make-icons.js
 *
 * Rasteriseur maison : aucune dépendance, encodage PNG via zlib (Node).
 * Anti-crénelage par suréchantillonnage 4×4 et fonctions de distance.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'assets', 'icons');

const INK = [22, 24, 26];
const SAGE = [139, 160, 136];
const BONE = [242, 239, 232];

/** Distance d'un point à un segment. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Distance signée à un rectangle arrondi centré. */
function distToRoundedRect(px, py, w, h, r) {
  const qx = Math.abs(px - w / 2) - (w / 2 - r);
  const qy = Math.abs(py - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Dessine l'icône dans un buffer RGBA.
 * @param {number} size côté en pixels
 * @param {boolean} maskable fond plein (pour les icônes Android « maskable »)
 */
function drawIcon(size, maskable) {
  const S = 4; // suréchantillonnage
  const data = Buffer.alloc(size * size * 4);
  const u = size / 64; // le dessin est défini sur une grille 64×64
  const radius = maskable ? 0 : 15 * u;
  const inset = maskable ? 13 * u : 0; // zone de sécurité des icônes maskables
  const stroke = (maskable ? 6 : 7.5) * u;

  const chevrons = maskable
    ? [
        { pts: [19, 34, 32, 21, 45, 34], color: SAGE },
        { pts: [19, 46, 32, 33, 45, 46], color: BONE },
      ]
    : [
        { pts: [14, 33, 32, 15, 50, 33], color: SAGE },
        { pts: [14, 51, 32, 33, 50, 51], color: BONE },
      ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < S; sy += 1) {
        for (let sx = 0; sx < S; sx += 1) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;

          // Fond
          const bg = maskable ? -1 : distToRoundedRect(px, py, size, size, radius);
          let cr = INK[0];
          let cg = INK[1];
          let cb = INK[2];
          let ca = bg <= 0 ? 1 : 0;

          // Chevrons (le second passe au-dessus du premier)
          for (const chevron of chevrons) {
            const [x1, y1, x2, y2, x3, y3] = chevron.pts.map((v) => v * u + (v === 0 ? 0 : 0));
            void inset;
            const d = Math.min(
              distToSegment(px, py, x1, y1, x2, y2),
              distToSegment(px, py, x2, y2, x3, y3)
            );
            if (d <= stroke / 2) {
              [cr, cg, cb] = chevron.color;
              ca = 1;
            }
          }

          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }

      const n = S * S;
      const alpha = a / n;
      const idx = (y * size + x) * 4;
      data[idx] = alpha ? Math.round(r / a) : 0;
      data[idx + 1] = alpha ? Math.round(g / a) : 0;
      data[idx + 2] = alpha ? Math.round(b / a) : 0;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  return data;
}

/* ---------------- Encodage PNG minimal ---------------- */
function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      c = n;
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
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filtre « none »
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- Sortie ---------------- */
const targets = [
  { name: 'favicon-16.png', size: 16, maskable: false },
  { name: 'favicon-32.png', size: 32, maskable: false },
  { name: 'favicon-48.png', size: 48, maskable: false },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'icon-192.png', size: 192, maskable: true },
  { name: 'icon-512.png', size: 512, maskable: true },
];

fs.mkdirSync(DIR, { recursive: true });
targets.forEach(({ name, size, maskable }) => {
  const png = encodePng(size, drawIcon(size, maskable));
  fs.writeFileSync(path.join(DIR, name), png);
  process.stdout.write(`${name}  ${(png.length / 1024).toFixed(1)} Ko\n`);
});
console.log('\nIcônes générées dans assets/icons/.');
