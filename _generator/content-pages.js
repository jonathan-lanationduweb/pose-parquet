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
    "description": "Pose Parquet aide à comprendre la pose du parquet et à préparer son projet : guides, motifs, tutoriels et outils de visualisation gratuits."
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
    "h1": "Guides de pose de parquet : comprendre avant de poser",
    "chapo": "Choix du parquet, préparation du support, sens de pose, motifs et finitions. {Guides_lettres} guides écrits pour être utiles sur le chantier, pas pour remplir une page — chacun se lit en moins de dix minutes.",
    "titre": "Guides de pose du parquet : préparer et poser | Pose Parquet",
    "description": "Sens de pose, préparation du support, motifs, massif ou contrecollé, erreurs à éviter : des repères concrets pour réussir votre chantier."
  },
  "tutoriels": {
    "nom": "Tutoriels",
    "adresse": "/tutoriels/",
    "ordre": 4,
    "h1": "Poser son parquet soi-même : le geste, étape par étape",
    "chapo": "Des déroulés de chantier détaillés : l'outillage nécessaire, les étapes dans l'ordre, les points de contrôle et les erreurs qui coûtent cher. De la pose flottante à la pose collée.",
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
    "titre": "Contacter Pose Parquet : question ou correction",
    "description": "Contacter l'équipe éditoriale de Pose Parquet : question, correction, proposition de contenu ou d'outil."
  },
  /*
   * Pages dont le SEO était écrit en dur dans le générateur. Les valeurs par
   * défaut sont les textes publiés jusqu'ici, à l'identique : rien ne change
   * sur le site tant que personne ne les modifie dans WordPress.
   * `h1` / `chapo` à null : l'en-tête est une composition (outil plein écran),
   * seul son SEO se règle ici.
   */
  "motifs": {
    "nom": "Motifs",
    "adresse": "/motifs/",
    "ordre": 8,
    "h1": "Six motifs de pose de parquet, six façons de dessiner un sol",
    "chapo": "Le motif décide du caractère de la pièce autant que l'essence du bois. Chaque fiche détaille le rendu, les contraintes de pose, le niveau de chutes attendu — un ordre de grandeur, jamais un calcul — et les pièces adaptées.",
    "titre": "Motifs de pose du parquet : lesquels choisir | Pose Parquet",
    "description": "Pose droite, dans la longueur, dans la largeur, diagonale, Point de Hongrie, bâton rompu : rendu, chutes, difficulté et pièces adaptées pour chaque motif."
  },
  "visualiseur": {
    "nom": "Visualiseur (présentation)",
    "adresse": "/outils/visualiseur.html",
    "ordre": 9,
    "h1": "Visualisez votre parquet dans votre pièce.",
    "chapo": null,
    "titre": "Visualiser un parquet dans sa pièce | Pose Parquet",
    "description": "Essayez un parquet dans votre pièce : importez une photo, choisissez une matière et un motif. Tout se calcule dans votre navigateur, rien n’est envoyé."
  },
  "studio": {
    "nom": "Studio (Visualiseur plein écran)",
    "adresse": "/outils/studio.html",
    "ordre": 10,
    "h1": null,
    "chapo": null,
    "titre": "Visualiseur Parquet · Pose Parquet",
    "description": "Visualiseur Parquet : choisissez une pièce, essayez des parquets, comparez jusqu’à trois rendus. Tout est calculé dans votre navigateur."
  },
  "simulateur": {
    "nom": "Mode Plan (simulateur)",
    "adresse": "/outils/simulateur-pose.html",
    "ordre": 11,
    "h1": "Une pièce. Plusieurs directions.",
    "chapo": "Vue du dessus, à l'échelle : renseignez vos dimensions, placez la fenêtre et l'entrée, comparez les motifs. Les quantités affichées sont des estimations indicatives.",
    "titre": "Simulateur de sens de pose du parquet | Pose Parquet",
    "description": "Simulateur gratuit : dessinez votre pièce, placez la fenêtre et comparez pose droite, largeur, diagonale, Point de Hongrie et bâton rompu en temps réel."
  },
  "projet": {
    "nom": "Mon projet (formulaire)",
    "adresse": "/projet/",
    "ordre": 12,
    "h1": "Décrivez votre projet",
    "chapo": "Quelques informations suffisent à comprendre un chantier : la pièce, le support, le rendu recherché et le délai.",
    "titre": "Décrire un projet de pose de parquet | Pose Parquet",
    "description": "Décrivez votre projet de parquet en quatre étapes et voyez vers qui vous tourner : Premibel pour le parquet, Allure Design pour la pose en Île-de-France."
  }
};

