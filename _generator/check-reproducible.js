/**
 * Contrôle : le build est-il reproductible d'une machine à l'autre ?
 *
 * Le défaut corrigé était mesurable et mesuré : l'empreinte des assets portait
 * sur les copies de travail telles que le checkout les avait posées. Sur
 * Windows, `core.autocrlf=true` (le défaut de Git for Windows) les pose en
 * CRLF ; sous Linux elles sont en LF. Le même commit produisait donc des noms
 * de bundles différents, et `assets/dist/studio.<empreinte>.css` avait même des
 * fins de ligne mixtes, parce que `css/studio-app.css` était en CRLF et les
 * cinq autres feuilles du Visualiseur en LF.
 *
 * Ce script vérifie que ce ne peut plus arriver. Il ne remplace pas
 * `.gitattributes` : il vérifie que le générateur s'en passe. Les deux
 * ensemble font la reproductibilité — l'un empêche le CRLF d'arriver, l'autre
 * le rend sans conséquence s'il arrive quand même.
 *
 * Usage : node _generator/check-reproducible.js [--rapide]
 *   --rapide  saute la double construction complète (§11), qui prend ~20 s
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const eol = require('./eol');

const RACINE = path.resolve(__dirname, '..');
const RAPIDE = process.argv.includes('--rapide');

let reussis = 0;
const echecs = [];

function verifier(nom, condition, detail = '') {
  if (condition) {
    reussis += 1;
    console.log(`  OK   ${nom}`);
  } else {
    echecs.push(nom + (detail ? ` — ${detail}` : ''));
    console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`);
  }
}

function titre(texte) {
  console.log(`\n== ${texte} ==`);
}

/* ------------------------------------------------------------------ */
/* §9 — Unité : trois écritures d'un même contenu logique              */
/* ------------------------------------------------------------------ */

titre('Empreinte de texte : insensible aux fins de ligne');

const LF = 'a\nb\nc\n';
const CRLF = 'a\r\nb\r\nc\r\n';
const CR = 'a\rb\rc\r';

const hLF = eol.empreinte(LF);
const hCRLF = eol.empreinte(CRLF);
const hCR = eol.empreinte(CR);

verifier('LF = CRLF', hLF === hCRLF, `${hLF} vs ${hCRLF}`);
verifier('LF = CR isolé', hLF === hCR, `${hLF} vs ${hCR}`);
verifier(
  'un contenu réellement différent donne une autre empreinte',
  eol.empreinte('a\nb\nd\n') !== hLF
);

titre('Empreinte de binaire : octet pour octet, aucune transformation');

// Les mêmes octets que ci-dessus, mais présentés comme un binaire : ils
// DOIVENT se distinguer. Normaliser un binaire, c'est le corrompre.
const binLF = Buffer.from([0x61, 0x0a, 0x62]);
const binCRLF = Buffer.from([0x61, 0x0d, 0x0a, 0x62]);
verifier(
  'des octets différents donnent des empreintes différentes',
  eol.empreinte(binLF) !== eol.empreinte(binCRLF),
  `${eol.empreinte(binLF)} vs ${eol.empreinte(binCRLF)}`
);

// Un PNG réel : la faute historique était `[...tampons].join('')`, qui décode
// chaque image en UTF-8. On vérifie que l'empreinte porte bien sur les octets.
const png = path.join(RACINE, 'assets', 'icons', 'favicon-32.png');
if (fs.existsSync(png)) {
  const octets = fs.readFileSync(png);
  const viaTexte = Buffer.from([octets].join(''), 'utf8');
  verifier(
    'un PNG n’est pas décodé en UTF-8 (la faute corrigée)',
    !octets.equals(viaTexte) && eol.empreinte(octets) === eol.empreinte(fs.readFileSync(png)),
    `${octets.length} octets réels contre ${viaTexte.length} après décodage`
  );
  verifier('un PNG est classé binaire', !eol.estTexte(png));
}

/* ------------------------------------------------------------------ */
/* §10 — Fichiers réels du projet                                      */
/* ------------------------------------------------------------------ */

titre('Fichiers réels : LF et CRLF donnent la même empreinte');

const ECHANTILLONS = [
  ['CSS', path.join('css', 'main.css')],
  ['CSS du Visualiseur', path.join('css', 'studio-app.css')],
  ['JS', path.join('js', 'main.js')],
  ['JS du formulaire', path.join('components', 'project-form', 'project-form.js')],
  ['JSON', path.join('data', 'parquets.json')],
  ['SVG', path.join('assets', 'images', 'lumiere-avant.svg')],
  ['HTML', 'index.html'],
  ['XML', 'sitemap.xml'],
];

