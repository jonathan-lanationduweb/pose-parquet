/* Génération des pages statiques de pose-parquet.com */
const fs = require('fs');
const path = require('path');
const { SITE, layout, breadcrumb } = require('./layout');
const { ICON, tip, key, faq, faqJsonLd, linkArrow, table, callout } = require('./ui');
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');
const { PAGES } = require('./content-pages');
const { REGLAGES } = require('./content-site');
const T = require('./textes');
const images = require('./images');
const { PHOTOS, INSPIRATION_PHOTOS } = require('./photos');
const { exigeCoherence } = require('./check-inspiration');
const { buildHomeBody, apercuSquelette } = require('./home');
const { buildVisualiseurPage } = require('./visualiseur');
const { resolveSources } = require('./sources');
const { NB_PIECES, PIECES, HORS_BIBLIOTHEQUE } = require('./scenes');
const { NB_PREMIBEL_VISU, NB_PREMIBEL_FIDELE, enLettres } = require('./catalogue');
const { MAX_VERSIONS } = require('../js/studio/app.js');
/* Les motifs du Mode Plan viennent de la liste que l'outil lui-même déroule. */
const NB_MOTIFS_PLAN = require('../js/tools/patterns.js').PATTERNS.length;
const { buildAssets, verifierRattachements } = require('./assets');
const { exclusions } = require('./arborescence');
const { ecrireTexte } = require('./eol');
const { picture } = require('./responsive');
/*
 * WordPress, source éditoriale : si un instantané existe
 * (data/wordpress/contenus.json, tiré par `node _generator/wordpress.js pull`),
 * ses textes, images et réglages remplacent ceux du dépôt AVANT toute
 * construction. Sans instantané, rien ne change. Voir wordpress.js.
 */
const WORDPRESS = require('./wordpress');
const SOURCE_WP = WORDPRESS.appliquer({ GUIDES, TUTOS, PAGES, INSPIRATION_PHOTOS, PHOTOS });
SOURCE_WP.avertissements.forEach((m) => console.warn(`[wordpress] ${m}`));
const MAINTENANCE_ACTIVE = Boolean(SOURCE_WP.maintenance && SOURCE_WP.maintenance.actif);

const ROOT = process.env.SITE_ROOT || path.join(process.env.USERPROFILE || '', 'Desktop', 'pose-parquet.com');

/*
 * Toutes les sorties texte du site passent par ici, et toutes sortent en LF.
 *
 * Le HTML nait de literaux de gabarit ecrits dans les fichiers de ce dossier :
 * sans normalisation, il heriterait des fins de ligne de `_generator/*.js`
 * telles que le checkout les a posees, et le site genere differerait d'une
 * machine a l'autre. Voir eol.js.
 */
/*
 * Maintenance activée dans WordPress : chaque page renvoie vers
 * maintenance.html, sauf en aperçu (`?apercu=1`, mémorisé par un cookie de
 * session). Sur un hébergement statique (GitHub Pages) c'est tout ce qu'on peut
 * faire — sans statut 503. Avec un serveur, la règle 503 est dans
 * docs/backend/wordpress-contenus.md ; serve.js l'applique en local.
 */
function porteMaintenance(relPath, content) {
  if (!MAINTENANCE_ACTIVE || !relPath.endsWith('.html') || relPath === 'maintenance.html' || relPath === '404.html') return content;
  const prefixe = '../'.repeat(relPath.split('/').length - 1);
  const porte = `<script>/* Maintenance activée (WordPress → Pose Parquet → Maintenance). Voir le vrai site : ?apercu=1 */(function(){try{if(/[?&]apercu=1(&|$)/.test(location.search))document.cookie='pp_apercu=1; path=/; SameSite=Lax';if(/(^|; )pp_apercu=1/.test(document.cookie))return;}catch(e){}location.replace('${prefixe}maintenance.html');})();</script>`;
  return content.replace('<head>', `<head>
    ${porte}`);
}
const write = (relPath, content) => ecrireTexte(path.join(ROOT, relPath), porteMaintenance(relPath, content));

const frDate = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ */
/* Visuels                                                             */
/* ------------------------------------------------------------------ */

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
      <text x="${w / 2}" y="${h + 34}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="18" fill="#6d7b84">${cell.caption}</text>
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

  // Schemas explicatifs : vectoriels, produits pour le site.
  ecrireTexte(path.join(dir, 'guide-sens-proportions.svg'), proportionsFigure());
  ecrireTexte(path.join(dir, 'lumiere-avant.svg'), lightFigure('across'));
  ecrireTexte(path.join(dir, 'lumiere-apres.svg'), lightFigure('along'));

  // Les icônes sont produites par _generator/make-icons.js et ne sont
  // jamais écrasées ici.

  // Les photographies sont telechargees par _generator/fetch-photos.js
  // et ne sont jamais ecrasees par ce script.
  fs.mkdirSync(path.join(ROOT, 'assets', 'videos'), { recursive: true });
}

