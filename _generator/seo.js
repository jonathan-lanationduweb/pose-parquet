const metadonnees = require('./seo-meta.json');
const { cheminPublic } = require('./routes');

function optimiser(page) {
  const donnees = metadonnees[cheminPublic(page.path)];
  if (!donnees) return page;
  return { ...page, title: donnees.title, description: donnees.description, ogTitle: donnees.title };
}

module.exports = { optimiser, metadonnees };
