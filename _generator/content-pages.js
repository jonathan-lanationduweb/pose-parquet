/**
 * Textes des pages du site : titre affiché (H1), chapô, SEO — et les blocs
 * éditoriaux de l'accueil, d'À propos, de la méthode et du contact, en
 * CHAMPS STRUCTURÉS (voir plus bas et textes.js).
 *
 * Valeurs par défaut, celles du dépôt. Quand un instantané WordPress existe
 * (data/wordpress/contenus.json), _generator/wordpress.js remplace ces valeurs
 * par celles saisies dans « Pose Parquet → Pages ». La structure des pages
 * (sections, grilles, composants) reste écrite dans build.js : on modifie des
 * textes, pas une mise en page.
 *
 * `h1` et `chapo` valent null pour l'accueil : son en-tête est une
 * composition (home.js), seul son SEO se règle ici.
 */
const PAGES = {
  "accueil": {
    "nom": "Accueil",
    "adresse": "/",
    "ordre": 0,
    "h1": null,
    "chapo": null,
    "titre": "Pose Parquet — Comprendre et réussir la pose de son parquet",
    "description": "Média pratique et boîte à outils sur la pose du parquet : guides, motifs, tutoriels, inspiration et un simulateur de sens de pose gratuit."
  },
  "a-propos": {
    "nom": "À propos",
    "adresse": "/a-propos/",
    "ordre": 1,
    "h1": "Un média pratique sur la pose du parquet",
    "chapo": "Pose Parquet documente ce qui se décide avant la première lame : le support, le sens, le motif, la méthode.",
    "titre": "À propos de Pose Parquet, média sur la pose du parquet",
    "description": "Pose Parquet aide à comprendre la pose du parquet, à préparer son projet et à trouver les références adaptées : guides, motifs, tutoriels et outils de visualisation."
  },
  "methode-editoriale": {
    "nom": "Notre méthode",
    "adresse": "/a-propos/methode-editoriale.html",
    "ordre": 2,
    "h1": "Notre méthode éditoriale",
    "chapo": "Comment les contenus de ce site sont écrits, vérifiés et corrigés — et ce que nous ne prétendons pas être.",
    "titre": "Notre méthode éditoriale | Pose Parquet",
    "description": "Comment les contenus de Pose Parquet sont écrits, vérifiés et corrigés : sources, limites assumées, liens commerciaux et politique de mise à jour."
  },
  "guides": {
    "nom": "Guides",
    "adresse": "/guides/",
    "ordre": 3,
    "h1": "Comprendre avant de poser",
    "chapo": "Des guides pratiques sur le choix du parquet, la préparation du support, le sens de pose, les motifs et les finitions. Écrits pour être utiles sur le chantier, pas pour remplir une page.",
    "titre": "Guides de pose du parquet : préparer et poser | Pose Parquet",
    "description": "Sens de pose, préparation du support, motifs, massif ou contrecollé, erreurs à éviter : des repères concrets pour réussir votre chantier."
  },
  "tutoriels": {
    "nom": "Tutoriels",
    "adresse": "/tutoriels/",
    "ordre": 4,
    "h1": "Le geste, étape par étape",
    "chapo": "Des déroulés de chantier détaillés, avec l'outillage nécessaire, les points de contrôle et les erreurs qui coûtent cher.",
    "titre": "Tutoriels de pose de parquet pas à pas | Pose Parquet",
    "description": "Tutoriels détaillés : poser un parquet flottant, coller un contrecollé, réussir son calepinage. Outillage, étapes et points de contrôle."
  },
  "inspiration": {
    "nom": "Inspiration",
    "adresse": "/inspiration/",
    "ordre": 5,
    "h1": "Des sols, des directions, des ambiances",
    "chapo": "Une sélection d’ambiances, classées par motif et par type de pièce : la légende donne le motif et la teinte que la photographie montre. Chaque pièce calibrée s’ouvre dans le Studio — sur cette photographie même — pour y essayer d’autres parquets.",
    "titre": "Inspiration parquet : motifs et ambiances | Pose Parquet",
    "description": "Galerie d'inspiration : pose droite, diagonale, Point de Hongrie et bâton rompu dans des séjours, chambres, cuisines et couloirs."
  },
  "outils": {
    "nom": "Outils",
    "adresse": "/outils/",
    "ordre": 6,
    "h1": "Une boîte à outils, pas une brochure",
    "chapo": "Deux outils disponibles, gratuits, sans inscription : voir un parquet dans sa pièce, puis comparer les sens de pose sur un plan à l’échelle.",
    "titre": "Outils parquet : simulateur et calculateurs | Pose Parquet",
    "description": "Les outils Pose Parquet : le Visualiseur pour voir un parquet dans sa pièce, le Mode Plan pour comparer les sens de pose, et les outils à venir."
  },
  "contact": {
    "nom": "Contact",
    "adresse": "/contact/",
    "ordre": 7,
    "h1": "Nous écrire",
    "chapo": "Une question sur un contenu, une erreur à corriger, ou un chantier à préparer : chaque demande a son chemin, et les retours de terrain sont bienvenus.",
    "titre": "Contact | Pose Parquet",
    "description": "Contacter l'équipe éditoriale de Pose Parquet : question, correction, proposition de contenu ou d'outil."
  }
};