/*
 * Les six fiches motif : leur SEO, leur titre et leur chapô se règlent aussi
 * dans WordPress (le corps de la fiche reste celui du dépôt). Clé
 * « motif-<slug> », valeurs par défaut prises dans content-motifs.js.
 */
const { MOTIFS: FICHES_MOTIF } = require('./content-motifs');
FICHES_MOTIF.forEach((m, i) => {
  PAGES[`motif-${m.slug}`] = {
    nom: `Motif : ${m.h1}`,
    adresse: `/motifs/${m.slug}.html`,
    ordre: 20 + i,
    h1: m.h1,
    chapo: m.lead,
    titre: m.title,
    description: m.description,
  };
});

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
const pourquoi = c('Section « Pourquoi ce site »');
const passerelle = c('Section passerelle (Premibel / Allure Design)');
const projet = c('Section projet (fin de page)');
/* Dans les textes de l'accueil, {guides}, {motifs}, {parquets}, {motifs_outils}
   (ou {guides_lettres}, {motifs_lettres}, {motifs_outils_lettres}) sont
   remplacés au build par les nombres réels : aucun chiffre ne se périme. */
const NOMBRES = 'Nombres calculés : {guides}, {motifs}, {parquets}, {motifs_outils} — ou en lettres : {guides_lettres}, {motifs_lettres}, {motifs_outils_lettres}.';
PAGES['accueil'].champs = [
  hero('hero_eyebrow', 'Surtitre', 'texte', 60, 'Média indépendant sur la pose de parquet'),
  hero('hero_titre', 'Titre', 'riche', 140, 'Poser un parquet : tout se décide *avant* la première lame.'),
  hero('hero_texte', 'Texte introductif', 'riche', 500, 'Sens de pose, motif, support, massif ou contrecollé : {guides_lettres} guides pour trancher avant de commander. Puis un simulateur gratuit pour voir le rendu dans votre pièce, à partir d’une photo — qui ne quitte jamais votre navigateur.', NOMBRES),
  hero('hero_cta_visualiseur', 'Bouton principal (simulateur)', 'texte', 60, 'Essayer le simulateur — gratuit'),
  hero('hero_cta_guides', 'Bouton secondaire (guides)', 'texte', 60, 'Lire les {guides} guides', NOMBRES),
  hero('hero_orientation', 'Ligne d’orientation', 'riche', 300, 'Nous orientons vers **Premibel** pour les références et **Allure Design** pour la pose en Île-de-France. [Pourquoi ?]', 'Le texte entre crochets devient le lien vers « Nos liens commerciaux » (À propos).'),
  pourquoi('pourquoi_eyebrow', 'Surtitre', 'texte', 60, 'Pourquoi ce site'),
  pourquoi('pourquoi_titre', 'Titre', 'texte', 120, 'Un parquet, ça se répare mal.'),
  pourquoi('pourquoi_texte1', 'Paragraphe 1', 'long', 800, 'Huit erreurs reviennent en boucle sur les chantiers de parquet. Toutes se corrigent avant la pose, aucune après. Un sens de lame mal choisi, un support mal préparé, un calepinage approximatif : des décisions de quelques minutes qui se regardent pendant quinze ans.'),
  pourquoi('pourquoi_texte2', 'Paragraphe 2', 'long', 1000, 'Pose Parquet est un média indépendant français consacré à la pose de parquet. Le site publie des guides, des fiches de motifs et des tutoriels, et met à disposition un simulateur gratuit permettant de visualiser un parquet dans sa propre pièce. Pose Parquet ne vend pas de parquet et n’en pose pas : il oriente vers Premibel pour les références et vers Allure Design pour la pose en Île-de-France, et perçoit une rémunération à ce titre.'),
  pourquoi('pourquoi_lien', 'Lien vers la méthode', 'texte', 60, 'Notre méthode éditoriale'),
  passerelle('passerelle_eyebrow', 'Surtitre', 'texte', 60, 'Après le choix'),
  passerelle('passerelle_titre', 'Titre', 'texte', 120, 'Où acheter son parquet, et qui peut le poser.'),
  passerelle('passerelle_intro', 'Introduction', 'long', 300, 'Nous ne vendons pas de parquet et nous n’en posons pas. Nous vous aidons à savoir ce qu’il vous faut, puis nous vous adressons à ceux qui le font.'),
  passerelle('premibel_titre', 'Premibel : étiquette', 'texte', 80, 'Trouver votre parquet'),
  passerelle('premibel_sous_titre', 'Premibel : titre', 'texte', 100, 'Références, essences, teintes et motifs'),
  passerelle('premibel_texte', 'Premibel : texte', 'long', 300, 'Le catalogue de parquets et le showroom de Premibel, notre partenaire pour les références produit.'),
  passerelle('premibel_cta', 'Premibel : lien', 'texte', 40, 'Voir le catalogue Premibel', 'Mène à l’adresse générale de Premibel (Mon site → Liens commerciaux).'),
  passerelle('allure_titre', 'Allure Design : étiquette', 'texte', 80, 'Faire poser ou rénover'),
  passerelle('allure_sous_titre', 'Allure Design : titre', 'texte', 100, 'Pose de parquet à Paris et en Île-de-France'),
  passerelle('allure_texte', 'Allure Design : texte', 'long', 300, 'Pose de parquet, rénovation intérieure et aménagement par Allure Design, notre partenaire pose en Île-de-France.'),
  passerelle('allure_cta', 'Allure Design : lien', 'texte', 40, 'Décrire mon projet de pose', 'Mène au formulaire projet, réglé sur la pose.'),
  passerelle('mixte', 'Besoin mixte', 'lien', 300, 'Besoin du parquet et de la pose ? [Décrivez votre projet] : nous vous orientons vers les deux.', 'Le texte entre crochets devient le lien vers le formulaire projet (parquet + pose).'),
  projet('projet_eyebrow', 'Surtitre', 'texte', 60, 'Votre projet'),
  projet('projet_titre', 'Titre', 'texte', 120, 'Faire poser son parquet : décrivez votre projet en 4 étapes.'),
  projet('projet_texte', 'Texte', 'long', 400, 'Quatre questions courtes sur votre pièce, votre support et votre besoin. Aucune coordonnée demandée. À la fin, vous repartez avec une fiche projet claire — surface, support, motif, contraintes.'),
  projet('projet_points', 'Points rassurants (un par ligne)', 'lignes', 600, ['Quatre étapes courtes, aucune coordonnée demandée.', '« Je ne sais pas » est une réponse valable partout.', 'Votre projet est qualifié selon votre besoin et votre localisation.', 'Vous repartez avec une fiche projet exploitable, même si vous faites poser ailleurs.'].join('\n')),
  projet('projet_cta', 'Bouton principal', 'texte', 60, 'Décrire mon projet — 4 min, sans coordonnées'),
  projet('projet_cta2', 'Bouton secondaire', 'texte', 40, 'Essayer le simulateur'),
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

/*
 * PAGES LÉGALES.
 *
 * Les informations que seul l'éditeur connaît (raison sociale, SIREN,
 * adresse, directeur de la publication, hébergeur du WordPress, durée de
 * conservation) sont livrées avec la valeur A_COMPLETER : rien n'est inventé.
 * Tant qu'il en reste une, la validation de publication le signale, et
 * REFUSE la publication en production (valider-wordpress.js) : le site ne
 * peut pas partir en ligne avec des mentions légales incomplètes.
 *
 * Les textes par défaut décrivent ce que fait réellement le site (vérifié
 * dans le code au 05/11/2026) : aucun cookie de mesure ni de publicité,
 * aucun script tiers, un formulaire sans coordonnées. Ce sont des modèles à
 * faire relire : ils ne remplacent pas un conseil juridique.
 */
const A_COMPLETER = '[À compléter]';
PAGES['mentions-legales'] = {
  nom: 'Mentions légales',
  adresse: '/mentions-legales/',
  ordre: 30,
  h1: 'Mentions légales',
  chapo: 'Qui édite ce site, qui l’héberge, et à qui appartiennent ses contenus.',
  titre: 'Mentions légales | Pose Parquet',
  description: 'Mentions légales du site Pose Parquet : éditeur, directeur de la publication, hébergement, propriété intellectuelle et crédits.',
};
const ed = c('Éditeur du site');
const heb = c('Hébergement');
const pi = c('Propriété intellectuelle et crédits');
PAGES['mentions-legales'].champs = [
  ed('editeur_nom', 'Raison sociale (ou nom)', 'texte', 120, A_COMPLETER),
  ed('editeur_forme', 'Forme juridique et capital', 'texte', 160, A_COMPLETER, 'Ex. : SAS au capital de 1 000 €. Entrepreneur individuel : « Entrepreneur individuel ».'),
  ed('editeur_adresse', 'Adresse du siège', 'lignes', 300, A_COMPLETER, 'Une ligne par ligne d’adresse.'),
  ed('editeur_siren', 'SIREN / RCS', 'texte', 120, A_COMPLETER, 'Ex. : RCS Paris 123 456 789.'),
  ed('editeur_tva', 'N° de TVA intracommunautaire', 'texte', 60, '', 'Facultatif : laisser vide si non concerné.'),
  ed('editeur_email', 'Email de contact', 'texte', 120, A_COMPLETER),
  ed('editeur_tel', 'Téléphone', 'texte', 40, '', 'Facultatif.'),
  ed('directeur', 'Directeur de la publication', 'texte', 120, A_COMPLETER, 'La personne responsable des contenus publiés.'),
  heb('heb_site_nom', 'Hébergeur du site public', 'texte', 120, 'GitHub, Inc. (GitHub Pages)'),
  heb('heb_site_adresse', 'Adresse de l’hébergeur du site', 'lignes', 300, '88 Colin P. Kelly Jr. Street\nSan Francisco, CA 94107\nÉtats-Unis'),
  heb('heb_wp_nom', 'Hébergeur des données (WordPress)', 'texte', 120, A_COMPLETER, 'Là où sont stockées les demandes du formulaire projet.'),
  heb('heb_wp_adresse', 'Adresse de cet hébergeur', 'lignes', 300, A_COMPLETER),
  pi('pi_texte', 'Propriété intellectuelle', 'long', 1200, 'Les textes, schémas, outils et la mise en page de ce site sont protégés par le droit d’auteur. Toute reproduction, même partielle, sans autorisation écrite de l’éditeur est interdite, à l’exception des courtes citations accompagnées de leur source.'),
  pi('credits', 'Crédits photographiques', 'riche', 600, 'Photographies : **Pexels**, sous la licence Pexels. Schémas et rendus du Visualiseur : réalisés par Pose Parquet ; les rendus sont des simulations, présentées comme telles.'),
  pi('liens_texte', 'Liens commerciaux', 'lien', 600, 'Ce site oriente vers Premibel (références de parquet) et Allure Design (pose et rénovation en Île-de-France). Ces liens sont expliqués sur la page [À propos].', 'Le texte entre crochets devient le lien vers À propos.'),
];

PAGES['confidentialite'] = {
  nom: 'Confidentialité et cookies',
  adresse: '/confidentialite/',
  ordre: 31,
  h1: 'Confidentialité et cookies',
  chapo: 'Ce que ce site enregistre, pourquoi, combien de temps, et vos droits. En bref : pas de cookie de mesure ni de publicité, et un formulaire qui ne demande ni nom, ni email, ni téléphone.',
  titre: 'Confidentialité et cookies | Pose Parquet',
  description: 'Données personnelles et cookies sur Pose Parquet : formulaire sans coordonnées, aucun cookie publicitaire ni de mesure d’audience, vos droits RGPD.',
};
const resp = c('Responsable du traitement');
const form = c('Le formulaire « Mon projet »');
const nav = c('Cookies et stockage dans votre navigateur');
const droits = c('Vos droits');
PAGES['confidentialite'].champs = [
  resp('responsable', 'Responsable du traitement', 'texte', 160, A_COMPLETER, 'En général, l’éditeur du site (voir Mentions légales).'),
  resp('contact_rgpd', 'Contact pour vos données', 'texte', 120, A_COMPLETER, 'Une adresse email qui répond aux demandes RGPD.'),
  form('form_donnees', 'Données collectées', 'lignes', 1200, [
    'Le département du projet, pour savoir qui peut intervenir.',
    'Le type de logement, la pièce, la surface et le support existant.',
    'Le type de parquet, le sens de pose et le style recherchés.',
    'Votre besoin (parquet, pose, rénovation…) et votre délai.',
    'Le cas échéant, la configuration préparée dans le Visualiseur (pièce, parquet, motif) — jamais votre photo, qui ne quitte pas votre navigateur.',
    'La page par laquelle vous êtes arrivé sur le site et son origine (lien, campagne).',
  ].join('\n')),
  form('form_pas', 'Ce qui n’est pas demandé', 'riche', 400, 'Le formulaire ne demande **ni nom, ni email, ni téléphone**.'),
  form('form_finalite', 'Pourquoi', 'long', 600, 'Ces réponses servent à comprendre votre projet et à vous orienter vers la bonne solution : Premibel pour le choix du parquet, Allure Design pour la pose en Île-de-France. Elles permettent aussi de mesurer, sans vous identifier, d’où viennent les demandes.'),
  form('form_base', 'Base légale', 'long', 400, 'L’intérêt légitime de l’éditeur à comprendre et orienter les demandes qui lui sont adressées.'),
  form('form_destinataires', 'Qui y a accès', 'long', 600, 'Les réponses sont enregistrées sur le serveur de l’éditeur et consultées par son équipe. Elles ne sont ni vendues, ni transmises automatiquement à Premibel ou à Allure Design : c’est vous qui choisissez de les contacter, depuis l’écran de fin.'),
  form('form_duree', 'Durée de conservation', 'texte', 200, A_COMPLETER, 'Ex. : « 3 ans à compter de la demande ».'),
  form('form_securite', 'Protection contre les abus', 'long', 600, 'Pour limiter les envois automatisés, votre adresse IP est transformée en empreinte non réversible, conservée quelques heures au plus. Elle n’est jamais enregistrée en clair avec votre demande.'),
  nav('nav_resume', 'En résumé', 'riche', 400, 'Ce site ne dépose **aucun cookie de mesure d’audience ni de publicité** et ne charge aucun service tiers. Il n’affiche donc pas de bandeau de consentement : il n’a rien à vous demander.'),
  nav('nav_liste', 'Ce qui est enregistré dans votre navigateur', 'lignes', 1200, [
    'Visualiseur et Mode Plan : vos derniers réglages (pièce, parquet, motif, dimensions), pour les retrouver à votre prochaine visite. Rien n’est envoyé.',
    'Origine de la visite : la page d’arrivée et l’éventuelle campagne, le temps de votre visite seulement (effacées à la fermeture de l’onglet).',
    'Aperçu en maintenance : un cookie technique, uniquement si vous utilisez le lien d’aperçu pendant une maintenance.',
  ].join('\n')),
  nav('nav_effacer', 'Les effacer', 'long', 400, 'Ces éléments s’effacent depuis les réglages de votre navigateur (données de site). Le site continue de fonctionner sans eux.'),
  droits('droits_texte', 'Vos droits', 'long', 800, 'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition sur les données qui vous concernent. Le formulaire ne recueillant ni nom ni email, indiquez la référence de votre demande (affichée à la fin du formulaire) pour que nous la retrouvions.'),
  droits('droits_cnil', 'Réclamation', 'long', 400, 'Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).'),
];

PAGES['blog'] = {
  nom: 'Blog',
  adresse: '/blog/',
  ordre: 13,
  h1: 'Le blog',
  chapo: 'Actualités, retours de chantier et réponses aux questions qui reviennent souvent.',
  titre: 'Blog : actualités et conseils parquet | Pose Parquet',
  description: 'Les articles de Pose Parquet : actualités, retours de chantier et conseils pratiques pour choisir et poser son parquet.',
};

PAGES['plan-du-site'] = {
  nom: 'Plan du site',
  adresse: '/plan-du-site/',
  ordre: 32,
  h1: 'Plan du site',
  chapo: 'Toutes les pages de Pose Parquet, rubrique par rubrique.',
  titre: 'Plan du site | Pose Parquet',
  description: 'Plan du site Pose Parquet : guides, motifs de pose, tutoriels, inspiration, outils et pages pratiques.',
};

for (const page of Object.values(PAGES)) {
  if (page.champs) page.valeurs = defauts(page.champs);
}

module.exports = { PAGES, A_COMPLETER };

