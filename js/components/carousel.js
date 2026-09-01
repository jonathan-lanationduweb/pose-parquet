import { qs, on } from '../utils/dom.js';

/** Carrousel horizontal base sur le scroll natif (scroll-snap) + controles. */
export function initCarousel(root) {
  const viewport = qs('[data-carousel-viewport]', root);
  const prev = qs('[data-carousel-prev]', root);
  const next = qs('[data-carousel-next]', root);
  const progress = qs('[data-carousel-progress]', root);
  if (!viewport) return;

  const step = () => {
    const first = viewport.firstElementChild;
    if (!first) return viewport.clientWidth;
    const gap = parseFloat(getComputedStyle(viewport).columnGap || '0');
    return first.getBoundingClientRect().width + gap;
  };

  const update = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    const ratio = max > 0 ? viewport.scrollLeft / max : 0;
    if (prev) prev.disabled = viewport.scrollLeft < 4;
    if (next) next.disabled = viewport.scrollLeft > max - 4;
    if (progress) {
      const visible = Math.min(1, viewport.clientWidth / Math.max(viewport.scrollWidth, 1));
      progress.style.width = `${Math.max(visible * 100, 12)}%`;
      progress.style.transform = `translateX(${ratio * (100 / Math.max(visible, 0.12) - 100)}%)`;
    }
  };

  if (prev) on(prev, 'click', () => viewport.scrollBy({ left: -step(), behavior: 'smooth' }));
  if (next) on(next, 'click', () => viewport.scrollBy({ left: step(), behavior: 'smooth' }));
  on(viewport, 'scroll', update, { passive: true });
  on(window, 'resize', update);
  update();
}
