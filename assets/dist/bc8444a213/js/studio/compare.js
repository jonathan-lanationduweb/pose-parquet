/**
 * Comparaison de variantes.
 *
 * Deux variantes : curseur (même photo, même cadrage, même masque) ou côte à
 * côte. Trois variantes : trois vues égales sur grand écran, un balayage
 * horizontal sur téléphone — jamais trois vignettes minuscules.
 *
 * À ne pas confondre avec « Avant / après », qui oppose la photo d'origine au
 * parquet posé. Ici, on compare des parquets entre eux.
 */
const PATTERN_LABELS = {
  lames: 'Lames droites',
  'point-de-hongrie': 'Point de Hongrie',
  'baton-rompu': 'Bâton rompu',
};

export function createCompare(host, { renderer, catalog, onUse, projectLink }) {
  const root = document.createElement('div');
  root.className = 'cmp';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Comparer les versions');
  root.innerHTML = `
    <header class="cmp__bar">
      <p class="cmp__title" data-title>Comparer</p>
      <div class="cmp__modes" role="group" aria-label="Mode de comparaison" data-modes>
        <button class="cmp__mode" type="button" data-mode="slider" aria-pressed="true">Curseur</button>
        <button class="cmp__mode" type="button" data-mode="grid" aria-pressed="false">Côte à côte</button>
      </div>
      <button class="cmp__close" type="button" data-close aria-label="Fermer la comparaison">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>
      </button>
    </header>
    <div class="cmp__body" data-body></div>
    <p class="cmp__count" data-count hidden aria-live="polite"></p>
    <footer class="cmp__foot">
      <p>Vous avez trouvé votre rendu ?</p>
      <a class="btn btn--sm btn--ghost" data-project href="#">Décrire mon projet</a>
    </footer>`;

  const body = root.querySelector('[data-body]');
  const title = root.querySelector('[data-title]');
  const modes = root.querySelector('[data-modes]');
  const count = root.querySelector('[data-count]');
  let mode = 'slider';
  let current = [];

  const label = (variant) => {
    const material = catalog.get(variant.config.materialId);
    return { name: material ? material.name : '—', pattern: PATTERN_LABELS[variant.config.pattern] || '' };
  };

  const canvasFor = (variant) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'cmp__canvas';
    renderer.paint(canvas, catalog.get(variant.config.materialId), variant.config, 1);
    return canvas;
  };

  const useButton = (variant) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--sm btn--solid';
    button.textContent = 'Utiliser cette version';
    button.addEventListener('click', () => onUse(variant));
    return button;
  };

  function renderSlider(variants) {
    const stage = document.createElement('div');
    stage.className = 'cmp__slider';
    const a = canvasFor(variants[0]);
    const b = canvasFor(variants[1]);
    b.classList.add('cmp__canvas--b');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.value = '50';
    range.className = 'cmp__range';
    const first = label(variants[0]);
    const second = label(variants[1]);
    range.setAttribute('aria-label', `Curseur entre ${first.name} et ${second.name}`);
    const handle = document.createElement('span');
    handle.className = 'cmp__handle';
    handle.setAttribute('aria-hidden', 'true');
    const tagA = document.createElement('span');
    tagA.className = 'cmp__tag cmp__tag--a';
    tagA.textContent = first.name;
    const tagB = document.createElement('span');
    tagB.className = 'cmp__tag cmp__tag--b';
    tagB.textContent = second.name;

    const apply = () => stage.style.setProperty('--split', `${range.value}%`);
    range.addEventListener('input', apply);
    apply();

    stage.append(a, b, tagA, tagB, range, handle);

    const actions = document.createElement('div');
    actions.className = 'cmp__actions';
    variants.forEach((variant) => {
      const item = document.createElement('div');
      item.className = 'cmp__action';
      const info = label(variant);
      item.innerHTML = `<strong>${info.name}</strong><span>${info.pattern}</span>`;
      item.appendChild(useButton(variant));
      actions.appendChild(item);
    });

    body.append(stage, actions);
  }

  function renderGrid(variants) {
    const grid = document.createElement('div');
    grid.className = 'cmp__grid';
    grid.dataset.items = String(variants.length);
    variants.forEach((variant, index) => {
      const cell = document.createElement('figure');
      cell.className = 'cmp__cell';
      cell.dataset.index = String(index + 1);
      cell.appendChild(canvasFor(variant));
      const info = label(variant);
      const caption = document.createElement('figcaption');
      caption.className = 'cmp__caption';
      caption.innerHTML = `<strong>${info.name}</strong><span>${info.pattern}</span>`;
      caption.appendChild(useButton(variant));
      cell.appendChild(caption);
      grid.appendChild(cell);
    });
    body.appendChild(grid);

    // Compteur « 1 / 3 » pendant le balayage sur petit écran
    if (variants.length > 1) {
      count.hidden = false;
      const update = () => {
        const index = Math.round(grid.scrollLeft / Math.max(1, grid.clientWidth)) + 1;
        count.textContent = `${Math.min(index, variants.length)} / ${variants.length}`;
      };
      update();
      grid.addEventListener('scroll', update, { passive: true });
    }
  }

  function draw() {
    body.innerHTML = '';
    count.hidden = true;
    const two = current.length === 2;
    modes.hidden = !two;
    if (two && mode === 'slider') renderSlider(current);
    else renderGrid(current);
  }

  modes.querySelectorAll('[data-mode]').forEach((button) =>
    button.addEventListener('click', () => {
      mode = button.dataset.mode;
      modes
        .querySelectorAll('[data-mode]')
        .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.mode === mode)));
      draw();
    })
  );

  const close = () => {
    root.hidden = true;
    body.innerHTML = '';
    document.body.classList.remove('is-comparing');
  };
  root.querySelector('[data-close]').addEventListener('click', close);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  host.appendChild(root);

  return {
    element: root,
    open(variants) {
      current = variants;
      title.textContent = `Comparer ${variants.length} versions`;
      if (projectLink) root.querySelector('[data-project]').href = projectLink(variants[0]);
      if (variants.length !== 2) mode = 'grid';
      draw();
      root.hidden = false;
      document.body.classList.add('is-comparing');
      window.setTimeout(() => root.querySelector('[data-close]').focus({ preventScroll: true }), 50);
    },
    close,
  };
}
