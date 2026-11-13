# Rapport SEO et GEO — Pose Parquet

Date : 13 novembre 2026. Dossier : `C:\Users\jonat\Desktop\pose-parquet.com`.

## A. Verdict

**VALIDÉ AVEC RÉSERVES pour la préparation locale.** Les 35 pages principales utilisent des URL de dossiers ; 33 jeux de métadonnées fournis dans la mission ont été appliqués. Le blog vide et le prototype existant restent disponibles et non indexables. Les pages système 404 et maintenance sont conservées séparément. Aucun contenu éditorial nouveau n’a été créé.

Les réserves concernent l’hébergement final non renseigné, les anciens liens déjà publiés, les renseignements légaux incomplets et les vérifications distantes non exécutées. Ce verdict n’est pas une autorisation de lancement.

**Aucun commit, push, merge, rebase, reset ou déploiement pendant cette mission.** HEAD est resté `cad4392837afd3af7a8adc3ad3ea88841b555074`. Les commandes Git exécutées dans cette mission servent seulement à lire l’état, les différences et l’inventaire. Les autres projets et leurs services n’ont pas été modifiés. Le WordPress installé n’a pas été modifié.

## B. Modifications et choix techniques

| Fichier ou groupe | Rôle et justification |
|---|---|
| `_generator/routes.js` | Normalisation des URL publiques, sortie en dossiers index.html, réécriture des liens et ressources selon la profondeur, préservation des paramètres et ancres. Chemins relatifs compatibles avec une installation sous /pose-parquet/ sur GitHub Pages. |
| `_generator/seo-meta.json`, `_generator/seo.js` | Métadonnées demandées, appliquées après les contenus WordPress pour conserver les textes visibles sans laisser un ancien Title annuler la configuration SEO. |
| `_generator/layout.js` | Canonical et Open Graph cohérents, langue française conservée, métadonnées échappées, noindex/follow par défaut hors production explicite. Aucun changement du corps des pages. |
| `_generator/build.js` | Génération des 22 nouveaux emplacements ; anciens fichiers HTML conservés comme alias temporaires ; URLs propres dans sitemap, plan HTML, JSON-LD et index public de contenus. Retrait du lastmod systématiquement daté du jour. Dates structurées uniquement lorsqu’une date source existe ; pas de date inventée pour les fiches motif. Identifiant WebSite et logo Organization cohérents avec le site. |
| `_generator/wordpress.js` | Ajout des seules métadonnées manquantes à la maintenance, sans toucher à son rendu ou à son activation. |
| `js/studio/app.js`, `js/product/app.js`, `js/forms/orientation.js` | Remplacement des seules adresses publiques de navigation. Aucun algorithme, traitement photo ou contrat de formulaire changé. |
| `backend/pose-parquet-core/src/Contenus/Edition.php`, `Listes.php` | Liens publics « essayer » et lien affiché vers le Studio adaptés. Source du dépôt uniquement ; aucune synchronisation dans le WordPress installé. Syntaxe PHP contrôlée. |
| `.github/workflows/deploy-pages.yml` | Configuration SEO de staging : noindex/follow et accès aux ressources. Aucune exécution du workflow provoquée par cette mission. Le sitemap reste retiré du futur artefact de staging. |
| `_generator/check-seo.js` | Contrôle reproductible des métadonnées, canonical, Open Graph, sitemap, URL, FAQ et paramètres. |
| `_generator/check-motifs.js` | Attente de test adaptée aux liens /studio/?motif=…, avec tolérance des anciens alias. |
| HTML, gabarits d’aperçu, `data/contenus.json`, `sitemap.xml`, `robots.txt`, `assets/dist/` | Sorties régénérées. Les sources CSS, scènes et moteur ne sont pas modifiées. Le changement d’empreinte JS provient des trois fichiers contenant des liens publics. |

`serve.js` ne nécessite aucune modification : il sert déjà les dossiers par leur index.html. Les 35 URL principales ont été demandées directement en HTTP, avec résultat 200, puis les routes profondes ont été ouvertes et rechargées dans le navigateur.

### Slugs conservés

Les suggestions /guides/parquet-sens-lumiere/, /guides/sens-pose-parquet-couloir/, /guides/sens-pose-piece-etroite/ et /outils/visualiseur-parquet/ n’ont pas remplacé arbitrairement les slugs existants. Les URL définitives ci-dessous conservent les noms déjà employés, en ajoutant le slash final. Les métadonnées correspondantes ont bien été appliquées.

### Anciennes adresses

Les anciennes routes ont déjà été utilisées publiquement sur GitHub Pages : elles ne peuvent pas être considérées comme jamais publiées. Les 22 anciens fichiers HTML restent accessibles, avec canonical vers les nouvelles URL. Aucun lien public généré ne les utilise ; ils ne figurent pas au sitemap. Aucune redirection 301 automatique n’a été créée. Leur retrait ou leur redirection définitive exige une vérification de Search Console et des liens entrants avant le lancement.

Les fichiers physiques index.html restent nécessaires au serveur ; ce ne sont pas les URL publiques affichées. Les gabarits `data/apercu/*.tpl`, leurs routes d’aperçu, `404.html` et `maintenance.html` sont techniques. 404.html est notamment l’emplacement réservé par GitHub Pages. Ils ne sont pas des entrées publiques du sitemap.

## C. Tableau SEO complet

