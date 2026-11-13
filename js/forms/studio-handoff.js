export const PARAMS = {
  scene: 'piece',
  sceneLabel: 'libelle-piece',
  product: 'parquet',
  label: 'libelle',
  pattern: 'motif',
  angle: 'orientation',
  fiche: 'fiche',
};



export const MAX_LIBELLE = 120;


export const MOTIFS = new Set(['lames', 'point-de-hongrie', 'baton-rompu']);


export const ANGLES = new Set([0, 90, 45, -45]);



const ID_VALIDE = /^[a-z0-9][a-z0-9_-]{0,59}$/i;


export function estIdentifiant(valeur) {
  return typeof valeur === 'string' && ID_VALIDE.test(valeur);
}



export function buildHandoffParams({ sceneId, sceneLabel, productId, productLabel, pattern, angle, ficheProduit } = {}) {
  const params = new URLSearchParams();

  const propre = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_LIBELLE) : '');

  if (estIdentifiant(sceneId)) {
    params.set(PARAMS.scene, sceneId);
    const nom = propre(sceneLabel);
    if (nom) params.set(PARAMS.sceneLabel, nom);
  }

  if (estIdentifiant(productId)) params.set(PARAMS.product, productId);

  const libelle = propre(productLabel);
  if (libelle) params.set(PARAMS.label, libelle);

  if (MOTIFS.has(pattern)) params.set(PARAMS.pattern, pattern);

  const entier = Number(angle);
  if (Number.isInteger(entier) && ANGLES.has(entier)) params.set(PARAMS.angle, String(entier));



  if (ficheProduit && estIdentifiant(productId)) params.set(PARAMS.fiche, '1');

  return params;
}



export function readHandoffParams(params) {
  const lire = (nom) => (params.get(nom) || '').trim();

  const scene = lire(PARAMS.scene);
  const nomScene = lire(PARAMS.sceneLabel).slice(0, MAX_LIBELLE);
  const produit = lire(PARAMS.product);
  const libelle = lire(PARAMS.label).slice(0, MAX_LIBELLE);
  const motif = lire(PARAMS.pattern);
  const angleBrut = params.get(PARAMS.angle);

  let angle = null;
  if (angleBrut !== null && angleBrut.trim() !== '') {
    const valeur = Number(angleBrut);
    if (Number.isInteger(valeur) && ANGLES.has(valeur)) angle = valeur;
  }

  const lecture = {
    sceneId: estIdentifiant(scene) ? scene : null,


    sceneLabel: estIdentifiant(scene) && nomScene ? nomScene : null,
    productId: estIdentifiant(produit) ? produit : null,
    productLabel: libelle || null,
    pattern: MOTIFS.has(motif) ? motif : null,
    angle,

    ficheProduit: estIdentifiant(produit) && params.get(PARAMS.fiche) === '1',
  };



  lecture.present = Boolean(scene || nomScene || produit || libelle || motif || angleBrut);

  return lecture;
}

export default { PARAMS, MOTIFS, ANGLES, MAX_LIBELLE, estIdentifiant, buildHandoffParams, readHandoffParams };