/*
 * CHAMPS STRUCTURÉS — les blocs éditoriaux pilotés depuis WordPress.
 *
 * Chaque page déclare ici ce qui s'y modifie, groupe par groupe, dans l'ordre
 * où les sections apparaissent. WordPress affiche ces champs comme
 * formulaire (Pose Parquet → Pages), sans pouvoir ajouter, retirer ni
 * déplacer une section : la structure reste celle de build.js et home.js.
 * Pas de HTML libre : les types sont décrits dans textes.js.
 *
 * Les valeurs par défaut sont les textes publiés. `valeurs` est rempli au
 * chargement, puis remplacé par WordPress (wordpress.js → appliquer).
 */
const { defauts } = require('./textes');

const c = (groupe) => (cle, libelle, type, max, defaut, aide) => ({ cle, groupe, libelle, type, max, defaut, ...(aide ? { aide } : {}) });

const hero = c('En-tête (hero)');
const passerelle = c('Section passerelle (Premibel / Allure Design)');
const projet = c('Section projet (fin de page)');
PAGES['accueil'].champs = [
  hero('hero_eyebrow', 'Surtitre', 'texte', 60, 'Guides · Motifs · Outils'),
  hero('hero_titre', 'Titre', 'riche', 140, 'Un parquet bien posé commence *avant* la première lame.'),
  hero('hero_texte', 'Texte introductif', 'riche', 500, 'Guides, inspirations et outils pour choisir votre parquet, le voir chez vous et préparer votre projet. Pour les références, nous orientons vers **Premibel**. Pour la pose et la rénovation en Île-de-France, vers **Allure Design**.'),
  hero('hero_cta_guides', 'Bouton guides', 'texte', 40, 'Explorer les guides'),
  hero('hero_cta_visualiseur', 'Bouton Visualiseur', 'texte', 40, 'Visualiser mon parquet'),
  passerelle('passerelle_eyebrow', 'Surtitre', 'texte', 60, 'Après le choix'),
  passerelle('passerelle_titre', 'Titre', 'texte', 120, 'Du choix du parquet à sa réalisation.'),
  passerelle('passerelle_intro', 'Introduction', 'long', 300, 'Pose Parquet vous aide à définir votre besoin, puis vous oriente vers la bonne solution.'),
  passerelle('premibel_titre', 'Premibel : titre', 'texte', 80, 'Trouver votre parquet'),
  passerelle('premibel_texte', 'Premibel : texte', 'long', 300, 'Références, essences, teintes et motifs : le catalogue de parquets et le showroom de Premibel.'),
  passerelle('premibel_cta', 'Premibel : lien', 'texte', 40, 'Découvrir les parquets', 'Mène à l’adresse générale de Premibel (Mon site → Liens commerciaux).'),
  passerelle('allure_titre', 'Allure Design : titre', 'texte', 80, 'Faire poser ou rénover'),
  passerelle('allure_texte', 'Allure Design : texte', 'long', 300, 'Pose de parquet, rénovation intérieure et aménagement, à Paris et en Île-de-France.'),
  passerelle('allure_cta', 'Allure Design : lien', 'texte', 40, 'Préparer mon projet', 'Mène au formulaire projet, réglé sur la pose.'),
  passerelle('mixte', 'Besoin mixte', 'lien', 300, 'Besoin du parquet et de la pose ? [Décrivez votre projet] : nous vous orientons vers les solutions adaptées.', 'Le texte entre crochets devient le lien vers le formulaire projet (parquet + pose).'),
  projet('projet_eyebrow', 'Surtitre', 'texte', 60, 'Votre projet'),
  projet('projet_titre', 'Titre', 'texte', 120, 'Un projet à concrétiser ?'),
  projet('projet_texte', 'Texte', 'long', 400, 'Décrivez votre pièce, votre parquet et votre besoin. Pose Parquet qualifie votre demande et vous oriente, selon le projet, vers Premibel, Allure Design ou les deux.'),
  projet('projet_points', 'Points rassurants (un par ligne)', 'lignes', 600, ['Quatre étapes courtes, aucune coordonnée demandée.', '« Je ne sais pas » est une réponse valable partout.', 'Aucun démarchage : vos coordonnées servent uniquement à répondre.', 'L’orientation est relue et confirmée par une personne avant tout contact.'].join('\n')),
  projet('projet_cta', 'Bouton principal', 'texte', 40, 'Décrire mon projet'),
  projet('projet_cta2', 'Bouton secondaire', 'texte', 40, 'Visualiser mon parquet'),
];

