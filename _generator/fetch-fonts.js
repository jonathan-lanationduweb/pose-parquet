const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'fonts');


const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FAMILIES = [
  { css: 'Instrument+Serif:ital,wght@0,400;1,400', slug: 'instrument-serif' },
  { css: 'Inter:wght@400;500;600', slug: 'inter' },
];



const PLAGE_VARIABLE = '100 900';

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


function estVariable(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'wOF2') return false;

  const nbTables = buffer.readUInt16BE(12);
  let pos = 48;
  for (let i = 0; i < nbTables; i++) {
    const flags = buffer[pos++];
    const index = flags & 0x3f;
    let tag;
    if (index === 63) {
      tag = buffer.toString('ascii', pos, pos + 4);
      pos += 4;
    } else {
      tag = index;
    }

    for (let n = 0; n < 2; n++) {
      const transfo = (flags >> 6) & 0x03;
      const aUneSeconde = (index === 10 || index === 11) ? transfo === 0 : transfo !== 0;
      if (n === 1 && !aUneSeconde) break;
      for (let k = 0; k < 5; k++) if ((buffer[pos++] & 0x80) === 0) break;
    }
    if (tag === 47 || tag === 'fvar') return true;
  }
  return false;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const faces = [];
  const parEmpreinte = new Map();
  const ecrits = [];

  for (const family of FAMILIES) {
    const css = (
      await get(`https://fonts.googleapis.com/css2?family=${family.css}&display=swap`)
    ).toString('utf8');
    const cssFamily = family.css.split(':')[0].replace(/\+/g, ' ');


    const blocks = css.split('/*').filter((b) => /latin/.test(b) && !/vietnamese|cyrillic|greek/.test(b));



    const lus = [];
    for (const block of blocks) {
      const url = (block.match(/src:\s*url\((https:[^)]+\.woff2)\)/) || [])[1];
      if (!url) continue;
      lus.push({
        url,
        weight: Number((block.match(/font-weight:\s*(\d+)/) || [])[1] || 400),
        style: /font-style:\s*italic/.test(block) ? 'italic' : 'normal',
        range: (block.match(/unicode-range:\s*([^;]+);/) || [])[1],
      });
    }


    const groupes = new Map();
    for (const bloc of lus) {
      const cle = `${bloc.url}|${bloc.style}|${bloc.range || ''}`;
      if (!groupes.has(cle)) groupes.set(cle, { ...bloc, weights: [] });
      groupes.get(cle).weights.push(bloc.weight);
    }

    let index = 0;
    for (const groupe of groupes.values()) {
      const binaire = await get(groupe.url);
      const empreinte = crypto.createHash('md5').update(binaire).digest('hex');
      const variable = estVariable(binaire);
      const min = Math.min(...groupe.weights);
      const max = Math.max(...groupe.weights);
      const poids = variable ? PLAGE_VARIABLE : (min === max ? String(min) : `${min} ${max}`);



      let nom = parEmpreinte.get(empreinte);
      if (!nom) {
        const suffixeStyle = groupe.style === 'italic' ? '-italic' : '';
        const suffixePoids = variable ? '-var' : `-${min === max ? min : `${min}-${max}`}`;
        nom = `${family.slug}${suffixePoids}${suffixeStyle}-${index}.woff2`;
        fs.writeFileSync(path.join(DIR, nom), binaire);
        parEmpreinte.set(empreinte, nom);
        ecrits.push({ nom, octets: binaire.length, variable, poids, graisses: groupe.weights.join('/') });
      }
      index += 1;

      faces.push(
        `@font-face {\n  font-family: "${cssFamily}";\n  font-style: ${groupe.style};\n  font-weight: ${poids};\n  font-display: swap;\n  src: url("../assets/fonts/${nom}") format("woff2");${
          groupe.range ? `\n  unicode-range: ${groupe.range};` : ''
        }\n}`
      );
    }
  }



  const gardes = new Set(ecrits.map((e) => e.nom));
  const retires = fs
    .readdirSync(DIR)
    .filter((n) => n.endsWith('.woff2') && !gardes.has(n));
  retires.forEach((n) => fs.unlinkSync(path.join(DIR, n)));

  fs.writeFileSync(
    path.join(ROOT, 'css', 'fonts.css'),
    `/* Polices auto-hébergées — généré par _generator/fetch-fonts.js\n` +
      `   Instrument Serif et Inter, licence SIL Open Font License 1.1.\n\n` +
      `   Un fichier par CONTENU, pas par graisse : Inter est variable, et le\n` +
      `   même binaire couvre 400, 500 et 600. Voir l'en-tête du générateur. */\n\n${faces.join(
        '\n\n'
      )}\n`,
    'utf8'
  );

  console.log('Fichiers écrits :');
  for (const e of ecrits) {
    console.log(
      `  ${e.nom.padEnd(34)} ${String(Math.round(e.octets / 1024)).padStart(3)} Ko  ` +
        `${e.variable ? 'variable' : 'statique'}  font-weight: ${e.poids}  (Google : ${e.graisses})`
    );
  }
  if (retires.length) console.log(`Retirés (ancienne convention) : ${retires.join(', ')}`);
  console.log(`\n${faces.length} déclarations @font-face pour ${ecrits.length} fichiers.`);
}

main().catch((e) => {
  console.error('Échec :', e.message);
  process.exit(1);
});
