const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMAGES = path.join(ROOT, 'assets', 'images');
const TAILLES_FIGURE = '(min-width: 50rem) 46rem, 92vw';

let index = null;
function variantes(nom) {
  if (!index) {
    index = new Map();
    for (const f of fs.readdirSync(IMAGES)) {
      const m = f.match(/^(.+)-(\d+)\.webp$/);
      if (!m) continue;
      if (!index.has(m[1])) index.set(m[1], []);
      index.get(m[1]).push(Number(m[2]));
    }
    for (const l of index.values()) l.sort((a, b) => a - b);
  }
  return index.get(nom) || [];
}

function imagesWebp(html, relPath) {
  const dossier = path.posix.dirname(relPath);
  return html
    .split(/(<picture\b[\s\S]*?<\/picture>)/i)
    .map((morceau, i) => i % 2 ? morceau : morceau.replace(/<img\b[^>]*>/gi, (img) => {
      const src = (img.match(/\bsrc="([^"]+)"/) || [])[1];
      if (!src || /\b(?:srcset|data-photo)\b/.test(img) || /^(?:[a-z]+:|\/\/)/i.test(src)) return img;
      const disque = path.posix.normalize(path.posix.join(dossier, src));
      const m = disque.match(/^assets\/images\/([^/]+)\.jpe?g$/i);
      if (!m) return img;
      const largeurs = variantes(m[1]);
      if (!largeurs.length) return img;
      const base = src.slice(0, src.length - path.posix.basename(src).length);
      const srcset = largeurs.map((l) => `${base}${m[1]}-${l}.webp ${l}w`).join(', ');
      return `<picture><source type="image/webp" srcset="${srcset}" sizes="${TAILLES_FIGURE}" />${img}</picture>`;
    }))
    .join('');
}

const logoWebp = (chemin) => {
  if (!chemin || !/\.png$/i.test(chemin)) return null;
  const webp = chemin.replace(/\.png$/i, '.webp');
  return fs.existsSync(path.join(ROOT, webp)) ? webp : null;
};

module.exports = { imagesWebp, logoWebp };