const pres = c('Présentation de Pose Parquet');
const roles = c('Rôles : Pose Parquet, Premibel, Allure Design');
const liens = c('Liens commerciaux');
PAGES['a-propos'].champs = [
  pres('pres1_titre', 'Bloc 1 : titre', 'texte', 80, 'Pourquoi ce site'),
  pres('pres1_texte', 'Bloc 1 : texte', 'long', 1200, 'La documentation sur le parquet se partage entre catalogues commerciaux et notices techniques. Entre les deux, il manquait un endroit pour comprendre les décisions : pourquoi ce sens plutôt qu\'un autre, ce que change réellement un ragréage, ce qui distingue deux motifs en V.'),
  pres('pres2_titre', 'Bloc 2 : titre', 'texte', 80, 'Notre méthode'),
  pres('pres2_texte', 'Bloc 2 : texte', 'long', 1200, 'Chaque contenu part d\'une question concrète et se termine par une décision possible. Les chiffres cités correspondent aux pratiques courantes du métier et aux seuils usuels des documents techniques. Lorsqu\'un sujet dépend du produit, nous le disons plutôt que de généraliser.'),
  pres('pres2_lien', 'Bloc 2 : lien vers la méthode', 'texte', 80, 'Lire notre méthode éditoriale en détail'),
  pres('pres3_titre', 'Bloc 3 : titre', 'texte', 80, 'Des outils plutôt que des promesses'),
  pres('pres3_texte', 'Bloc 3 : texte', 'long', 1200, 'Le Visualiseur montre un parquet dans une photo de votre pièce ; le Mode Plan compare les sens de pose à l’échelle. L’objectif ne change pas : transformer une hésitation en visualisation, puis en décision.'),
  roles('roles_titre', 'Titre du tableau', 'texte', 80, 'Trois noms, trois métiers'),
  roles('pp_metier', 'Pose Parquet : métier', 'texte', 80, 'Éditorial et outils'),
  roles('pp_offre', 'Pose Parquet : ce qu’on y trouve', 'texte', 160, 'Guides, fiches motif, tutoriels, Visualiseur, Mode Plan'),
  roles('pp_zone', 'Pose Parquet : zone', 'texte', 80, 'Aucune : le site se lit partout'),
  roles('premibel_metier', 'Premibel : métier', 'texte', 80, 'Références de parquet'),
  roles('premibel_offre', 'Premibel : ce qu’on y trouve', 'texte', 160, 'Produits, fourniture, showroom'),
  roles('premibel_zone', 'Premibel : zone', 'texte', 80, 'Aucune limite : un parquet se livre'),
  roles('allure_metier', 'Allure Design : métier', 'texte', 80, 'Pose et rénovation intérieure'),
  roles('allure_offre', 'Allure Design : ce qu’on y trouve', 'texte', 160, 'Revêtements de sol, aménagement, second œuvre'),
  roles('allure_zone', 'Allure Design : zone', 'texte', 80, 'Paris et l’Île-de-France'),
  liens('liens_titre', 'Titre', 'texte', 80, 'Nos liens commerciaux'),
  liens('liens_intro', 'Introduction', 'long', 400, 'Ce site n\'héberge aucune publicité et ne vend rien. Il oriente en revanche, et nous préférons l\'écrire noir sur blanc que le laisser découvrir.'),
  liens('liens_note', 'Note sous le tableau', 'riche', 400, 'Nous ne décrivons aucun lien juridique entre ces trois noms, parce que nous n\'en avons pas à décrire : ce tableau dit ce que chacun *fait*, pas ce que chacun *est*.'),
];

