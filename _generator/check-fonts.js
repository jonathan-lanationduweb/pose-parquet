/**
 * Contrôle : les polices auto-hébergées sont-elles chacune uniques et utiles ?
 *
 *   node _generator/check-fonts.js
 *
 * POURQUOI CE CONTRÔLE EXISTE. Le relevé du 28/09/2026 a trouvé six fichiers
 * Inter pour deux contenus : le même binaire, recopié sous trois noms parce
 * que Google Fonts déclare trois graisses pour une police variable. Trois
 * noms, trois URL, aucun partage de cache — l'accueil téléchargeait 184 Ko de
 * polices là où 90 suffisaient.
 *
 * Rien ne pouvait le voir. Le build était reproductible, les pages valides,
 * les contrôles au vert : deux fichiers identiques sous des noms différents
 * ne cassent rien, ils coûtent. C'est exactement le genre de défaut qui
 * mérite un contrôle, parce qu'il ne se manifeste jamais de lui-même.
 *
 *   §1  aucune police n'est livrée deux fois sous deux noms
 *   §2  chaque fichier présent est déclaré, chaque déclaration a son fichier
 *   §3  ce que le gabarit précharge existe
 *   §4  une police variable est déclarée avec une plage, pas une graisse
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { faces, aPrecharger } = require('./polices');

const RACINE = path.resolve(__dirname, '..');
const DIR = path.join(RACINE, 'assets', 'fonts');

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

const titre = (t) => console.log(`\n== ${t} ==`);

/** `fvar` présent dans le répertoire de tables woff2 → police variable. */
function estVariable(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'wOF2') return false;
  const nbTables = buffer.readUInt16BE(12);
  let pos = 48;
  for (let i = 0; i < nbTables; i++) {
    const flags = buffer[pos++];
    const index = flags & 0x3f;
    let tag = index;
    if (index === 63) {
      tag = buffer.toString('ascii', pos, pos + 4);
      pos += 4;
    }
    for (let n = 0; n < 2; n++) {
      const transfo = (flags >> 6) & 0x03;
      const aUneSeconde = (index === 10 || index === 11) ? transfo === 0 : transfo !== 0;
      if (n === 1 && !aUneSeconde) break;
      for (let k = 0; k < 5; k++) if ((buffer[pos++] & 0x80) === 0) break;
    }
    if (tag === 47 || tag === 'fvar') return true;
  }
  return false;
}

const fichiers = fs.readdirSync(DIR).filter((n) => n.endsWith('.woff2'));
const lus = fichiers.map((nom) => {
  const octets = fs.readFileSync(path.join(DIR, nom));
  return {
    nom,
    taille: octets.length,
    empreinte: crypto.createHash('sha256').update(octets).digest('hex').slice(0, 16),
    variable: estVariable(octets),
  };
});
const declarees = faces();

/* ------------------------------------------------------------------ */
titre('Unicité : un contenu, un fichier');

const parEmpreinte = new Map();
for (const f of lus) {
  if (!parEmpreinte.has(f.empreinte)) parEmpreinte.set(f.empreinte, []);
  parEmpreinte.get(f.empreinte).push(f.nom);
}
const doublons = [...parEmpreinte.values()].filter((noms) => noms.length > 1);
const gaspille = doublons.reduce(
  (somme, noms) => somme + (noms.length - 1) * (lus.find((f) => f.nom === noms[0]).taille),
  0
);
verifier(
  `${fichiers.length} fichiers, ${parEmpreinte.size} contenus distincts`,
  doublons.length === 0,
  doublons.length
    ? doublons.map((n) => n.join(' = ')).join(' | ') + ` (${Math.round(gaspille / 1024)} Ko livrés en double)`
    : ''
);

/* ------------------------------------------------------------------ */
titre('Cohérence : fichiers et déclarations se correspondent');

const declares = new Set(declarees.map((f) => f.fichier));
const orphelins = fichiers.filter((n) => !declares.has(n));
verifier(
  'aucun fichier de police que rien ne déclare',
  orphelins.length === 0,
  orphelins.join(', ')
);

const manquants = [...declares].filter((n) => !fichiers.includes(n));
verifier(
  `les ${declares.size} fichiers déclarés existent`,
  manquants.length === 0,
  manquants.join(', ')
);

verifier(
  `${declarees.length} déclarations @font-face`,
  declarees.length > 0
);

/* ------------------------------------------------------------------ */
titre('Préchargement : ce que le gabarit demande existe');

for (const famille of ['Instrument Serif', 'Inter']) {
  let fichier = null;
  let erreur = '';
  try {
    fichier = aPrecharger(famille);
  } catch (e) {
    erreur = e.message;
  }
  verifier(
    `${famille} : sous-ensemble latin préchargeable`,
    Boolean(fichier) && fichiers.includes(fichier),
    erreur || `${fichier} absent de assets/fonts/`
  );
}

/* Et le gabarit produit doit bien pointer dessus. */
const layout = fs.readFileSync(path.join(RACINE, '_generator', 'layout.js'), 'utf8');
verifier(
  'aucun nom de police écrit en dur dans le gabarit',
  !/assets\/fonts\/[a-z0-9-]+\.woff2/i.test(layout),
  (layout.match(/assets\/fonts\/[a-z0-9-]+\.woff2/gi) || []).join(', ')
);

/* ------------------------------------------------------------------ */
titre('Variables : déclarées avec une plage, pas une graisse');

for (const f of lus.filter((x) => x.variable)) {
  const face = declarees.find((d) => d.fichier === f.nom);
  verifier(
    `${f.nom} est variable et déclaré « ${face ? face.poids : '?'} »`,
    Boolean(face) && /\s/.test(face.poids),
    face ? `déclaré sur une seule graisse : une police variable perd alors ses axes` : 'non déclaré'
  );
}
const statiques = lus.filter((x) => !x.variable);
verifier(
  `${statiques.length} police(s) statique(s), déclarée(s) sur une graisse simple`,
  statiques.every((f) => {
    const face = declarees.find((d) => d.fichier === f.nom);
    return face && !/\s/.test(face.poids);
  })
);

/* ------------------------------------------------------------------ */
console.log('');
const total = lus.reduce((s, f) => s + f.taille, 0);
console.log(
  `assets/fonts : ${fichiers.length} fichiers, ${Math.round(total / 1024)} Ko au total ` +
    `(${lus.filter((f) => f.variable).length} variable(s), ${statiques.length} statique(s)).`
);

if (echecs.length) {
  console.log(`\n${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
