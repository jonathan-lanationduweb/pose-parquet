const fs = require('fs');
const path = require('path');
const { SITE_CHAMPS, REGLAGES } = require('./content-site');
const { valider } = require('./valider-wordpress');

const RACINE = path.join(__dirname, '..');
const INSTANTANE = path.join(RACINE, 'data', 'wordpress', 'contenus.json');
const IMAGES = path.join(RACINE, 'assets', 'images');
const URL_DEFAUT = process.env.PP_WORDPRESS_CONTENUS || 'http://pose-parquet-dev.local/wp-json/pose-parquet/v1/contenus';

function charger() {
  if (process.env.PP_SANS_WORDPRESS === '1') return null;
  if (!fs.existsSync(INSTANTANE)) return null;
  const d = JSON.parse(fs.readFileSync(INSTANTANE, 'utf8'));
  if (!d || d.version !== 1) throw new Error('data/wordpress/contenus.json : version inconnue.');
  return d;
}


const nomWp = (image) => `wp-${image.id}`;


function largeursRetenues(image) {
  const toutes = (image.tailles || []).filter((t) => t.largeur >= 400 && t.largeur <= 1600);
  const choix = [];
  for (const cible of [560, 980, 1400]) {
    const t = toutes.slice().sort((a, b) => Math.abs(a.largeur - cible) - Math.abs(b.largeur - cible))[0];
    if (t && !choix.some((c) => c.largeur === t.largeur)) choix.push(t);
  }
  return choix.sort((a, b) => a.largeur - b.largeur);
}



function declarerImage(PHOTOS, image, avertir) {
  if (!image) return null;
  if (image.source && PHOTOS[image.source]) return image.source;
  const cle = nomWp(image);
  const largeurs = largeursRetenues(image).map((t) => t.largeur);
  if (!fs.existsSync(path.join(IMAGES, `${cle}.jpg`))) {
    avertir(`image WordPress #${image.id} absente du disque : lancez « node _generator/wordpress.js pull ».`);
    return null;
  }
  PHOTOS[cle] = {
    w: image.largeur,
    h: image.hauteur,
    alt: image.alt || '',
    credit: image.credit || '',
    local: true,
    jpgSeulement: true,
    largeurs,
  };
  return cle;
}


function couverture(PHOTOS, slug, image, avertir) {
  const cle = `cover-${slug}`;
  const choisie = declarerImage(PHOTOS, image, avertir);
  if (!choisie) {
    delete PHOTOS[cle];
    return;
  }
  if (choisie === cle) {
    if (image.alt) PHOTOS[cle] = { ...PHOTOS[cle], alt: image.alt };
    return;
  }
  PHOTOS[cle] = { ...PHOTOS[choisie], alias: choisie, alt: image.alt || PHOTOS[choisie].alt || '' };
}



function lectureEstimee(html) {
  const mots = String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(mots / 200))} min`;
}


const fichierIdentite = (image) => `wp-${image.id}${(path.extname(new URL(image.url).pathname) || '.png').toLowerCase()}`;
const TYPES_IMAGE = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif' };



function valeurChamp(def, v, avertir, lieu) {
  if (v === undefined || v === null) return undefined;
  if (def.type === 'oui-non') return typeof v === 'boolean' ? v : undefined;
  if (def.type === 'image') {
    if (!v || typeof v !== 'object') return 0;
    const nom = fichierIdentite(v);
    if (!fs.existsSync(path.join(IMAGES, nom))) {
      avertir(`${lieu} → ${def.libelle} : image #${v.id} absente du disque, lancez « node _generator/wordpress.js pull ».`);
      return undefined;
    }
    return { chemin: `assets/images/${nom}`, type: TYPES_IMAGE[path.extname(nom)] || 'image/png', largeur: v.largeur || 0, hauteur: v.hauteur || 0 };
  }
  return typeof v === 'string' && v.trim() ? v : undefined;
}


function remplacer(tableau, nouveau) {
  tableau.splice(0, tableau.length, ...nouveau);
}





