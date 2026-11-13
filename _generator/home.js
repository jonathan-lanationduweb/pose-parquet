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



const nombres = (texte) => {
  const n = {
    guides: GUIDES.length,
    motifs: MOTIFS.length,
    parquets: NB_PREMIBEL_VISU,
    motifs_outils: NB_MOTIFS_PLAN,
  };
  return String(texte == null ? '' : texte).replace(/\{(guides|motifs|parquets|motifs_outils)(_lettres)?\}/g, (_, cle, lettres) =>
    lettres ? enLettres(n[cle]) : String(n[cle])
  );
};

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



const ENTREES = [
  {
    verbe: 'Comprendre la pose',
    texte: 'Support, sens de pose, massif ou contrecollé : ce qui se décide avant de commander.',
    href: 'guides/',
    meta: () => `${GUIDES.length} guides`,
    tone: 'mineral',
  },
  {
    verbe: 'Choisir son motif',
    texte: 'De la pose droite au point de Hongrie : le motif fait le caractère de la pièce.',
    href: 'motifs/',
    meta: () => `${MOTIFS.length} motifs`,
    tone: 'sage',
  },
  {
    verbe: 'Visualiser chez soi',
    texte: 'Votre photo, un parquet, un motif : le sol change à chaque clic.',
    href: 'outils/studio.html',
    meta: () => `${NB_PREMIBEL_VISU} parquets`,
    tone: 'slate',
  },
  {
    verbe: 'Préparer son chantier',
    texte: 'Quatre étapes courtes pour cadrer la pièce, le support et le besoin.',
    href: 'projet/',
    meta: () => 'Sans engagement',
    tone: 'clay',
  },
];



const GALLERY = [
  { img: 'inspi-1', cat: 'Séjour', title: 'Traversant, lames droites' },
  { img: 'inspi-2', cat: 'Chambre', title: 'Point de Hongrie' },
  { img: 'inspi-6', cat: 'Salon', title: 'Pièce en angle, lames de noyer' },
  { img: 'inspi-3', cat: 'Cuisine', title: 'Ouverte, lames larges' },
  { img: 'inspi-5', cat: 'Chambre', title: 'Lames droites, chêne foncé' },
  { img: 'inspi-4', cat: 'Couloir', title: 'Point de Hongrie dans l’axe' },
  { img: 'inspi-7', cat: 'Pièce à arcades', title: 'Bâton rompu' },
  { img: 'inspi-8', cat: 'Entrée', title: 'Lames dans l’axe' },
];

const MARQUEE = [
  'Pose droite', 'Point de Hongrie', 'Bâton rompu', 'Diagonale', 'Calepinage',
  'Pose collée', 'Pose flottante', 'Frise périphérique', 'Ragréage', 'Sens de la lumière',
];

