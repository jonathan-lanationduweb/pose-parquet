const { assets } = require('./assets');
const { aPrecharger } = require('./polices');



const POLICE_TITRE = aPrecharger('Instrument Serif');
const POLICE_TEXTE = aPrecharger('Inter');


const { REGLAGES } = require('./content-site');
const T = require('./textes');

const SITE = {
  get name() {
    return REGLAGES.nom;
  },
  domain: 'https://pose-parquet.com',
  get baseline() {
    return REGLAGES.baseline;
  },
};


const NAV = [
  { href: 'guides/', cle: 'guides', section: 'guides' },
  { href: 'motifs/', cle: 'motifs', section: 'motifs' },
  { href: 'tutoriels/', cle: 'tutoriels', section: 'tutoriels' },
  { href: 'inspiration/', cle: 'inspiration', section: 'inspiration' },
  { href: 'outils/', cle: 'outils', section: 'outils' },
  { href: 'a-propos/', cle: 'a_propos', section: 'a-propos' },
];

const DRAWER_EXTRA = [
  { href: 'contact/', cle: 'contact', section: 'contact' },
];

const visibles = (liste) =>
  liste.filter((item) => REGLAGES[`nav_${item.cle}_afficher`]).map((item) => ({ ...item, label: T.texte(REGLAGES[`nav_${item.cle}`]) }));


const motsDuNom = () => {
  const [premier, ...suite] = String(REGLAGES.nom).split(' ');
  return [T.texte(premier), T.texte(suite.join(' '))];
};



const SYMBOL_PATH = 'M0 0H0.3396V0.5584L0 0.6396ZM0 0.6599L0.3396 0.5787V1H0ZM0.4057 0H0.7453V0.2437L0.4057 0.3249ZM0.4057 0.3452L0.7453 0.264V1H0.4057ZM0.8208 0H1V0.5584L0.8208 0.6012ZM0.8208 0.6215L1 0.5787V1H0.8208Z';
const symbol = (className) =>
  `<svg class="${className}" viewBox="0 0 106 197" fill="currentColor" aria-hidden="true"><g transform="scale(106 197)"><path d="${SYMBOL_PATH}"/></g></svg>`;

const mark = symbol('brand__mark');

const arrow = `<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>`;

function header(p) {
  const links = visibles(NAV).map(
    (item) =>
      `<li><a class="nav__link" href="${p}${item.href}" data-nav-section="${item.section}">${item.label}</a></li>`
  ).join('\n            ');

  const drawerLinks = visibles([...NAV, ...DRAWER_EXTRA])
    .map(
      (item, index) =>
        `<a class="drawer__link" href="${p}${item.href}"><span>${String(index + 1).padStart(2, '0')}</span>${item.label}</a>`
    )
    .join('\n          ');

  const [nomFort, nomSuite] = motsDuNom();
  const logo = REGLAGES.logo && REGLAGES.logo.chemin
    ? `<img class="brand__logo" src="${p}${T.attribut(REGLAGES.logo.chemin)}" alt="" width="${REGLAGES.logo.largeur}" height="${REGLAGES.logo.hauteur}" />`
    : `${mark}<strong>${nomFort}</strong><span>${nomSuite}</span>`;
  const ctaProjet = REGLAGES.cta_projet_afficher
    ? `\n          <a class="header__cta" href="${p}projet/"><span>${T.texte(REGLAGES.cta_projet)}</span></a>`
    : '';

  return `<a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header" data-header data-over="false" data-scrolled="false">
      <div class="wrap-wide site-header__inner">
        <a class="brand" href="${p}index.html" aria-label="${T.attribut(REGLAGES.nom)}, accueil">
          ${logo}
        </a>
        <nav class="nav" aria-label="Navigation principale">
          <ul class="nav__list">
            ${links}
          </ul>
        </nav>
        <div class="header__actions">${ctaProjet}
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
        <a class="btn btn--light btn--block" href="${p}projet/"><span>${T.texte(REGLAGES.menu_cta_projet)}</span>${arrow}</a>
        <a class="btn btn--outline-light btn--block" href="${p}outils/studio.html"><span>${T.texte(REGLAGES.menu_cta_visualiseur)}</span></a>




        <p class="drawer__meta">${T.texte(REGLAGES.menu_note)}</p>
      </div>
    </div>`;
}



