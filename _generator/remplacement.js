const fs = require('fs');

const PASSAGERES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const DELAIS_MS = [10, 20, 40, 80, 160, 250, 400, 500, 500, 500];


const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);



function remplacer(tmp, cible, renommer = fs.renameSync) {
  for (let essai = 0; ; essai++) {
    try {
      renommer(tmp, cible);
      return essai;
    } catch (e) {
      if (!PASSAGERES.has(e && e.code) || essai >= DELAIS_MS.length) {
        fs.rmSync(tmp, { force: true });
        throw e;
      }
      pause(DELAIS_MS[essai]);
    }
  }
}


function ecrireAtomique(fichier, contenu) {
  const tmp = `${fichier}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contenu);
  return remplacer(tmp, fichier);
}

module.exports = { remplacer, ecrireAtomique, DELAIS_MS, PASSAGERES };
