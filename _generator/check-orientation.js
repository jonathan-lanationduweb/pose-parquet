/**
 * Contrôle : « Décrivez votre projet » est une PASSERELLE, pas un guichet.
 *
 *   node _generator/check-orientation.js        (après le build)
 *
 * POURQUOI. Jusqu'au 06/10/2026, le parcours se terminait par « Nous avons
 * reçu votre demande et nous vous répondrons par email ou par téléphone » —
 * alors que personne chez Pose-Parquet ne traite ces demandes. Il demandait
 * aussi nom, email et téléphone pour cette réponse qui ne viendrait pas.
 *
 * Désormais : on comprend, on qualifie, on ORIENTE — Premibel pour le
 * parquet, Allure Design pour la pose en Île-de-France, les deux pour un
 * projet complet — et le visiteur y va lui-même. Ce contrôle verrouille :
 * aucune donnée personnelle demandée, aucune promesse de rappel ou de
 * transmission, une orientation juste pour chaque combinaison besoin × zone,
 * des liens officiels, une mesure des clics sans donnée personnelle.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8');

let reussis = 0;
const echecs = [];
function verifier(nom, condition, detail = '') {
  if (condition) { reussis += 1; console.log(`  OK   ${nom}`); }
  else { echecs.push(nom + (detail ? ` — ${detail}` : '')); console.log(`  KO   ${nom}${detail ? ` — ${detail}` : ''}`); }
}
const titre = (t) => console.log(`\n== ${t} ==`);

/** Le code sans ses commentaires : on juge ce qui s'affiche, pas ce qui s'explique. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const { projectFormConfig } = require('../components/project-form/project-form.config.js');
const O = require('../js/forms/orientation.js');
const REGLE = require('../js/forms/lead-context.js');
const { EVENEMENTS } = require('../js/analytics/events.js');
const ALLURE = require('../js/commerce/allure.js');

/* ------------------------------------------------------------------ */
titre('Aucune donnée personnelle demandée');
const champs = projectFormConfig.steps.flatMap((s) => s.fields.map((f) => f.name));
const PII = ['prenom', 'nom', 'email', 'telephone', 'consentement', 'message'];
verifier(`aucun champ de contact (${PII.join(', ')})`, PII.every((n) => !champs.includes(n)), champs.filter((n) => PII.includes(n)).join(', '));
verifier('aucun champ de type email, tel ou consentement', projectFormConfig.steps.every((s) => s.fields.every((f) => !['email', 'tel', 'consent'].includes(f.type))));
verifier(`${projectFormConfig.steps.length} étapes de qualification`, projectFormConfig.steps.length === 4);
const utiles = ['departement', 'piece', 'surface', 'parquet', 'orientation', 'besoin', 'delai'];
verifier('les réponses qui servent à orienter sont toutes demandées', utiles.every((n) => champs.includes(n)), utiles.filter((n) => !champs.includes(n)).join(', '));
verifier('bouton final : « Voir comment avancer », pas « Envoyer ma demande »', projectFormConfig.submitLabel === 'Voir comment avancer');

/* ------------------------------------------------------------------ */
titre('Aucune promesse que personne ne tient');
const formulaire = sansCommentaires(lire('components/project-form/project-form.js'));
const orientationJs = sansCommentaires(lire('js/forms/orientation.js'));
const pageProjet = lire('projet/index.html');
const INTERDITS = [
  /nous vous r[ée]pondrons/i, /vous rappel/i, /vous contactera/i, /a été transmise/i, /transmettre votre demande/i,
  /Demande enregistrée/, /Envoyer ma demande/, /Conservez-la si vous souhaitez nous contacter/, /Vos coordonnées/, /recontact/i,
];
for (const [nom, texte] of [['formulaire', formulaire], ['orientation.js', orientationJs], ['page /projet/', pageProjet]]) {
  const trouves = INTERDITS.filter((re) => re.test(texte)).map(String);
  verifier(`${nom} : ni rappel, ni transmission, ni « demande enregistrée »`, trouves.length === 0, trouves.join(' '));
}
verifier('l’écran dit ce qui se passe : « nous vous orientons », le visiteur garde la main',
  /nous vous orientons/.test(orientationJs) && /il ne transmet pas votre projet/.test(formulaire));
verifier('titre de page après qualification : « Voici comment avancer. »', /titrePage\.textContent = 'Voici comment avancer\.'/.test(formulaire));
verifier('la colonne « Vous hésitez encore » cède la place à « Votre prochaine étape »', /<h3>Votre prochaine étape<\/h3>/.test(formulaire) && /colonne\.dataset\.etat = 'orientation'/.test(formulaire));
verifier('aucune référence de parcours montrée au visiteur (personne ne la lui demandera)', !/Référence du parcours/.test(formulaire));