Toutes les pages principales comportent exactement un Title, une description, un canonical absolu HTTPS, un H1 et des Open Graph cohérents. Les 33 textes fournis sont repris sans réécriture visible. Les deux pages supplémentaires existantes gardent leurs métadonnées distinctes.

| Page | URL définitive | Title | Meta Description | Canonical | Statut |
|---|---|---|---|---|---|
| /a-propos/ | /a-propos/ | À propos de Pose Parquet : guides et outils | Découvrez Pose Parquet, notre mission éditoriale, nos guides pratiques et nos outils pour accompagner les projets de pose de parquet. | https://pose-parquet.com/a-propos/ | OK · noindex en développement |
| /a-propos/methode-editoriale/ | /a-propos/methode-editoriale/ | Notre méthode éditoriale et nos engagements | Découvrez comment nous préparons nos guides de pose de parquet, vérifions nos informations et présentons nos partenaires. | https://pose-parquet.com/a-propos/methode-editoriale/ | OK · noindex en développement |
| /blog/ | /blog/ | Blog : actualités et conseils parquet \| Pose Parquet | Les articles de Pose Parquet : actualités, retours de chantier et conseils pratiques pour choisir et poser son parquet. | https://pose-parquet.com/blog/ | Noindex durable dans l’état actuel |
| /confidentialite/ | /confidentialite/ | Politique de confidentialité et cookies | Consultez notre politique de confidentialité pour comprendre le traitement des données personnelles et l'utilisation des cookies. | https://pose-parquet.com/confidentialite/ | OK · noindex en développement |
| /contact/ | /contact/ | Contactez Pose Parquet | Une question sur nos guides, nos outils ou notre site ? Retrouvez les informations pour contacter l'équipe Pose Parquet. | https://pose-parquet.com/contact/ | OK · noindex en développement |
| /guides/erreurs-a-eviter-avant-de-poser/ | /guides/erreurs-a-eviter-avant-de-poser/ | Pose de parquet : 8 erreurs à éviter absolument | Support mal préparé, mauvais sens de pose, humidité : découvrez les erreurs fréquentes avant la pose d'un parquet. | https://pose-parquet.com/guides/erreurs-a-eviter-avant-de-poser/ | OK · noindex en développement |
| /guides/ | /guides/ | Guides de pose de parquet : conseils et techniques | Sens de pose, préparation du sol, choix du parquet : découvrez nos guides pratiques pour préparer et réussir votre projet de parquet. | https://pose-parquet.com/guides/ | OK · noindex en développement |
| /guides/parquet-massif-ou-contrecolle/ | /guides/parquet-massif-ou-contrecolle/ | Parquet massif ou contrecollé : lequel choisir ? | Massif ou contrecollé ? Comparez la structure, la stabilité, les techniques de pose et les contraintes de chaque parquet. | https://pose-parquet.com/guides/parquet-massif-ou-contrecolle/ | OK · noindex en développement |
| /guides/point-de-hongrie-ou-baton-rompu/ | /guides/point-de-hongrie-ou-baton-rompu/ | Point de Hongrie ou bâton rompu : les différences | Comparez le point de Hongrie et le bâton rompu : forme des lames, rendu esthétique, contraintes de pose et techniques. | https://pose-parquet.com/guides/point-de-hongrie-ou-baton-rompu/ | OK · noindex en développement |
| /guides/poser-parquet-sens-de-la-lumiere/ | /guides/poser-parquet-sens-de-la-lumiere/ | Parquet et lumière : dans quel sens poser les lames ? | Faut-il poser le parquet dans le sens de la lumière ? Comprenez l'effet des fenêtres sur l'orientation des lames. | https://pose-parquet.com/guides/poser-parquet-sens-de-la-lumiere/ | OK · noindex en développement |
| /guides/preparer-son-sol-avant-la-pose/ | /guides/preparer-son-sol-avant-la-pose/ | Préparer un sol avant la pose d'un parquet : guide | Planéité, humidité, nettoyage et ragréage : découvrez comment préparer votre support avant de poser un parquet. | https://pose-parquet.com/guides/preparer-son-sol-avant-la-pose/ | OK · noindex en développement |
| /guides/quel-sens-de-pose-choisir/ | /guides/quel-sens-de-pose-choisir/ | Sens de pose du parquet : comment bien choisir ? | Lumière, longueur de la pièce, circulation : découvrez les critères pour choisir le bon sens de pose de votre parquet. | https://pose-parquet.com/guides/quel-sens-de-pose-choisir/ | OK · noindex en développement |
| /guides/sens-de-pose-couloir/ | /guides/sens-de-pose-couloir/ | Dans quel sens poser du parquet dans un couloir ? | Pose en longueur ou en largeur ? Découvrez comment orienter les lames dans un couloir selon sa forme et la lumière. | https://pose-parquet.com/guides/sens-de-pose-couloir/ | OK · noindex en développement |
| /guides/sens-de-pose-piece-etroite/ | /guides/sens-de-pose-piece-etroite/ | Sens de pose du parquet dans une pièce étroite | Comment orienter un parquet dans une pièce longue ou étroite ? Découvrez les effets visuels des différentes poses. | https://pose-parquet.com/guides/sens-de-pose-piece-etroite/ | OK · noindex en développement |
| / | / | Pose de parquet : guides, conseils et simulateur | Découvrez nos guides de pose de parquet, les techniques et motifs, et visualisez votre futur sol grâce à notre simulateur gratuit. | https://pose-parquet.com/ | OK · noindex en développement |
| /inspiration/ | /inspiration/ | Inspirations parquet : idées de sols et motifs | Découvrez des inspirations parquet pour le salon, la chambre ou la cuisine. Comparez les teintes, les motifs et les ambiances. | https://pose-parquet.com/inspiration/ | OK · noindex en développement |
| /mentions-legales/ | /mentions-legales/ | Mentions légales de Pose Parquet | Consultez les mentions légales de Pose Parquet et les informations relatives à l'éditeur et à l'hébergement du site. | https://pose-parquet.com/mentions-legales/ | OK · noindex en développement |
| /motifs/baton-rompu/ | /motifs/baton-rompu/ | Parquet bâton rompu : technique et pose | Découvrez le motif bâton rompu, sa disposition en zigzag, ses différences avec le point de Hongrie et ses contraintes de pose. | https://pose-parquet.com/motifs/baton-rompu/ | OK · noindex en développement |
| /motifs/ | /motifs/ | Motifs de pose de parquet : les 6 styles à connaître | Pose droite, diagonale, bâton rompu ou point de Hongrie : découvrez 6 motifs de pose de parquet et leurs différences. | https://pose-parquet.com/motifs/ | OK · noindex en développement |
| /motifs/point-de-hongrie/ | /motifs/point-de-hongrie/ | Parquet point de Hongrie : motif et technique | Découvrez le parquet point de Hongrie : assemblage des lames, angles de coupe, préparation et particularités de ce motif. | https://pose-parquet.com/motifs/point-de-hongrie/ | OK · noindex en développement |
| /motifs/pose-diagonale/ | /motifs/pose-diagonale/ | Pose de parquet en diagonale : guide et conseils | Découvrez comment fonctionne la pose de parquet en diagonale, ses avantages esthétiques et ses contraintes de découpe. | https://pose-parquet.com/motifs/pose-diagonale/ | OK · noindex en développement |
| /motifs/pose-droite/ | /motifs/pose-droite/ | Pose droite du parquet : principe et méthode | Découvrez la pose droite du parquet : disposition des lames, avantages, préparation et conseils pour réussir la pose. | https://pose-parquet.com/motifs/pose-droite/ | OK · noindex en développement |
| /motifs/pose-largeur/ | /motifs/pose-largeur/ | Parquet posé dans la largeur : conseils de pose | Découvrez les effets visuels d'un parquet posé dans la largeur et les critères à considérer avant de choisir cette orientation. | https://pose-parquet.com/motifs/pose-largeur/ | OK · noindex en développement |
| /motifs/pose-longueur/ | /motifs/pose-longueur/ | Parquet posé dans la longueur : quel résultat ? | Poser son parquet dans la longueur peut transformer la perception d'une pièce. Découvrez dans quels cas choisir cette orientation. | https://pose-parquet.com/motifs/pose-longueur/ | OK · noindex en développement |
| /outils/ | /outils/ | Outils gratuits pour préparer la pose de parquet | Découvrez nos outils gratuits pour choisir un parquet, comparer les sens de pose et visualiser votre futur sol. | https://pose-parquet.com/outils/ | OK · noindex en développement |
| /outils/simulateur-pose/ | /outils/simulateur-pose/ | Simulateur de pose de parquet : sens et motifs | Comparez différentes orientations de lames sur un plan et visualisez les effets des sens de pose de votre parquet. | https://pose-parquet.com/outils/simulateur-pose/ | OK · noindex en développement |
| /outils/studio/ | /outils/studio/ | Visualiseur de parquet : essayez un sol sur photo | Visualisez différents parquets dans votre pièce grâce à une photo. Découvrez les teintes et comparez les rendus. | https://pose-parquet.com/outils/studio/ | OK · noindex en développement |
| /outils/visualiseur/ | /outils/visualiseur/ | Simulateur parquet gratuit : visualisez votre sol | Importez une photo de votre pièce et essayez différents parquets. Comparez les teintes et les motifs gratuitement. | https://pose-parquet.com/outils/visualiseur/ | OK · noindex en développement |
| /outils/visualiseur-produit/ | /outils/visualiseur-produit/ | Visualiseur produit · Pose Parquet | Essayez cinq références Premibel dans une pièce : la pièce occupe l’écran, le parquet change à chaque clic, tout est calculé dans votre navigateur. | https://pose-parquet.com/outils/visualiseur-produit/ | Noindex durable dans l’état actuel |
| /plan-du-site/ | /plan-du-site/ | Plan du site Pose Parquet : toutes les pages | Retrouvez toutes les pages de Pose Parquet : guides, tutoriels, motifs de pose, simulateurs, inspirations et informations pratiques. | https://pose-parquet.com/plan-du-site/ | OK · noindex en développement |
| /projet/ | /projet/ | Projet de pose de parquet : préparez votre chantier | Décrivez votre projet de parquet en quelques étapes : surface, support, type de pose et contraintes pour mieux préparer votre chantier. | https://pose-parquet.com/projet/ | OK · noindex en développement |
| /tutoriels/coller-un-parquet-contrecolle/ | /tutoriels/coller-un-parquet-contrecolle/ | Pose collée d'un parquet contrecollé : tutoriel | Apprenez les étapes de la pose collée d'un parquet contrecollé : préparation du support, encollage et mise en place des lames. | https://pose-parquet.com/tutoriels/coller-un-parquet-contrecolle/ | OK · noindex en développement |
| /tutoriels/ | /tutoriels/ | Tutoriels pose de parquet : étapes et méthodes | Apprenez à poser votre parquet avec nos tutoriels étape par étape : pose flottante, pose collée et calepinage. | https://pose-parquet.com/tutoriels/ | OK · noindex en développement |
| /tutoriels/poser-un-parquet-flottant/ | /tutoriels/poser-un-parquet-flottant/ | Comment poser un parquet flottant ? Tutoriel complet | Découvrez les étapes pour poser un parquet flottant : préparation du sol, sous-couche, assemblage des lames et finitions. | https://pose-parquet.com/tutoriels/poser-un-parquet-flottant/ | OK · noindex en développement |
| /tutoriels/reussir-le-calepinage/ | /tutoriels/reussir-le-calepinage/ | Calepinage parquet : méthode et conseils de pose | Apprenez à réaliser un calepinage de parquet : calcul des rangées, alignement des lames et anticipation des découpes. | https://pose-parquet.com/tutoriels/reussir-le-calepinage/ | OK · noindex en développement |

