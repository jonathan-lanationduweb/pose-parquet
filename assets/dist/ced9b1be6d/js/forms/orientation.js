/**
 * La fin du parcours « Décrivez votre projet » : une ORIENTATION, pas un
 * accusé de réception.
 *
 * Pose-Parquet n'est pas une troisième entreprise qui reçoit des demandes et
 * rappelle : il comprend le projet, puis montre vers qui se tourner.
 *
 *   parquet                         → Premibel
 *   pose / rénovation, Île-de-France → Allure Design
 *   parquet + pose, Île-de-France    → Premibel ET Allure Design
 *   le reste                         → une précision, jamais un envoi au hasard
 *
 * La destination elle-même est décidée ailleurs, par la règle validée
 * (`destinationRecommandee`, js/forms/lead-context.js). Ce module ne fait que
 * la PRÉSENTER : textes, ordre des étapes, liens. Il est pur — aucun DOM —
 * pour être contrôlé par _generator/check-orientation.js.
 *
 * Vocabulaire : « nous vous orientons vers », jamais « votre demande a été
 * transmise », « nous vous rappellerons » ni « X vous contactera ». Aucune
 * demande ne part chez Premibel ou Allure Design : le visiteur y va lui-même,
 * par un lien. Écrire le contraire serait une promesse que personne ne tient.
 */
import { DEVIS as ALLURE_DEVIS } from '../commerce/allure.js';

/** La zone d'Allure Design, dans une phrase (« à Paris et en Île-de-France »). */
const A_LA_ZONE = 'à Paris et en Île-de-France';
import { urlPremibel } from '../commerce/premibel-hotes.js';

/**
 * Le catalogue Premibel (vérifié le 06/10/2026 : « Parquet Massif & Contrecollé :
 * Achat en Ligne »). Adresse de REPLI seulement : la page /projet/ fournit
 * l'adresse générale réglée dans WordPress (Mon site → Liens commerciaux),
 * c'est elle qui sert quand aucune référence précise n'est connue.
 */
export const PREMIBEL_CATALOGUE = 'https://www.premibel.fr/parquet/';

/**
 * Les liens commerciaux réglés dans WordPress, lus sur la page (attributs
 * data-* du formulaire, écrits par le build depuis Mon site). Une adresse qui
 * n'est pas sur un domaine Premibel officiel est ignorée.
 *
 * @param {{premibelUrl?:string, premibelActif?:boolean, allureActif?:boolean}} [l]
 */
function liensRegles(l = {}) {
  return {
    premibelUrl: urlPremibel(l.premibelUrl || '') || PREMIBEL_CATALOGUE,
    premibelActif: l.premibelActif !== false,
    allureActif: l.allureActif !== false,
  };
}

/** Libellés lisibles des réponses du formulaire (project-form.config.js). */
export const LIBELLES = {
  besoin: {
    produit: 'Trouver un parquet',
    pose: 'Faire poser un parquet',
    'produit-pose': 'Parquet + pose',
    renovation: 'Rénovation / aménagement',
    renseignement: 'Se renseigner',
    indetermine: 'Pas encore décidé',
  },
  piece: {
    sejour: 'Séjour',
    chambre: 'Chambre',
    cuisine: 'Cuisine',
    couloir: 'Couloir',
    plusieurs: 'Plusieurs pièces',
    autre: 'Autre pièce',
  },
  parquet: { massif: 'Massif', contrecolle: 'Contrecollé', autre: 'Autre' },
  orientation: {
    longueur: 'Lames dans la longueur',
    largeur: 'Lames dans la largeur',
    diagonale: 'Lames en diagonale',
    'point-de-hongrie': 'Point de Hongrie',
    'baton-rompu': 'Bâton rompu',
  },
  motif: { lames: 'Lames droites', 'point-de-hongrie': 'Point de Hongrie', 'baton-rompu': 'Bâton rompu' },
  delai: {
    urgent: 'Au plus vite',
    mois: 'Moins d’un mois',
    '1-3-mois': '1 à 3 mois',
    'plus-tard': 'Plus tard',
    renseignement: 'Je me renseigne',
  },
};

/**
 * Le parquet choisi dans le Visualiseur, s'il a une fiche Premibel.
 * L'adresse n'est retenue que si elle est sur un domaine Premibel officiel.
 *
 * @param {{id?:string, nom?:string, url?:string, motif?:string}|null} produit
 */
function produitPremibel(produit) {
  if (!produit || !produit.id) return null;
  const url = urlPremibel(produit.url || '');
  return url ? { ...produit, url } : null;
}

