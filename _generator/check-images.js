/**
 * Contrôle des images de toutes les pages générées.
 *
 * Un `<img>` peut être parfaitement écrit et pointer vers un fichier qui
 * n'existe pas — c'est ce qui produit les grands rectangles gris. Ce script
 * parcourt le site généré et vérifie, pour chaque `<img>` et chaque `<source>`,
 * que le fichier est bien là et qu'il a une taille plausible.
 *
 * Il ne dit rien de la **pertinence** d'une image : une photo de bois brut sur
 * une page « pose en diagonale » passe ce contrôle sans problème. La revue
 * éditoriale reste manuelle.
 *
 *   node _generator/check-images.js
 *
 * Sortie : une ligne par problème, puis un résumé. Code de sortie 1 s'il reste
 * un problème bloquant, pour pouvoir l'enchaîner dans un script.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
/** Dossiers qui ne sont pas du site publié. */
const IGNORES = new Set(['node_modules', '.git', '_generator', '_calibrage', 'assets', 'docs', 'data', 'js', 'css']);

function pagesHtml(dossier = RACINE, trouvees = []) {
  for (const nom of fs.readdirSync(dossier)) {
    if (IGNORES.has(nom)) continue;
    const complet = path.join(dossier, nom);
    const stat = fs.statSync(complet);
    if (stat.isDirectory()) pagesHtml(complet, trouvees);
    else if (nom.endsWith('.html')) trouvees.push(complet);
  }
  return trouvees;
}

/** Résout une URL d'image telle qu'un navigateur le ferait depuis la page. */
function resoudre(page, url) {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return null; // externe
  if (url.startsWith('/')) return path.join(RACINE, url.slice(1));
  return path.resolve(path.dirname(page), url);
}

/** Dimensions réelles d'un fichier image, lues dans son en-tête. */
function dimensions(fichier) {
  const buf = fs.readFileSync(fichier);
  if (buf.length < 16) return null;
  // PNG
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG : on parcourt les segments jusqu'au SOF
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marqueur = buf[i + 1];
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  // WebP (VP8X / VP8 / VP8L)
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const type = buf.toString('ascii', 12, 16);
    if (type === 'VP8X') return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (type === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (type === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  // SVG : pas de pixels, on se contente de vérifier qu'il y a une racine
  if (buf.toString('utf8', 0, 400).includes('<svg')) return { w: -1, h: -1 };
  return null;
}

const problemes = [];
let nbImages = 0;
let nbSources = 0;
const pages = pagesHtml();

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const relPage = path.relative(RACINE, page).replace(/\\/g, '/');
  const dire = (gravite, quoi) => problemes.push({ page: relPage, gravite, quoi });

  // <img src> et <img srcset>
  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    nbImages += 1;
    const attrs = m[1];
    const src = (attrs.match(/\ssrc="([^"]+)"/) || [])[1];
    if (!src) { dire('bloquant', '<img> sans src'); continue; }
    const cible = resoudre(page, src);
    if (!cible) continue;
    if (!fs.existsSync(cible)) { dire('bloquant', `src introuvable : ${src}`); continue; }
    const d = dimensions(cible);
    if (!d) dire('signalement', `format non reconnu : ${src}`);
    else if (d.w === 0 || d.h === 0) dire('bloquant', `image de taille nulle : ${src}`);

    // width/height : sans eux la page saute au chargement
    if (!/\swidth="\d+"/.test(attrs) || !/\sheight="\d+"/.test(attrs)) {
      dire('signalement', `width/height absents : ${src}`);
    }
    for (const c of (attrs.match(/\ssrcset="([^"]+)"/) || [])[1]?.split(',') || []) {
      const url = c.trim().split(/\s+/)[0];
      if (!url) continue;
      const f = resoudre(page, url);
      if (f && !fs.existsSync(f)) dire('bloquant', `srcset introuvable : ${url}`);
    }
  }

  // <source srcset> des <picture>
  for (const m of html.matchAll(/<source\b([^>]*)>/g)) {
    nbSources += 1;
    const srcset = (m[1].match(/\ssrcset="([^"]+)"/) || [])[1];
    if (!srcset) { dire('signalement', '<source> sans srcset'); continue; }
    for (const c of srcset.split(',')) {
      const url = c.trim().split(/\s+/)[0];
      if (!url) continue;
      const f = resoudre(page, url);
      if (f && !fs.existsSync(f)) dire('bloquant', `<source> introuvable : ${url}`);
    }
  }

  // Images d'Open Graph : elles ne s'affichent pas sur le site mais cassent
  // les partages, et personne ne le voit jamais.
  for (const m of html.matchAll(/<meta\s+property="og:image"\s+content="([^"]+)"/g)) {
    // Une URL Open Graph est absolue : après avoir retiré l'origine, le chemin
    // se résout depuis la **racine du site**, pas depuis la page. Résolu depuis
    // la page, `assets/images/og-default.jpg` devenait
    // `motifs/assets/images/og-default.jpg` et le contrôle signalait 28 images
    // manquantes qui existaient toutes.
    const chemin = m[1].replace(/^https?:\/\/[^/]+\//, '');
    const f = path.join(RACINE, chemin);
    if (!fs.existsSync(f)) dire('signalement', `og:image introuvable : ${m[1]}`);
  }
}

const bloquants = problemes.filter((p) => p.gravite === 'bloquant');
const signalements = problemes.filter((p) => p.gravite === 'signalement');

const parPage = new Map();
for (const p of problemes) {
  if (!parPage.has(p.page)) parPage.set(p.page, []);
  parPage.get(p.page).push(p);
}
for (const [page, liste] of parPage) {
  console.log(`\n${page}`);
  for (const p of liste) console.log(`  ${p.gravite === 'bloquant' ? '✗' : '·'} ${p.quoi}`);
}

console.log(`\n${pages.length} pages · ${nbImages} <img> · ${nbSources} <source>`);
console.log(`${bloquants.length} bloquant(s) · ${signalements.length} signalement(s)`);
if (!problemes.length) console.log('Aucune image manquante.');
console.log('\nRappel : ce contrôle ne juge pas la PERTINENCE d’une image.');

process.exit(bloquants.length ? 1 : 0);