function heroSection() {

  const orientation = T.riche(champ('hero_orientation')).replace(/\[([^\]]+)\]/, (_, l) => `<a href="a-propos/#liens-commerciaux">${l}</a>`);
  return `      <section class="hero" data-hero>
        <div class="hero__media" data-hero-media>
          ${picture('hero-wide', { alt: 'Grande pièce vide au parquet clair traversée par la lumière', sizes: '100vw', priority: true })}
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
              <li><b>${MOTIFS.length}</b> motifs détaillés</li>
              <li><b>${GUIDES.length}</b> guides pratiques</li>
              <li><b>${NB_PREMIBEL_VISU}</b> parquets à essayer</li>
            </ul>
          </div>
        </div>
        <a class="hero__scroll" href="#pourquoi">Découvrir ${ICON.down}</a>
      </section>

      <div class="marquee" aria-hidden="true">
        <div class="marquee__track">
          ${[...MARQUEE, ...MARQUEE]
            .map((item) => `<span class="marquee__item">${ICON.chevron}${item}</span>`)
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
  const entrees = ENTREES.map(
    (e, index) => `<a class="entry entry--${e.tone}" href="${e.href}">
              <span class="entry__num">0${index + 1}</span>
              <h3 class="entry__title">${e.verbe}</h3>
              <p class="entry__text">${e.texte}</p>
              <span class="entry__foot"><span class="entry__meta">${e.meta()}</span>${ICON.arrow}</span>
            </a>`
  ).join('\n            ');

  return `      <section class="section section--compact" id="parcours" aria-labelledby="parcours-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Par où commencer</p>
              <h2 id="parcours-title">Les ${enLettres(ENTREES.length)} décisions à prendre avant de poser votre parquet.</h2>
            </div>
            <p class="lead">Elles se prennent dans cet ordre. Commencez par celle qui vous concerne aujourd’hui.</p>
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
              <p class="eyebrow">Outil gratuit · aucune inscription</p>
              <h2 id="sim-title">Visualisez votre parquet chez vous, à partir d’une photo.</h2>
            </div>
            <div>
              <p class="lead">Importez une photo de votre pièce, choisissez parmi ${NB_PREMIBEL_VISU} références et comparez les motifs au curseur. ${enLettres(MOTIFS.length).replace(/^./, (c) => c.toUpperCase())} motifs sont documentés sur le site, dont ${enLettres(NB_MOTIFS_PLAN)} simulables dans nos outils. Le calcul se fait dans votre navigateur : votre photo n’est ni envoyée, ni stockée, ni analysée par un service tiers.</p>
              <p class="u-mt-5 u-actions">





                <a class="btn" href="outils/studio.html" data-vz-open><span>Ouvrir le simulateur</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="link-arrow" href="outils/simulateur-pose.html">Mode Plan : comparer les sens de pose ${ICON.arrow}</a>
              </p>
            </div>
          </div>
          <p class="sim-note"><strong>Votre photo reste sur votre appareil.</strong> Contrairement aux simulateurs des fabricants, aucun envoi vers un serveur, aucun compte à créer, aucun catalogue imposé.</p>
















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
      title: 'Une flèche continue',
      text: 'Les lames, coupées en biais à leurs extrémités, forment une pointe qui file vers le fond de la pièce et guide le regard.',
    },
    {
      num: '02',
      title: 'Un axe sans pardon',
      text: 'Tout se joue au traçage : un écart minime en début de pose se cumule et finit par se voir sur toute la longueur.',
    },
    {
      num: '03',
      title: 'Lames gauches et droites',
      text: 'Elles se commandent ensemble, en quantités égales, avec une marge de chutes plus large qu’une pose droite.',
    },
  ]
    .map(
      (note) => `<li class="dossier__note">
                <span class="dossier__num">${note.num}</span>
                <h3>${note.title}</h3>
                <p>${note.text}</p>
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
            <p class="eyebrow eyebrow--plain">Focus motif · 04</p>
            <h2 id="focus-title">Le point de Hongrie,<br />une flèche au sol.</h2>
            <div class="cluster">
              <a class="btn btn--light" href="motifs/point-de-hongrie.html"><span>Le guide du point de Hongrie</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
              <a class="link-arrow dossier__all" href="motifs/">Les ${MOTIFS.length} motifs de pose ${ICON.arrow}</a>
            </div>
          </div>
          <ol class="dossier__notes" data-reveal data-reveal-delay="90">
              ${notes}
          </ol>
        </div>
      </section>`;
}