/* ------------------------------------------------------------------ */
titre('Une orientation juste pour chaque besoin × zone');
const PRODUIT = { id: 'POINF39026', nom: 'Point de Hongrie Couronne Impériale 92x15x520', url: 'https://www.premibel.fr/parquet-flottant-chene-verni/POINF39026/', motif: 'point-de-hongrie' };
const BESOINS = ['produit', 'pose', 'produit-pose', 'renovation', 'renseignement', 'indetermine'];
let incoherences = [];
for (const besoin of BESOINS) {
  for (const idf of [true, false]) {
    const destination = REGLE.destinationRecommandee({ besoin, idf });
    const vue = O.orientation({ destination, besoin, idf, produit: PRODUIT });
    const qui = vue.etapes.map((e) => e.cible).join('+');
    const attendu = {
      premibel: 'premibel',
      allure_design: 'allure_design',
      mixed: 'premibel+allure_design',
    }[destination];
    if (attendu && qui !== attendu) incoherences.push(`${besoin}/${idf ? 'IDF' : 'hors IDF'} : ${qui} au lieu de ${attendu}`);
    // Jamais Allure Design pour un chantier hors Île-de-France.
    if (!idf && qui.includes('allure_design')) incoherences.push(`${besoin}/hors IDF : Allure Design proposé`);
    if (destination === 'undetermined' && !vue.preciser) incoherences.push(`${besoin}/${idf} : indéterminé sans « préciser »`);
  }
}
verifier(`${BESOINS.length * 2} combinaisons besoin × zone : destinations affichées = règle validée, jamais Allure hors IDF`, incoherences.length === 0, incoherences.join(' ; '));
const mixte = O.orientation({ destination: 'mixed', besoin: 'produit-pose', idf: true, produit: PRODUIT });
verifier('mixed : 01 le parquet chez Premibel, 02 la pose avec Allure Design', mixte.etapes[0].numero === 1 && mixte.etapes[0].cible === 'premibel' && mixte.etapes[1].numero === 2 && mixte.etapes[1].cible === 'allure_design');
const horsZone = O.orientation({ destination: 'premibel', besoin: 'produit-pose', idf: false });
verifier('parquet + pose hors IDF : Premibel, et la pose non couverte est dite', horsZone.etapes.length === 1 && /votre département n’en fait pas partie/.test(horsZone.note || ''));
const poseHors = O.orientation({ destination: 'undetermined', besoin: 'pose', idf: false });
verifier('pose hors IDF : « prochaine étape » utile (un poseur de sa région), pas « précisez parquet ou pose »', /poseur de votre région/.test(poseHors.prochaine) && !/le parquet ou la pose/.test(poseHors.prochaine));
verifier('« à Paris et en Île-de-France » (et non « à Paris et Île-de-France »)', !/à Paris et Île/.test(JSON.stringify([poseHors, mixte, horsZone])) && /à Paris et en Île-de-France/.test(JSON.stringify(mixte)));
verifier('indéterminé : « Votre projet demande encore une précision. »', O.orientation({ destination: 'undetermined', besoin: 'indetermine', idf: true }).titre === 'Votre projet demande encore une précision.');