/* ------------------------------------------------------------------ */
/* Données transverses                                                 */
/* ------------------------------------------------------------------ */

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

/**
 * Cet article a-t-il une couverture fiable ?
 *
 * L'audit visuel a trouve des couvertures qui montraient autre chose que ce
 * que leur page raconte — un mur perce pour un tutoriel de pose, une pose
 * flottante pour un tutoriel de collage. Quand l'image juste n'existe pas
 * encore, la cle est retiree de `photos.js` sous un bloc IMAGE_REQUIRED qui
 * dit ce qu'il faudrait, et les gabarits s'en apercoivent ici.
 *
 * Consequences : la page se passe de couverture, la carte garde son cadre
 * mais reste un aplat. Un vide assume vaut mieux qu'une photographie qui
 * enseigne le geste inverse.
 */
const aUneCouverture = (slug) => Boolean(PHOTOS[`cover-${slug}`]);

const guideBySlug = (slug) => GUIDES.find((guide) => guide.slug === slug);

/* ------------------------------------------------------------------ */
/* Fragments                                                           */
/* ------------------------------------------------------------------ */

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
        <div class="grid grid--3">
          ${items.map((item) => articleCard(item, base, 'guides/')).join('\n          ')}
        </div>
      </section>`;
}

function ctaBand(base) {
  return `<section class="section">
      <div class="wrap">
        <div class="cta-band" data-reveal>
          <div>
            <h2>Un projet de pose à préparer ?</h2>
            <p>Décrivez votre pièce, votre support et le rendu recherché en quatre étapes, sans laisser vos coordonnées : vous voyez aussitôt vers qui vous tourner.</p>
          </div>
          <div class="cta-band__actions">
            <a class="btn btn--light" href="${base}projet/">Décrire mon projet</a>
            <a class="btn btn--outline-light" href="${base}outils/studio.html">Visualiser mon parquet</a>
          </div>
        </div>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Gabarit éditorial                                                   */
/* ------------------------------------------------------------------ */

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
      inLanguage: 'fr-FR',
      datePublished: published,
      dateModified: updated,
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
    css: ['css/pages/article.css'],
    jsonld,
    body,
  });
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

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

