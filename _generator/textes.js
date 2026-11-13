const texte = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);


const attribut = (s) => texte(s).replace(/"/g, '&quot;');

function riche(s) {
  return texte(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/Allure Design/g, 'Allure&nbsp;Design')
    .replace(/Île-de-France/g, '<span class="u-nowrap">Île-de-France</span>');
}


const lien = (s, href) => texte(s).replace(/\[([^\]]+)\]/, (_, l) => `<a href="${attribut(href)}">${l}</a>`);

const lignes = (s) => String(s == null ? '' : s).split('\n').map((l) => l.trim()).filter(Boolean);


const defauts = (schema) => Object.fromEntries(schema.map((c) => [c.cle, c.defaut]));


const hote = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

module.exports = { texte, attribut, riche, lien, lignes, defauts, hote };
