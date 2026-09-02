/**
 * Catalogue de parquets.
 *
 * Les références viennent de data/parquets.json : le catalogue est une
 * donnée, pas du code. Ajouter vingt, cent ou cinq cents références ne
 * demande donc aucune modification d'interface — la recherche, les filtres et
 * la fabrication des échantillons à la demande sont déjà là.
 *
 * Chaque carte affiche un véritable échantillon de bois, dessiné par le même
 * moteur que le sol : ce que l'on voit dans la vignette est ce que l'on
 * obtient dans la pièce.
 */
import { buildSwatch } from '../scene/texture.js';
import { createMaterial } from '../scene/material.js';

export async function loadCatalog(base = '') {
  const response = await fetch(`${base}data/parquets.json`, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Catalogue indisponible');
  const data = await response.json();
  // Les entrées brutes deviennent des matériaux complets dès le chargement :
  // largeur et longueur de lame, rugosité et brillance déduites de la
  // finition, emplacements prévus pour de vraies cartes photographiques.
  // Tout le reste de l'outil ne manipule donc que des matériaux.
  const parquets = data.parquets.map(createMaterial);
  const byId = new Map(parquets.map((item) => [item.id, item]));
  return { ...data, parquets, byId, get: (id) => byId.get(id) };
}

/** Vignette de matériau, fabriquée une seule fois puis réutilisée. */
const swatches = new Map();
export function swatchFor(material, options) {
  if (!swatches.has(material.id)) swatches.set(material.id, buildSwatch(material, options));
  return swatches.get(material.id);
}

export function createCatalog(host, catalog, { onSelect, onVisible }) {
  const wrap = document.createElement('div');
  wrap.className = 'cat';
  wrap.innerHTML = `
    <div class="cat__head">
      <label class="cat__search">
        <span class="visually-hidden">Rechercher un parquet</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Rechercher" data-search />
      </label>
      <div class="cat__filters" role="group" aria-label="Filtrer par teinte" data-filters></div>
    </div>
    <div class="cat__grid" data-grid></div>
    <p class="cat__empty" data-empty hidden>Aucun parquet ne correspond.</p>`;

  const grid = wrap.querySelector('[data-grid]');
  const filters = wrap.querySelector('[data-filters]');
  const search = wrap.querySelector('[data-search]');
  const empty = wrap.querySelector('[data-empty]');

  let tone = 'all';
  let query = '';

  [{ id: 'all', label: 'Tout' }, ...catalog.tones].forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cat__filter';
    button.dataset.tone = item.id;
    button.setAttribute('aria-pressed', String(item.id === 'all'));
    button.textContent = item.label;
    button.addEventListener('click', () => {
      tone = item.id;
      filters
        .querySelectorAll('[data-tone]')
        .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.tone === tone)));
      apply();
    });
    filters.appendChild(button);
  });

  // Les échantillons ne sont dessinés que lorsque la carte approche de l'écran :
  // le catalogue reste léger même avec beaucoup de références.
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              observer.unobserve(entry.target);
              paintSwatch(entry.target);
            });
          },
          { root: wrap, rootMargin: '240px' }
        )
      : null;

  function paintSwatch(card) {
    if (card.dataset.painted) return;
    const material = catalog.get(card.dataset.material);
    const slot = card.querySelector('.cat__media');
    const swatch = swatchFor(material);
    const canvas = document.createElement('canvas');
    canvas.width = swatch.width;
    canvas.height = swatch.height;
    canvas.className = 'cat__swatch';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Échantillon ${material.name}`);
    canvas.getContext('2d').drawImage(swatch, 0, 0);
    slot.innerHTML = '';
    slot.appendChild(canvas);
    card.dataset.painted = 'true';
    // La texture de sol correspondante est préparée en tâche de fond :
    // le clic n'a plus qu'à peindre.
    if (onVisible) onVisible(material);
  }

  const cards = catalog.parquets.map((material) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cat__card';
    card.dataset.material = material.id;
    card.dataset.tone = material.tone;
    card.setAttribute('aria-pressed', 'false');
    // Une carte = une matière. Le nom, rien de plus : la finition et la largeur
    // de lame sont dans l'en-tête du contexte, pas répétées douze fois.
    card.innerHTML = `
      <span class="cat__media"></span>
      <span class="cat__label">${material.name}</span>`;
    card.addEventListener('click', () => onSelect(material));
    grid.appendChild(card);
    if (observer) observer.observe(card);
    else paintSwatch(card);
    return card;
  });

  // Filet : dans un onglet en arrière-plan, l'observateur ne se déclenche pas.
  // On peint alors les premières cartes après un court délai.
  window.setTimeout(() => {
    cards.slice(0, 12).forEach((card) => {
      if (!card.hidden) paintSwatch(card);
    });
  }, 900);

  function apply() {
    const needle = query.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const material = catalog.get(card.dataset.material);
      const matchTone = tone === 'all' || material.tone === tone;
      const matchText =
        !needle ||
        `${material.name} ${material.wood} ${material.finish}`.toLowerCase().includes(needle);
      const show = matchTone && matchText;
      card.hidden = !show;
      if (show) {
        visible += 1;
        if (!card.dataset.painted) paintSwatch(card);
      }
    });
    empty.hidden = visible > 0;
  }

  search.addEventListener('input', () => {
    query = search.value;
    apply();
  });

  host.appendChild(wrap);

  return {
    element: wrap,
    setActive(id) {
      cards.forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.material === id)));
    },
    /** Références voisines : préparées à l'avance pour que le clic soit instantané. */
    neighbours(id) {
      const index = catalog.parquets.findIndex((item) => item.id === id);
      return [catalog.parquets[index + 1], catalog.parquets[index - 1]].filter(Boolean);
    },
  };
}
