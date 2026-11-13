const { SITE } = require('./layout');
const { picture } = require('./responsive');
const { NB_PIECES, scene } = require('./scenes');
const { NB_PREMIBEL_VISU, NB_MOTIFS, enLettres, mentionRendu, CATALOGUE } = require('./catalogue');
const { INSPIRATION_PHOTOS } = require('./photos');
const { choisirVitrine } = require('../js/scene/vitrine.js');
const MOTIFS_PARQUETS = require('../data/parquets.json').patterns;



function legendeVitrine() {
  const fiches = new Map(CATALOGUE.proposes.map((f) => [f.id, f]));
  const [puce] = choisirVitrine((id) => fiches.get(id) || null);
  if (!puce) throw new Error('Vitrine de l’accueil : aucune référence Premibel proposée (js/scene/vitrine.js).');
  const fiche = fiches.get(puce.material);
  const motif = (MOTIFS_PARQUETS.find((m) => m.id === puce.pattern) || { label: puce.pattern }).label.toLowerCase();
  const mention = mentionRendu(puce.material);
  return `${fiche.name}, ${motif}${mention ? ` (${mention})` : ''}`;
}
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');


const { PAGES } = require('./content-pages');
const { REGLAGES } = require('./content-site');
const T = require('./textes');
const V = () => PAGES['accueil'].valeurs;



const { nombres } = require('./nombres');

const champ = (cle) => nombres(V()[cle]);



const NB_MOTIFS_PLAN = require('../js/tools/patterns.js').PATTERNS.length;

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



const ENTREES_DEF = () => [
  {
    verbe: champ('decision1_titre'),
    texte: champ('decision1_texte'),
    href: 'guides/',
    meta: () => `${GUIDES.length} guides`,
    tone: 'mineral',
  },
  {
    verbe: champ('decision2_titre'),
    texte: champ('decision2_texte'),
    href: 'motifs/',
    meta: () => `${MOTIFS.length} motifs`,
    tone: 'sage',
  },
  {
    verbe: champ('decision3_titre'),
    texte: champ('decision3_texte'),
    href: 'outils/studio.html',
    meta: () => `${NB_PREMIBEL_VISU} parquets`,
    tone: 'slate',
  },
  {
    verbe: champ('decision4_titre'),
    texte: champ('decision4_texte'),
    href: 'projet/',
    meta: () => champ('decision4_mention'),
    tone: 'clay',
  },
];



const GALLERY_IMAGES = ["inspi-1", "inspi-2", "inspi-6", "inspi-3", "inspi-5", "inspi-4", "inspi-7", "inspi-8"];
const GALLERY = () => {
  const lignes = T.lignes(champ('inspi_legendes'));
  return GALLERY_IMAGES.map((img, n) => {
    const l = lignes[n] || '';
    const k = l.indexOf(' — ');
    return { img, cat: k < 0 ? l : l.slice(0, k), title: k < 0 ? '' : l.slice(k + 3) };
  });
};

const MARQUEE = () => T.lignes(champ('bandeau_mots'));

