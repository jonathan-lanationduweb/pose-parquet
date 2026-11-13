export const STATUTS = ['validated', 'experimental', 'disabled'];



const lire = (liste, valeur, defaut) => (liste.includes(valeur) ? valeur : defaut);



export const STATUTS_VISUELS = ['validated', 'experimental', 'failed', 'disabled'];


export const geometrieDe = (entry) => lire(STATUTS, entry && entry.geometryStatus, lire(STATUTS, entry && entry.status, 'experimental'));


export const visuelDe = (entry) => lire(STATUTS_VISUELS, entry && entry.visualStatus, 'experimental');



export const statutDe = (entry) => {
  const g = geometrieDe(entry);
  const v = visuelDe(entry);
  if (g === 'disabled' || v === 'disabled') return 'disabled';
  if (v === 'failed') return 'failed';
  return g === 'validated' && v === 'validated' ? 'validated' : 'experimental';
};


export const estPubliable = (entry) => geometrieDe(entry) === 'validated' && visuelDe(entry) === 'validated';



export const estDansBibliotheque = (entry) => estPubliable(entry) && entry.showInRoomLibrary !== false;


const entrees = (index) => (index && Array.isArray(index.scenes) ? index.scenes : []);


export const scenesPubliques = (index) => entrees(index).filter(estPubliable);



export const scenesBibliotheque = (index) => entrees(index).filter(estDansBibliotheque);



export const sceneOuvrable = (index, id) => {
  const entry = entrees(index).find((e) => e.id === id);
  return entry && geometrieDe(entry) !== 'disabled' ? entry : null;
};
