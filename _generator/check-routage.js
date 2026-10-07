/**
 * Contrôle : une demande part-elle chez celui qui sait la traiter ?
 *
 * -----------------------------------------------------------------------------
 * CE QU'IL VÉRIFIE
 * -----------------------------------------------------------------------------
 *
 * Trois choses, et la troisième est celle qui casse en silence.
 *
 *   1. la règle rend bien ce qu'on attend, cas par cas ;
 *   2. la zone d'Allure Design est respectée — Paris et l'Île-de-France,
 *      pas davantage ;
 *   3. les listes de valeurs disent la même chose des deux côtés du réseau,
 *      et dans le formulaire.
 *
 * Le troisième point est le vrai sujet. Le front décide, le serveur valide,
 * le formulaire propose : trois copies de la même liste, dans deux langages.
 * Le jour où l'une s'allonge sans les autres, une réponse parfaitement
 * légitime revient en 422 « valeur hors de la liste autorisée », côté
 * visiteur ça ressemble à une panne, et côté journal ça ressemble à une
 * attaque.
 *
 * -----------------------------------------------------------------------------
 * CE QU'IL NE VÉRIFIE PAS
 * -----------------------------------------------------------------------------
 *
 * Que l'orientation soit commercialement pertinente. Un contrôle ne sait pas
 * si Allure Design veut des chantiers de 8 m² ; il sait seulement que la
 * règle écrite est appliquée, et qu'elle l'est partout pareil.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');

/*
 * `lead-context.js` est un module ES : c'est le navigateur qui le charge en
 * premier lieu. Node sait le faire depuis CommonJS depuis la 22.12 ; en
 * dessous, on le dit franchement plutôt que de laisser tomber une trace
 * illisible. Même garde que dans scenes.js, et pour la même raison.
 */
let REGLE;
let PREFILL;
let GEO;
try {
  REGLE = require('../js/forms/lead-context.js');
  PREFILL = require('../js/forms/plan-handoff.js');
  GEO = require('../js/forms/departements.js');
} catch (erreur) {
  throw new Error(
    'Impossible de charger js/forms/lead-context.js depuis le générateur.\n' +
      `Node ${process.version} — il en faut au moins 22.12 pour charger un module ES ` +
      'depuis CommonJS. Mettre Node à jour, ou dupliquer la règle ici EN LE SACHANT.\n' +
      `Cause : ${erreur && erreur.message}`
  );
}

const { projectFormConfig } = require('../components/project-form/project-form.config.js');

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
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* §1 — Les cas de routage, un par un                                  */
/* ------------------------------------------------------------------ */

titre('Routage : besoin × zone');

/**
 * Chaque ligne se lit comme une phrase : tel besoin, à tel endroit, part là.
 * Les sept premiers sont les cas de recette ; les suivants ferment les trous.
 */
const CAS = [
  ['produit', true, 'premibel', 'un parquet se livre : la zone ne limite rien'],
  ['pose', true, 'allure_design', 'pose en Île-de-France : dans la zone annoncée'],
  ['renovation', true, 'allure_design', 'rénovation en Île-de-France : dans le périmètre'],
  ['produit-pose', true, 'mixed', 'les deux, en Île-de-France : les deux entreprises'],
  ['pose', false, 'undetermined', 'pose hors zone : personne ne s’y est engagé'],
  ['produit', false, 'premibel', 'produit hors zone : servable quand même'],
  ['indetermine', true, 'undetermined', 'besoin inconnu : un humain regarde'],

  ['renovation', false, 'undetermined', 'rénovation hors zone'],
  ['produit-pose', false, 'premibel', 'les deux hors zone : la moitié servable est servie'],
  ['renseignement', true, 'undetermined', 'se renseigne : rien à orienter'],
  ['renseignement', false, 'undetermined', 'se renseigne, hors zone'],
];

for (const [besoin, idf, attendu, pourquoi] of CAS) {
  const obtenu = REGLE.destinationRecommandee({ besoin, idf });
  verifier(
    `${besoin} / ${idf ? 'IDF' : 'hors IDF'} → ${attendu} (${pourquoi})`,
    obtenu === attendu,
    obtenu
  );
}

