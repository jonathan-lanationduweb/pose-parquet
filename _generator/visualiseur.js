/**
 * Deux pages, deux rôles :
 *
 *  - outils/visualiseur.html : la landing. C'est elle qui porte le H1, les
 *    explications, la FAQ et les données structurées. Elle se termine par un
 *    seul appel à l'action.
 *  - outils/studio.html      : l'application. Aucune prose, aucun pied de
 *    page, aucun fil d'Ariane — juste l'outil.
 *
 * Le nom public est **Visualiseur Parquet**. « Studio » ne subsiste que comme
 * nom technique — le fichier de l'application et les classes CSS — parce que
 * l'URL est déjà indexée et qu'un identifiant interne n'a pas à porter le
 * nom commercial.
 */
const { SITE, layout, appLayout, breadcrumb } = require('./layout');
const { faq, faqJsonLd, tip } = require('./ui');
const { ICON } = require('./home');

const STUDIO_URL = 'studio.html';

function buildStudioPage(write) {
  write(
    'outils/studio.html',
    appLayout({
      title: 'Visualiseur Parquet · Pose Parquet',
      description:
        'Visualiseur Parquet : choisissez une pièce, essayez des parquets, comparez jusqu’à trois rendus. Tout est calculé dans votre navigateur.',
      path: 'outils/studio.html',
      depth: 1,
    })
  );
}

