/**
 * Images réactives.
 *
 * Chaque photographie est déclinée en trois largeurs, en JPEG et en WebP, par
 * `node _generator/fetch-photos.js` (les fichiers dérivés sont demandés à
 * Pexels aux bonnes dimensions : aucune bibliothèque de traitement d'image
 * n'est nécessaire, et donc aucune dépendance).
 *
 * `picture()` produit le balisage correspondant. Si la photo n'est pas
 * déclarée, on retombe sur une simple balise <img> : le site reste valide.
 */
const { PHOTOS } = require('./photos');

/** Fractions de la largeur d'origine produites pour chaque photo. */
const FACTORS = [0.4, 0.7, 1];

const dimsFor = (name) => {
  if (PHOTOS[name]) return { w: PHOTOS[name].w, h: PHOTOS[name].h };
  if (/^inspi-\d+$/.test(name)) return { w: 900, h: 700 };
  return null;
};

/** Largeurs réellement produites pour une photo (arrondies à 10 px). */
function widthsFor(name) {
  const dims = dimsFor(name);
  if (!dims) return [];
  const list = FACTORS.map((factor) => Math.round((dims.w * factor) / 10) * 10);
  return [...new Set(list)].sort((a, b) => a - b);
}

/** Toutes les déclinaisons à télécharger, pour une entrée de photos.js. */
function variantsFor(name, photo) {
  const ratio = photo.h / photo.w;
  return widthsFor(name).map((w) => ({ w, h: Math.round(w * ratio) }));
}

/**
 * @param {string} name  nom de fichier sans extension (ex. « hero-wide »)
 * @param {object} o
 * @param {string} [o.base]     préfixe de chemin (« ../ » depuis une sous-page)
 * @param {string} o.alt
 * @param {string} [o.sizes]    indication de taille d'affichage
 * @param {boolean} [o.priority] image de premier écran (chargement prioritaire)
 * @param {string} [o.attrs]    attributs supplémentaires sur la balise <img>
 */
function picture(name, { base = '', alt = '', sizes = '100vw', priority = false, attrs = '' } = {}) {
  const dims = dimsFor(name);
  const src = `${base}assets/images/${name}.jpg`;
  const loading = priority
    ? 'fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';

  if (!dims) return `<img src="${src}" alt="${alt}" ${loading} ${attrs} />`;

  const widths = widthsFor(name);
  const srcset = (ext) =>
    widths.map((w) => `${base}assets/images/${name}-${w}.${ext} ${w}w`).join(', ');

  return `<picture>
              <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}" />
              <img src="${src}" srcset="${srcset('jpg')}" sizes="${sizes}" alt="${alt}"
                width="${dims.w}" height="${dims.h}" ${loading} ${attrs} />
            </picture>`;
}

module.exports = { picture, widthsFor, variantsFor, dimsFor, FACTORS };
