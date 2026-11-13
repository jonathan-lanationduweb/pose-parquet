import { createSceneMasks } from './mask.js';
import { mark, mesure } from '../utils/perf.js';
import { buildShadingMap, buildGlossMap } from './shading.js';
import { lightDirection } from './geometry.js';
import { materialMaps, materialMapsAsync, warmMaterial } from './material.js';
import { createCanvasRenderer } from './renderer-canvas.js';
import { createGlRenderer, glAvailable } from './renderer-gl.js';


const GLOSS_THRESHOLD = 0.06;

export function createSceneRenderer({ prefer = 'auto' } = {}) {
  const gl = prefer === 'canvas' || !glAvailable() ? null : createGlRenderer();
  const cpu = createCanvasRenderer();
  const backend = gl ? gl.backend : cpu.backend;

  let scene = null;
  let photo = null;
  let source = null;
  let masks = null;
  let shading = null;
  let gloss = null;
  let lightDir = null;
  let glossWanted = false;
  const buffers = new Map();


  function prepareLighting() {
    shading = buildShadingMap(source, masks.coverage, scene.light);
    lightDir = lightDirection(shading);
    gloss = glossWanted ? buildGlossMap(source, masks.coverage, shading) : null;
    if (gl) {
      gl.setShading(shading);
      gl.setGloss(gloss);
      gl.setMasks(masks);
    }
  }

  return {
    backend,
    anisotropy: gl ? gl.anisotropy : 1,

    get scene() {
      return scene;
    },
    get masks() {
      return masks;
    },
    get photo() {
      return photo ? photo.canvas : null;
    },
    get size() {
      return photo ? { width: photo.width, height: photo.height } : null;
    },
    get ready() {
      return Boolean(scene && source && masks);
    },



    setScene(nextScene, prepared) {
      scene = nextScene;
      photo = prepared;
      source = prepared.canvas
        .getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, prepared.width, prepared.height);
      masks = createSceneMasks(scene, prepared.width, prepared.height);
      buffers.clear();
      if (gl) gl.setPhoto(source);
      prepareLighting();
    },



    invalidateMasks() {
      if (masks) masks.invalidate();
    },



    refreshLighting() {
      if (masks) prepareLighting();
    },


    warm: warmMaterial,




    enAttente: false,



    async preparer(config, perSurface) {
      if (!this.ready || !config || !config.material) return false;
      await Promise.all(scene.surfaces.map((surface) => {
        const entry = (perSurface && perSurface.get(surface.id)) || config;
        return entry && entry.material ? materialMapsAsync(entry.material, entry) : null;
      }));
      return true;
    },

    surfacesFor(config, perSurface) {
      const map = new Map();
      this.enAttente = false;
      scene.surfaces.forEach((surface) => {
        const entry = (perSurface && perSurface.get(surface.id)) || config;
        if (!entry || !entry.material) return;
        const maps = materialMaps(entry.material, entry);


        if (!maps) { this.enAttente = true; return; }
        if (maps.surface.clearcoat > GLOSS_THRESHOLD && !glossWanted) {


          glossWanted = true;
          gloss = buildGlossMap(source, masks.coverage, shading);
          if (gl) gl.setGloss(gloss);
        }
        map.set(surface.id, { material: entry.material, config: entry, maps });
      });
      return map;
    },



    paint(target, config, perSurface, step = 1) {
      if (!this.ready || !config || !config.material) return false;
      mark('paint:debut');
      const { width, height } = photo;
      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
        buffers.delete(target);
      }
      const surfaces = this.surfacesFor(config, perSurface);
      if (!surfaces.size) return false;



      if (gl) {
        gl.setMasks(masks);
        gl.draw({ scene, masks, surfaces, lightDir });
        const ctx = target.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(gl.canvas, 0, 0);
        mark('paint:fin');
        mesure(`paint.webgl.q${step}`, 'paint:debut', 'paint:fin');
        return true;
      }

      const ctx = target.getContext('2d', { willReadFrequently: true });
      if (!buffers.has(target)) buffers.set(target, ctx.createImageData(width, height));
      const buffer = buffers.get(target);


      surfaces.forEach((entry) => { if (entry.maps.completer) entry.maps.completer(); });
      const ok = cpu.paint({ source, target: buffer, scene, masks, shading, gloss, surfaces, step });
      if (!ok) return false;
      ctx.putImageData(buffer, 0, 0);
      mark('paint:fin');
      mesure(`paint.canvas.q${step}`, 'paint:debut', 'paint:fin');
      return true;
    },



    paintWithCanvas(target, config, perSurface, step = 1) {
      if (!this.ready) return false;
      const { width, height } = photo;
      target.width = width;
      target.height = height;
      const ctx = target.getContext('2d', { willReadFrequently: true });
      const buffer = ctx.createImageData(width, height);
      const surfaces = this.surfacesFor(config, perSurface);

      surfaces.forEach((entry) => { if (entry.maps.completer) entry.maps.completer(); });
      const ok = cpu.paint({
        source,
        target: buffer,
        scene,
        masks,
        shading,
        gloss,
        surfaces,
        step,
      });
      if (ok) ctx.putImageData(buffer, 0, 0);
      return ok;
    },
  };
}
