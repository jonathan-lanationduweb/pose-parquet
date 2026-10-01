/**
 * Quels motifs un parquet accepte. La règle, une seule fois.
 *
 * Fonctions pures, aucune importation, aucun DOM : ce fichier est lu par
 * l'interface, par le moteur, et par les contrôles de construction.
 *
 * -----------------------------------------------------------------------------
 * LA RÈGLE
 * -----------------------------------------------------------------------------
 *
 * Elle ne s'invente pas et ne se déduit pas d'un nom de produit : elle est
 * DANS LA DONNÉE, et nulle part ailleurs.
 *
 *   compatiblePatterns   les motifs réellement disponibles pour cette
 *                        référence. Une liste vide veut dire « aucun » — pas
 *                        « tous », et c'est la distinction qui compte ;
 *   defaultPattern       celui proposé à l'ouverture, toujours membre de la
 *                        liste (garanti par `normalizeProduct`).
 *
 * Une dalle Versailles de 800 × 800 mm porte un motif interne que le moteur ne
 * sait pas poser : sa liste est vide, et elle est écartée du visualiseur. Un
 * point de Hongrie Premibel est vendu EN point de Hongrie : sa liste ne
 * contient que lui. Poser l'un en lames droites n'est pas une option
 * d'affichage, c'est un produit qui n'existe pas.
 *
 * -----------------------------------------------------------------------------
 * DEUX COUCHES, ET POURQUOI DEUX
 * -----------------------------------------------------------------------------
 *
 * L'interface grise ce qu'on ne peut pas choisir : c'est ce qui rend la règle
 * compréhensible. Mais une interface se contourne — une URL forgée, un appel
 * à `window.__studio.setPattern()`, un état sauvegardé dans le navigateur
 * avant que le catalogue ne change. Le moteur applique donc la MÊME règle, en
 * dernier ressort, par `motifEffectif()` : il ne peut pas dessiner un parquet
 * qui n'existe pas, même si on le lui demande.
 *
 * La première couche explique. La seconde garantit.
 *
 * -----------------------------------------------------------------------------
 * CE QUE CE MODULE NE COUVRE PAS
 * -----------------------------------------------------------------------------
 *
 * Le Mode Plan (`js/tools/floor-visualizer.js`) et ses cinq motifs. Il ne
 * dessine aucune référence réelle : c'est un plan de calepinage, pas un
 * produit. Rien ici ne s'y applique.
 */

/** Les motifs que le moteur sait poser, dans l'ordre d'affichage. */
export const MOTIFS_CONNUS = ['lames', 'point-de-hongrie', 'baton-rompu'];

/** Ce motif existe-t-il, indépendamment de tout produit ? */
export const motifConnu = (motif) => typeof motif === 'string' && MOTIFS_CONNUS.includes(motif);

/**
 * La liste des motifs d'un matériau, toujours un tableau.
 *
 * Un matériau sans `compatiblePatterns` rend une liste VIDE, jamais la liste
 * complète. Un champ absent est une information manquante, pas une
 * permission : présumer l'inverse reviendrait à fabriquer une compatibilité
 * que personne n'a vérifiée.
 */
export function motifsDe(material) {
  const liste = material && material.compatiblePatterns;
  return Array.isArray(liste) ? liste.filter(motifConnu) : [];
}

/**
 * Ce matériau accepte-t-il ce motif ?
 *
 * Sans matériau, on répond oui pour les motifs connus : c'est l'état de
 * l'interface avant qu'une référence ne soit choisie, et rien n'y est encore
 * rendu.
 *
 * @param {object|null} material
 * @param {string} motif
 * @returns {boolean}
 */
export function motifAutorise(material, motif) {
  if (!motifConnu(motif)) return false;
  if (!material) return true;
  return motifsDe(material).includes(motif);
}

/**
 * Le motif par défaut d'un matériau, garanti utilisable.
 *
 * `defaultPattern` est censé appartenir à `compatiblePatterns` — c'est
 * `normalizeProduct` qui l'assure. On ne s'y fie pas pour autant : un
 * matériau de démonstration écrit à la main, ou une donnée qui vieillit, peut
 * démentir la garantie. On retombe alors sur le premier motif disponible.
 *
 * @returns {string|null} `null` si le matériau n'accepte aucun motif
 */
