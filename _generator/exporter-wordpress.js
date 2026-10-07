/**
 * Migration : les contenus du dépôt, prêts à être importés dans WordPress.
 *
 *   node _generator/exporter-wordpress.js
 *     → data/wordpress/import.json
 *   php backend/pose-parquet-core/tools/importer-contenus.php <racine WordPress> data/wordpress/import.json
 *   php backend/pose-parquet-core/tools/importer-champs.php   <racine WordPress> data/wordpress/import.json
 *     (champs structurés et « Mon site » seulement, sans rien écraser)
 *
 * Tout ce que le site publie aujourd'hui part : titre, slug, résumé, chapô,
 * corps (le HTML RENDU, composants compris), image et son crédit, SEO,
 * catégorie, date, FAQ, liens connexes. Les URLs ne bougent pas : le slug est
 * repris tel quel, et le générateur reconstruit les mêmes chemins.
 *
 * Ce script ne touche ni au site ni à WordPress : il écrit un fichier.
 */
const fs = require('fs');
const path = require('path');
const { GUIDES } = require('./content-guides');
const { TUTOS } = require('./content-tutos');
const { PAGES } = require('./content-pages');
const { SITE_CHAMPS } = require('./content-site');
const { PHOTOS, INSPIRATION_PHOTOS } = require('./photos');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'data', 'wordpress', 'import.json');

/** L'image d'origine (pleine taille) d'une clé de PHOTOS, si elle est sur le disque. */
function image(cle) {
  const p = PHOTOS[cle];
  if (!p) return null;
  const fichier = path.join(RACINE, 'assets', 'images', `${cle}.jpg`);
  if (!fs.existsSync(fichier)) return null;
  return { fichier, source: cle, alt: p.alt || '', credit: p.credit || '' };
}

/** La date injectée par build.js pour les tutoriels (ils n'en ont pas dans leurs données). */
const DATE_TUTORIELS = '2026-08-16';

const donnees = {
  version: 1,
  genere: new Date().toISOString(),
  guides: GUIDES.map((g, ordre) => ({
    slug: g.slug,
    titre: g.title,
    h1: g.h1,
    description: g.description,
    categorie: g.category,
    date: g.date,
    lecture: g.reading,
    resume: g.excerpt,
    intro: g.lead,
    tags: g.tags || [],
    related: g.related || [],
    faq: g.faq || [],
    corps: g.body,
    ordre,
    image: image(`cover-${g.slug}`),
  })),
  tutoriels: TUTOS.map((t, ordre) => ({
    slug: t.slug,
    titre: t.title,
    h1: t.h1,
    description: t.description,
    categorie: 'Tutoriel',
    date: DATE_TUTORIELS,
    lecture: t.reading,
    resume: t.excerpt,
    intro: t.lead,
    niveau: t.level,
    duree: t.duration,
    outils: t.tools || [],
    faq: t.faq || [],
    corps: t.body,
    ordre,
    image: image(`cover-${t.slug}`),
  })),
  inspirations: INSPIRATION_PHOTOS.map((i, ordre) => {
    const [motif, piece] = String(i.tags).split(' ');
    const sep = String(i.meta).indexOf(' · ');
    return {
      cle: i.image,
      id: i.id,
      titre: i.title,
      phrase: i.phrase,
      piece,
      motif,
      motifLibelle: sep >= 0 ? i.meta.slice(0, sep) : i.meta,
      teinte: sep >= 0 ? i.meta.slice(sep + 3) : '',
      taille: i.size,
      ordre,
      studio: {
        actif: Boolean(i.visualizerAvailable),
        bibliotheque: Boolean(i.showInRoomLibrary),
        scene: i.sceneId || '',
        parquet: (i.config && i.config.productId) || '',
        motif: (i.config && i.config.pattern) || '',
        orientation: (i.config && i.config.orientation) || 0,
      },
      // L'alt et le crédit de la CARTE (ils peuvent différer de ceux de la photo dans PHOTOS).
      image: Object.assign(image(i.image) || {}, { alt: i.alt, credit: i.credit }),
    };
  }),
  pages: Object.entries(PAGES).map(([cle, p]) => ({
    cle,
    nom: p.nom,
    adresse: p.adresse,
    ordre: p.ordre,
    textes: p.h1 !== null,
    h1: p.h1,
    chapo: p.chapo,
    titre: p.titre,
    description: p.description,
    corps: p.corps || null,
    // Champs structurés : schéma et valeurs par défaut (content-pages.js).
    // Importés par tools/importer-champs.php, qui n'écrase aucune saisie.
    champs: p.champs || null,
  })),
  // « Mon site » : schéma et valeurs par défaut (content-site.js).
  site: SITE_CHAMPS,
  maintenance: { image: image('room-piece-arcades') },
};

// Garde-fous : rien ne part incomplet.
const manques = [];
for (const g of [...donnees.guides, ...donnees.tutoriels]) {
  if (!g.slug || !g.h1 || !g.corps) manques.push(g.slug || '?');
}
for (const i of donnees.inspirations) if (!i.image.fichier) manques.push(`inspiration ${i.cle} : image absente`);
if (manques.length) {
  console.error('Export incomplet :', manques.join(', '));
  process.exit(1);
}

fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, JSON.stringify(donnees, null, 1));
const avecImage = (l) => l.filter((x) => x.image && x.image.fichier).length;
console.log(`data/wordpress/import.json : ${donnees.guides.length} guides (${avecImage(donnees.guides)} avec image), ${donnees.tutoriels.length} tutoriels (${avecImage(donnees.tutoriels)} avec image), ${donnees.inspirations.length} inspirations, ${donnees.pages.length} pages.`);