Pages techniques : 404.html garde son titre et sa description, canonical /404.html et noindex. maintenance.html garde son titre piloté par WordPress, reçoit une description de maintenance et un canonical /maintenance.html, et reste noindex. Aucune des deux n’est au sitemap.

## D. Vérification des fonctionnalités

La colonne Avant décrit la référence existante figée pendant l’inventaire, et non une recette navigateur complète avant modification. Le résultat Après correspond à des manipulations effectivement exécutées dans le navigateur après migration.

| Fonctionnalité | Avant | Après | Résultat |
|---|---|---|---|
| Ouverture directe du Studio | Adresse .html, paramètres pièce/parquet/motif | /outils/studio/?piece=chambre&parquet=CHENF36014&motif=lames charge la chambre et Colza | OK |
| Changement de parquet | Catalogue et normalisation existants | Sélection Notting Hill, rendu et motif compatibles affichés | OK |
| Orientation | Réglages existants | Diagonale choisie ; orientation=45 dans le lien projet | OK |
| Avant/après | Commande et curseur existants | Commande activée, curseur affiché | OK |
| Comparaison | Deux variantes, curseur | Colza et Notting Hill enregistrés ; dialogue ouvert ; curseur déplacé de 50 à 51 | OK |
| Import de photo | Traitement local existant | Import du fichier de démonstration room-chambre.jpg ; écran « Ma photo », poignées de sol puis Terminer | OK pour le parcours d’import ; pas d’évaluation de précision du masque |
| Mode Plan | Motifs, dimensions et calcul existants | Longueur passée à 6 m, diagonale choisie, surface et lien projet actualisés | OK |
| Reprise dans le projet | Paramètres pose/surface | Diagonale et 23 m² repris dans le formulaire | OK |
| Formulaire | Quatre étapes et retour | Étapes 1 à 4 parcourues, retour à 3 avec choix conservés | OK pour la navigation ; aucun envoi final ni email |
| Menu mobile | Navigation existante | Ouverture depuis un guide profond, lien Outils fonctionnel | OK |
| Menu desktop | Navigation existante | Lien Motifs fonctionnel depuis Méthode éditoriale | OK |
| Footer et fil d’Ariane | Liens existants | Pied de page vers Méthode éditoriale sur URL profonde ; tous les liens et ancres contrôlés | OK |
| Prototype visualiseur produit | Page existante noindex | Nouvelle adresse /outils/visualiseur-produit/, interface et scène chargées | OK, reste noindex |

