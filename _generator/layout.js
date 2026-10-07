/* Gabarit HTML commun : head, header, footer. Génère des fichiers statiques. */
const { assets } = require('./assets');
const { aPrecharger } = require('./polices');

/*
 * Les deux polices prechargees, lues dans css/fonts.css au lieu d'etre
 * nommees ici. Un renommage de fichier ne peut plus laisser un <link
 * rel="preload"> pointer dans le vide. Voir _generator/polices.js.
 */
const POLICE_TITRE = aPrecharger('Instrument Serif');
const POLICE_TEXTE = aPrecharger('Inter');
/*
 * « Mon site » (WordPress) : identité, libellés de l'en-tête et du pied de
 * page, liens commerciaux. Les valeurs par défaut et le schéma sont dans
 * content-site.js ; WordPress les remplace avant tout rendu (wordpress.js).
 * Ici, seulement la MANIÈRE de les afficher.
 */
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

/* Les adresses suivent l'arborescence : WordPress règle le libellé et l'affichage. */
const NAV = [
  { href: 'guides/', cle: 'guides', section: 'guides' },
  { href: 'motifs/', cle: 'motifs', section: 'motifs' },
  { href: 'tutoriels/', cle: 'tutoriels', section: 'tutoriels' },
  { href: 'inspiration/', cle: 'inspiration', section: 'inspiration' },
  { href: 'outils/', cle: 'outils', section: 'outils' },
];

const DRAWER_EXTRA = [
  { href: 'a-propos/', cle: 'a_propos', section: 'a-propos' },
  { href: 'contact/', cle: 'contact', section: 'contact' },
];

const visibles = (liste) =>
  liste.filter((item) => REGLAGES[`nav_${item.cle}_afficher`]).map((item) => ({ ...item, label: T.texte(REGLAGES[`nav_${item.cle}`]) }));

/** Le nom du site en logotype texte : premier mot en valeur, la suite atténuée. */
const motsDuNom = () => {
  const [premier, ...suite] = String(REGLAGES.nom).split(' ');
  return [T.texte(premier), T.texte(suite.join(' '))];
};

