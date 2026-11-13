const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const INSTANTANE = path.join(RACINE, 'data', 'wordpress', 'contenus.json');
const DELAI_BUILD_MS = 4 * 60 * 1000;
const DELAI_CATALOGUE_MS = 6 * 60 * 1000;
const MAX_LIGNES = 12;

function argument(nom) {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? String(process.argv[i + 1] || '') : '';
}

const fichierEtat = argument('etat');

const avecCatalogue = process.argv.includes('--catalogue');
const urlExport = argument('export');
if (path.basename(fichierEtat) !== 'publication-etat.json' || !/^https?:\/\/[^\s"'<>]+\/pose-parquet\/v1\/contenus$/.test(urlExport)) {
  console.error('Usage : node _generator/publier.js --etat <…/publication-etat.json> --export <…/wp-json/pose-parquet/v1/contenus>');
  process.exit(2);
}

const debut = Date.now();
let etat = { version: 1, statut: 'en_cours', etape: 'export', debut: new Date(debut).toISOString(), pid: process.pid };


const { ecrireAtomique } = require('./remplacement');

function ecrireEtat(maj) {
  etat = { ...etat, ...maj, maj: new Date().toISOString() };
  ecrireAtomique(fichierEtat, JSON.stringify(etat, null, 1));
}


const derniereLignes = (texte) => String(texte || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-MAX_LIGNES);



function synchroniserCatalogue() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'sync-premibel.js')], {
    cwd: RACINE,
    env: { ...process.env, SITE_ROOT: RACINE },
    encoding: 'utf8',
    timeout: DELAI_CATALOGUE_MS,
    windowsHide: true,
  });
  const ok = r.status === 0 && !r.error;
  return { ok, raison: ok ? '' : derniereLignes(r.stderr).slice(-1)[0] || `code de sortie ${r.status}` };
}

function construire() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js')], {
    cwd: RACINE,



    env: { ...process.env, SITE_ROOT: RACINE },
    encoding: 'utf8',
    timeout: DELAI_BUILD_MS,
    windowsHide: true,
  });
  const ok = r.status === 0 && !r.error;
  const raison = r.error && r.error.code === 'ETIMEDOUT'
    ? `le build a dépassé ${DELAI_BUILD_MS / 60000} minutes`
    : derniereLignes(r.stderr).filter((l) => /error|erreur|échec|exception/i.test(l)).slice(-1)[0] || derniereLignes(r.stderr).slice(-1)[0] || `code de sortie ${r.status}`;
  return { ok, raison, sortie: derniereLignes(`${r.stdout || ''}\n${r.stderr || ''}`) };
}

const empreinte = () => (fs.existsSync(INSTANTANE) ? crypto.createHash('sha1').update(fs.readFileSync(INSTANTANE)).digest('hex').slice(0, 12) : '');

(async () => {
  ecrireEtat({});
  let noteCatalogue = '';
  if (avecCatalogue) {
    ecrireEtat({ etape: 'catalogue' });
    const c = synchroniserCatalogue();
    noteCatalogue = c.ok ? 'catalogue Premibel synchronisé' : `catalogue Premibel NON synchronisé (${c.raison}) : le précédent est conservé`;
    ecrireEtat({ etape: 'export' });
  }
  const avant = fs.existsSync(INSTANTANE) ? fs.readFileSync(INSTANTANE) : null;


  const erreurs = [];
  const errOrigine = console.error;
  console.error = (...m) => { erreurs.push(m.join(' ')); errOrigine(...m); };
  try {
    const { tirer } = require('./wordpress');
    await tirer(urlExport);
  } catch (e) {
    console.error = errOrigine;
    const detail = erreurs.filter((l) => l.startsWith('[ERREUR]')).map((l) => l.replace('[ERREUR] ', ''));
    ecrireEtat({
      statut: 'echec',
      etape: 'validation',
      raison: detail.length ? `Contenu refusé : ${detail.slice(0, 3).join(' ; ')}${detail.length > 3 ? ` (+${detail.length - 3})` : ''}` : `Export WordPress illisible : ${e.message}`,
      siteIntact: true,
      duree: Math.round((Date.now() - debut) / 1000),
    });
    process.exit(1);
  }
  console.error = errOrigine;


  ecrireEtat({ etape: 'build' });
  const injecte = process.env.PP_PUBLIER_TEST_ECHEC === 'build';
  const b = injecte ? { ok: false, raison: 'échec simulé (recette)', sortie: [] } : construire();
  if (!b.ok) {

    if (avant) fs.writeFileSync(INSTANTANE, avant);
    else fs.rmSync(INSTANTANE, { force: true });
    const retour = construire();
    ecrireEtat({
      statut: 'echec',
      etape: 'build',
      raison: `Le build a échoué : ${b.raison}.`,
      siteIntact: retour.ok,
      retablissement: retour.ok ? 'site précédent reconstruit à l’identique' : `rétablissement impossible : ${retour.raison}`,
      sortie: b.sortie,
      duree: Math.round((Date.now() - debut) / 1000),
    });
    process.exit(1);
  }

  ecrireEtat({ statut: 'succes', etape: 'termine', empreinte: empreinte(), sortie: [...(noteCatalogue ? [noteCatalogue] : []), ...b.sortie.slice(-4)], duree: Math.round((Date.now() - debut) / 1000) });
})().catch((e) => {
  try {
    ecrireEtat({ statut: 'echec', etape: etat.etape, raison: `Erreur inattendue : ${e.message}`, duree: Math.round((Date.now() - debut) / 1000) });
  } catch {

  }
  process.exit(1);
});