Les tests ont utilisé des choix et une image de démonstration. Aucune photo privée n’a été nécessaire. Aucune inférence IA externe, aucun envoi de formulaire et aucun email n’ont été déclenchés.

## E. Tests et résultats

### Automatisés

- `node _generator/build.js` : génération réussie ; 59 fichiers HTML publics/compatibilité vérifiés, dont 35 routes principales, 22 alias et 2 pages système.
- Deux reconstructions supplémentaires : 63 sorties HTML/config/index/sitemap/robots identiques entre générations. Aucun lastmod basé sur la date de build.
- `node _generator/check-seo.js` : 35 pages, 1 985 références de ressources/liens sur les routes principales, 77 blocs JSON-LD, 33 URL de sitemap ; OK. Questions et réponses FAQ présentes dans le contenu réel. Canonical et OG identiques, titres/descriptions uniques par page principale, absence d’extension HTML dans les liens publics et les données structurées.
- `node _generator/check-links.js` : 4 298 références internes, aucun lien cassé sur le build stabilisé, alias compris.
- `node _generator/check-headings.js` : un H1 par fichier HTML.
- `node _generator/check-images.js`, `check-fonts.js`, `check-photo.js`, `check-motifs.js`, `check-routage.js`, `check-chiffres.js`, `check-inspiration.js`, `check-studio-api.js`, `check-reproducible.js --rapide` : tous réussis.
- Requêtes HTTP GET sur les 35 URL principales : 35 réponses 200.
- Empreintes SHA-256 de 74 fichiers CSS/scènes/moteur : strictement identiques à l’inventaire initial.
- Comparaison du texte du body des 37 pages initiales : aucune différence, métadonnées et liens exclus de cette comparaison.
- `php -d xdebug.mode=off -l …/Edition.php` et `…/Listes.php` : syntaxe valide.
- Aucun ajout de dépendance dans le projet.

### Navigateur et responsive

24 contrôles sur l’accueil, un guide, un tutoriel et le Mode Plan, chacun à 375, 390, 430, 768, 1024 et 1440 px : aucun débordement horizontal, aucune image chargée en erreur, un seul H1. Recette séparée du Studio, du prototype, des menus, de l’import, des paramètres, de la comparaison et des quatre étapes du formulaire. Aucune erreur de console observée pendant cette recette.

