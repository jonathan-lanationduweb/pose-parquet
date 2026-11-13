import { echapper } from '../utils/dom.js';
import { activateDialog } from '../utils/dialog.js';
const PATTERN_LABELS = {
  lames: 'Lames droites',
  'point-de-hongrie': 'Point de Hongrie',
  'baton-rompu': 'Bâton rompu',
};

export function createCompare(host, { renderer, catalog, paintConfig, onUse, projectLink }) {
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
      <a class="btn btn--sm btn--light" data-project href="#">Décrire mon projet</a>
    </footer>`;

  const body = root.querySelector('[data-body]');
  const title = root.querySelector('[data-title]');
  const modes = root.querySelector('[data-modes]');
  const count = root.querySelector('[data-count]');
  let mode = 'slider';
  let current = [];
  let releaseDialog = null;

  const refreshPending = () => {
    const pending = Boolean(body.querySelector('.is-loading'));
    root.setAttribute('aria-busy', String(pending));
    title.textContent = `Comparer ${current.length} versions${pending ? ' · Préparation…' : ''}`;
  };

  const label = (variant) => {
    const material = catalog.get(variant.config.materialId);
    return { name: material ? material.name : '—', pattern: PATTERN_LABELS[variant.config.pattern] || '' };
  };



  const canvasFor = (variant) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'cmp__canvas';
    const config = paintConfig(variant.config);




    if (!renderer.paint(canvas, config, null, 1) && renderer.enAttente) {
      canvas.classList.add('is-loading');
      if (renderer.photo) canvas.getContext('2d').drawImage(renderer.photo, 0, 0, canvas.width, canvas.height);
      renderer.preparer(config).then(() => {
        if (canvas.isConnected) renderer.paint(canvas, config, null, 1);
      }).catch(() => {
        if (!canvas.isConnected) return;
        const error = document.createElement('p');
        error.setAttribute('role', 'status');
        error.textContent = 'Ce rendu n’a pas pu être chargé. Fermez puis rouvrez la comparaison pour réessayer.';
        canvas.replaceWith(error);
      }).finally(() => { canvas.classList.remove('is-loading'); refreshPending(); });
    }
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
      item.innerHTML = `<strong>${echapper(info.name)}</strong><span>${echapper(info.pattern)}</span>`;
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
      caption.innerHTML = `<strong>${echapper(info.name)}</strong><span>${echapper(info.pattern)}</span>`;
      caption.appendChild(useButton(variant));
      cell.appendChild(caption);
      grid.appendChild(cell);
    });
    body.appendChild(grid);


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
    refreshPending();
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
    releaseDialog?.();
    releaseDialog = null;
  };
  root.querySelector('[data-close]').addEventListener('click', close);





  host.appendChild(root);

  return {
    element: root,
    open(variants) {
      current = variants;
      title.textContent = `Comparer ${variants.length} versions`;
      if (projectLink) root.querySelector('[data-project]').href = projectLink(variants[0]);
      if (variants.length !== 2) mode = 'grid';
      modes.querySelectorAll('[data-mode]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mode === mode)));
      draw();
      root.hidden = false;
      document.body.classList.add('is-comparing');
      if (!releaseDialog) releaseDialog = activateDialog(root, { onClose: close, initialFocus: root.querySelector('[data-close]') });
    },
    close,
  };
}
