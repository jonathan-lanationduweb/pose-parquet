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



const { defauts } = require('./textes');

const c = (groupe) => (cle, libelle, type, max, defaut, aide) => ({ cle, groupe, libelle, type, max, defaut, ...(aide ? { aide } : {}) });

const hero = c('En-tête (hero)');
const pourquoi = c('Section « Pourquoi ce site »');
const passerelle = c('Section passerelle (Premibel / Allure Design)');
const projet = c('Section projet (fin de page)');


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

PAGES['accueil'].champs.push(
  {"cle": "hero_meta1", "groupe": "En-tête (hero)", "libelle": "Chiffre 1 : libellé", "type": "texte", "max": 200, "defaut": "motifs détaillés"},
  {"cle": "hero_meta2", "groupe": "En-tête (hero)", "libelle": "Chiffre 2 : libellé", "type": "texte", "max": 200, "defaut": "guides pratiques"},
  {"cle": "hero_meta3", "groupe": "En-tête (hero)", "libelle": "Chiffre 3 : libellé", "type": "texte", "max": 200, "defaut": "parquets à essayer"},
  {"cle": "hero_defiler", "groupe": "En-tête (hero)", "libelle": "Lien « Découvrir »", "type": "texte", "max": 200, "defaut": "Découvrir"},
  {"cle": "bandeau_mots", "groupe": "Bandeau défilant", "libelle": "Mots du bandeau", "type": "lignes", "max": 2000, "defaut": "Pose droite\nPoint de Hongrie\nBâton rompu\nDiagonale\nCalepinage\nPose collée\nPose flottante\nFrise périphérique\nRagréage\nSens de la lumière", "aide": "Un mot ou une expression par ligne."},
  {"cle": "simu_surtitre", "groupe": "Section Visualiseur", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Outil gratuit · aucune inscription"},
  {"cle": "simu_titre", "groupe": "Section Visualiseur", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Visualisez votre parquet chez vous, à partir d’une photo."},
  {"cle": "simu_texte", "groupe": "Section Visualiseur", "libelle": "Texte", "type": "long", "max": 1500, "defaut": "Importez une photo de votre pièce, choisissez parmi {parquets} références et comparez les motifs au curseur. {Motifs_lettres} motifs sont documentés sur le site, dont {motifs_outils_lettres} simulables dans nos outils. Le calcul se fait dans votre navigateur : votre photo n’est ni envoyée, ni stockée, ni analysée par un service tiers.", "aide": "Nombres calculés possibles : {guides}, {motifs}, {tutoriels}, {parquets}, {motifs_outils}, {motifs_studio} ; en lettres : {guides_lettres} ; avec majuscule : {Guides_lettres}."},
  {"cle": "simu_bouton", "groupe": "Section Visualiseur", "libelle": "Bouton", "type": "texte", "max": 200, "defaut": "Ouvrir le simulateur"},
  {"cle": "simu_lien_plan", "groupe": "Section Visualiseur", "libelle": "Lien Mode Plan", "type": "texte", "max": 200, "defaut": "Mode Plan : comparer les sens de pose"},
  {"cle": "simu_note", "groupe": "Section Visualiseur", "libelle": "Encadré", "type": "riche", "max": 800, "defaut": "**Votre photo reste sur votre appareil.** Contrairement aux simulateurs des fabricants, aucun envoi vers un serveur, aucun compte à créer, aucun catalogue imposé.", "aide": "Les mots entre **doubles astérisques** sont en gras."},
  {"cle": "decisions_surtitre", "groupe": "Section « Les quatre décisions »", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Par où commencer"},
  {"cle": "decisions_titre", "groupe": "Section « Les quatre décisions »", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Les quatre décisions à prendre avant de poser votre parquet."},
  {"cle": "decisions_intro", "groupe": "Section « Les quatre décisions »", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Elles se prennent dans cet ordre. Commencez par celle qui vous concerne aujourd’hui."},
  {"cle": "decision1_titre", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 1 : titre", "type": "texte", "max": 200, "defaut": "Comprendre la pose"},
  {"cle": "decision1_texte", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 1 : texte", "type": "long", "max": 1500, "defaut": "Support, sens de pose, massif ou contrecollé : ce qui se décide avant de commander."},
  {"cle": "decision2_titre", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 2 : titre", "type": "texte", "max": 200, "defaut": "Choisir son motif"},
  {"cle": "decision2_texte", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 2 : texte", "type": "long", "max": 1500, "defaut": "De la pose droite au point de Hongrie : le motif fait le caractère de la pièce."},
  {"cle": "decision3_titre", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 3 : titre", "type": "texte", "max": 200, "defaut": "Visualiser chez soi"},
  {"cle": "decision3_texte", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 3 : texte", "type": "long", "max": 1500, "defaut": "Votre photo, un parquet, un motif : le sol change à chaque clic."},
  {"cle": "decision4_titre", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 4 : titre", "type": "texte", "max": 200, "defaut": "Préparer son chantier"},
  {"cle": "decision4_texte", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 4 : texte", "type": "long", "max": 1500, "defaut": "Quatre étapes courtes pour cadrer la pièce, le support et le besoin."},
  {"cle": "decision4_mention", "groupe": "Section « Les quatre décisions »", "libelle": "Carte 4 : mention", "type": "texte", "max": 200, "defaut": "Sans engagement"},
  {"cle": "lecture_surtitre", "groupe": "Section Guides et tutoriels", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Guides et tutoriels"},
  {"cle": "lecture_titre", "groupe": "Section Guides et tutoriels", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Guides et tutoriels de pose de parquet."},
  {"cle": "lecture_intro", "groupe": "Section Guides et tutoriels", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Les guides tranchent les décisions d’achat. Les tutoriels déroulent le chantier, outillage et points de contrôle compris."},
  {"cle": "lecture_guides_titre", "groupe": "Section Guides et tutoriels", "libelle": "Colonne guides : titre", "type": "texte", "max": 200, "defaut": "Guides : décider avant de commander"},
  {"cle": "lecture_guides_lien", "groupe": "Section Guides et tutoriels", "libelle": "Colonne guides : lien", "type": "texte", "max": 200, "defaut": "Les {guides} guides", "aide": "Nombres calculés possibles : {guides}, {motifs}, {tutoriels}, {parquets}, {motifs_outils}, {motifs_studio} ; en lettres : {guides_lettres} ; avec majuscule : {Guides_lettres}."},
  {"cle": "lecture_tutos_titre", "groupe": "Section Guides et tutoriels", "libelle": "Colonne tutoriels : titre", "type": "texte", "max": 200, "defaut": "Tutoriels : poser soi-même, étape par étape"},
  {"cle": "lecture_tutos_lien", "groupe": "Section Guides et tutoriels", "libelle": "Colonne tutoriels : lien", "type": "texte", "max": 200, "defaut": "Tous les tutoriels"},
  {"cle": "lecture_note", "groupe": "Section Guides et tutoriels", "libelle": "Note sous les tutoriels", "type": "lien", "max": 600, "defaut": "Vous préférez confier la pose ? [Décrivez votre projet].", "aide": "Le texte entre crochets devient le lien."},
  {"cle": "focus1_titre", "groupe": "Section Focus motif", "libelle": "Point 1 : titre", "type": "texte", "max": 200, "defaut": "Une flèche continue"},
  {"cle": "focus1_texte", "groupe": "Section Focus motif", "libelle": "Point 1 : texte", "type": "long", "max": 1500, "defaut": "Les lames, coupées en biais à leurs extrémités, forment une pointe qui file vers le fond de la pièce et guide le regard."},
  {"cle": "focus2_titre", "groupe": "Section Focus motif", "libelle": "Point 2 : titre", "type": "texte", "max": 200, "defaut": "Un axe sans pardon"},
  {"cle": "focus2_texte", "groupe": "Section Focus motif", "libelle": "Point 2 : texte", "type": "long", "max": 1500, "defaut": "Tout se joue au traçage : un écart minime en début de pose se cumule et finit par se voir sur toute la longueur."},
  {"cle": "focus3_titre", "groupe": "Section Focus motif", "libelle": "Point 3 : titre", "type": "texte", "max": 200, "defaut": "Lames gauches et droites"},
  {"cle": "focus3_texte", "groupe": "Section Focus motif", "libelle": "Point 3 : texte", "type": "long", "max": 1500, "defaut": "Elles se commandent ensemble, en quantités égales, avec une marge de chutes plus large qu’une pose droite."},
  {"cle": "focus_surtitre", "groupe": "Section Focus motif", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Focus motif · 04"},
  {"cle": "focus_titre", "groupe": "Section Focus motif", "libelle": "Titre", "type": "lignes", "max": 2000, "defaut": "Le point de Hongrie,\nune flèche au sol.", "aide": "Chaque ligne passe à la ligne à l’écran."},
  {"cle": "focus_bouton", "groupe": "Section Focus motif", "libelle": "Bouton", "type": "texte", "max": 200, "defaut": "Le guide du point de Hongrie"},
  {"cle": "focus_lien", "groupe": "Section Focus motif", "libelle": "Lien vers les motifs", "type": "texte", "max": 200, "defaut": "Les {motifs} motifs de pose", "aide": "Nombres calculés possibles : {guides}, {motifs}, {tutoriels}, {parquets}, {motifs_outils}, {motifs_studio} ; en lettres : {guides_lettres} ; avec majuscule : {Guides_lettres}."},
  {"cle": "inspi_surtitre", "groupe": "Section Inspiration", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Inspiration"},
  {"cle": "inspi_titre", "groupe": "Section Inspiration", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Huit pièces, huit motifs de parquet en situation."},
  {"cle": "inspi_lien", "groupe": "Section Inspiration", "libelle": "Lien vers la page Inspiration", "type": "texte", "max": 200, "defaut": "Les 8 ambiances"},
  {"cle": "inspi_legendes", "groupe": "Section Inspiration", "libelle": "Légendes des photos (dans l’ordre)", "type": "lignes", "max": 2000, "defaut": "Séjour — Traversant, lames droites\nChambre — Point de Hongrie\nSalon — Pièce en angle, lames de noyer\nCuisine — Ouverte, lames larges\nChambre — Lames droites, chêne foncé\nCouloir — Point de Hongrie dans l’axe\nPièce à arcades — Bâton rompu\nEntrée — Lames dans l’axe", "aide": "Une ligne par photo : « Pièce — Description »."},
  {"cle": "faq_surtitre", "groupe": "Questions fréquentes", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Questions fréquentes"},
  {"cle": "faq_titre", "groupe": "Questions fréquentes", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Questions fréquentes sur la pose de parquet."},
  {"cle": "faq_intro", "groupe": "Questions fréquentes", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "{Questions_lettres} questions qui reviennent avant chaque chantier, et les réponses que nous donnons.", "aide": "{Questions_lettres} : le nombre de questions affichées, en lettres."},
  {"cle": "faq1_q", "groupe": "Questions fréquentes", "libelle": "Question 1", "type": "texte", "max": 200, "defaut": "Faut-il poser le parquet dans le sens de la lumière ou perpendiculairement à la fenêtre ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq1_r", "groupe": "Questions fréquentes", "libelle": "Réponse 1", "type": "long", "max": 1500, "defaut": "Les deux formulations décrivent le même geste, ce qui explique la confusion fréquente. Les rayons entrent perpendiculairement au plan de la fenêtre : poser « dans le sens de la lumière » revient donc à orienter les lames perpendiculairement au mur qui porte la fenêtre. Les joints filent alors dans l’axe des rayons et se remarquent beaucoup moins."},
  {"cle": "faq1_lien", "groupe": "Questions fréquentes", "libelle": "Question 1 : texte du lien", "type": "texte", "max": 200, "defaut": "Le guide complet du sens de pose", "aide": "Laisser vide pour retirer le lien."},
  {"cle": "faq2_q", "groupe": "Questions fréquentes", "libelle": "Question 2", "type": "texte", "max": 200, "defaut": "Dans quel sens poser un parquet dans un couloir ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq2_r", "groupe": "Questions fréquentes", "libelle": "Réponse 2", "type": "long", "max": 1500, "defaut": "Dans la longueur, parallèlement aux murs. Une pose en travers multiplie les coupes, hache visuellement le passage et raccourcit l’espace. C’est le seul cas courant où la géométrie prime sur la lumière : un couloir se pose dans son axe, même si la fenêtre se trouve à son extrémité."},
  {"cle": "faq3_q", "groupe": "Questions fréquentes", "libelle": "Question 3", "type": "texte", "max": 200, "defaut": "Quelle est la différence entre bâton rompu et point de Hongrie ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq3_r", "groupe": "Questions fréquentes", "libelle": "Réponse 3", "type": "long", "max": 1500, "defaut": "Le bâton rompu assemble des lames à bouts droits, posées perpendiculairement les unes aux autres : les extrémités se décalent et forment un zigzag. Le point de Hongrie utilise des lames coupées en biais qui se rejoignent bout à bout en une pointe continue. Il exige des lames gauches et droites, en quantités égales."},
  {"cle": "faq3_lien", "groupe": "Questions fréquentes", "libelle": "Question 3 : texte du lien", "type": "texte", "max": 200, "defaut": "Les {motifs} motifs de pose", "aide": "Laisser vide pour retirer le lien."},
  {"cle": "faq4_q", "groupe": "Questions fréquentes", "libelle": "Question 4", "type": "texte", "max": 200, "defaut": "Combien de chutes faut-il prévoir ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq4_r", "groupe": "Questions fréquentes", "libelle": "Réponse 4", "type": "long", "max": 1500, "defaut": "Comptez de l’ordre de 5 % en pose droite et 10 à 15 % en diagonale ou en point de Hongrie, ces motifs multipliant les coupes d’angle en périphérie. Prévoyez la marge au moment de la commande : un complément acheté plus tard peut provenir d’un autre bain de teinte."},
  {"cle": "faq5_q", "groupe": "Questions fréquentes", "libelle": "Question 5", "type": "texte", "max": 200, "defaut": "Peut-on poser du parquet sur du carrelage ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq5_r", "groupe": "Questions fréquentes", "libelle": "Réponse 5", "type": "long", "max": 1500, "defaut": "En pose flottante, c’est généralement possible si le carrelage est sain, adhérent et suffisamment plan. Contrôlez la planéité à la règle de deux mètres et vérifiez la hauteur disponible sous les portes et aux seuils : c’est le point qui bloque le plus souvent le projet, pas le support lui-même."},
  {"cle": "faq5_lien", "groupe": "Questions fréquentes", "libelle": "Question 5 : texte du lien", "type": "texte", "max": 200, "defaut": "Préparer son sol avant la pose", "aide": "Laisser vide pour retirer le lien."},
  {"cle": "faq6_q", "groupe": "Questions fréquentes", "libelle": "Question 6", "type": "texte", "max": 200, "defaut": "Le simulateur est-il vraiment gratuit, et ma photo est-elle envoyée quelque part ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq6_r", "groupe": "Questions fréquentes", "libelle": "Réponse 6", "type": "long", "max": 1500, "defaut": "Le simulateur est gratuit et ne demande aucune inscription. Votre photo n’est ni envoyée, ni stockée, ni analysée par un service tiers : le rendu est calculé dans votre navigateur, sur votre appareil. Vous disposez de {parquets} références et de {motifs_studio_lettres} motifs de pose, avec un comparateur avant / après.", "aide": "Nombres calculés possibles : {guides}, {motifs}, {tutoriels}, {parquets}, {motifs_outils}, {motifs_studio} ; en lettres : {guides_lettres} ; avec majuscule : {Guides_lettres}."},
  {"cle": "faq6_lien", "groupe": "Questions fréquentes", "libelle": "Question 6 : texte du lien", "type": "texte", "max": 200, "defaut": "Ouvrir le simulateur", "aide": "Laisser vide pour retirer le lien."},
);
PAGES['tutoriels'].champs = [
  {"cle": "accroche_flottant", "groupe": "Tutoriels mis en avant", "libelle": "Phrase : poser un parquet flottant", "type": "long", "max": 1500, "defaut": "Le tutoriel de référence : sous-couche, jeu de dilatation, coupes de périphérie et plinthes, avec les points de contrôle à chaque étape."},
  {"cle": "accroche_colle", "groupe": "Tutoriels mis en avant", "libelle": "Phrase : coller un parquet contrecollé", "type": "long", "max": 1500, "defaut": "La pose la plus stable et la plus silencieuse, compatible plancher chauffant."},
  {"cle": "accroche_calepinage", "groupe": "Tutoriels mis en avant", "libelle": "Phrase : réussir son calepinage", "type": "long", "max": 1500, "defaut": "Le traçage qui décide de tout : axes, coupes de rive, départ du motif."},
  {"cle": "surtitre", "groupe": "En-tête", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Tutoriels"},
  {"cle": "liste_titre", "groupe": "Tutoriels mis en avant", "libelle": "Titre de la liste (lu par Google et les lecteurs d’écran)", "type": "texte", "max": 200, "defaut": "Tous les tutoriels"},
  {"cle": "conseil", "groupe": "Conseil", "libelle": "Texte du conseil", "type": "lien", "max": 600, "defaut": "Avant de poser, vérifiez la planéité et l’humidité du support : c’est la cause de la plupart des désordres. Laissez aussi les lames s’acclimater dans la pièce, paquets fermés, 48 heures au minimum. [Préparer le support].", "aide": "Le texte entre crochets devient le lien."},
  {"cle": "choix_surtitre", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Par où commencer"},
  {"cle": "choix_titre", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Quel tutoriel pour quel chantier ?"},
  {"cle": "choix_intro", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Le choix se fait sur le support et sur le motif, pas sur le parquet. Trois situations couvrent la grande majorité des chantiers."},
  {"cle": "situation1_quand", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 1 : situation", "type": "texte", "max": 200, "defaut": "Sol neuf, ragréé ou carrelage sain"},
  {"cle": "situation1_titre", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 1 : titre", "type": "texte", "max": 200, "defaut": "Pose flottante", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "situation1_texte", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 1 : texte", "type": "long", "max": 1500, "defaut": "La plus rapide et la plus accessible. Les lames se clipsent sans adhérer au support : rien n’est définitif, et c’est la seule pose réaliste sans expérience."},
  {"cle": "situation2_quand", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 2 : situation", "type": "texte", "max": 200, "defaut": "Plancher chauffant, grande surface, confort acoustique"},
  {"cle": "situation2_titre", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 2 : titre", "type": "texte", "max": 200, "defaut": "Pose collée", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "situation2_texte", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 2 : texte", "type": "long", "max": 1500, "defaut": "Plus stable, plus silencieuse, sans jeu entre les lames et meilleure conductrice de chaleur. En contrepartie, elle ne pardonne aucune improvisation."},
  {"cle": "situation3_quand", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 3 : situation", "type": "texte", "max": 200, "defaut": "Point de Hongrie, bâton rompu ou diagonale"},
  {"cle": "situation3_titre", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 3 : titre", "type": "texte", "max": 200, "defaut": "Calepinage d’abord", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "situation3_texte", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Carte 3 : texte", "type": "long", "max": 1500, "defaut": "Un motif en V ou en biais se trace avant de se poser. Une heure de traçage évite deux jours de rattrapage, quel que soit le mode de pose retenu."},
  {"cle": "choix_note", "groupe": "Quel tutoriel pour quel chantier", "libelle": "Note sous les cartes", "type": "lien", "max": 600, "defaut": "Poser sur un carrelage existant est possible en pose flottante, si le support est sain, adhérent et suffisamment plan — [voir le guide de préparation du sol].", "aide": "Le texte entre crochets devient le lien."},
  {"cle": "reperes_surtitre", "groupe": "Quatre repères", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Ce que vous trouverez"},
  {"cle": "reperes_titre", "groupe": "Quatre repères", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Un tutoriel de pose, quatre repères"},
  {"cle": "reperes_intro", "groupe": "Quatre repères", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Tous suivent la même trame, pour que vous puissiez travailler avec la page ouverte à côté de vous."},
  {"cle": "repere1_titre", "groupe": "Quatre repères", "libelle": "Repère 1 : titre", "type": "texte", "max": 200, "defaut": "L’outillage réellement nécessaire", "aide": "Laisser vide pour masquer le repère."},
  {"cle": "repere1_texte", "groupe": "Quatre repères", "libelle": "Repère 1 : texte", "type": "long", "max": 1500, "defaut": "Maillet, cale de frappe, tire-lame, cales de dilatation : ce qu’il faut sortir avant de commencer, et ce dont on peut se passer."},
  {"cle": "repere2_titre", "groupe": "Quatre repères", "libelle": "Repère 2 : titre", "type": "texte", "max": 200, "defaut": "Le déroulé du chantier", "aide": "Laisser vide pour masquer le repère."},
  {"cle": "repere2_texte", "groupe": "Quatre repères", "libelle": "Repère 2 : texte", "type": "long", "max": 1500, "defaut": "Les étapes dans l’ordre, de la sous-couche aux plinthes, avec ce qui se joue à chacune."},
  {"cle": "repere3_titre", "groupe": "Quatre repères", "libelle": "Repère 3 : titre", "type": "texte", "max": 200, "defaut": "Les points de contrôle", "aide": "Laisser vide pour masquer le repère."},
  {"cle": "repere3_texte", "groupe": "Quatre repères", "libelle": "Repère 3 : texte", "type": "long", "max": 1500, "defaut": "Ce qu’il faut vérifier avant de passer à la suite, tant que c’est encore rattrapable."},
  {"cle": "repere4_titre", "groupe": "Quatre repères", "libelle": "Repère 4 : titre", "type": "texte", "max": 200, "defaut": "Les erreurs coûteuses", "aide": "Laisser vide pour masquer le repère."},
  {"cle": "repere4_texte", "groupe": "Quatre repères", "libelle": "Repère 4 : texte", "type": "long", "max": 1500, "defaut": "Celles qui obligent à déposer : jeu de dilatation oublié, support mal préparé, lames mal réparties."},
  {"cle": "outillage_surtitre", "groupe": "Outillage", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Avant d’ouvrir le premier paquet"},
  {"cle": "outillage_titre", "groupe": "Outillage", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "L’outillage à prévoir"},
  {"cle": "outillage_intro", "groupe": "Outillage", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Rien d’exotique, mais rien d’optionnel non plus : la moitié des reprises viennent d’un outil manquant qu’on a remplacé par un autre."},
  {"cle": "outillage_communs_titre", "groupe": "Outillage", "libelle": "Liste 1 : titre", "type": "texte", "max": 200, "defaut": "Indispensable, quelle que soit la pose"},
  {"cle": "outillage_communs", "groupe": "Outillage", "libelle": "Liste 1 : outils", "type": "lignes", "max": 2000, "defaut": "Mètre, équerre et crayon de menuisier — pour le traçage et le report des coupes\nRègle de deux mètres — pour contrôler la planéité du support\nCales de dilatation — pour tenir le jeu en périphérie\nMaillet blanc et cale de frappe — pour assembler sans marquer la lame\nTire-lame — pour les dernières rangées, contre le mur\nScie — sauteuse, circulaire ou égoïne selon l’épaisseur", "aide": "Une ligne par élément : « Nom — précision »."},
  {"cle": "outillage_selon_titre", "groupe": "Outillage", "libelle": "Liste 2 : titre", "type": "texte", "max": 200, "defaut": "En plus, selon le type de pose"},
  {"cle": "outillage_selon", "groupe": "Outillage", "libelle": "Liste 2 : outils", "type": "lignes", "max": 2000, "defaut": "Sous-couche et bande périphérique — pose flottante\nSpatule crantée et colle adaptée — pose collée\nCordeau ou laser de traçage — motifs en V et diagonale\nScie à araser — pour passer sous les huisseries\nGenouillères — un chantier de 20 m² se fait à genoux", "aide": "Une ligne par élément : « Nom — précision »."},
  {"cle": "outillage_note", "groupe": "Outillage", "libelle": "Note", "type": "long", "max": 1500, "defaut": "Le détail, format par format, figure au début de chaque tutoriel."},
  {"cle": "apercu_surtitre", "groupe": "Aperçu du simulateur", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Avant de commencer"},
  {"cle": "apercu_titre", "groupe": "Aperçu du simulateur", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Voir le résultat avant de couper la première lame"},
  {"cle": "apercu_texte", "groupe": "Aperçu du simulateur", "libelle": "Texte", "type": "long", "max": 1500, "defaut": "Le sens de pose et le motif se décident sur le papier, mais se jugent à l’œil. Essayez-les sur une photo de votre pièce : le rendu est calculé dans votre navigateur, votre photo n’est ni envoyée ni conservée."},
  {"cle": "apercu_bouton", "groupe": "Aperçu du simulateur", "libelle": "Bouton", "type": "texte", "max": 200, "defaut": "Visualiser mon parquet"},
  {"cle": "apercu_lien", "groupe": "Aperçu du simulateur", "libelle": "Lien", "type": "texte", "max": 200, "defaut": "Lire les guides"},
  {"cle": "faq_surtitre", "groupe": "Questions fréquentes", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Questions fréquentes"},
  {"cle": "faq_titre", "groupe": "Questions fréquentes", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Poser soi-même : les questions qui reviennent"},
  {"cle": "faq_intro", "groupe": "Questions fréquentes", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Cinq points qui décident souvent si l’on pose soi-même ou si l’on fait appel à un professionnel."},
  {"cle": "faq1_q", "groupe": "Questions fréquentes", "libelle": "Question 1", "type": "texte", "max": 200, "defaut": "Peut-on poser un parquet soi-même ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq1_r", "groupe": "Questions fréquentes", "libelle": "Réponse 1", "type": "long", "max": 1500, "defaut": "Une pose flottante en lames droites est à la portée d’un bricoleur méthodique : les lames se clipsent et rien n’est définitif. La pose collée et les motifs en V demandent de l’expérience, parce qu’une erreur de traçage ou d’encollage ne se rattrape plus une fois la colle prise."},
  {"cle": "faq2_q", "groupe": "Questions fréquentes", "libelle": "Question 2", "type": "texte", "max": 200, "defaut": "Combien de temps faut-il pour poser 20 m² de parquet ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq2_r", "groupe": "Questions fréquentes", "libelle": "Réponse 2", "type": "long", "max": 1500, "defaut": "Comptez environ une journée en pose flottante et un à deux jours en pose collée, auxquels s’ajoute la préparation du support — souvent le poste le plus long. Un motif en point de Hongrie peut doubler ce temps."},
  {"cle": "faq3_q", "groupe": "Questions fréquentes", "libelle": "Question 3", "type": "texte", "max": 200, "defaut": "Quel outillage faut-il pour poser un parquet flottant ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq3_r", "groupe": "Questions fréquentes", "libelle": "Réponse 3", "type": "long", "max": 1500, "defaut": "Un mètre, une équerre, un crayon, des cales de dilatation, un maillet blanc avec sa cale de frappe, un tire-lame pour les dernières rangées et une scie. Une règle de deux mètres sert à contrôler la planéité du support avant de commencer."},
  {"cle": "faq4_q", "groupe": "Questions fréquentes", "libelle": "Question 4", "type": "texte", "max": 200, "defaut": "Faut-il laisser le parquet s’acclimater avant la pose ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq4_r", "groupe": "Questions fréquentes", "libelle": "Réponse 4", "type": "long", "max": 1500, "defaut": "Oui. Les paquets restent fermés dans la pièce où le parquet sera posé, à température d’usage, 48 heures au minimum — davantage pour du massif. Poser des lames qui n’ont pas atteint l’hygrométrie du logement expose à des jeux ou à des tuilages."},
  {"cle": "faq5_q", "groupe": "Questions fréquentes", "libelle": "Question 5", "type": "texte", "max": 200, "defaut": "Quel jeu de dilatation laisser en périphérie ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq5_r", "groupe": "Questions fréquentes", "libelle": "Réponse 5", "type": "long", "max": 1500, "defaut": "De l’ordre de 8 à 10 mm contre chaque mur et autour de tout point fixe — tuyaux, huisseries, seuils — davantage sur les grandes largeurs. Les plinthes le masquent ensuite. C’est l’oubli qui oblige le plus souvent à tout déposer."},
  {"cle": "bandeau_titre", "groupe": "Bandeau final", "libelle": "Titre du bandeau", "type": "texte", "max": 200, "defaut": "Faire poser son parquet : décrivez votre projet en 4 étapes"},
];
PAGES['motifs'].champs = [
  {"cle": "surtitre", "groupe": "En-tête", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Motifs de pose"},
  {"cle": "carte_pose_droite_texte", "groupe": "Cartes des motifs", "libelle": "Pose droite : texte", "type": "long", "max": 1500, "defaut": "Toutes les lames parallèles, à joints décalés. Le motif de référence : sobre, économique, compatible avec tous les formats."},
  {"cle": "carte_pose_droite_chutes", "groupe": "Cartes des motifs", "libelle": "Pose droite : chutes", "type": "texte", "max": 200, "defaut": "Chutes faibles · ≈ 5 %"},
  {"cle": "carte_pose_longueur_texte", "groupe": "Cartes des motifs", "libelle": "Pose dans la longueur : texte", "type": "long", "max": 1500, "defaut": "La pose droite orientée dans le plus grand axe de la pièce. Elle prolonge l’espace et limite les coupes."},
  {"cle": "carte_pose_longueur_chutes", "groupe": "Cartes des motifs", "libelle": "Pose dans la longueur : chutes", "type": "texte", "max": 200, "defaut": "Chutes faibles · ≈ 5 %"},
  {"cle": "carte_pose_largeur_texte", "groupe": "Cartes des motifs", "libelle": "Pose dans la largeur : texte", "type": "long", "max": 1500, "defaut": "La pose droite orientée en travers. Une correction visuelle assumée pour les pièces trop longues."},
  {"cle": "carte_pose_largeur_chutes", "groupe": "Cartes des motifs", "libelle": "Pose dans la largeur : chutes", "type": "texte", "max": 200, "defaut": "Chutes faibles · 5 à 8 %"},
  {"cle": "carte_pose_diagonale_texte", "groupe": "Cartes des motifs", "libelle": "Pose en diagonale : texte", "type": "long", "max": 1500, "defaut": "Les lames à 45° des murs. Un motif qui agrandit et rattrape les murs faux — au prix de chutes sensiblement plus élevées."},
  {"cle": "carte_pose_diagonale_chutes", "groupe": "Cartes des motifs", "libelle": "Pose en diagonale : chutes", "type": "texte", "max": 200, "defaut": "Chutes élevées · 10 à 15 %"},
  {"cle": "carte_point_de_hongrie_texte", "groupe": "Cartes des motifs", "libelle": "Point de Hongrie : texte", "type": "long", "max": 1500, "defaut": "Des lames coupées à l’onglet, des pointes continues, un axe impitoyable : le motif le plus exigeant à poser."},
  {"cle": "carte_point_de_hongrie_chutes", "groupe": "Cartes des motifs", "libelle": "Point de Hongrie : chutes", "type": "texte", "max": 200, "defaut": "Chutes élevées · 10 à 15 %"},
  {"cle": "carte_baton_rompu_texte", "groupe": "Cartes des motifs", "libelle": "Bâton rompu : texte", "type": "long", "max": 1500, "defaut": "Des lames droites assemblées à angle droit, un rendu tressé : le motif graphique le plus accessible."},
  {"cle": "carte_baton_rompu_chutes", "groupe": "Cartes des motifs", "libelle": "Bâton rompu : chutes", "type": "texte", "max": 200, "defaut": "Chutes modérées · ≈ 10 %"},
  {"cle": "famille1_titre", "groupe": "Familles de motifs", "libelle": "Lames droites : titre", "type": "texte", "max": 200, "defaut": "Lames droites : choisir le sens de pose"},
  {"cle": "famille1_texte", "groupe": "Familles de motifs", "libelle": "Lames droites : texte", "type": "long", "max": 1500, "defaut": "Le même parquet, posé dans un sens ou un autre : c’est la direction des lames qui allonge, élargit ou dynamise la pièce. Elle décide aussi du nombre de coupes, donc des chutes à prévoir."},
  {"cle": "famille2_titre", "groupe": "Familles de motifs", "libelle": "Motifs en V : titre", "type": "texte", "max": 200, "defaut": "Point de Hongrie et bâton rompu : deux dessins souvent confondus"},
  {"cle": "famille2_texte", "groupe": "Familles de motifs", "libelle": "Motifs en V : texte", "type": "long", "max": 1500, "defaut": "Les deux dessinent un V. Le point de Hongrie coupe ses lames à l’onglet et file en pointe continue ; le bâton rompu pose des lames droites à angle droit, en escalier. Le premier coûte plus cher à poser, le second pardonne davantage au traçage."},
  {"cle": "famille2_lien", "groupe": "Familles de motifs", "libelle": "Motifs en V : lien vers le comparatif", "type": "texte", "max": 200, "defaut": "Lire le comparatif complet"},
  {"cle": "piece1_quand", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 1 : situation", "type": "texte", "max": 200, "defaut": "Pièce étroite, couloir, enfilade"},
  {"cle": "piece1_titre", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 1 : titre", "type": "texte", "max": 200, "defaut": "Lames dans la longueur", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "piece1_texte", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 1 : texte", "type": "long", "max": 1500, "defaut": "Les lames filent dans le plus grand axe : l’espace se prolonge et les coupes se raréfient. C’est aussi l’option la plus économique, en pose comme en matière."},
  {"cle": "piece2_quand", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 2 : situation", "type": "texte", "max": 200, "defaut": "Petite pièce, murs non parallèles"},
  {"cle": "piece2_titre", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 2 : titre", "type": "texte", "max": 200, "defaut": "Diagonale ou bâton rompu", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "piece2_texte", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 2 : texte", "type": "long", "max": 1500, "defaut": "Casser les lignes parallèles des murs agrandit visuellement la pièce et masque un angle faux. En contrepartie, les coupes d’angle se multiplient et les chutes augmentent."},
  {"cle": "piece3_quand", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 3 : situation", "type": "texte", "max": 200, "defaut": "Grand séjour, pièce de caractère"},
  {"cle": "piece3_titre", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 3 : titre", "type": "texte", "max": 200, "defaut": "Point de Hongrie", "aide": "Laisser vide pour masquer la carte."},
  {"cle": "piece3_texte", "groupe": "Quel motif pour quelle pièce", "libelle": "Carte 3 : texte", "type": "long", "max": 1500, "defaut": "La pointe continue guide le regard vers le fond de la pièce. Il lui faut de la longueur et un axe net pour se lire : en petite pièce, le motif paraît chargé."},
  {"cle": "pieces_surtitre", "groupe": "Quel motif pour quelle pièce", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Le bon motif au bon endroit"},
  {"cle": "pieces_titre", "groupe": "Quel motif pour quelle pièce", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Quel motif pour quelle pièce ?"},
  {"cle": "pieces_intro", "groupe": "Quel motif pour quelle pièce", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Le motif se choisit sur la forme de la pièce et sur la lumière, pas sur le catalogue. Trois situations couvrent la plupart des projets."},
  {"cle": "pieces_note", "groupe": "Quel motif pour quelle pièce", "libelle": "Note sous les cartes", "type": "lien", "max": 600, "defaut": "La lumière tranche les cas ambigus. Les rayons entrent perpendiculairement au plan de la fenêtre : poser « dans le sens de la lumière » revient donc à orienter les lames perpendiculairement au mur qui porte la fenêtre, et les joints s’y remarquent beaucoup moins. [Le guide du sens de pose] →", "aide": "Le texte entre crochets devient le lien."},
  {"cle": "faq_surtitre", "groupe": "Questions fréquentes", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Questions fréquentes"},
  {"cle": "faq_titre", "groupe": "Questions fréquentes", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Choisir son motif : les questions qui reviennent"},
  {"cle": "faq_intro", "groupe": "Questions fréquentes", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Cinq arbitrages que presque tous les projets rencontrent."},
  {"cle": "faq1_q", "groupe": "Questions fréquentes", "libelle": "Question 1", "type": "texte", "max": 200, "defaut": "Quel motif de parquet choisir pour une petite pièce ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq1_r", "groupe": "Questions fréquentes", "libelle": "Réponse 1", "type": "long", "max": 1500, "defaut": "La diagonale et le bâton rompu agrandissent visuellement une petite pièce en cassant les lignes parallèles des murs. À l’inverse, un point de Hongrie y paraît souvent trop chargé : la pointe a besoin de longueur pour se lire. Si le budget compte, une pose droite dans le plus grand axe reste la solution la plus sûre."},
  {"cle": "faq2_q", "groupe": "Questions fréquentes", "libelle": "Question 2", "type": "texte", "max": 200, "defaut": "Quel motif de parquet coûte le plus cher à poser ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq2_r", "groupe": "Questions fréquentes", "libelle": "Réponse 2", "type": "long", "max": 1500, "defaut": "Le point de Hongrie, pour trois raisons qui se cumulent : les lames sont coupées à l’onglet et se commandent en versions gauche et droite, le traçage ne tolère aucun écart, et les chutes sont nettement supérieures à une pose droite. Le bâton rompu offre un rendu graphique proche pour un coût de pose sensiblement moindre."},
  {"cle": "faq3_q", "groupe": "Questions fréquentes", "libelle": "Question 3", "type": "texte", "max": 200, "defaut": "Point de Hongrie ou bâton rompu : lequel choisir ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq3_r", "groupe": "Questions fréquentes", "libelle": "Réponse 3", "type": "long", "max": 1500, "defaut": "Le point de Hongrie pour une pièce longue et dégagée, quand le budget suit et que la pointe peut filer dans l’axe. Le bâton rompu pour un rendu graphique plus accessible, plus tolérant au traçage et mieux adapté aux pièces irrégulières ou de taille moyenne."},
  {"cle": "faq3_lien", "groupe": "Questions fréquentes", "libelle": "Question 3 : texte du lien", "type": "texte", "max": 200, "defaut": "Le comparatif complet", "aide": "Laisser vide pour retirer le lien."},
  {"cle": "faq4_q", "groupe": "Questions fréquentes", "libelle": "Question 4", "type": "texte", "max": 200, "defaut": "Combien de chutes faut-il prévoir selon le motif ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq4_r", "groupe": "Questions fréquentes", "libelle": "Réponse 4", "type": "long", "max": 1500, "defaut": "Comptez de l’ordre de 5 % en pose droite, 10 % en bâton rompu et 10 à 15 % en diagonale ou en point de Hongrie : ces motifs multiplient les coupes d’angle en périphérie. Prévoyez la marge dès la commande, un complément acheté plus tard pouvant provenir d’un autre bain de teinte."},
  {"cle": "faq5_q", "groupe": "Questions fréquentes", "libelle": "Question 5", "type": "texte", "max": 200, "defaut": "Peut-on poser un point de Hongrie en parquet flottant ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq5_r", "groupe": "Questions fréquentes", "libelle": "Réponse 5", "type": "long", "max": 1500, "defaut": "Des systèmes à clipser conçus pour ce motif existent, mais la pose collée reste la référence. Un motif en V multiplie les assemblages, et les jeux qui se cumulent en pose flottante finissent par se voir le long des pointes. Vérifiez toujours ce que le fabricant autorise pour la référence choisie."},
  {"cle": "faq5_lien", "groupe": "Questions fréquentes", "libelle": "Question 5 : texte du lien", "type": "texte", "max": 200, "defaut": "Coller un parquet contrecollé", "aide": "Laisser vide pour retirer le lien."},
  {"cle": "bandeau_titre", "groupe": "Bandeau final", "libelle": "Titre du bandeau", "type": "texte", "max": 200, "defaut": "Faire poser son parquet : décrivez votre projet en 4 étapes"},
];
PAGES['guides'].champs = [
  {"cle": "surtitre", "groupe": "En-tête", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Guides"},
  {"cle": "conseil", "groupe": "Conseil", "libelle": "Texte du conseil", "type": "long", "max": 1500, "defaut": "Chaque guide se termine par un simulateur ou une checklist : de quoi passer de la lecture à la décision."},
  {"cle": "etape1_titre", "groupe": "Dans quel ordre les lire", "libelle": "Étape 1 : titre", "type": "texte", "max": 200, "defaut": "Avant de commander", "aide": "Laisser vide pour masquer l’étape."},
  {"cle": "etape1_texte", "groupe": "Dans quel ordre les lire", "libelle": "Étape 1 : texte", "type": "long", "max": 1500, "defaut": "Massif ou contrecollé, largeur de lame, essence, motif et sens de pose : ce qui se décide sur le papier et ne se rattrape plus une fois la commande partie."},
  {"cle": "etape2_titre", "groupe": "Dans quel ordre les lire", "libelle": "Étape 2 : titre", "type": "texte", "max": 200, "defaut": "Avant la première lame", "aide": "Laisser vide pour masquer l’étape."},
  {"cle": "etape2_texte", "groupe": "Dans quel ordre les lire", "libelle": "Étape 2 : texte", "type": "long", "max": 1500, "defaut": "Planéité, humidité, ragréage, acclimatation des lames dans la pièce : la plupart des désordres viennent du support, pas du parquet."},
  {"cle": "etape3_titre", "groupe": "Dans quel ordre les lire", "libelle": "Étape 3 : titre", "type": "texte", "max": 200, "defaut": "Au moment de poser", "aide": "Laisser vide pour masquer l’étape."},
  {"cle": "etape3_texte", "groupe": "Dans quel ordre les lire", "libelle": "Étape 3 : texte", "type": "long", "max": 1500, "defaut": "Calepinage, coupes de rive, jeu de dilatation en périphérie : les gestes qui décident du rendu fini, et que les tutoriels déroulent pas à pas."},
  {"cle": "ordre_surtitre", "groupe": "Dans quel ordre les lire", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Par où commencer"},
  {"cle": "ordre_titre", "groupe": "Dans quel ordre les lire", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Dans quel ordre les lire ?"},
  {"cle": "ordre_intro", "groupe": "Dans quel ordre les lire", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Les guides suivent l’ordre d’un chantier. Chaque étape ferme des options que la suivante ne rouvrira pas."},
  {"cle": "faq_surtitre", "groupe": "Questions fréquentes", "libelle": "Surtitre", "type": "texte", "max": 200, "defaut": "Questions fréquentes"},
  {"cle": "faq_titre", "groupe": "Questions fréquentes", "libelle": "Titre", "type": "texte", "max": 200, "defaut": "Avant de choisir son parquet"},
  {"cle": "faq_intro", "groupe": "Questions fréquentes", "libelle": "Introduction", "type": "long", "max": 1500, "defaut": "Cinq questions qui reviennent avant la lecture des guides, et les réponses courtes."},
  {"cle": "faq1_q", "groupe": "Questions fréquentes", "libelle": "Question 1", "type": "texte", "max": 200, "defaut": "Par quel guide commencer ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq1_r", "groupe": "Questions fréquentes", "libelle": "Réponse 1", "type": "long", "max": 1500, "defaut": "Par le sens de pose si la pièce est déjà choisie, par la préparation du support si le chantier est proche. Les deux se lisent en moins de vingt minutes, et ce sont les deux décisions qu’on ne reprend pas après coup."},
  {"cle": "faq2_q", "groupe": "Questions fréquentes", "libelle": "Question 2", "type": "texte", "max": 200, "defaut": "Quel parquet choisir pour un plancher chauffant ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq2_r", "groupe": "Questions fréquentes", "libelle": "Réponse 2", "type": "long", "max": 1500, "defaut": "Un contrecollé de faible épaisseur, posé collé : il transmet mieux la chaleur et bouge moins qu’un massif. Vérifiez la résistance thermique admise et le mode de pose que le fabricant autorise pour la référence retenue."},
  {"cle": "faq3_q", "groupe": "Questions fréquentes", "libelle": "Question 3", "type": "texte", "max": 200, "defaut": "Peut-on poser du parquet dans une cuisine ou une salle de bains ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq3_r", "groupe": "Questions fréquentes", "libelle": "Réponse 3", "type": "long", "max": 1500, "defaut": "En cuisine, oui, avec une finition résistante et des joints soignés près des points d’eau. En salle de bains, cela demande une essence adaptée et une pose collée étanche : le guide de préparation détaille les contrôles."},
  {"cle": "faq4_q", "groupe": "Questions fréquentes", "libelle": "Question 4", "type": "texte", "max": 200, "defaut": "Faut-il poncer un ancien parquet ou le remplacer ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq4_r", "groupe": "Questions fréquentes", "libelle": "Réponse 4", "type": "long", "max": 1500, "defaut": "Un massif se ponce plusieurs fois tant que l’épaisseur au-dessus des rainures le permet. Un contrecollé n’offre que l’épaisseur de son parement, souvent deux à quatre millimètres : au-delà, c’est un remplacement."},
  {"cle": "faq5_q", "groupe": "Questions fréquentes", "libelle": "Question 5", "type": "texte", "max": 200, "defaut": "Combien de temps prévoir entre la commande et la pose ?", "aide": "Laisser vide pour masquer la question."},
  {"cle": "faq5_r", "groupe": "Questions fréquentes", "libelle": "Réponse 5", "type": "long", "max": 1500, "defaut": "Comptez l’acclimatation des lames dans la pièce, 48 heures au minimum, et le séchage d’un ragréage s’il y en a un. C’est ce délai, et non la pose elle-même, qui décale le plus souvent un chantier."},
  {"cle": "bandeau_titre", "groupe": "Bandeau final", "libelle": "Titre du bandeau", "type": "texte", "max": 200, "defaut": "Faire poser son parquet : décrivez votre projet en 4 étapes"},
];

for (const page of Object.values(PAGES)) {
  for (const d of page.champs || []) if (/^Laisser vide/.test(d.aide || '')) d.masquable = true;
  if (page.champs) page.valeurs = defauts(page.champs);
}

module.exports = { PAGES, A_COMPLETER };

