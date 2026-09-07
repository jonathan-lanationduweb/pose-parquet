/**
 * Fins de ligne, types de fichiers, empreintes : la source de vérité unique.
 *
 * Le problème que ce module résout est concret et a été mesuré sur ce dépôt.
 * `core.autocrlf` vaut `true` au niveau système sur cette machine (le réglage
 * par défaut de Git for Windows) : les fichiers texte arrivent donc en CRLF
 * dans la copie de travail, alors qu'ils sont stockés en LF dans les objets
 * Git. Le générateur, lui, lisait ces copies de travail telles quelles et
 * hachait leur contenu. Conséquence : l'empreinte d'un asset dépendait du
 * système de la personne qui construisait, pas du contenu.
 *
 * La preuve relevée avant correction : `css/studio-app.css` était en CRLF dans
 * cette copie de travail et les cinq autres feuilles du Visualiseur en LF ; le
 * bundle produit, `assets/dist/studio.<empreinte>.css`, était donc à fins de
 * ligne MIXTES, et son nom ne pouvait pas être reproduit ailleurs. Le même
 * commit construit sous Linux donnait un autre nom de fichier.
 *
 * Deux décisions, complémentaires :
 *
 *   1. `.gitattributes` fixe LF comme forme canonique, y compris dans la copie
 *      de travail (`eol=lf`), ce qui neutralise `core.autocrlf` ;
 *   2. le générateur normalise malgré tout à la lecture et à l'écriture — ce
 *      module. La ceinture et les bretelles, parce qu'une copie de travail
 *      créée avant l'ajout de `.gitattributes`, un éditeur mal réglé ou une
 *      archive téléchargée peuvent encore présenter du CRLF, et parce qu'une
 *      empreinte doit dépendre du contenu, jamais de l'histoire du disque.
 *
 * Ce qui n'est PAS fait ici : réécrire les sources pour calculer une
 * empreinte. La normalisation vit en mémoire, le temps du calcul. Les fichiers
 * du dépôt ne sont pas touchés par le hachage.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Extensions considérées comme du texte.
 *
 * Cette liste est le pendant de `.gitattributes` : les deux doivent rester
 * d'accord, et c'est pourquoi elles sont documentées l'une par l'autre. Si une
 * extension apparaît dans le projet, elle se déclare aux DEUX endroits — un
 * fichier normalisé par Git mais haché brut par le générateur, ou l'inverse,
 * ramènerait exactement le défaut qu'on corrige.
 *
 * En cas de doute, ne pas ajouter : un fichier inconnu est traité comme
 * binaire, donc haché octet pour octet. C'est le choix sûr — hacher un binaire
 * comme du texte le corrompt, hacher du texte comme un binaire ne fait que
 * perdre l'insensibilité aux fins de ligne.
 */
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

/** Fichiers texte que leur nom seul identifie, sans extension utile. */
const NOMS_TEXTE = new Set(['.gitattributes', '.gitignore', '.nojekyll', 'LICENSE']);

/**
 * Extensions explicitement binaires.
 *
 * Redondante avec la règle « inconnu = binaire », et gardée quand même : elle
 * rend le classement lisible et permet de repérer une extension oubliée dans
 * `EXTENSIONS_TEXTE` autrement que par accident.
 */
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

/** Vrai si ce chemin désigne un fichier texte au sens de ce module. */
function estTexte(chemin) {
  const nom = path.basename(chemin);
  if (NOMS_TEXTE.has(nom)) return true;
  return EXTENSIONS_TEXTE.has(path.extname(nom).toLowerCase());
}

/** Vrai si ce chemin désigne un binaire connu (informatif, voir estTexte). */
function estBinaire(chemin) {
  return EXTENSIONS_BINAIRES.has(path.extname(chemin).toLowerCase());
}

/**
 * Fins de ligne ramenées à LF.
 *
 * Les trois formes historiques sont traitées : CRLF (Windows), CR isolé
 * (Mac OS 9 et quelques exports), LF (tout le reste). L'ordre des
 * remplacements compte — si l'on traitait `\r` avant `\r\n`, un CRLF
 * deviendrait deux fins de ligne.
 *
 * @param {string} texte
 * @returns {string}
 */