/*
 * Le cas qu'on n'a pas prévu.
 *
 * Une valeur de besoin inconnue ne doit jamais produire une orientation :
 * `undetermined` est le seul défaut acceptable. Si un jour quelqu'un ajoute
 * un besoin sans compléter la règle, il obtiendra une demande à qualifier à
 * la main — pas un client envoyé au hasard.
 */
verifier(
  'un besoin inconnu ne produit jamais d’orientation',
  REGLE.destinationRecommandee({ besoin: 'parapente', idf: true }) === 'undetermined' &&
    REGLE.destinationRecommandee({}) === 'undetermined'
);

/*
 * ALLURE DESIGN NE SORT JAMAIS DE SA ZONE.
 *
 * L'assertion la plus importante du fichier : quel que soit le besoin, hors
 * Île-de-France aucune orientation automatique ne la nomme. On balaie tous
 * les besoins connus plutôt que les trois auxquels on pense.
 */
const horsZone = REGLE.LEAD_NEEDS.map((b) => [b, REGLE.destinationRecommandee({ besoin: b, idf: false })]);
verifier(
  'hors Île-de-France, aucun besoin n’oriente vers Allure Design',
  horsZone.every(([, d]) => d !== 'allure_design' && d !== 'mixed'),
  horsZone.filter(([, d]) => d === 'allure_design' || d === 'mixed').map(([b]) => b).join(', ')
);

/* ------------------------------------------------------------------ */
/* §2 — La zone                                                        */
/* ------------------------------------------------------------------ */

titre('Zone d’intervention : le département fait foi');

/*
 * Le formulaire demandait une zone, une région ET un département. Il ne
 * demande plus que le département, et c'est lui qui répond à la seule
 * question qui compte pour l'orientation.
 */
verifier('la table couvre 101 départements', GEO.TOUS.length === 101, `${GEO.TOUS.length}`);
verifier('aucun département en double', new Set(GEO.TOUS).size === GEO.TOUS.length);
verifier(
  'la liste francilienne se déduit de la table',
  GEO.DEPARTEMENTS_IDF === GEO.REGIONS[GEO.ILE_DE_FRANCE] && GEO.DEPARTEMENTS_IDF.length === 8
);

/* Les huit, un par un. Aucun oubli possible. */
for (const dep of ['75', '77', '78', '91', '92', '93', '94', '95']) {
  verifier(`${dep} est en Île-de-France`, GEO.estIdf(dep) && REGLE.dansZoneIdf({ department: dep }));
}

/* Et quelques voisins qui ne le sont pas, dont ceux des cas de recette. */
for (const [dep, region] of [
  ['69', 'Auvergne-Rhône-Alpes'],
  ['33', 'Nouvelle-Aquitaine'],
  ['59', 'Hauts-de-France'],
  ['13', "Provence-Alpes-Côte d'Azur"],
  ['35', 'Bretagne'],
  ['2A', 'Corse'],
  ['974', 'Outre-mer'],
]) {
  verifier(`${dep} → ${region}, hors zone`, GEO.regionDe(dep) === region && !GEO.estIdf(dep), GEO.regionDe(dep));
}

/*
 * La saisie se normalise, elle ne se refuse pas.
 *
 * « 2a », « 6 », «  92  » sont des réponses correctes mal formées. Les
 * refuser aurait fait porter à la personne une exigence de format qu'on peut
 * satisfaire à sa place.
 */
verifier('« 2a » devient « 2A »', GEO.normaliserDepartement('2a') === '2A');
verifier('« 6 » devient « 06 »', GEO.normaliserDepartement('6') === '06' && GEO.regionDe('6') !== '');
verifier('les espaces sont retirés', GEO.estIdf(' 92 ') === true);

/*
 * CE QU'ON NE DEVINE PAS.
 *
 * 975 (Saint-Pierre-et-Miquelon) passe le motif du formulaire sans être un
 * département : il n'a donc aucune région, et surtout pas une région
 * choisie par défaut. Vide veut dire « on ne sait pas ».
 */
