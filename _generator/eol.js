const fs = require('fs');
const path = require('path');
const crypto = require('crypto');



const EXTENSIONS_TEXTE = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.webmanifest',
  '.xml',
  '.svg',
  '.md',
  '.txt',
  '.yml',
  '.yaml',
  '.php',
  '.sql',
]);


const NOMS_TEXTE = new Set(['.gitattributes', '.gitignore', '.nojekyll', 'LICENSE']);



const EXTENSIONS_BINAIRES = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.pdf',
  '.mp4',
  '.webm',
  '.zip',
]);


function estTexte(chemin) {
  const nom = path.basename(chemin);
  if (NOMS_TEXTE.has(nom)) return true;
  return EXTENSIONS_TEXTE.has(path.extname(nom).toLowerCase());
}


function estBinaire(chemin) {
  return EXTENSIONS_BINAIRES.has(path.extname(chemin).toLowerCase());
}



function enLf(texte) {
  return texte.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}



function decoderUtf8(tampon, chemin) {
  const texte = tampon.toString('utf8');
  if (!Buffer.from(texte, 'utf8').equals(tampon)) {
    throw new Error(
      `${chemin} n'est pas de l'UTF-8 valide : le projet est attendu en UTF-8. ` +
        'Convertir le fichier à la main plutôt que de laisser le générateur deviner.'
    );
  }
  return texte;
}



function lireCanonique(chemin) {
  const tampon = fs.readFileSync(chemin);
  return estTexte(chemin) ? enLf(decoderUtf8(tampon, chemin)) : tampon;
}


function lireTexte(chemin) {
  if (!estTexte(chemin)) throw new Error(`${chemin} n'est pas un fichier texte connu`);
  return enLf(decoderUtf8(fs.readFileSync(chemin), chemin));
}



function empreinte(contenu) {
  const donnees = typeof contenu === 'string' ? Buffer.from(enLf(contenu), 'utf8') : contenu;
  return crypto.createHash('sha1').update(donnees).digest('hex').slice(0, 10);
}



function empreinteDeFichiers(chemins, racine) {
  const lignes = [...chemins].sort().map((chemin) => {
    const relatif = path.relative(racine, chemin).split(path.sep).join('/');
    return `${relatif} ${empreinte(lireCanonique(chemin))}`;
  });
  return empreinte(lignes.join('\n'));
}










const CODES_TRANSITOIRES = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);


const ATTENTES_MS = [25, 75, 150];



function patienter(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}



function avecReprises(operation, quoi) {
  for (let essai = 0; ; essai += 1) {
    try {
      return operation();
    } catch (erreur) {
      const transitoire = Boolean(erreur) && CODES_TRANSITOIRES.has(erreur.code);
      if (!transitoire || essai >= ATTENTES_MS.length) {
        if (transitoire) {

          erreur.message += ` — ${quoi} : abandon après ${ATTENTES_MS.length + 1} tentatives`
            + ` (${ATTENTES_MS.join(' ms, ')} ms d'attente). Un autre programme tient ce fichier.`;
        }
        throw erreur;
      }
      patienter(ATTENTES_MS[essai]);
    }
  }
}


let compteurTemporaire = 0;



function cheminTemporaire(destination) {
  compteurTemporaire += 1;
  const dossier = path.dirname(destination);
  const nom = path.basename(destination);
  return path.join(dossier, `.${nom}.${process.pid}.${compteurTemporaire}.tmp`);
}



function ecrireAtomique(destination, donnees) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporaire = cheminTemporaire(destination);
  try {
    avecReprises(() => fs.writeFileSync(temporaire, donnees), `écriture de ${path.basename(destination)}`);
    avecReprises(() => fs.renameSync(temporaire, destination), `renommage vers ${path.basename(destination)}`);
  } catch (erreur) {
    try {
      fs.rmSync(temporaire, { force: true });
    } catch {

    }
    throw erreur;
  }
}



function ecrireTexte(chemin, contenu) {
  ecrireAtomique(chemin, Buffer.from(enLf(contenu), 'utf8'));
}



function copierCanonique(source, destination) {


  const donnees = estTexte(source)
    ? Buffer.from(lireTexte(source), 'utf8')
    : avecReprises(() => fs.readFileSync(source), `lecture de ${path.basename(source)}`);
  ecrireAtomique(destination, donnees);
}

module.exports = {
  ecrireAtomique,

  avecReprises,
  CODES_TRANSITOIRES,
  ATTENTES_MS,
  EXTENSIONS_TEXTE,
  EXTENSIONS_BINAIRES,
  NOMS_TEXTE,
  estTexte,
  estBinaire,
  enLf,
  decoderUtf8,
  lireCanonique,
  lireTexte,
  empreinte,
  empreinteDeFichiers,
  ecrireTexte,
  copierCanonique,
};
