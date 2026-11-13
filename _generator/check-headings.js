const fs = require('fs');
const path = require('path');
const { exclusions } = require('./arborescence');
const exclure = exclusions(['assets', 'backend', 'docs', 'design', 'components']);

function verifierTitres(root) {
  const erreurs = [];
  let pages = 0;
  function parcourir(dir) {
    for (const entree of fs.readdirSync(dir, { withFileTypes: true })) {
      const fichier = path.join(dir, entree.name);
      if (entree.isDirectory()) { if (!exclure(entree.name)) parcourir(fichier); continue; }
      if (!entree.name.endsWith('.html')) continue;
      const html = fs.readFileSync(fichier, 'utf8');
      const titres = [...html.matchAll(/<h1\b[^>]*>/gi)];
      if (titres.length !== 1) erreurs.push(path.relative(root, fichier) + ' : ' + titres.length + ' H1, un seul attendu.');
      if (titres.some(t => /visually-hidden|\shidden(?:\s|=|>)/i.test(t[0]))) erreurs.push(path.relative(root, fichier) + ' : le H1 doit être visible.');
      pages++;
    }
  }
  parcourir(root);
  if (erreurs.length) throw new Error(erreurs.join('\n'));
  return pages;
}

if (require.main === module) console.log(verifierTitres(path.resolve(__dirname, '..')) + ' pages : un H1 visible chacune.');
module.exports = { verifierTitres };
