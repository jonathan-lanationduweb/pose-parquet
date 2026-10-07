/* Nouvelle page d'accueil — composition éditoriale plein cadre. */
const { SITE } = require('./layout');
const { picture } = require('./responsive');
const { NB_PIECES, scene } = require('./scenes');
const { NB_PREMIBEL_VISU, NB_MOTIFS, enLettres, mentionRendu } = require('./catalogue');
const { GUIDES } = require('./content-guides');
const { MOTIFS } = require('./content-motifs');
const { TUTOS } = require('./content-tutos');
/*
 * Les textes des sections pilotées par WordPress (hero, passerelle, projet) :
 * des champs structurés, lus au moment du rendu (WordPress les a déjà
 * appliqués). La structure des sections, elle, reste ici.
 */
const { PAGES } = require('./content-pages');
const { REGLAGES } = require('./content-site');
const T = require('./textes');
const V = () => PAGES['accueil'].valeurs;

/*
 * Les chiffres de cette page ne sont plus écrits à la main.
 *
 * Chacun d'eux décrivait une donnée technique — combien de pièces, de
 * parquets, de motifs, de guides — et chacun se périmait en silence dès que
 * la donnée bougeait. Deux l'avaient déjà fait : « dix pièces d'exemple »
 * quand le Studio en proposait neuf, « douze parquets » quand le tiroir en
 * présentait vingt-six.
 *
 * Ils viennent donc tous de la source qui les détermine, et `check-chiffres`
 * échoue si un nombre réapparaît en dur dans une de ces phrases.
 */
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

/**
 * Les quatre entrées du parcours : COMPRENDRE, CHOISIR, VISUALISER, PRÉPARER.
 *
 * C'étaient quatre tuiles de 22 rem, chacune portant une photographie, pour
 * quatre liens et 94 mots : 774 px sur grand écran, 1 174 sur téléphone. Les
 * photos n'apprenaient rien — l'une montrait un ragréage, l'autre un bâton
 * rompu sous le titre « Je choisis mon motif ». La section devient une
 * navigation : quatre blocs bas, un verbe, une phrase, une destination réelle.
 *
 * Les quatre verbes suivent la V2 : on comprend (guides), on choisit (motifs),
 * on visualise (Studio), on prépare son projet (formulaire, qui oriente selon
 * le besoin). Les chiffres viennent des sources, jamais d'une saisie.
 */
const ENTREES = [
  {
    verbe: 'Comprendre',
    texte: 'Support, sens de pose, massif ou contrecollé : ce qui se décide avant de commander.',
    href: 'guides/',
    meta: () => `${GUIDES.length} guides`,
    tone: 'mineral',
  },
  {
    verbe: 'Choisir',
    texte: 'De la pose droite au Point de Hongrie : le motif fait le caractère de la pièce.',
    href: 'motifs/',
    meta: () => `${MOTIFS.length} motifs`,
    tone: 'sage',
  },
  {
    verbe: 'Visualiser',
    texte: 'Votre photo, un parquet, un motif : le sol change à chaque clic.',
    href: 'outils/studio.html',
    meta: () => `${NB_PREMIBEL_VISU} parquets à essayer`,
    tone: 'slate',
  },
  {
    verbe: 'Préparer mon projet',
    texte: 'Quatre étapes courtes pour cadrer la pièce, le support et le besoin.',
    href: 'projet/',
    meta: () => 'Sans engagement',
    tone: 'clay',
  },
];