function enLf(texte) {
  return texte.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Décode un tampon en UTF-8 en refusant de le faire à moitié.
 *
 * Node remplace silencieusement les séquences invalides par U+FFFD. Un fichier
 * en Latin-1 passerait donc sans bruit, et son contenu serait abîmé. On
 * vérifie que le décodage est réversible : sinon on lève, parce qu'un projet
 * dont l'encodage est incertain se répare à la main, pas dans un hachage.
 *
 * @param {Buffer} tampon
 * @param {string} chemin  pour le message d'erreur
 * @returns {string}
 */
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

/**
 * Lit un fichier sous sa forme canonique.
 *
 * Texte  → chaîne en LF, encodage vérifié.
 * Binaire → tampon d'octets, intact.
 *
 * @param {string} chemin
 * @returns {string|Buffer}
 */
function lireCanonique(chemin) {
  const tampon = fs.readFileSync(chemin);
  return estTexte(chemin) ? enLf(decoderUtf8(tampon, chemin)) : tampon;
}

/** Lit un fichier texte en LF (échoue si le chemin n'est pas du texte). */
function lireTexte(chemin) {
  if (!estTexte(chemin)) throw new Error(`${chemin} n'est pas un fichier texte connu`);
  return enLf(decoderUtf8(fs.readFileSync(chemin), chemin));
}

/**
 * Empreinte d'un contenu : dix caractères hexadécimaux de SHA-1.
 *
 * Une chaîne est normalisée avant hachage — c'est tout l'intérêt. Un tampon
 * est haché tel quel : c'est un binaire, ses octets sont son contenu, et le
 * convertir en texte le détruirait. Le module a d'ailleurs corrigé exactement
 * cette faute : l'empreinte des icônes passait par `[...tampons].join('')`,
 * qui décode chaque PNG en UTF-8 ; un fichier de 1442 octets devenait 2545
 * octets de caractères de remplacement, et deux images distinctes pouvaient
 * se réduire à la même bouillie.
 *
 * Dix caractères, soit 40 bits : c'est un cache-buster, pas une signature.
 *
 * @param {string|Buffer} contenu
 * @returns {string}
 */
function empreinte(contenu) {
  const donnees = typeof contenu === 'string' ? Buffer.from(enLf(contenu), 'utf8') : contenu;
  return crypto.createHash('sha1').update(donnees).digest('hex').slice(0, 10);
}

/**
 * Empreinte d'un ensemble de fichiers, chacun selon son type.
 *
 * On hache d'abord chaque fichier séparément, puis la liste des condensats
 * accompagnés des chemins. Deux raisons : un mélange de texte et de binaire
 * (le dossier des icônes contient des PNG et des SVG) ne peut pas être
 * concaténé sans choisir un traitement pour tout le monde ; et inclure le
 * chemin fait qu'un simple renommage change l'empreinte, ce qui est le
 * comportement attendu d'un cache-buster.
 *
 * Les chemins sont notés avec des `/` : sinon l'empreinte dépendrait du
 * séparateur du système, ce qui serait remplacer un défaut de reproductibilité
 * par un autre.
 *
 * @param {string[]} chemins
 * @param {string}   racine  pour des chemins relatifs stables
 * @returns {string}
 */
function empreinteDeFichiers(chemins, racine) {
  const lignes = [...chemins].sort().map((chemin) => {
    const relatif = path.relative(racine, chemin).split(path.sep).join('/');
    return `${relatif} ${empreinte(lireCanonique(chemin))}`;
  });
  return empreinte(lignes.join('\n'));
}

/**
 * Écrit un fichier texte en LF, en créant son dossier au besoin.
 *
 * Toutes les sorties du générateur passent par ici. Sans cela, le HTML
 * hériterait des fins de ligne des gabarits — qui sont des littéraux dans les
 * fichiers de `_generator/`, donc eux aussi soumis au hasard du checkout — et
 * le site produit serait différent d'une machine à l'autre alors même que les
 * empreintes seraient devenues stables.
 *
 * Écrire en LF a un second effet, très visible au quotidien : `git status`
 * redevient franchement propre. Avec `core.autocrlf=true`, Git attend du CRLF
 * dans la copie de travail ; un fichier généré en LF lui paraît modifié en
 * permanence, même à contenu identique. `.gitattributes` aligne son attente
 * sur LF, et ce module aligne la sortie du générateur sur la même forme.
 *
 * @param {string} chemin
 * @param {string} contenu
 */
function ecrireTexte(chemin, contenu) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, enLf(contenu), 'utf8');
}

/**
 * Copie un fichier en le rendant canonique s'il s'agit de texte.
 *
 * Utilisée pour l'arbre JS recopié dans `assets/dist/` : une copie octet pour
 * octet y ramènerait le CRLF de la copie de travail, et le fichier publié ne
 * correspondrait plus au contenu qui a servi à calculer son empreinte.
 *
 * @param {string} source
 * @param {string} destination
 */
function copierCanonique(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (estTexte(source)) fs.writeFileSync(destination, lireTexte(source), 'utf8');
  else fs.copyFileSync(source, destination);
}

module.exports = {
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
