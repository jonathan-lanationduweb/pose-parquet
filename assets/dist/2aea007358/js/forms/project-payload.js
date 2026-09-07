/**
 * Traduction du formulaire vers le contrat de l'API — et rien d'autre.
 *
 * Le formulaire est en français, l'API en camelCase anglais. Cette table est
 * la SEULE traduction du dépôt côté front ; elle est la copie de
 * `docs/backend/project-form-contract.md`, lui-même relevé sur
 * `src/Projects/Fields.php`. Un second mapping écrit ailleurs finirait par
 * diverger, et un champ mal nommé revient en 422 « Champ inconnu » —
 * silencieux pour le développeur, incompréhensible pour le visiteur.
 *
 * Ce module ne fait pas de validation. Le formulaire valide pour être aimable,
 * le serveur valide pour de vrai ; ajouter un troisième juge ici ne ferait
 * qu'un troisième endroit à corriger.
 *
 * @see docs/backend/project-form-contract.md
 */

/**
 * Nom du champ dans le formulaire → nom de la clé dans l'API.
 *
 * `zone` et `region` passent tels quels : le serveur déduit `region` de
 * `zone = idf` et ignore alors ce qu'on lui envoie.
 */
const CHAMPS = {
  zone: 'zone',
  region: 'region',
  departement: 'department',
  ville: 'city',
  logement: 'housingType',
  piece: 'roomType',
  surface: 'surface',
  support: 'supportType',
  parquet: 'parquetType',
  /*
   * LE PIÈGE DU LOT, et il porte un nom.
   *
   * Le champ front s'appelle `orientation` et propose des MODES DE POSE : dans
   * la longueur, en diagonale, en point de Hongrie. Le Studio, lui, appelle
   * `orientation` un ANGLE en degrés : 0, 90, 45, −45. Deux notions, un seul
   * mot, et deux colonnes distinctes en base.
   *
   *   formulaire.orientation  → installationType → installation_type
   *   Studio ?orientation=45  → visualizer.orientation → orientation
   *
   * Les confondre remplirait `installation_type` avec « 45 » — refusé en 422,
   * puisque ce n'est pas dans la liste — ou pire, écrirait un mode de pose
   * dans une colonne d'angle. Le contrat le dit déjà ; c'est écrit deux fois
   * exprès.
   */
  orientation: 'installationType',
  style: 'style',
  delai: 'timeframe',
  prenom: 'firstName',
  nom: 'lastName',
  email: 'email',
  telephone: 'phone',
  message: 'message',
};

/** Champs du formulaire qui ne partent jamais tels quels. */
const TRAITES_A_PART = new Set(['consentement', 'website', 'source']);

/**
 * Clés que le serveur se réserve. Le front ne les envoie jamais ; cette liste
 * existe pour qu'un filet les retire si un jour un champ portait ce nom.
 */
const RESERVES_SERVEUR = new Set([
  'id', 'status', 'reference',
  'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'consentAt', 'consent_at', 'userId',
  'internalMailStatus', 'visitorMailStatus', 'mailStatus',
]);

/** Motifs acceptés par `visualizer.pattern`. */
const MOTIFS_VISUALISEUR = new Set(['lames', 'point-de-hongrie', 'baton-rompu']);
/** Angles acceptés par `visualizer.orientation`. */
const ANGLES_VISUALISEUR = new Set([0, 90, 45, -45]);

/** Identifiant plausible pour `sceneId` / `productId` : la règle du serveur. */
const ID_VALIDE = /^[a-z0-9][a-z0-9_-]{0,59}$/;

/**
 * Contexte du Visualiseur, à partir des paramètres d'URL du Studio.
 *
 * PAS DE PHOTO, jamais. La photo importée dans le Studio ne quitte pas le
 * navigateur : elle n'est ni dans l'URL, ni dans `config`, ni nulle part
 * ailleurs dans cette charge. Ce n'est pas seulement une question de taille —
 * le plafond de 4 Ko l'interdirait de toute façon — c'est que le backend V1
 * n'a aucune raison de recevoir l'intérieur de chez quelqu'un.
 *
 * `config` reste métier et léger : ce que le visiteur a choisi, pas ce que le
 * moteur a calculé. Ni SceneData, ni masque, ni texture, ni image.
 *
 * @param {URLSearchParams} params
 * @returns {object|undefined} absent si le visiteur n'est pas passé par le Studio
 */