export function motifParDefaut(material) {
  const disponibles = motifsDe(material);
  if (!disponibles.length) return null;
  const demande = material && material.defaultPattern;
  return disponibles.includes(demande) ? demande : disponibles[0];
}

/**
 * LE POINT DE PASSAGE DU MOTEUR : le motif réellement posé.
 *
 * Remplace le `config.pattern || material.defaultPattern` qui traînait en
 * quatre endroits et qui acceptait n'importe quelle valeur — y compris un
 * motif que la référence ne propose pas, y compris une chaîne inventée.
 *
 * Rend toujours un motif utilisable, ou `null` si la référence n'en accepte
 * aucun. L'appelant n'a jamais à vérifier après coup.
 *
 * @param {object} material
 * @param {string|null|undefined} motif celui demandé
 * @returns {string|null}
 */
export function motifEffectif(material, motif) {
  return motifAutorise(material, motif) ? motif : motifParDefaut(material);
}

/**
 * Une configuration dont le motif est garanti possible.
 *
 * Utilisée partout où une configuration ARRIVE de l'extérieur : lien profond,
 * état repris du navigateur, version enregistrée dans le comparateur,
 * passage depuis l'accueil ou l'inspiration. Le motif est normalisé, et
 * `adapte` dit s'il a fallu le faire — c'est ce qui permet de le signaler à
 * l'utilisateur au lieu de changer son choix en silence.
 *
 * @param {object} config configuration portant `pattern`
 * @param {object|null} material le matériau visé
 * @returns {{config: object, adapte: boolean, demande: string|null}}
 */
export function normaliserConfig(config, material) {
  const demande = config && config.pattern;
  const retenu = motifEffectif(material, demande);
  const adapte = Boolean(material) && retenu !== demande;
  return {
    config: adapte ? { ...config, pattern: retenu } : config,
    adapte,
    demande: demande || null,
  };
}

/**
 * Pourquoi ce motif n'est pas proposé, en une phrase, pour l'interface.
 *
 * Dire « indisponible » sans dire pour quoi laisse croire à une panne. Nommer
 * la référence transforme un blocage en information : ce motif existe, ce
 * produit-là ne se pose pas comme ça.
 *
 * @param {object} material
 * @param {string} nomDuMotif libellé lisible, ex. « Point de Hongrie »
 * @returns {string}
 */
export function raisonIndisponible(material, nomDuMotif) {
  const nom = (material && material.name) || 'ce parquet';
  if (!motifsDe(material).length) {
    return `${nomDuMotif} : ce motif n’est pas disponible pour ${nom}.`;
  }
  return `${nomDuMotif} : non disponible pour ${nom}.`;
}

/**
 * Comment dire, discrètement, qu'on a adapté le motif.
 *
 * Une seule phrase, dans la zone de statut existante. Pas de fenêtre
 * modale, pas de notification qui recouvre l'image : l'utilisateur vient de
 * choisir un parquet, il regarde le sol, pas un message.
 *
 * @param {object} material
 * @param {string} nomDuMotifRetenu
 * @returns {string}
 */
export function messageAdaptation(material, nomDuMotifRetenu) {
  const nom = (material && material.name) || 'Ce parquet';
  const seul = motifsDe(material).length === 1;
  const motif = enMinusculeInitiale(nomDuMotifRetenu);
  return seul
    ? `${nom} se pose en ${motif} uniquement : le motif a été adapté.`
    : `${nom} ne propose pas le motif précédent : passé en ${motif}.`;
}

/**
 * Un libellé de motif inséré au milieu d'une phrase.
 *
 * Seule la PREMIÈRE lettre passe en minuscule. Un `toLowerCase()` complet
 * donnait « se pose en point de hongrie uniquement » : la Hongrie est un pays,
 * elle garde sa majuscule. « Bâton rompu » et « Lames droites », eux,
 * n'en ont pas besoin.
 */
function enMinusculeInitiale(libelle) {
  const texte = String(libelle || '');
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}
