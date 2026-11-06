/**
 * Teintes du Mode Plan, tirées du catalogue Premibel.
 *
 * Chaque référence Premibel visualisable est rattachée à une famille de
 * rendu (data/render-families.json), qui porte sa couleur de base. Le Mode
 * Plan propose une pastille par famille réellement présente dans le
 * catalogue Premibel actif : quand le catalogue est resynchronisé, la liste
 * suit au build suivant, sans retoucher le code de l'outil.
 *
 * Sortie : js/tools/plan-teintes.js (fichier généré, à ne pas modifier).
 */
const fs = require('fs');
const path = require('path');
const { ecrireTexte } = require('./eol');

const RACINE = path.join(__dirname, '..');
const lire = (relatif) => JSON.parse(fs.readFileSync(path.join(RACINE, relatif), 'utf8'));

/** rgb (0-255) → teinte, saturation, luminosité en entiers, comme le Mode Plan les attend. */
function hsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { hue: Math.round(h), sat: Math.round(s * 100), light: Math.round(l * 100) };
}

function teintesPlan() {
  const familles = lire('data/render-families.json').familles || {};
  const produits = (lire('data/products.premibel.json').produits || []).filter((p) => p.active && p.visualFamily);
  const compte = {};
  for (const p of produits) compte[p.visualFamily] = (compte[p.visualFamily] || 0) + 1;
  return Object.keys(compte)
    .filter((id) => familles[id] && familles[id].texture && Array.isArray(familles[id].texture.base))
    .map((id) => {
      const f = familles[id];
      return {
        id,
        label: String(f.label || id).replace(/^Chêne\s+/i, ''),
        famille: f.teinte || '',
        references: compte[id],
        luminance: f.luminance || 0,
        ...hsl(f.texture.base),
      };
    })
    // Du plus clair au plus foncé : l'ordre dans lequel on lit un nuancier.
    .sort((a, b) => b.luminance - a.luminance)
    .map(({ luminance, ...t }) => t);
}

function ecrirePlanTeintes() {
  const teintes = teintesPlan();
  if (!teintes.length) throw new Error('Mode Plan : aucune teinte Premibel trouvée (catalogue vide ?).');
  ecrireTexte(
    path.join(RACINE, 'js', 'tools', 'plan-teintes.js'),
    `/* Fichier généré par _generator/plan-teintes.js depuis le catalogue Premibel : ne pas modifier. */
export const PLAN_TEINTES = ${JSON.stringify(teintes, null, 2)};
`
  );
  return teintes;
}

module.exports = { ecrirePlanTeintes, teintesPlan };

if (require.main === module) console.log(ecrirePlanTeintes().map((t) => `${t.label} (${t.references})`).join(', '));
