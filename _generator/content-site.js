/**
 * « Mon site » : ce que WordPress règle pour tout le site (Pose Parquet →
 * Mon site). Identité, en-tête, pied de page, liens commerciaux.
 *
 * Ce fichier est la SOURCE du formulaire : le schéma part dans WordPress à
 * l'import (`node _generator/exporter-wordpress.js`, puis
 * `tools/importer-champs.php`), qui ne fait que le remplir. Les valeurs
 * reviennent par l'export (`node _generator/wordpress.js pull`) et remplacent
 * les valeurs par défaut ci-dessous (wordpress.js → appliquer).
 *
 * Ce qui ne se règle PAS ici, volontairement : les adresses de la navigation
 * et des pages (elles suivent l'arborescence du site), l'ordre des liens, la
 * mise en page. On choisit ce qui s'affiche et sous quel libellé.
 *
 * Types : voir textes.js. `oui-non` : afficher ou non. `image` : une image de
 * la médiathèque (aucune = le symbole du site).
 */
const { defauts } = require('./textes');

const nav = (cle, libelle, groupe) => [
  { cle: `nav_${cle}`, groupe, libelle: `${libelle} : libellé`, type: 'texte', max: 30, defaut: libelle },
  { cle: `nav_${cle}_afficher`, groupe, libelle: `${libelle} : afficher`, type: 'oui-non', defaut: true },
];

const pied = (cle, libelle) => [
  { cle: `pied_${cle}`, groupe: 'Pied de page — liens', libelle: `${libelle} : libellé`, type: 'texte', max: 40, defaut: libelle },
  { cle: `pied_${cle}_afficher`, groupe: 'Pied de page — liens', libelle: `${libelle} : afficher`, type: 'oui-non', defaut: true },
];