function footer(p) {
  const R = REGLAGES;
  const lien = (href, cle) => (R[`pied_${cle}_afficher`] ? [[href, T.texte(R[`pied_${cle}`])]] : []);
  const groups = [
    {
      title: T.texte(R.pied_col_comprendre),

      links: [...lien('guides/', 'guides'), ...lien('motifs/', 'motifs'), ...lien('tutoriels/', 'tutoriels'), ...(require('./content-blog').ARTICLES.length ? [['blog/', 'Blog']] : [])],
    },
    {
      title: T.texte(R.pied_col_outils),
      links: [...lien('outils/studio.html', 'studio'), ...lien('outils/simulateur-pose.html', 'plan'), ...lien('inspiration/', 'inspiration')],
    },
    {
      title: T.texte(R.pied_col_apropos),
      links: [...lien('a-propos/methode-editoriale.html', 'methode'), ...lien('contact/', 'contact'), ...lien('projet/', 'projet')],
    },
  ].filter((group) => group.links.length);


  const destinations = [
    R.premibel_afficher ? `<strong>${T.riche(R.premibel_libelle)}</strong> ${T.texte(R.pied_premibel)}` : '',
    R.allure_afficher ? `<strong>${T.riche(R.allure_libelle)}</strong> ${T.texte(R.pied_allure)}` : '',
  ].filter(Boolean);
  const [nomFort, nomSuite] = motsDuNom();

  return `<footer class="site-footer">
      <div class="wrap-wide footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            ${R.logo && R.logo.chemin
              ? `<a class="footer__logo-lien" href="${p}index.html" aria-label="${T.attribut(R.nom)}, accueil"><img class="footer__logo" src="${p}${T.attribut(R.logo.chemin)}" alt="" width="${R.logo.largeur}" height="${R.logo.hauteur}" loading="lazy" decoding="async" /></a>`
              : `${symbol('footer__mark')}
            <p class="footer__wordmark">${nomFort} <span>${nomSuite}</span></p>`}
            <p class="footer__baseline">${T.texte(R.pied_presentation)}</p>
          </div>
          <nav class="footer__nav" aria-label="Pied de page">
            ${groups
              .map(
                (group, i) => `<div class="footer__col" role="group" aria-labelledby="pied-col-${i}">
              <p class="footer__col-titre" id="pied-col-${i}">${group.title}</p>
              <ul>
                ${group.links.map(([href, label]) => `<li><a href="${p}${href}">${label}</a></li>`).join('')}
              </ul>
            </div>`
              )
              .join('')}
          </nav>
        </div>
        <div class="footer__bottom">












          <p>&copy; ${T.texte(R.pied_mention)}</p>








          ${destinations.length ? `<p class="footer__orientation">${destinations.join(', ')} : ${T.texte(R.pied_orientation)} <a href="${p}a-propos/#liens-commerciaux">${T.texte(R.pied_liens_commerciaux)}</a></p>` : ''}
          <p>${T.texte(R.pied_credits)}</p>

          <ul class="footer__legal">
            <li><a href="${p}mentions-legales/">Mentions légales</a></li>
            <li><a href="${p}confidentialite/">Confidentialité et cookies</a></li>
            <li><a href="${p}plan-du-site/">Plan du site</a></li>
          </ul>
        </div>
      </div>
    </footer>`;
}


function favicon(p, build) {
  const f = REGLAGES.favicon;
  if (f && f.chemin) return `    <link rel="icon" href="${p}${T.attribut(f.chemin)}" type="${T.attribut(f.type)}" />`;
  return `    <link rel="icon" href="${p}assets/icons/favicon.svg?v=${build.icons}" type="image/svg+xml" />
    <link rel="icon" href="${p}assets/icons/favicon-32.png?v=${build.icons}" sizes="32x32" type="image/png" />
    <link rel="icon" href="${p}assets/icons/favicon-16.png?v=${build.icons}" sizes="16x16" type="image/png" />`;
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
      ...(item.href ? { item: `${SITE.domain}/${item.href.replace(/index\.html$/, '')}` } : {}),
    })),
  };
  return {
    html: `<nav class="breadcrumb wrap-wide" aria-label="Fil d'Ariane"><ol>${items}</ol></nav>`,
    jsonld,
  };
}



function layout(page) {
  const p = page.depth === 0 ? '' : '../';
  const canonical = `${SITE.domain}/${page.path}`.replace(/index\.html$/, '');


  const build = assets();
  const jsonld = (page.jsonld || [])

    .map((data) => `\n    <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
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









    <meta name="robots" content="${page.robots || 'index, follow'}" />
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
${favicon(p, build)}
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png?v=${build.icons}" />
    <link rel="manifest" href="${p}site.webmanifest?v=${build.icons}" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/${POLICE_TITRE}" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/${POLICE_TEXTE}" crossorigin />
    <link rel="stylesheet" href="${p}${build.css}" />${


      (build.pageBundles || [])
        .filter((bundle) => page.body.includes(bundle.marqueur))
        .map((bundle) => `\n    <link rel="stylesheet" href="${p}${bundle.url}" />`)
        .join('')
    }${

      page.runtimeConfig !== false
        ? `




    <script src="${p}config.js"></script>`
        : ''
    }
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





function appLayout(page) {
  const p = page.depth === 0 ? '' : '../';
  const build = assets();
  const canonical = `${SITE.domain}/${page.path}`;
  const produit = page.app === 'product';
  const css = produit ? build.productCss : build.studioCss;
  const js = produit ? build.productJs : build.studioJs;
  const mount = produit ? 'data-product' : 'data-studio';
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <meta name="robots" content="${page.robots || 'index, follow'}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="theme-color" content="#101214" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE.domain}/${page.ogImage || 'assets/images/og-default.jpg'}" />
    <meta name="twitter:card" content="summary_large_image" />${
      (page.jsonld || [])

        .map((data) => `\n    <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
        .join('')
    }
${favicon(p, build)}
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png?v=${build.icons}" />
    <link rel="manifest" href="${p}site.webmanifest?v=${build.icons}" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/${POLICE_TEXTE}" crossorigin />
    <link rel="preload" as="fetch" href="${p}data/parquets.json" crossorigin />
    <link rel="stylesheet" href="${p}${css}" />

    <script src="${p}config.js"></script>
    <script type="module" src="${p}${js}"></script>
  </head>
  <body class="app${produit ? ' app--product' : ''}">

    <div ${mount} data-base="${p}">
      <h1 class="app-loading-title">${page.h1 || page.title}</h1>
      <noscript>
        <p class="studio__noscript">Le visualiseur a besoin de JavaScript pour calculer le rendu dans votre navigateur.
        Vous pouvez lire la présentation de l’outil sur la page
        <a href="${p}outils/visualiseur.html">Visualiser ma pièce</a>.</p>
      </noscript>
    </div>
  </body>
</html>
`;
}

module.exports = { SITE, NAV, layout, appLayout, breadcrumb, header, footer, mark, symbol, arrow };