for (const [type, relatif] of ECHANTILLONS) {
  const chemin = path.join(RACINE, relatif);
  if (!fs.existsSync(chemin)) {
    verifier(`${type} (${relatif})`, false, 'fichier absent');
    continue;
  }
  const canonique = eol.lireTexte(chemin);
  const enCrlf = canonique.replace(/\n/g, '\r\n');
  const enCr = canonique.replace(/\n/g, '\r');
  const meme =
    eol.empreinte(canonique) === eol.empreinte(enCrlf) &&
    eol.empreinte(canonique) === eol.empreinte(enCr);
  verifier(`${type} : ${relatif}`, meme, eol.empreinte(canonique));
}

/* ------------------------------------------------------------------ */
/* Types : la liste du module et celle de .gitattributes s'accordent    */
/* ------------------------------------------------------------------ */

titre('Types : le module et .gitattributes disent la même chose');

const attributs = fs.readFileSync(path.join(RACINE, '.gitattributes'), 'utf8');
const declareesTexte = new Set(
  [...attributs.matchAll(/^\*(\.[a-z0-9]+)\s+text/gim)].map((m) => m[1].toLowerCase())
);
const declareesBinaires = new Set(
  [...attributs.matchAll(/^\*(\.[a-z0-9]+)\s+binary/gim)].map((m) => m[1].toLowerCase())
);

const manquantesDansGit = [...eol.EXTENSIONS_TEXTE].filter((e) => !declareesTexte.has(e));
const manquantesDansModule = [...declareesTexte].filter((e) => !eol.EXTENSIONS_TEXTE.has(e));
verifier(
  'toute extension texte du module est déclarée dans .gitattributes',
  manquantesDansGit.length === 0,
  manquantesDansGit.join(' ')
);
verifier(
  'toute extension texte de .gitattributes est connue du module',
  manquantesDansModule.length === 0,
  manquantesDansModule.join(' ')
);
const contradictions = [...declareesBinaires].filter((e) => eol.EXTENSIONS_TEXTE.has(e));
verifier(
  'aucune extension déclarée à la fois texte et binaire',
  contradictions.length === 0,
  contradictions.join(' ')
);

/* ------------------------------------------------------------------ */
/* Encodage — §7                                                       */
/* ------------------------------------------------------------------ */

titre('Encodage : tout le texte suivi est en UTF-8');

let suivis = [];
try {
  suivis = execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, maxBuffer: 1 << 28 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
} catch (erreur) {
  console.log('  (dépôt Git indisponible : contrôle d’encodage sauté)');
}

const nonUtf8 = [];
for (const relatif of suivis) {
  const chemin = path.join(RACINE, relatif);
  if (!eol.estTexte(chemin) || !fs.existsSync(chemin)) continue;
  try {
    eol.lireTexte(chemin);
  } catch (erreur) {
    nonUtf8.push(relatif);
  }
}
if (suivis.length) {
  verifier(
    `${suivis.filter((f) => eol.estTexte(f)).length} fichiers texte en UTF-8 valide`,
    nonUtf8.length === 0,
    nonUtf8.join(' ')
  );
}

/* ------------------------------------------------------------------ */
/* §12 — Simulation d'un checkout CRLF                                 */
/* ------------------------------------------------------------------ */

titre('Simulation : un checkout CRLF donne les mêmes noms d’assets');

/** Copie les sources nécessaires au calcul des assets, en forçant les EOL. */
function copierSources(destination, finDeLigne) {
  const dossiers = ['css', 'js', 'components', path.join('assets', 'icons')];
  for (const dossier of dossiers) {
    const source = path.join(RACINE, dossier);
    if (!fs.existsSync(source)) continue;
    const pile = [dossier];
    while (pile.length) {
      const relatif = pile.pop();
      const complet = path.join(RACINE, relatif);
      for (const entree of fs.readdirSync(complet, { withFileTypes: true })) {
        const relEnfant = path.join(relatif, entree.name);
        if (entree.isDirectory()) {
          pile.push(relEnfant);
          continue;
        }
        const cible = path.join(destination, relEnfant);
        fs.mkdirSync(path.dirname(cible), { recursive: true });
        if (eol.estTexte(relEnfant)) {
          const texte = eol.lireTexte(path.join(RACINE, relEnfant));
          fs.writeFileSync(cible, finDeLigne === 'crlf' ? texte.replace(/\n/g, '\r\n') : texte, 'utf8');
        } else {
          fs.copyFileSync(path.join(RACINE, relEnfant), cible);
        }
      }
    }
  }
}

