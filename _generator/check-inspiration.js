/**
 * Vérificateur du contrat Inspiration → Studio.
 *
 *   node _generator/check-inspiration.js
 *
 * Il existe parce qu'une page a un jour affiché huit cartes « Essayer ce
 * style » dont AUCUNE n'ouvrait la pièce montrée. Le défaut n'était pas une
 * faute de frappe : rien, dans le code, ne rapprochait la photo de la carte
 * de la photo de la scène. Ce fichier est ce rapprochement, et il est exécuté
 * par `build.js` avant d'écrire la page — un oubli ne peut donc pas passer.
 *
 * Ce qu'il vérifie, pour chaque carte qui se déclare essayable :
 *
 *   1. `sceneId` est renseigné ;
 *   2. la scène existe dans le manifeste ;
 *   3. sa géométrie ET son rendu sont validés (c'est la règle de publication
 *      du Visualiseur, pas une règle propre à cette page) ;
 *   4. `scene.file` est exactement `${carte.image}.jpg` — la carte montre la
 *      photographie que le Studio ouvrira ;
 *   5. les fichiers existent sur le disque, en original et dans la plus
 *      petite déclinaison réactive : sans quoi la carte afficherait un cadre
 *      vide, ou un `srcset` pointant sur un fichier absent ;
 *   6. `config` ne nomme que des produits et des motifs du catalogue, et une
 *      orientation que le Visualiseur accepte.
 *
 * `visualizerAvailable: true` signifie donc « essayable », pas « on aimerait ».
 * Une scène en cours de calibration se déclare `false` : la carte reste une
 * inspiration, sans pastille, et personne n'a menti.
 */
const fs = require('fs');
const path = require('path');
const { INSPIRATION_PHOTOS } = require('./photos');
const { widthsFor } = require('./responsive');

const RACINE = path.join(__dirname, '..');
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'));

const ORIENTATIONS = [0, 90, 45, -45];

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
    // Toute carte, essayable ou non, doit afficher un fichier qui existe —
    // l'original et chacune des largeurs annoncées dans le srcset.
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
    lignes.push([nom, carte.image, carte.sceneId, 'essayable']);
  }

  return { erreurs, lignes };
}

/** Utilisé par build.js : jette si le contrat est rompu. */
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
  console.log(`\n${essayables} / ${lignes.length} inspirations essayables.`);
  if (erreurs.length) {
    console.error(`\n${erreurs.length} incohérence(s) :`);
    for (const e of erreurs) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('Contrat vérifié : chaque carte essayable ouvre sa propre photographie.');
}

module.exports = { verifie, exigeCoherence };
