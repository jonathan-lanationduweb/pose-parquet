/**
 * PUBLIER LE SITE — le workflow fermé que WordPress déclenche
 * (Pose Parquet → Tableau de bord → « Publier le site »), en local.
 *
 *   node _generator/publier.js --etat <fichier d'état> --export <URL de l'export>
 *
 * Trois étapes, toujours les mêmes, dans cet ordre :
 *
 *   1. export      récupère l'export WordPress et les images nouvelles
 *                  (wordpress.js → tirer) ;
 *   2. validation  le valide (valider-wordpress.js) — une erreur structurante
 *                  arrête tout : l'instantané n'est pas écrit, le site ne
 *                  bouge pas ;
 *   3. build       construit le site (build.js), dans un processus à part,
 *                  avec un délai maximal.
 *
 * SI LE BUILD ÉCHOUE, le site précédent est rétabli : l'instantané d'avant
 * est remis en place et le site reconstruit à partir de lui — le build est
 * déterministe (check-reproducible), le site rétabli est donc octet pour
 * octet celui d'avant. Aucun site à moitié construit ne reste en place.
 *
 * Ce script ne reçoit AUCUNE commande. Ses deux arguments sont écrits par le
 * plugin (un fichier d'état dans wp-content, l'adresse REST de son propre
 * export) et contrôlés ici : le fichier d'état doit s'appeler
 * publication-etat.json, l'export doit être une URL http(s) se terminant par
 * /pose-parquet/v1/contenus. Rien d'autre n'est lu.
 *
 * L'état est écrit au fil de l'eau (écriture atomique) pour que WordPress
 * l'affiche : en cours / étape / succès / échec + raison lisible.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const INSTANTANE = path.join(RACINE, 'data', 'wordpress', 'contenus.json');
const DELAI_BUILD_MS = 4 * 60 * 1000;
const MAX_LIGNES = 12;

function argument(nom) {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? String(process.argv[i + 1] || '') : '';
}

const fichierEtat = argument('etat');
const urlExport = argument('export');
if (path.basename(fichierEtat) !== 'publication-etat.json' || !/^https?:\/\/[^\s"'<>]+\/pose-parquet\/v1\/contenus$/.test(urlExport)) {
  console.error('Usage : node _generator/publier.js --etat <…/publication-etat.json> --export <…/wp-json/pose-parquet/v1/contenus>');
  process.exit(2);
}

const debut = Date.now();
let etat = { version: 1, statut: 'en_cours', etape: 'export', debut: new Date(debut).toISOString(), pid: process.pid };

function ecrireEtat(maj) {
  etat = { ...etat, ...maj, maj: new Date().toISOString() };
  const tmp = `${fichierEtat}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(etat, null, 1));
  fs.renameSync(tmp, fichierEtat);
}

/** Les dernières lignes utiles d'une sortie : assez pour comprendre, pas un journal. */
const derniereLignes = (texte) => String(texte || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-MAX_LIGNES);

function construire() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js')], {
    cwd: RACINE,
    // Le générateur écrit dans SITE_ROOT : toujours le dépôt lui-même, quel que
    // soit le compte qui lance la publication (le service Apache n'a pas le
    // même dossier personnel que l'utilisateur).
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
  const avant = fs.existsSync(INSTANTANE) ? fs.readFileSync(INSTANTANE) : null;

  // 1-2. Export et validation (tirer n'écrit l'instantané qu'après validation).
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

  // 3. Build.
  ecrireEtat({ etape: 'build' });
  const injecte = process.env.PP_PUBLIER_TEST_ECHEC === 'build'; // recette seulement : simuler un build en échec
  const b = injecte ? { ok: false, raison: 'échec simulé (recette)', sortie: [] } : construire();
  if (!b.ok) {
    // Rétablir le site précédent : instantané d'avant, puis build déterministe.
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

  ecrireEtat({ statut: 'succes', etape: 'termine', empreinte: empreinte(), sortie: b.sortie.slice(-4), duree: Math.round((Date.now() - debut) / 1000) });
})().catch((e) => {
  try {
    ecrireEtat({ statut: 'echec', etape: etat.etape, raison: `Erreur inattendue : ${e.message}`, duree: Math.round((Date.now() - debut) / 1000) });
  } catch {
    /* état illisible : WordPress le signalera comme publication bloquée */
  }
  process.exit(1);
});
