/**
 * Contrôle : les nombres écrits dans les pages sont-ils ceux que le site offre ?
 *
 *   node _generator/check-chiffres.js
 *
 * POURQUOI CE CONTRÔLE EXISTE. L'audit du 28/09/2026 a trouvé deux promesses
 * fausses, et aucune n'était détectable par les contrôles existants :
 *
 *   « 10 pièces d'exemple »  le Studio en proposait 9. Le nombre ÉTAIT
 *                            calculé — mais avec une règle différente de
 *                            celle du front, qui écarte les scènes marquées
 *                            `showInRoomLibrary: false`. Deux comptes justes,
 *                            chacun selon sa propre règle, et un écart qui
 *                            porte un nom : `couloir-enfilade`.
 *
 *   « Douze parquets »       le tiroir en présentait 26. Celui-là était écrit
 *                            à la main, et personne n'avait de raison d'y
 *                            revenir en ajoutant quatorze références Premibel.
 *
 * Les deux formes d'erreur sont couvertes ici :
 *
 *   §1  la source : le générateur et le front comptent-ils la même chose ?
 *   §2  les pages : le nombre imprimé est-il celui de la source ?
 *   §3  la régression : un nombre est-il réapparu en dur dans une phrase qui
 *       décrit une donnée technique ?
 *
 * Ce contrôle lit les pages CONSTRUITES. Il faut donc l'exécuter après
 * `node _generator/build.js`.
 */
const fs = require('fs');
const path = require('path');

const { exclusions } = require('./arborescence');
const { NB_PIECES, HORS_BIBLIOTHEQUE, REGLES, manifeste } = require('./scenes');
const { NB_PARQUETS, NB_DEMONSTRATION, NB_REELS, CATALOGUE } = require('./catalogue');
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');

const RACINE = path.resolve(__dirname, '..');
const NB_MOTIFS_PLAN = require('../js/tools/patterns.js').PATTERNS.length;

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

function titre(t) {
  console.log(`\n== ${t} ==`);
}

/** Les pages publiées, avec leur texte visible (balises et scripts retirés). */
const horsParcours = exclusions(['assets', 'backend', 'docs', 'design', 'components']);
function pages(dossier = RACINE, prefixe = '', out = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (horsParcours(e.name)) continue;
      pages(path.join(dossier, e.name), `${prefixe}${e.name}/`, out);
    } else if (e.name.endsWith('.html')) {
      out.push({ chemin: `${prefixe}${e.name}`, html: fs.readFileSync(path.join(dossier, e.name), 'utf8') });
    }
  }
  return out;
}

const PAGES = pages();
const texteDe = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

/* ------------------------------------------------------------------ */
/* §1 — La source : générateur et front comptent la même chose         */
/* ------------------------------------------------------------------ */

titre('Source : le générateur applique la règle du front');

const idx = manifeste();
const bibliothequeFront = REGLES.scenesBibliotheque(idx).map((s) => s.id);
verifier(
  `pièces : le générateur (${NB_PIECES}) et scenes-regles (${bibliothequeFront.length}) s'accordent`,
  NB_PIECES === bibliothequeFront.length,
  `générateur ${NB_PIECES}, front ${bibliothequeFront.length}`
);

// Le piège d'origine : compter les publiables au lieu des offertes.
const publiables = REGLES.scenesPubliques(idx).length;
verifier(
  `pièces : les scènes hors bibliothèque ne sont pas comptées (${HORS_BIBLIOTHEQUE.length} écartée(s) : ${HORS_BIBLIOTHEQUE.map((s) => s.id).join(', ') || 'aucune'})`,
  NB_PIECES === publiables - HORS_BIBLIOTHEQUE.length,
  `publiables ${publiables}, annoncées ${NB_PIECES}`
);

verifier(
  `parquets : ${NB_PARQUETS} proposés = ${NB_DEMONSTRATION} démonstration + ${NB_REELS} réels`,
  NB_PARQUETS === NB_DEMONSTRATION + NB_REELS && NB_PARQUETS > 0
);

verifier(
  `parquets : les fiches écartées le sont par estProposable (${CATALOGUE.rejetes.length} écartée(s))`,
  CATALOGUE.rejetes.every((f) => !require('../js/scene/product.js').estProposable(f))
);

/* ------------------------------------------------------------------ */
/* §2 — Les pages impriment bien ce que la source dit                  */
/* ------------------------------------------------------------------ */

titre('Pages : le nombre imprimé est celui de la source');

/**
 * Cherche « <nombre> <libellé> » dans le texte visible de toutes les pages et
 * vérifie que le nombre trouvé est le bon, partout.
 *
 * @param {string} libelle       ce qui suit le nombre, en expression régulière
 * @param {number} attendu       la valeur que la source donne
 * @param {string} nom           intitulé du contrôle
 */
