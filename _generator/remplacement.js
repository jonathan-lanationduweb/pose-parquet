/**
 * Remplacer un fichier par un autre, atomiquement, malgré Windows.
 *
 * Le fichier d'état de la publication (publication-etat.json) est écrit dans
 * un fichier temporaire puis renommé par-dessus l'ancien : un lecteur voit
 * l'ancien état ou le nouveau, jamais un JSON à moitié écrit.
 *
 * Sous Windows, ce renommage échoue (EPERM, EBUSY, EACCES) si le fichier est
 * ouvert au même instant : WordPress relit l'état toutes les trois secondes
 * pendant une publication, et PHP ouvre ses fichiers sans autoriser leur
 * remplacement. L'échec est passager — la lecture dure quelques
 * millisecondes. Le 07/10/2026, il a interrompu une publication : l'état est
 * resté « export » jusqu'au garde-fou des dix minutes.
 *
 * Ici : quelques tentatives courtes, à délai croissant (≈ 2,5 s au plus),
 * jamais de boucle infinie. Si le fichier reste indisponible, le temporaire
 * est retiré et l'erreur remonte : le mécanisme d'échec existant prend le
 * relais (catch de publier.js, puis garde-fou de WordPress).
 */
const fs = require('fs');

const PASSAGERES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const DELAIS_MS = [10, 20, 40, 80, 160, 250, 400, 500, 500, 500];

/** Pause synchrone (le script de publication est séquentiel). */
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Renomme `tmp` en `cible`. Renvoie le nombre de nouvelles tentatives qu'il a
 * fallu (0 le plus souvent).
 */
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

/** Écrit `contenu` dans `fichier` via un temporaire propre à ce processus. */
function ecrireAtomique(fichier, contenu) {
  const tmp = `${fichier}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contenu);
  return remplacer(tmp, fichier);
}

module.exports = { remplacer, ecrireAtomique, DELAIS_MS, PASSAGERES };
