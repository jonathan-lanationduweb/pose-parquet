import { qs, on } from '../utils/dom.js';

/**
 * Carrousel piloté par le scroll vertical de la page.
 *
 * Principe (aucun détournement de la molette) :
 *  - la section reçoit une hauteur calculée = hauteur du bloc collant
 *    + distance horizontale à parcourir ;
 *  - le bloc interne est `position: sticky` ;
 *  - la progression verticale dans la section est convertie en `scrollLeft`.
 *
 * Le scroll de la page reste 100 % natif : on ne fait que lire `scrollY`.
 * Activé seulement sur écran large, sans « mouvement réduit », et désactivé
 * proprement (retour au carrousel classique) dans le cas contraire.
 */
export function initScrollCarousel(section, api) {
  if (!api) return;

  const sticky = qs('[data-scroll-sticky]', section);
  if (!sticky) return;

  const wide = window.matchMedia('(min-width: 62rem)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const factor = Number(section.dataset.scrollFactor || 1);

  let active = false;
  let ticking = false;
  let travel = 0; // distance verticale utile
  let horizontal = 0;

  const measure = () => {
    horizontal = api.maxScroll();
    travel = Math.round(horizontal * factor);
    section.style.height = travel > 0 ? `${sticky.offsetHeight + travel}px` : '';
  };

  const apply = () => {
    ticking = false;
    if (!active || travel <= 0) return;
    const rect = section.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / travel));
    api.viewport.scrollLeft = progress * horizontal;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(apply);
    // Filet : requestAnimationFrame peut être suspendu (fenêtre en arrière-plan).
    window.setTimeout(() => {
      if (ticking) apply();
    }, 120);
  };

  /** Les boutons déplacent la page : une slide = une fraction du parcours. */
  const navigate = (direction) => {
    if (!Number.isFinite(direction)) {
      const rect = section.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      window.scrollTo({ top: direction > 0 ? top + travel : top, behavior: 'smooth' });
      return;
    }
    const slideTravel = travel / Math.max(api.slides.length - 1, 1);
    window.scrollBy({ top: direction * slideTravel, behavior: 'smooth' });
  };

  const enable = () => {
    if (active) return;
    active = true;
    section.dataset.scrollActive = 'true';
    api.setMode('scroll', { onNavigate: navigate });
    measure();
    apply();
  };

  const disable = () => {
    if (!active) return;
    active = false;
    section.dataset.scrollActive = 'false';
    section.style.height = '';
    api.setMode('free');
    api.viewport.scrollLeft = 0;
  };

  const sync = () => {
    if (wide.matches && !reduced.matches) enable();
    else disable();
  };

  on(window, 'scroll', onScroll, { passive: true });
  on(window, 'resize', () => {
    sync();
    if (active) {
      measure();
      apply();
    }
  });
  wide.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  on(window, 'load', () => {
    if (active) {
      measure();
      apply();
    }
  });

  sync();
  // Les images se chargent après coup : on remesure une fois posées.
  window.setTimeout(() => {
    if (active) {
      measure();
      apply();
    }
  }, 900);
}
