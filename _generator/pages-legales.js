const { PAGES } = require('./content-pages');
const { layout, breadcrumb, SITE } = require('./layout');
const T = require('./textes');


function entete(page, surtitre) {
  return `
      <header class="page-hero">
        <div class="wrap-wide page-hero__grid">
          <div>
            <p class="eyebrow">${T.texte(surtitre)}</p>
            <h1 class="page-hero__title">${T.texte(page.h1)}</h1>
          </div>
          <p class="page-hero__lead">${T.texte(page.chapo)}</p>
        </div>
      </header>`;
}


const section = (id, titre, contenu) => `
          <h2 id="${id}">${T.texte(titre)}</h2>
          ${contenu}`;


function fiche(lignes) {
  const pleines = lignes.filter(([, v]) => String(v || '').trim());
  return `<dl class="legal-fiche">
            ${pleines.map(([l, v]) => `<dt>${T.texte(l)}</dt><dd>${T.lignes(v).map(T.texte).join('<br />')}</dd>`).join('\n            ')}
          </dl>`;
}

const paragraphe = (v) => `<p>${T.texte(v)}</p>`;
const liste = (v) => `<ul>${T.lignes(v).map((l) => `<li>${T.texte(l)}</li>`).join('')}</ul>`;

function pageLegale(write, cle, surtitre, contenu) {
  const page = PAGES[cle];
  const dossier = page.adresse.replace(/^\/|\/$/g, '');
  const crumbs = breadcrumb('../', [{ label: 'Accueil', href: 'index.html' }, { label: page.nom }]);
  write(
    `${dossier}/index.html`,
    layout({
      title: page.titre,
      description: page.description,
      path: `${dossier}/index.html`,
      depth: 1,
      css: ['css/pages/article.css'],
      jsonld: [crumbs.jsonld],
      body: `      ${crumbs.html}${entete(page, surtitre)}

      <section class="section section--flush-top">
        <div class="wrap">
          <div class="prose legal">${contenu}
          </div>
        </div>
      </section>`,
    })
  );
}

function buildMentionsLegales(write) {
  const v = PAGES['mentions-legales'].valeurs;
  pageLegale(write, 'mentions-legales', 'Informations légales', [
    section('editeur', 'Éditeur du site', fiche([
      ['Raison sociale', v.editeur_nom],
      ['Forme juridique', v.editeur_forme],
      ['Siège', v.editeur_adresse],
      ['Immatriculation', v.editeur_siren],
      ['TVA intracommunautaire', v.editeur_tva],
      ['Email', v.editeur_email],
      ['Téléphone', v.editeur_tel],
      ['Directeur de la publication', v.directeur],
    ])),
    section('hebergement', 'Hébergement', fiche([
      ['Site public', v.heb_site_nom],
      ['Adresse', v.heb_site_adresse],
      ['Données (WordPress)', v.heb_wp_nom],
      ['Adresse', v.heb_wp_adresse],
    ])),
    section('propriete', 'Propriété intellectuelle', paragraphe(v.pi_texte)),
    section('credits', 'Crédits', `<p>${T.riche(v.credits)}</p>`),
    section('liens', 'Liens commerciaux', `<p>${T.lien(v.liens_texte, '../a-propos/#liens-commerciaux')}</p>`),
  ].join('\n'));
}

function buildConfidentialite(write) {
  const v = PAGES['confidentialite'].valeurs;
  pageLegale(write, 'confidentialite', 'Données personnelles', [
    section('responsable', 'Responsable du traitement', fiche([
      ['Responsable', v.responsable],
      ['Contact', v.contact_rgpd],
    ])),
    section('formulaire', 'Le formulaire « Mon projet »', [
      `<p>${T.riche(v.form_pas)}</p>`,
      '<h3>Données collectées</h3>',
      liste(v.form_donnees),
      '<h3>Pourquoi</h3>',
      paragraphe(v.form_finalite),
      '<h3>Base légale</h3>',
      paragraphe(v.form_base),
      '<h3>Qui y a accès</h3>',
      paragraphe(v.form_destinataires),
      '<h3>Durée de conservation</h3>',
      paragraphe(v.form_duree),
      '<h3>Protection contre les abus</h3>',
      paragraphe(v.form_securite),
    ].join('\n          ')),
    section('cookies', 'Cookies et stockage dans votre navigateur', [
      `<p>${T.riche(v.nav_resume)}</p>`,
      liste(v.nav_liste),
      paragraphe(v.nav_effacer),
    ].join('\n          ')),
    section('droits', 'Vos droits', [paragraphe(v.droits_texte), paragraphe(v.droits_cnil)].join('\n          ')),
  ].join('\n'));
}



function buildPlanDuSite(write, { GUIDES, TUTOS, MOTIFS, ARTICLES = [] }) {
  const lien = (href, label) => `<li><a href="../${href}">${T.texte(label)}</a></li>`;
  const rubriques = [
    ['Comprendre', [
      ['guides/', 'Tous les guides'],
      ...GUIDES.map((g) => [`guides/${g.slug}.html`, g.h1]),
    ]],
    ['Motifs de pose', [
      ['motifs/', 'Tous les motifs'],
      ...MOTIFS.map((m) => [`motifs/${m.slug}.html`, (PAGES[`motif-${m.slug}`] || {}).h1 || m.h1]),
    ]],
    ['Tutoriels', [
      ['tutoriels/', 'Tous les tutoriels'],
      ...TUTOS.map((t) => [`tutoriels/${t.slug}.html`, t.h1]),
    ]],
    ...(ARTICLES.length ? [['Blog', [['blog/', 'Tous les articles'], ...ARTICLES.map((a) => [`blog/${a.slug}.html`, a.h1])]]] : []),
    ['Outils', [
      ['outils/', 'Tous les outils'],
      ['outils/visualiseur.html', 'Visualiseur'],
      ['outils/studio.html', 'Studio (Visualiseur plein écran)'],
      ['outils/simulateur-pose.html', 'Mode Plan'],
      ['inspiration/', 'Inspiration'],
    ]],
    ['Pose Parquet', [
      ['', 'Accueil'],
      ['projet/', 'Décrire mon projet'],
      ['a-propos/', 'À propos'],
      ['a-propos/methode-editoriale.html', 'Notre méthode éditoriale'],
      ['contact/', 'Contact'],
      ['mentions-legales/', 'Mentions légales'],
      ['confidentialite/', 'Confidentialité et cookies'],
    ]],
  ];
  pageLegale(write, 'plan-du-site', 'Navigation', rubriques
    .map(([titre, liens]) => section(titre.toLowerCase().replace(/[^a-z]+/g, '-'), titre, `<ul>${liens.map(([h, l]) => lien(h, l)).join('')}</ul>`))
    .join('\n'));
}

function buildPagesLegales(write, listes) {
  buildMentionsLegales(write);
  buildConfidentialite(write);
  buildPlanDuSite(write, listes);
}

module.exports = { buildPagesLegales, SITE };
