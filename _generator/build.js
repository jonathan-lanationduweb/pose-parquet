/* Génération des pages statiques de pose-parquet.com */
const fs = require('fs');
const path = require('path');
const { SITE, layout, breadcrumb } = require('./layout');
const { ICON, tip, key, faq, faqJsonLd, linkArrow } = require('./ui');
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');
const images = require('./images');
const { PHOTOS, INSPIRATION_PHOTOS } = require('./photos');
const { buildHomeBody } = require('./home');

const ROOT = process.env.SITE_ROOT || path.join(process.env.USERPROFILE || '', 'Desktop', 'pose-parquet.com');

const write = (relPath, content) => {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
};

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
  fs.writeFileSync(path.join(dir, 'guide-sens-proportions.svg'), proportionsFigure(), 'utf8');
  fs.writeFileSync(path.join(dir, 'lumiere-avant.svg'), lightFigure('across'), 'utf8');
  fs.writeFileSync(path.join(dir, 'lumiere-apres.svg'), lightFigure('along'), 'utf8');

  const icons = path.join(ROOT, 'assets', 'icons');
  fs.mkdirSync(icons, { recursive: true });
  fs.writeFileSync(path.join(icons, 'favicon.svg'), images.favicon(), 'utf8');

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

const guideBySlug = (slug) => GUIDES.find((guide) => guide.slug === slug);

/* ------------------------------------------------------------------ */
/* Fragments                                                           */
/* ------------------------------------------------------------------ */

