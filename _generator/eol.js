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

/* ------------------------------------------------------------------ */
/* Écriture : atomique, et patiente avec Windows                       */
/* ------------------------------------------------------------------ */

/*
 * -----------------------------------------------------------------------------
 * LE DÉFAUT MESURÉ
 * -----------------------------------------------------------------------------
 *
 * Sur 25 constructions consécutives, 4 échouaient. Toujours de la même façon :
 *
 *   Error: UNKNOWN: unknown error, open '…\index.html'
 *   code=UNKNOWN  syscall=open  errno=-4094
 *   at ecrireTexte (_generator/eol.js:234)
 *
 * Toujours `open`, jamais `write` ni `rename`. Toujours un fichier qui venait
 * d'être réécrit par la construction précédente. Le fichier existe, il est
 * accessible en écriture, et la construction suivante passe.
 *
 * `errno -4094` est `UV_UNKNOWN` : le code Win32 reçu n'a pas d'équivalent
 * POSIX que libuv sache traduire. C'est la signature d'un tiers qui tient le
 * fichier ouvert avec un mode de partage qui refuse l'écriture — antivirus,
 * indexeur, gestionnaire d'aperçu, observateur de fichiers. On ne saura pas
 * lequel, et ce n'est pas nécessaire : ce qu'on peut faire, c'est ne pas lui
 * offrir de fenêtre, et ne pas abandonner au premier refus.
 *
 * -----------------------------------------------------------------------------
 * DEUX MESURES, ET POURQUOI LES DEUX
 * -----------------------------------------------------------------------------
 *
 * 1. ÉCRITURE ATOMIQUE. `writeFileSync` ouvre la destination en troncature et
 *    la garde ouverte pendant toute l'écriture. Pour une page de 40 Ko, cette
 *    fenêtre dure le temps de plusieurs appels système, et le fichier y est
 *    visible dans un état partiel. On écrit désormais à côté, sous un nom
 *    temporaire que personne ne surveille, puis on renomme. La destination
 *    n'est plus touchée qu'un instant, et jamais laissée à moitié écrite.
 *
 * 2. REPRISE CIBLÉE. Le renommage peut à son tour buter sur un verrou. Trois
 *    reprises, 25 ms, 75 ms, 150 ms, et seulement sur des codes qui décrivent
 *    un état transitoire. Un ENOENT, un JSON invalide, un droit refusé pour de
 *    bon : on les laisse passer tels quels. Masquer une vraie erreur pour
 *    rendre un contrôle vert serait échanger un défaut visible contre un
 *    défaut invisible.
 */

/**
 * Les codes qu'on accepte de réessayer, et eux seuls.
 *
 *   UNKNOWN  celui qu'on a mesuré ici
 *   EBUSY    le fichier est utilisé par un autre processus
 *   EPERM    Windows rend cela pour un partage refusé, pas seulement pour un droit
 *   EACCES   même famille, selon la version de Windows et le pilote en cause
 *
 * Tout le reste remonte immédiatement. En particulier ENOENT — un dossier
 * absent est un défaut de génération, pas un verrou, et attendre 250 ms
 * n'arrangerait rien tout en brouillant le diagnostic.
 */
const CODES_TRANSITOIRES = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);

/** Attentes entre deux tentatives, en millisecondes. Bornées, et courtes. */
const ATTENTES_MS = [25, 75, 150];

/**
 * Pause bloquante dans du code synchrone.
 *
 * `Atomics.wait` sur un tampon que personne ne réveille : c'est la seule
 * façon d'attendre sans boucle d'attente active depuis une fonction
 * synchrone. Une boucle sur `Date.now()` occuperait un cœur à ne rien faire,
 * et surtout empêcherait le système de rendre la main au processus qui tient
 * le fichier — soit exactement le contraire de ce qu'on veut.
 */
function patienter(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Exécute une opération de fichier en réessayant les verrous transitoires.
 *
 * @param {() => any} operation
 * @param {string} quoi description courte, pour le message si tout échoue
 */
function avecReprises(operation, quoi) {
  for (let essai = 0; ; essai += 1) {
    try {
      return operation();
    } catch (erreur) {
      const transitoire = Boolean(erreur) && CODES_TRANSITOIRES.has(erreur.code);
      if (!transitoire || essai >= ATTENTES_MS.length) {
        if (transitoire) {
          // On le dit : l'échec n'est pas une première tentative malheureuse.
          erreur.message += ` — ${quoi} : abandon après ${ATTENTES_MS.length + 1} tentatives`
            + ` (${ATTENTES_MS.join(' ms, ')} ms d'attente). Un autre programme tient ce fichier.`;
        }
        throw erreur;
      }
      patienter(ATTENTES_MS[essai]);
    }
  }
}

/** Compteur de noms temporaires : deux écritures du même processus ne se croisent pas. */
let compteurTemporaire = 0;

/**
 * Nom du fichier temporaire, DANS LE DOSSIER DE LA DESTINATION.
 *
 * Même dossier, donc même volume : un renommage entre volumes n'est pas
 * atomique et se dégrade en copie. Le nom est construit pour être invisible :
 *
 *   point initial     les parcours du générateur écartent les noms en point
 *   suffixe .tmp      les contrôles ne collectent que les `.html`
 *   pid + compteur    deux constructions simultanées ne se marchent pas dessus
 *
 * `.index.html.12345.7.tmp` ne peut être confondu avec une page publique, ni
 * par un humain, ni par `check-links`, ni par le déploiement.
 */
function cheminTemporaire(destination) {
  compteurTemporaire += 1;
  const dossier = path.dirname(destination);
  const nom = path.basename(destination);
  return path.join(dossier, `.${nom}.${process.pid}.${compteurTemporaire}.tmp`);
}

/**
 * Écrit un fichier de façon atomique : temporaire, puis renommage.
 *
 * Après un échec définitif, le temporaire est retiré — au mieux. Si sa
 * suppression échoue elle aussi, on n'en fait pas une seconde erreur : celle
 * qui compte est la première, et un `.tmp` orphelin n'est ni publié ni
 * versionné.
 *
 * @param {string} destination
 * @param {string|Buffer} donnees
 */
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
      /* Le temporaire reste : invisible des contrôles et du déploiement. */
    }
    throw erreur;
  }
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
  ecrireAtomique(chemin, Buffer.from(enLf(contenu), 'utf8'));
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
  /*
   * Le binaire passe aussi par l'écriture atomique, plutôt que par
   * `copyFileSync`. Une copie ouvre la destination exactement comme une
   * écriture, et rien ne justifie de protéger les pages sans protéger les
   * images et les polices recopiées dans `assets/dist/`.
   */
  const donnees = estTexte(source)
    ? Buffer.from(lireTexte(source), 'utf8')
    : avecReprises(() => fs.readFileSync(source), `lecture de ${path.basename(source)}`);
  ecrireAtomique(destination, donnees);
}

module.exports = {
  ecrireAtomique,
  /* Exposés pour `check-reproducible` : une reprise jamais éprouvée ne vaut rien. */
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
