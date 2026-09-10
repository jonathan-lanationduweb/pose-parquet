import { qs, qsa, on, trapFocus } from '../utils/dom.js';

let lastFocused = null;

function open(modal) {
  lastFocused = document.activeElement;
  modal.dataset.open = 'true';
  document.body.dataset.drawerOpen = 'true';
  const focusable = qs('button, a[href], input', modal);
  if (focusable) focusable.focus();
}

function close(modal) {
  modal.dataset.open = 'false';
  document.body.dataset.drawerOpen = 'false';
  if (lastFocused) lastFocused.focus();
}

/** Modale generique : [data-modal-open="id"] ouvre #id. */
export function initModals() {
  const modals = qsa('[data-modal]');
  if (!modals.length) return;

  qsa('[data-modal-open]').forEach((trigger) => {
    on(trigger, 'click', () => {
      const modal = document.getElementById(trigger.dataset.modalOpen);
      if (modal) open(modal);
    });
  });

  modals.forEach((modal) => {
    qsa('[data-modal-close]', modal).forEach((btn) => on(btn, 'click', () => close(modal)));
    on(modal, 'click', (event) => {
      if (event.target === modal) close(modal);
    });
    on(document, 'keydown', (event) => {
      if (modal.dataset.open !== 'true') return;
      if (event.key === 'Escape') close(modal);
      if (event.key === 'Tab') trapFocus(modal, event);
    });
  });
}

/** Lightbox de galerie : reutilise la modale media. */
export function initLightbox() {
  const modal = qs('[data-lightbox]');
  if (!modal) return;
  const slot = qs('[data-lightbox-slot]', modal);
  const caption = qs('[data-lightbox-caption]', modal);

  qsa('[data-lightbox-trigger]').forEach((trigger) => {
    on(trigger, 'click', () => {
      const media = trigger.querySelector('img, svg');
      if (media && slot) {
        slot.innerHTML = '';
        const clone = media.cloneNode(true);
        clone.removeAttribute('loading');
        slot.appendChild(clone);
      }
      if (caption) caption.textContent = trigger.dataset.lightboxTrigger || '';
      open(modal);
    });
  });
}
