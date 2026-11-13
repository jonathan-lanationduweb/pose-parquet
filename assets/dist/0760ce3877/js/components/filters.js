import { qsa, on } from '../utils/dom.js';



export function initFilters(root) {
  const targetId = root.dataset.filters;
  const container = document.getElementById(targetId);
  if (!container) return;
  const chips = qsa('.filter-chip', root);
  const items = qsa('[data-tags]', container);
  const empty = document.querySelector(`[data-filters-empty="${targetId}"]`);

  const groupeDe = (chip) => chip.dataset.filterGroup || '';
  const groupes = [...new Set(chips.map(groupeDe).filter(Boolean))];
  const axes = groupes.length ? groupes : [''];

  const actifs = new Map();
  const actif = (groupe) => actifs.get(groupe) || 'all';
  const rienDeFiltre = () => axes.every((g) => actif(g) === 'all');

  const correspond = (item) => {
    const tags = item.dataset.tags.split(' ');
    return axes.every((g) => actif(g) === 'all' || tags.includes(actif(g)));
  };

  const peindre = () => {
    chips.forEach((chip) => {
      const groupe = groupeDe(chip);
      const valeur = chip.dataset.filterValue;
      const pressed = valeur === 'all' && !groupe ? rienDeFiltre() : actif(groupe) === valeur;
      chip.setAttribute('aria-pressed', String(pressed));
    });
  };

  const apply = (valeur) => {
    let visible = 0;
    items.forEach((item) => {
      const match = correspond(item);
      item.hidden = !match;
      if (match) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
    container.dataset.filtered = String(!rienDeFiltre());
    peindre();


    container.dispatchEvent(
      new CustomEvent('filtres:appliques', { bubbles: true, detail: { valeur, visibles: visible } })
    );
  };

  chips.forEach((chip) => {
    on(chip, 'click', () => {
      const groupe = groupeDe(chip);
      const valeur = chip.dataset.filterValue;
      if (valeur === 'all' && !groupe) actifs.clear();
      else if (actif(groupe) === valeur) actifs.delete(groupe);
      else actifs.set(groupe, valeur);
      apply(valeur);
    });
  });
}