/* ------------------------------------------------------------------ */
titre('Liens officiels, produit précis');
const host = (u) => new URL(u).hostname;
verifier('catalogue Premibel : https://www.premibel.fr/parquet/', O.PREMIBEL_CATALOGUE === 'https://www.premibel.fr/parquet/');
verifier('Allure Design : la page officielle de demande de devis', ALLURE.DEVIS === 'https://www.allure-design.com/demander-un-devis/' && host(ALLURE.DEVIS) === 'www.allure-design.com');
const avecProduit = O.orientation({ destination: 'premibel', besoin: 'produit', idf: true, produit: PRODUIT });
verifier('produit choisi : « Voir ce parquet chez Premibel » → sa fiche, pas premibel.fr générique', avecProduit.etapes[0].cta.url === PRODUIT.url && avecProduit.etapes[0].cta.libelle === 'Voir ce parquet chez Premibel');
const sansProduit = O.orientation({ destination: 'premibel', besoin: 'produit', idf: true });
verifier('sans produit : « Découvrir les parquets Premibel » → catalogue', sansProduit.etapes[0].cta.url === O.PREMIBEL_CATALOGUE);
const piege = O.orientation({ destination: 'premibel', besoin: 'produit', idf: true, produit: { id: 'X', url: 'https://premibel.fr.exemple.com/x' } });
verifier('adresse de fiche hors domaine Premibel : ignorée, catalogue à la place', piege.etapes[0].cta.url === O.PREMIBEL_CATALOGUE);
verifier('la fiche vient du catalogue publié, jamais de l’URL de la page', /fetch\(`\$\{base\}data\/products\.premibel\.json`/.test(formulaire) && /url: p\.productUrl/.test(formulaire));
verifier('liens sortants dans un nouvel onglet, sans opener', /target="_blank" rel="noopener" data-suivi=/.test(formulaire));

/* ------------------------------------------------------------------ */
titre('Récapitulatif et Visualiseur');
const recap = O.recapitulatif({ besoin: 'produit-pose', piece: 'sejour', surface: '35', parquet: 'inconnu', orientation: 'inconnu', produitNom: 'Couronne Impériale', motif: 'point-de-hongrie', departement: '92', idf: true, delai: '' });
verifier('récapitulatif : besoin, pièce, surface, parquet, motif, zone', JSON.stringify(recap.map((l) => l.libelle)) === JSON.stringify(['Besoin', 'Pièce', 'Surface', 'Parquet', 'Motif', 'Zone']) && recap[2].valeur === '35 m²' && recap[5].valeur === 'Île-de-France (92)');
verifier('« je ne sais pas » et les champs vides n’apparaissent pas', !recap.some((l) => /inconnu|undefined/.test(l.valeur)) && !recap.some((l) => l.libelle === 'Délai'));
const retour = O.lienVisualiseur('../', { sceneId: 'sejour', productId: 'POINF39026', pattern: 'point-de-hongrie', angle: 90 });
verifier('« Revoir dans le Visualiseur » rouvre la configuration (pièce, parquet, motif, orientation)', retour === '../outils/studio.html?piece=sejour&parquet=POINF39026&motif=point-de-hongrie&orientation=90', retour);
verifier('la photo personnelle n’est jamais reprise', !/photo|image|data:/.test(retour) && /Votre photo n’a pas quitté votre navigateur\./.test(formulaire));

/* ------------------------------------------------------------------ */
titre('Mesure du parcours, sans donnée personnelle');
verifier('événements connus : click_premibel, click_allure_design, view_orientation', ['click_premibel', 'click_allure_design', 'view_orientation', 'submit_project'].every((e) => EVENEMENTS.includes(e)));
verifier('nom d’événement selon l’entreprise', O.evenementClic('premibel') === 'click_premibel' && O.evenementClic('allure_design') === 'click_allure_design');
const ctx = O.contexteClic({ cible: 'premibel', besoin: 'produit-pose', destination: 'mixed', produit: PRODUIT, motif: 'point-de-hongrie', origine: 'visualiseur' });
verifier('contexte d’un clic Premibel : besoin, destination, produit/SKU, motif, origine', ctx.besoin === 'produit-pose' && ctx.destination === 'mixed' && ctx.sku === 'POINF39026' && ctx.motif === 'point-de-hongrie' && ctx.origine === 'visualiseur');
verifier('aucune donnée personnelle dans le contexte', Object.keys(ctx).every((k) => !/nom|email|phone|tel|prenom|ville|city/i.test(k)));
verifier('un clic Allure Design ne porte pas de produit', !('sku' in O.contexteClic({ cible: 'allure_design', produit: PRODUIT })));
verifier('pas de double comptage : le suivi global ignore les liens qui se mesurent eux-mêmes', /!lien\.hasAttribute\('data-suivi'\)/.test(lire('js/commerce/allure.js')));

/* ------------------------------------------------------------------ */
titre('WordPress : stockage sans coordonnées');
const champsPhp = lire('backend/pose-parquet-core/src/Projects/Fields.php');
verifier('coordonnées et consentement facultatifs dans le contrat', ['firstName', 'lastName', 'email', 'phone', 'consent'].every((c) => new RegExp(`'${c}'\\s*=> false`).test(champsPhp)));
verifier('pas de date de consentement sans consentement', /! empty\( \$data\['consent'\] \) \? \$now : null/.test(lire('backend/pose-parquet-core/src/Projects/Service.php')));
verifier('pas d’adresse : accusé de réception « skipped », jamais « échec »', /if \( \$project !== null && ! is_email\( \(string\) \( \$project\['email'\] \?\? '' \) \) \) \{\s*return false;/.test(lire('backend/pose-parquet-core/src/Mail/Notifier.php')));
verifier('administration : « Projets », plus « Demandes »', /__\( 'Projets', 'pose-parquet-core' \)/.test(lire('backend/pose-parquet-core/src/Admin/Menu.php')) && !/__\( 'Demandes'/.test(lire('backend/pose-parquet-core/src/Admin/Menu.php')));

console.log('');
if (echecs.length) {
  console.log(`${reussis} vérification(s) réussie(s), ${echecs.length} échec(s) :`);
  echecs.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(`${reussis} vérifications réussies, 0 échec.`);
