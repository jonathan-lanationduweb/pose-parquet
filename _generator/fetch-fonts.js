/**
 * Télécharge et auto-héberge les polices du site (Google Fonts, licence OFL).
 *
 *   node _generator/fetch-fonts.js
 *
 * Aucune requête externe à l'exécution du site : les .woff2 sont copiés dans
 * assets/fonts/ et déclarés en @font-face dans css/fonts.css (généré ici).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'fonts');

// UA moderne : indispensable pour que Google Fonts renvoie du woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FAMILIES = [
  { css: 'Instrument+Serif:ital,wght@0,400;1,400', slug: 'instrument-serif' },
  { css: 'Inter:wght@400;500;600', slug: 'inter' },
];

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(get(res.headers.location, headers));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const faces = [];

  for (const family of FAMILIES) {
    const css = (
      await get(`https://fonts.googleapis.com/css2?family=${family.css}&display=swap`)
    ).toString('utf8');

    // On ne conserve que les sous-ensembles latin / latin-ext.
    const blocks = css.split('/*').filter((b) => /latin/.test(b) && !/vietnamese|cyrillic|greek/.test(b));
    let index = 0;

    for (const block of blocks) {
      const url = (block.match(/src:\s*url\((https:[^)]+\.woff2)\)/) || [])[1];
      if (!url) continue;
      const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
      const style = /font-style:\s*italic/.test(block) ? 'italic' : 'normal';
      const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
      const name = `${family.slug}-${weight}${style === 'italic' ? '-italic' : ''}-${index}.woff2`;
      index += 1;

      fs.writeFileSync(path.join(DIR, name), await get(url));
      const cssFamily = family.css.split(':')[0].replace(/\+/g, ' ');
      faces.push(
        `@font-face {\n  font-family: "${cssFamily}";\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url("../assets/fonts/${name}") format("woff2");${
          range ? `\n  unicode-range: ${range};` : ''
        }\n}`
      );
      process.stdout.write(`${name}\n`);
    }
  }

  fs.writeFileSync(
    path.join(ROOT, 'css', 'fonts.css'),
    `/* Polices auto-hébergées — généré par _generator/fetch-fonts.js\n   Instrument Serif et Inter, licence SIL Open Font License 1.1. */\n\n${faces.join(
      '\n\n'
    )}\n`,
    'utf8'
  );
  console.log(`\n${faces.length} fontes écrites dans assets/fonts, css/fonts.css régénéré.`);
}

main().catch((e) => {
  console.error('Échec :', e.message);
  process.exit(1);
});
