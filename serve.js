/**
 * Serveur statique minimal (Node, sans dépendance) pour développer en local.
 *
 *   node serve.js            -> http://localhost:5180
 *   node serve.js 8080       -> http://localhost:8080
 *
 * Nécessaire car le site utilise des modules ES : le protocole file://
 * bloque leur chargement.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 5180;

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

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let filePath = path.join(ROOT, url);

    if (!filePath.startsWith(ROOT)) return send(res, 403, 'Interdit', TYPES['.txt']);
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
  .listen(PORT, () => {
    console.log(`pose-parquet.com -> http://localhost:${PORT}`);
  });