function heroSection() {

  const orientation = T.riche(champ('hero_orientation')).replace(/\[([^\]]+)\]/, (_, l) => `<a href="a-propos/#liens-commerciaux">${l}</a>`);
  return `      <section class="hero" data-hero>
        <div class="hero__media" data-hero-media>
          ${picture('hero-wide', { alt: 'Grande pièce vide aux murs crème et niches en arcade, parquet couleur miel posé en bâton rompu', sizes: '100vw', priority: true })}
          <video muted loop playsinline preload="none" data-src="" aria-hidden="true"></video>
        </div>
        <div class="wrap-wide hero__inner">
          <p class="eyebrow">${T.texte(champ('hero_eyebrow'))}</p>
          <h1 class="hero__title">${T.riche(champ('hero_titre'))}</h1>
          <div class="hero__row">
            <div>
              <p class="hero__lead">${T.riche(champ('hero_texte'))}</p>
              <div class="hero__actions">
                <a class="btn btn--light btn--lg" href="outils/studio.html"><span>${T.texte(champ('hero_cta_visualiseur'))}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="btn btn--outline-light btn--lg" href="guides/"><span>${T.texte(champ('hero_cta_guides'))}</span></a>
              </div>
              <p class="hero__orientation">${orientation}</p>
            </div>
            <ul class="hero__meta">
              <li><b>${MOTIFS.length}</b> ${T.texte(champ('hero_meta1'))}</li>
              <li><b>${GUIDES.length}</b> ${T.texte(champ('hero_meta2'))}</li>
              <li><b>${NB_PREMIBEL_VISU}</b> ${T.texte(champ('hero_meta3'))}</li>
            </ul>
          </div>
        </div>
        <a class="hero__scroll" href="#pourquoi">${T.texte(champ('hero_defiler'))} ${ICON.down}</a>
      </section>

      <div class="marquee" aria-hidden="true">
        <div class="marquee__track">
          ${[...MARQUEE(), ...MARQUEE()]
            .map((item) => `<span class="marquee__item">${ICON.chevron}${T.texte(item)}</span>`)
            .join('\n          ')}
        </div>
      </div>`;
}


function pourquoiSection() {
  return `      <section class="section section--compact" id="pourquoi" aria-labelledby="pourquoi-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(champ('pourquoi_eyebrow'))}</p>
              <h2 id="pourquoi-title">${T.texte(champ('pourquoi_titre'))}</h2>
            </div>
            <div class="pourquoi__texte">
              <p class="lead">${T.texte(champ('pourquoi_texte1'))}</p>
              <p>${T.riche(champ('pourquoi_texte2'))}</p>
              <p><a class="link-arrow" href="a-propos/methode-editoriale.html">${T.texte(champ('pourquoi_lien'))} ${ICON.arrow}</a></p>
            </div>
          </div>
        </div>
      </section>`;
}

function parcoursSection() {
  const entrees = ENTREES_DEF().map(
    (e, index) => `<a class="entry entry--${e.tone}" href="${e.href}">
              <span class="entry__num">0${index + 1}</span>
              <h3 class="entry__title">${T.texte(e.verbe)}</h3>
              <p class="entry__text">${T.texte(e.texte)}</p>
              <span class="entry__foot"><span class="entry__meta">${T.texte(e.meta())}</span>${ICON.arrow}</span>
            </a>`
  ).join('\n            ');

  return `      <section class="section section--compact" id="parcours" aria-labelledby="parcours-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">${T.texte(champ('decisions_surtitre'))}</p>
              <h2 id="parcours-title">${T.texte(champ('decisions_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(champ('decisions_intro'))}</p>
          </div>
          <div class="entries">
            ${entrees}
          </div>
        </div>
      </section>`;
}



function orientationSection() {
  const v = V();

  const routes = [
    REGLAGES.premibel_afficher
      ? `            <article class="route">
              <p class="route__label">${T.texte(v.premibel_titre)}</p>
              <h3 class="route__title">${T.texte(v.premibel_sous_titre)}</h3>
              <p class="route__text">${T.riche(v.premibel_texte)}</p>

              <a class="link-arrow route__cta" href="${T.attribut(REGLAGES.premibel_url)}" rel="sponsored noopener">${T.texte(v.premibel_cta)} <span class="route__host">${T.texte(T.hote(REGLAGES.premibel_url))}</span> ${ICON.arrow}</a>
            </article>`
      : '',
    REGLAGES.allure_afficher
      ? `            <article class="route">
              <p class="route__label">${T.texte(v.allure_titre)}</p>
              <h3 class="route__title">${T.texte(v.allure_sous_titre)}</h3>
              <p class="route__text">${T.riche(v.allure_texte)}</p>
              <a class="link-arrow route__cta" href="projet/?besoin=pose">${T.texte(v.allure_cta)} ${ICON.arrow}</a>
            </article>`
      : '',
  ].filter(Boolean);
  return `      <section class="section section--compact section--orientation" aria-labelledby="orientation-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">${T.texte(v.passerelle_eyebrow)}</p>
              <h2 id="orientation-title">${T.texte(v.passerelle_titre)}</h2>
            </div>
            <p class="lead">${T.texte(v.passerelle_intro)}</p>
          </div>
          <div class="routes">
${routes.join('\n')}
          </div>
          <p class="routes__mixed">${T.lien(v.mixte, 'projet/?besoin=produit-pose')} <a class="routes__why" href="a-propos/#liens-commerciaux">Comprendre nos liens commerciaux</a></p>
        </div>
      </section>`;
}

