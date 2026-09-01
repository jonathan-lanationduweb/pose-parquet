/**
 * Chaîne d'assets : un seul CSS, un seul arbre JS, et un nom qui change
 * quand le contenu change.
 *
 * Pourquoi : GitHub Pages sert les fichiers avec `Cache-Control: max-age=600`
 * et le CSS était chargé par une chaîne de `@import`. Après un déploiement,
 * un visiteur pouvait donc voir le nouveau HTML avec l'ancien CSS pendant dix
 * minutes — c'est exactement le symptôme qui a été constaté plusieurs fois.
 *
 * La correction est classique : les fichiers de travail restent découpés
 * (css/components/*, js/*), mais la production reçoit
 *
 *   assets/dist/site.<hash>.css        (tout le CSS du site, sans @import)
 *   assets/dist/studio.<hash>.css      (le CSS de l'application)
 *   assets/dist/<hash>/js/main.js      (l'arbre JS complet, chemins relatifs)
 *
 * Le nom contient l'empreinte du contenu : un fichier modifié change d'URL,
 * donc aucun cache ne peut le servir périmé. Les fichiers inchangés gardent
 * leur nom et restent en cache.
 *
 * Aucun bundler : quelques dizaines de lignes de Node suffisent ici.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST = path.join('assets', 'dist');

const hash = (content) => crypto.createHash('sha1').update(content).digest('hex').slice(0, 10);

const listFiles = (dir, filter) => {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!filter || filter(full)) out.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
};

/**
 * Aplatit une feuille et ses `@import`, en réécrivant les url() pour qu'elles
 * restent valides depuis assets/dist/.
 */
function inlineCss(root, entry, seen = new Set()) {
  const file = path.join(root, entry);
  if (seen.has(file)) return '';
  seen.add(file);

  const dir = path.dirname(entry).split(path.sep).join('/');
  let css = fs.readFileSync(file, 'utf8');

  // 1. Les imports sont mis de côté : leur contenu sera déjà réécrit quand on
  //    le réinsérera, il ne doit donc pas repasser par l'étape 2.
  const imports = [];
  css = css.replace(/@import\s+url\(\s*["']([^"']+)["']\s*\)\s*;/g, (match, href) => {
    if (/^https?:/.test(href)) return match;
    imports.push(path.posix.normalize(path.posix.join(dir, href)));
    return `/*@@import-${imports.length - 1}@@*/`;
  });

  // 2. Les url() propres à ce fichier deviennent relatives à assets/dist/
  css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, quote, href) => {
    if (/^(https?:|data:|#|\/)/.test(href)) return match;
    const absolute = path.posix.normalize(path.posix.join(dir, href));
    return `url("${path.posix.relative(DIST.split(path.sep).join('/'), absolute)}")`;
  });

  // 3. Réinsertion, dans l'ordre d'origine : la cascade est préservée
  css = css.replace(/\/\*@@import-(\d+)@@\*\//g, (match, index) => inlineCss(root, imports[Number(index)], seen));

  return `${css}\n`;
}

/** Écrit un fichier et renvoie son chemin relatif à la racine du site. */
function writeHashed(root, name, extension, content) {
  const id = hash(content);
  const file = `${DIST.split(path.sep).join('/')}/${name}.${id}.${extension}`;
  fs.mkdirSync(path.join(root, DIST), { recursive: true });
  fs.writeFileSync(path.join(root, file), content, 'utf8');
  return file;
}

let manifest = null;

/**
 * Construit les assets et renvoie le manifeste des URL à utiliser dans le HTML.
 * @param {string} root racine du site
 * @param {object} options
 * @param {string[]} options.pageCss feuilles de page à intégrer au bundle
 */
function buildAssets(root, { pageCss = [] } = {}) {
  // Repartir d'un dossier propre : sinon les anciennes versions s'accumulent
  const distPath = path.join(root, DIST);
  if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true, force: true });

  /* ---- CSS du site : la chaîne principale, puis les feuilles de page ---- */
  const seen = new Set();
  let site = inlineCss(root, 'css/main.css', seen);
  pageCss.forEach((sheet) => {
    site += inlineCss(root, sheet, seen);
  });
  const siteCss = writeHashed(root, 'site', 'css', site);

  /* ---- CSS du Studio ---- */
  const studioCss = writeHashed(root, 'studio', 'css', inlineCss(root, 'css/studio.css'));

  /* ---- JS : l'arbre est copié tel quel dans un dossier daté par son contenu ----
     Les imports internes sont relatifs : recopier l'arbre suffit à changer
     l'URL de tous les modules d'un coup. */
  const jsFiles = [...listFiles(path.join(root, 'js')), ...listFiles(path.join(root, 'components'))]
    .filter((file) => file.endsWith('.js'))
    .sort();
  const jsHash = hash(jsFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n'));
  jsFiles.forEach((file) => {
    const relative = path.relative(root, file);
    const target = path.join(distPath, jsHash, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  });
  const jsDir = `${DIST.split(path.sep).join('/')}/${jsHash}`;

  /* ---- Icônes : une empreinte suffit, elles changent rarement ---- */
  const iconFiles = listFiles(path.join(root, 'assets', 'icons')).sort();
  const iconHash = hash(iconFiles.map((file) => fs.readFileSync(file)).join(''));

  manifest = {
    css: siteCss,
    studioCss,
    js: `${jsDir}/js/main.js`,
    studioJs: `${jsDir}/js/studio/main.js`,
    icons: iconHash,
    sizes: {
      css: Buffer.byteLength(site),
      js: jsFiles.length,
    },
  };
  return manifest;
}

/** Manifeste courant (le générateur appelle buildAssets() avant d'écrire le HTML). */
function assets() {
  if (!manifest) throw new Error('buildAssets() doit être appelé avant la génération des pages');
  return manifest;
}

module.exports = { buildAssets, assets };
