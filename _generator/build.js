const fs = require('fs');
const path = require('path');
const { SITE, layout, breadcrumb } = require('./layout');
const { ICON, tip, key, faq, faqJsonLd, linkArrow, table, callout } = require('./ui');
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');
const { ARTICLES } = require('./content-blog');
const { PAGES } = require('./content-pages');
const { nombres } = require('./nombres');
const champPage = (page) => (cle) => nombres((PAGES[page].valeurs || {})[cle]);
const vt = champPage('tutoriels');
const vm = champPage('motifs');
const vg = champPage('guides');
const outils = (texte) => T.lignes(texte).map((l) => { const i = l.indexOf(' — '); return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 3)]; });
const { buildPagesLegales } = require('./pages-legales');
const { REGLAGES } = require('./content-site');
const T = require('./textes');
const images = require('./images');
const { PHOTOS, INSPIRATION_PHOTOS } = require('./photos');
const { exigeCoherence } = require('./check-inspiration');
const { buildHomeBody, apercuSquelette, FAQ_ACCUEIL } = require('./home');
const { buildVisualiseurPage } = require('./visualiseur');
const { resolveSources } = require('./sources');
const { NB_PIECES, PIECES, HORS_BIBLIOTHEQUE } = require('./scenes');
const { NB_PREMIBEL_VISU, NB_PREMIBEL_FIDELE, enLettres } = require('./catalogue');
const { MAX_VERSIONS } = require('../js/studio/app.js');

const NB_MOTIFS_PLAN = require('../js/tools/patterns.js').PATTERNS.length;
const { buildAssets, verifierRattachements } = require('./assets');
const { exclusions } = require('./arborescence');
const { ecrireTexte } = require('./eol');
const { picture } = require('./responsive');


const WORDPRESS = require('./wordpress');
const SOURCE_WP = WORDPRESS.appliquer({ GUIDES, TUTOS, ARTICLES, PAGES, INSPIRATION_PHOTOS, PHOTOS });
SOURCE_WP.avertissements.forEach((m) => console.warn(`[wordpress] ${m}`));
const MAINTENANCE_ACTIVE = Boolean(SOURCE_WP.maintenance && SOURCE_WP.maintenance.actif);

const ROOT = process.env.SITE_ROOT || path.join(process.env.USERPROFILE || '', 'Desktop', 'pose-parquet.com');





function porteMaintenance(relPath, content) {
  if (!MAINTENANCE_ACTIVE || !relPath.endsWith('.html') || relPath === 'maintenance.html' || relPath === '404.html') return content;
  const prefixe = '../'.repeat(relPath.split('/').length - 1);
  const porte = `<script>(function(){try{if(/[?&]apercu=1(&|$)/.test(location.search))document.cookie='pp_apercu=1; path=/; SameSite=Lax';if(/(^|; )pp_apercu=1/.test(document.cookie))return;}catch(e){}location.replace('${prefixe}maintenance.html');})();</script>`;
  return content.replace('<head>', `<head>
    ${porte}`);
}
const { responsiveTables } = require('./tables');
const { imagesWebp } = require('./images-webp');
const ROUTES = require('./routes');
const write = (relPath, content) => {
  if (relPath === 'data/contenus.json') content = JSON.stringify(ROUTES.donneesPubliques(JSON.parse(content)), null, 2);
  if (relPath === 'sitemap.xml') content = ROUTES.absolue(content).replace(/^[\t ]+$/gm, '');
  if (relPath === 'robots.txt') content = content.trimEnd() + '\n';
  if (relPath.endsWith('.tpl')) content = ROUTES.htmlPublic('guides/apercu.html', content, 'guides/apercu.html');
  if (!relPath.endsWith('.html')) return ecrireTexte(path.join(ROOT, relPath), content);
  const rendu = porteMaintenance(relPath, imagesWebp(responsiveTables(content), relPath).replace(/<!--[\s\S]*?-->/g, '').replace(/^[\t ]+$/gm, ''));
  const destination = ROUTES.fichierPublic(relPath);
  ecrireTexte(path.join(ROOT, destination), ROUTES.htmlPublic(relPath, rendu, destination));
  if (destination !== relPath) {
    const cible = ROUTES.reference(path.posix.basename(relPath), relPath, relPath);
    const absolue = ROUTES.ORIGINE + ROUTES.cheminPublic(relPath);
    ecrireTexte(
      path.join(ROOT, relPath),
      `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page déplacée</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${absolue}" />
    <meta http-equiv="refresh" content="0; url=${cible}" />
  </head>
  <body>
    <main>
      <h1>Page déplacée</h1>
      <p>Cette page a changé d’adresse : <a href="${cible}">${absolue}</a>.</p>
    </main>
  </body>
</html>
`
    );
  }
};

const frDate = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });





function stripeRoom(width, height, angle, label) {
  return `<g>
    <rect width="${width}" height="${height}" fill="#e6e2d9" stroke="#1c1e1d" stroke-width="2" />
    <g clip-path="url(#clip-${label})" transform="rotate(${angle} ${width / 2} ${height / 2})">
      ${Array.from({ length: 26 }, (_, i) => `<rect x="${-width}" y="${-height + i * 14}" width="${width * 3}" height="12" fill="#cdb493" opacity="0.85" stroke="rgba(60,45,32,.25)" />`).join('')}
    </g>
  </g>`;
}

