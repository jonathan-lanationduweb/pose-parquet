import { buildTexture, buildMips } from './texture.js';
import { reliefFromAlbedo } from './relief.js';


import { motifEffectif } from './motifs-regles.js';

self.onmessage = (event) => {
  const { id, material, config, kind } = event.data || {};
  try {
    if (kind === 'apercu') {


      const petite = buildTexture(material, { pattern: config.pattern, size: config.size || 320 });
      const bitmap = petite.transferToImageBitmap();
      self.postMessage({ id, bitmap }, [bitmap]);
      return;
    }





    const t0 = performance.now();
    const tile = buildTexture(material, {
      pattern: motifEffectif(material, config.pattern),
      width: config.width || null,
      size: config.size || undefined,
    });
    const t1 = performance.now();
    const [albedo] = buildMips(tile, 1);
    const t2 = performance.now();
    const relief = reliefFromAlbedo(albedo, material.surface);
    const t3 = performance.now();
    self.postMessage(
      { id, albedo, relief, durees: { dessin: t1 - t0, pixels: t2 - t1, relief: t3 - t2 } },
      [albedo.data.buffer, relief.data.buffer],
    );
  } catch (erreur) {
    self.postMessage({ id, erreur: String(erreur && erreur.message ? erreur.message : erreur) });
  }
};
