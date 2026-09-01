import { qs, on } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';

/**
 * Video du hero : chargee seulement si une source est fournie et si
 * l'utilisateur n'a pas demande a reduire les animations. L'image reste
 * le fallback affiche par defaut (aucun CLS).
 */
export function initHeroMedia() {
  const media = qs('[data-hero-media]');
  if (!media) return;
  const video = qs('video', media);
  if (!video || prefersReducedMotion()) return;

  const source = video.dataset.src;
  if (!source) return;

  const load = () => {
    video.src = source;
    video.load();
    on(video, 'loadeddata', () => { video.dataset.ready = 'true'; }, { once: true });
  };

  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 2500 });
  else window.setTimeout(load, 1200);
}