const INTACTS = new Set(['corps', 'champs', 'url', 'id', 'fichier', 'sha']);
function texteSur(valeur, cle = '') {
  if (INTACTS.has(cle)) return valeur;
  if (typeof valeur === 'string') {

    return valeur.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”');
  }
  if (Array.isArray(valeur)) return valeur.map((v) => texteSur(v));
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, texteSur(v, k)]));
  }
  return valeur;
}

function appliquer({ GUIDES, TUTOS, ARTICLES = [], PAGES, INSPIRATION_PHOTOS, PHOTOS }) {
  const brut = charger();

  const wp = brut && {
    ...brut,
    guides: texteSur(brut.guides || []),
    tutoriels: texteSur(brut.tutoriels || []),
    articles: texteSur(brut.articles || []),
    inspirations: texteSur(brut.inspirations || []),
    pages: texteSur(brut.pages || []),
  };
  const avertissements = [];
  const avertir = (m) => avertissements.push(m);
  if (!wp) return { actif: false, maintenance: null, avertissements };


  const parSlug = new Map(GUIDES.map((g) => [g.slug, g]));
  const guides = (wp.guides || []).map((g) => {
    const base = parSlug.get(g.slug) || { slug: g.slug, cover: { seed: 0, variant: 0 }, tags: [], related: [], faq: [] };
    couverture(PHOTOS, g.slug, g.image, avertir);
    return {
      ...base,
      title: g.titre || base.title || `${g.h1} | Pose Parquet`,
      h1: g.h1,
      description: g.description,
      category: g.categorie || base.category || '',
      date: g.date || base.date,
      reading: g.lecture || base.reading || lectureEstimee(g.corps),
      excerpt: g.resume,
      lead: g.intro,
      tags: Array.isArray(g.tags) ? g.tags : base.tags,
      related: Array.isArray(g.related) ? g.related : base.related,
      faq: Array.isArray(g.faq) ? g.faq : base.faq,
      body: g.corps,
    };
  });
  for (const g of GUIDES) {
    if (!guides.some((x) => x.slug === g.slug)) {
      avertir(`guide « ${g.slug} » absent de WordPress (brouillon ?) : page conservée depuis le dépôt pour ne pas casser son URL.`);
      guides.push(g);
    }
  }
  remplacer(GUIDES, guides);


  const tutoParSlug = new Map(TUTOS.map((t) => [t.slug, t]));
  const tutos = (wp.tutoriels || []).map((t) => {
    const base = tutoParSlug.get(t.slug) || { slug: t.slug, tools: [], faq: [] };
    couverture(PHOTOS, t.slug, t.image, avertir);
    return {
      ...base,
      title: t.titre || base.title || `${t.h1} | Pose Parquet`,
      h1: t.h1,
      description: t.description,
      level: t.niveau || base.level || '',
      duration: t.duree || base.duration || '',
      reading: t.lecture || base.reading || lectureEstimee(t.corps),
      excerpt: t.resume,
      lead: t.intro,
      tools: Array.isArray(t.outils) && t.outils.length ? t.outils : base.tools,
      faq: Array.isArray(t.faq) ? t.faq : base.faq,
      body: t.corps,
      date: t.date,
    };
  });
  for (const t of TUTOS) {
    if (!tutos.some((x) => x.slug === t.slug)) {
      avertir(`tutoriel « ${t.slug} » absent de WordPress : page conservée depuis le dépôt.`);
      tutos.push(t);
    }
  }
  remplacer(TUTOS, tutos);


  remplacer(
    ARTICLES,
    (wp.articles || []).map((a) => {
      couverture(PHOTOS, a.slug, a.image, avertir);
      return {
        slug: a.slug,
        title: a.titre || `${a.h1} | Pose Parquet`,
        h1: a.h1,
        description: a.description,
        category: a.categorie || '',
        date: a.date,
        reading: a.lecture || lectureEstimee(a.corps),
        excerpt: a.resume,
        lead: a.intro,
        faq: Array.isArray(a.faq) ? a.faq : [],
        tags: [],
        related: [],
        body: a.corps,
      };
    })
  );


  if (wp.site && typeof wp.site === 'object') {
    for (const def of SITE_CHAMPS) {
      const v = valeurChamp(def, wp.site[def.cle], avertir, 'Mon site');
      if (v !== undefined) REGLAGES[def.cle] = v;
    }
  }


  for (const p of wp.pages || []) {
    const cible = PAGES[p.cle];
    if (!cible) continue;
    if (p.titre) cible.titre = p.titre;
    if (p.description) cible.description = p.description;
    if (cible.h1 !== null && p.h1) cible.h1 = p.h1;
    if (cible.chapo !== null && p.chapo) cible.chapo = p.chapo;
    if (typeof cible.corps === 'string' && typeof p.corps === 'string' && p.corps.trim()) cible.corps = p.corps;

    if (cible.champs && p.champs && typeof p.champs === 'object') {
      for (const def of cible.champs) {
        const v = valeurChamp(def, p.champs[def.cle], avertir, `page « ${p.cle} »`);
        if (v !== undefined) cible.valeurs[def.cle] = v;
      }
    }
  }


  const inspiParCle = new Map(INSPIRATION_PHOTOS.map((i) => [i.image, i]));
  const inspirations = (wp.inspirations || []).map((i) => {
    const base = inspiParCle.get(i.cle) || {};
    const cle = declarerImage(PHOTOS, i.image, avertir) || base.image;
    if (!cle) {
      avertir(`inspiration « ${i.titre} » sans image : non publiée.`);
      return null;
    }
    const s = i.studio || {};
    return {
      ...base,
      id: i.id || base.id,
      tags: `${i.motif} ${i.piece}`,
      credit: (i.image && i.image.credit) || base.credit || '',
      title: i.titre,
      meta: i.teinte ? `${i.motifLibelle} · ${i.teinte}` : i.motifLibelle,
      size: i.taille || base.size || 'md',
      alt: (i.image && i.image.alt) || base.alt || '',
      phrase: i.phrase,
      image: cle,
      sceneId: s.scene || base.sceneId,
      visualizerAvailable: Boolean(s.actif),
      showInRoomLibrary: Boolean(s.bibliotheque),
      config: { productId: s.parquet || '', pattern: s.motif || 'lames', orientation: Number(s.orientation) || 0 },
    };
  }).filter(Boolean);
  if (inspirations.length) remplacer(INSPIRATION_PHOTOS, inspirations);


  const m = wp.maintenance || null;
  let maintenance = null;
  if (m) {
    const fond = m.image ? declarerImage(PHOTOS, m.image, avertir) : null;
    maintenance = { ...m, fond };
  }
  return { actif: true, maintenance, avertissements };
}





