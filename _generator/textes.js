/**
 * Les textes pilotés par WordPress, rendus par le front.
 *
 * WordPress décide QUOI afficher, le front décide COMMENT. Un champ ne porte
 * donc jamais de HTML, de classe ou de mise en page : c'est du texte, avec au
 * plus trois marques de saisie, que seul ce fichier traduit en balises :
 *
 *   texte    texte brut, échappé
 *   riche    + **gras**, *italique*, `code` ; « Allure Design » et
 *            « Île-de-France » ne se coupent pas en fin de ligne
 *   lien     + [libellé] : le lien, dont l'ADRESSE est fixée par le gabarit
 *   lignes   une entrée par ligne (listes)
 *
 * Le schéma de chaque champ (type, longueur, valeur par défaut) est déclaré
 * avec la page qu'il alimente (content-pages.js, content-site.js) : c'est ce
 * schéma que WordPress reçoit à l'import et qu'il affiche comme formulaire.
 */

/** Échappe un nœud de texte. L'apostrophe et les guillemets n'en ont pas besoin. */
const texte = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Échappe une valeur d'attribut. */
const attribut = (s) => texte(s).replace(/"/g, '&quot;');

function riche(s) {
  return texte(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/Allure Design/g, 'Allure&nbsp;Design')
    .replace(/Île-de-France/g, '<span class="u-nowrap">Île-de-France</span>');
}

/** Le premier [libellé] devient un lien vers `href`, choisi par le gabarit. */
const lien = (s, href) => texte(s).replace(/\[([^\]]+)\]/, (_, l) => `<a href="${attribut(href)}">${l}</a>`);

const lignes = (s) => String(s == null ? '' : s).split('\n').map((l) => l.trim()).filter(Boolean);

/** Les valeurs par défaut d'un schéma. */
const defauts = (schema) => Object.fromEntries(schema.map((c) => [c.cle, c.defaut]));

/** Le nom d'hôte affichable d'une URL (« premibel.fr »). */
const hote = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

module.exports = { texte, attribut, riche, lien, lignes, defauts, hote };
