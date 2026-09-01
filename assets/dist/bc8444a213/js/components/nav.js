import { qs, qsa, on, trapFocus } from '../utils/dom.js';

/**
 * En-tête : état scrollé, superposition au visuel de tête, menu plein écran.
 */
export function initNav() {
  const header = qs('[data-header]');
  if (!header) return;

  const hero = qs('[data-hero]');
  const toggle = qs('[data-nav-toggle]', header);
  const drawer = qs('[data-drawer]');

  const sync = () => {
    header.dataset.scrolled = String(window.scrollY > 24);
    if (hero) {
      const limit = hero.offsetTop + hero.offsetHeight - 90;
      header.dataset.over = String(window.scrollY < limit && window.scrollY <= 24);
    }
  };
  sync();
  on(window, 'scroll', sync, { passive: true });
  on(window, 'resize', sync);

  if (!toggle || !drawer) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    drawer.dataset.open = String(open);
    document.body.dataset.drawerOpen = String(open);
    if (open) {
      header.dataset.over = 'false';
      const first = qs('a, button', drawer);
      if (first) first.focus();
    } else {
      sync();
    }
  };

  on(toggle, 'click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (!open) toggle.focus();
  });

  on(document, 'keydown', (event) => {
    if (drawer.dataset.open !== 'true') return;
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    }
    // Le bouton de fermeture vit dans l'en-tête, hors du panneau : on l'inclut
    // explicitement dans le cycle, sinon on ne peut pas l'atteindre au clavier.
    if (event.key === 'Tab') trapFocus([toggle, drawer], event);
  });

  qsa('a', drawer).forEach((link) => on(link, 'click', () => setOpen(false)));

  window.matchMedia('(min-width: 62rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/** Marque le lien de navigation correspondant à la page courante. */
export function markCurrentNav() {
  const path = window.location.pathname.replace(/index\.html$/, '');
  qsa('[data-nav-section]').forEach((link) => {
    const section = link.dataset.navSection;
    if (section && path.includes(`/${section}`)) link.setAttribute('aria-current', 'page');
  });
}
