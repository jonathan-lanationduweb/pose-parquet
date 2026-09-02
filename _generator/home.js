/* Nouvelle page d'accueil — composition éditoriale plein cadre. */
const { SITE } = require('./layout');
const { picture } = require('./responsive');

const ICON = {
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>',
  arrowLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H6"/><path d="m12 19-7-7 7-7"/></svg>',
  down:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12.5 5 5L20 6"/></svg>',
  chevron:
    '<svg viewBox="0 0 26 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 13 8 3l6 10 6-10"/></svg>',
  drag:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/></svg>',
};

const TILES = [
  {
    num: '(01)',
    title: 'Je prépare mon sol',
    text: 'Planéité, humidité, ragréage, sous-couche : ce qui se joue avant toute pose.',
    href: 'guides/preparer-son-sol-avant-la-pose.html',
    tone: 'mineral',
    media: 'tile-preparer',
  },
  {
    num: '(02)',
    title: 'Je choisis ma pose',
    text: 'Flottante, collée, clouée : le support et le produit décident plus que le goût.',
    href: 'guides/parquet-massif-ou-contrecolle.html',
    tone: 'sage',
    pattern: true,
  },
  {
    num: '(03)',
    title: 'Je choisis mon motif',
    text: 'Droite, diagonale, Point de Hongrie, bâton rompu : six écritures au sol.',
    href: 'motifs/',
    tone: 'slate',
    media: 'tile-motif',
  },
  {
    num: '(04)',
    title: 'J’ai déjà un parquet',
    text: 'Entretien, réparation, rénovation : prolonger plutôt que remplacer.',
    href: 'guides/erreurs-a-eviter-avant-de-poser.html',
    tone: 'clay',
    media: 'tile-renover',
  },
];

const GALLERY = [
  { img: 'inspi-1', cat: 'Séjour', title: 'Traversant, pose droite' },
  { img: 'inspi-2', cat: 'Chambre', title: 'Point de Hongrie' },
  { img: 'inspi-6', cat: 'Salon', title: 'Diagonale, chêne blond' },
  { img: 'inspi-3', cat: 'Cuisine', title: 'Contrecollé collé' },
  { img: 'inspi-5', cat: 'Bureau', title: 'Bâton rompu fumé' },
  { img: 'inspi-4', cat: 'Couloir', title: 'Lames étroites dans l’axe' },
  { img: 'inspi-7', cat: 'Combles', title: 'Parquet clair, lames larges' },
  { img: 'inspi-8', cat: 'Entrée', title: 'Frise périphérique' },
];

const MARQUEE = [
  'Pose droite', 'Point de Hongrie', 'Bâton rompu', 'Diagonale', 'Calepinage',
  'Pose collée', 'Pose flottante', 'Frise périphérique', 'Ragréage', 'Sens de la lumière',
];

function heroSection() {
  return `      <section class="hero" data-hero>
        <div class="hero__media" data-hero-media>
          ${picture('hero-wide', { alt: 'Grande pièce vide au parquet clair traversée par la lumière', sizes: '100vw', priority: true })}
          <video muted loop playsinline preload="none" data-src="" aria-hidden="true"></video>
        </div>
        <div class="wrap-wide hero__inner">
          <p class="eyebrow">Guides · Motifs · Outils</p>
          <h1 class="hero__title">Un parquet bien posé commence <em>avant</em> la première lame.</h1>
          <div class="hero__row">
            <div>
              <p class="hero__lead">Guides, techniques et outils pour comprendre et réussir votre projet parquet — du support au motif, du calepinage à la finition.</p>
              <div class="hero__actions">
                <a class="btn btn--light btn--lg" href="guides/"><span>Explorer les guides</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="btn btn--outline-light btn--lg" href="outils/studio.html"><span>Visualiser ma pièce</span></a>
              </div>
            </div>
            <ul class="hero__meta">
              <li><b>5</b> motifs simulés</li>
              <li><b>8</b> guides pratiques</li>
              <li><b>4</b> pièces d’exemple</li>
            </ul>
          </div>
        </div>
        <a class="hero__scroll" href="#parcours">Découvrir ${ICON.down}</a>
      </section>

      <div class="marquee" aria-hidden="true">
        <div class="marquee__track">
          ${[...MARQUEE, ...MARQUEE]
            .map((item) => `<span class="marquee__item">${ICON.chevron}${item}</span>`)
            .join('\n          ')}
        </div>
      </div>`;
}

