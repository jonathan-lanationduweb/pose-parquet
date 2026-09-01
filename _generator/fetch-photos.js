/**
 * Télécharge les photographies du site depuis Pexels vers assets/images/.
 *
 *   node _generator/fetch-photos.js           # ne télécharge que ce qui manque
 *   node _generator/fetch-photos.js --force   # retélécharge tout
 *
 * Écrit également assets/images/CREDITS.md (auteurs et liens sources).
 * Aucune dépendance externe, aucune clé d'API : les fichiers proviennent du
 * CDN public de Pexels aux dimensions demandées.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { PHOTOS, INSPIRATION_PHOTOS, pexelsUrl, photoPage } = require('./photos');
const { variantsFor } = require('./responsive');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'images');
const FORCE = process.argv.includes('--force');

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'pose-parquet-site/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects > 4) return reject(new Error('Trop de redirections'));
          return resolve(download(res.headers.location, dest, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} sur ${url}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(fs.statSync(dest).size)));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

/** Récupère une page et renvoie son contenu (utilisé pour retrouver une URL d'image). */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'pose-parquet-site/1.0' } }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

/**
 * Quelques fichiers Pexels ne suivent pas le nom de fichier standard :
 * on retombe alors sur l'URL déclarée par la page de la photo.
 */
async function resolveUrl(photo) {
  const html = await fetchText(photoPage(photo.id));
  const match = html.match(/https:\/\/images\.pexels\.com\/photos\/\d+\/[^"?]+\.(?:jpeg|jpg|png)/);
  if (!match) throw new Error(`Image introuvable pour la photo ${photo.id}`);
  const fm = photo.fm ? `&fm=${photo.fm}` : '';
  return `${match[0]}?auto=compress&cs=tinysrgb${fm}&fit=crop&w=${photo.w}&h=${photo.h}`;
}

/** Télécharge un fichier s'il manque ; renvoie sa taille. */
async function ensure(photo, dest) {
  if (!FORCE && fs.existsSync(dest)) return { size: fs.statSync(dest).size, fresh: false };
  let size;
  try {
    size = await download(pexelsUrl(photo), dest);
  } catch (error) {
    void error;
    size = await download(await resolveUrl(photo), dest);
  }
  return { size, fresh: true };
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  const jobs = [
    ...Object.entries(PHOTOS).map(([name, photo]) => ({ name, photo })),
    ...INSPIRATION_PHOTOS.map((photo, index) => ({
      name: `inspi-${index + 1}`,
      photo: { ...photo, w: 900, h: 700 },
    })),
  ];

  let downloaded = 0;
  let skipped = 0;
  let total = 0;

  for (const { name, photo } of jobs) {
    // Fichier de référence (repli des navigateurs sans srcset)
    const base = await ensure(photo, path.join(DIR, `${name}.jpg`));
    total += base.size;
    if (base.fresh) downloaded += 1;
    else skipped += 1;

    // Déclinaisons réactives : trois largeurs, en JPEG et en WebP
    for (const variant of variantsFor(name, photo)) {
      for (const [ext, fm] of [
        ['jpg', null],
        ['webp', 'webp'],
      ]) {
        const dest = path.join(DIR, `${name}-${variant.w}.${ext}`);
        const result = await ensure({ ...photo, ...variant, fm }, dest);
        total += result.size;
        if (result.fresh) downloaded += 1;
        else skipped += 1;
      }
    }
    process.stdout.write(`${name}  ${(base.size / 1024).toFixed(0)} Ko + déclinaisons\n`);
  }

  const credits = [
    '# Crédits photographiques',
    '',
    'Toutes les photographies proviennent de [Pexels](https://www.pexels.com)',
    '(licence gratuite, usage commercial autorisé, attribution non obligatoire).',
    'Elles sont créditées ici par respect du travail des auteurs.',
    '',
    '| Fichier | Auteur | Source |',
    '| --- | --- | --- |',
    ...jobs.map(
      ({ name, photo }) => `| \`${name}.jpg\` | ${photo.credit} | [Pexels #${photo.id}](${photoPage(photo.id)}) |`
    ),
    '',
    'Les schémas (`guide-sens-proportions.svg`, `lumiere-avant.svg`,',
    '`lumiere-apres.svg`) sont des illustrations vectorielles produites pour le site.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIR, 'CREDITS.md'), credits, 'utf8');

  console.log(
    `\n${downloaded} téléchargée(s), ${skipped} déjà présente(s) — ${(total / 1024 / 1024).toFixed(2)} Mo au total.`
  );
}

main().catch((error) => {
  console.error('Échec du téléchargement :', error.message);
  process.exit(1);
});
