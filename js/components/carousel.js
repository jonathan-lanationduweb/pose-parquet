import { qs, qsa, on } from '../utils/dom.js';

/**
 * Carrousel horizontal, JavaScript natif.
 *
 * - défilement natif (scroll-snap) : inertie et swipe tactile parfaits
 * - glisser-déposer à la souris
 * - boutons précédent / suivant
 * - navigation clavier (flèches, Origine, Fin) quand la piste a le focus
 * - barre de progression + compteur
 * - la slide suivante affleure à droite (débord géré en CSS)
 */
export function initCarousel(root) {
  const viewport = qs('[data-carousel-viewport]', root);
  if (!viewport) return;

  const slides = qsa('.carousel__slide', viewport);
  const prev = qs('[data-carousel-prev]', root);
  const next = qs('[data-carousel-next]', root);
  const bar = qs('[data-carousel-progress]', root);
  const count = qs('[data-carousel-count]', root);
  if (!slides.length) return;

  const step = () => {
    const gap = parseFloat(getComputedStyle(viewport).columnGap || '0') || 0;
    return slides[0].getBoundingClientRect().width + gap;
  };

  const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;

  const currentIndex = () => {
    const s = step();
    return s > 0 ? Math.round(viewport.scrollLeft / s) : 0;
  };

  const update = () => {
    const max = maxScroll();
    const ratio = max > 4 ? viewport.scrollLeft / max : 0;
    const visible = Math.min(1, viewport.clientWidth / Math.max(viewport.scrollWidth, 1));

    if (prev) prev.disabled = viewport.scrollLeft < 8;
    if (next) next.disabled = viewport.scrollLeft > max - 8;
    if (bar) {
      bar.style.width = `${Math.max(visible * 100, 10)}%`;
      bar.style.transform = `translateX(${ratio * (100 / Math.max(visible, 0.1) - 100)}%)`;
    }
    if (count) {
      const index = Math.min(currentIndex() + 1, slides.length);
      count.textContent = `${String(index).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    }
  };

  /**
   * Défilement programmé. Le scroll-snap « mandatory » annule les
   * animations déclenchées en JavaScript : on le désactive le temps du
   * déplacement, puis on le rétablit une fois la slide en place.
   */
  let snapTimer = null;
  let tween = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const scrollTo = (left) => {
    const target = Math.max(0, Math.min(left, maxScroll()));
    const from = viewport.scrollLeft;
    const distance = target - from;

    window.clearTimeout(snapTimer);
    if (tween) window.clearTimeout(tween);
    viewport.style.scrollSnapType = 'none';

    if (reduced.matches || Math.abs(distance) < 2) {
      viewport.scrollLeft = target;
      viewport.style.scrollSnapType = '';
      update();
      return;
    }

    // Tween piloté par setTimeout : indépendant de requestAnimationFrame,
    // qui peut être suspendu selon l'état de la fenêtre.
    const duration = 460;
    const startTime = Date.now();
    const frame = () => {
      const progress = Math.min(1, (Date.now() - startTime) / duration);
      viewport.scrollLeft = from + distance * easeOut(progress);
      if (progress < 1) {
        tween = window.setTimeout(frame, 16);
      } else {
        tween = null;
        snapTimer = window.setTimeout(() => {
          viewport.style.scrollSnapType = '';
        }, 60);
      }
    };
    frame();
  };

  if (prev) on(prev, 'click', () => scrollTo(viewport.scrollLeft - step()));
  if (next) on(next, 'click', () => scrollTo(viewport.scrollLeft + step()));

  on(viewport, 'scroll', update, { passive: true });
  on(window, 'resize', update);

  // ---- Glisser-déposer à la souris (le tactile utilise le scroll natif) ----
  let pointerId = null;
  let startX = 0;
  let startLeft = 0;
  let moved = 0;

  on(viewport, 'pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startLeft = viewport.scrollLeft;
    moved = 0;
    viewport.setPointerCapture(pointerId);
  });

  on(viewport, 'pointermove', (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const delta = event.clientX - startX;
    if (!moved && Math.abs(delta) < 4) return;
    moved = Math.max(moved, Math.abs(delta));
    viewport.dataset.dragging = 'true';
    viewport.scrollLeft = startLeft - delta;
  });

  const endDrag = (event) => {
    if (pointerId === null || (event && event.pointerId !== pointerId)) return;
    if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
    pointerId = null;
    if (viewport.dataset.dragging === 'true') {
      delete viewport.dataset.dragging;
      // Recalage sur la slide la plus proche
      scrollTo(currentIndex() * step());
    }
  };
  on(viewport, 'pointerup', endDrag);
  on(viewport, 'pointercancel', endDrag);
  on(viewport, 'click', (event) => {
    if (moved > 6) {
      event.preventDefault();
      event.stopPropagation();
      moved = 0;
    }
  }, true);

  // ---- Clavier ----
  on(viewport, 'keydown', (event) => {
    const actions = {
      ArrowRight: () => scrollTo(viewport.scrollLeft + step()),
      ArrowLeft: () => scrollTo(viewport.scrollLeft - step()),
      Home: () => scrollTo(0),
      End: () => scrollTo(maxScroll()),
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
  });

  update();
  window.setTimeout(update, 350);
}
