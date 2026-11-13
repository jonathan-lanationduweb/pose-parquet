const path = require('path').posix;

const ORIGINE = 'https://pose-parquet.com';
const RUBRIQUES = new Set(['guides', 'motifs', 'tutoriels', 'blog', 'outils', 'inspiration', 'a-propos', 'projet', 'contact', 'mentions-legales', 'confidentialite', 'plan-du-site']);

function cheminPublic(chemin) {
  const p = chemin.replace(/^\//, '');
  if (p === 'index.html' || !p) return '/';
  if (!RUBRIQUES.has(p.split('/')[0])) return '/' + p;
  if (p.endsWith('/index.html')) return '/' + p.slice(0, -10);
  if (p.endsWith('.html') && !p.endsWith('/apercu.html')) return '/' + p.slice(0, -5) + '/';
  if (!p.endsWith('/') && !path.extname(p)) return '/' + p + '/';
  return '/' + p;
}

function fichierPublic(relatif) {
  const url = cheminPublic(relatif);
  return url.endsWith('/') ? url.slice(1) + 'index.html' : url.slice(1);
}

function absolue(valeur) {
  return String(valeur).replace(/https:\/\/pose-parquet\.com(?:\/[A-Za-z0-9_./-]*)?/g, brut => {
    const u = new URL(brut);
    return ORIGINE + cheminPublic(u.pathname);
  });
}

function reference(brut, source, destination = fichierPublic(source)) {
  if (!brut || /^(?:#|data:|mailto:|tel:|javascript:|blob:|\/\/)/i.test(brut) || brut.includes('%%')) return brut;
  if (/^https?:/i.test(brut)) return brut.startsWith(ORIGINE) ? absolue(brut) : brut;
  const u = new URL(brut.replace(/&amp;/g, '&'), ORIGINE + '/' + source);
  const cible = cheminPublic(u.pathname);
  let relative = path.relative(path.dirname('/' + destination), cible);
  if (cible.endsWith('/') && relative && !relative.endsWith('/')) relative += '/';
  if (!relative) relative = './';
  return relative + u.search.replace(/&/g, '&amp;') + u.hash;
}

function htmlPublic(source, html, destination = fichierPublic(source)) {
  const transformer = valeur => reference(valeur, source, destination);
  let out = html.replace(/\b(href|src|poster|action|data-base|data-logo)=("([^"]*)"|'([^']*)')/gi, (tout, attribut, cite, double, simple) => {
    const guillemet = cite[0];
    return attribut + '=' + guillemet + transformer(double ?? simple) + guillemet;
  });
  out = out.replace(/\bsrcset=("([^"]*)"|'([^']*)')/gi, (tout, cite, double, simple) => {
    const valeur = double ?? simple;
    if (valeur.trim().startsWith('data:')) return tout;
    return 'srcset=' + cite[0] + valeur.split(',').map(partie => partie.replace(/^(\s*)(\S+)/, (m, espaces, url) => espaces + transformer(url))).join(',') + cite[0];
  });
  out = out.replace(/\bstyle=("([^"]*)"|'([^']*)')/gi, (tout, cite) => {
    return 'style=' + cite[0] + cite.slice(1,-1).replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (m, q, url) => 'url(' + q + transformer(url) + q + ')') + cite[0];
  });
  return absolue(out);
}

function robot(page = 'index, follow') {
  return process.env.SITE_ENVIRONMENT === 'production' ? page : 'noindex, follow';
}

function donneesPubliques(valeur) {
  if (Array.isArray(valeur)) return valeur.map(donneesPubliques);
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([k,v]) => [k, donneesPubliques(v)]));
  if (typeof valeur !== 'string') return valeur;
  if (valeur.startsWith(ORIGINE)) return absolue(valeur);
  if (/^(?:guides|motifs|tutoriels|blog|outils)\/[^\s]+\.html(?:[?#].*)?$/.test(valeur)) {
    const u = new URL(valeur, ORIGINE + '/');
    return cheminPublic(u.pathname).slice(1) + u.search + u.hash;
  }
  return valeur;
}

module.exports = { ORIGINE, cheminPublic, fichierPublic, absolue, reference, htmlPublic, robot, donneesPubliques };
