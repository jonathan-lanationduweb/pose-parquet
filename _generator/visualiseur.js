/* Page du visualiseur de parquet (photo) + mode plan. */
const { SITE, layout, breadcrumb } = require('./layout');
const { faq, faqJsonLd, tip, key } = require('./ui');
const { ICON } = require('./home');

function buildVisualiseurPage(write) {
  const crumbs = breadcrumb('../', [
    { label: 'Accueil', href: 'index.html' },
    { label: 'Outils', href: 'outils/' },
    { label: 'Visualiser ma pièce' },
  ]);

  const questions = [
    {
      q: 'Comment la zone du sol est-elle détectée ?',
      a: "Elle ne l'est pas automatiquement : vous placez vous-même quatre points aux angles du sol. Ce choix est assumé — une détection automatique fiable demande un modèle de segmentation d'image, qui fera l'objet d'une prochaine version. La sélection manuelle donne un résultat plus juste qu'une fausse détection.",
    },
    {
      q: 'Ma photo est-elle envoyée quelque part ?',
      a: "Non. Elle est lue et traitée directement dans votre navigateur : aucun envoi vers un serveur, aucun stockage. Fermez l'onglet et il n'en reste rien.",
    },
    {
      q: 'Le rendu correspond-il exactement au produit posé ?',
      a: "Non. Les textures sont générées pour la démonstration : elles donnent la teinte, le motif, l'échelle et le sens de pose, pas l'aspect exact d'une référence commerciale. Le rendu sert à décider d'une direction, pas à valider une commande.",
    },
    {
      q: 'Pourquoi le parquet suit-il la perspective ?',
      a: "Les quatre points définissent un quadrilatère : on en déduit la transformation projective qui envoie le plan du sol sur l'image. Les lames proches paraissent donc plus grandes que celles du fond, et les ombres de la photo d'origine sont reportées sur la texture.",
    },
  ];

  const steps = [
    {
      num: '(01)',
      title: 'Choisissez une pièce',
      text: 'Six pièces d’exemple sont prêtes, ou importez une photo de votre propre pièce.',
    },
    {
      num: '(02)',
      title: 'Délimitez le sol',
      text: 'Quatre points, déplaçables à la souris, au doigt ou au clavier, encadrent la surface à couvrir.',
    },
    {
      num: '(03)',
      title: 'Essayez les parquets',
      text: 'Teinte, motif, sens de pose et largeur de lame : le rendu se recalcule immédiatement.',
    },
  ];

  const body = `      ${crumbs.html}
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">Visualiseur · outil</p>
            <h1 class="page-hero__title">Essayez le parquet dans votre pièce.</h1>
          </div>
          <div>
            <p class="page-hero__lead">Importez une photo ou choisissez une pièce d’exemple. Changez le parquet, le motif et le sens de pose en quelques secondes.</p>
            <div class="cluster u-mt-5">
              <button class="btn" type="button" data-vz-import><span>Importer ma pièce</span>${ICON.arrow.replace('<svg', '<svg class="btn__icon"')}</button>
              <a class="btn btn--ghost" href="#outil"><span>Essayer une pièce d’exemple</span></a>
            </div>
          </div>
        </div>
      </header>

      <section class="section section--flush-top" id="outil" aria-label="Outil de visualisation">
        <div class="wrap-wide">
          <div class="tool-tabs" data-tabs>
            <div class="tabs__list" role="tablist" aria-label="Mode de l’outil">
              <button class="tabs__tab" type="button" role="tab" id="tab-photo" aria-controls="panel-photo" aria-selected="true">Visualiser ma pièce</button>
              <button class="tabs__tab" type="button" role="tab" id="tab-plan" aria-controls="panel-plan" aria-selected="false">Mode plan</button>
            </div>

            <div class="tabs__panel" role="tabpanel" id="panel-photo" aria-labelledby="tab-photo">
              <div data-visualiseur-shell>
                <div data-visualiseur data-base="../"></div>
              </div>
              <p class="note-inline u-mt-5">${ICON.check.replace('<svg', '<svg width="18" height="18"')}<span>Photo traitée dans votre navigateur, sans aucun envoi. Textures de démonstration : elles donnent la teinte et le motif, pas l’aspect exact d’une référence.</span></p>
            </div>

            <div class="tabs__panel" role="tabpanel" id="panel-plan" aria-labelledby="tab-plan" hidden>
              <div class="plan-mode__head">
                <div>
                  <p class="eyebrow">Mode plan</p>
                  <h2>Étudiez le sens de pose, les dimensions et les chutes.</h2>
                </div>
                <p class="lead">Vue du dessus, à l’échelle : dimensions de la pièce, largeur de lame, fenêtre, entrée, teinte et motif. Les quantités affichées sont des estimations indicatives.</p>
              </div>
              <div data-visualizer data-base="../"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="how-title">
        <div class="wrap-wide">
          <div class="section-head section-head__row">
            <div>
              <p class="eyebrow">Comment ça marche</p>
              <h2 id="how-title">Trois gestes, aucun compte à créer.</h2>
            </div>
            <p class="lead">L’outil fonctionne entièrement dans le navigateur : rien n’est téléversé, rien n’est conservé.</p>
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
          ${key(
            '<ul><li>Sélection du sol manuelle et précise, pas de fausse détection automatique.</li><li>Perspective calculée à partir de vos quatre points.</li><li>Ombres et lumières de la photo reportées sur le parquet.</li></ul>'
          )}
        </div>
      </section>

      <section class="section" aria-labelledby="faq-title">
        <div class="wrap-text">
          <h2 id="faq-title">Questions fréquentes</h2>
          ${faq(questions)}
          ${tip(
            '<p>Pour préparer une commande, passez en <strong>mode plan</strong> : il donne la surface, les chutes estimées et le nombre de lames à partir des dimensions réelles de la pièce.</p>'
          )}
        </div>
      </section>`;

  write(
    'outils/visualiseur.html',
    layout({
      title: 'Visualiser un parquet dans sa pièce | Pose Parquet',
      description:
        'Testez un parquet dans votre pièce : importez une photo ou choisissez une pièce d’exemple, puis changez la teinte, le motif et le sens de pose. Rendu en perspective, gratuit et sans envoi de photo.',
      path: 'outils/visualiseur.html',
      depth: 1,
      css: ['css/pages/tools.css'],
      jsonld: [
        crumbs.jsonld,
        faqJsonLd(questions),
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Visualiseur de parquet',
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Navigateur web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          url: `${SITE.domain}/outils/visualiseur.html`,
        },
      ],
      body,
    })
  );
}

module.exports = { buildVisualiseurPage };
