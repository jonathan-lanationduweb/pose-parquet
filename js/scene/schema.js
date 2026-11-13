import { CADRE_DEPART, METRES_DEFAUT, contourDuCadre, dimensionsDuCadre, planDuCadre } from './cadre-photo.js';

export const SCHEMA = 'pose-parquet/scene@1';

const clone = (points) => points.map((p) => ({ x: p.x, y: p.y }));
const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);



function normalizeZone(raw, index, planes) {




  const plane = (raw.planeRef && planes[raw.planeRef]) || raw.plane || {};
  if (raw.planeRef && !planes[raw.planeRef]) {
    throw new Error(`Zone « ${raw.id || index} » : plan « ${raw.planeRef} » introuvable`);
  }
  const mask = raw.mask || {};
  const quad = Array.isArray(plane.quad) ? plane.quad : raw.quad;
  if (!Array.isArray(quad) || quad.length !== 4) {
    throw new Error(`Zone « ${raw.id || index} » : plane.quad doit compter 4 points`);
  }
  const polygon = Array.isArray(mask.polygon) ? mask.polygon : raw.mask;

  return {
    id: raw.id || `zone-${index + 1}`,
    label: raw.label || `Zone ${index + 1}`,
    surfaceId: raw.surfaceId || 'sol',
    planeRef: raw.planeRef || null,
    order: num(raw.order, index),
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : null,
    plane: {
      quad: clone(quad),
      meters: {
        width: num(plane.meters && plane.meters.width, 4.2),
        depth: num(plane.meters && plane.meters.depth, 4),
      },


      origin: {
        u: num(plane.origin && plane.origin.u, 0),
        v: num(plane.origin && plane.origin.v, 0),
      },
      rotationDeg: num(plane.rotationDeg, 0),
    },
    mask: {
      polygon: Array.isArray(polygon) && polygon.length >= 3 ? clone(polygon) : clone(quad),
      holes: Array.isArray(mask.holes) ? mask.holes.filter((h) => Array.isArray(h) && h.length >= 3).map(clone) : [],
    },



    runtimeMask: null,
  };
}



function normalizeOccluder(raw, index) {
  if (!Array.isArray(raw.polygon) || raw.polygon.length < 3) return null;
  return {
    id: raw.id || `occ-${index + 1}`,
    label: raw.label || 'Objet',
    kind: raw.kind || 'furniture',
    polygon: clone(raw.polygon),
    contact: Array.isArray(raw.contact) ? clone(raw.contact) : null,
    depth: num(raw.depth, 0.5),
    castsShadow: raw.castsShadow !== false,
    feather: num(raw.feather, 0.0015),
  };
}



