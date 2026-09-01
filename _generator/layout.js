/* Gabarit HTML commun : head, header, footer. Génère des fichiers statiques. */
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
        <a class="btn btn--outline-light btn--block" href="${p}outils/simulateur-pose.html"><span>Ouvrir le simulateur</span></a>
        <p class="drawer__meta">Média indépendant · aucune vente en ligne</p>
      </div>
    </div>`;
}

function footer(p) {
  return `<footer class="site-footer">
      <div class="wrap-wide">
        <p class="footer__wordmark">Pose <span>Parquet</span></p>
        <div class="footer__grid">
          <div class="footer__intro">
            <p>Un média pratique et une boîte à outils autour de la pose du parquet : guides, techniques, motifs et simulateurs.</p>
            <a class="link-arrow" href="${p}projet/">Décrire un projet${arrow.replace('class="btn__icon"', '')}</a>
          </div>
          <div class="footer__col">
            <h3>Comprendre</h3>
            <ul>
              <li><a href="${p}guides/quel-sens-de-pose-choisir.html">Choisir le sens de pose</a></li>
              <li><a href="${p}guides/preparer-son-sol-avant-la-pose.html">Préparer le support</a></li>
              <li><a href="${p}guides/parquet-massif-ou-contrecolle.html">Massif ou contrecollé</a></li>
              <li><a href="${p}guides/erreurs-a-eviter-avant-de-poser.html">Erreurs à éviter</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h3>Motifs</h3>
            <ul>
              <li><a href="${p}motifs/pose-droite.html">Pose droite</a></li>
              <li><a href="${p}motifs/pose-diagonale.html">Pose diagonale</a></li>
              <li><a href="${p}motifs/point-de-hongrie.html">Point de Hongrie</a></li>
              <li><a href="${p}motifs/baton-rompu.html">Bâton rompu</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h3>Le site</h3>
            <ul>
              <li><a href="${p}outils/simulateur-pose.html">Simulateur de pose</a></li>
              <li><a href="${p}tutoriels/">Tutoriels</a></li>
              <li><a href="${p}a-propos/">À propos</a></li>
              <li><a href="${p}contact/">Contact</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p>&copy; 2026 Pose Parquet — site éditorial indépendant.</p>
          <p>Photographies libres de droits · aucune vente en ligne</p>
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
  const extraCss = (page.css || [])
    .map((href) => `\n    <link rel="stylesheet" href="${p}${href}" />`)
    .join('');
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
    <link rel="icon" href="${p}assets/icons/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="${p}assets/icons/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png" />
    <link rel="manifest" href="${p}site.webmanifest" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/instrument-serif-400-3.woff2" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/inter-400-1.woff2" crossorigin />
    <link rel="stylesheet" href="${p}css/main.css" />${extraCss}
    <script type="module" src="${p}js/main.js"></script>${jsonld}
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

module.exports = { SITE, NAV, layout, breadcrumb, header, footer, mark, arrow };
