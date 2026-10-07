import { qsa, on } from '../utils/dom.js';

/**
 * Filtres de liste par catégorie (rubriques guides / inspiration).
 *
 * Deux formes de barre, un seul composant :
 *
 *  - PLATE : une rangée de pastilles, une seule active à la fois. C'est la
 *    rubrique des guides, et le comportement d'origine.
 *
 *  - GROUPÉE : des pastilles réparties en groupes (`data-filter-group`), une
 *    active par groupe, et les groupes se COMBINENT. Sur la page Inspiration,
 *    « Point de Hongrie » puis « Chambre » ne montre que les chambres en
 *    point de Hongrie — six pastilles indépendantes auraient obligé à choisir
 *    entre le motif et la pièce. La pastille sans groupe (« Tout ») remet
 *    tous les groupes à zéro ; recliquer une pastille active la relâche.
 *
 * Le conteneur filtré reçoit `data-filtered` : la grille Inspiration s'en
 * sert pour abandonner sa mise en page « à la une » quand une sélection est
 * en cours — une carte dominante n'a de sens que devant la collection
 * complète.
 */
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
  /* groupe → valeur active ; en mode plat, la clé est la chaîne vide. */
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
    /*
     * Le filtre ne sait pas ce qu'il filtre — une grille, un carrousel,
     * autre chose demain. Il annonce donc son passage et laisse celui que
     * cela concerne se remettre à jour.
     */
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