/*
 * Légendes du carrousel : ce que la photographie montre, rien de plus.
 *
 * Elles décrivaient l'ANCIEN jeu d'images. Les photographies avaient été
 * remplacées dans `photos.js` sans que les fichiers `inspi-N` soient
 * retéléchargés — `fetch-photos.js` ne prend que ce qui manque — et les
 * légendes étaient restées avec les anciennes. Cinq des huit annonçaient
 * donc autre chose que ce qu'on voyait : des combles pour une pièce à
 * arcades, un bâton rompu pour des lames droites, une diagonale pour un
 * parquet posé droit, une frise périphérique inexistante, et des lames dans
 * l'axe pour un point de Hongrie.
 *
 * Chaque légende ci-dessous a été écrite en regardant le fichier.
 */
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
  return `      <section class="hero" data-hero>
        <div class="hero__media" data-hero-media>
          ${picture('hero-wide', { alt: 'Grande pièce vide au parquet clair traversée par la lumière', sizes: '100vw', priority: true })}
          <video muted loop playsinline preload="none" data-src="" aria-hidden="true"></video>
        </div>
        <div class="wrap-wide hero__inner">
          <p class="eyebrow">${T.texte(V().hero_eyebrow)}</p>
          <h1 class="hero__title">${T.riche(V().hero_titre)}</h1>
          <div class="hero__row">
            <div>
              <!--
                Le chapeau porte la relation, sans logo ni bouton de plus : ce
                que fait Pose Parquet d'abord, puis vers qui il oriente. Un
                visiteur doit savoir avant de défiler où trouver un parquet et
                qui peut le poser — le pied de page ne suffisait pas.
              -->
              <p class="hero__lead">${T.riche(V().hero_texte)}</p>
              <div class="hero__actions">
                <a class="btn btn--light btn--lg" href="guides/"><span>${T.texte(V().hero_cta_guides)}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="btn btn--outline-light btn--lg" href="outils/studio.html"><span>${T.texte(V().hero_cta_visualiseur)}</span></a>
              </div>
            </div>
            <ul class="hero__meta">
              <li><b>${NB_MOTIFS_PLAN}</b> motifs simulés</li>
              <li><b>${GUIDES.length}</b> guides pratiques</li>
              <li><b>${NB_PIECES}</b> pièces d’exemple</li>
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
              <h2 id="parcours-title">Comprendre, choisir, visualiser, préparer.</h2>
            </div>
            <p class="lead">Quatre étapes d’un même chantier. Commencez par celle qui vous concerne aujourd’hui.</p>
          </div>
          <div class="entries">
            ${entrees}
          </div>
        </div>
      </section>`;
}

/**
 * Du choix du parquet à sa réalisation — la relation, dite tôt et sobrement.
 *
 * Les deux noms n'apparaissaient qu'en bas de page et dans le pied de page :
 * un visiteur ne comprenait ni où trouver un parquet, ni qui pouvait le poser.
 * Cette section le dit juste après « Par où commencer », avant les outils.
 *
 * LES TITRES SONT DES MÉTIERS, PAS DES MARQUES. « Trouver votre parquet »,
 * « Faire poser ou rénover » ; Premibel et Allure Design ne sont que des
 * étiquettes typographiques, sans logo ni couleur propre. Ce n'est pas un
 * bandeau partenaire : c'est la suite du parcours.
 *
 * LES DESTINATIONS. Premibel : son site officiel (premibel.fr, déjà cité sur
 * /a-propos/), faute d'une page catalogue générale vérifiée — aucune URL n'est
 * inventée. Allure Design : le formulaire de ce site, pré-réglé sur la pose,
 * pour que la demande soit qualifiée (besoin, département) avant toute
 * orientation, conformément à la règle publiée sur /a-propos/. Le besoin mixte
 * a son propre lien, que le formulaire sait déjà lire.
 */