verifier('975 : aucune région devinée', GEO.regionDe('975') === '' && !GEO.estIdf('975'));
verifier('département absent : hors zone', REGLE.dansZoneIdf({}) === false);
verifier('département illisible : hors zone', REGLE.dansZoneIdf({ department: 'abc' }) === false);

/* ------------------------------------------------------------------ */
/* §2bis — Les cas de recette, département par département             */
/* ------------------------------------------------------------------ */

titre('Routage : département × besoin');

const CAS_GEO = [
  ['75', 'produit', 'premibel'],
  ['75', 'pose', 'allure_design'],
  ['77', 'renovation', 'allure_design'],
  ['95', 'produit-pose', 'mixed'],
  ['92', 'renovation', 'allure_design'],
  ['94', 'produit-pose', 'mixed'],
  ['69', 'pose', 'undetermined'],
  ['69', 'produit-pose', 'premibel'],
  ['33', 'renovation', 'undetermined'],
  ['33', 'produit', 'premibel'],
  ['59', 'produit-pose', 'premibel'],
  ['13', 'produit', 'premibel'],
  ['', 'pose', 'undetermined'],
  ['', 'produit', 'premibel'],
  ['zzz', 'pose', 'undetermined'],
];

for (const [department, besoin, attendu] of CAS_GEO) {
  const idf = REGLE.dansZoneIdf({ department });
  const obtenu = REGLE.destinationRecommandee({ besoin, idf });
  verifier(
    `${department || '(aucun)'} + ${besoin} → ${attendu}`,
    obtenu === attendu,
    `${obtenu} (idf=${idf})`
  );
}

/*
 * LA CONTRADICTION NE PEUT PLUS SE PRODUIRE.
 *
 * La règle ne lit plus qu'un département : il n'y a plus de second champ
 * avec lequel se contredire. On le vérifie en lui passant justement ce qui
 * aurait pu la tromper.
 */
verifier(
  'une région passée en plus ne change rien',
  REGLE.dansZoneIdf({ department: '35', region: 'Île-de-France' }) === false &&
    REGLE.dansZoneIdf({ department: '75', region: 'Bretagne' }) === true
);
verifier(
  'department=35 ne produit jamais allure_design, quel que soit le besoin',
  REGLE.LEAD_NEEDS.every(
    (b) => REGLE.destinationRecommandee({ besoin: b, idf: REGLE.dansZoneIdf({ department: '35' }) }) !== 'allure_design'
  )
);

/* ------------------------------------------------------------------ */
/* §3 — Les mêmes listes partout                                       */
/* ------------------------------------------------------------------ */

titre('Listes fermées : front, formulaire, serveur');

const fields = lire('backend/pose-parquet-core/src/Projects/Fields.php');