function articleCard(item, base, hrefDir, badge) {
  return `<article class="card" data-tags="${(item.tags || []).join(' ')}" data-reveal>
            <div class="card__media">
              <img src="${base}assets/images/cover-${item.slug}.jpg" alt="" loading="lazy" decoding="async" width="1400" height="875" />
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
            <p>Décrivez votre pièce, votre support et le rendu recherché en cinq étapes. Vous recevez une réponse construite, sans démarchage.</p>
          </div>
          <div class="cta-band__actions">
            <a class="btn btn--light" href="${base}projet/">Décrire mon projet</a>
            <a class="btn btn--outline-light" href="${base}outils/simulateur-pose.html">Ouvrir le simulateur</a>
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

  const jsonld = [
    crumbs.jsonld,
    {
      '@context': 'https://schema.org',
      '@type': jsonldType,
      headline: item.h1,
      description: item.description,
      inLanguage: 'fr-FR',
      datePublished: item.date || '2026-08-01',
      author: { '@type': 'Organization', name: SITE.name },
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
              ${item.date ? `<li>Mis à jour le ${frDate(item.date)}</li>` : ''}
              ${item.level ? `<li>Niveau ${item.level}</li>` : ''}
              ${item.duration ? `<li>${item.duration}</li>` : ''}
            </ul>
          </div>
        </div>
      </header>

      <div class="wrap-wide">
        <div class="article-cover" data-reveal>
          <img src="${base}assets/images/cover-${item.slug}.jpg" alt="${photoAlt(`cover-${item.slug}`) || item.h1}"
            width="1400" height="875" decoding="async" fetchpriority="high" />
        </div>

        <div class="article-layout">
          <article class="prose" id="article-content">
${item.body}
            ${faqBlock}
            <nav class="article-nav" aria-label="Poursuivre la lecture">
              ${linkArrow(`${base}${dir}`, `Tous les ${sectionLabel.toLowerCase()}`)}
              ${linkArrow(`${base}outils/simulateur-pose.html`, 'Ouvrir le simulateur de pose')}
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

function buildGuides() {
  GUIDES.forEach((guide) => {
    const aside = `<div class="aside-box">
              <h3>Visualiser ce sujet</h3>
              <p>Le simulateur de pose applique ces principes à vos dimensions réelles.</p>
              <a class="btn btn--ghost btn--sm" href="../outils/simulateur-pose.html">Ouvrir le simulateur</a>
            </div>
            <div class="aside-box">
              <h3>Décrire un projet</h3>
              <p>Cinq étapes pour cadrer votre chantier : pièce, support, motif, délai.</p>
              <a class="btn btn--sm" href="../projet/">Commencer</a>
            </div>`;
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
            <h1 class="page-hero__title">Comprendre avant de poser</h1>
          </div>
          <p class="page-hero__lead">Des guides pratiques sur le choix du parquet, la préparation du support, le sens de pose, les motifs et les finitions. Écrits pour être utiles sur le chantier, pas pour remplir une page.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="listing-featured">
            <article class="feature-card" data-reveal>
              <img src="../assets/images/cover-${featured.slug}.jpg" alt="" width="1400" height="875" decoding="async" fetchpriority="high" />
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
      title: 'Guides de pose du parquet : choisir, préparer, poser | Pose Parquet',
      description:
        "Tous les guides Pose Parquet : sens de pose, préparation du support, motifs, massif ou contrecollé, erreurs à éviter. Des repères concrets pour réussir votre chantier.",
      path: 'guides/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildMotifs() {
  MOTIFS.forEach((motif) => {
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
            </div>`;

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
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Motifs de pose</p>
            <h1 class="page-hero__title">Six façons de dessiner un sol</h1>
          </div>
          <p class="page-hero__lead">Le motif décide du caractère de la pièce autant que l'essence du bois. Chaque fiche détaille le rendu, les contraintes de pose, les chutes attendues et les pièces adaptées.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="grid grid--3">
            ${MOTIFS.map(
              (motif) => `<a class="pattern-card" href="${motif.slug}.html" data-reveal>
              <div class="pattern-card__viz" data-pattern-thumb="${motif.pattern}"></div>
              <h3>${motifName(motif)}</h3>
              <p>${motif.excerpt}</p>
              <span class="mono">${motif.stats[0][1]} de chutes</span>
            </a>`
            ).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="section section--alt">
        <div class="wrap">
          <div class="section-head">
            <p class="eyebrow">Comparer</p>
            <h2>Deux motifs souvent confondus</h2>
          </div>
          <div class="split">
            <div class="stack">
              <p class="lead">Point de Hongrie et bâton rompu produisent tous deux un effet de chevrons, mais ne se posent ni ne se commandent de la même façon.</p>
              ${linkArrow('../guides/point-de-hongrie-ou-baton-rompu.html', 'Lire le comparatif complet')}
            </div>
            <div class="grid grid--2">
              <div class="pattern-card"><div class="pattern-card__viz" data-pattern-thumb="point-de-hongrie"></div><h3>Point de Hongrie</h3><p>Coupe d'onglet, pointe continue.</p></div>
              <div class="pattern-card"><div class="pattern-card__viz" data-pattern-thumb="baton-rompu"></div><h3>Bâton rompu</h3><p>Lames droites, décrochés en escalier.</p></div>
            </div>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'motifs/index.html',
    layout({
      title: 'Motifs de pose du parquet : droite, diagonale, chevrons | Pose Parquet',
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

function buildTutos() {
  TUTOS.forEach((tuto) => {
    const aside = `<div class="aside-box">
              <h3>Outillage</h3>
              <ul class="meta-list meta-list--stack">
                ${tuto.tools.map((tool) => `<li>${tool}</li>`).join('')}
              </ul>
            </div>
            <div class="aside-box">
              <h3>Avant de commencer</h3>
              <p>Vérifiez la planéité et l'humidité du support : c'est la cause de la majorité des désordres.</p>
              <a class="btn btn--ghost btn--sm" href="../guides/preparer-son-sol-avant-la-pose.html">Préparer le support</a>
            </div>`;
    const item = { ...tuto, category: 'Tutoriel', date: '2026-08-16', related: ['preparer-son-sol-avant-la-pose', 'erreurs-a-eviter-avant-de-poser', 'quel-sens-de-pose-choisir'] };
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
            <h1 class="page-hero__title">Le geste, étape par étape</h1>
          </div>
          <p class="page-hero__lead">Des déroulés de chantier détaillés, avec l'outillage nécessaire, les points de contrôle et les erreurs qui coûtent cher.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="grid grid--3">
            ${TUTOS.map((tuto) => articleCard(tuto, '../', 'tutoriels/', tuto.level)).join('\n            ')}
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'tutoriels/index.html',
    layout({
      title: 'Tutoriels de pose de parquet pas à pas | Pose Parquet',
      description:
        "Tutoriels détaillés : poser un parquet flottant, coller un contrecollé, réussir son calepinage. Outillage, étapes et points de contrôle.",
      path: 'tutoriels/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildInspiration() {
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Inspiration' }]);
  const gallery = INSPIRATIONS.map(
    (item, index) => `<button class="gallery__item gallery__item--${item.size}" type="button"
              data-lightbox-trigger="${item.title} — ${item.meta}" aria-label="Agrandir : ${item.title}">
              <img src="../assets/images/inspi-${index + 1}.jpg" alt="${item.alt}" loading="lazy" decoding="async" width="900" height="700" />
              <span class="gallery__caption"><span>${item.title}</span><span class="mono">${item.meta}</span></span>
            </button>`
  ).join('\n            ');

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Inspiration</p>
            <h1 class="page-hero__title">Des sols, des directions, des ambiances</h1>
          </div>
          <p class="page-hero__lead">Une sélection de configurations réelles, classées par motif et par type de pièce. Chaque visuel indique le motif et le type de pose retenus.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap-wide">
          <div class="gallery">
            ${gallery}
          </div>
          <p class="note-inline u-mt-5">${ICON.bulb.replace('<svg', '<svg width="18" height="18"')}<span>Photographies libres de droits (Pexels), listées dans <code>assets/images/CREDITS.md</code> et remplaçables par vos propres visuels.</span></p>
        </div>
      </section>

      <div class="modal modal--media" data-modal data-lightbox id="lightbox" role="dialog" aria-modal="true" aria-label="Visuel agrandi">
        <div class="modal__dialog">
          <button class="modal__close" type="button" data-modal-close aria-label="Fermer">${ICON.alert.replace(ICON.alert, '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>')}</button>
          <div data-lightbox-slot></div>
          <p class="modal__caption" data-lightbox-caption></p>
        </div>
      </div>
      ${ctaBand('../')}`;

  write(
    'inspiration/index.html',
    layout({
      title: 'Inspiration parquet : motifs, sens de pose et ambiances | Pose Parquet',
      description:
        "Galerie d'inspiration : pose droite, diagonale, Point de Hongrie et bâton rompu dans des séjours, chambres, cuisines et couloirs.",
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

  const bodyIndex = `      ${crumbsIndex.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Outils</p>
            <h1 class="page-hero__title">Une boîte à outils, pas une brochure</h1>
          </div>
          <p class="page-hero__lead">Des outils simples, utilisables depuis un téléphone sur le chantier comme depuis un bureau au moment de décider.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="grid grid--2">
            <div class="tool-card" data-reveal>
              <div class="tool-card__head"><h3>Studio de pose</h3><span class="badge badge--sage">Disponible</span></div>
              <p>Dessinez votre pièce, placez la fenêtre et l'entrée, comparez cinq motifs de pose en direct. Surface, chutes estimées et nombre de lames sont recalculés à chaque changement.</p>
              <div class="cluster">
                <a class="btn" href="simulateur-pose.html">Ouvrir le simulateur</a>
                <a class="link-arrow" href="../guides/quel-sens-de-pose-choisir.html">Comprendre le sens de pose</a>
              </div>
            </div>
            <div class="tool-card tool-card--soon" data-reveal data-reveal-delay="80">
              <div class="tool-card__head"><h3>Prochainement</h3><span class="badge badge--outline">En préparation</span></div>
              <p>Les outils suivants viendront compléter le studio, avec la même logique : une question concrète, une réponse immédiate.</p>
              <ul class="meta-list meta-list--stack">
                ${roadmap.map(([title, text]) => `<li><strong>${title}</strong> — ${text}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'outils/index.html',
    layout({
      title: 'Outils parquet : simulateur de pose et calculateurs | Pose Parquet',
      description:
        "Les outils Pose Parquet : simulateur de sens de pose, et prochainement calculateur de surface, calepinage, checklist avant pose et diagnostic du support.",
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
        <p class="eyebrow">Studio de pose</p>
        <h1>Une pièce. Plusieurs directions.</h1>
        <p class="lead">Renseignez vos dimensions, placez la fenêtre et l'entrée, puis comparez les motifs. Le rendu se met à jour immédiatement.</p>
      </header>

      <section class="tool-shell">
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
          name: 'Studio de pose',
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
    'Cinq étapes courtes, aucune question inutile.',
    'Aucune obligation : le formulaire sert à cadrer un projet, pas à vendre.',
    'Les réponses techniques acceptent « je ne sais pas ».',
    'Vos coordonnées ne servent qu’à répondre à cette demande.',
  ];

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Mon projet</p>
            <h1 class="page-hero__title">Décrivez votre projet de pose</h1>
          </div>
          <p class="page-hero__lead">Quelques informations suffisent à comprendre un chantier : la pièce, le support, le rendu recherché et le délai.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="project-intro">
            <div data-project-form>
              <noscript>
                <p>Le formulaire nécessite JavaScript. Vous pouvez décrire votre projet par email : <a href="mailto:projet@pose-parquet.com">projet@pose-parquet.com</a>.</p>
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
        "Formulaire en cinq étapes pour décrire votre projet de pose : localisation, pièce, surface, type de parquet, support, motif et délai.",
      path: 'projet/index.html',
      depth: 1,
      css: ['css/pages/project.css', 'components/project-form/project-form.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildContact() {
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'Contact' }]);
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Contact</p>
            <h1 class="page-hero__title">Une question, une correction, une idée d'outil ?</h1>
          </div>
          <p class="page-hero__lead">Le site est écrit et maintenu par une petite équipe. Les retours de terrain sont particulièrement bienvenus.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="contact-grid">
            <div class="contact-card">
              <h2>Écrire</h2>
              <p class="text-muted">Pour une question éditoriale, un signalement d'erreur ou une proposition de contenu.</p>
              <p><a class="link-arrow" href="mailto:bonjour@pose-parquet.com">bonjour@pose-parquet.com</a></p>
              <hr class="rule" />
              <h3>Projet de pose</h3>
              <p class="text-muted">Pour décrire un chantier, le formulaire dédié est plus efficace qu'un email.</p>
              <a class="btn btn--sm" href="../projet/">Décrire mon projet</a>
            </div>
            <div class="contact-card">
              <h2>Ce que nous ne faisons pas</h2>
              <ul class="project-points">
                <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucune vente de parquet ni de matériel sur ce site.</span></li>
                <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucun démarchage : vos coordonnées ne sont pas revendues.</span></li>
                <li>${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Aucun contenu sponsorisé déguisé en guide.</span></li>
              </ul>
              ${key('<p>Les rares liens sortants sont éditoriaux : ils apparaissent lorsqu’une ressource externe complète réellement le propos.</p>')}
            </div>
          </div>
        </div>
      </section>`;

  write(
    'contact/index.html',
    layout({
      title: 'Contact | Pose Parquet',
      description: "Contacter l'équipe éditoriale de Pose Parquet : question, correction, proposition de contenu ou d'outil.",
      path: 'contact/index.html',
      depth: 1,
      css: ['css/pages/project.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildApropos() {
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: 'À propos' }]);
  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">À propos</p>
            <h1 class="page-hero__title">Un média pratique sur la pose du parquet</h1>
          </div>
          <p class="page-hero__lead">Pose Parquet documente ce qui se décide avant la première lame : le support, le sens, le motif, la méthode.</p>
        </div>
      </header>

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="split">
            <div class="prose">
              <h2 id="pourquoi">Pourquoi ce site</h2>
              <p>La documentation sur le parquet se partage entre catalogues commerciaux et notices techniques. Entre les deux, il manquait un endroit pour comprendre les décisions : pourquoi ce sens plutôt qu'un autre, ce que change réellement un ragréage, ce qui distingue deux motifs à chevrons.</p>
              <h2 id="methode">Notre méthode</h2>
              <p>Chaque contenu part d'une question concrète et se termine par une décision possible. Les chiffres cités correspondent aux pratiques courantes du métier et aux seuils usuels des documents techniques. Lorsqu'un sujet dépend du produit, nous le disons plutôt que de généraliser.</p>
              <h2 id="outils">Des outils plutôt que des promesses</h2>
              <p>Le simulateur de pose est le premier d'une série. L'objectif est simple : transformer une hésitation en visualisation, puis en décision.</p>
              <h2 id="independance">Indépendance</h2>
              <p>Le site ne vend rien et n'héberge aucune publicité. Quelques liens sortants pointent vers des ressources externes lorsqu'elles complètent le propos, sans contrepartie éditoriale.</p>
            </div>
            <div class="stack stack--lg">
              <img src="../assets/images/apropos-studio.jpg" alt="Comparaison d’échantillons de bois et de matières sur un plan de travail" width="1400" height="875" loading="lazy" decoding="async" class="aside-image" />
              <div class="figures">
                <div class="figure-item"><strong>${GUIDES.length + MOTIFS.length + TUTOS.length}</strong><span>contenus publiés</span></div>
                <div class="figure-item"><strong>5</strong><span>motifs simulés</span></div>
                <div class="figure-item"><strong>0</strong><span>produit vendu</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      ${ctaBand('../')}`;

  write(
    'a-propos/index.html',
    layout({
      title: 'À propos de Pose Parquet | Média pratique sur la pose du parquet',
      description:
        "Pose Parquet est un média indépendant consacré à la pose du parquet : guides, motifs, tutoriels et outils de visualisation. Aucune vente, aucune publicité.",
      path: 'a-propos/index.html',
      depth: 1,
      css: ['css/pages/listing.css'],
      jsonld: [crumbs.jsonld],
      body,
    })
  );
}

function buildHome() {
  const body = buildHomeBody({ GUIDES, TUTOS });

  write(
    'index.html',
    layout({
      title: 'Pose Parquet — Comprendre, préparer et réussir la pose de son parquet',
      description:
        "Média pratique et boîte à outils sur la pose du parquet : guides, motifs, tutoriels, inspiration et un simulateur de sens de pose gratuit.",
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
  const body = `      <section class="section">
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
      body,
    })
  );
}

function buildMeta() {
  const urls = [
    'index.html',
    'guides/index.html',
    ...GUIDES.map((guide) => `guides/${guide.slug}.html`),
    'motifs/index.html',
    ...MOTIFS.map((motif) => `motifs/${motif.slug}.html`),
    'tutoriels/index.html',
    ...TUTOS.map((tuto) => `tutoriels/${tuto.slug}.html`),
    'inspiration/index.html',
    'outils/index.html',
    'outils/simulateur-pose.html',
    'projet/index.html',
    'contact/index.html',
    'a-propos/index.html',
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${SITE.domain}/${url.replace(/index\.html$/, '')}</loc>
    <changefreq>monthly</changefreq>
    <priority>${url === 'index.html' ? '1.0' : url.endsWith('index.html') ? '0.8' : '0.7'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`.replace('www.sitemap.org', 'www.sitemaps.org');

  write('sitemap.xml', sitemap);
  write(
    'robots.txt',
    `User-agent: *
Allow: /

Sitemap: ${SITE.domain}/sitemap.xml
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
    outils: [{ slug: 'simulateur-pose', titre: 'Studio de pose', url: 'outils/simulateur-pose.html', etat: 'disponible' }],
  };
  write('data/contenus.json', JSON.stringify(index, null, 2));
}

buildDiagrams();
buildDataIndex();
buildHome();
buildGuides();
buildMotifs();
buildTutos();
buildInspiration();
buildTools();
buildProjet();
buildContact();
buildApropos();
build404();
buildMeta();

console.log('Site généré dans', ROOT);