function orientationSection() {
  const v = V();
  // Une destination désactivée dans « Mon site » perd sa carte, pas la section.
  const routes = [
    REGLAGES.premibel_afficher
      ? `            <article class="route">
              <p class="route__label">${T.texte(REGLAGES.premibel_libelle)}</p>
              <h3 class="route__title">${T.texte(v.premibel_titre)}</h3>
              <p class="route__text">${T.texte(v.premibel_texte)}</p>
              <a class="link-arrow route__cta" href="${T.attribut(REGLAGES.premibel_url)}" rel="noopener">${T.texte(v.premibel_cta)} <span class="route__host">${T.texte(T.hote(REGLAGES.premibel_url))}</span> ${ICON.arrow}</a>
            </article>`
      : '',
    REGLAGES.allure_afficher
      ? `            <article class="route">
              <p class="route__label">${T.texte(REGLAGES.allure_libelle)}</p>
              <h3 class="route__title">${T.texte(v.allure_titre)}</h3>
              <p class="route__text">${T.texte(v.allure_texte)}</p>
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
              <p class="eyebrow">Visualiseur · outil</p>
              <h2 id="sim-title">Essayez votre parquet dans votre pièce.</h2>
            </div>
            <div>
              <p class="lead">Importez une photo, choisissez un parquet et comparez plusieurs rendus. Le calcul se fait dans votre navigateur : votre photo n’est ni envoyée ni conservée.</p>
              <p class="u-mt-5 u-actions">
                <!-- « data-vz-open » : js/scene/preview.js enrichit ce lien avec la
                     configuration affichée dans l'aperçu, pour que le Studio
                     s'ouvre sur ce que le visiteur regarde et non sur un état par
                     défaut. L'adresse ci-dessous reste valable telle quelle si le
                     script ne s'exécute pas — le lien n'est jamais cassé. -->
                <a class="btn" href="outils/studio.html" data-vz-open><span>Visualiser mon parquet</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="link-arrow" href="outils/simulateur-pose.html">Mode Plan : comparer les sens de pose ${ICON.arrow}</a>
                <a class="link-arrow" href="outils/">Tous les outils ${ICON.arrow}</a>
              </p>
            </div>
          </div>
          <!-- Scène de l'avant/après : une scène VALIDÉE sur les cinq critères de
               _calibrage/scene-review.html, et la mieux placée pour une première
               impression.

               « chambre » tenait ce rôle à l'époque où elle était la seule
               validée. Elle ne l'est plus : au manifeste, « sejour » est passée
               validated en géométrie ET en visuel. Le choix se joue donc
               maintenant sur ce que la photo montre, et « sejour » gagne sur les
               trois points qui comptent ici — un séjour plutôt qu'une pièce aux
               murs bleus, une lumière chaude plutôt que froide, et 35,4 % de
               l'image en sol contre 26,3 %.

               Elle a surtout **deux zones de sol** : le séjour et la salle à
               manger derrière l'ouverture changent ensemble. C'est la meilleure
               démonstration possible que le rendu est calculé, et non une image
               retouchée d'avance. -->
          ${apercuSquelette('sejour')}
        </div>
      </section>`;
}

/**
 * Le squelette de l'aperçu, écrit dans le HTML plutôt que par le JavaScript.
 *
 * Mesuré avant correction : l'hôte `data-vz-preview` faisait 0 px de haut
 * jusqu'à l'exécution de `js/scene/preview.js`, qui y injectait d'un coup
 * 317 px de composant — le document passait de 9 535 à 9 853 px et tout ce qui
 * suivait la section descendait sous les yeux du visiteur.
 *
 * La place est donc réservée ici, par la même structure que le module produira.
 * Elle ne coûte rien : le rapport de forme du cadre est déjà porté par
 * `.vzp__stage` dans la feuille de style, et la photo est en `loading="lazy"`
 * — le navigateur connaît ses dimensions par `width`/`height` et tient la boîte
 * sans avoir téléchargé un octet.
 *
 * Ce n'est pas une image d'illustration : c'est la photo « avant » de la scène,
 * celle-là même que le composant affiche sous le rendu. Aucun parquet n'est
 * montré tant qu'il n'a pas été calculé.
 *
 * `preview.js` réutilise ce squelette s'il le trouve complet, et le recrée
 * sinon : les deux chemins restent valides, et une divergence se répare seule.
 */
function apercuSquelette(id, base = '') {
  const piece = scene(id);
  const img = piece.image;
  const credit = img.credit ? `Photo : ${img.credit}.` : '';
  // La classe « vzp » est posée ici et non par le script : elle porte
  // `display: grid` et sa gouttière, soit 16 px qui apparaissaient au montage.
  // Réserver le cadre sans réserver la gouttière laissait un dernier sursaut.
  return `<div class="vzp" data-vz-preview data-room="${id}" data-base="${base}" data-reveal>
            <figure class="vzp__figure">
              <div class="vzp__stage" data-stage>
                <img class="vzp__photo" data-photo loading="lazy" decoding="async"
                  width="${img.width}" height="${img.height}"
                  src="${base}assets/images/${img.file}" alt="${img.alt}" />
                <!-- Couche visuelle d'une figure qui porte deja sa description
                     dans la legende : rien a annoncer une seconde fois. -->
                <canvas class="vzp__canvas" data-canvas aria-hidden="true"></canvas>
                <span class="vzp__tag vzp__tag--before">Avant</span>
                <span class="vzp__tag vzp__tag--after">Après</span>
                <input class="vzp__range" type="range" min="3" max="97" value="52"
                  aria-label="Curseur de comparaison entre la pièce d’origine et le parquet simulé" data-range />
                <span class="vzp__handle" aria-hidden="true"></span>
              </div>
              <figcaption class="vzp__caption">
                <span data-caption>Chêne naturel Houston, lames droites${mentionRendu('CHENF39031') ? ` (${mentionRendu('CHENF39031')})` : ''}</span> — rendu calculé dans votre navigateur.
                <span data-credit>${credit}</span>
              </figcaption>
            </figure>
            <div class="vzp__chips" role="group" aria-label="Aperçu d’autres finitions" data-chips></div>
          </div>`;
}

/*
 * `data-scroll-factor` — combien de défilement vertical coûte le carrousel.
 *
 * Au-dessus de 62 rem, la section se fige et le carrousel avance avec la
 * molette : sa hauteur vaut donc la hauteur du bloc collant PLUS la course
 * horizontale multipliée par ce facteur. À 0,9 et 0,85, les deux carrousels
 * pesaient 4 783 px sur 11 249 — 43 % de l'accueil pour onze fiches.
 *
 * À 0,65, le contenu est identique, la lecture reste confortable, et la page
 * raccourcit de près de 800 px sans qu'une seule fiche disparaisse. Sous
 * 62 rem le facteur ne sert pas : le carrousel y défile au doigt.
 */
/**
 * Focus motif — composition éditoriale asymétrique.
 *
 * L'ancienne version posait un titre centré au milieu de la photo, puis une
 * colonne de trois blocs alignée à droite : lisible, mais statique, et les
 * textes tombaient en plein dans la zone la plus chargée de l'image.
 *
 * Ici, la photo occupe tout le cadre et le texte se range en bas : le titre à
 * gauche, ancré, puis les trois points en une rangée séparée par un filet, à la
 * manière d'un bas de page de dossier. Le regard entre par l'image, descend
 * vers le titre, puis balaie les trois points. Rien ne flotte au centre.
 */
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
            /*
             * L'alt est ecrit ici, et non repris de photos.js : cette section
             * est la seule a utiliser la cle, et le texte qui l'entoure parle
             * du motif. Les deux doivent rester d'accord — si l'image change,
             * cette phrase change avec elle.
             */
            alt: 'Pièce aux murs bleus ouverte sur un jardin, sol en point de Hongrie filant vers la baie',
            sizes: '100vw',
          })}
        </div>
        <div class="wrap-wide dossier__inner">
          <div class="dossier__head" data-reveal>
            <p class="eyebrow eyebrow--plain">Focus motif · 04</p>
            <h2 id="focus-title">Le Point de Hongrie,<br />une flèche au sol.</h2>
            <div class="cluster">
              <a class="btn btn--light" href="motifs/point-de-hongrie.html"><span>Découvrir le motif</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
              <a class="link-arrow dossier__all" href="motifs/">Les ${enLettres(MOTIFS.length)} motifs ${ICON.arrow}</a>
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
              <a class="shot" href="inspiration/">
                ${picture(item.img, { alt: `${item.cat} — ${item.title}`, sizes: '(min-width: 75rem) 26rem, (min-width: 48rem) 45vw, 92vw' })}
                <span class="shot__caption">
                  <span class="shot__cat">${item.cat}</span>
                  <span class="shot__title">${item.title}</span>
                </span>
              </a>
            </div>`
  ).join('\n            ');

  return `      <!--
        Carrousel LIBRE, et non plus piloté par le défilement. Figé à l'écran
        pendant que la molette faisait avancer les vignettes, il coûtait
        2 228 px de page sur un écran de 1 440 pour huit images — le plus long
        bloc de l'accueil, devant le Visualiseur. Libre, il défile au doigt,
        à la souris et aux flèches, et la page Inspiration montre le reste.
      -->
      <section class="section section--dark" data-carousel aria-labelledby="inspi-title">
        <div>
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