function simulatorSection() {
  return `      <section class="section section--mineral" aria-labelledby="sim-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">${T.texte(champ('simu_surtitre'))}</p>
              <h2 id="sim-title">${T.texte(champ('simu_titre'))}</h2>
            </div>
            <div>
              <p class="lead">${T.texte(champ('simu_texte'))}</p>
              <p class="u-mt-5 u-actions">





                <a class="btn" href="outils/studio.html" data-vz-open><span>${T.texte(champ('simu_bouton'))}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="link-arrow" href="outils/simulateur-pose.html">${T.texte(champ('simu_lien_plan'))} ${ICON.arrow}</a>
              </p>
            </div>
          </div>
          <p class="sim-note">${T.riche(champ('simu_note'))}</p>
















          ${apercuSquelette('sejour')}
        </div>
      </section>`;
}



function apercuSquelette(id, base = '') {
  const piece = scene(id);
  const img = piece.image;
  const credit = img.credit ? `Photo : ${img.credit}.` : '';



  return `<div class="vzp" data-vz-preview data-room="${id}" data-base="${base}" data-reveal>
            <figure class="vzp__figure">
              <div class="vzp__stage" data-stage>
                <img class="vzp__photo" data-photo loading="lazy" decoding="async"
                  width="${img.width}" height="${img.height}"
                  src="${base}assets/images/${img.file}" alt="${img.alt}" />


                <canvas class="vzp__canvas" data-canvas aria-hidden="true"></canvas>
                <span class="vzp__tag vzp__tag--before">Avant</span>
                <span class="vzp__tag vzp__tag--after">Après</span>
                <input class="vzp__range" type="range" min="3" max="97" value="52"
                  aria-label="Curseur de comparaison entre la pièce d’origine et le parquet simulé" data-range />
                <span class="vzp__handle" aria-hidden="true"></span>
              </div>
              <figcaption class="vzp__caption">
                <span data-caption>${legendeVitrine()}</span> — rendu calculé dans votre navigateur.
                <span data-credit>${credit}</span>
              </figcaption>
            </figure>
            <div class="vzp__chips" role="group" aria-label="Aperçu d’autres finitions" data-chips></div>
          </div>`;
}





function immersiveSection() {
  const notes = [
    {
      num: '01',
      title: champ('focus1_titre'),
      text: champ('focus1_texte'),
    },
    {
      num: '02',
      title: champ('focus2_titre'),
      text: champ('focus2_texte'),
    },
    {
      num: '03',
      title: champ('focus3_titre'),
      text: champ('focus3_texte'),
    },
  ]
    .map(
      (note) => `<li class="dossier__note">
                <span class="dossier__num">${note.num}</span>
                <h3>${T.texte(note.title)}</h3>
                <p>${T.texte(note.text)}</p>
              </li>`
    )
    .join('\n              ');

  return `      <section class="dossier" aria-labelledby="focus-title">
        <div class="dossier__bg">
          ${picture('immersive-hongrie', {


            alt: 'Pièce aux murs bleus ouverte sur un jardin, sol en point de Hongrie filant vers la baie',
            sizes: '100vw',
          })}
        </div>
        <div class="wrap-wide dossier__inner">
          <div class="dossier__head" data-reveal>
            <p class="eyebrow eyebrow--plain">${T.texte(champ('focus_surtitre'))}</p>
            <h2 id="focus-title">${T.lignes(champ('focus_titre')).map(T.texte).join('<br />')}</h2>
            <div class="cluster">
              <a class="btn btn--light" href="motifs/point-de-hongrie.html"><span>${T.texte(champ('focus_bouton'))}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
              <a class="link-arrow dossier__all" href="motifs/">${T.texte(champ('focus_lien'))} ${ICON.arrow}</a>
            </div>
          </div>
          <ol class="dossier__notes" data-reveal data-reveal-delay="90">
              ${notes}
          </ol>
        </div>
      </section>`;
}