function proportionsFigure() {
  const w = 340;
  const h = 220;
  const cells = [
    { angle: 0, caption: 'Longueur' },
    { angle: 90, caption: 'Largeur' },
    { angle: 45, caption: 'Diagonale' },
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 3 + 80} ${h + 70}" width="${w * 3 + 80}" height="${h + 70}" role="img" aria-label="Trois orientations de pose comparées">
  <rect width="${w * 3 + 80}" height="${h + 70}" fill="#f6f4ef" />
  <defs>${cells.map((_, i) => `<clipPath id="clip-c${i}"><rect width="${w}" height="${h}" /></clipPath>`).join('')}</defs>
  ${cells
    .map(
      (cell, i) => `<g transform="translate(${20 + i * (w + 20)}, 20)">
      <g clip-path="url(#clip-c${i})">
        <rect width="${w}" height="${h}" fill="#e6e2d9" />
        <g transform="rotate(${cell.angle} ${w / 2} ${h / 2})">
          ${Array.from({ length: 40 }, (_, j) => `<rect x="${-w}" y="${-h + j * 14}" width="${w * 3}" height="12" fill="#cdb493" stroke="rgba(60,45,32,.22)" />`).join('')}
        </g>
      </g>
      <rect width="${w}" height="${h}" fill="none" stroke="#1c1e1d" stroke-width="2" />
      <text x="${w / 2}" y="${h + 34}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="18" fill="#6e5f52">${cell.caption}</text>
    </g>`
    )
    .join('')}
</svg>
`;
}

function lightFigure(direction) {
  const w = 1200;
  const h = 750;
  const planks =
    direction === 'along'
      ? Array.from({ length: 26 }, (_, i) => `<rect x="0" y="${i * 30}" width="${w}" height="26" fill="#cdb493" stroke="rgba(60,45,32,.35)" />`).join('')
      : Array.from({ length: 42 }, (_, i) => `<rect x="${i * 30}" y="0" width="26" height="${h}" fill="#cdb493" stroke="rgba(60,45,32,.35)" />`).join('');
  const shadows =
    direction === 'along'
      ? ''
      : Array.from({ length: 42 }, (_, i) => `<rect x="${i * 30 + 24}" y="0" width="7" height="${h}" fill="#5a4630" opacity="0.28" />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Rendu des joints selon l'orientation des lames">
  <defs><linearGradient id="lg" x1="1" y1="0" x2="0" y2="0">
    <stop offset="0%" stop-color="#fff6df" stop-opacity="0.85" />
    <stop offset="60%" stop-color="#fff6df" stop-opacity="0.12" />
    <stop offset="100%" stop-color="#2c3330" stop-opacity="0.14" />
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="#e6e2d9" />
  ${planks}${shadows}
  <rect width="${w}" height="${h}" fill="url(#lg)" />
  <rect x="${w - 26}" y="0" width="26" height="${h}" fill="#f6f4ef" />
  <rect x="${w - 18}" y="120" width="10" height="510" fill="#7aa7b8" />
</svg>
`;
}

function buildDiagrams() {
  const dir = path.join(ROOT, 'assets', 'images');
  fs.mkdirSync(dir, { recursive: true });


  ecrireTexte(path.join(dir, 'guide-sens-proportions.svg'), proportionsFigure());
  ecrireTexte(path.join(dir, 'lumiere-avant.svg'), lightFigure('across'));
  ecrireTexte(path.join(dir, 'lumiere-apres.svg'), lightFigure('along'));






  fs.mkdirSync(path.join(ROOT, 'assets', 'videos'), { recursive: true });
}





const INSPIRATIONS = INSPIRATION_PHOTOS;

const PILLARS = [
  { num: '01', title: 'Je prépare mon sol', text: 'Support, humidité, ragréage, sous-couche.', href: 'guides/preparer-son-sol-avant-la-pose.html' },
  { num: '02', title: 'Je choisis ma pose', text: 'Flottante, collée, clouée : ce qui décide vraiment.', href: 'guides/parquet-massif-ou-contrecolle.html' },
  { num: '03', title: 'Je choisis mon motif', text: 'Droite, diagonale, Point de Hongrie, bâton rompu.', href: 'motifs/' },
  { num: '04', title: "J'ai déjà un parquet", text: 'Entretien, réparation, rénovation.', href: 'guides/erreurs-a-eviter-avant-de-poser.html' },
];

const motifName = (motif) => {
  const label = motif.h1.replace(/^(La|Le|L')s*/, '').trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const photoAlt = (name) => (PHOTOS[name] && PHOTOS[name].alt) || '';



const aUneCouverture = (slug) => Boolean(PHOTOS[`cover-${slug}`]);

const guideBySlug = (slug) => GUIDES.find((guide) => guide.slug === slug);





function articleCard(item, base, hrefDir, badge) {
  return `<article class="card" data-tags="${(item.tags || []).join(' ')}" data-reveal>
            <div class="card__media${aUneCouverture(item.slug) ? '' : ' card__media--attente'}">
              ${aUneCouverture(item.slug)
                ? picture(`cover-${item.slug}`, { base, alt: '', sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })
                : ''}
              <span class="badge">${badge || item.category}</span>
            </div>
            <div class="card__body">
              <h3 class="card__title"><a href="${base}${hrefDir}${item.slug}.html">${item.h1}</a></h3>
              <p class="card__text">${item.excerpt}</p>
              <div class="card__footer">
                <ul class="meta-list"><li>${item.reading}</li>${item.date ? `<li>${frDate(item.date)}</li>` : ''}</ul>
                ${ICON.arrow.replace('<svg', '<svg width="18" height="18"')}
              </div>
            </div>
          </article>`;
}

function relatedBlock(slugs, base) {
  const items = slugs.map(guideBySlug).filter(Boolean);
  if (!items.length) return '';
  return `<section class="related" aria-labelledby="related-title">
        <h2 id="related-title" class="section-head">À lire ensuite</h2>
        <div class="grid grid--3 related__cards" tabindex="0" role="group" aria-label="Articles à lire ensuite">
          ${items.map((item) => articleCard(item, base, 'guides/')).join('\n          ')}
        </div>
      </section>`;
}

function ctaBand(base, titre) {
  return `<section class="section">
      <div class="wrap">
        <div class="cta-band" data-reveal>
          <div>
            <h2>${T.texte(titre || REGLAGES.bandeau_titre)}</h2>
            <p>${T.texte(REGLAGES.bandeau_texte)}</p>
          </div>
          <div class="cta-band__actions">
            <a class="btn btn--light" href="${base}projet/">${T.texte(REGLAGES.bandeau_bouton_projet)}</a>
            <a class="btn btn--outline-light" href="${base}outils/studio.html">${T.texte(REGLAGES.bandeau_bouton_visualiseur)}</a>
          </div>
        </div>
      </div>
    </section>`;
}





function editorialPage(item, options) {
  const { section, sectionLabel, dir, aside, jsonldType = 'Article' } = options;
  const base = '../';
  const crumbs = breadcrumb(base, [
    { label: 'Accueil', href: 'index.html' },
    { label: sectionLabel, href: dir },
    { label: item.h1 },
  ]);

  const faqBlock = item.faq && item.faq.length
    ? `<section class="article-faq" aria-labelledby="faq-title">
          <h2 id="faq-title">Questions fréquentes</h2>
          ${faq(item.faq)}
        </section>`
    : '';

  const published = item.date || '2026-08-01';
  const updated = item.updated || published;


  const couverture = aUneCouverture(item.slug)
    ? `assets/images/${PHOTOS[`cover-${item.slug}`].alias || `cover-${item.slug}`}.jpg`
    : 'assets/images/og-default.jpg';

  const sources = resolveSources(item);
  const sourcesBlock = sources.length
    ? `<section class="article-sources" aria-labelledby="sources-title">
              <h2 id="sources-title">Sources et références</h2>
              <p class="article-sources__intro">Ces documents font autorité sur la mise en œuvre des parquets en France. Les normes NF DTU sont éditées par AFNOR et payantes : le lien mène à leur fiche.</p>
              <ul class="article-sources__list">
                ${sources
                  .map(
                    (source) =>
                      `<li><a href="${source.url}" rel="noopener nofollow">${source.label}</a><span>${source.note}</span></li>`
                  )
                  .join('\n                ')}
              </ul>
            </section>`
    : '';

  const jsonld = [
    crumbs.jsonld,
    {
      '@context': 'https://schema.org',
      '@type': jsonldType,
      headline: item.h1,
      description: item.description,
      image: `${SITE.domain}/${couverture}`,
      inLanguage: 'fr-FR',
      ...((Object.hasOwn(item, 'structuredDate') ? item.structuredDate : item.date) ? { datePublished: item.structuredDate || item.date } : {}),
      ...(item.updated ? { dateModified: item.updated } : {}),
      author: { '@type': 'Organization', name: SITE.name, url: `${SITE.domain}/a-propos/` },
      publisher: { '@type': 'Organization', name: SITE.name },
      mainEntityOfPage: `${SITE.domain}/${dir}${item.slug}.html`,
    },
  ];
  if (item.faq && item.faq.length) jsonld.push(faqJsonLd(item.faq));

  const body = `      <div class="reading-progress" data-reading-progress aria-hidden="true"><span></span></div>
      ${crumbs.html}
      <header class="article-header">
        <div class="wrap-wide article-header__grid">
          <div>
            <p class="eyebrow">${item.category || sectionLabel}</p>
            <h1>${item.h1}</h1>
          </div>
          <div>
            <p class="lead">${item.lead}</p>
            <ul class="meta-list article-header__meta">
              <li>${item.reading} de lecture</li>
              <li>Publié le <time datetime="${published}">${frDate(published)}</time></li>
              ${updated !== published ? `<li>Mis à jour le <time datetime="${updated}">${frDate(updated)}</time></li>` : ''}
              ${item.level ? `<li>Niveau ${item.level}</li>` : ''}
              ${item.duration ? `<li>${item.duration}</li>` : ''}
            </ul>
            <p class="article-byline">Par <strong>la rédaction de ${SITE.name}</strong> — <a href="${base}a-propos/methode-editoriale.html">notre méthode éditoriale</a></p>
          </div>
        </div>
      </header>

      <div class="wrap-wide">
        ${aUneCouverture(item.slug)
          ? `<div class="article-cover" data-reveal>
          ${picture(`cover-${item.slug}`, { base, alt: photoAlt(`cover-${item.slug}`) || item.h1, sizes: '(min-width: 75rem) 68rem, 94vw', priority: true })}
        </div>`
          : ''}

        <details class="toc-mobile" data-toc data-toc-for="article-content">
          <summary class="toc-mobile__barre"><span class="toc-mobile__titre">Sommaire</span><span class="toc-mobile__courant" data-toc-courant></span></summary>
          <ol></ol>
        </details>

        <div class="article-layout">
          <article class="prose" id="article-content">
${item.body}
            ${faqBlock}
            ${sourcesBlock}
            <aside class="tool-bridge" aria-label="Passer à l’outil">
              <p class="tool-bridge__eyebrow">Passer à la pratique</p>
              <p class="tool-bridge__text">Essayez ce que vous venez de lire sur une photo de votre pièce : teinte, motif et sens de pose se changent en direct, sans rien envoyer sur un serveur.</p>
              <div class="cluster">
                <a class="btn btn--sm" href="${base}outils/visualiseur.html">Visualiser mon parquet</a>
                <a class="link-arrow" href="${base}outils/simulateur-pose.html">Ou passer en mode plan</a>
              </div>
            </aside>
            <nav class="article-nav" aria-label="Poursuivre la lecture">
              ${linkArrow(`${base}${dir}`, `Tous les ${sectionLabel.toLowerCase()}`)}
              ${linkArrow(`${base}inspiration/`, 'Voir des ambiances')}
            </nav>
          </article>

          <aside class="article-aside">
            <nav class="toc" data-toc data-toc-for="article-content" aria-labelledby="toc-title">
              <p class="toc__title" id="toc-title">Sommaire</p>
              <ol></ol>
            </nav>
            ${aside || ''}
          </aside>
        </div>

        ${relatedBlock(item.related || [], base)}
      </div>
      ${ctaBand(base)}`;

  return layout({
    title: item.title,
    description: item.description,
    path: `${dir}${item.slug}.html`,
    depth: 1,
    ogType: 'article',
    ogImage: couverture,
    css: ['css/pages/article.css'],
    jsonld,
    body,
  });
}





function asideGuide() {
  return `<div class="aside-box">
              <h3>Visualiser ce sujet</h3>
              <p>Le simulateur de pose applique ces principes à vos dimensions réelles.</p>
              <a class="btn btn--ghost btn--sm" href="../outils/simulateur-pose.html">Ouvrir le simulateur</a>
            </div>
            <div class="aside-box">
              <h3>Décrire un projet</h3>
              <p>Quatre étapes pour cadrer votre chantier : pièce, support, motif, délai.</p>
              <a class="btn btn--sm" href="../projet/">Commencer</a>
            </div>`;
}



function buildBlog() {
  const aside = asideGuide();
  ARTICLES.forEach((article) => {
    write(`blog/${article.slug}.html`, editorialPage(article, { section: 'blog', sectionLabel: 'Blog', dir: 'blog/', aside }));
  });

  const page = PAGES['blog'];
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: page.nom }]);
  const liste = ARTICLES.length
    ? `<div class="grid grid--3" id="liste-blog">
            ${ARTICLES.map((article) => articleCard(article, '../', 'blog/')).join('\n            ')}
          </div>`
    : `<p class="empty-note">Les premiers articles arrivent bientôt. En attendant, les <a href="../guides/">guides</a> répondent aux questions les plus fréquentes.</p>`;

  write(
    'blog/index.html',
    layout({
      title: page.titre,
      description: page.description,
      path: 'blog/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      ...(ARTICLES.length ? {} : { robots: 'noindex, follow' }),
      body: `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">${T.texte(page.nom)}</p>
            <h1 class="page-hero__title">${T.texte(page.h1)}</h1>
          </div>
          <p class="page-hero__lead">${T.texte(page.chapo)}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          ${liste}
        </div>
      </section>
      ${ctaBand('../')}`,
    })
  );
}


function buildGuides() {
  GUIDES.forEach((guide) => {
    const aside = asideGuide();
    write(
      `guides/${guide.slug}.html`,
      editorialPage(guide, { section: 'guides', sectionLabel: 'Guides', dir: 'guides/', aside })
    );
  });


  const lienGuide = (slug, repli) => (GUIDES.some((g) => g.slug === slug) ? `${slug}.html` : repli);
  const ORDRE_GUIDES = [
    {
      titre: vg('etape1_titre'),
      texte: vg('etape1_texte'),
      href: lienGuide('parquet-massif-ou-contrecolle', './'),
    },
    {
      titre: vg('etape2_titre'),
      texte: vg('etape2_texte'),
      href: lienGuide('preparer-son-sol-avant-la-pose', './'),
    },
    {
      titre: vg('etape3_titre'),
      texte: vg('etape3_texte'),
      href: '../tutoriels/',
    },
  ];
  const FAQ_GUIDES = [
    {
      q: vg('faq1_q'),
      a: vg('faq1_r'),
    },
    {
      q: vg('faq2_q'),
      a: vg('faq2_r'),
    },
    {
      q: vg('faq3_q'),
      a: vg('faq3_r'),
    },
    {
      q: vg('faq4_q'),
      a: vg('faq4_r'),
    },
    {
      q: vg('faq5_q'),
      a: vg('faq5_r'),
    },
  ];

  const featured = GUIDES[0];
  const rest = GUIDES.slice(1);
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Guides' }]);

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">${T.texte(vg('surtitre'))}</p>
            <h1 class="page-hero__title">${T.texte(PAGES['guides'].h1)}</h1>
          </div>
          <p class="page-hero__lead">${T.texte(nombres(PAGES['guides'].chapo))}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="listing-featured">
            <article class="feature-card${aUneCouverture(featured.slug) ? '' : ' feature-card--attente'}" data-reveal>
              ${aUneCouverture(featured.slug)
                ? picture(`cover-${featured.slug}`, { base: '../', alt: '', sizes: '(min-width: 60rem) 45rem, 94vw', priority: true })
                : ''}
              <p class="eyebrow">${featured.category} · ${featured.reading}</p>
              <h2><a href="${featured.slug}.html">${featured.h1}</a></h2>
              <p>${featured.excerpt}</p>
            </article>
            <div class="listing-side">
              <div class="cluster-list">
                ${GUIDES.slice(1, 5)
                  .map(
                    (guide) =>
                      `<a href="${guide.slug}.html"><strong>${guide.h1}</strong><span>${guide.reading}</span></a>`
                  )
                  .join('\n                ')}
              </div>
              ${tip(`<p>${T.texte(vg('conseil'))}</p>`)}
            </div>
          </div>

          <div class="filters" data-filters="liste-guides" role="group" aria-label="Filtrer les guides">
            <button class="filter-chip" type="button" data-filter-value="all" aria-pressed="true">Tous</button>
            <button class="filter-chip" type="button" data-filter-value="sens-de-pose" aria-pressed="false">Sens de pose</button>
            <button class="filter-chip" type="button" data-filter-value="preparation" aria-pressed="false">Préparation</button>
            <button class="filter-chip" type="button" data-filter-value="motifs" aria-pressed="false">Motifs</button>
            <button class="filter-chip" type="button" data-filter-value="comprendre" aria-pressed="false">Comprendre</button>
            <button class="filter-chip" type="button" data-filter-value="choisir" aria-pressed="false">Choisir</button>
          </div>

          <div class="grid grid--3" id="liste-guides">
            ${rest.map((guide) => articleCard(guide, '../', 'guides/')).join('\n            ')}
          </div>
          <p class="empty-note" data-filters-empty="liste-guides" hidden>Aucun guide ne correspond à ce filtre pour le moment.</p>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="guides-ordre">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vg('ordre_surtitre'))}</p>
              <h2 id="guides-ordre">${T.texte(vg('ordre_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vg('ordre_intro'))}</p>
          </div>
          <div class="situations">
            ${ORDRE_GUIDES.filter((x) => x.titre).map((x, i) => `<a class="situation" href="${x.href}">
              <span class="situation__quand">0${i + 1}</span>
              <h3 class="situation__titre">${T.texte(x.titre)}</h3>
              <p class="situation__texte">${T.texte(x.texte)}</p>
            </a>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="guides-faq">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vg('faq_surtitre'))}</p>
              <h2 id="guides-faq">${T.texte(vg('faq_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vg('faq_intro'))}</p>
          </div>
          <div class="faq-grille">
            ${FAQ_GUIDES.filter((x) => x.q).map((x) => `<div class="faq-grille__item">
              <h3>${T.texte(x.q)}</h3>
              <p>${T.texte(x.a)}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>
      ${ctaBand('../', vg('bandeau_titre'))}`;

  write(
    'guides/index.html',
    layout({
      title: PAGES['guides'].titre,
      description:
        PAGES['guides'].description,
      path: 'guides/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld, faqJsonLd(FAQ_GUIDES.filter((x) => x.q))],
      body,
    })
  );
}



const MOTIF_VERS_STUDIO = {
  longueur: 'lames',
  largeur: 'lames',
  diagonale: 'lames',
  'point-de-hongrie': 'point-de-hongrie',
  'baton-rompu': 'baton-rompu',
};

function buildMotifs() {
  MOTIFS.forEach((motif) => {


    const motifStudio = MOTIF_VERS_STUDIO[motif.pattern];
    const aside = `<div class="aside-box">
              <h3>${motif.h1} en chiffres</h3>
              <ul class="meta-list meta-list--stack">
                ${motif.stats.map(([label, value]) => `<li>${label} : <strong>${value}</strong></li>`).join('')}
              </ul>
            </div>
            <div class="aside-box">
              <h3>Voir ce motif</h3>
              <div class="pattern-card__viz" data-pattern-thumb="${motif.pattern}"></div>
              <a class="btn btn--ghost btn--sm" href="../outils/simulateur-pose.html#motif=${motif.pattern}">Tester dans ma pièce</a>
            </div>${
              motifStudio
                ? `
            <div class="aside-box">
              <h3>Des parquets dans ce motif</h3>
              <p>Le Visualiseur pose ${NB_PREMIBEL_VISU} références Premibel sur la photographie d’une pièce — en rendu indicatif, ${NB_PREMIBEL_FIDELE} en rendu fidèle ; chacune renvoie vers sa fiche.</p>
              <a class="btn btn--sm" href="../outils/studio.html?motif=${motifStudio}">Essayer ce motif sur une photo</a>
            </div>`
                : ''
            }`;

    const reglages = PAGES[`motif-${motif.slug}`] || {};
    const item = {
      ...motif,

      title: reglages.titre || motif.title,
      description: reglages.description || motif.description,
      h1: reglages.h1 || motif.h1,
      lead: reglages.chapo || motif.lead,
      category: 'Motifs',
      date: '2026-08-12',
      structuredDate: null,
      related: ['point-de-hongrie-ou-baton-rompu', 'quel-sens-de-pose-choisir', 'preparer-son-sol-avant-la-pose'],
      body: `${motif.body}
      <h2 id="tester">Tester ce motif dans votre pièce</h2>
      <p>Le simulateur applique ${motif.h1.toLowerCase()} à vos dimensions, avec la fenêtre et l'entrée au bon endroit.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>`,
    };

    write(
      `motifs/${motif.slug}.html`,
      editorialPage(item, { section: 'motifs', sectionLabel: 'Motifs', dir: 'motifs/', aside })
    );
  });

  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Motifs' }]);
  const MOTIFS_EN_V = ['point-de-hongrie', 'baton-rompu'];


  const CARTES_MOTIFS = {
    'pose-droite': [vm('carte_pose_droite_texte'), vm('carte_pose_droite_chutes')],
    'pose-longueur': [vm('carte_pose_longueur_texte'), vm('carte_pose_longueur_chutes')],
    'pose-largeur': [vm('carte_pose_largeur_texte'), vm('carte_pose_largeur_chutes')],
    'pose-diagonale': [vm('carte_pose_diagonale_texte'), vm('carte_pose_diagonale_chutes')],
    'point-de-hongrie': [vm('carte_point_de_hongrie_texte'), vm('carte_point_de_hongrie_chutes')],
    'baton-rompu': [vm('carte_baton_rompu_texte'), vm('carte_baton_rompu_chutes')],
  };
  const carteMotif = (motif) => {
    const [texte, chutes] = CARTES_MOTIFS[motif.slug] || [motif.excerpt, `Chutes ${motif.stats[0][1].split(' (')[0]}`];
    return `<a class="pattern-card" href="${motif.slug}.html" data-reveal>
                <div class="pattern-card__viz" data-pattern-thumb="${motif.pattern}"></div>
                <h3>${motifName(motif)}</h3>
                <p>${T.texte(texte)}</p>
                <span class="mono">${T.texte(chutes)}</span>
              </a>`;
  };
  const lienMotif = (slug) => (MOTIFS.some((m) => m.slug === slug) ? `${slug}.html` : './');

  const PIECES_MOTIFS = [
    {
      quand: vm('piece1_quand'),
      titre: vm('piece1_titre'),
      texte: vm('piece1_texte'),
      slug: 'pose-longueur',
    },
    {
      quand: vm('piece2_quand'),
      titre: vm('piece2_titre'),
      texte: vm('piece2_texte'),
      slug: 'pose-diagonale',
    },
    {
      quand: vm('piece3_quand'),
      titre: vm('piece3_titre'),
      texte: vm('piece3_texte'),
      slug: 'point-de-hongrie',
    },
  ];

  const FAQ_MOTIFS = [
    {
      q: vm('faq1_q'),
      a: vm('faq1_r'),
    },
    {
      q: vm('faq2_q'),
      a: vm('faq2_r'),
    },
    {
      q: vm('faq3_q'),
      a: vm('faq3_r'),
      lien: ['../guides/point-de-hongrie-ou-baton-rompu.html', vm('faq3_lien')],
    },
    {
      q: vm('faq4_q'),
      a: vm('faq4_r'),
    },
    {
      q: vm('faq5_q'),
      a: vm('faq5_r'),
      lien: ['../tutoriels/coller-un-parquet-contrecolle.html', vm('faq5_lien')],
    },
  ];

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">${T.texte(vm('surtitre'))}</p>
            <h1 class="page-hero__title">${T.texte(PAGES['motifs'].h1)}</h1>
          </div>
          <p class="page-hero__lead">${T.texte(PAGES['motifs'].chapo)}</p>
        </div>
      </header>
      <section class="section section--flush-top" aria-labelledby="motifs-droits">
        <div class="wrap">
          <div class="motif-family">
            <div class="motif-family__head">
              <h2 id="motifs-droits">${T.texte(vm('famille1_titre'))}</h2>
              <p>${T.texte(vm('famille1_texte'))}</p>
            </div>
            <div class="grid grid--4 motif-family__grid">
              ${MOTIFS.filter((m) => !MOTIFS_EN_V.includes(m.slug)).map(carteMotif).join('\n              ')}
            </div>
          </div>
          <div class="motif-family motif-family--v" aria-labelledby="motifs-v">
            <div class="motif-family__head">
              <h2 id="motifs-v">${T.texte(vm('famille2_titre'))}</h2>
              <p>${T.texte(vm('famille2_texte'))}</p>
              <p>${linkArrow('../guides/point-de-hongrie-ou-baton-rompu.html', vm('famille2_lien'))}</p>
            </div>
            <div class="grid grid--2 motif-family__grid">
              ${MOTIFS.filter((m) => MOTIFS_EN_V.includes(m.slug)).map(carteMotif).join('\n              ')}
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="motifs-pieces">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vm('pieces_surtitre'))}</p>
              <h2 id="motifs-pieces">${T.texte(vm('pieces_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vm('pieces_intro'))}</p>
          </div>
          <div class="situations">
            ${PIECES_MOTIFS.filter((x) => x.titre).map((x) => `<a class="situation" href="${lienMotif(x.slug)}">
              <span class="situation__quand">${T.texte(x.quand)}</span>
              <h3 class="situation__titre">${T.texte(x.titre)}</h3>
              <p class="situation__texte">${T.texte(x.texte)}</p>
            </a>`).join('\n            ')}
          </div>
          <p class="situations__note">${T.lien(vm('pieces_note'), '../guides/quel-sens-de-pose-choisir.html')}</p>
        </div>
      </section>

      <section class="section" aria-labelledby="motifs-faq">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vm('faq_surtitre'))}</p>
              <h2 id="motifs-faq">${T.texte(vm('faq_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vm('faq_intro'))}</p>
          </div>
          <div class="faq-grille">
            ${FAQ_MOTIFS.filter((x) => x.q).map((x) => `<div class="faq-grille__item">
              <h3>${T.texte(x.q)}</h3>
              <p>${T.texte(x.a)}</p>${x.lien && x.lien[1] ? `
              <p class="faq-grille__lien"><a class="link-arrow" href="${x.lien[0]}">${T.texte(x.lien[1])} ${ICON.arrow}</a></p>` : ''}
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>
      ${ctaBand('../', vm('bandeau_titre'))}`;
  write(
    'motifs/index.html',
    layout({
      title: PAGES['motifs'].titre,
      description: PAGES['motifs'].description,
      path: 'motifs/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld, faqJsonLd(FAQ_MOTIFS.filter((x) => x.q))],
      body,
    })
  );
}

function asideTuto(tuto) {
  return `<div class="aside-box">
              <h3>Outillage</h3>
              <ul class="meta-list meta-list--stack">
                ${tuto.tools.map((tool) => `<li>${tool}</li>`).join('')}
              </ul>
            </div>
            <div class="aside-box">
              <h3>Avant de commencer</h3>
              <p>Vérifiez la planéité et l'humidité du support : c'est la cause de la majorité des désordres.</p>
              <a class="btn btn--ghost btn--sm" href="../guides/preparer-son-sol-avant-la-pose.html">Préparer le support</a>
            </div>

















            <div class="aside-box">
              <h3>Vous préférez confier la pose ?</h3>
              <p>Décrivez votre projet : nous orientons vers un poseur selon votre région. En Île-de-France, la pose et la rénovation sont assurées par Allure Design.</p>
              <a class="btn btn--ghost btn--sm" href="../projet/?besoin=pose">Faire poser mon parquet</a>
            </div>`;
}

function buildTutos() {
  TUTOS.forEach((tuto) => {
    const aside = asideTuto(tuto);
    const item = { ...tuto, category: 'Tutoriel', date: tuto.date || '2026-08-16', structuredDate: tuto.date || null, related: ['preparer-son-sol-avant-la-pose', 'erreurs-a-eviter-avant-de-poser', 'quel-sens-de-pose-choisir'] };
    write(
      `tutoriels/${tuto.slug}.html`,
      editorialPage(item, { section: 'tutoriels', sectionLabel: 'Tutoriels', dir: 'tutoriels/', aside, jsonldType: 'HowTo' })
    );
  });

  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Tutoriels' }]);



  const ACCROCHES = {
    'poser-un-parquet-flottant': vt('accroche_flottant'),
    'coller-un-parquet-contrecolle': vt('accroche_colle'),
    'reussir-le-calepinage': vt('accroche_calepinage'),
  };
  const accroche = (t) => ACCROCHES[t.slug] || t.excerpt;
  const lienTuto = (slug) => (TUTOS.some((t) => t.slug === slug) ? `${slug}.html` : './');

  const SITUATIONS = [
    {
      quand: vt('situation1_quand'),
      titre: vt('situation1_titre'),
      texte: vt('situation1_texte'),
      slug: 'poser-un-parquet-flottant',
    },
    {
      quand: vt('situation2_quand'),
      titre: vt('situation2_titre'),
      texte: vt('situation2_texte'),
      slug: 'coller-un-parquet-contrecolle',
    },
    {
      quand: vt('situation3_quand'),
      titre: vt('situation3_titre'),
      texte: vt('situation3_texte'),
      slug: 'reussir-le-calepinage',
    },
  ];

  const REPERES = [
    [vt('repere1_titre'), vt('repere1_texte')],
    [vt('repere2_titre'), vt('repere2_texte')],
    [vt('repere3_titre'), vt('repere3_texte')],
    [vt('repere4_titre'), vt('repere4_texte')],
  ];

  const OUTILS_COMMUNS = outils(vt('outillage_communs'));
  const OUTILS_SELON = outils(vt('outillage_selon'));
  const listeOutils = (items) => `<ul class="outillage__liste">
                ${items.map(([nom, detail]) => `<li><strong>${T.texte(nom)}</strong>${detail ? ` — ${T.texte(detail)}` : ''}</li>`).join('\n                ')}
              </ul>`;

  const FAQ_TUTOS = [
    {
      q: vt('faq1_q'),
      a: vt('faq1_r'),
    },
    {
      q: vt('faq2_q'),
      a: vt('faq2_r'),
    },
    {
      q: vt('faq3_q'),
      a: vt('faq3_r'),
    },
    {
      q: vt('faq4_q'),
      a: vt('faq4_r'),
    },
    {
      q: vt('faq5_q'),
      a: vt('faq5_r'),
    },
  ];

  const une = TUTOS.find((x) => x.slug === 'poser-un-parquet-flottant') || TUTOS.find((x) => aUneCouverture(x.slug)) || TUTOS[0];
  const autres = TUTOS.filter((x) => x !== une);

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">${T.texte(vt('surtitre'))}</p>
            <h1 class="page-hero__title">${T.texte(PAGES['tutoriels'].h1)}</h1>
          </div>
          <p class="page-hero__lead">${T.texte(PAGES['tutoriels'].chapo)}</p>
        </div>
      </header>

      <section class="section section--flush-top" aria-labelledby="tuto-liste">
        <div class="wrap">
          <h2 class="visually-hidden" id="tuto-liste">${T.texte(vt('liste_titre'))}</h2>
          <div class="listing-featured">
            <article class="feature-card${aUneCouverture(une.slug) ? '' : ' feature-card--attente'}" data-reveal>
              ${aUneCouverture(une.slug) ? picture(`cover-${une.slug}`, { base: '../', alt: '', sizes: '(min-width: 60rem) 45rem, 94vw', priority: true }) : ''}
              <p class="eyebrow">${une.level} · ${une.duration}</p>
              <h2><a href="${une.slug}.html">${une.h1}</a></h2>
              <p>${T.texte(accroche(une))}</p>
            </article>
            <div class="listing-side">
              <div class="cluster-list cluster-list--accroche">
                ${autres.map((x) => `<a href="${x.slug}.html"><strong>${x.h1}</strong><span>${x.level} · ${x.duration}</span><em>${T.texte(accroche(x))}</em></a>`).join('\n                ')}
              </div>
              ${tip(`<p>${T.lien(vt('conseil'), '../guides/preparer-son-sol-avant-la-pose.html')}</p>`)}
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="tuto-choix">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vt('choix_surtitre'))}</p>
              <h2 id="tuto-choix">${T.texte(vt('choix_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vt('choix_intro'))}</p>
          </div>
          <div class="situations">
            ${SITUATIONS.filter((x) => x.titre).map((x) => `<a class="situation" href="${lienTuto(x.slug)}">
              <span class="situation__quand">${T.texte(x.quand)}</span>
              <h3 class="situation__titre">${T.texte(x.titre)}</h3>
              <p class="situation__texte">${T.texte(x.texte)}</p>
            </a>`).join('\n            ')}
          </div>
          <p class="situations__note">${T.lien(vt('choix_note'), '../guides/preparer-son-sol-avant-la-pose.html')}</p>
        </div>
      </section>

      <section class="section" aria-labelledby="tuto-methode">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vt('reperes_surtitre'))}</p>
              <h2 id="tuto-methode">${T.texte(vt('reperes_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vt('reperes_intro'))}</p>
          </div>
          <ol class="steps-grid">
            ${REPERES.filter(([titre]) => titre).map(([titre, texte], i) => `<li><span class="steps-grid__num">0${i + 1}</span><strong>${T.texte(titre)}</strong><span>${T.texte(texte)}</span></li>`).join('\n            ')}
          </ol>
        </div>
      </section>

      <section class="section section--flush-top" aria-labelledby="tuto-outillage">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vt('outillage_surtitre'))}</p>
              <h2 id="tuto-outillage">${T.texte(vt('outillage_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vt('outillage_intro'))}</p>
          </div>
          <div class="outillage">
            <div>
              <h3 class="outillage__titre">${T.texte(vt('outillage_communs_titre'))}</h3>
              ${listeOutils(OUTILS_COMMUNS)}
            </div>
            <div>
              <h3 class="outillage__titre">${T.texte(vt('outillage_selon_titre'))}</h3>
              ${listeOutils(OUTILS_SELON)}
            </div>
          </div>
          <p class="outillage__note">${T.texte(vt('outillage_note'))}</p>
        </div>
      </section>

      <section class="section section--mineral" aria-labelledby="tuto-outil">
        <div class="wrap-wide">
          <div class="tool-block">
            <div class="tool-block__media">
              ${apercuSquelette('chambre', '../')}
            </div>
            <div class="tool-block__body">
              <p class="tool-block__num">${T.texte(vt('apercu_surtitre'))}</p>
              <h2 class="tool-block__title" id="tuto-outil">${T.texte(vt('apercu_titre'))}</h2>
              <p class="lead">${T.texte(vt('apercu_texte'))}</p>
              <div class="cluster">
                <a class="btn" href="../outils/visualiseur.html">${T.texte(vt('apercu_bouton'))}</a>
                <a class="link-arrow" href="../guides/">${T.texte(vt('apercu_lien'))}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="tuto-faq">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(vt('faq_surtitre'))}</p>
              <h2 id="tuto-faq">${T.texte(vt('faq_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(vt('faq_intro'))}</p>
          </div>
          <div class="faq-grille">
            ${FAQ_TUTOS.filter((x) => x.q).map((x) => `<div class="faq-grille__item">
              <h3>${T.texte(x.q)}</h3>
              <p>${T.texte(x.a)}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>
      ${ctaBand('../', vt('bandeau_titre'))}`;

  write(
    'tutoriels/index.html',
    layout({
      title: PAGES['tutoriels'].titre,
      description:
        PAGES['tutoriels'].description,
      path: 'tutoriels/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld, faqJsonLd(FAQ_TUTOS.filter((x) => x.q))],
      body,
    })
  );
}



function lienStudio(item) {
  if (!item.visualizerAvailable || !item.sceneId) return null;


  const scene =
    PIECES.find((p) => p.id === item.sceneId) || HORS_BIBLIOTHEQUE.find((p) => p.id === item.sceneId);
  if (!scene) return null;


  const attendu = `${item.image}.jpg`;
  if (scene.file !== attendu) {
    throw new Error(
      `Inspiration « ${item.title} » : la carte affiche ${attendu}, la scene « ${item.sceneId} » ouvre ${scene.file}. `
        + 'Une carte essayable doit montrer la photo que le Studio ouvre — corriger `image` ou `sceneId` dans _generator/photos.js.'
    );
  }
  const c = item.config || {};
  const params = [
    `piece=${item.sceneId}`,
    c.productId ? `parquet=${c.productId}` : null,
    c.pattern ? `motif=${c.pattern}` : null,
    Number.isFinite(c.orientation) ? `orientation=${c.orientation}` : null,
  ].filter(Boolean).join('&');
  return `../outils/studio.html?${params}`;
}



const TAILLES_INSPIRATION = {
  une: '(min-width: 62rem) min(66vw, 1040px), (min-width: 48rem) 58vw, 100vw',
  voisine: '(min-width: 62rem) min(33vw, 520px), (min-width: 48rem) 42vw, 100vw',
  grille: '(min-width: 62rem) min(33vw, 520px), (min-width: 48rem) 50vw, 42vw',
};

function carteInspiration(item, { variante = 'grille', priority = false } = {}) {
  if (!item.phrase) {
    throw new Error(`Inspiration « ${item.title} » : aucune \`phrase\` — chaque carte décrit l'ambiance qu'elle montre.`);
  }
  const href = lienStudio(item);
  const vue = picture(item.image, { base: '../', alt: item.alt, sizes: TAILLES_INSPIRATION[variante], priority });


  const corps = href
    ? `<div class="insp-card__body">
                  <h3 class="insp-card__title">${item.title}</h3>
                  <span class="insp-card__meta">${item.meta}</span>
                  <span class="insp-card__text">${item.phrase}</span>
                  <span class="insp-card__try">Essayer dans le Studio ${ICON.arrow}</span>
                </div>`
    : `<span class="insp-card__body">
                  <span class="insp-card__title">${item.title}</span>
                  <span class="insp-card__meta">${item.meta}</span>
                  <span class="insp-card__text">${item.phrase}</span>
                  <span class="insp-card__credit">Photographie ${item.credit}</span>
                </span>`;
  const surface = href
    ? `<a class="insp-card__surface" href="${href}">
                <span class="insp-card__media">${vue}</span>
                ${corps}
              </a>`
    : `<button class="insp-card__surface" type="button"
                data-lightbox-trigger="${item.title} — ${item.meta}" aria-label="Agrandir : ${item.title}">
                <span class="insp-card__media">${vue}</span>
                ${corps}
              </button>`;
  const classes = `insp-card insp-card--${variante}`;
  return `<article class="${classes}" id="${item.image}" data-tags="${item.tags}">
              ${surface}
            </article>`;
}



const UNE_INSPIRATION = 'room-chambre-parisienne';
const VOISINE_INSPIRATION = 'room-piece-arcades';



const LIBELLES_MOTIF = [
  ['droite', 'Lames droites'],
  ['hongrie', 'Point de Hongrie'],
  ['baton-rompu', 'Bâton rompu'],
];
const LIBELLES_PIECE = [
  ['sejour', 'Séjour'],
  ['chambre', 'Chambre'],
  ['cuisine', 'Cuisine'],
  ['couloir', 'Couloir et entrée'],
];



const CHOIX_MOTIFS = [
  { thumb: 'longueur', href: '../motifs/pose-droite.html', titre: 'Lames droites',
    texte: 'Une seule direction, des joints décalés : le bois et la lumière parlent.' },
  { thumb: 'point-de-hongrie', href: '../motifs/point-de-hongrie.html', titre: 'Point de Hongrie',
    texte: 'Coupes d’onglet, pointe continue : un V net qui donne un axe.' },
  { thumb: 'baton-rompu', href: '../motifs/baton-rompu.html', titre: 'Bâton rompu',
    texte: 'Lames à angle droit, décrochés en escalier : graphique, sans coupe d’onglet.' },
];

function buildInspiration() {
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Inspiration' }]);

  const une = INSPIRATIONS.find((i) => i.image === UNE_INSPIRATION);
  const voisine = INSPIRATIONS.find((i) => i.image === VOISINE_INSPIRATION);
  if (!une || !voisine) {
    throw new Error('Inspiration : la une ou sa voisine est introuvable dans INSPIRATION_PHOTOS.');
  }
  const reste = INSPIRATIONS.filter((i) => i !== une && i !== voisine);
  const cartes = [
    carteInspiration(une, { variante: 'une', priority: true }),
    carteInspiration(voisine, { variante: 'voisine' }),
    ...reste.map((i) => carteInspiration(i)),
  ].join('\n            ');

  const etiquettes = new Set(INSPIRATIONS.flatMap((i) => i.tags.split(' ')));
  const connues = [...LIBELLES_MOTIF, ...LIBELLES_PIECE].map(([v]) => v);
  const inconnues = [...etiquettes].filter((e) => !connues.includes(e));
  if (inconnues.length) {
    throw new Error(`Inspiration : étiquette(s) sans filtre : ${inconnues.join(', ')}.`);
  }
  const presents = (libelles) => libelles.filter(([valeur]) => etiquettes.has(valeur));
  const pastille = (valeur, libelle, groupe) =>
    `<button class="filter-chip" type="button" data-filter-value="${valeur}"${
      groupe ? ` data-filter-group="${groupe}"` : ''
    } aria-pressed="${valeur === 'all'}">${libelle}</button>`;
  const groupe = (id, titre, libelles, nom) => `<div class="filter-group" role="group" aria-labelledby="${id}">
              <span class="filter-group__label" id="${id}">${titre}</span>
              ${presents(libelles).map(([v, l]) => pastille(v, l, nom)).join('\n              ')}
            </div>`;

  const total = INSPIRATIONS.length;
  const essayables = INSPIRATIONS.filter((i) => lienStudio(i)).length;
  const compte = essayables === total
    ? `${total} ambiances, toutes essayables dans le Studio`
    : `${total} ambiances, ${essayables} essayables dans le Studio`;


  const lightbox = essayables < total
    ? `
      <div class="modal modal--media" data-modal data-lightbox id="lightbox" role="dialog" aria-modal="true" aria-label="Visuel agrandi">
        <div class="modal__dialog">
          <button class="modal__close" type="button" data-modal-close aria-label="Fermer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg></button>
          <div data-lightbox-slot></div>
          <p class="modal__caption" data-lightbox-caption></p>
        </div>
      </div>`
    : '';



  const choixMotifs = CHOIX_MOTIFS.map(
    (m) => `<a class="motif-pick__item" href="${m.href}">
              <span class="motif-pick__viz" data-pattern-thumb="${m.thumb}"></span>
              <div class="motif-pick__text">
                <h3 class="motif-pick__title">${m.titre}</h3>
                <span class="motif-pick__desc">${m.texte}</span>
                <span class="link-arrow">Découvrir ce motif ${ICON.arrow}</span>
              </div>
            </a>`
  ).join('\n            ');

  const body = `      ${crumbs.html}
      <header class="page-hero page-hero--compact">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Inspiration</p>
            <h1 class="page-hero__title">${PAGES['inspiration'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['inspiration'].chapo}</p>
        </div>
      </header>

      <section class="section spotlight" aria-labelledby="inspi-title">
        <div class="wrap-wide">
          <div class="spotlight__head">
            <div>
              <p class="eyebrow">Ambiances</p>
              <h2 id="inspi-title">Voir avant de choisir.</h2>
            </div>
            <p class="spotlight__count">${compte}</p>
          </div>
          <div class="filter-bar filter-bar--grouped" data-filters="galerie" role="group" aria-label="Filtrer les ambiances">
            ${pastille('all', 'Tout')}
            ${groupe('filtre-motif', 'Motif', LIBELLES_MOTIF, 'motif')}
            ${groupe('filtre-piece', 'Pièce', LIBELLES_PIECE, 'piece')}
          </div>
          <p class="eyebrow spotlight__une">À la une</p>
          <div class="insp-grid" id="galerie" data-filtered="false">
            ${cartes}
          </div>
          <p class="filter-empty spotlight__empty" data-filters-empty="galerie" hidden>Aucune ambiance ne réunit ces deux critères pour l’instant.</p>
          <p class="note-inline spotlight__note">${ICON.bulb.replace('<svg', '<svg width="18" height="18"')}<span>Photographies publiées sur Pexels sous <a href="https://www.pexels.com/license/" rel="noopener">licence Pexels</a>, qui autorise l’usage sur un site. Auteurs et liens sources dans <code>assets/images/CREDITS.md</code>.</span></p>
        </div>
      </section>
${lightbox}
      <section class="section motif-pick" aria-labelledby="motif-pick-title">
        <div class="wrap-wide">
          <div class="motif-pick__head">
            <div>
              <p class="eyebrow">Par motif</p>
              <h2 id="motif-pick-title">Choisir par motif</h2>
            </div>
            <p class="motif-pick__lead">Trois écritures au sol reviennent dans ces ambiances ; chaque fiche détaille rendu, coupes et pièces adaptées.</p>
          </div>
          <div class="motif-pick__list">
            ${choixMotifs}
          </div>
        </div>
      </section>

      <section class="section section--inspi-cta">
        <div class="wrap">
          <div class="cta-band cta-band--compact" data-reveal>
            <div>
              <h2>Vous avez trouvé une ambiance ?</h2>
              <p>Essayez-la dans votre pièce ou décrivez votre projet.</p>
            </div>
            <div class="cta-band__actions">
              <a class="btn btn--light" href="../outils/studio.html">Visualiser mon parquet</a>
              <a class="btn btn--outline-light" href="../projet/">Décrire mon projet</a>
            </div>
          </div>
        </div>
      </section>`;

  write(
    'inspiration/index.html',
    layout({
      title: PAGES['inspiration'].titre,
      description:
        PAGES['inspiration'].description,
      path: 'inspiration/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildTools() {
  const crumbsIndex = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Outils' }]);
  const roadmap = [
    ['Calculateur de surface', 'Surfaces complexes, décrochés, chutes.'],
    ['Calculateur de calepinage', 'Nombre de lames, coupes de rive, répartition.'],
    ['Checklist avant pose', 'Support, acclimatation, outillage, calepinage.'],
    ['Diagnostic du support', 'Planéité, humidité, cohésion, adhérence.'],
    ['Comparateur massif / contrecollé', 'Selon pièce, support et budget.'],
    ['Questionnaire sens de pose', 'Cinq questions, une recommandation.'],
  ];



  const capitale = (s) => s.replace(/^./, (x) => x.toUpperCase());
  const bodyIndex = `      ${crumbsIndex.html}
      <header class="page-hero page-hero--tools">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Outils</p>
            <h1 class="page-hero__title">${PAGES['outils'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['outils'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top" aria-labelledby="outil-principal">
        <div class="wrap-wide">
          <article class="tool-main">
            <div class="tool-main__head">
              <p class="eyebrow">Outil principal</p>
              <h2 class="tool-main__title" id="outil-principal">Visualiseur Parquet</h2>
              <p class="lead">Votre pièce occupe l’écran, le catalogue se range sur le côté, et le sol change à chaque clic. Glissez le curseur : le rendu est calculé ici, dans votre navigateur.</p>
              <div class="cluster">
                <a class="btn" href="studio.html">Visualiser mon parquet</a>
                <a class="link-arrow" href="../inspiration/">Partir d’une ambiance</a>
              </div>
            </div>
            <div class="tool-main__demo">
              ${apercuSquelette('sejour', '../')}
            </div>
            <ul class="tool-main__points">
              <li><strong>${NB_PREMIBEL_VISU} parquets à essayer</strong><span>des références Premibel à leur largeur de lame, en rendu indicatif — ${NB_PREMIBEL_FIDELE} en rendu fidèle</span></li>
              <li><strong>Plusieurs sols</strong><span>une photo peut en contenir plusieurs : le parquet choisi les change tous</span></li>
              <li><strong>${capitale(enLettres(MAX_VERSIONS))} versions</strong><span>enregistrées et comparées sur la même photo</span></li>
              <li><strong>Rien n’est envoyé</strong><span>la photo n’est ni transmise ni conservée</span></li>
            </ul>
          </article>
        </div>
      </section>

      <section class="section section--alt section--compact" aria-labelledby="outil-plan">
        <div class="wrap-wide">
          <article class="tool-block tool-block--reverse tool-block--secondary">
            <div class="tool-block__media">
              <div data-visualizer data-mode="compact" data-base="../"></div>
            </div>
            <div class="tool-block__body">
              <p class="tool-block__num">Outil complémentaire</p>
              <h2 class="tool-block__title" id="outil-plan">Mode Plan</h2>
              <p>Vue du dessus à l’échelle : dimensions, largeur de lame, fenêtre et entrée. Pour trancher le sens de pose avant d’acheter.</p>
              <ul class="tool-block__points">
                <li>${capitale(enLettres(NB_MOTIFS_PLAN))} motifs, du droit au point de Hongrie.</li>
                <li>Surface, lames et chutes estimées à chaque changement : des ordres de grandeur, pas un calepinage.</li>
              </ul>
              <div class="cluster">
                <a class="btn btn--ghost" href="simulateur-pose.html">Ouvrir le Mode Plan</a>
                <a class="link-arrow" href="../guides/quel-sens-de-pose-choisir.html">Comprendre le sens de pose</a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="section section--compact tools-next" aria-labelledby="a-venir">
        <div class="wrap-wide">
          <div class="tools-next__inner">
            <div>
              <p class="eyebrow">À venir</p>
              <h2 class="tools-next__title" id="a-venir">Les outils qui suivront</h2>
              <p class="tools-next__lead">Pas encore disponibles. Même logique : une question concrète, une réponse immédiate, aucune inscription.</p>
            </div>
            <ul class="roadmap roadmap--compact">
              ${roadmap
                .map(([title, text]) => `<li class="roadmap__item"><strong>${title}</strong><span>${text}</span></li>`)
                .join('\n              ')}
            </ul>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'outils/index.html',
    layout({
      title: PAGES['outils'].titre,
      description:
        PAGES['outils'].description,
      path: 'outils/index.html',
      depth: 1,
      css: ['css/pages/tools.css'],
      jsonld: [crumbsIndex.jsonld],
      body: bodyIndex,
    })
  );

  const crumbs = breadcrumb('../', [
    { label: 'Accueil', href: 'index.html' },
    { label: 'Outils', href: 'outils/' },
    { label: 'Simulateur de pose' },
  ]);

  const simFaq = [
    { q: 'Le simulateur remplace-t-il un calepinage ?', a: "Non. Il donne une représentation pédagogique fidèle du motif et une estimation des chutes, mais un calepinage de chantier tient compte des décrochés, des seuils et des tolérances réelles." },
    { q: 'Les quantités affichées sont-elles fiables ?', a: "Ce sont des ordres de grandeur, calculés à partir de la surface, du motif et d'un format de lame moyen. Confirmez toujours avec le calepinage définitif avant de commander." },
    { q: 'Puis-je ajouter d’autres motifs ?', a: "Le simulateur est construit autour d'un registre de motifs : chaque motif est une fonction indépendante, ce qui permet d'en ajouter sans toucher au reste du code." },
  ];

  const body = `      ${crumbs.html}
      <header class="tool-hero wrap">
        <p class="eyebrow">Mode plan · outil</p>
        <h1>${PAGES['simulateur'].h1}</h1>
        <p class="lead">${PAGES['simulateur'].chapo}</p>
        <p class="u-mt-5"><a class="link-arrow" href="visualiseur.html">Plutôt voir le rendu dans une photo ? Ouvrir le visualiseur</a></p>
      </header>

      <section class="tool-shell" id="plan" aria-label="Plan de la pièce et réglages">
        <div class="wrap-wide">
          <div data-visualizer data-base="../"></div>
        </div>
      </section>

      <section class="section section--alt">
        <div class="wrap">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Comment lire le résultat</p>
              <h2>Trois repères à observer</h2>
            </div>
          </div>
          <div class="grid grid--3">
            <div class="tool-card"><h3>La direction dominante</h3><p>Le regard suit les lames. Vérifiez si cette direction accompagne l'entrée de la pièce ou la contredit.</p></div>
            <div class="tool-card"><h3>Les joints face à la lumière</h3><p>La nappe lumineuse indique d'où vient la lumière. Des joints perpendiculaires aux rayons ressortent davantage.</p></div>
            <div class="tool-card"><h3>Les chutes estimées</h3><p>Un motif orienté ou diagonal consomme plus de matière. Ce surplus se commande dès le premier lot.</p></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap-text">
          <h2>Questions fréquentes</h2>
          ${faq(simFaq)}
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'outils/simulateur-pose.html',
    layout({
      title: PAGES['simulateur'].titre,
      description: PAGES['simulateur'].description,
      path: 'outils/simulateur-pose.html',
      depth: 1,
      css: ['css/pages/tools.css'],
      jsonld: [
        crumbs.jsonld,
        faqJsonLd(simFaq),
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Simulateur de pose',
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Navigateur web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          url: `${SITE.domain}/outils/simulateur-pose.html`,
        },
      ],
      body,
    })
  );
}

function buildProjet() {
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Mon projet' }]);
  const points = [
    'Quatre étapes courtes, aucune coordonnée demandée.',



    'Aucune obligation : le formulaire sert à comprendre votre besoin avant de vous orienter.',
    'Les réponses techniques acceptent « je ne sais pas ».',


    'À la fin, vous voyez vers qui vous tourner : Premibel pour le parquet, Allure Design pour la pose en Île-de-France.',
  ];

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Mon projet</p>
            <h1 class="page-hero__title">${PAGES['projet'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['projet'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="project-intro">

            <div data-project-form data-base="../" data-premibel-url="${T.attribut(REGLAGES.premibel_url)}" data-premibel-actif="${REGLAGES.premibel_afficher ? '1' : '0'}" data-allure-actif="${REGLAGES.allure_afficher ? '1' : '0'}">
              <noscript>
                <p>Le formulaire nécessite JavaScript. Pour choisir un parquet : <a href="${T.attribut(REGLAGES.premibel_url)}">${T.texte(REGLAGES.premibel_libelle)}</a>. Pour la pose ou la rénovation à Paris et en Île-de-France : <a href="https://www.allure-design.com/demander-un-devis/">${T.texte(REGLAGES.allure_libelle)}</a>.</p>
              </noscript>
            </div>
            <aside class="stack stack--lg">
              <ul class="project-points">
                ${points.map((point) => `<li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>${point}</span></li>`).join('\n                ')}
              </ul>
              ${tip("<p>Vous hésitez encore sur l'orientation ? Passez d'abord par le simulateur : votre choix sera pré-rempli dans le formulaire.</p>")}
              <a class="btn btn--ghost" href="../outils/simulateur-pose.html">Ouvrir le simulateur</a>
            </aside>
          </div>
        </div>
      </section>`;

  write(
    'projet/index.html',
    layout({
      title: PAGES['projet'].titre,
      description: PAGES['projet'].description,
      path: 'projet/index.html',
      depth: 1,
      css: ['css/pages/project.css', 'components/project-form/project-form.css'],
      jsonld: [crumbs.jsonld],

      runtimeConfig: true,
      body,
    })
  );
}

function buildContact() {
  const v = PAGES['contact'].valeurs;
  const mail = (sujet) => `mailto:${v.email_public}?subject=${encodeURIComponent(sujet)}`;
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Contact' }]);
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Contact</p>
            <h1 class="page-hero__title">${PAGES['contact'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['contact'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">









          <div class="contact-routes">
            <div class="contact-route">
              <p class="eyebrow">${T.texte(v.r1_eyebrow)}</p>
              <h2>${T.texte(v.r1_titre)}</h2>
              <p class="text-muted">${T.texte(v.r1_texte)}</p>
              <a class="link-arrow" href="${T.attribut(mail('Question éditoriale'))}">${T.texte(v.email_public)}</a>
            </div>
            <div class="contact-route">
              <p class="eyebrow">${T.texte(v.r2_eyebrow)}</p>
              <h2>${T.texte(v.r2_titre)}</h2>
              <p class="text-muted">${T.texte(v.r2_texte)}</p>
              <a class="link-arrow" href="${T.attribut(mail('Correction'))}">${T.texte(v.r2_lien)}</a>
            </div>
            <div class="contact-route contact-route--projet">
              <p class="eyebrow">${T.texte(v.r3_eyebrow)}</p>
              <h2>${T.texte(v.r3_titre)}</h2>
              <p>${T.texte(v.r3_texte)}</p>
              <a class="btn btn--sm" href="../projet/">${T.texte(v.r3_cta)}</a>
            </div>
          </div>

          <div class="contact-card contact-card--note">
            <h2>Ce que nous ne faisons pas</h2>
            <ul class="project-points">
              <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucune vente ni paiement sur ce site : nous orientons, nous ne facturons rien.</span></li>
              <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucun démarchage : vos coordonnées ne sont pas revendues.</span></li>
              <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucun guide écrit pour vendre : un lien produit s’ajoute à un texte, il ne le commande jamais.</span></li>
            </ul>
            ${key('<p>Certains liens mènent vers des références de parquet réellement en vente, chez Premibel. C’est écrit <a href="../a-propos/#liens-commerciaux">à la page À propos</a>, et c’est visible sur chaque lien.</p>')}
          </div>
        </div>
      </section>`;

  write(
    'contact/index.html',
    layout({
      title: PAGES['contact'].titre,
      description: PAGES['contact'].description,
      path: 'contact/index.html',
      depth: 1,
      css: ['css/pages/project.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}



const LIBELLE_DESTINATION = {
  premibel: 'Premibel',
  allure_design: 'Allure Design',
  mixed: 'Premibel et Allure Design',
  undetermined: 'Aucune orientation automatique',
};

const ORIENTATION = [
  ['produit', 'Des références de parquet', 'premibel', 'premibel'],
  ['pose', 'La pose, la rénovation intérieure', 'undetermined', 'allure_design'],
  ['produit-pose', 'Les deux', 'premibel', 'mixed'],
  ['renseignement', 'Un simple renseignement', 'undetermined', 'undetermined'],
];

function buildApropos() {
  const v = PAGES['a-propos'].valeurs;


  const nomLie = (cle) =>
    REGLAGES[`${cle}_afficher`]
      ? `<a href="${T.attribut(REGLAGES[`${cle}_url`])}" rel="sponsored noopener">${T.texte(REGLAGES[`${cle}_libelle`])}</a>`
      : T.texte(REGLAGES[`${cle}_libelle`]);
  const presentation = [
    `<h2 id="pourquoi">${T.texte(v.pres1_titre)}</h2>`,
    `<p>${T.texte(v.pres1_texte)}</p>`,
    `<h2 id="methode">${T.texte(v.pres2_titre)}</h2>`,
    `<p>${T.texte(v.pres2_texte)}</p>`,
    `<p><a class="link-arrow" href="methode-editoriale.html">${T.texte(v.pres2_lien)}</a></p>`,
    `<h2 id="outils">${T.texte(v.pres3_titre)}</h2>`,
    `<p>${T.texte(v.pres3_texte)}</p>`,
  ].join('\n              ');
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'À propos' }]);
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">À propos</p>
            <h1 class="page-hero__title">${PAGES['a-propos'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['a-propos'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap-wide">
          <div class="split split--wide-left split--top">
            <div class="prose">
              ${presentation}
            </div>
            <div class="stack stack--lg">
              <div class="figures">
                <div class="figure-item"><strong>${GUIDES.length + MOTIFS.length + TUTOS.length}</strong><span>contenus publiés</span></div>
                <div class="figure-item"><strong>${NB_MOTIFS_PLAN}</strong><span>motifs simulés</span></div>
                <div class="figure-item"><strong>${NB_PIECES}</strong><span>pièces d’exemple</span></div>
              </div>
              ${callout('key', 'Ce que ce site ne fait pas', `<ul>
          <li>Aucune publicité, aucun panier, aucun paiement, aucun prix.</li>
          <li>Aucune coordonnée demandée : vous choisissez de poursuivre auprès du partenaire proposé.</li>
          <li>Aucun lien produit sur un parquet de démonstration, qui n'existe pas en vente.</li>
          <li>Aucune revente de coordonnées.</li>
        </ul>`)}
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="liens-commerciaux">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Transparence</p>
              <h2 id="liens-commerciaux">${T.texte(v.liens_titre)}</h2>
            </div>
            <p class="lead">${T.texte(v.liens_intro)}</p>
          </div>

          <div class="prose">
            <h3>${T.texte(v.roles_titre)}</h3>
          </div>
          ${table(
              ['Qui', 'Métier', 'Ce qu’on y trouve', 'Zone'],
              [
                [T.texte(SITE.name), T.texte(v.pp_metier), T.texte(v.pp_offre), T.texte(v.pp_zone)],
                [nomLie('premibel'), T.texte(v.premibel_metier), T.texte(v.premibel_offre), T.texte(v.premibel_zone)],
                [nomLie('allure'), T.texte(v.allure_metier), T.texte(v.allure_offre), T.texte(v.allure_zone)],
              ]
            )}
          <div class="prose">
            <p>${T.riche(v.liens_note)}</p>

            <h3 id="regle-orientation">Quand nous orientons, et vers qui</h3>
          </div>
          ${table(
              ['Votre besoin', 'Hors Île-de-France', 'En Île-de-France'],
              ORIENTATION.map(([, libelle, hors, idf]) => [
                libelle,
                LIBELLE_DESTINATION[hors],
                LIBELLE_DESTINATION[idf],
              ])
            )}
          <div class="prose">
            <p>La zone se déduit du département que vous indiquez, et d'aucune autre information. Hors des huit départements franciliens, aucune orientation vers un poseur n'est proposée automatiquement : nous préférons ne rien proposer plutôt que proposer quelqu'un qui ne se déplacera pas.</p>

            <h3>Dans le Visualiseur</h3>
            <p>Le Visualiseur propose deux sortes de parquets. Les uns sont des références de démonstration, calculées par le moteur, qui ne correspondent à aucun produit précis. Les autres sont relevées sur des fiches réelles de Premibel : celles-là portent un lien vers leur fiche, et le lien le dit avant qu'on clique. Un parquet de démonstration n'en a pas, et n'en aura pas — proposer d'acheter ce qui n'existe pas serait la pire chose que nous puissions faire.</p>
            <p>Décrire un projet par le formulaire n'engage à rien. À partir de votre besoin et de votre département, <strong>une orientation est calculée immédiatement</strong>, sans vous demander de coordonnées. Vous choisissez ensuite de consulter les parquets de Premibel ou de poursuivre votre projet auprès d’Allure Design selon votre localisation.</p>
            ${key('<p>Ce que cette relation ne change pas : les guides, les fiches motif et les tutoriels sont écrits pour répondre à une question, pas pour amener à un produit. Un lien s’ajoute à un texte quand il l’éclaire ; il ne l’a jamais commandé.</p>')}
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'a-propos/index.html',
    layout({
      title: PAGES['a-propos'].titre,
      description:
        PAGES['a-propos'].description,
      path: 'a-propos/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildMethode() {
  const v = PAGES['methode-editoriale'].valeurs;
  const lienPartenaire = (cle) =>
    REGLAGES[`${cle}_afficher`]
      ? `<a href="${T.attribut(REGLAGES[`${cle}_url`])}" rel="sponsored noopener">${T.texte(REGLAGES[`${cle}_libelle`])}</a>`
      : T.texte(REGLAGES[`${cle}_libelle`]);
  const crumbs = breadcrumb('../', [
    { label: 'Accueil', href: 'index.html' },
    { label: 'À propos', href: 'a-propos/' },
    { label: 'Méthode éditoriale' },
  ]);

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">À propos</p>
            <h1 class="page-hero__title">${PAGES['methode-editoriale'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['methode-editoriale'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top section--compact">
        <div class="wrap">
          <div class="method-intro">
            <div>
              <h2 id="qui">${T.texte(v.qui_titre)}</h2>
              <p>${T.texte(v.qui_texte)}</p>
            </div>
            <div>
              <h2 id="corrections">${T.texte(v.corrections_titre)}</h2>
              <p>${T.lien(v.corrections_texte, '../contact/')}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt section--compact" aria-labelledby="construction">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Méthode</p>
              <h2 id="construction">${T.texte(v.construction_titre)}</h2>
            </div>
            <p class="lead">${T.texte(v.construction_intro)}</p>
          </div>
          <ol class="steps-grid">
            ${[1, 2, 3, 4].map((n) => `<li><span class="steps-grid__num">0${n}</span><strong>${T.texte(v[`etape${n}_titre`])}</strong><span>${T.texte(v[`etape${n}_texte`])}</span></li>`).join('\n            ')}
          </ol>
        </div>
      </section>

      <section class="section">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Principes</p>
              <h2 id="verification">${T.texte(v.principes_titre)}</h2>
            </div>
            <p class="lead">${T.texte(v.principes_intro)}</p>
          </div>
          <div class="principles">
            ${[1, 2, 3, 4].map((n) => `<div class="principle">
              <h3>${T.texte(v[`principe${n}_titre`])}</h3>
              <p>${T.texte(v[`principe${n}_texte`])}</p>
              <p class="principle__ex"><span>Exemple</span>${T.riche(v[`principe${n}_exemple`])}</p>
            </div>`).join('\n            ')}
          </div>
          ${callout('warning', T.texte(v.refus_titre), `<ul>
              ${T.lignes(v.refus).map((l) => `<li>${T.texte(l)}</li>`).join('\n              ')}
            </ul>`)}
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="liens-commerciaux">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Transparence</p>
              <h2 id="liens-commerciaux">${T.texte(v.liens_titre)}</h2>
            </div>
            <p class="lead">${T.texte(v.liens_intro)}</p>
          </div>
          ${table(
            ['Type de lien', 'Ce qu’il sert à faire', 'Où il apparaît', 'Où il n’apparaît jamais'],
            [
              [
                'De référence',
                'Établir un fait : AFNOR, CSTB, FCBA',
                'En bas d’article, dans les sources',
                'Au milieu d’un raisonnement, en guise d’argument',
              ],
              [
                'Produit',
                `Ouvrir la fiche d’une référence réellement en vente chez ${lienPartenaire('premibel')}`,
                'Là où l’on regarde un parquet précis : le Visualiseur, la fiche du produit',
                'Dans un texte qui explique une méthode',
              ],
              [
                'Chantier',
                `Mener au formulaire projet, qui peut orienter vers ${lienPartenaire('allure')} pour la pose en Île-de-France`,
                'Sur les tutoriels de pose, là où l’on peut décider de ne pas poser soi-même',
                'Dans un guide de décision',
              ],
            ]
          )}
          <div class="prose">
            <p>Un parquet de démonstration n’a pas de lien produit, et n’en aura pas : il n’existe pas en vente. Le détail de la relation est <a href="index.html#liens-commerciaux">à la page À propos</a>.</p>
            ${key('<p>Ce qu’aucun de ces liens ne fait : changer un contenu. Un seuil de planéité, un taux de chutes, un sens de pose conseillé ne dépendent pas de ce qui se vend quelque part, et un guide qui recommanderait un produit parce qu’il est vendu ne servirait plus à rien — ni à vous, ni à celui qui le vend.</p>')}
          </div>
        </div>
      </section>

      ${ctaBand('../')}`;

  write(
    'a-propos/methode-editoriale.html',
    layout({
      title: PAGES['methode-editoriale'].titre,
      description:
        PAGES['methode-editoriale'].description,
      path: 'a-propos/methode-editoriale.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}



const DATE_REPERE = '2001-01-01';
function buildGabaritsApercu() {
  const item = (extra) => ({
    slug: 'apercu',
    title: '%%PP_TITRE%%',
    description: '%%PP_DESCRIPTION%%',
    h1: '%%PP_H1%%',
    lead: '%%PP_INTRO%%',
    category: '%%PP_CATEGORIE%%',
    reading: '%%PP_LECTURE%%',
    date: DATE_REPERE,
    body: '%%PP_CORPS%%',
    faq: [],
    related: [],
    ...extra,
  });
  const reperes = (html) =>
    html
      .replace(`<time datetime="${DATE_REPERE}">${frDate(DATE_REPERE)}</time>`, '<time datetime="%%PP_DATE_ISO%%">%%PP_DATE%%</time>')
      .replace('<div class="article-layout">', '%%PP_COUVERTURE%%\n        <div class="article-layout">');
  const gabarits = {
    guide: editorialPage(item({}), { section: 'guides', sectionLabel: 'Guides', dir: 'guides/', aside: asideGuide() }),
    tutoriel: editorialPage(item({ level: '%%PP_NIVEAU%%', duration: '%%PP_DUREE%%', tools: ['%%PP_OUTILS%%'] }), {
      section: 'tutoriels',
      sectionLabel: 'Tutoriels',
      dir: 'tutoriels/',
      aside: asideTuto({ tools: ['%%PP_OUTILS%%'] }),
      jsonldType: 'HowTo',
    }),
    article: editorialPage(item({}), { section: 'blog', sectionLabel: 'Blog', dir: 'blog/', aside: asideGuide() }),
  };
  for (const [nom, html] of Object.entries(gabarits)) ecrireTexte(path.join(ROOT, 'data', 'apercu', `${nom}.tpl`), reperes(html));
}

function buildHome() {
  const body = buildHomeBody({ GUIDES, TUTOS });

  write(
    'index.html',
    layout({
      title: PAGES['accueil'].titre,
      description:
        PAGES['accueil'].description,
      path: 'index.html',
      depth: 0,
      ogImage: 'assets/images/hero-wide.jpg',
      css: ['css/pages/home.css'],
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE.domain}/#site`,
          name: SITE.name,
          url: SITE.domain,
          inLanguage: 'fr-FR',
          description: SITE.baseline,
          publisher: { '@id': `${SITE.domain}/#organisation` },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${SITE.domain}/#organisation`,
          name: SITE.name,
          url: SITE.domain,
          logo: `${SITE.domain}/${REGLAGES.logo && REGLAGES.logo.chemin || 'assets/icons/icon-512.png'}`,
        },
        faqJsonLd(FAQ_ACCUEIL()),
      ],
      body,
    })
  );
}

function build404() {


  const body = `      <section class="section section--below-header">
        <div class="wrap-text u-center">
          <p class="eyebrow">Erreur 404</p>
          <h1>Cette lame n'est pas au bon endroit.</h1>
          <p class="lead lead--center">La page demandée n'existe pas ou a été déplacée. Reprenons depuis un repère connu.</p>
          <div class="cluster cluster--center">
            <a class="btn" href="index.html">Retour à l'accueil</a>
            <a class="btn btn--ghost" href="guides/">Voir les guides</a>
            <a class="btn btn--ghost" href="outils/simulateur-pose.html">Ouvrir le simulateur</a>
          </div>
        </div>
      </section>`;
  write(
    '404.html',
    layout({
      title: 'Page introuvable | Pose Parquet',
      description: 'La page demandée est introuvable. Retrouvez les guides, les motifs et le simulateur de pose.',
      path: '404.html',
      depth: 0,


      robots: 'noindex, follow',
      body,
    })
  );
}

function buildMeta() {
  const jour = (d) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null);
  const plusRecent = (...dates) => dates.map(jour).filter(Boolean).sort().pop() || null;
  const datePage = (cle) => jour((PAGES[cle] || {}).modifie);
  const dateItem = (item) => plusRecent(item.modifie, item.updated, item.date);
  const page = (url, priority, lastmod) => ({ url, priority, lastmod: jour(lastmod) });
  const article = (dir, cleDe = () => null) => (item) =>
    page(`${dir}/${item.slug}.html`, '0.7', plusRecent(dateItem(item), cleDe(item) && datePage(cleDe(item))));

  const dGuides = plusRecent(datePage('guides'), ...GUIDES.map(dateItem));
  const dMotifs = plusRecent(datePage('motifs'), ...MOTIFS.map((m) => datePage(`motif-${m.slug}`)));
  const dTutos = plusRecent(datePage('tutoriels'), ...TUTOS.map(dateItem));
  const dBlog = plusRecent(datePage('blog'), ...ARTICLES.map(dateItem));
  const dOutils = plusRecent(datePage('outils'), datePage('visualiseur'), datePage('simulateur'), datePage('studio'));

  const urls = [
    page('index.html', '1.0', plusRecent(datePage('accueil'), dGuides, dMotifs, dTutos, dBlog, dOutils)),
    page('guides/index.html', '0.8', dGuides),
    ...GUIDES.map(article('guides')),
    page('motifs/index.html', '0.8', dMotifs),
    ...MOTIFS.map(article('motifs', (m) => `motif-${m.slug}`)),
    page('tutoriels/index.html', '0.8', dTutos),
    ...TUTOS.map(article('tutoriels')),
    ...(ARTICLES.length ? [page('blog/index.html', '0.7', dBlog), ...ARTICLES.map(article('blog'))] : []),
    page('inspiration/index.html', '0.8', datePage('inspiration')),
    page('outils/index.html', '0.8', dOutils),
    page('outils/visualiseur.html', '0.9', datePage('visualiseur')),
    page('outils/simulateur-pose.html', '0.8', datePage('simulateur')),
    page('outils/studio.html', '0.8', datePage('studio')),
    page('projet/index.html', '0.7', datePage('projet')),
    page('contact/index.html', '0.5', datePage('contact')),
    page('a-propos/index.html', '0.5', datePage('a-propos')),
    page('a-propos/methode-editoriale.html', '0.5', datePage('methode-editoriale')),
    page('mentions-legales/index.html', '0.3', datePage('mentions-legales')),
    page('confidentialite/index.html', '0.3', datePage('confidentialite')),
    page('plan-du-site/index.html', '0.3', plusRecent(datePage('plan-du-site'), dGuides, dMotifs, dTutos, dBlog)),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${SITE.domain}/${entry.url.replace(/index\.html$/, '')}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  write('sitemap.xml', sitemap);
  write(
    'robots.txt',
    `User-agent: *
Allow: /

${process.env.SITE_ENVIRONMENT === 'production' ? `Sitemap: ${SITE.domain}/sitemap.xml` : ''}
`
  );

  buildRuntimeConfig();
}



function buildRuntimeConfig() {
  write(
    'config.js',
    `
window.POSE_PARQUET_CONFIG = window.POSE_PARQUET_CONFIG || {};
`
  );
}




function buildDataIndex() {
  const index = {
    genere: '2026-09-01',
    guides: GUIDES.map((g) => ({ slug: g.slug, titre: g.h1, url: 'guides/' + g.slug + '.html', categorie: g.category, tags: g.tags, lecture: g.reading, resume: g.excerpt })),
    motifs: MOTIFS.map((m) => ({ slug: m.slug, titre: m.h1, url: 'motifs/' + m.slug + '.html', motif: m.pattern, stats: Object.fromEntries(m.stats) })),
    tutoriels: TUTOS.map((t) => ({ slug: t.slug, titre: t.h1, url: 'tutoriels/' + t.slug + '.html', niveau: t.level, duree: t.duration })),
    outils: [
      { slug: 'visualiseur', titre: 'Visualiseur Parquet', url: 'outils/visualiseur.html', etat: 'disponible' },
      { slug: 'simulateur-pose', titre: 'Simulateur de pose', url: 'outils/simulateur-pose.html', etat: 'disponible' },
    ],
  };
  write('data/contenus.json', JSON.stringify(index, null, 2));
}




require('./plan-teintes').ecrirePlanTeintes();
const build = buildAssets(ROOT, {
  pageCss: [
    'css/pages/listing.css',
    'css/pages/article.css',
    'css/pages/tools.css',
    'css/pages/project.css',
    'css/pages/home.css',


  ],
});

buildDiagrams();
buildDataIndex();
buildHome();
buildGuides();
buildMotifs();
buildTutos();
buildBlog();


exigeCoherence();
buildInspiration();
buildTools();
buildVisualiseurPage(write);
buildProjet();
buildContact();
buildApropos();
buildMethode();
buildPagesLegales(write, { GUIDES, TUTOS, MOTIFS, ARTICLES });


{
  const { A_COMPLETER } = require('./content-pages');
  const manquants = ['mentions-legales', 'confidentialite'].flatMap((cle) =>
    (PAGES[cle].champs || [])
      .filter((d) => String(PAGES[cle].valeurs[d.cle] || '').includes(A_COMPLETER))
      .map((d) => `${PAGES[cle].nom} → ${d.groupe} → ${d.libelle}`)
  );
  if (manquants.length) {
    const message = `Pages légales à compléter dans WordPress (Pose Parquet → Pages) :\n  - ${manquants.join('\n  - ')}`;
    if (process.env.SITE_ENVIRONMENT === 'production') throw new Error(message);
    console.warn(`[pages légales] ${message}`);
  }
}
buildGabaritsApercu();
build404();
buildMeta();



write('data/catalogue-etat.json', `${JSON.stringify(require('./etat-catalogue').etatCatalogue(), null, 1)}
`);





const RETOUR_SITE = MAINTENANCE_ACTIVE
  ? `<script>(function(){if(!/\\/maintenance\\.html$/.test(location.pathname)||!window.fetch)return;fetch('assets/maintenance.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(m){if(m&&m.actif===false)location.replace('./');}).catch(function(){});})();</script>`
  : `<script>if(!/[?&]apercu=1(&|$)/.test(location.search))location.replace('./');</script>`;
if (SOURCE_WP.maintenance) {
  write('maintenance.html', WORDPRESS.pageMaintenance(SOURCE_WP.maintenance).replace('<head>', `<head>
    ${RETOUR_SITE}`));
  write('assets/maintenance.json', `${JSON.stringify({ actif: MAINTENANCE_ACTIVE })}
`);
}



function ecrireSignature() {
  const git = (args, defaut) => {
    try { return require('child_process').execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
    catch { return defaut; }
  };
  write('assets/dev-build.json', `${JSON.stringify({
    commit: git(['rev-parse', 'HEAD'], 'inconnu'),
    commitCourt: git(['rev-parse', '--short', 'HEAD'], 'inconnu'),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], 'inconnue'),


    propre: git(['status', '--porcelain'], '')
      .split(String.fromCharCode(10)).map((l) => l.trim())
      .filter((l) => l && !l.endsWith('sitemap.xml')).length === 0
      ? 'oui' : 'non (modifications non commitees)',
    page: 'outils/visualiseur-produit.html',
    bundle: build.productJs,
    ui: 'v2',
    date: new Date().toISOString(),
  }, null, 2)}
`);
}
ecrireSignature();



const horsParcours = exclusions(['assets', 'backend', 'docs', 'design', 'components']);
const pagesEcrites = (function lister(dossier, prefixe) {
  const out = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) {
      if (horsParcours(entree.name)) continue;
      out.push(...lister(path.join(dossier, entree.name), `${prefixe}${entree.name}/`));
    } else if (entree.name.endsWith('.html')) {
      out.push(`${prefixe}${entree.name}`);
    }
  }
  return out;
})(ROOT, '');

const anomalies = verifierRattachements(ROOT, pagesEcrites);
if (anomalies.length) {
  console.error('\nRattachement des feuilles de style incohérent :');
  anomalies.forEach((a) => console.error('  ' + a));
  process.exit(1);
}

require('./check-headings').verifierTitres(ROOT);
console.log('Site généré dans', ROOT);
console.log(`Assets : ${build.css} (${Math.round(build.sizes.css / 1024)} Ko), ${build.js} (${build.sizes.js} modules)`);
console.log(
  'Feuilles par page : ' +
    build.pageBundles
      .map((b) => `${b.nom} ${Math.round(fs.statSync(path.join(ROOT, b.url)).size / 1024)} Ko`)
      .join(', ')
);
console.log(`${pagesEcrites.length} pages vérifiées : marqueur et feuille concordent.`);
