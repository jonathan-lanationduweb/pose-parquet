/**
 * État du catalogue Premibel, publié pour l'administration WordPress.
 *
 *   node _generator/build.js  →  data/catalogue-etat.json
 *
 * WordPress (Pose Parquet → Catalogue Premibel) le LIT sur le site public : il
 * ne synchronise rien et ne modifie aucun produit. Le catalogue reste piloté
 * par `node _generator/sync-premibel.js`, puis le build.
 *
 * Les chiffres viennent des modules qui font foi — aucune règle n'est
 * réécrite ici :
 *   - statuts de rendu EFFECTIFS (profils de matière appliqués) : catalogue.js ;
 *   - rapport de la dernière synchronisation : data/products.premibel.json ;
 *   - photos partagées entre références : vignettes-qualite.js, comme
 *     check-catalogue-premibel.js.
 *
 * Déterministe (aucune date de build) : même source, mêmes octets.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');

function etatCatalogue() {
  const { CATALOGUE } = require('./catalogue.js');
  const QUALITE = require('./vignettes-qualite.js');
  const doc = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'products.premibel.json'), 'utf8'));
  const rapport = doc.rapport || {};
  const vignettes = rapport.vignettes || {};

  const fiches = [...CATALOGUE.proposes, ...CATALOGUE.rejetes].filter((f) => f.source === 'premibel' && f.active !== false);
  const statuts = { ready: 0, approximate: 0, unavailable: 0 };
  for (const f of fiches) statuts[f.visualStatus] = (statuts[f.visualStatus] || 0) + 1;

  // Photos partagées : même calcul que check-catalogue-premibel.js.
  const actives = (doc.produits || []).filter((p) => p.active !== false);
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'premibel-thumbs.json'), 'utf8'));
  const ecartees = new Set(actives.filter((p) => p.thumbnailIssue === 'placeholder').map((p) => p.sku));
  const avecEmpreinte = actives.filter((p) => index[p.sku] && index[p.sku].empreinte).map((p) => p.sku);
  const parSku = new Map(actives.map((p) => [p.sku, p]));
  const groupes = QUALITE.groupesPhotos(avecEmpreinte, index).map((skus) => QUALITE.classerGroupe(skus.map((s) => parSku.get(s)), ecartees));
  const parGravite = groupes.reduce((a, g) => ((a[g.gravite] = (a[g.gravite] || 0) + 1), a), {});

  const ecarteesRapport = vignettes.ecartees || [];
  return {
    version: 1,
    derniereSynchro: doc.generatedAt || null,
    source: doc.endpoint || null,
    commande: 'node _generator/sync-premibel.js puis node _generator/build.js',
    produitsApi: rapport.produitsApi || null,
    produits: fiches.length,
    inactifs: rapport.inactifs || 0,
    statuts,
    visualisables: statuts.ready + statuts.approximate,
    images: {
      erreurs: (vignettes.detailEchecs || []).length,
      ecartees: ecarteesRapport.length,
      placeholders: ecarteesRapport.filter((e) => e.type === 'placeholder').length,
      bandeaux: ecarteesRapport.filter((e) => e.type === 'bandeau-commercial').length,
    },
    photosPartagees: {
      groupes: groupes.length,
      douteux: parGravite.warning || 0,
      erreurs: parGravite.error || 0,
    },
  };
}

module.exports = { etatCatalogue };

if (require.main === module) console.log(JSON.stringify(etatCatalogue(), null, 1));