function buildGuides() {
  GUIDES.forEach((guide) => {
    const aside = asideGuide();
    write(
      `guides/${guide.slug}.html`,
      editorialPage(guide, { section: 'guides', sectionLabel: 'Guides', dir: 'guides/', aside })
    );
  });

  const featured = GUIDES[0];
  const rest = GUIDES.slice(1);
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Guides' }]);

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Guides</p>
            <h1 class="page-hero__title">${PAGES['guides'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['guides'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="listing-featured">
            <article class="feature-card${aUneCouverture(featured.slug) ? '' : ' feature-card--attente'}" data-reveal>
              ${aUneCouverture(featured.slug)
                ? picture(`cover-${featured.slug}`, { base: '../', alt: '', sizes: '(min-width: 60rem) 45rem, 94vw', priority: true })
                : ''}
              <p class="eyebrow">${featured.category}</p>
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
              ${tip('<p>Chaque guide se termine par un simulateur ou une checklist : de quoi passer de la lecture à la décision.</p>')}
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
      ${ctaBand('../')}`;

  write(
    'guides/index.html',
    layout({
      title: PAGES['guides'].titre,
      description:
        PAGES['guides'].description,
      path: 'guides/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

/*
 * Du motif éditorial au motif que le moteur sait poser.
 *
 * Les six fiches décrivent six écritures au sol ; le Visualiseur n'en dessine
 * que trois. « Dans la longueur », « dans la largeur » et « en diagonale »
 * sont trois orientations d'une même pose à lames droites — le moteur les
 * obtient en tournant `lames`, pas en changeant de motif.
 *
 * L'ANGLE N'EST PAS FORCÉ, et c'est délibéré. Dans le Studio, l'angle est
 * relatif au plan du sol de la photographie, pas aux murs de la pièce : rien
 * ne garantit que 0° suive la longueur de CETTE pièce-là. Envoyer
 * `orientation=0` pour « dans la longueur » afficherait donc un rendu faux
 * une fois sur deux. La diagonale, elle, reste diagonale quelle que soit la
 * pièce — mais par cohérence on laisse le visiteur régler l'angle, ce que le
 * panneau Orientation fait en un clic.
 *
 * Ce que le lien promet est donc seulement ce qu'il tient : ouvrir le
 * Visualiseur sur le bon motif.
 */
const MOTIF_VERS_STUDIO = {
  longueur: 'lames',
  largeur: 'lames',
  diagonale: 'lames',
  'point-de-hongrie': 'point-de-hongrie',
  'baton-rompu': 'baton-rompu',
};

function buildMotifs() {
  MOTIFS.forEach((motif) => {
    /*
     * La sortie produit d'une fiche motif.
     *
     * Elle mène au Visualiseur et non directement chez un marchand : à ce
     * stade le visiteur cherche à voir, pas à acheter. C'est une fois le
     * parquet posé sur sa photo que la fiche produit a du sens — et c'est là
     * qu'elle apparaît. Griller l'étape reviendrait à répondre « achetez »
     * à quelqu'un qui demande « à quoi ça ressemble ».
     */
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

    const item = {
      ...motif,
      category: 'Motifs',
      date: '2026-08-12',
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
  const carteMotif = (motif) => `<a class="pattern-card" href="${motif.slug}.html" data-reveal>
                <div class="pattern-card__viz" data-pattern-thumb="${motif.pattern}"></div>
                <h3>${motifName(motif)}</h3>
                <p>${motif.excerpt}</p>
                <span class="mono">Chutes ${motif.stats[0][1].split(' (')[0]}</span>
              </a>`;
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Motifs de pose</p>
            <h1 class="page-hero__title">Six façons de dessiner un sol</h1>
          </div>
          <p class="page-hero__lead">Le motif décide du caractère de la pièce autant que l'essence du bois. Chaque fiche détaille le rendu, les contraintes de pose, le niveau de chutes attendu — un ordre de grandeur, jamais un calcul — et les pièces adaptées.</p>
        </div>
      </header>

      <section class="section section--flush-top" aria-labelledby="motifs-droits">
        <div class="wrap">
          <!--
            DEUX FAMILLES, PAS SIX CARTES DE MÊME POIDS.

            La grille alignait six fiches identiques, puis une section entière
            reprenait deux d'entre elles pour les comparer. Les motifs se
            rangent pourtant d'eux-mêmes : quatre façons d'orienter des lames
            droites, et deux motifs en V qui se confondent. La seconde famille
            porte donc la comparaison, et la section séparée disparaît.
          -->
          <div class="motif-family">
            <div class="motif-family__head">
              <h2 id="motifs-droits">Lames droites : choisir une direction</h2>
              <p>Le même parquet, posé dans un sens ou un autre : c’est la direction qui allonge, élargit ou dynamise la pièce.</p>
            </div>
            <div class="grid grid--4 motif-family__grid">
              ${MOTIFS.filter((m) => !MOTIFS_EN_V.includes(m.slug)).map(carteMotif).join('\n              ')}
            </div>
          </div>

          <div class="motif-family motif-family--v" aria-labelledby="motifs-v">
            <div class="motif-family__head">
              <h2 id="motifs-v">Les motifs en V : deux dessins souvent confondus</h2>
              <p>Point de Hongrie et bâton rompu dessinent tous deux un V. Le premier coupe ses lames à l’onglet et file en pointe continue ; le second pose des lames droites à angle droit, en escalier.</p>
              <p>${linkArrow('../guides/point-de-hongrie-ou-baton-rompu.html', 'Lire le comparatif complet')}</p>
            </div>
            <div class="grid grid--2 motif-family__grid">
              ${MOTIFS.filter((m) => MOTIFS_EN_V.includes(m.slug)).map(carteMotif).join('\n              ')}
            </div>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;


  write(
    'motifs/index.html',
    layout({
      title: 'Motifs de pose du parquet : lesquels choisir | Pose Parquet',
      description:
        "Pose droite, dans la longueur, dans la largeur, diagonale, Point de Hongrie, bâton rompu : rendu, chutes, difficulté et pièces adaptées pour chaque motif.",
      path: 'motifs/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
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
            <!--
              La sortie chantier, sur les tutoriels et nulle part ailleurs.

              Un tutoriel de pose est le seul endroit du site où quelqu'un
              peut légitimement changer d'avis en lisant : découvrir le nombre
              d'étapes, l'outillage, les points de contrôle, et décider que ce
              n'est pas pour lui. Lui proposer là de confier le chantier
              répond à une question qu'il vient de se poser.

              Dans un guide de décision — « quel sens de pose ? » — la même
              proposition serait hors sujet : on y cherche à comprendre, pas à
              déléguer.

              Le lien mène au formulaire, pas chez le poseur : c'est ce qui
              permet de qualifier le besoin et la zone avant d'orienter. Voir
              js/commerce/allure.js.
            -->
            <div class="aside-box">
              <h3>Vous préférez confier la pose ?</h3>
              <p>Décrivez votre projet : nous orientons vers un poseur selon votre région. En Île-de-France, la pose et la rénovation sont assurées par Allure Design.</p>
              <a class="btn btn--ghost btn--sm" href="../projet/?besoin=pose">Faire poser mon parquet</a>
            </div>`;
}

function buildTutos() {
  TUTOS.forEach((tuto) => {
    const aside = asideTuto(tuto);
    const item = { ...tuto, category: 'Tutoriel', date: tuto.date || '2026-08-16', related: ['preparer-son-sol-avant-la-pose', 'erreurs-a-eviter-avant-de-poser', 'quel-sens-de-pose-choisir'] };
    write(
      `tutoriels/${tuto.slug}.html`,
      editorialPage(item, { section: 'tutoriels', sectionLabel: 'Tutoriels', dir: 'tutoriels/', aside, jsonldType: 'HowTo' })
    );
  });

  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Tutoriels' }]);
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Tutoriels</p>
            <h1 class="page-hero__title">${PAGES['tutoriels'].h1}</h1>
          </div>
          <p class="page-hero__lead">${PAGES['tutoriels'].chapo}</p>
        </div>
      </header>

      <section class="section section--flush-top" aria-labelledby="tuto-liste">
        <div class="wrap">
          <h2 class="visually-hidden" id="tuto-liste">Tous les tutoriels</h2>
          <!--
            UN TUTORIEL À LA UNE, LES AUTRES EN LISTE.

            Trois cartes de même poids, dont deux en aplat vide — leurs
            photographies justes n'existent pas encore (IMAGE_REQUIRED dans
            photos.js). La carte illustrée passe à la une ; les deux autres
            deviennent des lignes, où l'absence d'image ne se remarque pas.
          -->
          <div class="listing-featured">
            ${(() => {
              const une = TUTOS.find((x) => aUneCouverture(x.slug)) || TUTOS[0];
              const autres = TUTOS.filter((x) => x !== une);
              return `<article class="feature-card${aUneCouverture(une.slug) ? '' : ' feature-card--attente'}" data-reveal>
              ${aUneCouverture(une.slug) ? picture(`cover-${une.slug}`, { base: '../', alt: '', sizes: '(min-width: 60rem) 45rem, 94vw', priority: true }) : ''}
              <p class="eyebrow">${une.level} · ${une.duration}</p>
              <h2><a href="${une.slug}.html">${une.h1}</a></h2>
              <p>${une.excerpt}</p>
            </article>
            <div class="listing-side">
              <div class="cluster-list">
                ${autres.map((x) => `<a href="${x.slug}.html"><strong>${x.h1}</strong><span>${x.level} · ${x.duration}</span></a>`).join('\n                ')}
              </div>
              ${tip('<p>Avant de poser, vérifiez la planéité et l’humidité du support : c’est la cause de la plupart des désordres. <a href="../guides/preparer-son-sol-avant-la-pose.html">Préparer le support</a>.</p>')}
            </div>`;
            })()}
          </div>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="tuto-methode">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Ce que vous trouverez</p>
              <h2 id="tuto-methode">Un tutoriel, quatre repères</h2>
            </div>
            <p class="lead">Tous suivent la même trame, pour que vous puissiez travailler avec la page ouverte à côté de vous.</p>
          </div>
          <ol class="steps-grid">
            <li><span class="steps-grid__num">01</span><strong>L’outillage réellement nécessaire</strong><span>Ce qu’il faut sortir avant de commencer, et ce dont on peut se passer.</span></li>
            <li><span class="steps-grid__num">02</span><strong>Le déroulé du chantier</strong><span>Les étapes dans l’ordre, avec ce qui se joue à chacune.</span></li>
            <li><span class="steps-grid__num">03</span><strong>Les points de contrôle</strong><span>Ce qu’il faut vérifier avant de passer à la suite, tant que c’est rattrapable.</span></li>
            <li><span class="steps-grid__num">04</span><strong>Les erreurs coûteuses</strong><span>Celles qui obligent à déposer, et comment les éviter.</span></li>
          </ol>
        </div>
      </section>

      <section class="section" aria-labelledby="tuto-outil">
        <div class="wrap-wide">
          <div class="tool-block">
            <div class="tool-block__media">
              ${apercuSquelette('chambre', '../')}
            </div>
            <div class="tool-block__body">
              <p class="tool-block__num">Avant de commencer</p>
              <h2 class="tool-block__title" id="tuto-outil">Voir le résultat avant de couper la première lame</h2>
              <p class="lead">Le sens de pose et le motif se décident sur le papier, mais se jugent à l’œil. Essayez-les sur une photo de votre pièce.</p>
              <div class="cluster">
                <a class="btn" href="../outils/visualiseur.html">Visualiser mon parquet</a>
                <a class="link-arrow" href="../guides/">Lire les guides</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'tutoriels/index.html',
    layout({
      title: PAGES['tutoriels'].titre,
      description:
        PAGES['tutoriels'].description,
      path: 'tutoriels/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

/**
 * L'adresse du Studio pour une carte, et les quatre conditions qui l'autorisent.
 *
 * Une carte ne l'obtient que si elle déclare un `sceneId` ET que cette scène
 * est publiable dans le manifeste — géométrie ET rendu validés. Deux raisons
 * de le vérifier ICI plutôt que dans les données : la liste des inspirations
 * ne sait pas ce que vaut une scène, et une scène rétrogradée à la revue doit
 * faire disparaître le bouton sans que personne y pense.
 *
 * Pas de repli. Une carte sans scène correspondante n'est pas cliquable : elle
 * reste une inspiration, ce qu'elle a toujours été.
 */
function lienStudio(item) {
  if (!item.visualizerAvailable || !item.sceneId) return null;
  /*
   * La scène peut être publiable sans figurer dans « Changer de pièce » :
   * c'est le cas du couloir en enfilade, dont le sol ne fait que 7 pour
   * cent du cadre. Ne chercher que dans la bibliothèque rendait sa carte
   * muette alors que check-inspiration la comptait essayable — le contrôle
   * et la page ne regardaient pas la même liste.
   */
  const scene =
    PIECES.find((p) => p.id === item.sceneId) || HORS_BIBLIOTHEQUE.find((p) => p.id === item.sceneId);
  if (!scene) return null;
  /*
   * La condition qui manquait, et dont l'absence a produit huit faux liens :
   * la scene doit ouvrir LE MEME FICHIER que la carte affiche. On compare
   * fichier contre fichier, pas identifiant contre identifiant.
   *
   * Et on JETTE au lieu de retomber en silence. Les trois conditions
   * precedentes rendent la carte muette — une scene retrogradee a la revue
   * doit faire disparaitre le lien sans que personne y pense. Celle-ci est
   * d'une autre nature : une carte qui se declare essayable en montrant une
   * autre photo que le Studio est exactement le defaut qu'on vient de
   * reparer. Le site ne se construit pas tant qu'elle n'est pas corrigee.
   */
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

/**
 * Une carte d'inspiration : la photographie, puis ce qu'elle montre.
 *
 * La page présentait huit ambiances dans un carrousel où une seule dominait ;
 * sept restaient derrière deux flèches. Elle les pose désormais toutes à
 * plat : une à la une, sa voisine, puis une grille. On voit tout en faisant
 * défiler la page, sans apprendre une interaction — et le filtre ne cache
 * rien derrière un compteur.
 *
 * La légende dit ce que la PHOTOGRAPHIE montre, motif réel et teinte réelle,
 * et le Studio s'ouvre sur cette même configuration. Les données ont été
 * corrigées en regardant chaque fichier, voir _generator/photos.js.
 *
 * Toute la carte est la cible ; « Essayer dans le Studio » est une
 * affordance, pas un second lien : un seul arrêt de tabulation par ambiance.
 * Une carte sans scène publiable s'agrandit au lieu de promettre un essai.
 *
 * `sizes` suit la grille : la une occupe deux tiers de la largeur sur grand
 * écran, les autres un tiers ; sur tablette la une en prend 58 pour cent et
 * la grille passe à deux colonnes ; sur téléphone la une et sa voisine sont
 * pleine largeur, et les six autres passent en format compact, photo à
 * gauche sur 42 pour cent de la carte — six cartes pleine largeur faisaient
 * 2 800 px à elles seules, soit trois écrans de téléphone pour six liens.
 */
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
  /*
   * Un lien peut contenir des blocs (titre en <h3>), un bouton ne peut
   * contenir que du texte en ligne : la carte non essayable n'a donc pas de
   * titre de section, ce qui est juste — elle n'ouvre rien.
   */
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
  return `<article class="${classes}" data-tags="${item.tags}">
              ${surface}
            </article>`;
}

/*
 * Ordre d'affichage. Les données gardent leur ordre — `fetch-photos` et
 * l'accueil s'y réfèrent par index — et la page choisit ce qu'elle met en
 * avant : la chambre parisienne, parce que son point de Hongrie se lit sans
 * légende ; la pièce aux arcades à côté, parce que son bâton rompu est
 * l'autre motif en V, et que les deux côte à côte apprennent la différence.
 */
const UNE_INSPIRATION = 'room-chambre-parisienne';
const VOISINE_INSPIRATION = 'room-piece-arcades';

/*
 * Les filtres se déduisent des étiquettes : un motif ou une pièce sans carte
 * n'a pas de pastille, et une étiquette sans libellé arrête la construction
 * plutôt que de laisser une carte qu'aucun filtre ne peut atteindre.
 */
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

/* Les trois motifs que les photographies montrent, dessinés par le moteur du
   Plan (js/tools/patterns.js) : un rendu géométrique ne se trompe pas de
   motif, là où une photo « générique » peut montrer l'autre V. */
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

  /* La loupe n'existe que s'il reste une ambiance qui n'ouvre pas le Studio. */
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

  /* Trois lignes basses : le rendu à gauche, le nom et le lien à droite. Une
     carte de catalogue en 4/3 par motif faisait 800 px sur téléphone pour
     trois liens ; la section doit se traverser, pas se visiter. */
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

  /*
   * LA PAGE OUTILS — 2 octobre 2026.
   *
   * Elle montrait les deux outils en blocs de même poids, puis une feuille de
   * route de six outils futurs sur une section entière : à la lecture, trois
   * blocs comparables dont un « bientôt ». Et l'aperçu du Visualiseur partait
   * d'une boîte de 0 px que le script remplissait d'un coup — 535 px qui
   * poussaient tout le reste.
   *
   * Désormais : l'OUTIL PRINCIPAL d'abord, en grand, avec son aperçu réel
   * (le même composant que l'accueil, squelette réservé dans le HTML) ; puis
   * l'outil COMPLÉMENTAIRE, le Mode Plan, avec son vrai plan interactif ; puis,
   * en note discrète, ce qui viendra. Aucune photographie de décoration : la
   * page montre les outils eux-mêmes.
   */
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
        <h1>Une pièce. Plusieurs directions.</h1>
        <p class="lead">Vue du dessus, à l'échelle : renseignez vos dimensions, placez la fenêtre et l'entrée, comparez les motifs. Les quantités affichées sont des estimations indicatives.</p>
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
      title: 'Simulateur de sens de pose du parquet | Pose Parquet',
      description:
        "Simulateur gratuit : dessinez votre pièce, placez la fenêtre et comparez pose droite, largeur, diagonale, Point de Hongrie et bâton rompu en temps réel.",
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
    // Pose Parquet oriente ensuite vers Premibel ou Allure Design : « pas à
    // vendre » disait vrai pour le formulaire, mais pouvait se lire comme une
    // absence de suite commerciale. Celle-ci décrit ce qui se passe.
    'Aucune obligation : le formulaire sert à comprendre votre besoin avant de vous orienter.',
    'Les réponses techniques acceptent « je ne sais pas ».',
    // Pose-Parquet ne rappelle personne : le parcours se termine par une
    // orientation que le visiteur suit lui-même (js/forms/orientation.js).
    'À la fin, vous voyez vers qui vous tourner : Premibel pour le parquet, Allure Design pour la pose en Île-de-France.',
  ];

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Mon projet</p>
            <h1 class="page-hero__title">Décrivez votre projet</h1>
          </div>
          <p class="page-hero__lead">Quelques informations suffisent à comprendre un chantier : la pièce, le support, le rendu recherché et le délai.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="project-intro">
            <!-- Les liens commerciaux de Mon site (WordPress), pour l'écran d'orientation : js/forms/orientation.js. -->
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
      title: 'Décrire un projet de pose de parquet | Pose Parquet',
      description:
        "Décrivez votre projet de parquet en quatre étapes — pièce, surface, motif, besoin, délai — et voyez vers qui vous tourner : Premibel pour le parquet, Allure Design pour la pose en Île-de-France.",
      path: 'projet/index.html',
      depth: 1,
      css: ['css/pages/project.css', 'components/project-form/project-form.css'],
      jsonld: [crumbs.jsonld],
      // Seule page qui parle au backend : seule page qui charge config.js.
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
          <!--
            TROIS RAISONS D'ÉCRIRE, TROIS CHEMINS.

            Une question sur un contenu et une demande de chantier n'ont pas le
            même destinataire. La seconde passe par le formulaire projet : c'est
            lui qui qualifie le besoin et la zone, puis oriente vers Premibel ou
            Allure Design. Un courriel commercial ici ne ferait que retarder la
            réponse.
          -->
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

/*
 * La règle d'orientation, telle qu'elle est publiée sur /a-propos/.
 *
 * Elle est écrite UNE fois dans `js/forms/lead-context.js`, appliquée par le
 * formulaire, et redite ici pour le lecteur. Deux écritures, donc un risque
 * de divergence : `check-routage` relit ce tableau dans la page construite et
 * le compare, case par case, à ce que rend `destinationRecommandee`. Si la
 * règle change et que cette page ne suit pas, le contrôle échoue.
 */
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
  // Un partenaire désactivé dans « Mon site » reste nommé (le tableau dit qui
  // fait quoi), sans lien.
  const nomLie = (cle) =>
    REGLAGES[`${cle}_afficher`]
      ? `<a href="${T.attribut(REGLAGES[`${cle}_url`])}" rel="noopener">${T.texte(REGLAGES[`${cle}_libelle`])}</a>`
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
          <li>Aucun envoi automatique : une personne relit chaque demande avant tout contact.</li>
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
            <p>Décrire un projet par le formulaire n'engage à rien et ne déclenche aucun envoi automatique : le formulaire demande de quoi vous avez besoin et où se situe le projet, une orientation est proposée, et <strong>une personne la confirme ou la corrige</strong> avant tout contact.</p>
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
      ? `<a href="${T.attribut(REGLAGES[`${cle}_url`])}" rel="noopener">${T.texte(REGLAGES[`${cle}_libelle`])}</a>`
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

/*
 * GABARITS D'APERÇU — l'aperçu public d'un guide ou d'un tutoriel depuis
 * WordPress, avant publication.
 *
 * WordPress ne sait pas mettre en page un article : c'est le travail de ce
 * générateur. Il publie donc la page d'article elle-même — même gabarit,
 * mêmes feuilles, même en-tête — avec des repères %%PP_…%% à la place des
 * textes. WordPress remplace les repères par le brouillon (échappé, corps
 * filtré) et sert la page à l'éditeur connecté, avec une <base> vers les
 * fichiers du site. Voir backend/pose-parquet-core/src/Contenus/Apercu.php.
 *
 * Écrits sans la porte de maintenance (ce ne sont pas des pages du site) et
 * dans data/apercu/, que rien ne lie.
 */
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
          name: SITE.name,
          url: SITE.domain,
          inLanguage: 'fr-FR',
          description: SITE.baseline,
        },
      ],
      body,
    })
  );
}

