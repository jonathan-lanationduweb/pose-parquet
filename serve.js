const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv.find((a) => /^\d+$/.test(a))) || 5180;
const RESEAU = process.argv.includes('--reseau');
const HOTE = RESEAU ? '0.0.0.0' : '127.0.0.1';


const depuisCePoste = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);



const hoteAccepte = (req) => {
  const hote = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  return hote === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.includes(':');
};


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



const DEPOT_TYPES = new Set(['.jpg', '.jpeg', '.webp', '.png']);
const DEPOT_MAX = 15 * 1024 * 1024;
function depot(req, res, url) {

  if (!depuisCePoste(req)) return send(res, 403, 'Dépôt réservé au poste local', TYPES['.txt']);
  const cible = path.join(ROOT, url.replace(/^\/__depot\//, 'assets/images/'));
  const dossier = path.join(ROOT, 'assets', 'images');

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