const intro = c('Qui écrit, corrections');
const constr = c('Comment un contenu est construit');
const princ = c('Principes de vérification');
const refus = c('Ce que nous ne ferons pas');
const liensM = c('Liens commerciaux et sortants');
PAGES['methode-editoriale'].champs = [
  intro('qui_titre', 'Qui écrit : titre', 'texte', 80, 'Qui écrit'),
  intro('qui_texte', 'Qui écrit : texte', 'long', 800, 'La rédaction de Pose Parquet. Aucun nom d’expert, aucun titre ni certification mis en avant : ce serait prêter à nos textes une autorité que nous n’avons pas. Ce que nous revendiquons : la lecture des documents techniques de référence, et le souci de dire ce que nous ne savons pas.'),
  intro('corrections_titre', 'Corrections : titre', 'texte', 80, 'Corrections'),
  intro('corrections_texte', 'Corrections : texte', 'lien', 800, 'Chaque article porte sa date de publication et, le cas échéant, de mise à jour. Une erreur signalée est corrigée et la date modifiée. Pour en signaler une : la [page contact].', 'Le texte entre crochets devient le lien vers la page Contact.'),
  constr('construction_titre', 'Titre', 'texte', 120, 'Comment un contenu est construit'),
  constr('construction_intro', 'Introduction', 'long', 300, 'Quatre temps, toujours dans cet ordre. Un texte qui s\'arrête au deuxième n\'est pas publié.'),
  ...[
    ['Une question concrète', 'Celle que l\'on se pose réellement avant un chantier, pas celle qui se cherche bien.'],
    ['Les critères qui tranchent', 'Dans leur ordre d\'importance, et non tous mis sur le même plan.'],
    ['Les cas où la réponse change', 'Support, produit, configuration de la pièce : ce qui renverse le conseil.'],
    ['Une décision possible', 'À la fin, jamais une simple liste d\'options renvoyée au lecteur.'],
  ].flatMap(([t, x], i) => [
    constr(`etape${i + 1}_titre`, `Étape ${i + 1} : titre`, 'texte', 80, t),
    constr(`etape${i + 1}_texte`, `Étape ${i + 1} : texte`, 'long', 300, x),
  ]),
  princ('principes_titre', 'Titre', 'texte', 120, 'Ce que nous vérifions, et comment'),
  princ('principes_intro', 'Introduction', 'long', 300, 'Quatre engagements, chacun avec ce qu’il veut dire concrètement sur une page du site.'),
  ...[
    ['Les seuils viennent des textes de référence', 'Planéité, humidité, chutes, jeux périphériques : confrontés aux NF DTU de la série 51 et aux pratiques du métier.', 'Quand une valeur dépend du produit, la page le dit au lieu de donner un chiffre unique.'],
    ['Les outils donnent des ordres de grandeur', 'Surface, lames et chutes sont calculées par des règles simples, et présentées comme telles.', 'Le Mode Plan affiche « estimation » à côté de chaque quantité : il ne remplace pas un calepinage.'],
    ['Une source citée a été consultée', 'Les références en bas d’article sont réelles : AFNOR pour les NF DTU, CSTB, FCBA.', 'Nous renvoyons à la norme ; nous n’en recopions pas le texte, protégé et payant.'],
    ['Une image montre ce que la page annonce', 'Photographies Pexels sous licence, schémas faits par nos soins, rendus du Visualiseur signalés comme simulations.', 'Sans image juste, la page s’en passe plutôt que d’illustrer un autre geste. Crédits dans `assets/images/CREDITS.md`.'],
  ].flatMap(([t, x, e], i) => [
    princ(`principe${i + 1}_titre`, `Principe ${i + 1} : titre`, 'texte', 120, t),
    princ(`principe${i + 1}_texte`, `Principe ${i + 1} : texte`, 'long', 400, x),
    princ(`principe${i + 1}_exemple`, `Principe ${i + 1} : exemple`, 'riche', 400, e),
  ]),
  refus('refus_titre', 'Titre', 'texte', 80, 'Quatre choses que nous ne ferons pas'),
  refus('refus', 'Liste (une par ligne)', 'lignes', 1000, ['Tester des produits ou publier des comparatifs de marques.', 'Inventer des témoignages, des avis d\'artisans ou des retours de chantier.', 'Reproduire le texte des normes : elles sont payantes et protégées. Nous y renvoyons.', 'Annoncer une fonctionnalité automatique ou « intelligente » qui n\'existe pas réellement dans nos outils.'].join('\n')),
  liensM('liens_titre', 'Titre', 'texte', 120, 'Liens commerciaux et liens sortants'),
  liensM('liens_intro', 'Introduction', 'long', 400, 'Le site n\'affiche aucune publicité et ne vend rien. Il comporte en revanche trois sortes de liens, et la distinction mérite d\'être faite plutôt que gommée.'),
];