function nombreAnnonce(libelle, attendu, nom) {
  const motif = new RegExp(`(\\d+)\\s+${libelle}`, 'gi');
  const trouves = [];
  for (const p of PAGES) {
    for (const m of texteDe(p.html).matchAll(motif)) trouves.push({ page: p.chemin, valeur: Number(m[1]) });
  }
  const faux = trouves.filter((t) => t.valeur !== attendu);
  verifier(
    `${nom} : ${trouves.length} mention(s), toutes à ${attendu}`,
    trouves.length > 0 && faux.length === 0,
    faux.length
      ? faux.map((f) => `${f.page} annonce ${f.valeur}`).join(', ')
      : 'aucune mention trouvée — le libellé a changé, ce contrôle ne prouve plus rien'
  );
}

nombreAnnonce('pièces d[’\']exemple', NB_PIECES, 'pièces d’exemple');
nombreAnnonce('parquets', NB_PARQUETS, 'parquets');
nombreAnnonce('guides pratiques', GUIDES.length, 'guides pratiques');
nombreAnnonce('motifs simulés', NB_MOTIFS_PLAN, 'motifs simulés');
nombreAnnonce('références, chacune', NB_PARQUETS, 'références du visualiseur');

/*
 * Les nombres écrits en toutes lettres : mêmes promesses, autre orthographe.
 *
 * On ne retient que les MOTS-NOMBRES. Un premier jet attrapait n'importe quel
 * mot précédant le libellé et se plaignait de « les pièces d'exemple » dans
 * une réponse de FAQ — un contrôle qui crie sur du français normal finit par
 * être ignoré, ce qui est pire que pas de contrôle.
 */
const EN_LETTRES = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const motPieces = EN_LETTRES[NB_PIECES] || String(NB_PIECES);
const MOTS_NOMBRES = new Set([...EN_LETTRES, 'un', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'vingt', 'trente']);
const lettres = PAGES.flatMap((p) => {
  const t = texteDe(p.html);
  return [...t.matchAll(/(\p{L}+)\s+pièces d[’']exemple/giu)]
    .map((m) => ({ page: p.chemin, mot: m[1].toLowerCase() }))
    .filter((x) => MOTS_NOMBRES.has(x.mot));
});
verifier(
  `pièces d’exemple en toutes lettres : ${lettres.length} mention(s), toutes « ${motPieces} »`,
  lettres.every((x) => x.mot === motPieces),
  lettres.filter((x) => x.mot !== motPieces).map((x) => `${x.page} dit « ${x.mot} »`).join(', ')
);

/* ------------------------------------------------------------------ */
/* §3 — Régression : plus de nombre en dur dans ces phrases            */
/* ------------------------------------------------------------------ */

titre('Régression : aucun nombre technique réécrit à la main');

/*
 * On relit les SOURCES du générateur, pas les pages : c'est là que le nombre
 * en dur s'écrit. Un littéral collé devant l'un de ces libellés est refusé,
 * même s'il se trouve juste aujourd'hui — il ne le restera pas.
 */
const SOURCES = fs
  .readdirSync(path.join(RACINE, '_generator'))
  .filter((n) => n.endsWith('.js') && n !== 'check-chiffres.js')
  .map((n) => ({ nom: n, code: fs.readFileSync(path.join(RACINE, '_generator', n), 'utf8') }));

const LIBELLES_SURVEILLES = [
  'pièces d’exemple',
  'parquets',
  'guides pratiques',
  'motifs simulés',
  'références, chacune',
];

const enDur = [];
for (const { nom, code } of SOURCES) {
  // Le code, sans les commentaires : un exemple dans une explication est
  // légitime, et le refuser pousserait à moins commenter.
  const sansCommentaires = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  for (const libelle of LIBELLES_SURVEILLES) {
    const motif = new RegExp(`(?:>|\\s)(\\d+)\\s+${libelle.replace(/[’']/g, "[’']")}`, 'gi');
    for (const m of sansCommentaires.matchAll(motif)) enDur.push(`${nom} : « ${m[1]} ${libelle} »`);
  }
}
verifier(
  'aucun nombre en dur devant un libellé surveillé',
  enDur.length === 0,
  enDur.join(' | ')
);

/* ------------------------------------------------------------------ */

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
console.log(
  `Le site annonce ${NB_PIECES} pièces, ${NB_PARQUETS} parquets, ${GUIDES.length} guides, ` +
    `${MOTIFS.length} motifs éditoriaux, ${NB_MOTIFS_PLAN} motifs simulés — et c'est ce qu'il offre.`
);
