'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const [type, argument] = process.argv.slice(2);
if (!['plugin', 'site'].includes(type) || !argument) {
  console.error('Usage : node backend/deploy/faire-paquet.js plugin|site <nouveau dossier>'); process.exit(2);
}
const destination = path.resolve(argument);
if (fs.existsSync(destination)) throw new Error('Le dossier cible existe déjà : utiliser un nouveau dossier, rien ne sera effacé.');
const manifeste = [];
const publicDirs = ['a-propos', 'blog', 'confidentialite', 'contact', 'guides', 'inspiration', 'mentions-legales', 'motifs', 'outils', 'plan-du-site', 'projet', 'tutoriels'];
const assetDirs = ['dist', 'fonts', 'icons', 'images', 'materials', 'textures', 'videos'];
const publicFiles = ['index.html', '404.html', 'maintenance.html', 'config.js', 'robots.txt', 'sitemap.xml', 'site.webmanifest'];
const dataFiles = ['catalogue-etat.json', 'contenus.json', 'material-profiles.json', 'parquets.json', 'products.premibel.json', 'render-families.json', 'room-tours.json'];

function copier(source, relatif) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Lien symbolique interdit : ${relatif}`);
  if (stat.isDirectory()) {
    for (const nom of fs.readdirSync(source).sort()) {
      if (nom.startsWith('.') || /\.(?:bak|log|sql|old|tmp|map)$/i.test(nom)) throw new Error(`Fichier inattendu : ${relatif}/${nom}`);
      copier(path.join(source, nom), `${relatif}/${nom}`);
    }
    return;
  }
  if (!stat.isFile()) throw new Error(`Type de fichier interdit : ${relatif}`);
  if (type === 'site' && /\.(?:php\d*|phtml|sh|ps1|exe|cmd|bat)$/i.test(relatif)) throw new Error(`Exécutable interdit dans le site : ${relatif}`);
  const cible = path.join(destination, relatif);
  fs.mkdirSync(path.dirname(cible), { recursive: true });
  fs.copyFileSync(source, cible);
  manifeste.push({ fichier: relatif, octets: stat.size, sha256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex') });
}


const sources = type === 'plugin'
  ? ['pose-parquet-core.php', 'uninstall.php', 'src', 'templates', 'assets'].map(n => [path.join(root, 'backend/pose-parquet-core', n), `pose-parquet-core/${n}`])
  : [...publicFiles.map(n => [path.join(root, n), n]), ...publicDirs.map(n => [path.join(root, n), n]),
    ...assetDirs.map(n => [path.join(root, 'assets', n), `assets/${n}`]),
    ...dataFiles.map(n => [path.join(root, 'data', n), `data/${n}`]),
    [path.join(root, 'data/scenes'), 'data/scenes'],
    [path.join(root, 'data/wordpress/contenus.json'), 'data/wordpress/contenus.json'],
    [path.join(root, 'assets/maintenance.json'), 'assets/maintenance.json']];
for (const [source] of sources) {
  const rel = path.relative(source, destination);
  if (!rel || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel))) throw new Error('Destination incluse dans un arbre source.');
  if (!fs.existsSync(source)) throw new Error(`Source obligatoire absente : ${path.relative(root, source)}`);
}
fs.mkdirSync(destination, { recursive: true });
for (const [source, relatif] of sources) copier(source, relatif);
if (type === 'site') {
  fs.writeFileSync(path.join(destination, '.nojekyll'), '');
  if (fs.existsSync(path.join(root, 'CNAME'))) copier(path.join(root, 'CNAME'), 'CNAME');
}

fs.writeFileSync(`${destination}.manifest.json`, JSON.stringify({ type, fichiers: manifeste }, null, 2) + '\n');
console.log(`${type} : ${manifeste.length} fichiers ; manifeste SHA-256 créé hors du paquet.`);
