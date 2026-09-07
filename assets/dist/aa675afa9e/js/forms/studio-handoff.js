/**
 * Le passage du Studio au formulaire : une seule convention, écrite une fois.
 *
 * Trois endroits parlent de cette URL — le Studio qui la fabrique
 * (`js/studio/app.js`), le formulaire qui l'affiche
 * (`components/project-form/project-form.js`) et la charge qui part à l'API
 * (`js/forms/project-payload.js`). Ils s'étaient mis à ne plus dire tout à
 * fait la même chose, et cela s'est vu en recette : le Studio envoyait
 * `parquet=Chêne+Fumé`, la charge attendait un identifiant sous ce nom, la
 * validation refusait le libellé, et la fiche WordPress affichait un motif et
 * un angle sans jamais nommer ni la scène ni le parquet. Personne n'avait
 * tort ; il manquait un endroit où la règle soit écrite une seule fois.
 *
 * ## La convention
 *
 *   piece        identifiant de la scène        sejour
 *   parquet      identifiant du produit         chene-fume
 *   libelle      nom commercial, pour l'humain  Chêne Fumé
 *   motif        motif de pose                  point-de-hongrie
 *   orientation  angle du rendu, en degrés      90
 *
 * `parquet` porte l'IDENTIFIANT, jamais le libellé. Ce n'est pas un choix
 * nouveau : les liens profonds qui ouvrent le Studio depuis la page
 * Inspiration écrivent déjà `?piece=sejour&parquet=chene-fume`, et le Studio
 * les valide contre son catalogue. Faire porter à `parquet` un libellé dans
 * l'autre sens aurait donné deux significations au même nom selon la
 * direction du voyage. Le nom humain a donc son propre paramètre, `libelle`,
 * et les deux rôles restent séparés : l'un identifie, l'autre s'affiche.
 *
 * ## Ce qui ne voyage pas
 *
 * La photo importée dans le Studio. Jamais, sous aucune forme : ni base64, ni
 * blob, ni data URL, ni masque, ni `SceneData`. Une URL ne transporte que cinq
 * champs courts, et c'est très volontaire.
 *
 * ## Angle et sens de pose
 *
 * `orientation` est l'angle du rendu du Studio, en degrés. Ce n'est PAS le
 * `installationType` du formulaire métier, qui est un sens de pose choisi par
 * le visiteur (`longueur`, `point-de-hongrie`…). Les deux mots se ressemblent,
 * les deux notions non, et elles voyagent ensemble sans se confondre : l'angle
 * finit dans `visualizer.orientation`, le sens de pose dans
 * `installationType`.
 */

/** Noms des paramètres d'URL. La seule liste qui fasse foi. */
export const PARAMS = {
  scene: 'piece',
  product: 'parquet',
  label: 'libelle',
  pattern: 'motif',
  angle: 'orientation',
};

/** Motifs de pose que le Visualiseur sait rendre. */
export const MOTIFS = new Set(['lames', 'point-de-hongrie', 'baton-rompu']);

/** Angles que le panneau Orientation propose, en degrés. */
export const ANGLES = new Set([0, 90, 45, -45]);

/**
 * Forme d'un identifiant : la même règle que celle du serveur.
 *
 * Un libellé commercial ne la passe pas — « Chêne Fumé » a une majuscule, un
 * espace et un accent — et c'est exactement le garde-fou qu'on veut : si un
 * libellé arrive là où un identifiant est attendu, il est écarté au lieu
 * d'être stocké comme s'il en était un.
 */
const ID_VALIDE = /^[a-z0-9][a-z0-9_-]{0,59}$/;

/** Vrai si cette chaîne peut être un identifiant de scène ou de produit. */
export function estIdentifiant(valeur) {
  return typeof valeur === 'string' && ID_VALIDE.test(valeur);
}

/**
 * Fabrique la requête, côté Studio.
 *
 * Chaque champ n'est écrit que s'il est réellement exploitable : une scène
 * absente (le visiteur a importé sa propre photo), un produit inconnu du
 * catalogue ou un angle hors des quatre valeurs du panneau ne partent pas.
 * Mieux vaut un paramètre manquant qu'un paramètre faux — le formulaire et la
 * fiche savent tous les deux se passer d'une information, pas se méfier d'une
 * information inventée.
 *
 * @param {object} etat
 * @param {string|null} [etat.sceneId]      identifiant de la scène ouverte
 * @param {string|null} [etat.productId]    identifiant du parquet actif
 * @param {string|null} [etat.productLabel] nom commercial du parquet actif
 * @param {string|null} [etat.pattern]      motif de pose
 * @param {number|null} [etat.angle]        angle du rendu, en degrés
 * @returns {URLSearchParams}
 */
export function buildHandoffParams({ sceneId, productId, productLabel, pattern, angle } = {}) {
  const params = new URLSearchParams();

  if (estIdentifiant(sceneId)) params.set(PARAMS.scene, sceneId);
  if (estIdentifiant(productId)) params.set(PARAMS.product, productId);

  const libelle = typeof productLabel === 'string' ? productLabel.trim() : '';
  if (libelle) params.set(PARAMS.label, libelle);

  if (MOTIFS.has(pattern)) params.set(PARAMS.pattern, pattern);

  const entier = Number(angle);
  if (Number.isInteger(entier) && ANGLES.has(entier)) params.set(PARAMS.angle, String(entier));

  return params;
}

/**
 * Relit la requête, côté formulaire.
 *
 * Toute valeur douteuse devient `null` : c'est plus honnête qu'une valeur
 * approximative, et cela évite qu'un identifiant fantaisiste finisse en base.
 *
 * Un ancien lien qui portait le libellé dans `parquet` — la forme d'avant ce
 * correctif — n'y perd que le nom du produit : `productId` reste vide, le
 * motif et l'angle passent, et le formulaire fonctionne. Une dégradation, pas
 * une panne.
 *
 * @param {URLSearchParams} params
 * @returns {{sceneId: string|null, productId: string|null, productLabel: string|null,
 *            pattern: string|null, angle: number|null, present: boolean}}
 */
export function readHandoffParams(params) {
  const lire = (nom) => (params.get(nom) || '').trim();

  const scene = lire(PARAMS.scene);
  const produit = lire(PARAMS.product);
  const libelle = lire(PARAMS.label);
  const motif = lire(PARAMS.pattern);
  const angleBrut = params.get(PARAMS.angle);

  let angle = null;
  if (angleBrut !== null && angleBrut.trim() !== '') {
    const valeur = Number(angleBrut);
    if (Number.isInteger(valeur) && ANGLES.has(valeur)) angle = valeur;
  }

  const lecture = {
    sceneId: estIdentifiant(scene) ? scene : null,
    productId: estIdentifiant(produit) ? produit : null,
    productLabel: libelle || null,
    pattern: MOTIFS.has(motif) ? motif : null,
    angle,
  };

  /*
   * `present` répond à « le visiteur vient-il du Studio ? ». On regarde les
   * paramètres BRUTS et non les valeurs retenues : quelqu'un qui arrive avec
   * un ancien lien, ou avec un produit que le catalogue ne connaît plus, vient
   * bel et bien du Studio, et le formulaire doit le lui dire.
   */
  lecture.present = Boolean(scene || produit || libelle || motif || angleBrut);

  return lecture;
}

export default { PARAMS, MOTIFS, ANGLES, estIdentifiant, buildHandoffParams, readHandoffParams };
