import { qs, qsa, on, trapFocus } from '../utils/dom.js';

/**
 * En-tete : etat scrolle, drawer mobile, lien actif.
 */
export function initNav() {
  const header = qs('[data-header]');
  if (!header) return;

  const toggle = qs('[data-nav-toggle]', header);
  const drawer = qs('[data-drawer]');

  const setScrolled = () => {
    header.dataset.scrolled = String(window.scrollY > 8);
  };
  setScrolled();
  on(window, 'scroll', setScrolled, { passive: true });

  if (!toggle || !drawer) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    drawer.dataset.open = String(open);
    document.body.dataset.drawerOpen = String(open);
    if (open) {
      const firstLink = qs('a, button', drawer);
      if (firstLink) firstLink.focus();
    }
  };

  on(toggle, 'click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

  on(document, 'keydown', (event) => {
    if (drawer.dataset.open !== 'true') return;
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    }
    if (event.key === 'Tab') trapFocus(drawer, event);
  });

  qsa('a', drawer).forEach((link) => on(link, 'click', () => setOpen(false)));

  const desktop = window.matchMedia('(min-width: 68rem)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/** Marque le lien de navigation correspondant a la page courante. */
export function markCurrentNav() {
  const path = window.location.pathname.replace(/index\.html$/, '');
  qsa('[data-nav-section]').forEach((link) => {
    const section = link.dataset.navSection;
    if (section && path.includes(`/${section}`)) {
      link.setAttribute('aria-current', 'page');
    }
  });
}
