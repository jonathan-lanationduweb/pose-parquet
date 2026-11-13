const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FEUILLE = path.join(RACINE, 'css', 'fonts.css');



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



const estLatinDeBase = (face) => /U\+0000-00FF/i.test(face.plage);



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
