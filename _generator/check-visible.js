/**
 * Contrôle : ce que le visiteur VOIT reste conforme aux règles validées.
 *
 *   node _generator/check-visible.js        (après le build)
 *
 * POURQUOI. Le 05/10/2026, des captures prises dans Chrome contredisaient des
 * rapports au vert : un aperçu collé à gauche avec une colonne vide, une
 * démonstration présentée comme une fiche au-dessus du catalogue Premibel, un
 * bandeau « ne peut pas encore envoyer » alors que l'API répondait. Chacun de
 * ces états est verrouillé ici. Le comportement réel (Chrome, 390 à 1920 px,
 * envoi POST 201) a été recetté ; ce contrôle empêche qu'il régresse.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');
const { CATALOGUE, NB_PREMIBEL } = require('./catalogue');
const PRODUIT = require('../js/scene/product.js');
const { normaliserConfig } = require('../js/scene/motifs-regles.js');

let reussis = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { reussis += 1; console.log(`  OK   ${nom}`); }
  else { echecs.push(nom + (detail ? ` — ${detail}` : '')); console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`); }
}
const titre = (t) => console.log(`\n== ${t} ==`);

/* ------------------------------------------------------------------ */
titre('Formulaire : l’état affiché suit la réponse de l’API');
const apiConfig = lire('js/forms/api-config.js');
const formulaire = lire('components/project-form/project-form.js');
/*
 * 06/10/2026 : le formulaire ne « fait plus une demande », il oriente
 * (js/forms/orientation.js). L'API n'enregistre que des statistiques : son
 * absence ou sa panne ne bloque plus rien, et il n'y a plus de bandeau
 * « ne peut pas encore envoyer votre demande ». Voir check-orientation.js.
 */
verifier('l’API est testée par /health (statut « ok » exigé)', /apiUrl\('\/health'\)/.test(apiConfig) && /corps\.status === 'ok'/.test(apiConfig));
verifier('1. plus aucun bandeau « ne peut pas envoyer » : rien à envoyer, tout s’oriente dans le navigateur',
  !/pf__offline/.test(formulaire) && !/ne peut pas encore envoyer/.test(formulaire) && !/submitBtn\.disabled = true;\s*submitBtn\.title/.test(formulaire));
verifier('2. API absente ou en panne : l’orientation s’affiche quand même (seule une validation refusée arrête)',
  /if \(code === ERREURS\.VALIDATION && appliquerErreursServeur\(erreur\.fields\)\) \{[\s\S]*?return;\s*\}\s*\}\s*sending = false;\s*sent = true;/.test(formulaire)
  && /await montrerOrientation\(donnees, qualification, reference\);/.test(formulaire));
verifier('hôte local non autorisé : jamais relié en production', /if \(Object\.prototype\.hasOwnProperty\.call\(PAR_HOTE, h\)\) return false;/.test(apiConfig));

/* ------------------------------------------------------------------ */
titre('Studio : démonstration ≠ catalogue Premibel');
const fiches = [...CATALOGUE.proposes, ...CATALOGUE.rejetes];
const demos = fiches.filter((f) => f.source !== 'premibel');
verifier(`3. aucune démonstration dans les ${NB_PREMIBEL} Premibel (${demos.length} démonstrations chargées)`,
  NB_PREMIBEL === fiches.filter((f) => f.source === 'premibel' && f.active).length && demos.every((f) => f.source === 'demonstration'));
const catalogJs = lire('js/studio/catalog.js');
verifier('le tiroir ne liste que des fiches Premibel', /catalog\.parquets\.filter\(\(m\) => m\.product && m\.product\.source === 'premibel'\)/.test(catalogJs));
const { ficheProduit } = require('../js/commerce/premibel.js');
const demoAvecCta = demos.filter((f) => ficheProduit(f));
verifier('4. aucune démonstration n’a de CTA Premibel (pas d’adresse de fiche)', demoAvecCta.length === 0, demoAvecCta.map((f) => f.id).join(', '));
const app = lire('js/studio/app.js');
verifier('démonstration : encadré « Configuration de démonstration », pas une fiche',
  /const demo = fiche\.source !== 'premibel';/.test(app) && /Configuration de démonstration/.test(app) && /data-choisir-premibel/.test(app));
