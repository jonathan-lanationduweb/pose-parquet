import { qsa, on } from '../utils/dom.js';

/** Infobulle sur terme technique : survol, focus et clavier. */
export function initTooltips() {
  qsa('[data-tip]').forEach((tip) => {
    const bubble = document.createElement('span');
    bubble.className = 'tip__bubble';
    bubble.setAttribute('role', 'tooltip');
    bubble.id = `tip-${Math.random().toString(36).slice(2, 8)}`;
    bubble.textContent = tip.dataset.tip;
    tip.appendChild(bubble);
    tip.setAttribute('aria-describedby', bubble.id);

    const setOpen = (open) => { tip.dataset.open = String(open); };
    on(tip, 'pointerenter', () => setOpen(true));
    on(tip, 'pointerleave', () => setOpen(false));
    on(tip, 'focus', () => setOpen(true));
    on(tip, 'blur', () => setOpen(false));
    on(tip, 'click', () => setOpen(tip.dataset.open !== 'true'));
    on(document, 'keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  });
}