export function normalizeScene(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Scène vide');
  if (raw.schema && raw.schema.split('@')[0] !== SCHEMA.split('@')[0]) {
    throw new Error(`Schéma de scène inconnu : ${raw.schema}`);
  }

  const image = raw.image || {};
  const planes = raw.planes || {};
  const zones = (Array.isArray(raw.floorZones) ? raw.floorZones : [])
    .map((zone, index) => normalizeZone(zone, index, planes))
    .sort((a, b) => a.order - b.order);
  if (!zones.length) throw new Error('Une scène doit compter au moins une zone de sol');



  const declared = new Map((raw.surfaces || []).map((s) => [s.id, s]));
  const surfaces = [...new Set(zones.map((z) => z.surfaceId))].map((id) => ({
    id,
    label: (declared.get(id) || {}).label || 'Sol',
    continuous: (declared.get(id) || {}).continuous !== false,
  }));

  const light = raw.light || {};

  return {
    schema: SCHEMA,
    id: raw.id || raw.sceneId || 'scene',
    label: raw.label || 'Ma pièce',
    source: raw.source || 'manual',
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : null,

    image: {
      file: image.file || null,
      width: num(image.width, 0),
      height: num(image.height, 0),
      alt: image.alt || '',
      credit: image.credit || null,
    },

    camera: {
      horizon: num(raw.camera && raw.camera.horizon, null),
      vanishingPoints: Array.isArray(raw.camera && raw.camera.vanishingPoints)
        ? clone(raw.camera.vanishingPoints)
        : [],
      fovDeg: num(raw.camera && raw.camera.fovDeg, null),
      tiltDeg: num(raw.camera && raw.camera.tiltDeg, null),
      heightM: num(raw.camera && raw.camera.heightM, null),
    },

    surfaces,
    floorZones: zones,
    occluders: (Array.isArray(raw.occluders) ? raw.occluders : []).map(normalizeOccluder).filter(Boolean),



    depth: {
      kind: (raw.depth && raw.depth.kind) || (raw.depthMap ? 'image' : 'plane'),
      file: (raw.depth && raw.depth.file) || (raw.depthMap && raw.depthMap.file) || null,
      near: num(raw.depth && raw.depth.near, null),
      far: num(raw.depth && raw.depth.far, null),
    },



    light: {
      kind: light.kind || 'photo-luma',
      strength: num(light.strength, 1),
      blurRadius: num(light.blurRadius, 0.035),











      ambient: num(light.ambient, 0.22),





      tint: num(light.tint, 0.5),

      contact: num(light.contact, 0.35),




      robust: light.robust === true,
    },

    warnings: Array.isArray(raw.warnings) ? raw.warnings.slice() : [],
  };
}



export const DEFAULT_QUAD = CADRE_DEPART.map((p) => ({ ...p }));



export const CADRE_SECOND_SOL = [
  { x: 0.06, y: 0.5 },
  { x: 0.94, y: 0.5 },
  { x: 1.0, y: 1.0 },
  { x: 0.0, y: 1.0 },
];



export function createBlankScene({ width, height, quad = DEFAULT_QUAD, meters, label = 'Ma pièce' } = {}) {


  const plan = planDuCadre(quad, width || 1, height || 1) || quad;
  const scene = normalizeScene({
    id: `upload-${Date.now().toString(36)}`,
    label,
    source: 'manual',
    image: { width, height, alt: 'Votre pièce' },
    light: { robust: true },
    floorZones: [
      {
        id: 'zone-1',
        label: 'Sol',
        surfaceId: 'sol',
        plane: { quad: plan, meters: meters || metresDuCadre(plan, width, height) },
        mask: { polygon: contourDuCadre(plan) },
      },
    ],
  });
  scene.floorZones[0].cadre = quad.map((p) => ({ x: p.x, y: p.y }));
  return scene;
}



export function metresDuCadre(quad, width, height) {
  const lues = dimensionsDuCadre(quad, width, height);
  return lues ? { width: lues.width, depth: lues.depth } : { ...METRES_DEFAUT };
}



export function addZone(scene, { label, quad, surfaceId, meters } = {}) {
  const index = scene.floorZones.length;
  const zone = normalizeZone(
    {
      id: `zone-${index + 1}-${Date.now().toString(36)}`,
      label: label || `Sol ${index + 1}`,
      surfaceId: surfaceId || scene.surfaces[0].id,
      order: index,
      plane: {
        quad: quad || CADRE_SECOND_SOL,
        meters: meters || scene.floorZones[0].plane.meters,
      },
      mask: { polygon: quad || CADRE_SECOND_SOL },
    },
    index,
    {}
  );
  scene.floorZones.push(zone);
  return zone;
}


export function removeZone(scene, zoneId) {
  if (scene.floorZones.length <= 1) return false;
  const index = scene.floorZones.findIndex((zone) => zone.id === zoneId);
  if (index < 0) return false;
  scene.floorZones.splice(index, 1);
  scene.floorZones.forEach((zone, i) => {
    zone.order = i;
  });
  return true;
}


export const zonesOfSurface = (scene, surfaceId) =>
  scene.floorZones.filter((zone) => zone.surfaceId === surfaceId);


export const zonePolygon = (zone) => zone.runtimeMask || zone.mask.polygon;