const premibel = fiches.filter((f) => f.source === 'premibel' && f.active);
const sansCta = premibel.filter((f) => f.visualStatus !== 'unavailable' && !(ficheProduit(f) && ficheProduit(f).premibel));
verifier(`5. chaque référence Premibel visualisable a son CTA « Voir ce parquet chez Premibel »`, sansCta.length === 0, sansCta.slice(0, 6).map((f) => f.sku).join(', '));
verifier('5. badge de la sélection : fidèle seulement si ready', /fiche\.visualStatus === 'ready' \? 'Rendu fidèle' : 'Rendu indicatif'/.test(app));
const indispo = premibel.filter((f) => f.visualStatus === 'unavailable');
verifier(`6. les ${indispo.length} « Autres parquets » ne sont jamais proposés au rendu`, indispo.every((f) => !PRODUIT.estProposable(f)));
// Seule une carte AVEC matériau appelle le rendu (onSelect) ; une référence
// indisponible n'a pas de matériau et devient un lien vers sa fiche.
verifier('6. une carte indisponible est un lien vers la fiche, pas un bouton de rendu',
  /if \(e\.material\) \{[\s\S]*?onSelect\(e\.material\)[\s\S]*?\} else \{\s*el = document\.createElement\('a'\);\s*el\.href = e\.url;/.test(catalogJs));
verifier('l’adresse suit la sélection (aucune démonstration ne reste dans l’URL)', /function syncUrl\(\)/.test(app) && /syncUrl\(\);/.test(app));

/* ------------------------------------------------------------------ */
titre('7. Motif toujours compatible avec le produit');
let incoherents = 0;
const proposes = CATALOGUE.proposes;
for (const f of proposes.slice(0, 400)) {
  const m = PRODUIT.toMaterial(f);
  for (const motif of ['lames', 'point-de-hongrie', 'baton-rompu']) {
    const { config } = normaliserConfig({ materialId: m.id, pattern: motif }, m);
    if (!m.compatiblePatterns.includes(config.pattern)) incoherents += 1;
  }
}
verifier(`aucun couple produit / motif impossible après normalisation (${proposes.length} produits × 3 motifs)`, incoherents === 0, `${incoherents} cas`);
verifier('changement de produit et lien profond passent par normaliserConfig', (app.match(/normaliserConfig\(/g) || []).length >= 2);

/* ------------------------------------------------------------------ */
titre('Pages construites');
const accueil = lire('index.html');
const cssVz = lire('css/components/visualizer-photo.css');
verifier('accueil : le bloc Visualiseur prend la largeur réelle de la scène et se centre', /\.vzp \{ max-width: min\(76rem, calc\(min\(70svh, 620px\) \* 1\.6\)\); \}/.test(cssVz));
verifier('hero : deux phrases, sans « ; » isolé en début de ligne', /Premibel<\/strong>\. Pour la pose/.test(accueil) && !/<\/strong> ; pour la pose/.test(accueil));
verifier('hero : « Île-de-France » ne se coupe pas', /<span class="u-nowrap">Île-de-France<\/span>/.test(accueil) && /\.u-nowrap \{ white-space: nowrap; \}/.test(lire('css/global.css')));
const projet = lire('projet/index.html');
verifier('projet : titre « Décrivez votre projet »', /<h1 class="page-hero__title">Décrivez votre projet<\/h1>/.test(projet));
verifier('projet : promesse exacte (« avant de vous orienter »)', /comprendre votre besoin avant de vous orienter/.test(projet));

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
