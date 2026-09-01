import { qsa, on } from '../utils/dom.js';

/** Filtres de liste par categorie (rubriques guides / inspiration). */
export function initFilters(root) {
  const targetId = root.dataset.filters;
  const container = document.getElementById(targetId);
  if (!container) return;
  const chips = qsa('.filter-chip', root);
  const items = qsa('[data-tags]', container);
  const empty = document.querySelector(`[data-filters-empty="${targetId}"]`);

  const apply = (value) => {
    let visible = 0;
    items.forEach((item) => {
      const match = value === 'all' || item.dataset.tags.split(' ').includes(value);
      item.hidden = !match;
      if (match) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
  };

  chips.forEach((chip) => {
    on(chip, 'click', () => {
      chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
      apply(chip.dataset.filterValue);
    });
  });
}
