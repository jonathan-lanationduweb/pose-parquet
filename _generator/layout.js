/* Gabarit HTML commun : head, header, footer. Génère des fichiers statiques. */
const { assets } = require('./assets');
const SITE = {
  name: 'Pose Parquet',
  domain: 'https://pose-parquet.com',
  baseline: 'Comprendre, préparer, visualiser et réussir la pose de son parquet.',
};

const NAV = [
  { href: 'guides/', label: 'Guides', section: 'guides', num: '01' },
  { href: 'motifs/', label: 'Motifs', section: 'motifs', num: '02' },
  { href: 'tutoriels/', label: 'Tutoriels', section: 'tutoriels', num: '03' },
  { href: 'inspiration/', label: 'Inspiration', section: 'inspiration', num: '04' },
  { href: 'outils/', label: 'Outils', section: 'outils', num: '05' },
];

const DRAWER_EXTRA = [
  { href: 'a-propos/', label: 'À propos', section: 'a-propos', num: '06' },
  { href: 'contact/', label: 'Contact', section: 'contact', num: '07' },
];

const mark = `<svg class="brand__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 7h20"/><path d="M2 13h13"/><path d="M2 19h18"/></svg>`;

const arrow = `<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>`;

function header(p) {
  const links = NAV.map(
    (item) =>
      `<li><a class="nav__link" href="${p}${item.href}" data-nav-section="${item.section}">${item.label}</a></li>`
  ).join('\n            ');

  const drawerLinks = [...NAV, ...DRAWER_EXTRA]
    .map(
      (item, index) =>
        `<a class="drawer__link" href="${p}${item.href}"><span>${item.num}</span>${item.label}</a>`
    )
    .join('\n          ');

  return `<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header" data-header data-over="false" data-scrolled="false">
      <div class="wrap-wide site-header__inner">
        <a class="brand" href="${p}index.html" aria-label="Pose Parquet, accueil">
          ${mark}<strong>Pose</strong><span>Parquet</span>
        </a>
        <nav class="nav" aria-label="Navigation principale">
          <ul class="nav__list">
            ${links}
          </ul>
        </nav>
        <div class="header__actions">
          <a class="header__cta" href="${p}projet/"><span>Votre projet</span></a>
          <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false"
            aria-controls="menu-mobile" aria-label="Ouvrir le menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
    <div class="drawer" id="menu-mobile" data-drawer data-open="false">
      <nav class="drawer__list" aria-label="Navigation mobile">
        ${drawerLinks}
      </nav>
      <div class="drawer__footer">
        <a class="btn btn--light btn--block" href="${p}projet/"><span>Décrire mon projet</span>${arrow}</a>
        <a class="btn btn--outline-light btn--block" href="${p}outils/studio.html"><span>Visualiser ma pièce</span></a>
        <p class="drawer__meta">Média indépendant · aucune vente en ligne</p>
      </div>
    </div>`;
}

/**
 * Pied de page compact.
 *
 * Trois groupes de liens, pas l'arborescence complète : le pied de page sert
 * à rebondir, pas à refaire la navigation. La signature typographique reste,
 * mais serrée — elle signe la page au lieu d'en ouvrir une seconde.
 */
function footer(p) {
  const groups = [
    {
      title: 'Comprendre',
      links: [
        ['guides/', 'Guides'],
        ['motifs/', 'Motifs'],
        ['tutoriels/', 'Tutoriels'],
      ],
    },
    {
      title: 'Outils',
      links: [
        ['outils/studio.html', 'Visualiser ma pièce'],
        ['outils/simulateur-pose.html', 'Mode Plan'],
        ['inspiration/', 'Inspiration'],
      ],
    },
    {
      title: 'À propos',
      links: [
        ['a-propos/methode-editoriale.html', 'Notre méthode'],
        ['contact/', 'Contact'],
        ['projet/', 'Votre projet'],
      ],
    },
  ];

  return `<footer class="site-footer">
      <div class="wrap-wide footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            <p class="footer__wordmark">Pose <span>Parquet</span></p>
            <p class="footer__baseline">Guides et outils pour réussir la pose de son parquet.</p>
          </div>
          <nav class="footer__nav" aria-label="Pied de page">
            ${groups
              .map(
                (group) => `<div class="footer__col">
              <h2>${group.title}</h2>
              <ul>
                ${group.links.map(([href, label]) => `<li><a href="${p}${href}">${label}</a></li>`).join('')}
              </ul>
            </div>`
              )
              .join('')}
          </nav>
        </div>
        <div class="footer__bottom">
          <p>&copy; 2026 Pose Parquet — média indépendant, aucune vente en ligne.</p>
          <p>Photographies sous licence Pexels</p>
        </div>
      </div>
    </footer>`;
}

