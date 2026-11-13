export const PARAMS = {
  pose: 'pose',
  surface: 'surface',
  besoin: 'besoin',
};



export const BESOINS = ['produit', 'pose', 'produit-pose', 'renovation', 'indetermine'];



export const POSES = ['longueur', 'largeur', 'diagonale', 'point-de-hongrie', 'baton-rompu'];


export const SURFACE_MIN = 1;
export const SURFACE_MAX = 2000;



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



    present: Boolean(pose || brut || besoin),
  };
}

export default { PARAMS, POSES, BESOINS, SURFACE_MIN, SURFACE_MAX, buildPlanParams, readPlanParams };