/** Bloc « Premibel » : une référence précise si on la connaît, l'adresse générale sinon. */
function etapePremibel({ numero, produit, titre, liens, mixte = false }) {
  const p = produitPremibel(produit);
  return {
    numero,
    cible: 'premibel',
    entreprise: 'Premibel',
    titre: titre || 'Trouver votre parquet',
    texte: p
      ? 'La référence que vous avez essayée dans le Visualiseur est vendue par Premibel : sa fiche donne le prix, les dimensions et la disponibilité.'
      : 'D’après vos réponses, votre besoin concerne d’abord le choix du parquet. Premibel vend les références que vous pouvez essayer dans le Visualiseur.',
    produit: p ? { id: p.id, sku: p.sku || p.id, nom: p.nom || p.id, motif: p.motif || null, vignette: p.vignette || null } : null,
    // Lien masqué si Premibel est désactivé dans Mon site : le rôle reste dit, sans lien.
    cta: !liens.premibelActif
      ? null
      : p
        ? { libelle: mixte ? 'Voir mon parquet chez Premibel' : 'Voir ce parquet chez Premibel', url: p.url }
        : { libelle: 'Découvrir les parquets Premibel', url: liens.premibelUrl },
  };
}

/** Bloc « Allure Design » : la pose et la rénovation, en Île-de-France seulement. */
function etapeAllure({ numero, titre, liens }) {
  return {
    numero,
    cible: 'allure_design',
    entreprise: 'Allure Design',
    titre: titre || 'Faire poser ou rénover',
    texte: `Pose de parquet, rénovation et aménagement intérieur, ${A_LA_ZONE}. Leur page de demande de devis vous permet de décrire le chantier directement.`,
    // La page de devis officielle (vérifiée le 06/10/2026 : « Demande de Devis | Allure Design »).
    cta: liens.allureActif ? { libelle: 'Continuer avec Allure Design', url: ALLURE_DEVIS } : null,
  };
}

/**
 * Ce que l'écran de fin doit montrer.
 *
 * @param {object} p
 * @param {string} p.destination  premibel | allure_design | mixed | undetermined
 * @param {string} p.besoin       besoin RETENU (lead_need)
 * @param {boolean} p.idf         département en Île-de-France
 * @param {object|null} [p.produit] { id, sku, nom, url, motif, vignette } venu du Visualiseur
 * @param {object} [p.liens]        liens commerciaux réglés dans WordPress (Mon site)
 * @returns {{destination:string, titre:string, intro:string, etapes:object[], note:string|null, prochaine:string, preciser:boolean}}
 */
export function orientation({ destination, besoin, idf, produit = null, liens: reglages } = {}) {
  const liens = liensRegles(reglages);
  switch (destination) {
    case 'premibel': {
      // Parquet + pose hors Île-de-France : la règle validée oriente vers le
      // produit, et la pose reste à trouver. On le dit, au lieu de laisser
      // croire que tout le projet est couvert.
      const poseHorsZone = besoin === 'produit-pose' && !idf;
      return {
        destination,
        titre: 'Voici comment avancer.',
        intro: poseHorsZone
          ? 'Nous vous orientons vers Premibel pour le parquet. La pose, elle, se fait hors de la zone d’Allure Design.'
          : 'D’après vos réponses, votre besoin concerne principalement le choix de votre parquet : nous vous orientons vers Premibel.',
        etapes: [etapePremibel({ numero: 1, produit, liens })],
        note: poseHorsZone
          ? `Allure Design intervient ${A_LA_ZONE} : votre département n’en fait pas partie. Pour la pose, adressez-vous à un poseur de votre région.`
          : null,
        prochaine: 'Continuez chez Premibel.',
        preciser: false,
      };
    }

    case 'allure_design':
      return {
        destination,
        titre: 'Voici comment avancer.',
        intro: 'D’après vos réponses, votre projet porte sur la pose ou la rénovation, en Île-de-France : nous vous orientons vers Allure Design.',
        etapes: [etapeAllure({ numero: 1, liens })],
        note: null,
        prochaine: 'Continuez avec Allure Design.',
        preciser: false,
      };

    case 'mixed':
      return {
        destination,
        titre: 'Voici comment avancer, en deux étapes.',
        intro: 'Le parquet et sa pose sont deux métiers. Pose-Parquet a préparé votre parcours : Premibel pour le choix du parquet, Allure Design pour le chantier en Île-de-France.',
        etapes: [
          etapePremibel({ numero: 1, produit, titre: 'Choisir le parquet', liens, mixte: true }),
          etapeAllure({ numero: 2, titre: 'Faire réaliser le projet', liens }),
        ],
        note: null,
        prochaine: 'Commencez par le parquet chez Premibel, puis préparez la pose avec Allure Design.',
        preciser: false,
      };

    default: {
      /*
       * Rien de certain : on n'envoie pas au hasard. On explique ce qui
       * manque, et on ne propose que ce qui est vrai pour CE projet : Allure
       * Design n'apparaît que si le chantier est en Île-de-France.
       */
      const horsZone = (besoin === 'pose' || besoin === 'renovation') && !idf;
      const etapes = [etapePremibel({ numero: 1, produit, titre: 'Si vous cherchez d’abord un parquet', liens })];
      if (idf && !horsZone) etapes.push(etapeAllure({ numero: 2, titre: 'Si vous cherchez un poseur', liens }));
      return {
        destination: 'undetermined',
        titre: 'Votre projet demande encore une précision.',
        intro: horsZone
          ? `La pose et la rénovation que nous pouvons recommander se font ${A_LA_ZONE}, et votre département n’en fait pas partie. Le choix du parquet, lui, ne dépend pas de votre région.`
          : 'Vous n’avez pas encore tranché entre le parquet et la pose. Selon ce que vous cherchez d’abord, voici vers qui vous tourner — ou précisez votre besoin.',
        etapes,
        note: null,
        // Ce que le visiteur peut faire MAINTENANT, selon ce qu'il a répondu.
        prochaine: horsZone
          ? 'Pour la pose, adressez-vous à un poseur de votre région. Pour le parquet, Premibel.'
          : 'Précisez ce que vous cherchez d’abord — le parquet ou la pose — pour obtenir une orientation nette.',
        preciser: true,
      };
    }
  }
}

