const fs = require('fs');
const path = require('path');
const { PHOTOS, INSPIRATION_PHOTOS } = require('./photos');
const { widthsFor } = require('./responsive');

const RACINE = path.join(__dirname, '..');
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'));

const ORIENTATIONS = [0, 90, 45, -45];



const ESSAYABLES_MINIMUM = 8;



function adresseStudio(carte) {
  const c = carte.config || {};
  const params = [
    `piece=${carte.sceneId}`,
    c.productId ? `parquet=${c.productId}` : null,
    c.pattern ? `motif=${c.pattern}` : null,
    Number.isFinite(c.orientation) ? `orientation=${c.orientation}` : null,
  ].filter(Boolean).join('&');
  return `../outils/studio.html?${params}`;
}



function chargeable(sceneId, entree) {
  const griefs = [];
  let scene;
  try {
    scene = lire(`data/scenes/${sceneId}.json`);
  } catch (error) {
    return [`data/scenes/${sceneId}.json illisible — ${error.message}`];
  }
  if (scene.id !== sceneId) griefs.push(`le fichier de scène porte l'identifiant « ${scene.id} » et non « ${sceneId} ».`);
  if (!scene.image || !scene.image.file) griefs.push('la scène ne déclare pas son image.');
  else {
    if (scene.image.file !== entree.file) griefs.push(`la scène charge ${scene.image.file}, le manifeste annonce ${entree.file}.`);
    if (!scene.image.width || !scene.image.height) griefs.push('les dimensions de l\'image manquent.');
    const base = scene.image.file.replace(/\.jpg$/, '');
    for (const f of [scene.image.file, `${base}-640.jpg`, `${base}-1120.jpg`]) {
      if (!fs.existsSync(path.join(RACINE, 'assets/images', f))) griefs.push(`${f} absent — le Studio le demande.`);
    }
  }
  const zones = Array.isArray(scene.floorZones) ? scene.floorZones : [];
  if (!zones.length) griefs.push('aucune zone de sol.');
  for (const z of zones) {
    const plan = (z.planeRef && scene.planes && scene.planes[z.planeRef]) || z.plane;
    if (!plan) griefs.push(`zone « ${z.id} » : aucun plan (planeRef « ${z.planeRef} » introuvable).`);
    else {
      if (!Array.isArray(plan.quad) || plan.quad.length !== 4) griefs.push(`zone « ${z.id} » : le quadrilatère n'a pas quatre sommets.`);
      if (!plan.meters || !(plan.meters.width > 0) || !(plan.meters.depth > 0)) griefs.push(`zone « ${z.id} » : mètres du plan absents ou nuls.`);
    }
    const contour = (z.mask && z.mask.polygon) || z.mask;
    if (!Array.isArray(contour) || contour.length < 3) griefs.push(`zone « ${z.id} » : contour de moins de trois sommets.`);
  }
  return griefs;
}

