export const SCHEMA = 'pose-parquet/room-tours@1';


const estPoint = (p) => Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;



export function validerVisites(manifeste, scenesConnues) {
  const refus = [];
  const visites = [];
  const connues = new Set(scenesConnues || []);
  const scenesPrises = new Map();

  if (!manifeste || typeof manifeste !== 'object') {
    return { visites, refus: [{ id: '(manifeste)', raison: 'manifeste illisible' }] };
  }
  if (manifeste.schema !== SCHEMA) {
    return { visites, refus: [{ id: '(manifeste)', raison: `schéma inattendu : ${manifeste.schema}` }] };
  }

  for (const brute of Array.isArray(manifeste.tours) ? manifeste.tours : []) {
    const id = brute && brute.id ? String(brute.id) : '(sans id)';
    const rejeter = (raison) => { refus.push({ id, raison }); return null; };

    if (!brute.id || !brute.room) { rejeter('une visite doit porter un id et le lieu réel (`room`)'); continue; }
    const points = Array.isArray(brute.viewpoints) ? brute.viewpoints : [];


    if (points.length < 2) { rejeter('une visite demande au moins deux points de vue'); continue; }

    const ids = new Set();
    let faute = null;
    for (const vp of points) {
      if (!vp || !vp.id) { faute = 'un point de vue sans id'; break; }
      if (ids.has(vp.id)) { faute = `deux points de vue portent l'id ${vp.id}`; break; }
      ids.add(vp.id);
      if (!connues.has(vp.sceneId)) { faute = `${vp.id} : la scène « ${vp.sceneId} » n'est pas calibrée`; break; }

      if (String(vp.room || '') !== String(brute.room)) { faute = `${vp.id} : ce point de vue n'est pas dans « ${brute.room} »`; break; }
      if (vp.position && !estPoint(vp.position)) { faute = `${vp.id} : position hors de l'image`; break; }
      const dejaPrise = scenesPrises.get(vp.sceneId);
      if (dejaPrise && dejaPrise !== id) { faute = `${vp.id} : la scène « ${vp.sceneId} » appartient déjà à la visite ${dejaPrise}`; break; }
    }
    if (faute) { rejeter(faute); continue; }

    for (const vp of points) {
      for (const c of Array.isArray(vp.connections) ? vp.connections : []) {
        if (!c || !ids.has(c.to)) { faute = `${vp.id} : liaison vers un point de vue inconnu`; break; }
        if (c.to === vp.id) { faute = `${vp.id} : liaison vers lui-même`; break; }
        if (c.at && !estPoint(c.at)) { faute = `${vp.id} → ${c.to} : indicateur hors de l'image`; break; }


        const retour = points.find((p) => p.id === c.to);
        const revient = (Array.isArray(retour.connections) ? retour.connections : []).some((r) => r.to === vp.id);
        if (!revient) { faute = `${vp.id} → ${c.to} : liaison non réciproque`; break; }
      }
      if (faute) break;
    }
    if (faute) { rejeter(faute); continue; }

    points.forEach((vp) => scenesPrises.set(vp.sceneId, id));
    visites.push({
      id,
      label: brute.label || id,
      room: String(brute.room),
      viewpoints: points.map((vp) => ({
        id: String(vp.id),
        sceneId: String(vp.sceneId),
        label: vp.label || '',
        position: vp.position || null,
        heading: Number.isFinite(vp.heading) ? vp.heading : null,
        connections: (Array.isArray(vp.connections) ? vp.connections : []).map((c) => ({ to: String(c.to), at: c.at || null, label: c.label || '' })),
      })),
    });
  }

  return { visites, refus };
}



export async function loadTours(base, scenesConnues) {
  let manifeste = null;
  try {
    const rep = await fetch(`${base}data/room-tours.json`, { cache: 'no-cache' });
    if (rep.ok) manifeste = await rep.json();
  } catch {   }

  const { visites, refus } = manifeste ? validerVisites(manifeste, scenesConnues) : { visites: [], refus: [] };
  const parScene = new Map();
  visites.forEach((v) => v.viewpoints.forEach((vp) => parScene.set(vp.sceneId, { tour: v, viewpoint: vp })));

  return {
    get vide() { return visites.length === 0; },
    visites,
    refus,

    pourScene(sceneId) {
      const trouve = parScene.get(sceneId);
      if (!trouve) return null;
      return { tourId: trouve.tour.id, viewpointId: trouve.viewpoint.id, room: trouve.tour.room, connections: trouve.viewpoint.connections };
    },


    aPrecharger(sceneId) {
      const trouve = parScene.get(sceneId);
      if (!trouve) return [];
      return trouve.viewpoint.connections
        .map((c) => trouve.tour.viewpoints.find((vp) => vp.id === c.to))
        .filter(Boolean)
        .map((vp) => vp.sceneId);
    },
  };
}
