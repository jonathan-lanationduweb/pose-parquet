/**
 * Serveur statique minimal (Node, sans dépendance) pour développer en local.
 *
 *   node serve.js                  -> http://localhost:5180 (ce PC seulement)
 *   node serve.js 8080             -> http://localhost:8080
 *   node serve.js 8123 --reseau    -> aussi joignable depuis le réseau local
 *                                     (pour tester sur un téléphone)
 *
 * Par défaut, le serveur n'écoute que sur ce PC : sur un Wi-Fi partagé, tout
 * appareil du réseau pouvait lire le dépôt (y compris .git et backend/) et
 * déposer des fichiers. `--reseau` l'ouvre au réseau local, en lecture seule :
 * le dépôt de fichiers reste réservé à ce PC.
 *
 * Nécessaire car le site utilise des modules ES : le protocole file://
 * bloque leur chargement.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv.find((a) => /^\d+$/.test(a))) || 5180;
const RESEAU = process.argv.includes('--reseau');
const HOTE = RESEAU ? '0.0.0.0' : '127.0.0.1';

/** La requête vient-elle de ce PC ? */
const depuisCePoste = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

/*
 * En-tête Host : « localhost » ou une adresse IP, jamais un nom de domaine.
 * Une page piégée peut faire pointer un nom qu'elle contrôle vers 127.0.0.1
 * (« DNS rebinding ») et lire ce serveur avec le navigateur du développeur :
 * le nom de domaine dans Host la trahit.
 */
const hoteAccepte = (req) => {
  const hote = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  return hote === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.includes(':');
};

/** Jamais servi, même en local : l'historique git, le backend, les fichiers cachés. */
const INTERDIT = /(^|\/)(\.[^/]*|backend|node_modules)(\/|$)/i;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

const send = (res, status, body, type) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
};

/**
 * Dépôt d'un fichier produit par le navigateur, réservé au développement.
 *
 * Certains visuels du site sont **calculés par le moteur du visualiseur** :
 * un parquet posé en diagonale, par exemple, ne se trouve pas en photothèque.
 * Le rendu se fait donc dans un canvas, et il faut un moyen d'en récupérer les
 * octets. Sans cela, il fallait faire passer un JPEG en base64 à travers la
 * console, ce qui est absurde.
 *
 * Cette route n'existe que dans `serve.js`, qui n'est pas déployé : GitHub
 * Pages ne sert que des fichiers statiques. Elle refuse tout ce qui sort
 * d'`assets/images/`.
 */
const DEPOT_TYPES = new Set(['.jpg', '.jpeg', '.webp', '.png']);
const DEPOT_MAX = 15 * 1024 * 1024;
function depot(req, res, url) {
  // Réservé à ce PC, même quand le serveur est ouvert au réseau.
  if (!depuisCePoste(req)) return send(res, 403, 'Dépôt réservé au poste local', TYPES['.txt']);
  const cible = path.join(ROOT, url.replace(/^\/__depot\//, 'assets/images/'));
  const dossier = path.join(ROOT, 'assets', 'images');
  // `dossier + séparateur` : sans lui, « assets/images-x/ » passait le contrôle.
  if (!cible.startsWith(dossier + path.sep)) return send(res, 403, 'Hors assets/images', TYPES['.txt']);
  if (!DEPOT_TYPES.has(path.extname(cible).toLowerCase())) return send(res, 415, 'Images seulement (jpg, webp, png)', TYPES['.txt']);
  const morceaux = [];
  let taille = 0;
  req.on('data', (c) => {
    taille += c.length;
    if (taille > DEPOT_MAX) { send(res, 413, 'Fichier trop lourd', TYPES['.txt']); req.destroy(); return; }
    morceaux.push(c);
  });
  req.on('end', () => {
    if (taille > DEPOT_MAX) return;
    fs.writeFileSync(cible, Buffer.concat(morceaux));
    console.log(`déposé : ${path.relative(ROOT, cible)} (${taille} octets)`);
    send(res, 200, 'ok', TYPES['.txt']);
  });
}

/**
 * Maintenance, comme un vrai serveur la servirait.
 *
 * Quand WordPress l'a activée (assets/maintenance.json, écrit par le build),
 * toute page HTML répond **503 Service Unavailable** avec `Retry-After`, et le
 * corps de maintenance.html. Les fichiers (CSS, JS, images, polices) passent :
 * la page de maintenance en a besoin. Aperçu du vrai site : `?apercu=1`, qui
 * pose le cookie `pp_apercu`. C'est la règle à reproduire sur l'hébergement
 * définitif (voir docs/backend/wordpress-contenus.md) ; GitHub Pages ne sait
 * pas renvoyer de 503.
 */
function maintenance(req, res, url) {
  let actif = false;
  try {
    actif = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'maintenance.json'), 'utf8')).actif === true;
  } catch {
    return false;
  }
  if (!actif) return false;
  const page = url.endsWith('/') || url.endsWith('.html');
  if (!page || url === '/maintenance.html') return false;
  if (/[?&]apercu=1(&|$)/.test(req.url)) {
    res.setHeader('Set-Cookie', 'pp_apercu=1; Path=/; SameSite=Lax');
    return false;
  }
  if (/(^|;\s*)pp_apercu=1/.test(req.headers.cookie || '')) return false;
  const corps = fs.readFileSync(path.join(ROOT, 'maintenance.html'));
  res.writeHead(503, { 'Content-Type': TYPES['.html'], 'Retry-After': '3600', 'Cache-Control': 'no-store' });
  res.end(corps);
  return true;
}

http
  .createServer((req, res) => {
    if (!hoteAccepte(req)) return send(res, 421, 'Hôte refusé', TYPES['.txt']);
    let url;
    try {
      url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    } catch {
      // Un « % » malformé faisait tomber tout le serveur.
      return send(res, 400, 'Adresse invalide', TYPES['.txt']);
    }
    if (req.method === 'PUT' && url.startsWith('/__depot/')) return depot(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Méthode refusée', TYPES['.txt']);
    if (INTERDIT.test(url)) return send(res, 404, 'Introuvable', TYPES['.txt']);
    if (maintenance(req, res, url)) return undefined;
    let filePath = path.join(ROOT, url);

    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return send(res, 403, 'Interdit', TYPES['.txt']);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        const notFound = path.join(ROOT, '404.html');
        if (fs.existsSync(notFound)) {
          return send(res, 404, fs.readFileSync(notFound), TYPES['.html']);
        }
        return send(res, 404, 'Introuvable', TYPES['.txt']);
      }
      send(res, 200, data, TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    });
  })
  .listen(PORT, HOTE, () => {
    console.log(`pose-parquet.com -> http://localhost:${PORT}${RESEAU ? ' (ouvert au réseau local, lecture seule)' : ''}`);
  });