function tilesSection() {
  const tiles = TILES.map(
    (tile, index) => `<a class="tile tile--${tile.tone}" href="${tile.href}" data-reveal data-reveal-delay="${index * 70}">
              <div class="tile__head">
                <h3 class="tile__title">${tile.title}</h3>
                <span class="tile__num">${tile.num}</span>
              </div>
              <p class="tile__text">${tile.text}</p>
              <span class="tile__more">Explorer ${ICON.arrow}</span>
              ${
                tile.media
                  ? `<div class="tile__media">${picture(tile.media, { alt: '', sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}</div>`
                  : '<div class="tile__pattern" aria-hidden="true"><span></span><span></span><span></span></div>'
              }
            </a>`
  ).join('\n            ');

  return `      <section class="section" id="parcours" aria-labelledby="parcours-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Vous en êtes où ?</p>
              <h2 id="parcours-title">Quatre entrées, un seul chantier.</h2>
            </div>
            <p class="lead">Chaque étape a ses décisions et ses pièges. Commencez par celle qui vous concerne aujourd’hui.</p>
          </div>
          <div class="tiles">
            ${tiles}
          </div>
        </div>
      </section>`;
}

function simulatorSection() {
  return `      <section class="section section--mineral" aria-labelledby="sim-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Visualiseur · outil</p>
              <h2 id="sim-title">Essayez votre parquet dans votre pièce.</h2>
            </div>
            <div>
              <p class="lead">Importez une photo, choisissez un parquet et comparez plusieurs rendus. Le calcul se fait dans votre navigateur : votre photo n’est ni envoyée ni conservée.</p>
              <p class="u-mt-5 u-actions">
                <a class="btn" href="outils/studio.html"><span>Visualiser ma pièce</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="link-arrow" href="outils/simulateur-pose.html">Étudier le sens de pose ${ICON.arrow}</a>
              </p>
            </div>
          </div>
          <div data-vz-preview data-room="sejour" data-base="" data-reveal></div>
        </div>
      </section>`;
}

function carouselEditorial(guides) {
  const slides = guides
    .map(
      (guide) => `<article class="carousel__slide">
              <div class="slide-card">
                <div class="slide-card__media">
                  ${picture(`cover-${guide.slug}`, { alt: '', sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}
                  <span class="slide-card__cat">${guide.category}</span>
                </div>
                <div class="slide-card__body">
                  <h3 class="slide-card__title"><a href="guides/${guide.slug}.html">${guide.h1}</a></h3>
                  <p class="slide-card__text">${guide.excerpt}</p>
                  <div class="slide-card__foot">
                    <span class="slide-card__link">Lire le guide ${ICON.arrow}</span>
                    <span class="slide-card__meta">${guide.reading}</span>
                  </div>
                </div>
              </div>
            </article>`
    )
    .join('\n            ');

  return `      <section class="section scroll-track" data-carousel data-scroll-carousel data-scroll-factor="0.9" aria-labelledby="guides-title">
        <div class="scroll-track__sticky" data-scroll-sticky>
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Guides du moment</p>
              <h2 id="guides-title">Ce qu’il faut savoir avant de commander.</h2>
            </div>
            <div class="carousel__controls">
              <span class="carousel__hint">${ICON.drag}Glissez</span>
              <span class="carousel__hint carousel__hint--scroll">${ICON.down}Défilez</span>
              <span class="carousel__count" data-carousel-count>01 / ${String(guides.length).padStart(2, '0')}</span>
              <button class="icon-btn" type="button" data-carousel-prev aria-label="Guides précédents">${ICON.arrowLeft}</button>
              <button class="icon-btn" type="button" data-carousel-next aria-label="Guides suivants">${ICON.arrow}</button>
            </div>
          </div>
        </div>
        <div class="carousel carousel--editorial">
            <div class="carousel__viewport" data-carousel-viewport tabindex="0" role="region"
              aria-label="Carrousel de guides, utilisez les flèches du clavier">
            ${slides}
            </div>
            <div class="wrap-wide"><div class="carousel__progress"><span data-carousel-progress></span></div></div>
        </div>
        </div>
      </section>`;
}

function immersiveSection() {
  const steps = [
    {
      num: '(01)',
      title: 'Une flèche continue',
      text: 'Les lames coupées à 45° forment une pointe qui file vers le fond de la pièce et guide le regard.',
    },
    {
      num: '(02)',
      title: 'Un axe sans pardon',
      text: 'Tout se joue au traçage : un demi-degré d’écart devient visible sur toute la longueur du sol.',
    },
    {
      num: '(03)',
      title: 'Des lames gauches et droites',
      text: 'Elles se commandent ensemble, en quantités égales, avec 12 à 15 % de chutes prévues dès le premier lot.',
    },
  ]
    .map(
      (step, index) => `<div class="step-block" data-reveal data-reveal-delay="${index * 90}">
                <span class="step-block__num">${step.num}</span>
                <h3>${step.title}</h3>
                <p>${step.text}</p>
              </div>`
    )
    .join('\n              ');

  return `      <section class="immersive" aria-labelledby="focus-title">
        <div class="immersive__bg">
          ${picture('immersive-hongrie', {
            alt: 'Lumière rasante sur un parquet posé en Point de Hongrie',
            sizes: '100vw',
          })}
        </div>
        <div class="wrap-wide">
          <div class="immersive__head" data-reveal>
            <p class="eyebrow eyebrow--plain">Focus motif · 04</p>
            <h2 id="focus-title">Le Point de Hongrie, une flèche au sol.</h2>
          </div>
          <div class="immersive__steps immersive__steps--right">
            ${steps}
            <p data-reveal><a class="btn btn--light" href="motifs/point-de-hongrie.html"><span>Découvrir le motif</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a></p>
          </div>
        </div>
      </section>`;
}

function carouselGallery() {
  const slides = GALLERY.map(
    (item) => `<div class="carousel__slide">
              <a class="shot" href="inspiration/">
                ${picture(item.img, { alt: `${item.cat} — ${item.title}`, sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}
                <span class="shot__caption">
                  <span class="shot__cat">${item.cat}</span>
                  <span class="shot__title">${item.title}</span>
                </span>
              </a>
            </div>`
  ).join('\n            ');

  return `      <section class="section section--dark scroll-track" data-carousel data-scroll-carousel data-scroll-factor="0.85" aria-labelledby="inspi-title">
        <div class="scroll-track__sticky" data-scroll-sticky>
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Inspiration</p>
              <h2 id="inspi-title">Voir avant de choisir.</h2>
            </div>
            <div class="carousel__controls">
              <span class="carousel__count" data-carousel-count>01 / ${String(GALLERY.length).padStart(2, '0')}</span>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-prev aria-label="Visuels précédents">${ICON.arrowLeft}</button>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-next aria-label="Visuels suivants">${ICON.arrow}</button>
            </div>
          </div>
        </div>
        <div class="carousel carousel--gallery">
            <div class="carousel__viewport" data-carousel-viewport tabindex="0" role="region"
              aria-label="Galerie d’inspiration, utilisez les flèches du clavier">
            ${slides}
            </div>
            <div class="wrap-wide"><div class="carousel__progress"><span data-carousel-progress></span></div></div>
        </div>
        </div>
      </section>`;
}

function tutorialsSection(tutos) {
  const rows = tutos
    .map(
      (tuto, index) => `<a class="list-row" href="tutoriels/${tuto.slug}.html">
              <span class="list-row__num">(0${index + 1})</span>
              <span class="list-row__title">${tuto.h1}</span>
              <p class="list-row__text">${tuto.excerpt}</p>
              <span class="list-row__meta">${tuto.level} · ${tuto.duration}</span>
            </a>`
    )
    .join('\n            ');

  return `      <section class="section" aria-labelledby="tuto-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Tutoriels</p>
              <h2 id="tuto-title">Passer au geste.</h2>
            </div>
            <a class="link-arrow" href="tutoriels/">Tous les tutoriels ${ICON.arrow}</a>
          </div>
          <div class="list-rows">
            ${rows}
          </div>
        </div>
      </section>`;
}

function toolsSection() {
  return `      <section class="section section--alt" aria-labelledby="outils-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Boîte à outils</p>
              <h2 id="outils-title">Décider, pas seulement lire.</h2>
            </div>
            <p class="lead">Des outils courts, utilisables depuis un téléphone sur le chantier comme depuis un bureau au moment de trancher.</p>
          </div>
          <div class="grid grid--3">
            <div class="tool-card" data-reveal>
              <div class="tool-card__head"><h3>Visualiser ma pièce</h3><span class="badge badge--sage">Nouveau</span></div>
              <p>Douze parquets, trois motifs, votre photo. Le sol change à chaque clic.</p>
              <a class="btn btn--sm" href="outils/studio.html"><span>Ouvrir</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
            </div>
            <div class="tool-card" data-reveal data-reveal-delay="70">
              <div class="tool-card__head"><h3>Mode plan</h3><span class="badge badge--sage">Disponible</span></div>
              <p>Cinq motifs, vos dimensions, la lumière au bon endroit.</p>
              <a class="btn btn--sm btn--ghost" href="outils/simulateur-pose.html"><span>Ouvrir</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
            </div>
            <div class="tool-card tool-card--soon" data-reveal data-reveal-delay="140">
              <div class="tool-card__head"><h3>Checklist avant pose</h3><span class="badge badge--outline">Bientôt</span></div>
              <p>Le point complet à faire la veille du chantier, support compris.</p>
            </div>
          </div>
        </div>
      </section>`;
}

function projectSection() {
  return `      <section class="section" aria-labelledby="projet-title">
        <div class="wrap-wide">
          <div class="feature feature--wide-media">
            <div class="feature__body">
              <p class="eyebrow">Votre projet</p>
              <h2 id="projet-title">Décrivez votre pièce, on s’occupe des questions utiles.</h2>
              <ul class="feature__list">
                <li>${ICON.check}<span>Cinq étapes courtes, aucune question inutile.</span></li>
                <li>${ICON.check}<span>« Je ne sais pas » est une réponse valable partout.</span></li>
                <li>${ICON.check}<span>Aucun démarchage : vos coordonnées servent uniquement à répondre.</span></li>
              </ul>
              <div class="cluster">
                <a class="btn" href="projet/"><span>Décrire mon projet</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="link-arrow" href="outils/simulateur-pose.html">Passer d’abord par le simulateur ${ICON.arrow}</a>
              </div>
            </div>
            <div class="feature__media" data-reveal>
              ${picture('projet-visuel', { alt: 'Pièce lumineuse au parquet clair', sizes: '(min-width: 60rem) 45rem, 94vw' })}
            </div>
          </div>
        </div>
      </section>`;
}

function clusterSection(guides) {
  const rows = guides
    .filter((guide) => guide.tags.includes('sens-de-pose'))
    .map(
      (guide, index) => `<a class="list-row" href="guides/${guide.slug}.html">
              <span class="list-row__num">(0${index + 1})</span>
              <span class="list-row__title">${guide.h1}</span>
              <p class="list-row__text">${guide.excerpt}</p>
              <span class="list-row__meta">${guide.reading}</span>
            </a>`
    )
    .join('\n            ');

  return `      <section class="section section--flush-top" aria-labelledby="cluster-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Dossier</p>
              <h2 id="cluster-title">Le sens de pose, de A à Z.</h2>
            </div>
            <a class="link-arrow" href="outils/simulateur-pose.html">Simulateur de sens de pose ${ICON.arrow}</a>
          </div>
          <div class="list-rows">
            ${rows}
          </div>
        </div>
      </section>`;
}

function buildHomeBody({ GUIDES, TUTOS }) {
  const carouselGuides = GUIDES.slice(0, 6);
  return [
    heroSection(),
    tilesSection(),
    simulatorSection(),
    carouselEditorial(carouselGuides),
    immersiveSection(),
    carouselGallery(),
    tutorialsSection(TUTOS),
    toolsSection(),
    projectSection(),
    clusterSection(GUIDES),
  ].join('\n\n');
}

module.exports = { buildHomeBody, ICON, SITE };