### Incidents corrigés ou expliqués

- Le contrôle des fiches motif cherchait littéralement studio.html?motif= ; il a été adapté à /studio/?motif= sans affaiblir la vérification des six liens et des motifs autorisés.
- Un contrôle des liens lancé pendant une reconstruction a observé cinq ressources momentanément en cours de réécriture. Il a été relancé après stabilisation : zéro erreur. Cette vérification n’est pas utilisée pour présenter le build en cours comme un déploiement atomique.
- Les anciennes dates lastmod étaient remplacées par le jour du build sur les pages sans date : cette valeur a été supprimée. Les dates de publication sources connues sont conservées.
- Les dates structurées de repli des fiches motif ont été retirées. Les dates visibles antérieures n’ont pas été réécrites, conformément à la contrainte de contenu ; leur vérification éditoriale reste pertinente.

## F. Préparation au lancement

1. Confirmer le domaine et l’hébergement définitifs ; configurer l’index de dossier index.html et les réponses 404. Sur Apache : DirectoryIndex index.html ; sur nginx : résolution réelle des fichiers et dossiers avec 404, sans renvoyer l’accueil pour une URL inconnue. Ce sont des prérequis à vérifier sur le serveur choisi, pas des configurations appliquées.
2. Compléter les informations légales signalées par le build : identité, adresse, SIREN/RCS, contact, directeur de publication, hébergeur et durée de conservation. Ne pas inventer ces données.
3. Examiner Search Console et les liens entrants des anciennes URL. Définir alors la politique de compatibilité ou les redirections ciblées ; aucune 301 créée dans cette mission.
4. Déployer d’abord en préproduction quand une nouvelle instruction l’autorisera, puis rejouer les contrôles HTTP, ressources et outils sur le vrai sous-chemin/domaine.
5. Au lancement seulement, déclarer explicitement SITE_ENVIRONMENT=production, vérifier l’accueil index/follow et conserver noindex pour les pages système/prototype et le blog tant qu’il est vide. Les exigences existantes du déploiement production (CNAME et export WordPress HTTPS) restent en place.
6. Publier le sitemap de 33 URL avec les URL canoniques propres ; vérifier robots.txt et la lecture des ressources ; soumettre le sitemap dans Search Console après ouverture.
7. Vérifier la configuration du WordPress distant, son export et ses liens propres lors du déploiement du plugin. Les nouvelles modifications du plugin sont actuellement dans le dépôt local uniquement.

## G. Risques et réserves SEO/GEO

