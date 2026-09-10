/**
 * Visites de pièce — le contrat de données, et sa validation. Rien de plus.
 *
 * Le but visé est une VRAIE sensation de déplacement : plusieurs points de vue
 * réels d'une même pièce, chacun avec sa photo, sa scène calibrée et son rendu
 * de parquet. Ce module porte le contrat de données de cette visite et refuse
 * tout ce qui la falsifierait. Il ne dessine rien, ne navigue pas, n'expose
 * aucune commande : l'interface viendra le jour où les photos existeront.
 *
 * Pourquoi rien n'est exposé aujourd'hui : l'audit des seize scènes calibrées
 * du site n'a trouvé AUCUNE série multi-angle. Seize photos, seize pièces
 * différentes, de cinq photographes. Assembler une visite avec elles
 * donnerait « j'ai changé d'image », pas « je me suis déplacé » — et la règle
 * du projet est de ne pas inventer l'information qu'on n'a pas. Le protocole
 * de prise de vue nécessaire est décrit dans docs/room-tour-protocol.md.
 *
 * La garde centrale est `room` : une visite déclare le lieu réel photographié,
 * chaque point de vue le redéclare, et une visite dont deux points de vue ne
 * sont pas le MÊME lieu est refusée. C'est ce qui rend impossible, par
 * construction, une fausse visite recousue à partir de pièces différentes.
 */

export const SCHEMA = 'pose-parquet/room-tours@1';

/** Un point sur l'image, en coordonnées normalisées (0 → 1). */
const estPoint = (p) => Boolean(p) && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

/**
 * Valide un manifeste de visites contre la bibliothèque de scènes réelle.
 *
 * @param {object} manifeste            contenu de data/room-tours.json
 * @param {string[]} scenesConnues      identifiants des scènes calibrées
 * @returns {{ visites: object[], refus: {id: string, raison: string}[] }}
 */
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
    /* Un seul point de vue n'est pas une visite : c'est la pièce telle qu'elle
       est déjà, et l'exposer comme visitable serait mentir. */
    if (points.length < 2) { rejeter('une visite demande au moins deux points de vue'); continue; }

    const ids = new Set();
    let faute = null;
    for (const vp of points) {
      if (!vp || !vp.id) { faute = 'un point de vue sans id'; break; }
      if (ids.has(vp.id)) { faute = `deux points de vue portent l'id ${vp.id}`; break; }
      ids.add(vp.id);
      if (!connues.has(vp.sceneId)) { faute = `${vp.id} : la scène « ${vp.sceneId} » n'est pas calibrée`; break; }
      /* LA garde : tous les points de vue photographient le même lieu. */
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
        /* Une porte ne s'ouvre pas dans un seul sens : sans réciprocité, on
           entre dans un point de vue d'où l'on ne peut plus revenir. */
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

/**
 * Charge et valide le manifeste. L'absence de fichier n'est pas une erreur :
 * aujourd'hui aucune pièce n'est visitable, et l'écran doit l'ignorer.
 *
 * @param {string} base
 * @param {string[]} scenesConnues
 */
export async function loadTours(base, scenesConnues) {
  let manifeste = null;
  try {
    const rep = await fetch(`${base}data/room-tours.json`, { cache: 'no-cache' });
    if (rep.ok) manifeste = await rep.json();
  } catch { /* pas de manifeste : aucune visite, et c'est un état normal */ }

  const { visites, refus } = manifeste ? validerVisites(manifeste, scenesConnues) : { visites: [], refus: [] };
  const parScene = new Map();
  visites.forEach((v) => v.viewpoints.forEach((vp) => parScene.set(vp.sceneId, { tour: v, viewpoint: vp })));

  return {
    get vide() { return visites.length === 0; },
    visites,
    refus,
    /** La visite et le point de vue d'une scène, ou `null` si elle n'en fait pas partie. */
    pourScene(sceneId) {
      const trouve = parScene.get(sceneId);
      if (!trouve) return null;
      return { tourId: trouve.tour.id, viewpointId: trouve.viewpoint.id, room: trouve.tour.room, connections: trouve.viewpoint.connections };
    },
    /**
     * Les scènes à précharger depuis une scène donnée : ses voisines
     * directes, jamais toute la visite.
     */
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