/**
 * Comprendre, puis poser — une seule section pour lire avant d'agir.
 *
 * TROIS BLOCS FUSIONNÉS. L'accueil empilait un carrousel de six guides piloté
 * par le défilement (947 px), puis deux listes — « Le sens de pose, de A à Z »
 * et « Passer au geste » — de 917 px, dont quatre guides déjà présents dans le
 * carrousel. Trois fois la même promesse de lecture, pour 423 mots.
 *
 * Ici : quatre guides choisis, ceux qui tranchent une décision d'achat, avec
 * leur couverture en vignette ; à côté, les trois tutoriels, sans image, parce
 * que deux n'ont pas encore de photographie juste (voir IMAGE_REQUIRED dans
 * photos.js) et qu'un aplat vide ne vaut pas mieux qu'une fausse image. Sur
 * téléphone, les résumés se taisent : titre et durée suffisent à choisir.
 */
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
              <h2 id="editorial-title">Comprendre, puis poser.</h2>
            </div>
            <p class="lead">Les guides tranchent les décisions d’achat ; les tutoriels déroulent le chantier, outillage et contrôles compris.</p>
          </div>
          <div class="duo-rows">
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="cluster-title">Décider avant de commander</h3>
                <a class="link-arrow" href="guides/">Les ${GUIDES.length} guides ${ICON.arrow}</a>
              </div>
              <div class="read-rows">
              ${guides.map(ligneGuide).join('\n              ')}
              </div>
            </div>
            <div class="duo-rows__col">
              <div class="duo-rows__head">
                <h3 id="tuto-title">Passer au geste</h3>
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
              <p class="eyebrow">${T.texte(V().projet_eyebrow)}</p>
              <h2 id="projet-title">${T.texte(V().projet_titre)}</h2>
              <p class="feature__lead">${T.texte(V().projet_texte)}</p>
              <ul class="feature__list">
                ${T.lignes(V().projet_points).map((l) => `<li>${ICON.check}<span>${T.texte(l)}</span></li>`).join('\n                ')}
              </ul>
              <div class="cluster">
                <a class="btn" href="projet/"><span>${T.texte(V().projet_cta)}</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
                <a class="btn btn--ghost" href="outils/studio.html"><span>${T.texte(V().projet_cta2)}</span></a>
              </div>
            </div>
            <div class="feature__media" data-reveal>
              ${picture('projet-visuel', { alt: 'Pièce lumineuse au parquet clair', sizes: '(min-width: 60rem) 45rem, 94vw' })}
            </div>
          </div>
        </div>
      </section>`;
}

/*
 * L'ORDRE DE L'ACCUEIL — V2.
 *
 * Pose Parquet vend d'abord son utilité : on comprend, on choisit, on
 * visualise, on prépare son projet, et l'orientation vers Premibel ou Allure
 * Design n'arrive qu'à la fin, là où elle répond à un besoin exprimé.
 *
 *   1. Hero                 — la promesse
 *   2. Par où commencer      — les quatre étapes, en navigation compacte
 *   2 bis. Orientation       — Premibel pour le parquet, Allure Design pour la pose
 *   3. Visualiseur           — l'outil principal, Mode Plan en lien
 *   4. Inspiration           — des ambiances qui s'ouvrent dans le Studio
 *   5. Focus motif           — le Point de Hongrie, puis les six motifs
 *   6. Comprendre, puis poser — guides de décision et tutoriels
 *   7. Votre projet          — la conversion, et l'orientation
 *
 * Retirés : le carrousel des guides (fondu dans 6) et la boîte à outils (le
 * Visualiseur et le Mode Plan sont en 3 ; la checklist « Bientôt » n'a rien à
 * faire sur l'accueil — elle reste annoncée sur /outils/).
 */
function buildHomeBody() {
  return [
    heroSection(),
    parcoursSection(),
    orientationSection(),
    simulatorSection(),
    carouselGallery(),
    immersiveSection(),
    lectureSection(),
    projectSection(),
  ].join('\n\n');
}

module.exports = { buildHomeBody, apercuSquelette, ICON, SITE };