function carouselGallery() {
  const slides = GALLERY.map(
    (item) => `<div class="carousel__slide">
              <a class="shot" href="inspiration/#${INSPIRATION_PHOTOS[Number(item.img.replace('inspi-', '')) - 1].image}">
                ${picture(item.img, { alt: `${item.cat} — ${item.title}`, sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}
                <span class="shot__caption">
                  <span class="shot__cat">${item.cat}</span>
                  <span class="shot__title">${item.title}</span>
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
              <p class="eyebrow">Inspiration</p>
              <h2 id="inspi-title">${enLettres(GALLERY.length).replace(/^./, (c) => c.toUpperCase())} pièces, ${enLettres(GALLERY.length)} motifs de parquet en situation.</h2>
            </div>
            <div class="carousel__controls">
              <span class="carousel__count" data-carousel-count>01 / ${String(GALLERY.length).padStart(2, '0')}</span>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-prev aria-label="Visuels précédents">${ICON.arrowLeft}</button>
              <button class="icon-btn icon-btn--light" type="button" data-carousel-next aria-label="Visuels suivants">${ICON.arrow}</button>
              <a class="link-arrow inspi-all" href="inspiration/">Les ${GALLERY.length} ambiances ${ICON.arrow}</a>
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
              <p class="eyebrow">Guides et tutoriels</p>
              <h2 id="editorial-title">Guides et tutoriels de pose de parquet.</h2>
            </div>
            <p class="lead">Les guides tranchent les décisions d’achat. Les tutoriels déroulent le chantier, outillage et points de contrôle compris.</p>
          </div>
          <div class="duo-rows">
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="cluster-title">Guides : décider avant de commander</h3>
                <a class="link-arrow" href="guides/">Les ${GUIDES.length} guides ${ICON.arrow}</a>
              </div>
              <div class="read-rows">
              ${guides.map(ligneGuide).join('\n              ')}
              </div>
            </div>
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="tuto-title">Tutoriels : poser soi-même, étape par étape</h3>
                <a class="link-arrow" href="tutoriels/">Tous les tutoriels ${ICON.arrow}</a>
              </div>
              <div class="read-rows">
              ${TUTOS.map(ligneTuto).join('\n              ')}
              </div>
              <p class="read-rows__note">Vous préférez confier la pose ? <a href="projet/?besoin=pose">Décrivez votre projet</a>.</p>
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
              ${picture('projet-visuel', { alt: 'Pièce lumineuse au parquet clair', sizes: '(min-width: 60rem) 45rem, 94vw' })}
            </div>
          </div>
        </div>
      </section>`;
}



const FAQ_ACCUEIL = () => [
  {
    q: 'Faut-il poser le parquet dans le sens de la lumière ou perpendiculairement à la fenêtre ?',
    a: 'Les deux formulations décrivent le même geste, ce qui explique la confusion fréquente. Les rayons entrent perpendiculairement au plan de la fenêtre : poser « dans le sens de la lumière » revient donc à orienter les lames perpendiculairement au mur qui porte la fenêtre. Les joints filent alors dans l’axe des rayons et se remarquent beaucoup moins.',
    lien: ['guides/quel-sens-de-pose-choisir.html', 'Le guide complet du sens de pose'],
  },
  {
    q: 'Dans quel sens poser un parquet dans un couloir ?',
    a: 'Dans la longueur, parallèlement aux murs. Une pose en travers multiplie les coupes, hache visuellement le passage et raccourcit l’espace. C’est le seul cas courant où la géométrie prime sur la lumière : un couloir se pose dans son axe, même si la fenêtre se trouve à son extrémité.',
  },
  {
    q: 'Quelle est la différence entre bâton rompu et point de Hongrie ?',
    a: 'Le bâton rompu assemble des lames à bouts droits, posées perpendiculairement les unes aux autres : les extrémités se décalent et forment un zigzag. Le point de Hongrie utilise des lames coupées en biais qui se rejoignent bout à bout en une pointe continue. Il exige des lames gauches et droites, en quantités égales.',
    lien: ['motifs/', `Les ${MOTIFS.length} motifs de pose`],
  },
  {
    q: 'Combien de chutes faut-il prévoir ?',
    a: 'Comptez de l’ordre de 5 % en pose droite et 10 à 15 % en diagonale ou en point de Hongrie, ces motifs multipliant les coupes d’angle en périphérie. Prévoyez la marge au moment de la commande : un complément acheté plus tard peut provenir d’un autre bain de teinte.',
  },
  {
    q: 'Peut-on poser du parquet sur du carrelage ?',
    a: 'En pose flottante, c’est généralement possible si le carrelage est sain, adhérent et suffisamment plan. Contrôlez la planéité à la règle de deux mètres et vérifiez la hauteur disponible sous les portes et aux seuils : c’est le point qui bloque le plus souvent le projet, pas le support lui-même.',
    lien: ['guides/preparer-son-sol-avant-la-pose.html', 'Préparer son sol avant la pose'],
  },
  {
    q: 'Le simulateur est-il vraiment gratuit, et ma photo est-elle envoyée quelque part ?',
    a: `Le simulateur est gratuit et ne demande aucune inscription. Votre photo n’est ni envoyée, ni stockée, ni analysée par un service tiers : le rendu est calculé dans votre navigateur, sur votre appareil. Vous disposez de ${NB_PREMIBEL_VISU} références et de ${enLettres(NB_MOTIFS)} motifs de pose, avec un comparateur avant / après.`,
    lien: ['outils/studio.html', 'Ouvrir le simulateur'],
  },
];

function faqSection() {
  const items = FAQ_ACCUEIL();
  return `      <section class="section section--compact" aria-labelledby="faq-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row section-head__row--tight">
            <div>
              <p class="eyebrow">Questions fréquentes</p>
              <h2 id="faq-title">Questions fréquentes sur la pose de parquet.</h2>
            </div>
            <p class="lead">${enLettres(items.length).replace(/^./, (c) => c.toUpperCase())} questions qui reviennent avant chaque chantier, et les réponses que nous donnons.</p>
          </div>
          <div class="accordion faq-accueil" data-multiple="false">
            ${items
              .map(
                (item, index) => `<div class="accordion__item" data-open="${index === 0 ? 'true' : 'false'}">
              <h3><button class="accordion__trigger" type="button" aria-expanded="${index === 0}">
                <span>${item.q}</span><span class="accordion__icon" aria-hidden="true"></span>
              </button></h3>
              <div class="accordion__panel"><div><p>${item.a}</p>${item.lien ? `<p><a class="link-arrow" href="${item.lien[0]}">${item.lien[1]} ${ICON.arrow}</a></p>` : ''}</div></div>
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