- Le serveur de production final n’a pas été accessible/configuré dans cette mission. Les conventions de dossiers sont compatibles avec l’architecture statique et GitHub Pages ; leur fonctionnement sur le domaine final doit encore être vérifié.
- La recherche publique ciblée sur une ancienne URL n’a retourné aucun résultat ; cela ne prouve pas l’absence d’indexation. L’accès Search Console et les journaux de trafic n’étaient pas disponibles. L’ancienne préproduction GitHub Pages a déjà exposé les routes HTML.
- Les alias produisent temporairement du contenu dupliqué avec canonical vers l’URL propre. Ils préservent les liens existants ; leur traitement définitif reste à décider au lancement.
- Le site local est maintenant noindex/follow par défaut ; robots.txt autorise les ressources pour que les moteurs puissent lire le noindex. Ce n’est pas une protection d’accès à des données privées. La production n’a pas été activée.
- Les données structurées décrivent le contenu réel ; elles ne certifient ni une qualification professionnelle ni l’identité juridique encore manquante de l’éditeur. Aucun auteur humain, prix commercial, récompense ou date nouvelle n’a été inventé.
- Les pages Présentation du visualiseur et Studio ont des rôles distincts et des métadonnées différentes ; le prototype proche reste noindex. Aucune fusion ou suppression réalisée.
- Aucun outil de validation distant Rich Results/Search Console n’a été utilisé, et aucun classement ou affichage enrichi n’est garanti.
- Pas de llms.txt ajouté. Pour Google, les pratiques SEO classiques restent pertinentes pour les fonctions IA et aucun fichier spécial n’est requis ; la mission améliore les URL, les liens, les métadonnées et les données structurées sans promettre une présence dans ChatGPT, Gemini ou Perplexity. [Documentation Google sur les fonctions IA](https://developers.google.com/search/docs/appearance/ai-features).
- Les canonical servent à signaler les URL préférées, sans garantie de sélection par Google. [Documentation des canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- Les dates de sitemap doivent représenter les modifications réelles. [Documentation des sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Inventaire avant/après

| Fichier / ancienne adresse | Adresse définitive | Compatibilité |
|---|---|---|
| /404.html | /404.html | Emplacement conservé |
| /a-propos/index.html | /a-propos/ | Emplacement conservé |
| /a-propos/methode-editoriale.html | /a-propos/methode-editoriale/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /blog/index.html | /blog/ | Emplacement conservé |
| /confidentialite/index.html | /confidentialite/ | Emplacement conservé |
| /contact/index.html | /contact/ | Emplacement conservé |
| /guides/erreurs-a-eviter-avant-de-poser.html | /guides/erreurs-a-eviter-avant-de-poser/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/index.html | /guides/ | Emplacement conservé |
| /guides/parquet-massif-ou-contrecolle.html | /guides/parquet-massif-ou-contrecolle/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/point-de-hongrie-ou-baton-rompu.html | /guides/point-de-hongrie-ou-baton-rompu/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/poser-parquet-sens-de-la-lumiere.html | /guides/poser-parquet-sens-de-la-lumiere/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/preparer-son-sol-avant-la-pose.html | /guides/preparer-son-sol-avant-la-pose/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/quel-sens-de-pose-choisir.html | /guides/quel-sens-de-pose-choisir/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/sens-de-pose-couloir.html | /guides/sens-de-pose-couloir/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /guides/sens-de-pose-piece-etroite.html | /guides/sens-de-pose-piece-etroite/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /index.html | / | Emplacement conservé |
| /inspiration/index.html | /inspiration/ | Emplacement conservé |
| /maintenance.html | /maintenance.html | Emplacement conservé |
| /mentions-legales/index.html | /mentions-legales/ | Emplacement conservé |
| /motifs/baton-rompu.html | /motifs/baton-rompu/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /motifs/index.html | /motifs/ | Emplacement conservé |
| /motifs/point-de-hongrie.html | /motifs/point-de-hongrie/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /motifs/pose-diagonale.html | /motifs/pose-diagonale/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /motifs/pose-droite.html | /motifs/pose-droite/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /motifs/pose-largeur.html | /motifs/pose-largeur/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /motifs/pose-longueur.html | /motifs/pose-longueur/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /outils/index.html | /outils/ | Emplacement conservé |
| /outils/simulateur-pose.html | /outils/simulateur-pose/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /outils/studio.html | /outils/studio/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /outils/visualiseur-produit.html | /outils/visualiseur-produit/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /outils/visualiseur.html | /outils/visualiseur/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /plan-du-site/index.html | /plan-du-site/ | Emplacement conservé |
| /projet/index.html | /projet/ | Emplacement conservé |
| /tutoriels/coller-un-parquet-contrecolle.html | /tutoriels/coller-un-parquet-contrecolle/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /tutoriels/index.html | /tutoriels/ | Emplacement conservé |
| /tutoriels/poser-un-parquet-flottant.html | /tutoriels/poser-un-parquet-flottant/ | Ancienne adresse conservée en compatibilité, canonical propre |
| /tutoriels/reussir-le-calepinage.html | /tutoriels/reussir-le-calepinage/ | Ancienne adresse conservée en compatibilité, canonical propre |

## Fichiers modifiés et générés

La liste ci-dessous comprend les suppressions d’anciens bundles remplacés par le nouveau répertoire d’empreinte, les alias conservés et les nouveaux index de dossiers. Elle ne correspond pas à une suppression de pages de contenu.

- `.github/workflows/deploy-pages.yml`
- `404.html`
- `_generator/build.js`
- `_generator/check-motifs.js`
- `_generator/check-seo.js`
- `_generator/layout.js`
- `_generator/routes.js`
- `_generator/seo-meta.json`
- `_generator/seo.js`
- `_generator/wordpress.js`
- `a-propos/index.html`
- `a-propos/methode-editoriale.html`
- `a-propos/methode-editoriale/index.html`
- `assets/dist/0760ce3877/components/project-form/project-form.config.js`
- `assets/dist/0760ce3877/components/project-form/project-form.js`
- `assets/dist/0760ce3877/js/analytics/events.js`
- `assets/dist/0760ce3877/js/animations/reveal.js`
- `assets/dist/0760ce3877/js/commerce/allure.js`
- `assets/dist/0760ce3877/js/commerce/partenaires.js`
- `assets/dist/0760ce3877/js/commerce/premibel-hotes.js`
- `assets/dist/0760ce3877/js/commerce/premibel.js`
- `assets/dist/0760ce3877/js/components/accordion.js`
- `assets/dist/0760ce3877/js/components/before-after.js`
- `assets/dist/0760ce3877/js/components/carousel.js`
- `assets/dist/0760ce3877/js/components/filters.js`
- `assets/dist/0760ce3877/js/components/hero-media.js`
- `assets/dist/0760ce3877/js/components/modal.js`
- `assets/dist/0760ce3877/js/components/nav.js`
- `assets/dist/0760ce3877/js/components/scroll-carousel.js`
- `assets/dist/0760ce3877/js/components/tabs.js`
- `assets/dist/0760ce3877/js/components/toc.js`
- `assets/dist/0760ce3877/js/components/tooltip.js`
- `assets/dist/0760ce3877/js/forms/api-config.js`
- `assets/dist/0760ce3877/js/forms/departements.js`
- `assets/dist/0760ce3877/js/forms/lead-context.js`
- `assets/dist/0760ce3877/js/forms/orientation.js`
- `assets/dist/0760ce3877/js/forms/plan-handoff.js`
- `assets/dist/0760ce3877/js/forms/project-payload.js`
- `assets/dist/0760ce3877/js/forms/studio-handoff.js`
- `assets/dist/0760ce3877/js/forms/submit-adapter.js`
- `assets/dist/0760ce3877/js/main.js`
- `assets/dist/0760ce3877/js/product/app.js`
- `assets/dist/0760ce3877/js/product/main.js`
- `assets/dist/0760ce3877/js/product/tour.js`
- `assets/dist/0760ce3877/js/product/viewport.js`
- `assets/dist/0760ce3877/js/scene/analyzer.js`
- `assets/dist/0760ce3877/js/scene/cadre-photo.js`
- `assets/dist/0760ce3877/js/scene/editor.js`
- `assets/dist/0760ce3877/js/scene/export.js`
- `assets/dist/0760ce3877/js/scene/geometry.js`
- `assets/dist/0760ce3877/js/scene/image-loader.js`
- `assets/dist/0760ce3877/js/scene/mask.js`
- `assets/dist/0760ce3877/js/scene/material.js`
- `assets/dist/0760ce3877/js/scene/motifs-regles.js`
- `assets/dist/0760ce3877/js/scene/perspective.js`
- `assets/dist/0760ce3877/js/scene/preview.js`
- `assets/dist/0760ce3877/js/scene/product.js`
- `assets/dist/0760ce3877/js/scene/relief.js`
- `assets/dist/0760ce3877/js/scene/renderer-canvas.js`
- `assets/dist/0760ce3877/js/scene/renderer-gl.js`
- `assets/dist/0760ce3877/js/scene/renderer.js`
- `assets/dist/0760ce3877/js/scene/scenes-regles.js`
- `assets/dist/0760ce3877/js/scene/schema.js`
- `assets/dist/0760ce3877/js/scene/shading.js`
- `assets/dist/0760ce3877/js/scene/texture-worker.js`
- `assets/dist/0760ce3877/js/scene/texture.js`
- `assets/dist/0760ce3877/js/scene/vitrine.js`
- `assets/dist/0760ce3877/js/studio/app.js`
- `assets/dist/0760ce3877/js/studio/catalog.js`
- `assets/dist/0760ce3877/js/studio/compare.js`
- `assets/dist/0760ce3877/js/studio/help.js`
- `assets/dist/0760ce3877/js/studio/main.js`
- `assets/dist/0760ce3877/js/tools/floor-visualizer.js`
- `assets/dist/0760ce3877/js/tools/patterns.js`
- `assets/dist/0760ce3877/js/tools/plan-state.js`
- `assets/dist/0760ce3877/js/tools/plan-teintes.js`
- `assets/dist/0760ce3877/js/utils/diagnostic.js`
- `assets/dist/0760ce3877/js/utils/dialog.js`
- `assets/dist/0760ce3877/js/utils/dom.js`
- `assets/dist/0760ce3877/js/utils/icons.js`
- `assets/dist/0760ce3877/js/utils/motion.js`
- `assets/dist/0760ce3877/js/utils/perf.js`
- `assets/dist/74c451dcd2/components/project-form/project-form.config.js`
- `assets/dist/74c451dcd2/components/project-form/project-form.js`
- `assets/dist/74c451dcd2/js/analytics/events.js`
- `assets/dist/74c451dcd2/js/animations/reveal.js`
- `assets/dist/74c451dcd2/js/commerce/allure.js`
- `assets/dist/74c451dcd2/js/commerce/partenaires.js`
- `assets/dist/74c451dcd2/js/commerce/premibel-hotes.js`
- `assets/dist/74c451dcd2/js/commerce/premibel.js`
- `assets/dist/74c451dcd2/js/components/accordion.js`
- `assets/dist/74c451dcd2/js/components/before-after.js`
- `assets/dist/74c451dcd2/js/components/carousel.js`
- `assets/dist/74c451dcd2/js/components/filters.js`
- `assets/dist/74c451dcd2/js/components/hero-media.js`
- `assets/dist/74c451dcd2/js/components/modal.js`
- `assets/dist/74c451dcd2/js/components/nav.js`
- `assets/dist/74c451dcd2/js/components/scroll-carousel.js`
- `assets/dist/74c451dcd2/js/components/tabs.js`
- `assets/dist/74c451dcd2/js/components/toc.js`
- `assets/dist/74c451dcd2/js/components/tooltip.js`
- `assets/dist/74c451dcd2/js/forms/api-config.js`
- `assets/dist/74c451dcd2/js/forms/departements.js`
- `assets/dist/74c451dcd2/js/forms/lead-context.js`
- `assets/dist/74c451dcd2/js/forms/orientation.js`
- `assets/dist/74c451dcd2/js/forms/plan-handoff.js`
- `assets/dist/74c451dcd2/js/forms/project-payload.js`
- `assets/dist/74c451dcd2/js/forms/studio-handoff.js`
- `assets/dist/74c451dcd2/js/forms/submit-adapter.js`
- `assets/dist/74c451dcd2/js/main.js`
- `assets/dist/74c451dcd2/js/product/app.js`
- `assets/dist/74c451dcd2/js/product/main.js`
- `assets/dist/74c451dcd2/js/product/tour.js`
- `assets/dist/74c451dcd2/js/product/viewport.js`
- `assets/dist/74c451dcd2/js/scene/analyzer.js`
- `assets/dist/74c451dcd2/js/scene/cadre-photo.js`
- `assets/dist/74c451dcd2/js/scene/editor.js`
- `assets/dist/74c451dcd2/js/scene/export.js`
- `assets/dist/74c451dcd2/js/scene/geometry.js`
- `assets/dist/74c451dcd2/js/scene/image-loader.js`
- `assets/dist/74c451dcd2/js/scene/mask.js`
- `assets/dist/74c451dcd2/js/scene/material.js`
- `assets/dist/74c451dcd2/js/scene/motifs-regles.js`
- `assets/dist/74c451dcd2/js/scene/perspective.js`
- `assets/dist/74c451dcd2/js/scene/preview.js`
- `assets/dist/74c451dcd2/js/scene/product.js`
- `assets/dist/74c451dcd2/js/scene/relief.js`
- `assets/dist/74c451dcd2/js/scene/renderer-canvas.js`
- `assets/dist/74c451dcd2/js/scene/renderer-gl.js`
- `assets/dist/74c451dcd2/js/scene/renderer.js`
- `assets/dist/74c451dcd2/js/scene/scenes-regles.js`
- `assets/dist/74c451dcd2/js/scene/schema.js`
- `assets/dist/74c451dcd2/js/scene/shading.js`
- `assets/dist/74c451dcd2/js/scene/texture-worker.js`
- `assets/dist/74c451dcd2/js/scene/texture.js`
- `assets/dist/74c451dcd2/js/scene/vitrine.js`
- `assets/dist/74c451dcd2/js/studio/app.js`
- `assets/dist/74c451dcd2/js/studio/catalog.js`
- `assets/dist/74c451dcd2/js/studio/compare.js`
- `assets/dist/74c451dcd2/js/studio/help.js`
- `assets/dist/74c451dcd2/js/studio/main.js`
- `assets/dist/74c451dcd2/js/tools/floor-visualizer.js`
- `assets/dist/74c451dcd2/js/tools/patterns.js`
- `assets/dist/74c451dcd2/js/tools/plan-state.js`
- `assets/dist/74c451dcd2/js/tools/plan-teintes.js`
- `assets/dist/74c451dcd2/js/utils/diagnostic.js`
- `assets/dist/74c451dcd2/js/utils/dialog.js`
- `assets/dist/74c451dcd2/js/utils/dom.js`
- `assets/dist/74c451dcd2/js/utils/icons.js`
- `assets/dist/74c451dcd2/js/utils/motion.js`
- `assets/dist/74c451dcd2/js/utils/perf.js`
- `backend/pose-parquet-core/src/Contenus/Edition.php`
- `backend/pose-parquet-core/src/Contenus/Listes.php`
- `blog/index.html`
- `confidentialite/index.html`
- `contact/index.html`
- `data/apercu/article.tpl`
- `data/apercu/guide.tpl`
- `data/apercu/tutoriel.tpl`
- `data/contenus.json`
- `guides/erreurs-a-eviter-avant-de-poser.html`
- `guides/erreurs-a-eviter-avant-de-poser/index.html`
- `guides/index.html`
- `guides/parquet-massif-ou-contrecolle.html`
- `guides/parquet-massif-ou-contrecolle/index.html`
- `guides/point-de-hongrie-ou-baton-rompu.html`
- `guides/point-de-hongrie-ou-baton-rompu/index.html`
- `guides/poser-parquet-sens-de-la-lumiere.html`
- `guides/poser-parquet-sens-de-la-lumiere/index.html`
- `guides/preparer-son-sol-avant-la-pose.html`
- `guides/preparer-son-sol-avant-la-pose/index.html`
- `guides/quel-sens-de-pose-choisir.html`
- `guides/quel-sens-de-pose-choisir/index.html`
- `guides/sens-de-pose-couloir.html`
- `guides/sens-de-pose-couloir/index.html`
- `guides/sens-de-pose-piece-etroite.html`
- `guides/sens-de-pose-piece-etroite/index.html`
- `index.html`
- `inspiration/index.html`
- `js/forms/orientation.js`
- `js/product/app.js`
- `js/studio/app.js`
- `maintenance.html`
- `mentions-legales/index.html`
- `motifs/baton-rompu.html`
- `motifs/baton-rompu/index.html`
- `motifs/index.html`
- `motifs/point-de-hongrie.html`
- `motifs/point-de-hongrie/index.html`
- `motifs/pose-diagonale.html`
- `motifs/pose-diagonale/index.html`
- `motifs/pose-droite.html`
- `motifs/pose-droite/index.html`
- `motifs/pose-largeur.html`
- `motifs/pose-largeur/index.html`
- `motifs/pose-longueur.html`
- `motifs/pose-longueur/index.html`
- `outils/index.html`
- `outils/simulateur-pose.html`
- `outils/simulateur-pose/index.html`
- `outils/studio.html`
- `outils/studio/index.html`
- `outils/visualiseur-produit.html`
- `outils/visualiseur-produit/index.html`
- `outils/visualiseur.html`
- `outils/visualiseur/index.html`
- `plan-du-site/index.html`
- `projet/index.html`
- `robots.txt`
- `sitemap.xml`
- `tutoriels/coller-un-parquet-contrecolle.html`
- `tutoriels/coller-un-parquet-contrecolle/index.html`
- `tutoriels/index.html`
- `tutoriels/poser-un-parquet-flottant.html`
- `tutoriels/poser-un-parquet-flottant/index.html`
- `tutoriels/reussir-le-calepinage.html`
- `tutoriels/reussir-le-calepinage/index.html`

## Maintenance des métadonnées

Les 33 métadonnées imposées par cette mission sont centralisées dans `_generator/seo-meta.json` et prioritaires sur les anciens champs SEO de l’instantané WordPress. Pour les modifier ensuite, changer cette configuration. Les textes visibles et les champs de contenu WordPress continuent d’alimenter normalement le site. Cette séparation doit être prise en compte dans le futur processus éditorial.

## Documents de validation

- `docs/seo-geo/README.md` : présent rapport.
- `docs/seo-geo/pages.json` : tableau des 35 pages principales.
- `docs/seo-geo/validation.json` : résultats des contrôles et du navigateur.
- `docs/seo-geo/apercu-mobile.jpg` : contrôle visuel d’une page sur sa nouvelle URL.

![Méthode éditoriale sur URL propre, mobile](apercu-mobile.jpg)