const SYMBOL_PATH = 'M0 0H0.3396V0.5584L0 0.6396ZM0 0.6599L0.3396 0.5787V1H0ZM0.4057 0H0.7453V0.2437L0.4057 0.3249ZM0.4057 0.3452L0.7453 0.264V1H0.4057ZM0.8208 0H1V0.5584L0.8208 0.6012ZM0.8208 0.6215L1 0.5787V1H0.8208Z';
const echapper = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);



function pageMaintenance(m) {
  const css = fs.readFileSync(path.join(RACINE, 'backend', 'pose-parquet-core', 'assets', 'maintenance.css'), 'utf8');
  const liens = [];
  if (m.liens && m.liens.premibel) liens.push(['https://www.premibel.fr/parquet/', 'Découvrir Premibel', 'Trouver un parquet', 'clair']);
  if (m.liens && m.liens.allure) liens.push(['https://www.allure-design.com/demander-un-devis/', 'Découvrir Allure Design', 'Pose et rénovation', 'sombre']);
  const fond = m.fond ? ` style="background-image:url('assets/images/${m.fond}.jpg')"` : '';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${echapper(m.titre)} — Pose Parquet</title>
<style>
@font-face { font-family: "Instrument Serif"; font-style: normal; font-weight: 400; font-display: swap; src: url("assets/fonts/instrument-serif-400-3.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-style: normal; font-weight: 100 900; font-display: swap; src: url("assets/fonts/inter-var-1.woff2") format("woff2"); }
${css}</style>
</head>
<body>
<main class="pm"${fond}>
  <span class="pm__marque" aria-label="Pose Parquet"><svg viewBox="0 0 106 197" fill="currentColor" aria-hidden="true"><g transform="scale(106 197)"><path d="${SYMBOL_PATH}"/></g></svg>Pose <span>Parquet</span></span>
  <div class="pm__corps">
    <h1 class="pm__titre">${echapper(m.titre)}</h1>
    <p class="pm__texte">${echapper(m.message)}</p>
${liens.length ? `    <div class="pm__liens">
${liens.map(([url, titre, sous, classe]) => `      <a class="pm__lien pm__lien--${classe}" href="${url}">${echapper(titre)}<small>${echapper(sous)} →</small></a>`).join('\n')}
    </div>
` : ''}  </div>
</main>
</body>
</html>
`;
}





async function telecharger(url, cible) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  fs.writeFileSync(cible, Buffer.from(await r.arrayBuffer()));
}

async function tirer(url = URL_DEFAUT) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Export WordPress injoignable : ${url} → HTTP ${r.status}`);
  const d = await r.json();
  if (!d || d.version !== 1) throw new Error('Export WordPress : version inconnue.');


  const { erreurs, avertissements } = valider(d);
  avertissements.forEach((m) => console.warn(`[avertissement] ${m}`));
  if (erreurs.length) {
    erreurs.forEach((m) => console.error(`[ERREUR] ${m}`));
    throw new Error(`Export WordPress refusé : ${erreurs.length} erreur(s). L'instantané précédent est conservé.`);
  }


  const images = [
    ...(d.guides || []).map((x) => x.image),
    ...(d.tutoriels || []).map((x) => x.image),
    ...(d.articles || []).map((x) => x.image),
    ...(d.inspirations || []).map((x) => x.image),
    d.maintenance && d.maintenance.image,
  ].filter((i) => i && !i.source);


  images.push(...[...(d.guides || []), ...(d.tutoriels || []), ...(d.articles || []), ...(d.pages || [])].flatMap((x) => x.medias || []));
  let n = 0;
  for (const image of images) {
    const nom = nomWp(image);
    const plein = path.join(IMAGES, `${nom}.jpg`);
    if (!fs.existsSync(plein)) {
      await telecharger(image.url, plein);
      n += 1;
    }
    for (const t of largeursRetenues(image)) {
      const f = path.join(IMAGES, `${nom}-${t.largeur}.jpg`);
      if (!fs.existsSync(f)) await telecharger(t.url, f);
    }
  }

  for (const image of [d.site && d.site.logo, d.site && d.site.favicon].filter((i) => i && typeof i === 'object')) {
    const f = path.join(IMAGES, fichierIdentite(image));
    if (!fs.existsSync(f)) {
      await telecharger(image.url, f);
      n += 1;
    }
  }
  fs.mkdirSync(path.dirname(INSTANTANE), { recursive: true });
  fs.writeFileSync(INSTANTANE, `${JSON.stringify({ ...d, genere: undefined }, null, 1)}\n`);
  console.log(`data/wordpress/contenus.json : ${d.guides.length} guides, ${d.tutoriels.length} tutoriels, ${(d.articles || []).length} articles, ${d.inspirations.length} inspirations, ${d.pages.length} pages ; maintenance ${d.maintenance && d.maintenance.actif ? 'ACTIVÉE' : 'désactivée'} ; ${n} image(s) nouvelle(s).`);
}

if (require.main === module) {
  const [commande, url] = process.argv.slice(2);
  if (commande !== 'pull') {
    console.error('Usage : node _generator/wordpress.js pull [url de l’export]');
    process.exit(2);
  }
  tirer(url).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { appliquer, charger, pageMaintenance, tirer, INSTANTANE, texteSur };