const route = (n, nom) => c(`Contact ${n} : ${nom}`);
const r1 = route(1, 'question éditoriale');
const r2 = route(2, 'correction');
const r3 = route(3, 'projet');
PAGES['contact'].champs = [
  c('Adresse publique')('email_public', 'Adresse email publique', 'email', 120, 'bonjour@pose-parquet.com', 'Affichée et utilisée par les liens « écrire » des deux premiers contacts.'),
  r1('r1_eyebrow', 'Surtitre', 'texte', 60, 'Question éditoriale'),
  r1('r1_titre', 'Titre', 'texte', 120, 'Une question sur un guide, un motif, un outil'),
  r1('r1_texte', 'Texte', 'long', 300, 'Un point mal expliqué, un cas qui n’est pas traité, une idée de contenu.'),
  r2('r2_eyebrow', 'Surtitre', 'texte', 60, 'Correction'),
  r2('r2_titre', 'Titre', 'texte', 120, 'Une erreur à signaler'),
  r2('r2_texte', 'Texte', 'long', 300, 'Un seuil, une source, une image qui ne montre pas ce que la page annonce : indiquez l’adresse de la page.'),
  r2('r2_lien', 'Lien', 'texte', 40, 'Signaler une erreur'),
  r3('r3_eyebrow', 'Surtitre', 'texte', 60, 'Projet, devis, parquet'),
  r3('r3_titre', 'Titre', 'texte', 120, 'Un chantier à préparer'),
  r3('r3_texte', 'Texte', 'long', 400, 'Pour une référence de parquet ou une pose, le formulaire est plus rapide qu’un courriel : il pose les bonnes questions et oriente selon votre besoin et votre département.'),
  r3('r3_cta', 'Bouton projet', 'texte', 40, 'Décrire mon projet'),
];

for (const page of Object.values(PAGES)) {
  if (page.champs) page.valeurs = defauts(page.champs);
}

module.exports = { PAGES };

