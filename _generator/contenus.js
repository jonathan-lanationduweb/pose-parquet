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
