/**
 * Publier ce qui a été saisi dans WordPress, en une commande :
 *
 *   node _generator/contenus.js [url de l'export]      (commande unique)
 *
 *   1. récupère l'export WordPress (contenus, pages, Mon site, maintenance)
 *      et les images nouvelles ;
 *   2. le valide — une erreur structurante arrête tout ici, l'instantané et le
 *      site restent ceux d'avant ; les avertissements s'affichent ;
 *   3. construit le site.
 *
 * Les commandes unitaires restent : `node _generator/wordpress.js pull`, puis
 * `node _generator/build.js`.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { tirer } = require('./wordpress');

(async () => {
  console.log('1/3 · Récupération et 2/3 · validation de l’export WordPress…');
  try {
    await tirer(process.argv[2]);
  } catch (e) {
    console.error(e.message);
    console.error('Arrêt : le site n’a pas été reconstruit.');
    process.exit(1);
  }
  console.log('3/3 · Construction du site…');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  process.exit(r.status === null ? 1 : r.status);
})();
