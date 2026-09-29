/**
 * Ce que `css/fonts.css` déclare vraiment, lisible depuis le générateur.
 *
 * POURQUOI. Le gabarit préchargeait deux polices par leur nom de fichier,
 * écrit à la main :
 *
 *   <link rel="preload" … href="assets/fonts/inter-400-1.woff2">
 *
 * La déduplication d'Inter a renommé ce fichier en `inter-var-1.woff2`. Le
 * préchargement aurait alors visé un fichier absent : un 404 silencieux, et
 * l'optimisation perdue sans que rien ne le dise — le pire genre de panne,
 * celle qui ne casse rien de visible.
 *
 * Le gabarit demande donc maintenant « la police du texte courant, sous-
 * ensemble latin », et c'est ce module qui répond, en relisant la feuille
 * que `fetch-fonts.js` a écrite. Renommer un fichier ne peut plus casser un
 * préchargement.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FEUILLE = path.join(RACINE, 'css', 'fonts.css');

/**
 * Les @font-face déclarés, dans l'ordre de la feuille.
 *
 * @returns {Array<{famille:string,style:string,poids:string,fichier:string,plage:string}>}
 */
function faces() {
  const css = fs.readFileSync(FEUILLE, 'utf8');
  const out = [];
  for (const bloc of css.split('@font-face').slice(1)) {
    const famille = (bloc.match(/font-family:\s*"([^"]+)"/) || [])[1];
    const fichier = (bloc.match(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/) || [])[1];
    if (!famille || !fichier) continue;
    out.push({
      famille,
      style: (bloc.match(/font-style:\s*([a-z]+)/) || [])[1] || 'normal',
      poids: (bloc.match(/font-weight:\s*([^;]+);/) || [])[1].trim(),
      fichier,
      plage: ((bloc.match(/unicode-range:\s*([^;]+);/) || [])[1] || '').trim(),
    });
  }
  return out;
}

/**
 * Le sous-ensemble « latin » de base — celui que le français utilise.
 *
 * On le reconnaît à `U+0000-00FF`, qui couvre les accents de la langue. C'est
 * le seul fichier qu'une page en français télécharge toujours ; l'autre,
 * `latin-ext`, ne part que si un caractère l'exige.
 */
const estLatinDeBase = (face) => /U\+0000-00FF/i.test(face.plage);

/**
 * Le fichier à précharger pour une famille : son sous-ensemble latin, en
 * style normal.
 *
 * @param {string} famille  ex. 'Inter'
 * @returns {string} nom de fichier, relatif à assets/fonts/
 */
function aPrecharger(famille) {
  const face = faces().find(
    (f) => f.famille === famille && f.style === 'normal' && estLatinDeBase(f)
  );
  if (!face) {
    throw new Error(
      `Aucun @font-face « ${famille} » normal / latin de base dans css/fonts.css. ` +
        'Relancer node _generator/fetch-fonts.js.'
    );
  }
  return face.fichier;
}

module.exports = { faces, aPrecharger, estLatinDeBase, FEUILLE };
