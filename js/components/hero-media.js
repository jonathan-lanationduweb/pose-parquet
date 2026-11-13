import { qs, on } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';



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
