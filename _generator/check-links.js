/**
 * Contrôle des liens et des références internes du site généré.
 *
 * Parcourt toutes les pages HTML publiques et vérifie que chaque `href`,
 * `src`, `srcset` et `poster` interne pointe sur un fichier qui existe. Les
 * ancres (`#id`) sont vérifiées contre les `id` de la page cible.
 *
 * Ce n'est pas un test de rendu : un lien peut exister et mener au mauvais
 * endroit. La validation finale se fait dans le navigateur ; ce script sert à
 * ce que le navigateur n'ait pas à trouver les 404 tout seul.
 *
 *   node _generator/check-links.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IGNORER = ['_calibrage', '_site', 'node_modules', 'assets', '_generator', '.git', 'components', 'design', 'backend'];

function pages(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORER.includes(e.name)) continue;
      pages(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const idsDe = new Map();
function ids(file) {
  if (!idsDe.has(file)) {
    const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    idsDe.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsDe.get(file);
}

const problemes = [];
const externes = new Set();
let total = 0;

for (const page of pages()) {
  const html = fs.readFileSync(page, 'utf8');
  const dir = path.dirname(page);
  const refs = [];
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]*)"/g)) refs.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) {
    m[1].split(',').forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
  }
  for (const ref of refs) {
    if (!ref || ref.startsWith('data:') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('javascript:')) continue;
    if (/^https?:\/\//.test(ref)) { externes.add(ref); continue; }
    total += 1;
    const [chemin, ancre] = ref.split('#');
    const sansQuery = chemin.split('?')[0];
    let cible;
    if (sansQuery === '') cible = page;
    else if (sansQuery.startsWith('/')) cible = path.join(ROOT, sansQuery);
    else cible = path.resolve(dir, sansQuery);
    if (fs.existsSync(cible) && fs.statSync(cible).isDirectory()) cible = path.join(cible, 'index.html');
    const rel = path.relative(ROOT, page).split(path.sep).join('/');
    if (!fs.existsSync(cible)) {
      problemes.push(`${rel} → ${ref} : FICHIER ABSENT`);
      continue;
    }
    // `#motif=baton-rompu` n'est pas une ancre : c'est un paramètre lu par
    // `floor-visualizer.js` (URLSearchParams sur location.hash). On ne le
    // vérifie pas contre les id de la page.
    if (ancre && !ancre.includes('=') && cible.endsWith('.html') && !ids(cible).has(ancre)) {
      problemes.push(`${rel} → ${ref} : ANCRE #${ancre} INTROUVABLE`);
    }
  }
}

console.log(`${total} références internes contrôlées, ${externes.size} URL externes distinctes.`);
if (problemes.length) {
  console.log(`\n${problemes.length} problème(s) :`);
  problemes.forEach((p) => console.log('  - ' + p));
} else {
  console.log('Aucun lien interne cassé.');
}
console.log('\nExternes :');
[...externes].sort().forEach((u) => console.log('  ' + u));
process.exitCode = problemes.length ? 1 : 0;
