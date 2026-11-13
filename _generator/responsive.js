const { PHOTOS } = require('./photos');


const FACTORS = [0.4, 0.7, 1];

const dimsFor = (name) => {
  if (PHOTOS[name]) return { w: PHOTOS[name].w, h: PHOTOS[name].h };
  if (/^inspi-\d+$/.test(name)) return { w: 900, h: 700 };
  return null;
};


function widthsFor(name) {
  const dims = dimsFor(name);
  if (!dims) return [];


  if (PHOTOS[name] && Array.isArray(PHOTOS[name].largeurs)) return PHOTOS[name].largeurs.slice().sort((a, b) => a - b);
  const list = FACTORS.map((factor) => Math.round((dims.w * factor) / 10) * 10);
  return [...new Set(list)].sort((a, b) => a - b);
}


function variantsFor(name, photo) {
  const ratio = photo.h / photo.w;
  return widthsFor(name).map((w) => ({ w, h: Math.round(w * ratio) }));
}



function picture(name, { base = '', alt = '', sizes = '100vw', priority = false, attrs = '' } = {}) {
  const dims = dimsFor(name);


  const fichier = (PHOTOS[name] && PHOTOS[name].alias) || name;
  const src = `${base}assets/images/${fichier}.jpg`;
  const loading = priority
    ? 'fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';

  if (!dims) return `<img src="${src}" alt="${alt}" ${loading} ${attrs} />`;

  const widths = widthsFor(name);
  const srcset = (ext) =>
    widths.map((w) => `${base}assets/images/${fichier}-${w}.${ext} ${w}w`).join(', ');



  const webp = PHOTOS[name] && PHOTOS[name].jpgSeulement
    ? ''
    : `
              <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}" />`;
  return `<picture>${webp}
              <img src="${src}" srcset="${srcset('jpg')}" sizes="${sizes}" alt="${alt}"
                width="${dims.w}" height="${dims.h}" ${loading} ${attrs} />
            </picture>`;
}

module.exports = { picture, widthsFor, variantsFor, dimsFor, FACTORS };
