'use strict';
const fs = require('node:fs');
const path = require('node:path');


function adresse(raw, nom) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.search || /[\s<>"'\\]/.test(raw)) {
    throw new Error(`${nom} : URL HTTPS publique sans identifiants, paramètres ni fragment attendue.`);
  }
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || !h.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) {
    throw new Error(`${nom} : utiliser un nom de domaine public, pas une adresse locale ou IP.`);
  }
  return u;
}

function configuration(env, root) {
  const environnement = env.SITE_ENVIRONMENT || 'staging';
  if (!['staging', 'production'].includes(environnement)) throw new Error('SITE_ENVIRONMENT : staging ou production attendu.');
  const api = env.API_BASE_URL || '';
  const source = env.WP_EXPORT_URL || '';
  if (api) {
    const u = adresse(api, 'API_BASE_URL');
    if (!u.pathname.replace(/\/$/, '').endsWith('/wp-json/pose-parquet/v1')) throw new Error('API_BASE_URL : racine REST pose-parquet/v1 attendue.');
  }
  if (source) {
    const u = adresse(source, 'WP_EXPORT_URL');
    if (!u.pathname.endsWith('/wp-json/pose-parquet/v1/contenus')) throw new Error('WP_EXPORT_URL : route contenus attendue.');
    if (api && new URL(api).origin !== u.origin) throw new Error('API et export doivent viser le même WordPress.');
  }
  if (environnement === 'production') {
    if (!source) throw new Error('Production : WP_EXPORT_URL obligatoire pour publier le contenu WordPress actuel.');
    const domaine = fs.existsSync(path.join(root, 'CNAME')) ? fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() : '';
    if (!['pose-parquet.com', 'www.pose-parquet.com'].includes(domaine)) throw new Error('Production : CNAME pose-parquet.com ou www.pose-parquet.com obligatoire.');
  }
  return { apiBaseUrl: api.replace(/\/$/, '') };
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const config = configuration(process.env, root);
    if (process.argv[2] !== '--verifier') {
      const dossier = path.resolve(process.argv[2] || path.join(root, '_site'));
      if (!fs.statSync(dossier).isDirectory()) throw new Error('Dossier artefact absent.');
      fs.writeFileSync(path.join(dossier, 'config.js'), `\nwindow.POSE_PARQUET_CONFIG = ${JSON.stringify(config)};\n`);
    }
    console.log('Configuration de déploiement validée.');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { configuration };