const bacASable = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-eol-'));
const manifestes = {};
try {
  for (const forme of ['lf', 'crlf']) {
    const racine = path.join(bacASable, forme);
    fs.mkdirSync(racine, { recursive: true });
    copierSources(racine, forme);

    // Le module d'assets garde un manifeste global : on le recharge à neuf
    // pour chaque forme, sinon le second appel verrait l'état du premier.
    delete require.cache[require.resolve('./assets')];
    const { buildAssets } = require('./assets');
    manifestes[forme] = buildAssets(racine, { pageCss: [] });
  }

  const a = manifestes.lf;
  const b = manifestes.crlf;
  verifier('nom du bundle CSS identique', a.css === b.css, `${a.css} vs ${b.css}`);
  verifier('nom du bundle CSS du Visualiseur identique', a.studioCss === b.studioCss, `${a.studioCss} vs ${b.studioCss}`);
  verifier('empreinte de l’arbre JS identique', a.js === b.js, `${a.js} vs ${b.js}`);
  verifier('empreinte des icônes identique', a.icons === b.icons, `${a.icons} vs ${b.icons}`);

  // Et le contenu écrit, pas seulement son nom : un même nom pour deux
  // contenus différents serait pire que deux noms.
  const lireDist = (racine) => {
    const dist = path.join(racine, 'assets', 'dist');
    const sortie = [];
    const parcourir = (dossier) => {
      for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
        const complet = path.join(dossier, entree.name);
        if (entree.isDirectory()) parcourir(complet);
        else sortie.push([path.relative(dist, complet).split(path.sep).join('/'), fs.readFileSync(complet)]);
      }
    };
    if (fs.existsSync(dist)) parcourir(dist);
    return sortie.sort((x, y) => (x[0] < y[0] ? -1 : 1));
  };
  const distLf = lireDist(path.join(bacASable, 'lf'));
  const distCrlf = lireDist(path.join(bacASable, 'crlf'));
  const identiques =
    distLf.length === distCrlf.length &&
    distLf.every(([nom, contenu], i) => nom === distCrlf[i][0] && contenu.equals(distCrlf[i][1]));
  verifier(
    `contenu de assets/dist identique octet pour octet (${distLf.length} fichiers)`,
    identiques
  );
} finally {
  fs.rmSync(bacASable, { recursive: true, force: true });
  delete require.cache[require.resolve('./assets')];
}

/* ------------------------------------------------------------------ */
/* §11 — Écriture atomique et reprise des verrous                      */
/* ------------------------------------------------------------------ */

titre('Écriture : atomique, et patiente avec Windows');

/*
 * POURQUOI CETTE SECTION.
 *
 * Mesure avant correction : 4 constructions sur 25 échouaient, toujours de la
 * même façon — `UNKNOWN` sur `open`, toujours sur un fichier qui venait
 * d'être réécrit. Le générateur écrit désormais à côté puis renomme, et
 * réessaie les verrous transitoires.
 *
 * Une reprise que rien n'éprouve ne vaut rien : elle ne s'exécute qu'un jour
 * sur dix, et le jour où elle se trompe personne ne le sait. On lui donne
 * donc ici les cas qu'elle doit traiter, et surtout ceux qu'elle ne doit PAS
 * traiter — masquer un ENOENT serait pire que l'échec d'origine.
 */

