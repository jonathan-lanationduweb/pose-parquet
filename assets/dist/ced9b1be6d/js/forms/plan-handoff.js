/**
 * La reprise du formulaire projet par lien — dont le Mode Plan est le principal client.

 *
 * Le fichier garde son nom parce que le Mode Plan reste ce qui l'alimente le
 * plus, mais la convention qu'il porte sert à tout lien interne qui veut
 * pré-remplir le formulaire sans le remplir à la place de la personne : le
 * calepinage, et les tutoriels de pose qui proposent de confier le chantier.
 *
 * Les trois paramètres portent le nom du CHAMP de formulaire qu'ils
 * pré-remplissent — `pose`, `surface`, `besoin` — et leurs valeurs sont
 * exactement celles que les boutons radio proposent. Aucune traduction à
 * écrire, donc aucune à laisser vieillir.
 *
 * -----------------------------------------------------------------------------
 * POURQUOI UN MODULE DISTINCT DE `studio-handoff.js`
 * -----------------------------------------------------------------------------
 *
 * Les deux outils ne décrivent pas la même chose, et les confondre produirait
 * des données fausses.
 *
 * Le Studio pose une RÉFÉRENCE sur une PHOTOGRAPHIE : il parle de parquets
 * réels, de scènes, et son `orientation` est un angle de rendu en degrés. Le
 * Mode Plan dessine un CALEPINAGE : il ne connaît aucune référence, aucune
 * photographie, et son `pattern` est un sens de pose choisi par la personne.
 *
 * Faire passer un calepinage par la convention du Studio aurait rempli
 * `product_id` avec rien, `scene_id` avec rien, et `orientation` — un angle —
 * avec « diagonale ». Deux conventions, deux fichiers.
 *
 * -----------------------------------------------------------------------------
 * LA CORRESPONDANCE, ET POURQUOI IL N'Y EN A PAS BESOIN
 * -----------------------------------------------------------------------------
 *
 * Les cinq motifs du Mode Plan portent exactement les identifiants des cinq
 * premières réponses du champ « Motif ou orientation souhaités » du
 * formulaire :
 *
 *   longueur  largeur  diagonale  point-de-hongrie  baton-rompu
 *
 * Il n'y a donc aucune table de traduction à écrire, et surtout aucune à
 * laisser vieillir. C'est vérifié à la construction par
 * `_generator/check-motifs.js`.
 *
 * -----------------------------------------------------------------------------
 * CE QUI VOYAGE
 * -----------------------------------------------------------------------------
 *
 *   pose      le sens de pose choisi        diagonale
 *   surface   la surface calculée, en m²    24
 *
 * Deux valeurs, parce que ce sont les deux seules que la personne a réellement
 * décidées et que le formulaire redemanderait. La largeur de lame, la position
 * de la fenêtre, le taux de chutes restent dans l'outil : le formulaire ne les
 * demande pas, et les transmettre pour qu'ils dorment en base n'aiderait
 * personne.
 *
 * La surface est ARRONDIE À L'ENTIER. Le formulaire attend un entier, et
 * 23,4 m² relevés sur un plan dessiné au curseur ne prétendent pas à la
 * décimale.
 */

/** Noms des paramètres d'URL. La seule liste qui fasse foi. */
export const PARAMS = {
  pose: 'pose',
  surface: 'surface',
  besoin: 'besoin',
};

/**
 * Les réponses du champ « De quoi avez-vous besoin ? ».
 *
 * Recopiées ici plutôt qu'importées de la configuration du formulaire, pour
 * la même raison que `POSES` : ce module est lu par des pages qui n'ont pas
 * à charger la configuration complète du formulaire. `check-motifs.js`
 * vérifie que les deux listes coïncident.
 */
export const BESOINS = ['produit', 'pose', 'produit-pose', 'renovation', 'indetermine'];

/**
 * Les sens de pose que le Mode Plan et le formulaire partagent.
 *
 * Écrits ici plutôt qu'importés de `js/tools/patterns.js` : ce module est lu
 * par le formulaire, qui n'a aucune raison de charger l'outil de calepinage
 * pour valider deux chaînes. La liste est courte, stable, et un contrôle de
 * construction vérifie que les deux disent la même chose.
 */
export const POSES = ['longueur', 'largeur', 'diagonale', 'point-de-hongrie', 'baton-rompu'];

/** Bornes du champ surface, celles du serveur. */
export const SURFACE_MIN = 1;
export const SURFACE_MAX = 2000;

/**
 * Fabrique la requête, côté Mode Plan.
 *
 * Chaque valeur n'est écrite que si elle est exploitable. Une surface hors
 * bornes ne part pas : le formulaire la refuserait, et un champ prérempli
 * refusé est pire qu'un champ vide — la personne doit corriger une erreur
 * qu'elle n'a pas commise.
 *
 * @param {object} etat
 * @param {string} [etat.pose]    sens de pose choisi
 * @param {number} [etat.surface] surface en m²
 * @param {string} [etat.besoin]  besoin pré-sélectionné, s'il est connu du contexte
 * @returns {URLSearchParams}
 */
export function buildPlanParams({ pose, surface, besoin } = {}) {
  const params = new URLSearchParams();

  if (POSES.includes(pose)) params.set(PARAMS.pose, pose);
  if (BESOINS.includes(besoin)) params.set(PARAMS.besoin, besoin);

  const m2 = Math.round(Number(surface));
  if (Number.isFinite(m2) && m2 >= SURFACE_MIN && m2 <= SURFACE_MAX) {
    params.set(PARAMS.surface, String(m2));
  }

  return params;
}

/**
 * Relit la requête, côté formulaire.
 *
 * Toute valeur douteuse devient `null`, et le champ correspondant reste vide.
 *
 * @param {URLSearchParams} params
 * @returns {{pose: string|null, surface: number|null, besoin: string|null, present: boolean}}
 */
export function readPlanParams(params) {
  const pose = (params.get(PARAMS.pose) || '').trim();
  const besoin = (params.get(PARAMS.besoin) || '').trim();
  const brut = params.get(PARAMS.surface);

  let surface = null;
  if (brut !== null && brut.trim() !== '') {
    const m2 = Number.parseInt(brut, 10);
    if (Number.isFinite(m2) && m2 >= SURFACE_MIN && m2 <= SURFACE_MAX) surface = m2;
  }

  return {
    pose: POSES.includes(pose) ? pose : null,
    besoin: BESOINS.includes(besoin) ? besoin : null,
    surface,
    // On regarde les paramètres BRUTS : quelqu'un qui arrive avec une surface
    // hors bornes vient bel et bien du Mode Plan, même si la valeur est
    // écartée.
    present: Boolean(pose || brut || besoin),
  };
}

export default { PARAMS, POSES, BESOINS, SURFACE_MIN, SURFACE_MAX, buildPlanParams, readPlanParams };
