/**
 * Télécharge et auto-héberge les polices du site (Google Fonts, licence OFL).
 *
 *   node _generator/fetch-fonts.js
 *
 * Aucune requête externe à l'exécution du site : les .woff2 sont copiés dans
 * assets/fonts/ et déclarés en @font-face dans css/fonts.css (généré ici).
 *
 * -----------------------------------------------------------------------------
 * LE MÊME FICHIER NE SE TÉLÉCHARGE PLUS TROIS FOIS
 * -----------------------------------------------------------------------------
 *
 * Relevé du 28/09/2026 sur assets/fonts/ :
 *
 *   inter-400-1.woff2  inter-500-3.woff2  inter-600-5.woff2   même MD5
 *   inter-400-0.woff2  inter-500-2.woff2  inter-600-4.woff2   même MD5
 *
 * Six fichiers, deux contenus. Inter est une police VARIABLE : Google sert un
 * seul binaire par sous-ensemble Unicode et se contente de faire varier le
 * descripteur `font-weight` d'un bloc @font-face à l'autre. Vérifié à la
 * source — la même URL `…SjIa2JL7SUc.woff2` revient pour 400, 500 et 600 — et
 * dans le binaire, qui porte les tables `fvar`, `gvar`, `avar` et `STAT`.
 *
 * Ce script recopiait chaque bloc sans regarder, sous un nom qui incluait la
 * graisse. Trois noms différents pour un seul contenu, donc trois URL
 * différentes à l'exécution, donc aucun partage de cache : l'accueil
 * téléchargeait 184 Ko de polices là où 90 suffisaient.
 *
 * La correction tient en une idée : ON GROUPE PAR CONTENU, PAS PAR GRAISSE.
 * Un binaire servi pour plusieurs graisses devient un seul fichier et un seul
 * @font-face portant une PLAGE de graisses (`font-weight: 100 900`), ce que
 * les navigateurs comprennent depuis 2018 et qui est précisément la manière
 * de déclarer une police variable. Pour une police statique, rien ne change :
 * un contenu, une graisse, un fichier.
 *
 * Bénéfice annexe, et pas le moindre : avec la plage complète, une demande de
 * 700 est honorée par l'axe au lieu d'être SYNTHÉTISÉE par le navigateur. Le
 * faux gras disparaît.
 *
 * `check-fonts.js` échoue si deux fichiers produits ont la même empreinte.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'fonts');

// UA moderne : indispensable pour que Google Fonts renvoie du woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FAMILIES = [
  { css: 'Instrument+Serif:ital,wght@0,400;1,400', slug: 'instrument-serif' },
  { css: 'Inter:wght@400;500;600', slug: 'inter' },
];

/**
 * Plage déclarée pour une police variable.
 *
 * On déclare l'axe entier plutôt que les seules graisses demandées à Google.
 * Le navigateur borne de lui-même à ce que la police sait faire, et une
 * feuille de style qui demandera 300 ou 700 demain sera servie sans qu'on ait
 * à repasser ici.
 */
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

/** Le binaire porte-t-il une table `fvar` ? Alors c'est une police variable. */
function estVariable(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'wOF2') return false;
  // Les tags connus de woff2 sont indexés ; `fvar` porte l'index 47.
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
    // Longueur originale, puis longueur transformée le cas échéant.
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
  const parEmpreinte = new Map(); // md5 → nom de fichier déjà écrit
  const ecrits = [];

  for (const family of FAMILIES) {
    const css = (
      await get(`https://fonts.googleapis.com/css2?family=${family.css}&display=swap`)
    ).toString('utf8');
    const cssFamily = family.css.split(':')[0].replace(/\+/g, ' ');

    // On ne conserve que les sous-ensembles latin / latin-ext.
    const blocks = css.split('/*').filter((b) => /latin/.test(b) && !/vietnamese|cyrillic|greek/.test(b));

    /*
     * Première passe : lire les blocs sans rien écrire.
     *
     * On ne peut pas décider du nom d'un fichier avant de savoir combien de
     * graisses partagent son contenu — d'où la lecture complète d'abord, le
     * regroupement ensuite.
     */
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

    /* Deuxième passe : grouper par (URL, style, sous-ensemble). */
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

      /*
       * Un même contenu servi sous deux clés — cela arriverait si Google
       * renvoyait la même URL pour deux sous-ensembles — ne s'écrit qu'une
       * fois. Le nom déjà posé est réutilisé.
       */
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

  /*
   * Les fichiers de l'ancienne convention de nommage ne servent plus. Les
   * laisser ferait grossir le dépôt d'octets que plus aucune page ne demande,
   * et brouillerait le prochain relevé d'empreintes.
   */
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
