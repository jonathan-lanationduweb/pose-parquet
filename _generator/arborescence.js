const DOSSIERS_OUTILS = new Set(['node_modules', '_generator', '_calibrage', '_site']);



function horsSite(nom) {
  return nom.startsWith('.') || DOSSIERS_OUTILS.has(nom);
}



function exclusions(enPlus = []) {
  const propres = new Set(enPlus);
  return (nom) => horsSite(nom) || propres.has(nom);
}

module.exports = { DOSSIERS_OUTILS, horsSite, exclusions };