function buildVisualiseurPage(write) {
  buildStudioPage(write);

  const crumbs = breadcrumb('../', [
    { label: 'Accueil', href: 'index.html' },
    { label: 'Outils', href: 'outils/' },
    { label: 'Visualiser ma pièce' },
  ]);

  const questions = [
    {
      q: 'Comment le sol est-il délimité ?',
      a: "Les pièces d'exemple arrivent avec leur sol déjà détouré, y compris les pièces que l'on aperçoit derrière une ouverture : vous n'avez rien à faire, le parquet se pose du premier coup. Sur votre propre photo, vous placez le cadre du sol, puis vous pouvez affiner le contour et effacer au pinceau ce qui doit rester devant : meubles, tapis, plinthes. Aucune détection automatique n'est utilisée ni simulée, et rien dans l'interface ne le laisse croire.",
    },
    {
      q: 'Ma photo est-elle envoyée quelque part ?',
      a: "Non. Elle est lue et traitée directement dans votre navigateur : aucun envoi vers un serveur, aucun stockage. Fermez l'onglet et il n'en reste rien.",
    },
    {
      q: 'Les parquets proposés existent-ils vraiment ?',
      a: "Ce sont douze références de démonstration. Chacune a son propre veinage, ses nœuds, son contraste et sa largeur de lame, mais elles ne correspondent pas à un produit commercial précis. Le visualiseur sert à choisir une direction — une teinte, un motif, un sens de pose — pas à valider une commande.",
    },
    {
      q: 'Puis-je comparer plusieurs parquets ?',
      a: "Oui. Vous enregistrez jusqu'à trois versions, puis vous les comparez sur la même photo, au même cadrage : au curseur pour deux, en vues côte à côte pour trois. Un bouton permet de repartir de celle que vous préférez.",
    },
    {
      q: 'Pourquoi le parquet suit-il la perspective ?',
      a: "Parce que le motif n'est pas calculé sur l'image, mais dans le plan du sol, en mètres, avant d'être projeté. Une lame de 18 cm mesure 18 cm au premier plan comme au fond : elle rétrécit et converge d'elle-même. C'est vrai aussi du point de Hongrie, dont les chevrons appartiennent au sol au lieu d'être plaqués par-dessus. Une pièce peut d'ailleurs contenir plusieurs sols visibles — le parquet choisi les change tous, chacun avec sa propre fuite.",
    },
  ];

  const steps = [
    {
      num: '(01)',
      title: 'Choisissez une pièce',
      text: 'Quatre pièces d’exemple calibrées à la main, sol déjà détouré — ou la photo de votre propre pièce.',
    },
    {
      num: '(02)',
      title: 'Essayez les parquets',
      text: 'Douze références, chacune avec son veinage et sa largeur de lame. Un clic, tout le sol change.',
    },
    {
      num: '(03)',
      title: 'Comparez',
      text: 'Enregistrez jusqu’à trois versions et regardez-les côte à côte, sur la même photo.',
    },
  ];

  const body = `      ${crumbs.html}
      <header class="landing-hero">
        <div class="wrap-wide landing-hero__grid">
          <div class="landing-hero__text">
            <p class="eyebrow">Visualiseur Parquet · outil gratuit</p>
            <h1 class="landing-hero__title">Visualisez votre parquet dans votre pièce.</h1>
            <p class="landing-hero__lead">Importez une photo, choisissez un parquet, comparez plusieurs rendus. Le calcul se fait dans votre navigateur : votre photo n’est ni envoyée, ni conservée.</p>
            <div class="landing-hero__actions">
              <a class="btn btn--lg" href="${STUDIO_URL}"><span>Visualiser mon parquet</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a>
              <a class="link-arrow" href="simulateur-pose.html">Étudier le sens de pose ${ICON.arrow}</a>
            </div>
            <ul class="landing-hero__facts">
              <li><b>12</b> parquets de démonstration</li>
              <li><b>3</b> motifs</li>
              <li><b>0</b> envoi de photo</li>
            </ul>
          </div>
          <div class="landing-hero__demo">
            <div data-vz-preview data-room="sejour" data-base="../"></div>
          </div>
        </div>
      </header>

      <section class="section section--alt" aria-labelledby="how-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Comment ça marche</p>
              <h2 id="how-title">Trois gestes, aucun compte à créer.</h2>
            </div>
            <p class="lead">Le visualiseur s’ouvre dans une interface dédiée : la pièce occupe l’écran, le catalogue tient sur le côté, et le rendu change à chaque clic.</p>
          </div>
          <div class="grid grid--3">
            ${steps
              .map(
                (step, index) => `<div class="tool-card" data-reveal data-reveal-delay="${index * 70}">
              <p class="mono">${step.num}</p>
              <h3>${step.title}</h3>
              <p>${step.text}</p>
            </div>`
              )
              .join('\n            ')}
          </div>
          <p class="u-mt-6"><a class="btn btn--lg" href="${STUDIO_URL}"><span>Visualiser mon parquet</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</a></p>
        </div>
      </section>

      <section class="section" aria-labelledby="what-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Ce que fait l’outil</p>
              <h2 id="what-title">Un sol, pas un filtre.</h2>
            </div>
            <p class="lead">Le parquet est projeté sur le plan du sol, comme une seule surface continue : le motif se poursuit derrière les meubles au lieu de repartir de zéro de chaque côté.</p>
          </div>
          <ul class="steps-grid">
            <li><span class="steps-grid__num">01</span><strong>Perspective réelle</strong><span>Les lames du fond sont plus petites que celles du premier plan, comme sur une photo.</span></li>
            <li><span class="steps-grid__num">02</span><strong>Lumière conservée</strong><span>Les ombres et les zones éclairées de votre photo sont reportées sur le parquet.</span></li>
            <li><span class="steps-grid__num">03</span><strong>Objets devant le sol</strong><span>Meubles, tapis et plinthes restent visibles ; un pinceau permet de rattraper les bords.</span></li>
            <li><span class="steps-grid__num">04</span><strong>Comparaison honnête</strong><span>Les versions comparées partagent la même photo, le même cadrage et le même détourage.</span></li>
          </ul>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="faq-title">
        <div class="wrap-text">
          <h2 id="faq-title">Questions fréquentes</h2>
          ${faq(questions)}
          ${tip(
            '<p>Pour préparer une commande, passez en <a href="simulateur-pose.html">mode plan</a> : il donne la surface, les chutes estimées et le nombre de lames à partir des dimensions réelles de la pièce.</p>'
          )}
        </div>
      </section>

      <section class="section" aria-label="Lancer le visualiseur">
        <div class="wrap">
          <div class="cta-band" data-reveal>
            <div>
              <h2>Prêt à essayer ?</h2>
              <p>Le visualiseur s’ouvre directement sur le choix de la pièce. Aucune inscription, aucune photo envoyée.</p>
            </div>
            <div class="cta-band__actions">
              <a class="btn btn--light" href="${STUDIO_URL}">Visualiser mon parquet</a>
              <a class="btn btn--outline-light" href="../projet/">Décrire mon projet</a>
            </div>
          </div>
        </div>
      </section>`;

  write(
    'outils/visualiseur.html',
    layout({
      title: 'Visualiser un parquet dans sa pièce | Pose Parquet',
      description:
        'Essayez un parquet dans votre pièce : importez une photo ou choisissez une pièce d’exemple, testez douze parquets, trois motifs, et comparez jusqu’à trois rendus. Gratuit, sans envoi de photo.',
      path: 'outils/visualiseur.html',
      depth: 1,
      css: ['css/pages/tools.css'],
      jsonld: [
        crumbs.jsonld,
        faqJsonLd(questions),
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Visualiseur Parquet — Pose Parquet',
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Navigateur web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          url: `${SITE.domain}/outils/studio.html`,
        },
      ],
      body,
    })
  );
}

module.exports = { buildVisualiseurPage, buildStudioPage };