/**
 * Le symbole d'identité — Concept C : trois lames verticales inégales,
 * traversées par des ruptures diagonales décalées.
 *
 * La géométrie est **générée** par _generator/make-icons.js, qui la tient de
 * mesures faites au pixel sur la planche validée. Une seule source pour le
 * favicon, les icônes d'application et l'interface : le symbole ne peut donc
 * pas diverger d'un support à l'autre.
 *
 * Il est employé avec parcimonie — en-tête, pied de page, favicon — et jamais
 * en motif décoratif répété : c'est sa rareté qui lui donne sa force.
 */
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
        <!-- « Média indépendant · aucune vente en ligne » figurait aussi ici.
             L'information est utile, mais répétée en tête de menu sur chaque
             page elle prend un ton défensif. Elle reste dans le pied de page et
             développée sur la page À propos, c'est-à-dire là où on la cherche. -->
        <p class="drawer__meta">${T.texte(REGLAGES.menu_note)}</p>
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
  const R = REGLAGES;
  const lien = (href, cle) => (R[`pied_${cle}_afficher`] ? [[href, T.texte(R[`pied_${cle}`])]] : []);
  const groups = [
    {
      title: T.texte(R.pied_col_comprendre),
      links: [...lien('guides/', 'guides'), ...lien('motifs/', 'motifs'), ...lien('tutoriels/', 'tutoriels')],
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

  // La mention d'orientation : une destination désactivée n'y figure plus.
  const destinations = [
    R.premibel_afficher ? `<strong>${T.riche(R.premibel_libelle)}</strong> ${T.texte(R.pied_premibel)}` : '',
    R.allure_afficher ? `<strong>${T.riche(R.allure_libelle)}</strong> ${T.texte(R.pied_allure)}` : '',
  ].filter(Boolean);
  const [nomFort, nomSuite] = motsDuNom();

  return `<footer class="site-footer">
      <div class="wrap-wide footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            ${symbol('footer__mark')}
            <p class="footer__wordmark">${nomFort} <span>${nomSuite}</span></p>
            <p class="footer__baseline">${T.texte(R.pied_presentation)}</p>
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
          <!--
            « Média indépendant, aucune vente en ligne » figurait ici.

            La première moitié n'est plus exacte : le site oriente vers les
            références de Premibel quand elles existent, et un lecteur qui
            découvrirait ce lien après coup aurait raison de se sentir trompé.
            La seconde reste vraie — rien ne se vend ni ne se paie ici — mais
            énoncée seule elle laissait entendre la première.

            Le pied de page ne développe pas : il renvoie à la page qui le
            fait, une fois, sobrement.
          -->
          <p>&copy; ${T.texte(R.pied_mention)}</p>
          <!--
            Deux destinations nommées, une ligne, pas de logo.

            Le pied de page dit vers QUI l'on oriente et pour QUOI ; le détail
            — la zone, ce que la relation ne change pas — est à la page qui
            l'explique. Écrire trois phrases ici en ferait une réclame en bas
            de 32 pages.
          -->
          ${destinations.length ? `<p class="footer__orientation">${destinations.join(', ')} : ${T.texte(R.pied_orientation)} <a href="${p}a-propos/#liens-commerciaux">${T.texte(R.pied_liens_commerciaux)}</a></p>` : ''}
          <p>${T.texte(R.pied_credits)}</p>
        </div>
      </div>
    </footer>`;
}

/** Le favicon : celui de « Mon site » s'il est choisi, sinon les icônes générées du symbole. */
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
 * @param {boolean} [page.runtimeConfig] charge config.js (adresse du backend)
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
    <!-- Balise robots toujours explicite. Sa valeur par défaut est « index,
         follow » : les fichiers du dépôt décrivent la production, et c'est le
         déploiement qui marque une préproduction — voir
         .github/workflows/deploy-pages.yml et docs/seo-environnements.md. Un
         noindex écrit ici par prudence finirait tôt ou tard copié en production.

         Une page peut cependant demander autre chose par « page.robots », et
         une seule le fait : la 404. Elle n'est pas une préproduction, elle n'a
         simplement rien à indexer — c'est un état d'erreur, pas un contenu. -->
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
      /*
       * Feuilles rattachées par marqueur.
       *
       * On regarde ce que la page CONTIENT, pas ce qu'elle a déclaré. Une
       * déclaration s'oublie ; un marqueur est l'attribut de montage du
       * composant lui-même, et il ne peut pas manquer sans que le composant
       * manque aussi. Voir BUNDLES_PAGE dans assets.js.
       */
      (build.pageBundles || [])
        .filter((bundle) => page.body.includes(bundle.marqueur))
        .map((bundle) => `\n    <link rel="stylesheet" href="${p}${bundle.url}" />`)
        .join('')
    }${
      page.runtimeConfig
        ? `
    <!-- Adresse du backend, définissable au déploiement sans toucher au code.
         Script classique et non module : il s'exécute avant les modules, donc
         avant que api-config.js ne lise window.POSE_PARQUET_CONFIG. Pas
         d'empreinte dans le nom — c'est ce qui permet de le remplacer. -->
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

/**
 * Gabarit « application » : le Visualiseur Parquet.
 *
 * Pas d'en-tête éditorial, pas de pied de page, pas de fil d'Ariane. La page
 * ne contient qu'un point de montage : l'interface est construite par
 * js/studio/main.js. Le référencement du sujet vit sur la landing
 * /outils/visualiseur.html, à laquelle cette page renvoie — l'application
 * elle-même n'a rien à indexer.
 */
/**
 * Coquille d'une APPLICATION : pas de prose, pas de pied de page.
 *
 * Deux applications partagent cette coquille et ne different que par leurs
 * assets et leur point de montage :
 *
 *   studio   outils/studio.html            [data-studio]   js/studio/main.js
 *   product  outils/visualiseur-produit.html [data-product] js/product/main.js
 *
 * Le Visualiseur produit n'est pas une iframe autour du Studio : il importe
 * les memes modules de scene et de rendu, dans la meme page. Voir
 * docs/product-visualizer-integration-v1.md.
 */
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
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta name="theme-color" content="#101214" />
${favicon(p, build)}
    <link rel="apple-touch-icon" href="${p}assets/icons/apple-touch-icon.png?v=${build.icons}" />
    <link rel="manifest" href="${p}site.webmanifest?v=${build.icons}" />
    <link rel="preload" as="font" type="font/woff2" href="${p}assets/fonts/${POLICE_TEXTE}" crossorigin />
    <link rel="preload" as="fetch" href="${p}data/parquets.json" crossorigin />
    <link rel="stylesheet" href="${p}${css}" />
    <script type="module" src="${p}${js}"></script>
  </head>
  <body class="app${produit ? ' app--product' : ''}">
    <div ${mount} data-base="${p}">
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
