const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');



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





titre('Routage : besoin × zone');



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



verifier(
  'un besoin inconnu ne produit jamais d’orientation',
  REGLE.destinationRecommandee({ besoin: 'parapente', idf: true }) === 'undetermined' &&
    REGLE.destinationRecommandee({}) === 'undetermined'
);



const horsZone = REGLE.LEAD_NEEDS.map((b) => [b, REGLE.destinationRecommandee({ besoin: b, idf: false })]);
verifier(
  'hors Île-de-France, aucun besoin n’oriente vers Allure Design',
  horsZone.every(([, d]) => d !== 'allure_design' && d !== 'mixed'),
  horsZone.filter(([, d]) => d === 'allure_design' || d === 'mixed').map(([b]) => b).join(', ')
);





titre('Zone d’intervention : le département fait foi');



verifier('la table couvre 101 départements', GEO.TOUS.length === 101, `${GEO.TOUS.length}`);
verifier('aucun département en double', new Set(GEO.TOUS).size === GEO.TOUS.length);
verifier(
  'la liste francilienne se déduit de la table',
  GEO.DEPARTEMENTS_IDF === GEO.REGIONS[GEO.ILE_DE_FRANCE] && GEO.DEPARTEMENTS_IDF.length === 8
);


for (const dep of ['75', '77', '78', '91', '92', '93', '94', '95']) {
  verifier(`${dep} est en Île-de-France`, GEO.estIdf(dep) && REGLE.dansZoneIdf({ department: dep }));
}


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



verifier('« 2a » devient « 2A »', GEO.normaliserDepartement('2a') === '2A');
verifier('« 6 » devient « 06 »', GEO.normaliserDepartement('6') === '06' && GEO.regionDe('6') !== '');
verifier('les espaces sont retirés', GEO.estIdf(' 92 ') === true);



verifier('975 : aucune région devinée', GEO.regionDe('975') === '' && !GEO.estIdf('975'));
verifier('département absent : hors zone', REGLE.dansZoneIdf({}) === false);
verifier('département illisible : hors zone', REGLE.dansZoneIdf({ department: 'abc' }) === false);





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





titre('Listes fermées : front, formulaire, serveur');

const fields = lire('backend/pose-parquet-core/src/Projects/Fields.php');


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



const geoPhp = lire('backend/pose-parquet-core/src/Projects/Departements.php');
const tablePhp = {};


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


const routage = lire('backend/pose-parquet-core/src/Projects/LeadRouting.php');
verifier(
  'aucune liste francilienne recopiée dans LeadRouting',
  !/'75'\s*,\s*'77'/.test(routage)
);
verifier(
  'aucune liste francilienne recopiée dans lead-context',
  !/'75'\s*,\s*'77'/.test(lire('js/forms/lead-context.js'))
);





titre('Garde-fous');



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


const ailleurs = ['js/studio/app.js', 'js/product/app.js', 'js/tools/floor-visualizer.js', 'components/project-form/project-form.js']
  .filter((f) => /allure_design|'mixed'/.test(lire(f)));
verifier(
  'aucune décision d’orientation écrite hors de lead-context.js',
  ailleurs.length === 0,
  ailleurs.join(', ')
);






titre('Modules : aucun nom appelé sans être défini');




const RETOUR = String.fromCharCode(10);
const ECHAP = String.fromCharCode(92);



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

  for (const m of src.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    m[1].split(',').forEach((x) => ajouter(x.replace(/[=:].*/, '').replace(/^\.\.\./, '').trim()));
  }

  for (const m of src.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) ajouter(m[2]);


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






titre('À propos : le tableau d’orientation ne peut pas mentir');




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



  verifier(
    'chaque destination possible a un libellé publiable',
    REGLE.LEAD_DESTINATIONS.every((d) => typeof LIBELLES_ATTENDUS[d] === 'string'),
    REGLE.LEAD_DESTINATIONS.filter((d) => !LIBELLES_ATTENDUS[d]).join(', ')
  );
}


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