const bacEcriture = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-ecriture-'));
try {
  /* Le cas nominal : le contenu arrive, et rien ne traîne. */
  const cible = path.join(bacEcriture, 'page.html');
  eol.ecrireTexte(cible, 'Bonjour\r\nmonde');
  verifier('le contenu est écrit', fs.readFileSync(cible, 'utf8') === 'Bonjour\nmonde');
  verifier(
    'aucun temporaire ne subsiste après un succès',
    fs.readdirSync(bacEcriture).filter((n) => n.endsWith('.tmp')).length === 0,
    fs.readdirSync(bacEcriture).join(', ')
  );

  /* Un fichier déjà présent est remplacé, pas complété. */
  eol.ecrireTexte(cible, 'court');
  verifier('une réécriture remplace entièrement', fs.readFileSync(cible, 'utf8') === 'court');

  /* Le dossier manquant est créé. */
  const profond = path.join(bacEcriture, 'a', 'b', 'c.html');
  eol.ecrireTexte(profond, 'x');
  verifier('les dossiers intermédiaires sont créés', fs.existsSync(profond));

  /* ---- La reprise, cas par cas ---- */

  const erreur = (code) => Object.assign(new Error(`faux ${code}`), { code });

  let appels = 0;
  const resultat = eol.avecReprises(() => {
    appels += 1;
    if (appels < 3) throw erreur('UNKNOWN');
    return 'abouti';
  }, 'essai');
  verifier('un verrou transitoire est réessayé jusqu’au succès', resultat === 'abouti' && appels === 3, `${appels} tentative(s)`);

  for (const code of [...eol.CODES_TRANSITOIRES]) {
    let n = 0;
    let vu = null;
    try {
      eol.avecReprises(() => { n += 1; throw erreur(code); }, 'essai');
    } catch (e) {
      vu = e;
    }
    verifier(
      `${code} : ${eol.ATTENTES_MS.length + 1} tentatives puis échec réel`,
      n === eol.ATTENTES_MS.length + 1 && vu !== null && vu.code === code,
      `${n} tentative(s)`
    );
    verifier(`${code} : le message dit que l’abandon est délibéré`, /abandon après/.test(vu.message));
  }

  /*
   * CE QU'ON NE RÉESSAIE JAMAIS.
   *
   * Un dossier absent, un droit refusé pour de bon, un disque plein : attendre
   * 250 ms n'arrange rien et brouille le diagnostic. Ces erreurs remontent à
   * la première tentative, telles quelles.
   */
  for (const code of ['ENOENT', 'EISDIR', 'ENOSPC', 'EROFS', 'EMFILE']) {
    let n = 0;
    let vu = null;
    try {
      eol.avecReprises(() => { n += 1; throw erreur(code); }, 'essai');
    } catch (e) {
      vu = e;
    }
    verifier(`${code} : remonte immédiatement, sans reprise`, n === 1 && vu.code === code, `${n} tentative(s)`);
    verifier(`${code} : le message n’est pas maquillé`, !/abandon après/.test(vu.message));
  }

  /* Une erreur sans code — une exception de génération — passe aussi tout droit. */
  let sansCode = 0;
  try {
    eol.avecReprises(() => { sansCode += 1; throw new Error('gabarit invalide'); }, 'essai');
  } catch { /* attendu */ }
  verifier('une erreur sans code n’est pas réessayée', sansCode === 1, `${sansCode} tentative(s)`);

  /* Les attentes sont bornées et réellement respectées. */
  const debut = Date.now();
  try {
    eol.avecReprises(() => { throw erreur('EBUSY'); }, 'essai');
  } catch { /* attendu */ }
  const duree = Date.now() - debut;
  const somme = eol.ATTENTES_MS.reduce((a, b) => a + b, 0);
  verifier(
    `l’attente cumulée vaut ${somme} ms et reste bornée`,
    duree >= somme - 15 && duree < somme + 400,
    `${duree} ms`
  );

  /*
   * Le nom du temporaire ne peut pas être pris pour une page.
   *
   * Les parcours du générateur ne collectent que les `.html` : un nom qui
   * finit par `.tmp` leur est invisible. Le point initial l'écarte en plus des
   * listings, et le pid évite que deux constructions se marchent dessus.
   */
  const source = path.join(bacEcriture, 'source.js');
  fs.writeFileSync(source, 'const a = 1;\n');
  eol.copierCanonique(source, path.join(bacEcriture, 'copie.js'));
  const restes = fs.readdirSync(bacEcriture).filter((n) => n.includes('.tmp'));
  verifier('copierCanonique ne laisse aucun temporaire', restes.length === 0, restes.join(', '));
} finally {
  fs.rmSync(bacEcriture, { recursive: true, force: true });
}

/* ------------------------------------------------------------------ */
/* §12 — Double construction                                           */
/* ------------------------------------------------------------------ */

if (!RAPIDE) {
  titre('Double construction : deux passes donnent le même site');

  /** Empreinte de tout ce que le générateur écrit, chemins compris. */
  function empreinteDuSite() {
    const cibles = ['assets/dist', 'index.html', 'robots.txt', 'sitemap.xml', 'data/contenus.json'];
    const lignes = [];
    const ajouter = (relatif) => {
      const complet = path.join(RACINE, relatif);
      if (!fs.existsSync(complet)) return;
      if (fs.statSync(complet).isDirectory()) {
        for (const entree of fs.readdirSync(complet).sort()) ajouter(path.join(relatif, entree));
      } else {
        lignes.push(`${relatif.split(path.sep).join('/')} ${eol.empreinte(fs.readFileSync(complet))}`);
      }
    };
    cibles.forEach(ajouter);
    return { total: crypto.createHash('sha1').update(lignes.join('\n')).digest('hex').slice(0, 12), fichiers: lignes.length };
  }

  const passes = [];
  for (let i = 0; i < 2; i += 1) {
    execFileSync('node', [path.join('_generator', 'build.js')], { cwd: RACINE, stdio: 'pipe' });
    passes.push(empreinteDuSite());
  }
  verifier(
    `passe 1 = passe 2 (${passes[0].fichiers} fichiers, ${passes[0].total})`,
    passes[0].total === passes[1].total && passes[0].fichiers === passes[1].fichiers,
    `${passes[0].total} vs ${passes[1].total}`
  );
} else {
  console.log('\n(double construction sautée : --rapide)');
}

/* ------------------------------------------------------------------ */

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérifications réussies, ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exitCode = 1;
} else {
  console.log(`${reussis} vérifications réussies, 0 échec.`);
  console.log('Même commit, checkout Windows ou Linux : mêmes empreintes.');
}