function verifie() {
  const manifeste = lire('data/scenes/index.json');
  const catalogue = lire('data/parquets.json');
  const produits = new Set((catalogue.parquets || []).map((p) => p.id));
  const motifs = new Set((catalogue.patterns || []).map((p) => p.id));
  const scenes = new Map((manifeste.scenes || []).map((s) => [s.id, s]));

  const erreurs = [];
  const lignes = [];

  for (const carte of INSPIRATION_PHOTOS) {
    const nom = carte.title;
    if (!carte.image) {
      erreurs.push(`${nom} : aucun champ \`image\`.`);
      continue;
    }


    const source = PHOTOS[carte.image];
    if (!source) {
      erreurs.push(`${nom} : \`image\` vaut « ${carte.image} », absent de PHOTOS.`);
    } else {
      if (source.id !== carte.id) {
        erreurs.push(
          `${nom} : la carte annonce Pexels ${carte.id}, mais sa photo `
            + `« ${carte.image} » est Pexels ${source.id}.`
        );
      }
      if (source.credit !== carte.credit) {
        erreurs.push(
          `${nom} : crédit « ${carte.credit} » sur la carte, `
            + `« ${source.credit} » sur sa photo « ${carte.image} ».`
        );
      }
    }



    const fichiers = [`${carte.image}.jpg`, ...widthsFor(carte.image).map((w) => `${carte.image}-${w}.jpg`)];
    for (const fichier of fichiers) {
      if (!fs.existsSync(path.join(RACINE, 'assets/images', fichier))) {
        erreurs.push(`${nom} : ${fichier} absent de assets/images/.`);
      }
    }

    if (!carte.visualizerAvailable) {
      lignes.push([nom, carte.image, '—', 'non essayable']);
      continue;
    }

    if (!carte.sceneId) {
      erreurs.push(`${nom} : \`visualizerAvailable\` sans \`sceneId\`.`);
      continue;
    }
    const scene = scenes.get(carte.sceneId);
    if (!scene) {
      erreurs.push(`${nom} : la scène « ${carte.sceneId} » n'est pas dans data/scenes/index.json.`);
      continue;
    }
    if (scene.geometryStatus !== 'validated' || scene.visualStatus !== 'validated') {
      erreurs.push(
        `${nom} : la scène « ${carte.sceneId} » n'est pas publiable `
          + `(géométrie ${scene.geometryStatus}, rendu ${scene.visualStatus}). `
          + 'Une carte essayable exige les deux validés.'
      );
      continue;
    }
    const attendu = `${carte.image}.jpg`;
    if (scene.file !== attendu) {
      erreurs.push(
        `${nom} : la carte affiche ${attendu}, la scène « ${carte.sceneId} » ouvre ${scene.file}. `
          + 'Ce sont deux photographies différentes.'
      );
      continue;
    }
    if (!fs.existsSync(path.join(RACINE, 'data/scenes', `${carte.sceneId}.json`))) {
      erreurs.push(`${nom} : data/scenes/${carte.sceneId}.json absent.`);
      continue;
    }
    const c = carte.config || {};
    if (c.productId && !produits.has(c.productId)) erreurs.push(`${nom} : parquet « ${c.productId} » hors catalogue.`);
    if (c.pattern && !motifs.has(c.pattern)) erreurs.push(`${nom} : motif « ${c.pattern} » hors catalogue.`);
    if (c.orientation !== undefined && !ORIENTATIONS.includes(c.orientation)) {
      erreurs.push(`${nom} : orientation ${c.orientation} non acceptée (${ORIENTATIONS.join(', ')}).`);
    }

    for (const grief of chargeable(carte.sceneId, scene)) erreurs.push(`${nom} : ${grief}`);


    const url = adresseStudio(carte);
    const p = new URLSearchParams(url.split('?')[1] || '');
    if (p.get('piece') !== carte.sceneId) erreurs.push(`${nom} : l'adresse produite ouvre « ${p.get('piece')} » et non « ${carte.sceneId} ».`);
    if (c.productId && p.get('parquet') !== c.productId) erreurs.push(`${nom} : parquet absent de l'adresse.`);
    if (c.pattern && p.get('motif') !== c.pattern) erreurs.push(`${nom} : motif absent de l'adresse.`);
    if (c.orientation !== undefined && p.get('orientation') !== String(c.orientation)) erreurs.push(`${nom} : orientation absente de l'adresse.`);

    lignes.push([nom, carte.image, carte.sceneId, 'essayable', url]);
  }

  const essayables = lignes.filter((l) => l[3] === 'essayable').length;
  if (essayables < ESSAYABLES_MINIMUM) {
    erreurs.push(
      `${essayables} carte(s) essayable(s) sur ${lignes.length}, alors que le plancher est ${ESSAYABLES_MINIMUM}. `
        + 'Une carte a cessé d\'être essayable : scène rétrogradée, sceneId retiré, ou image désaccordée. '
        + 'Corriger la cause, ou baisser ESSAYABLES_MINIMUM en connaissance de cause.'
    );
  }



  for (const entree of manifeste.scenes || []) {
    const publiable = entree.geometryStatus === 'validated' && entree.visualStatus === 'validated';
    if (!publiable) continue;
    if (lignes.some((l) => l[2] === entree.id)) continue;
    for (const grief of chargeable(entree.id, entree)) {
      erreurs.push(`scène « ${entree.id} » (manifeste, hors carte) : ${grief}`);
    }
  }

  return { erreurs, lignes, essayables };
}


function exigeCoherence() {
  const { erreurs } = verifie();
  if (erreurs.length) {
    throw new Error(`Contrat Inspiration → Studio rompu :\n  - ${erreurs.join('\n  - ')}`);
  }
}

if (require.main === module) {
  const { erreurs, lignes } = verifie();
  const large = Math.max(...lignes.map((l) => l[0].length));
  for (const [nom, image, scene, etat] of lignes) {
    console.log(`  ${etat === 'essayable' ? '✓' : '·'} ${nom.padEnd(large)}  ${image.padEnd(26)} ${String(scene).padEnd(20)} ${etat}`);
  }
  const essayables = lignes.filter((l) => l[3] === 'essayable').length;
  console.log(`\n${essayables} / ${lignes.length} inspirations essayables (plancher : ${ESSAYABLES_MINIMUM}).`);
  if (erreurs.length) {
    console.error(`\n${erreurs.length} incohérence(s) :`);
    for (const e of erreurs) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('Contrat vérifié : chaque carte essayable ouvre sa propre photographie.');
}

module.exports = { verifie, exigeCoherence };
