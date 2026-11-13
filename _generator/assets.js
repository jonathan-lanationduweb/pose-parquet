const fs = require('fs');
const path = require('path');
const {
  empreinte: hash,
  empreinteDeFichiers,
  lireTexte,
  ecrireTexte,
  copierCanonique,
} = require('./eol');

const DIST = path.join('assets', 'dist');



const BUNDLES_PAGE = [
  { nom: 'plan', feuille: 'css/components/visualizer.css', marqueur: 'data-visualizer' },
  { nom: 'scene', feuille: 'css/components/visualizer-photo.css', marqueur: 'data-vz-preview' },
  { nom: 'spotlight', feuille: 'css/components/spotlight.css', marqueur: 'class="section spotlight' },
  { nom: 'formulaire', feuille: 'components/project-form/project-form.css', marqueur: 'data-project-form' },
];




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



function inlineCss(root, entry, seen = new Set()) {
  const file = path.join(root, entry);
  if (seen.has(file)) return '';
  seen.add(file);

  const dir = path.dirname(entry).split(path.sep).join('/');
  let css = lireTexte(file);



  const imports = [];
  css = css.replace(/@import\s+url\(\s*["']([^"']+)["']\s*\)\s*;/g, (match, href) => {
    if (/^https?:/.test(href)) return match;
    imports.push(path.posix.normalize(path.posix.join(dir, href)));
    return `/*@@import-${imports.length - 1}@@*/`;
  });


  css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, quote, href) => {
    if (/^(https?:|data:|#|\/)/.test(href)) return match;
    const absolute = path.posix.normalize(path.posix.join(dir, href));
    return `url("${path.posix.relative(DIST.split(path.sep).join('/'), absolute)}")`;
  });


  css = css.replace(/\/\*@@import-(\d+)@@\*\//g, (match, index) => inlineCss(root, imports[Number(index)], seen));

  return `${css}\n`;
}


function writeHashed(root, name, extension, content) {
  const id = hash(content);
  const file = `${DIST.split(path.sep).join('/')}/${name}.${id}.${extension}`;
  fs.mkdirSync(path.join(root, DIST), { recursive: true });
  ecrireTexte(path.join(root, file), content);
  return file;
}

let manifest = null;



function buildAssets(root, { pageCss = [] } = {}) {

  const distPath = path.join(root, DIST);
  if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true, force: true });


  const seen = new Set();
  let site = inlineCss(root, 'css/main.css', seen);
  pageCss.forEach((sheet) => {
    site += inlineCss(root, sheet, seen);
  });
  const siteCss = writeHashed(root, 'site', 'css', site);


  const pageBundles = BUNDLES_PAGE.map((bundle) => ({
    ...bundle,



    url: writeHashed(root, bundle.nom, 'css', inlineCss(root, bundle.feuille, new Set())),
  }));


  const studioCss = writeHashed(root, 'studio', 'css', inlineCss(root, 'css/studio.css'));

  const productCss = writeHashed(root, 'product', 'css', inlineCss(root, 'css/product.css'));



  const jsFiles = [...listFiles(path.join(root, 'js')), ...listFiles(path.join(root, 'components'))]
    .filter((file) => file.endsWith('.js'))
    .sort();
  const jsHash = empreinteDeFichiers(jsFiles, root);
  jsFiles.forEach((file) => {
    const relative = path.relative(root, file);
    const target = path.join(distPath, jsHash, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    copierCanonique(file, target);
  });
  const jsDir = `${DIST.split(path.sep).join('/')}/${jsHash}`;



  const iconFiles = listFiles(path.join(root, 'assets', 'icons')).sort();
  const iconHash = empreinteDeFichiers(iconFiles, root);

  manifest = {
    css: siteCss,
    pageBundles,
    studioCss,
    productCss,
    js: `${jsDir}/js/main.js`,
    studioJs: `${jsDir}/js/studio/main.js`,
    productJs: `${jsDir}/js/product/main.js`,
    icons: iconHash,
    sizes: {
      css: Buffer.byteLength(site),
      js: jsFiles.length,
    },
  };
  return manifest;
}


function assets() {
  if (!manifest) throw new Error('buildAssets() doit être appelé avant la génération des pages');
  return manifest;
}



function verifierRattachements(root, pages) {
  const anomalies = [];
  const bundles = assets().pageBundles || [];
  pages.forEach((page) => {
    const html = lireTexte(path.join(root, page));
    bundles.forEach((bundle) => {
      const marque = html.includes(bundle.marqueur);
      const lie = html.includes(bundle.url);
      if (marque && !lie) anomalies.push(`${page} : porte « ${bundle.marqueur} » sans charger ${bundle.nom}`);
      if (!marque && lie) anomalies.push(`${page} : charge ${bundle.nom} sans porter « ${bundle.marqueur} »`);
    });
  });
  return anomalies;
}

module.exports = { buildAssets, assets, verifierRattachements };