function breadcrumb(p, trail) {
  const items = trail
    .map((item, index) => {
      const last = index === trail.length - 1;
      const inner = last
        ? `<span aria-current="page">${item.label}</span>`
        : `<a href="${p}${item.href}">${item.label}</a>`;
      return `<li>${inner}</li>`;
    })
    .join('');
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${SITE.domain}/${item.href || ''}`,
    })),
  };
  return {
    html: `<nav class="breadcrumb wrap-wide" aria-label="Fil d'Ariane"><ol>${items}</ol></nav>`,
    jsonld,
  };
}

/**
 * @param {object} page
 * @param {string} page.title       balise <title>
 * @param {string} page.description meta description
 * @param {string} page.path        chemin canonique (ex. 'guides/x.html')
 * @param {number} page.depth       0 = racine, 1 = sous-dossier
 * @param {string} page.body        contenu HTML du <main>
 * @param {string[]} [page.css]     feuilles additionnelles, relatives à la racine
 * @param {object[]} [page.jsonld]  données structurées
 */
function layout(page) {
  const p = page.depth === 0 ? '' : '../';
  const canonical = `${SITE.domain}/${page.path}`.replace(/index\.html$/, '');
  // Les feuilles de page sont déjà dans le bundle : plus rien à charger ici.
  // `page.css` reste accepté pour la lisibilité des appels, sans effet.
  const build = assets();
  const jsonld = (page.jsonld || [])
    .map((data) => `\n    <script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join('');
  const ogImage = page.ogImage
    ? `${SITE.domain}/${page.ogImage}`
    : `${SITE.domain}/assets/images/og-default.jpg`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="theme-color" content="#f2efe8" />
    <meta property="og:type" content="${page.ogType || 'website'}" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${page.ogTitle || page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${p}assets/icons/favicon.svg?v=${build.icons}" type="image/svg+xml" />
    <link rel="icon" href="${p}assets/icons/favicon-32.png?v=${build.icons}" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png?v=${build.icons}" />
    <link rel="manifest" href="${p}site.webmanifest?v=${build.icons}" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/instrument-serif-400-3.woff2" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/inter-400-1.woff2" crossorigin />
    <link rel="stylesheet" href="${p}${build.css}" />
    <script type="module" src="${p}${build.js}"></script>${jsonld}
  </head>
  <body class="page">
    ${header(p)}
    <main id="contenu">
${page.body}
    </main>
    ${footer(p)}
  </body>
</html>
`;
}

/**
 * Gabarit « application » : le Studio.
 *
 * Pas d'en-tête éditorial, pas de pied de page, pas de fil d'Ariane. La page
 * ne contient qu'un point de montage : l'interface est construite par
 * js/studio/main.js. Le référencement du sujet vit sur la landing
 * /outils/visualiseur.html, à laquelle cette page renvoie — l'application
 * elle-même n'a rien à indexer.
 */
function appLayout(page) {
  const p = page.depth === 0 ? '' : '../';
  const build = assets();
  const canonical = `${SITE.domain}/${page.path}`;
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta name="theme-color" content="#101214" />
    <link rel="icon" href="${p}assets/icons/favicon.svg?v=${build.icons}" type="image/svg+xml" />
    <link rel="icon" href="${p}assets/icons/favicon-32.png?v=${build.icons}" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png?v=${build.icons}" />
    <link rel="manifest" href="${p}site.webmanifest?v=${build.icons}" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/inter-400-1.woff2" crossorigin />
    <link rel="preload" as="fetch" href="${p}data/parquets.json" crossorigin />
    <link rel="stylesheet" href="${p}${build.studioCss}" />
    <script type="module" src="${p}${build.studioJs}"></script>
  </head>
  <body class="app">
    <div data-studio data-base="${p}">
      <noscript>
        <p class="studio__noscript">Le Studio a besoin de JavaScript pour calculer le rendu dans votre navigateur.
        Vous pouvez lire la présentation de l’outil sur la page
        <a href="${p}outils/visualiseur.html">Visualiser ma pièce</a>.</p>
      </noscript>
    </div>
  </body>
</html>
`;
}

module.exports = { SITE, NAV, layout, appLayout, breadcrumb, header, footer, mark, arrow };