function build404() {
  /*
   * `section--below-header` : la 404 est la seule page dont le <main> commence
   * par une section nue, sans fil d'Ariane ni hero pour dégager l'en-tête fixe.
   * Le modificateur vit dans css/global.css, avec les autres poids de section —
   * pas une marge écrite ici pour cette page seule.
   */
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
      /*
       * `noindex, follow` : une page d'erreur n'a aucune raison de figurer dans
       * les résultats de recherche, mais ses liens vers l'accueil, les guides
       * et le simulateur restent de vrais liens qu'un moteur peut suivre.
       * `nofollow` les gaspillerait sans rien protéger.
       */
      robots: 'noindex, follow',
      body,
    })
  );
}

function buildMeta() {
  const today = new Date().toISOString().slice(0, 10);
  const page = (url, priority, lastmod) => ({ url, priority, lastmod: lastmod || today });
  const article = (dir) => (item) =>
    page(`${dir}/${item.slug}.html`, '0.7', item.updated || item.date);

  const urls = [
    page('index.html', '1.0'),
    page('guides/index.html', '0.8'),
    ...GUIDES.map(article('guides')),
    page('motifs/index.html', '0.8'),
    ...MOTIFS.map(article('motifs')),
    page('tutoriels/index.html', '0.8'),
    ...TUTOS.map(article('tutoriels')),
    page('inspiration/index.html', '0.8'),
    page('outils/index.html', '0.8'),
    page('outils/visualiseur.html', '0.9'),
    page('outils/simulateur-pose.html', '0.8'),
    page('projet/index.html', '0.7'),
    page('contact/index.html', '0.5'),
    page('a-propos/index.html', '0.5'),
    page('a-propos/methode-editoriale.html', '0.5'),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${SITE.domain}/${entry.url.replace(/index\.html$/, '')}</loc>
    <lastmod>${entry.lastmod}</lastmod>
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

Sitemap: ${SITE.domain}/sitemap.xml
`
  );

  buildRuntimeConfig();
}

/**
 * `config.js` — le seul fichier que le déploiement a le droit de réécrire.
 *
 * Le problème qu'il résout : l'adresse du backend n'est pas la même en
 * développement, en préproduction et en production, et elle n'est pas encore
 * connue pour les deux dernières. Jusqu'ici la seule façon de la définir était
 * `js/forms/api-config.js`, c'est-à-dire du code métier — donc un commit, une
 * relecture et une reconstruction pour ce qui est une donnée d'environnement.
 *
 * Ce fichier est volontairement NEUTRE dans le dépôt : il crée l'objet de
 * configuration sans y poser `apiBaseUrl`. L'absence de la clé laisse
 * `api-config.js` décider par son tableau d'hôtes, exactement comme avant. Le
 * déploiement, lui, remplace ce seul fichier quand la variable
 * `API_BASE_URL` est définie — voir .github/workflows/deploy-pages.yml.
 *
 * Il est chargé uniquement par la page qui en a besoin (le formulaire projet),
 * en script classique donc avant les modules, et sans empreinte dans son nom :
 * un nom stable est précisément ce qui permet de le remplacer au déploiement.
 */
function buildRuntimeConfig() {
  write(
    'config.js',
    `/*
 * Configuration d'environnement — généré par _generator/build.js.
 *
 * Neutre par défaut : aucune adresse d'API n'est posée ici, et c'est voulu.
 * Le tableau des hôtes de js/forms/api-config.js décide alors seul, et un
 * environnement sans backend affiche honnêtement son indisponibilité.
 *
 * Le déploiement remplace ce fichier — et lui seul — pour brancher l'API :
 *
 *   window.POSE_PARQUET_CONFIG.apiBaseUrl =
 *     'https://admin.pose-parquet.com/wp-json/pose-parquet/v1';
 *
 * Ne rien écrire ici à la main : la prochaine construction l'effacerait.
 */
window.POSE_PARQUET_CONFIG = window.POSE_PARQUET_CONFIG || {};
`
  );
}

/* ------------------------------------------------------------------ */


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

/* Les assets sont construits en premier : le HTML a besoin de leurs empreintes.
   Toutes les feuilles de page entrent dans le bundle unique, dans l'ordre où
   elles étaient chargées auparavant — la cascade est donc identique. */
const build = buildAssets(ROOT, {
  pageCss: [
    'css/pages/listing.css',
    'css/pages/article.css',
    'css/pages/tools.css',
    'css/pages/project.css',
    'css/pages/home.css',
    /*
     * `components/project-form/project-form.css` N'EST PLUS ici.
     *
     * Elle y était restée quand la feuille est devenue un paquet de page
     * (BUNDLES_PAGE, entrée « formulaire »). Elle partait donc deux fois : dans
     * le paquet global servi aux 32 pages, et dans le paquet dédié servi à
     * /projet/. Les 7,5 Ko que le découpage devait retirer étaient toujours
     * payés par tout le site, et la seule page qui s'en sert les téléchargeait
     * en double.
     *
     * Les feuilles qui restent dans cette liste sont celles qu'aucun marqueur
     * ne peut rattacher : elles s'appliquent à des familles de pages entières
     * (listing, article, outils, projet, accueil) et non à un composant.
     */
  ],
});

buildDiagrams();
buildDataIndex();
buildHome();
buildGuides();
buildMotifs();
buildTutos();
/*
 * Le contrat Inspiration → Studio est vérifié AVANT d'écrire la page : une
 * carte qui se déclare essayable en montrant une autre photo que celle que le
 * Studio ouvrira arrête la construction. Voir check-inspiration.js.
 */
exigeCoherence();
buildInspiration();
buildTools();
buildVisualiseurPage(write);
buildProjet();
buildContact();
buildApropos();
buildMethode();
buildGabaritsApercu();
build404();
buildMeta();

/*
 * État du catalogue Premibel pour l'administration WordPress (lecture seule,
 * Pose Parquet → Catalogue Premibel). Déterministe : voir etat-catalogue.js.
 */
write('data/catalogue-etat.json', `${JSON.stringify(require('./etat-catalogue').etatCatalogue(), null, 1)}
`);

/*
 * Page de maintenance du site statique : écrite dès qu'un instantané WordPress
 * existe (pour pouvoir la prévisualiser), active seulement si WordPress le dit.
 * Même gabarit et même feuille que la page servie par WordPress.
 */
/*
 * Le visiteur que la porte a renvoyé ici garde maintenance.html dans sa barre
 * d'adresse : sans retour, il resterait sur « Le site revient bientôt » après
 * la réouverture, même en rechargeant. Maintenance désactivée, la page renvoie
 * donc vers l'accueil (sauf en aperçu, `?apercu=1`) ; activée, elle relit
 * assets/maintenance.json au chargement, pour qu'une copie gardée en cache ne
 * retienne personne une fois le site rouvert.
 */
const RETOUR_SITE = MAINTENANCE_ACTIVE
  ? `<script>/* Maintenance : si le site a été rouvert depuis, retour à l'accueil. */(function(){if(!/\\/maintenance\\.html$/.test(location.pathname)||!window.fetch)return;fetch('assets/maintenance.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(m){if(m&&m.actif===false)location.replace('./');}).catch(function(){});})();</script>`
  : `<script>/* Maintenance désactivée : cette page renvoie vers le site. Aperçu : ?apercu=1 */if(!/[?&]apercu=1(&|$)/.test(location.search))location.replace('./');</script>`;
if (SOURCE_WP.maintenance) {
  write('maintenance.html', WORDPRESS.pageMaintenance(SOURCE_WP.maintenance).replace('<head>', `<head>
    ${RETOUR_SITE}`));
  write('assets/maintenance.json', `${JSON.stringify({ actif: MAINTENANCE_ACTIVE })}
`);
}

/*
 * Signature de build, pour le développement seulement.
 *
 * Une revue humaine a un jour comparé des captures à un rapport sans pouvoir
 * dire QUELLE application les avait produites : deux interfaces existaient sur
 * la machine — le prototype UX de pose-parquet-ai et le produit intégré — et
 * elles se ressemblaient assez pour être confondues. Ce fichier lève
 * l'ambiguïté : ouvert avec `?dev=1`, le visualiseur écrit en console le
 * commit, la branche, la page et l'empreinte du bundle qu'il exécute.
 *
 * Il n'est PAS publié : `.gitignore` l'exclut, et la page ne le lit qu'en mode
 * développement. En production la signature se réduit à ce que la page porte
 * déjà — son chemin et l'empreinte de son bundle.
 */
function ecrireSignature() {
  const git = (args, defaut) => {
    try { return require('child_process').execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
    catch { return defaut; }
  };
  write('assets/dev-build.json', `${JSON.stringify({
    commit: git(['rev-parse', 'HEAD'], 'inconnu'),
    commitCourt: git(['rev-parse', '--short', 'HEAD'], 'inconnu'),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], 'inconnue'),
    /* `sitemap.xml` est re-tamponne par CE build : le juger salirait
       toujours l'arbre. Voir la convention dans _generator/README.md. */
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

/*
 * Le découpage du CSS ne vaut que s'il est vérifié.
 *
 * On relit les pages écrites et on compare, pour chaque feuille rattachée, la
 * présence du marqueur et celle du lien. Une divergence arrête la
 * construction : mieux vaut ne rien publier qu'une page dont le composant
 * principal est sans style.
 */
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

console.log('Site généré dans', ROOT);
console.log(`Assets : ${build.css} (${Math.round(build.sizes.css / 1024)} Ko), ${build.js} (${build.sizes.js} modules)`);
console.log(
  'Feuilles par page : ' +
    build.pageBundles
      .map((b) => `${b.nom} ${Math.round(fs.statSync(path.join(ROOT, b.url)).size / 1024)} Ko`)
      .join(', ')
);
console.log(`${pagesEcrites.length} pages vérifiées : marqueur et feuille concordent.`);
