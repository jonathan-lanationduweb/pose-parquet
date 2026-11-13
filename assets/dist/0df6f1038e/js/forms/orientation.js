import { DEVIS as ALLURE_DEVIS } from '../commerce/allure.js';


const A_LA_ZONE = 'à Paris et en Île-de-France';
import { urlPremibel } from '../commerce/premibel-hotes.js';



export const PREMIBEL_CATALOGUE = 'https://www.premibel.fr/parquet/';



function liensRegles(l = {}) {
  return {
    premibelUrl: urlPremibel(l.premibelUrl || '') || PREMIBEL_CATALOGUE,
    premibelActif: l.premibelActif !== false,
    allureActif: l.allureActif !== false,
  };
}


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



function produitPremibel(produit) {
  if (!produit || !produit.id) return null;
  const url = urlPremibel(produit.url || '');
  return url ? { ...produit, url } : null;
}


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

    cta: !liens.premibelActif
      ? null
      : p
        ? { libelle: mixte ? 'Voir mon parquet chez Premibel' : 'Voir ce parquet chez Premibel', url: p.url }
        : { libelle: 'Découvrir les parquets Premibel', url: liens.premibelUrl },
  };
}


function etapeAllure({ numero, titre, liens }) {
  return {
    numero,
    cible: 'allure_design',
    entreprise: 'Allure Design',
    titre: titre || 'Faire poser ou rénover',
    texte: `Pose de parquet, rénovation et aménagement intérieur, ${A_LA_ZONE}. Leur page de demande de devis vous permet de décrire le chantier directement.`,

    cta: liens.allureActif ? { libelle: 'Continuer avec Allure Design', url: ALLURE_DEVIS } : null,
  };
}



export function orientation({ destination, besoin, idf, produit = null, liens: reglages } = {}) {
  const liens = liensRegles(reglages);
  switch (destination) {
    case 'premibel': {



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

        prochaine: horsZone
          ? 'Pour la pose, adressez-vous à un poseur de votre région. Pour le parquet, Premibel.'
          : 'Précisez ce que vous cherchez d’abord — le parquet ou la pose — pour obtenir une orientation nette.',
        preciser: true,
      };
    }
  }
}



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



export function lienVisualiseur(base, { sceneId, productId, pattern, angle } = {}) {
  const params = new URLSearchParams();
  if (sceneId) params.set('piece', sceneId);
  if (productId) params.set('parquet', productId);
  if (pattern) params.set('motif', pattern);
  if (Number.isInteger(angle)) params.set('orientation', String(angle));
  const q = params.toString();
  return `${base}outils/studio/${q ? `?${q}` : ''}`;
}


export function evenementClic(cible) {
  return cible === 'premibel' ? 'click_premibel' : 'click_allure_design';
}



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
