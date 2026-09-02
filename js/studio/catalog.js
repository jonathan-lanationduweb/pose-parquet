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
import { chargerProduits, versMateriau } from '../scene/product.js';

/**
 * Charge le catalogue en passant par la **couche produit**.
 *
 * Les références traversent désormais `js/scene/product.js`, qui les ramène à
 * une fiche canonique — essence, gamme, teinte, finition, largeur de lame,
 * motifs autorisés, famille de rendu — avant que le moteur n'en fasse un
 * matériau. C'est ce qui permettra de substituer un export Premibel à
 * `data/parquets.json` sans toucher ni l'interface ni le rendu : seule la
 * source change.
 *
 * La forme rendue reste celle qu'attendait le reste de l'outil (`parquets`,
 * `byId`, `get(id)`, `patterns`), augmentée de `fiches` et `familles` pour ce
 * qui a besoin des données commerciales.
 */
export async function loadCatalog(base = '') {
  const { fiches, familles, source } = await chargerProduits(base);
  if (!fiches.length) throw new Error('Catalogue indisponible');

  // Les motifs de pose ne sont pas une donnée de produit : ils décrivent des
  // façons de poser et restent décrits une seule fois.
  const meta = await fetch(`${base}data/parquets.json`, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));

  const parquets = fiches.map((fiche) => createMaterial(versMateriau(fiche)));
  const byId = new Map(parquets.map((item) => [item.id, item]));

  const incomplets = fiches.filter((f) => f.avertissements.length);
  if (incomplets.length) {
    // Une fiche incomplète ne doit pas faire tomber la page, mais elle ne doit
    // pas passer inaperçue non plus : le jour où le catalogue vient d'un ERP,
    // c'est ici qu'on verra les trous.
    console.warn(
      '[catalogue] fiches incomplètes :',
      incomplets.map((f) => `${f.id} (${f.avertissements.join(', ')})`).join(' · ')
    );
  }

  return { ...meta, parquets, byId, get: (id) => byId.get(id), fiches, familles, source };
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