/**
 * Récapitulatif du projet : seulement les réponses connues et parlantes.
 * « Je ne sais pas » et les champs vides n'apparaissent pas.
 *
 * @returns {{libelle:string, valeur:string}[]}
 */
export function recapitulatif({ besoin, piece, surface, parquet, orientation: sens, produitNom, motif, angle, departement, region, idf, delai } = {}) {
  const lignes = [];
  const ajouter = (libelle, valeur) => { if (valeur) lignes.push({ libelle, valeur }); };
  ajouter('Besoin', LIBELLES.besoin[besoin]);
  ajouter('Pièce', LIBELLES.piece[piece]);
  ajouter('Surface', Number(surface) > 0 ? `${Number(surface)} m²` : '');
  ajouter('Parquet', produitNom || LIBELLES.parquet[parquet]);
  ajouter('Motif', LIBELLES.motif[motif] || LIBELLES.orientation[sens]);
  ajouter('Orientation', Number.isInteger(angle) ? `${angle}°` : '');
  if (departement) ajouter('Zone', idf ? `Île-de-France (${departement})` : region ? `${region} (${departement})` : `Département ${departement}`);
  ajouter('Délai', LIBELLES.delai[delai]);
  return lignes;
}

/**
 * Lien de retour vers le Visualiseur, avec la configuration préparée.
 * Jamais la photo : elle n'a pas quitté le navigateur, il n'y a rien à reprendre.
 */
export function lienVisualiseur(base, { sceneId, productId, pattern, angle } = {}) {
  const params = new URLSearchParams();
  if (sceneId) params.set('piece', sceneId);
  if (productId) params.set('parquet', productId);
  if (pattern) params.set('motif', pattern);
  if (Number.isInteger(angle)) params.set('orientation', String(angle));
  const q = params.toString();
  return `${base}outils/studio.html${q ? `?${q}` : ''}`;
}

/** Nom de l'événement d'un clic sortant, selon l'entreprise visée. */
export function evenementClic(cible) {
  return cible === 'premibel' ? 'click_premibel' : 'click_allure_design';
}

/**
 * Contexte NON PERSONNEL d'un clic sortant, pour mesurer le parcours
 * Entrée → Visualiseur → Projet → orientation → clic.
 */
export function contexteClic({ cible, besoin, destination, produit, motif, origine, idf, page }) {
  const p = produitPremibel(produit);
  const details = { contexte: 'orientation', page: page || '/projet/', besoin: besoin || '', destination: destination || '', motif: motif || '', origine: origine || '', idf: idf === true ? 'oui' : idf === false ? 'non' : '' };
  if (cible === 'premibel' && p) {
    details.productId = p.id;
    details.sku = p.sku || p.id;
  }
  return details;
}

export default { PREMIBEL_CATALOGUE, LIBELLES, orientation, recapitulatif, lienVisualiseur, contexteClic, evenementClic };
