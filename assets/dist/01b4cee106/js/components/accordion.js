import { qsa, on } from '../utils/dom.js';

/** Accordeon accessible : un panneau ouvert a la fois (option data-multiple). */
export function initAccordion(root) {
  const multiple = root.dataset.multiple === 'true';
  const items = qsa('.accordion__item', root);

  items.forEach((item) => {
    const trigger = item.querySelector('.accordion__trigger');
    const panel = item.querySelector('.accordion__panel');
    if (!trigger || !panel) return;

    on(trigger, 'click', () => {
      const isOpen = item.dataset.open === 'true';
      if (!multiple) {
        items.forEach((other) => {
          other.dataset.open = 'false';
          other.querySelector('.accordion__trigger').setAttribute('aria-expanded', 'false');
        });
      }
      item.dataset.open = String(!isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}
