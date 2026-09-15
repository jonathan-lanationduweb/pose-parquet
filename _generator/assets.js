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
 *
 * Les empreintes passent par `eol.js` : elles portent sur une représentation
 * canonique (texte ramené en LF, binaires octet pour octet) et non sur ce que
 * le checkout a bien voulu écrire sur ce disque. Sans cela, la même révision
 * donnait `studio.ec9baa1d65.css` sous Windows et un autre nom sous Linux,
 * pour un contenu logiquement identique.
 */
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

/**
 * Feuilles rattachées à une page par un marqueur, et non au site entier.
 *
 * Le principe : une feuille de composant ne part dans le paquet global que si
 * la plupart des pages en ont l'usage. Les cinq ci-dessous n'y étaient pour
 * personne — 51 Ko sur 151 payés par les 32 pages pour des composants
 * présents sur une à treize d'entre elles.
 *
 * Le rattachement ne se DÉCLARE pas, il se CONSTATE : `layout()` cherche le
 * marqueur dans le corps de la page. Une déclaration manuelle s'oublie, et
 * son oubli produit une page sans style que personne ne remarque avant la
 * mise en ligne ; un marqueur, lui, est le composant lui-même. Si le
 * composant est là, la feuille est là.
 *
 * `verifierRattachements()` referme la boucle en relisant le HTML produit.
 *
 * `marqueur` doit apparaître TEL QUEL dans le HTML généré — attribut de
 * montage de préférence, car c'est ce qui ne peut pas changer sans que le
 * composant change aussi.
 */
const BUNDLES_PAGE = [
  { nom: 'plan', feuille: 'css/components/visualizer.css', marqueur: 'data-visualizer' },
  { nom: 'scene', feuille: 'css/components/visualizer-photo.css', marqueur: 'data-vz-preview' },
  { nom: 'spotlight', feuille: 'css/components/spotlight.css', marqueur: 'class="section spotlight' },
  { nom: 'formulaire', feuille: 'components/project-form/project-form.css', marqueur: 'data-project-form' },
];

/*
 * `css/components/gallery.css` n'est plus dans aucun paquet, et ce n'est pas
 * un oubli.
 *
 * Ses 4,8 Ko décrivaient la grille de vignettes de la page Inspiration, que le
 * carrousel « pleins feux » a remplacée. Vérifié le 14/09/2026 : aucune des
 * 32 pages générées ne porte `.gallery` ni `.gallery__*`, et aucun script ne
 * les pose — `carousel--gallery`, qui existe bien dans le HTML, est stylé par
 * components/carousel.css et n'a rien à voir. La feuille était donc servie à
 * tout le site pour zéro élément.
 *
 * Le fichier est laissé en place : le supprimer est une décision d'entretien,
 * pas une optimisation, et il ne coûte plus rien à personne.
 */

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
  let css = lireTexte(file);

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
  ecrireTexte(path.join(root, file), content);
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

  /* ---- Feuilles rattachées à une page par marqueur ---- */
  const pageBundles = BUNDLES_PAGE.map((bundle) => ({
    ...bundle,
    // `seen` n'est PAS partagé avec le paquet du site : ces feuilles en ont été
    // retirées, et un `seen` commun les ferait taire ici aussi — on écrirait
    // alors des paquets vides sans qu'aucune erreur ne le signale.
    url: writeHashed(root, bundle.nom, 'css', inlineCss(root, bundle.feuille, new Set())),
  }));

  /* ---- CSS du Visualiseur Parquet (fichier interne : css/studio.css) ---- */
  const studioCss = writeHashed(root, 'studio', 'css', inlineCss(root, 'css/studio.css'));
  /* ---- CSS du Visualiseur produit (css/product.css) ---- */
  const productCss = writeHashed(root, 'product', 'css', inlineCss(root, 'css/product.css'));

  /* ---- JS : l'arbre est recopié dans un dossier daté par son contenu ----
     Les imports internes sont relatifs : recopier l'arbre suffit à changer
     l'URL de tous les modules d'un coup. La copie est canonique — fins de
     ligne en LF — pour que le fichier publié soit bien celui dont on vient de
     calculer l'empreinte. */
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

  /* ---- Icônes : une empreinte suffit, elles changent rarement ----
     Le dossier mêle des PNG et des SVG : `empreinteDeFichiers` hache chaque
     fichier selon son type, ce qui évite d'avoir à choisir un traitement
     unique pour du binaire et du texte. */
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

/** Manifeste courant (le générateur appelle buildAssets() avant d'écrire le HTML). */
function assets() {
  if (!manifest) throw new Error('buildAssets() doit être appelé avant la génération des pages');
  return manifest;
}

/**
 * Le contrôle qui rend le découpage sûr.
 *
 * On relit les pages écrites et on vérifie, pour chaque feuille rattachée, que
 * la présence du marqueur et la présence du lien sont la MÊME chose. Les deux
 * sens comptent : un marqueur sans lien donne une page sans style, un lien
 * sans marqueur donne un téléchargement pour rien.
 *
 * C'est ce contrôle, et lui seul, qui autorise à sortir des feuilles du paquet
 * global. Sans lui, le découpage serait un pari renouvelé à chaque page
 * ajoutée.
 *
 * @param {string} root racine du site
 * @param {string[]} pages chemins relatifs des pages écrites
 * @returns {string[]} anomalies, vide si tout concorde
 */
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