function carouselGallery() {
  const slides = GALLERY().map(
    (item) => `<div class="carousel__slide">
              <a class="shot" href="inspiration/#${INSPIRATION_PHOTOS[Number(item.img.replace('inspi-', '')) - 1].image}">
                ${picture(item.img, { alt: T.attribut(INSPIRATION_PHOTOS[Number(item.img.replace('inspi-', '')) - 1].alt), sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}
                <span class="shot__caption">
                  <span class="shot__cat">${T.texte(item.cat)}</span>
                  <span class="shot__title">${T.texte(item.title)}</span>
                </span>
              </a>
            </div>`
  ).join('\n            ');

  return `
      <section class="section section--dark" data-carousel aria-labelledby="inspi-title">
        <div>
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">${T.texte(champ('inspi_surtitre'))}</p>
              <h2 id="inspi-title">${T.texte(champ('inspi_titre'))}</h2>
            </div>
            <div class="carousel__controls">
              <span class="carousel__count" data-carousel-count>01 / ${String(GALLERY().length).padStart(2, '0')}</span>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-prev aria-label="Visuels précédents">${ICON.arrowLeft}</button>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-next aria-label="Visuels suivants">${ICON.arrow}</button>
              <a class="link-arrow inspi-all" href="inspiration/">${T.texte(champ('inspi_lien'))} ${ICON.arrow}</a>
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



const GUIDES_ACCUEIL = [
  'quel-sens-de-pose-choisir',
  'preparer-son-sol-avant-la-pose',
  'parquet-massif-ou-contrecolle',
  'erreurs-a-eviter-avant-de-poser',
];

function lectureSection() {
  const guides = GUIDES_ACCUEIL.map((slug) => {
    const g = GUIDES.find((x) => x.slug === slug);
    if (!g) throw new Error(`Accueil : guide « ${slug} » introuvable.`);
    return g;
  });
  const ligneGuide = (g) => `<a class="read-row" href="guides/${g.slug}.html">
                <span class="read-row__media">${picture(`cover-${g.slug}`, { alt: '', sizes: '6rem' })}</span>
                <span class="read-row__body">
                  <span class="read-row__title">${g.h1}</span>
                  <span class="read-row__text">${g.excerpt}</span>
                  <span class="read-row__meta">${g.category} · ${g.reading}</span>
                </span>
              </a>`;
  const ligneTuto = (tuto, index) => `<a class="read-row read-row--plain" href="tutoriels/${tuto.slug}.html">
                <span class="read-row__num">(0${index + 1})</span>
                <span class="read-row__body">
                  <span class="read-row__title">${tuto.h1}</span>
                  <span class="read-row__text">${tuto.excerpt}</span>
                  <span class="read-row__meta">${tuto.level} · ${tuto.duration}</span>
                </span>
              </a>`;

  return `      <section class="section section--compact" aria-labelledby="editorial-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">${T.texte(champ('lecture_surtitre'))}</p>
              <h2 id="editorial-title">${T.texte(champ('lecture_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(champ('lecture_intro'))}</p>
          </div>
          <div class="duo-rows">
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="cluster-title">${T.texte(champ('lecture_guides_titre'))}</h3>
                <a class="link-arrow" href="guides/">${T.texte(champ('lecture_guides_lien'))} ${ICON.arrow}</a>
              </div>
              <div class="read-rows">
              ${guides.map(ligneGuide).join('\n              ')}
              </div>
            </div>
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="tuto-title">${T.texte(champ('lecture_tutos_titre'))}</h3>
                <a class="link-arrow" href="tutoriels/">${T.texte(champ('lecture_tutos_lien'))} ${ICON.arrow}</a>
              </div>
              <div class="read-rows">
              ${TUTOS.map(ligneTuto).join('\n              ')}
              </div>
              <p class="read-rows__note">${T.lien(champ('lecture_note'), 'projet/?besoin=pose')}</p>
            </div>
          </div>
        </div>
      </section>`;
}

function projectSection() {
  return `      <section class="section section--compact section--projet" aria-labelledby="projet-title">
        <div class="wrap-wide">
          <div class="feature feature--wide-media">
            <div class="feature__body">
              <p class="eyebrow">${T.texte(champ('projet_eyebrow'))}</p>
              <h2 id="projet-title">${T.texte(champ('projet_titre'))}</h2>
              <p class="feature__lead">${T.texte(champ('projet_texte'))}</p>
              <ul class="feature__list">
                ${T.lignes(champ('projet_points')).map((l) => `<li>${ICON.check}<span>${T.texte(l)}</span></li>`).join('\n                ')}
              </ul>
              <div class="cluster">
                <a class="btn" href="projet/"><span>${T.texte(champ('projet_cta'))}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="btn btn--ghost" href="outils/studio.html"><span>${T.texte(champ('projet_cta2'))}</span></a>
              </div>
            </div>
            <div class="feature__media" data-reveal>
              ${picture('projet-visuel', { alt: 'Pièce vide aux stores blancs, parquet couleur miel en lames droites', sizes: '(min-width: 60rem) 45rem, 94vw' })}
            </div>
          </div>
        </div>
      </section>`;
}



const FAQ_TOUTES = () => [
  {
    q: champ('faq1_q'),
    a: champ('faq1_r'),
    lien: ['guides/quel-sens-de-pose-choisir.html', champ('faq1_lien')],
  },
  {
    q: champ('faq2_q'),
    a: champ('faq2_r'),
  },
  {
    q: champ('faq3_q'),
    a: champ('faq3_r'),
    lien: ['motifs/', champ('faq3_lien')],
  },
  {
    q: champ('faq4_q'),
    a: champ('faq4_r'),
  },
  {
    q: champ('faq5_q'),
    a: champ('faq5_r'),
    lien: ['guides/preparer-son-sol-avant-la-pose.html', champ('faq5_lien')],
  },
  {
    q: champ('faq6_q'),
    a: champ('faq6_r'),
    lien: ['outils/studio.html', champ('faq6_lien')],
  },
];

const FAQ_ACCUEIL = () => FAQ_TOUTES().filter((x) => x.q);

function faqSection() {
  const items = FAQ_ACCUEIL();
  return `      <section class="section section--compact" aria-labelledby="faq-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">${T.texte(champ('faq_surtitre'))}</p>
              <h2 id="faq-title">${T.texte(champ('faq_titre'))}</h2>
            </div>
            <p class="lead">${T.texte(champ('faq_intro').replace('{Questions_lettres}', enLettres(items.length).replace(/^./, (c) => c.toUpperCase())).replace('{questions_lettres}', enLettres(items.length)))}</p>
          </div>
          <div class="accordion faq-accueil" data-multiple="false">
            ${items
              .map(
                (item, index) => `<div class="accordion__item" data-open="${index === 0 ? 'true' : 'false'}">
              <h3><button class="accordion__trigger" type="button" aria-expanded="${index === 0}">
                <span>${T.texte(item.q)}</span><span class="accordion__icon" aria-hidden="true"></span>
              </button></h3>
              <div class="accordion__panel"><div><p>${T.texte(item.a)}</p>${item.lien && item.lien[1] ? `<p><a class="link-arrow" href="${item.lien[0]}">${T.texte(item.lien[1])} ${ICON.arrow}</a></p>` : ''}</div></div>
            </div>`
              )
              .join('\n            ')}
          </div>
        </div>
      </section>`;
}





function buildHomeBody() {
  return [
    heroSection(),
    pourquoiSection(),
    simulatorSection(),
    parcoursSection(),
    lectureSection(),
    immersiveSection(),
    carouselGallery(),
    faqSection(),
    orientationSection(),
    projectSection(),
  ].join('\n\n');
}

module.exports = { buildHomeBody, apercuSquelette, legendeVitrine, FAQ_ACCUEIL, ICON, SITE };