/** Extrait une liste PHP `'cle' => [ 'a', 'b' ]` telle qu'elle est écrite. */
function enumPhp(nom) {
  const ligne = new RegExp(`'${nom}'\\s*=>\\s*\\[([^\\]]*)\\]`, 's').exec(fields);
  if (!ligne) return null;
  return [...ligne[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const besoinsServeur = enumPhp('leadNeed');
const destinationsServeur = enumPhp('leadDestination');
const originesServeur = enumPhp('leadSource');

verifier('le serveur déclare bien leadNeed', Array.isArray(besoinsServeur), String(besoinsServeur));
verifier(
  'besoins : front et serveur disent la même chose',
  JSON.stringify(besoinsServeur) === JSON.stringify(REGLE.LEAD_NEEDS),
  `serveur ${JSON.stringify(besoinsServeur)} vs front ${JSON.stringify(REGLE.LEAD_NEEDS)}`
);
verifier(
  'destinations : front et serveur disent la même chose',
  JSON.stringify(destinationsServeur) === JSON.stringify(REGLE.LEAD_DESTINATIONS),
  `serveur ${JSON.stringify(destinationsServeur)}`
);
verifier(
  'origines : front et serveur disent la même chose',
  JSON.stringify(originesServeur) === JSON.stringify(REGLE.LEAD_SOURCES),
  `serveur ${JSON.stringify(originesServeur)}`
);

/*
 * Le formulaire ne propose que des réponses que la règle sait traiter.
 *
 * Il n'offre pas `renseignement` — cette valeur-là vient du champ « délai »,
 * pas du champ « besoin » — donc on vérifie l'inclusion, pas l'égalité.
 */
const champBesoin = projectFormConfig.steps
  .flatMap((e) => e.fields)
  .find((c) => c.name === 'besoin');

verifier('le formulaire pose la question du besoin', Boolean(champBesoin));
verifier('elle est obligatoire', Boolean(champBesoin && champBesoin.required));

const reponses = champBesoin ? champBesoin.options.map((o) => o.value) : [];
verifier(
  'chaque réponse proposée est une valeur que la règle connaît',
  reponses.length > 0 && reponses.every((v) => REGLE.LEAD_NEEDS.includes(v)),
  reponses.filter((v) => !REGLE.LEAD_NEEDS.includes(v)).join(', ')
);
verifier(
  'la reprise par lien connaît exactement ces réponses',
  JSON.stringify(PREFILL.BESOINS) === JSON.stringify(reponses),
  `${JSON.stringify(PREFILL.BESOINS)} vs ${JSON.stringify(reponses)}`
);

/*
 * LES DEUX TABLES DE DÉPARTEMENTS, ENTRÉE PAR ENTRÉE.
 *
 * Le front décide de l'orientation, le serveur normalise la région : les deux
 * ont besoin de la même table, et une extension WordPress ne lit pas les
 * fichiers du site statique. La duplication est assumée — ce contrôle est ce
 * qui l'empêche d'être oubliée.
 *
 * Comparaison exhaustive, pas un échantillon : un seul département déplacé
 * d'une région à l'autre suffirait à faire diverger l'orientation de son
 * explication.
 */
const geoPhp = lire('backend/pose-parquet-core/src/Projects/Departements.php');
const tablePhp = {};
/*
 * Les deux formes de guillemets.
 *
 * « Provence-Alpes-Côte d'Azur » porte une apostrophe, donc s'écrit entre
 * guillemets doubles en PHP comme en JavaScript. Un lecteur qui n'accepte que
 * les guillemets simples rate cette région-là — et signale une divergence qui
 * n'existe pas, ce qui est la pire sorte d'alerte.
 */
for (const m of geoPhp.matchAll(/(?:'([^']+)'|"([^"]+)")\s*=>\s*\[([^\]]*)\]/g)) {
  const region = m[1] !== undefined ? m[1] : m[2];
  const deps = [...m[3].matchAll(/'([0-9AB]+)'/g)].map((d) => d[1]);
  if (deps.length) tablePhp[region] = deps;
}
verifier('la table PHP est lisible', Object.keys(tablePhp).length === Object.keys(GEO.REGIONS).length, `${Object.keys(tablePhp).length} régions`);

const ecarts = [];
for (const [region, deps] of Object.entries(GEO.REGIONS)) {
  if (JSON.stringify(tablePhp[region]) !== JSON.stringify(deps)) ecarts.push(region);
}
verifier('front et serveur décrivent la même géographie', ecarts.length === 0, ecarts.join(', '));

/* Et aucune liste de départements franciliens écrite à la main, nulle part. */
const routage = lire('backend/pose-parquet-core/src/Projects/LeadRouting.php');
verifier(
  'aucune liste francilienne recopiée dans LeadRouting',
  !/'75'\s*,\s*'77'/.test(routage)
);
verifier(
  'aucune liste francilienne recopiée dans lead-context',
  !/'75'\s*,\s*'77'/.test(lire('js/forms/lead-context.js'))
);

/* ------------------------------------------------------------------ */
/* §4 — Ce que la règle ne doit pas faire                              */
/* ------------------------------------------------------------------ */

titre('Garde-fous');

/*
 * La réponse explicite du visiteur l'emporte sur ce qu'on a déduit.
 *
 * Quelqu'un qui regardait une référence Premibel puis coche « faire poser
 * mon parquet » a déjà son parquet en tête. Lui répondre « produit » parce
 * qu'il a cliqué sur une vignette, c'est lui expliquer son propre besoin.
 */
verifier(
  'la réponse du visiteur prime sur la déduction',
  REGLE.besoinRecommande({ besoin: 'pose', produitIdentifie: true, timeframe: 'mois' }) === 'pose'
);
verifier(
  'sans réponse, on retombe sur la déduction',
  REGLE.besoinRecommande({ produitIdentifie: true }) === 'produit'
);
verifier(
  '« je ne sais pas » + « je me renseigne » : on retient le second',
  REGLE.besoinRecommande({ besoin: 'indetermine', timeframe: 'renseignement' }) === 'renseignement'
);
verifier(
  '« je ne sais pas » avec un délai serré reste à qualifier',
  REGLE.besoinRecommande({ besoin: 'indetermine', timeframe: 'urgent' }) === 'indetermine'
);

/* Aucune règle commerciale ne doit vivre ailleurs que dans lead-context.js. */
const ailleurs = ['js/studio/app.js', 'js/product/app.js', 'js/tools/floor-visualizer.js', 'components/project-form/project-form.js']
  .filter((f) => /allure_design|'mixed'/.test(lire(f)));
verifier(
  'aucune décision d’orientation écrite hors de lead-context.js',
  ailleurs.length === 0,
  ailleurs.join(', ')
);


/* ------------------------------------------------------------------ */
/* §5 — Les modules du parcours se montent                             */
/* ------------------------------------------------------------------ */

titre('Modules : aucun nom appelé sans être défini');

/*
 * POURQUOI CE CONTRÔLE EXISTE.
 *
 * Un renommage à moitié appliqué a laissé `utmDeLaVisite()` appelé alors que
 * la fonction s'appelait encore `utmFromParams`. Le module se chargeait, le
 * fichier passait `node --check`, tous les contrôles restaient verts — et le
 * formulaire projet ne se montait plus du tout. `mountProjectForm` levait une
 * `ReferenceError` avant de brancher le moindre écouteur : cinq étapes
 * affichées, aucun bouton qui réponde, et pas un test pour le dire.
 *
 * Il a fallu une recette navigateur pour le voir. Ce contrôle le voit sans.
 *
 * Il ne remplace pas un analyseur syntaxique : il attrape la classe de défaut
 * qui a mordu — un identifiant appelé et défini nulle part — sur les modules
 * qui portent le parcours de demande.
 */

const RETOUR = String.fromCharCode(10);
const ECHAP = String.fromCharCode(92);

/**
 * Retire commentaires et chaînes, en UNE passe.
 *
 * Trois expressions rationnelles enchaînées ne suffisent pas : la table des
 * régions contient « Provence-Alpes-Côte d'Azur », une chaîne à guillemets
 * doubles qui porte une apostrophe. Retirer d'abord les chaînes simples ouvre
 * alors une fausse chaîne à cette apostrophe, refermée des centaines de
 * lignes plus loin — et tout ce qui est entre les deux disparaît, définitions
 * comprises. Le prototype signalait ainsi deux fonctions parfaitement
 * définies. Un balayage caractère par caractère sait dans quel état il est.
 */
function sansCommentairesNiChaines(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '*') {
      const fin = src.indexOf('*/', i + 2);
      i = fin === -1 ? src.length : fin + 2;
      out += ' ';
    } else if (c === '/' && d === '/') {
      const fin = src.indexOf(RETOUR, i);
      i = fin === -1 ? src.length : fin;
      out += ' ';
    } else if (c === "'" || c === '"' || c === '`') {
      const guillemet = c;
      i += 1;
      while (i < src.length && src[i] !== guillemet) {
        if (src[i] === ECHAP) i += 1;
        i += 1;
      }
      i += 1;
      out += guillemet + guillemet;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/** Ce que le navigateur fournit : appelable sans être déclaré dans le fichier. */
const GLOBAUX = new Set([
  'require', 'Boolean', 'String', 'Number', 'Array', 'Object', 'JSON', 'Math', 'Date', 'Set', 'Map',
  'Promise', 'Error', 'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'fetch', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'encodeURIComponent',
  'decodeURIComponent', 'structuredClone', 'AbortController', 'FormData', 'URL', 'URLSearchParams',
  'Event', 'CustomEvent', 'document', 'window', 'console', 'navigator', 'location', 'history',
  'sessionStorage', 'localStorage', 'Intl', 'Symbol', 'Proxy', 'Reflect', 'WeakMap', 'WeakSet',
  'BigInt', 'TextEncoder', 'TextDecoder', 'Image', 'Worker', 'OffscreenCanvas', 'ResizeObserver',
  'IntersectionObserver', 'MutationObserver', 'RadioNodeList', 'HTMLElement', 'Node', 'NodeList',
  'Blob', 'File', 'FileReader', 'Response', 'Request', 'Headers', 'performance',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'crypto', 'matchMedia',
  'getComputedStyle', 'DOMParser', 'CSS', 'Function', 'escape', 'unescape', 'decodeURI', 'encodeURI',
]);

/** Mots-clés suivis d'une parenthèse : `if (`, `catch (`… jamais des appels. */
const MOTS_CLES = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'await', 'new', 'function', 'class',
  'do', 'else', 'delete', 'void', 'in', 'of', 'instanceof', 'yield', 'throw', 'case', 'with', 'super',
  'import', 'export', 'default', 'const', 'let', 'var', 'try', 'finally', 'break', 'continue', 'async',
]);

function nomsNonDefinis(rel) {
  const src = sansCommentairesNiChaines(lire(rel));
  const definis = new Set();
  const ajouter = (n) => { if (/^[A-Za-z_$][\w$]*$/.test(n)) definis.add(n); };

  for (const m of src.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) ajouter(m[1]);
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) ajouter(m[1]);
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    m[1].split(',').forEach((x) => ajouter(x.split(':').pop().replace(/=.*/, '').trim()));
  }
  for (const m of src.matchAll(/import\s*\{([^}]*)\}/g)) {
    m[1].split(',').forEach((x) => ajouter(x.split(' as ').pop().trim()));
  }
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) ajouter(m[1]);
  /* Paramètres : fonctions nommées, méthodes, flèches parenthésées. */
  for (const m of src.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    m[1].split(',').forEach((x) => ajouter(x.replace(/[=:].*/, '').replace(/^\.\.\./, '').trim()));
  }
  /* Flèche à paramètre unique sans parenthèses : `x => …` */
  for (const m of src.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) ajouter(m[2]);
  /*
   * Méthodes de classe, `constructor` compris.
   *
   * `constructor( … ) {` ressemble à un appel à une fonction nommée
   * « constructor » : sans cette règle, toute classe du dépôt était signalée.
   * Les reconnaître comme des DÉFINITIONS vaut mieux que de les inscrire une
   * à une dans une liste de mots-clés, qui aurait vieilli à la première
   * méthode ajoutée.
   */
  for (const m of src.matchAll(/^\s*(?:async\s+|static\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/gm)) ajouter(m[1]);

  const appeles = new Set();
  for (const m of src.matchAll(/(^|[^\w$.?])([a-z_$][\w$]*)\s*\(/g)) {
    if (!MOTS_CLES.has(m[2])) appeles.add(m[2]);
  }

  return [...appeles].filter((n) => !definis.has(n) && !GLOBAUX.has(n)).sort();
}

const MODULES_DU_PARCOURS = [
  'components/project-form/project-form.js',
  'js/forms/lead-context.js',
  'js/forms/project-payload.js',
  'js/forms/plan-handoff.js',
  'js/forms/departements.js',
  'js/forms/studio-handoff.js',
  'js/forms/api-config.js',
  'js/forms/submit-adapter.js',
  'js/commerce/premibel.js',
  'js/commerce/allure.js',
  'js/analytics/events.js',
];

for (const fichier of MODULES_DU_PARCOURS) {
  const inconnus = nomsNonDefinis(fichier);
  verifier(`${fichier} : tout nom appelé est défini`, inconnus.length === 0, inconnus.join(', '));
}

/*
 * Et le contrôle attrape-t-il vraiment ce qu'il prétend ?
 *
 * Un contrôle qui ne peut pas échouer ne vérifie rien. On lui donne le défaut
 * exact qui s'est produit — un appel à une fonction renommée — et on exige
 * qu'il le voie.
 */
const temoin = sansCommentairesNiChaines("import { a } from 'x';\nfunction b() { return utmDeLaVisite(); }\n");
const definisTemoin = new Set(['a', 'b']);
const appelesTemoin = [...temoin.matchAll(/(^|[^\w$.?])([a-z_$][\w$]*)\s*\(/g)]
  .map((m) => m[2])
  .filter((n) => !MOTS_CLES.has(n) && !definisTemoin.has(n) && !GLOBAUX.has(n));
verifier(
  'le contrôle sait échouer : un appel orphelin est vu',
  appelesTemoin.includes('utmDeLaVisite'),
  appelesTemoin.join(', ')
);


/* ------------------------------------------------------------------ */
/* §6 — La page publique dit la même règle que le code                 */
/* ------------------------------------------------------------------ */

titre('À propos : le tableau d’orientation ne peut pas mentir');

/*
 * POURQUOI CE CONTRÔLE.
 *
 * `/a-propos/` publie la règle d'orientation sous forme de tableau : pour
 * chaque besoin, ce qui est proposé hors Île-de-France et en Île-de-France.
 * C'est la deuxième écriture d'une règle qui n'en a qu'une de vraie, celle
 * de `destinationRecommandee`. Une page qui promet au lecteur autre chose
 * que ce que le formulaire applique serait pire qu'une page muette.
 *
 * On relit donc le tableau DANS LA PAGE CONSTRUITE — pas dans le gabarit —
 * et on compare chaque case à ce que rend la règle.
 */

const LIBELLES_ATTENDUS = {
  premibel: 'Premibel',
  allure_design: 'Allure Design',
  mixed: 'Premibel et Allure Design',
  undetermined: 'Aucune orientation automatique',
};

const BESOINS_PUBLIES = [
  ['produit', 'Des références de parquet'],
  ['pose', 'La pose, la rénovation intérieure'],
  ['produit-pose', 'Les deux'],
  ['renseignement', 'Un simple renseignement'],
];

const pageApropos = fs.existsSync(path.join(RACINE, 'a-propos/index.html'))
  ? lire('a-propos/index.html')
  : '';

verifier(
  'la page /a-propos/ est construite',
  pageApropos.length > 0,
  'lancer `node _generator/build.js` avant ce contrôle'
);

if (pageApropos) {
  const sansBalises = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const lignes = new Map();
  for (const m of pageApropos.matchAll(/<tr><th scope="row">([\s\S]*?)<\/tr>/g)) {
    const cases = [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => sansBalises(c[1]));
    if (cases.length === 3) lignes.set(cases[0], cases.slice(1));
  }

  for (const [besoin, libelle] of BESOINS_PUBLIES) {
    const ligne = lignes.get(libelle);
    verifier(`« ${libelle} » figure dans le tableau publié`, Boolean(ligne), [...lignes.keys()].join(' | '));
    if (!ligne) continue;
    for (const [i, idf] of [false, true].entries()) {
      const attendu = LIBELLES_ATTENDUS[REGLE.destinationRecommandee({ besoin, idf })];
      verifier(
        `${libelle}${idf ? ' en' : ' hors'} Île-de-France : la page dit ce que la règle applique`,
        ligne[i] === attendu,
        `page « ${ligne[i]} », règle « ${attendu} »`
      );
    }
  }

  /*
   * Et si la règle apprenait une destination que la page ne sait pas nommer ?
   * Le tableau afficherait un vide, sans que rien ne proteste.
   */
  verifier(
    'chaque destination possible a un libellé publiable',
    REGLE.LEAD_DESTINATIONS.every((d) => typeof LIBELLES_ATTENDUS[d] === 'string'),
    REGLE.LEAD_DESTINATIONS.filter((d) => !LIBELLES_ATTENDUS[d]).join(', ')
  );
}

/* ------------------------------------------------------------------ */
console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
console.log(
  `${REGLE.LEAD_NEEDS.length} besoins × 2 zones : aucune demande n’est orientée vers une entreprise qui ne peut pas la traiter.`
);