export function visualizerFromParams(params) {
  const scene = (params.get('piece') || '').trim();
  const produit = (params.get('parquet') || '').trim();
  const motif = (params.get('motif') || '').trim();
  const angleBrut = params.get('orientation');

  const v = {};
  if (ID_VALIDE.test(scene)) v.sceneId = scene;
  if (ID_VALIDE.test(produit)) v.productId = produit;
  if (MOTIFS_VISUALISEUR.has(motif)) v.pattern = motif;

  if (angleBrut !== null && angleBrut.trim() !== '') {
    const angle = Number(angleBrut);
    if (Number.isInteger(angle) && ANGLES_VISUALISEUR.has(angle)) v.orientation = angle;
  }

  // Rien de reconnu : on n'envoie pas un objet vide, qui n'apprendrait rien à
  // personne et occuperait une section de la fiche pour rien.
  if (!Object.keys(v).length) return undefined;

  /*
   * `config` : le récapitulatif de ce que le visiteur a essayé, en clair, pour
   * que l'équipe le relise sans ouvrir le Studio. Quelques dizaines d'octets.
   */
  v.config = {
    origine: 'studio',
    ...(v.sceneId ? { scene: v.sceneId } : {}),
    ...(v.productId ? { produit: v.productId } : {}),
    ...(v.pattern ? { motif: v.pattern } : {}),
    ...(v.orientation !== undefined ? { angle: v.orientation } : {}),
  };

  return v;
}

/**
 * Charge JSON prête pour `POST /projects`.
 *
 * @param {object} options
 * @param {FormData} options.formData      les champs saisis
 * @param {string}   options.formToken     jeton obtenu de GET /form-token
 * @param {string}   [options.sourcePath]  chemin de la page (le serveur ne garde que le chemin)
 * @param {object}   [options.utm]         { utmSource, utmMedium, utmCampaign }
 * @param {object}   [options.visualizer]  contexte du Studio, si présent
 * @returns {object}
 */
export function buildProjectPayload({ formData, formToken, sourcePath, utm, visualizer }) {
  const payload = {};

  for (const [nom, valeurBrute] of formData.entries()) {
    if (TRAITES_A_PART.has(nom)) continue;
    const cle = CHAMPS[nom];
    // Un champ du formulaire absent de la table est une erreur de
    // développement, pas une donnée : on ne l'invente pas côté API.
    if (!cle || RESERVES_SERVEUR.has(cle)) continue;

    const valeur = typeof valeurBrute === 'string' ? valeurBrute.trim() : valeurBrute;

    // `style` a une option « Sans préférence » de valeur vide, et les champs
    // facultatifs laissés vides n'ont rien à faire dans la charge : le serveur
    // traite l'absence, pas la chaîne vide.
    if (valeur === '') continue;

    payload[cle] = valeur;
  }

  // `surface` est un nombre, pas la chaîne que rend FormData.
  if (payload.surface !== undefined) {
    const n = Number.parseInt(String(payload.surface), 10);
    if (Number.isFinite(n)) payload.surface = n;
  }

  /*
   * Consentement : le serveur exige exactement `true`, et il écrit LUI-MÊME la
   * date. Une case cochée rend « on » dans FormData ; décochée, elle
   * n'apparaît pas du tout. On envoie donc `true` seulement si elle est là.
   * Aucune date calculée par le navigateur ne part avec : `consentAt` est un
   * champ réservé, et l'envoyer serait refusé.
   */
  if (formData.get('consentement') !== null) payload.consent = true;

  // Le pot de miel part toujours, vide ou non : c'est son absence qui serait
  // suspecte. Le serveur le retire avant validation.
  payload.website = String(formData.get('website') || '');

  payload.formToken = formToken;

  if (sourcePath) payload.sourceUrl = sourcePath;

  if (utm) {
    for (const cle of ['utmSource', 'utmMedium', 'utmCampaign']) {
      const v = (utm[cle] || '').trim();
      if (v !== '') payload[cle] = v.slice(0, 100);
    }
  }

  if (visualizer) payload.visualizer = visualizer;

  return payload;
}

/** Nom du champ de formulaire correspondant à une clé d'erreur de l'API. */
export function frontFieldFor(apiKey) {
  const trouve = Object.entries(CHAMPS).find(([, api]) => api === apiKey);
  if (trouve) return trouve[0];
  if (apiKey === 'consent') return 'consentement';

  return null;
}

export default buildProjectPayload;
