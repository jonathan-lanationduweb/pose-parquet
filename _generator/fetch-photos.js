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



async function resolveUrl(photo) {
  const html = await fetchText(photoPage(photo.id));
  const match = html.match(/https:\/\/images\.pexels\.com\/photos\/\d+\/[^"?]+\.(?:jpeg|jpg|png)/);
  if (!match) throw new Error(`Image introuvable pour la photo ${photo.id}`);
  const fm = photo.fm ? `&fm=${photo.fm}` : '';
  const crop = photo.crop ? `&crop=${photo.crop}` : '';
  return `${match[0]}?auto=compress&cs=tinysrgb${fm}${crop}&fit=crop&w=${photo.w}&h=${photo.h}`;
}


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


    ...INSPIRATION_PHOTOS.map((carte, index) => {
      const source = (carte.image && PHOTOS[carte.image]) || carte;
      return {
        name: `inspi-${index + 1}`,
        photo: { ...carte, id: source.id, crop: source.crop, credit: source.credit, w: 900, h: 700 },
      };
    }),
  ];

  let downloaded = 0;
  let skipped = 0;
  let total = 0;

  for (const { name, photo } of jobs) {


    if (photo.local) {
      const manquants = [`${name}.jpg`, ...variantsFor(name, photo).flatMap((v) => [`${name}-${v.w}.jpg`, `${name}-${v.w}.webp`])]
        .filter((f) => !fs.existsSync(path.join(DIR, f)));
      if (manquants.length) console.log(`! ${name} : local, mais absent — ${manquants.join(", ")}`);
      else console.log(`= ${name} : local, conservé`);
      skipped += 1;
      continue;
    }

    const base = await ensure(photo, path.join(DIR, `${name}.jpg`));
    total += base.size;
    if (base.fresh) downloaded += 1;
    else skipped += 1;


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
    'La plupart des photographies proviennent de [Pexels](https://www.pexels.com)',
    '(licence gratuite, usage commercial autorisé, attribution non obligatoire).',
    'Elles sont créditées ici par respect du travail des auteurs.',
    '',
    '| Fichier | Auteur | Source |',
    '| --- | --- | --- |',
    ...jobs.map(
      ({ name, photo }) =>
        `| \`${name}.jpg\` | ${photo.credit} | ${
          photo.local ? 'produit pour le site' : `[Pexels #${photo.id}](${photoPage(photo.id)})`
        } |`
    ),
    '',
    'Les visuels marqués « produit pour le site » ne sont pas des photographies :',
    'ils sont calculés par le moteur du visualiseur sur une scène calibrée, quand',
    'aucune photographie disponible n’illustre réellement le sujet de la page.',
    'Voir `_generator/photos.js` pour le détail de chacun.',
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
