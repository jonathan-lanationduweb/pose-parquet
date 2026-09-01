import { qsa, on } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';

/**
 * Apparition progressive au scroll.
 *
 * L'animation est décorative : le contenu ne doit jamais rester masqué.
 * IntersectionObserver assure le cas nominal, un contrôle géométrique au
 * scroll sert de filet (onglet initialement masqué, observer inactif), et
 * tout est révélé d'emblée si le mouvement réduit est demandé.
 */
export function initReveal() {
  const items = qsa('[data-reveal]');
  if (!items.length) return;

  const revealAll = () => items.forEach((item) => { item.dataset.revealed = 'true'; });

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  const reveal = (item) => {
    if (item.dataset.revealed === 'true') return;
    const delay = Number(item.dataset.revealDelay || 0);
    window.setTimeout(() => { item.dataset.revealed = 'true'; }, delay);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );

  items.forEach((item) => observer.observe(item));

  // Filet de sécurité : révèle ce qui est déjà entré dans la fenêtre.
  let scheduled = false;
  const sweep = () => {
    scheduled = false;
    items.forEach((item) => {
      if (item.dataset.revealed === 'true') return;
      const rect = item.getBoundingClientRect();
      // Tout ce qui est entré dans la fenêtre, ou déjà dépassé, doit être visible.
      if (rect.top < window.innerHeight * 0.95) {
        reveal(item);
        observer.unobserve(item);
      }
    });
  };
  // setTimeout plutôt que requestAnimationFrame : le filet doit aussi
  // fonctionner lorsque l'onglet n'est pas au premier plan.
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(sweep, 60);
  };

  on(window, 'load', schedule);
  on(window, 'scroll', schedule, { passive: true });
  on(window, 'resize', schedule);
  on(document, 'visibilitychange', schedule);
  window.setTimeout(schedule, 400);
}