const SITE_CHAMPS = [
  /* Identité */
  { cle: 'nom', groupe: 'Identité', libelle: 'Nom du site', type: 'texte', max: 40, defaut: 'Pose Parquet', aide: 'Le premier mot est mis en valeur dans le logotype texte.' },
  { cle: 'baseline', groupe: 'Identité', libelle: 'Baseline', type: 'long', max: 160, defaut: 'Comprendre, préparer, visualiser et réussir la pose de son parquet.', aide: 'Description de l’organisation dans les données structurées.' },
  { cle: 'logo', groupe: 'Identité', libelle: 'Logo principal', type: 'image', defaut: 0, aide: 'Aucun : le symbole et le nom du site. Une image remplace les deux dans l’en-tête.' },
  { cle: 'favicon', groupe: 'Identité', libelle: 'Favicon', type: 'image', defaut: 0, aide: 'Aucun : les icônes générées depuis le symbole. Image carrée, PNG conseillé.' },

  /* En-tête */
  { cle: 'cta_projet', groupe: 'En-tête', libelle: 'Bouton « Votre projet » : libellé', type: 'texte', max: 30, defaut: 'Votre projet' },
  { cle: 'cta_projet_afficher', groupe: 'En-tête', libelle: 'Bouton « Votre projet » : afficher', type: 'oui-non', defaut: true },
  { cle: 'menu_cta_projet', groupe: 'En-tête', libelle: 'Menu mobile : bouton projet', type: 'texte', max: 40, defaut: 'Décrire mon projet' },
  { cle: 'menu_cta_visualiseur', groupe: 'En-tête', libelle: 'Menu mobile : bouton Visualiseur', type: 'texte', max: 40, defaut: 'Visualiser mon parquet' },
  { cle: 'menu_note', groupe: 'En-tête', libelle: 'Menu mobile : mention', type: 'texte', max: 60, defaut: 'Guides, motifs et outils' },
  ...nav('guides', 'Guides', 'Navigation'),
  ...nav('motifs', 'Motifs', 'Navigation'),
  ...nav('tutoriels', 'Tutoriels', 'Navigation'),
  ...nav('inspiration', 'Inspiration', 'Navigation'),
  ...nav('outils', 'Outils', 'Navigation'),
  ...nav('a_propos', 'À propos', 'Navigation (menu mobile)'),
  ...nav('contact', 'Contact', 'Navigation (menu mobile)'),

  /* Pied de page */
  { cle: 'pied_presentation', groupe: 'Pied de page', libelle: 'Texte de présentation', type: 'long', max: 160, defaut: 'Guides et outils pour réussir la pose de son parquet.' },
  { cle: 'pied_mention', groupe: 'Pied de page', libelle: 'Mention (après ©)', type: 'texte', max: 120, defaut: '2026 Pose Parquet — guides et outils pour préparer son projet.' },
  { cle: 'pied_premibel', groupe: 'Pied de page', libelle: 'Mention Premibel (après son nom)', type: 'texte', max: 120, defaut: 'pour les références de parquet' },
  { cle: 'pied_allure', groupe: 'Pied de page', libelle: 'Mention Allure Design (après son nom)', type: 'texte', max: 120, defaut: 'pour la pose et la rénovation en Île-de-France' },
  { cle: 'pied_orientation', groupe: 'Pied de page', libelle: 'Conclusion de la mention', type: 'texte', max: 120, defaut: 'Pose Parquet oriente selon le besoin.' },
  { cle: 'pied_liens_commerciaux', groupe: 'Pied de page', libelle: 'Lien « Nos liens commerciaux »', type: 'texte', max: 40, defaut: 'Nos liens commerciaux' },
  { cle: 'pied_credits', groupe: 'Pied de page', libelle: 'Crédits', type: 'texte', max: 120, defaut: 'Photographies sous licence Pexels' },
  { cle: 'pied_col_comprendre', groupe: 'Pied de page — liens', libelle: 'Colonne 1 : titre', type: 'texte', max: 30, defaut: 'Comprendre' },
  ...pied('guides', 'Guides'),
  ...pied('motifs', 'Motifs'),
  ...pied('tutoriels', 'Tutoriels'),
  { cle: 'pied_col_outils', groupe: 'Pied de page — liens', libelle: 'Colonne 2 : titre', type: 'texte', max: 30, defaut: 'Outils' },
  ...pied('studio', 'Visualiser ma pièce'),
  ...pied('plan', 'Mode Plan'),
  ...pied('inspiration', 'Inspiration'),
  { cle: 'pied_col_apropos', groupe: 'Pied de page — liens', libelle: 'Colonne 3 : titre', type: 'texte', max: 30, defaut: 'À propos' },
  ...pied('methode', 'Notre méthode'),
  ...pied('contact', 'Contact'),
  ...pied('projet', 'Votre projet'),

  /* Liens commerciaux */
  { cle: 'premibel_libelle', groupe: 'Liens commerciaux', libelle: 'Premibel : nom affiché', type: 'texte', max: 40, defaut: 'Premibel' },
  { cle: 'premibel_url', groupe: 'Liens commerciaux', libelle: 'Premibel : adresse générale', type: 'url', max: 200, defaut: 'https://www.premibel.fr/' },
  { cle: 'premibel_afficher', groupe: 'Liens commerciaux', libelle: 'Premibel : afficher', type: 'oui-non', defaut: true, aide: 'Non : plus de carte ni de lien vers Premibel sur l’accueil, À propos, la méthode et le pied de page.' },
  { cle: 'allure_libelle', groupe: 'Liens commerciaux', libelle: 'Allure Design : nom affiché', type: 'texte', max: 40, defaut: 'Allure Design' },
  { cle: 'allure_url', groupe: 'Liens commerciaux', libelle: 'Allure Design : adresse générale', type: 'url', max: 200, defaut: 'https://www.allure-design.com/' },
  { cle: 'allure_afficher', groupe: 'Liens commerciaux', libelle: 'Allure Design : afficher', type: 'oui-non', defaut: true, aide: 'Non : plus de carte ni de lien vers Allure Design sur l’accueil, À propos, la méthode et le pied de page.' },
];

/** Les valeurs en vigueur : par défaut celles-ci, remplacées par WordPress (wordpress.js). */
const REGLAGES = defauts(SITE_CHAMPS);

module.exports = { SITE_CHAMPS, REGLAGES };
