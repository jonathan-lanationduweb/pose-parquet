/**
 * Pose Parquet Studio — application de visualisation.
 *
 * Trois écrans seulement : choisir une pièce, essayer des parquets, comparer.
 * Tout le reste (correction du masque, largeur exacte, échelle, angle libre)
 * vit dans « Réglages avancés » et ne s'affiche que si on le demande.
 *
 * Rien ne quitte le navigateur : la photo est lue localement, le rendu est
 * calculé localement, aucun envoi vers un serveur.
 */
import { qs, on } from '../utils/dom.js';
import { ROOMS, getRoom } from '../visualizer/rooms.js';
import { loadImage, loadFile } from '../visualizer/image-loader.js';
import { createFloorEditor, detectFloor } from '../visualizer/floor-mask.js';
import { composeRender, downloadCanvas } from '../visualizer/export.js';
import { createRenderer } from './render.js';
import { loadCatalog, createCatalog, swatchFor } from './catalog.js';
import { createCompare } from './compare.js';
import { buildTexture } from './texture.js';

const ORIENTATIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' },
  { angle: 90, label: 'Lames dans la profondeur', icon: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4' },
  { angle: 45, label: 'Diagonale vers la droite', icon: 'M6 18 18 6M18 12V6h-6' },
  { angle: -45, label: 'Diagonale vers la gauche', icon: 'M18 18 6 6M6 12V6h6' },
];

const icon = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

const ICONS = {
  before: 'M12 3v18M4 7h4M4 12h4M4 17h4M16 7h4M16 12h4M16 17h4',
  plus: 'M12 5v14M5 12h14',
  layers: 'm12 3 9 5-9 5-9-5 9-5M3 14l9 5 9-5',
  save: 'M5 4h11l3 3v13H5zM8 4v6h7V4M8 20v-6h8v6',
  help: 'M9.5 9a2.5 2.5 0 1 1 3 2.5V13M12 17h.01',
  reset: 'M4 10a8 8 0 1 1 1.6 6M4 4v6h6',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
};

const STORAGE = 'pose-parquet:studio';

export async function mountStudio(root) {
  const base = root.dataset.base || '../';

  root.className = 'studio';
  root.dataset.state = 'start';
  root.innerHTML = `
    <header class="studio__bar">
      <a class="studio__back" href="${base}index.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        <span><strong>Pose</strong> Parquet</span>
      </a>
      <p class="studio__project" data-project>Studio</p>
      <div class="studio__tools">
        <button class="studio__tool" type="button" data-help aria-label="Aide">${icon(ICONS.help)}</button>
        <button class="studio__tool" type="button" data-restart aria-label="Réinitialiser">${icon(ICONS.reset)}</button>
        <div class="studio__menu">
          <button class="studio__tool" type="button" data-menu aria-expanded="false" aria-label="Autres options">${icon(ICONS.more)}</button>
          <div class="studio__dropdown" data-dropdown hidden>
            <button type="button" data-advanced>Réglages avancés</button>
            <button type="button" data-fix>Corriger le sol</button>
            <a href="${base}outils/simulateur-pose.html">Passer au mode Plan</a>
            <a href="${base}outils/visualiseur.html">À propos du Studio</a>
          </div>
        </div>
      </div>
    </header>

    <section class="studio__start" data-start>
      <div class="start__inner">
        <h1 class="start__title">Visualisez votre parquet</h1>
        <p class="start__lead">Choisissez une pièce, essayez les parquets, comparez. Votre photo reste dans votre navigateur.</p>
        <div class="start__actions">
          <button class="btn btn--solid btn--lg" type="button" data-import>Importer ma pièce</button>
          <span class="start__or">ou choisissez une pièce d’exemple</span>
        </div>
        <div class="start__rooms" data-rooms></div>
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file />
      </div>
    </section>

    <main class="studio__main" data-main>
      <div class="studio__stage" data-stage>
        <div class="stage__media" data-media>
          <img class="stage__photo" alt="" data-photo />
          <canvas class="stage__canvas" data-canvas></canvas>
          <div class="stage__ba" data-ba hidden>
            <span class="stage__tag stage__tag--a">Avant</span>
            <span class="stage__tag stage__tag--b">Après</span>
            <input class="stage__range" type="range" min="0" max="100" value="50" data-ba-range aria-label="Curseur avant / après" />
            <span class="stage__handle" aria-hidden="true"></span>
          </div>
        </div>
        <p class="stage__status" data-status role="status" hidden></p>
        <button class="stage__room" type="button" data-change-room>
          <span class="stage__room-thumb" data-room-thumb></span>
          <span>Changer de pièce</span>
        </button>
      </div>

      <aside class="studio__panel" data-panel data-sheet="closed">
        <button class="panel__grab" type="button" data-sheet-toggle aria-label="Ouvrir ou fermer le panneau"></button>
        <div class="panel__selected" data-selected></div>
        <nav class="panel__tabs" role="tablist" data-tabs>
          <button class="panel__tab" type="button" role="tab" data-tab="parquets" aria-selected="true">Parquet</button>
          <button class="panel__tab" type="button" role="tab" data-tab="motifs" aria-selected="false">Motif</button>
          <button class="panel__tab" type="button" role="tab" data-tab="orientation" aria-selected="false">Orientation</button>
        </nav>
        <div class="panel__body">
          <div class="panel__view" data-view="parquets"></div>
          <div class="panel__view" data-view="motifs" hidden></div>
          <div class="panel__view" data-view="orientation" hidden></div>
        </div>
      </aside>

      <footer class="studio__actions">
        <div class="actions__variants" data-variants></div>
        <div class="actions__buttons">
          <button class="action" type="button" data-toggle-ba aria-pressed="false">${icon(ICONS.before)}<span>Avant / après</span></button>
          <button class="action" type="button" data-add>${icon(ICONS.plus)}<span>Ajouter à comparer</span></button>
          <button class="action" type="button" data-compare disabled>${icon(ICONS.layers)}<span data-compare-label>Comparer</span></button>
          <button class="action action--primary" type="button" data-save>${icon(ICONS.save)}<span>Enregistrer</span></button>
        </div>
      </footer>
    </main>

    <div class="studio__drawer" data-drawer hidden>
      <div class="drawer__head">
        <p data-drawer-title>Réglages avancés</p>
        <button class="studio__tool" type="button" data-drawer-close aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>
        </button>
      </div>
      <div class="drawer__body" data-drawer-body></div>
    </div>`;

  /* ---------------- Références ---------------- */
  const stage = qs('[data-stage]', root);
  const media = qs('[data-media]', root);
  const photo = qs('[data-photo]', root);
  const canvas = qs('[data-canvas]', root);
  const status = qs('[data-status]', root);
  const panel = qs('[data-panel]', root);
  const selected = qs('[data-selected]', root);
  const roomsHost = qs('[data-rooms]', root);
  const fileInput = qs('[data-file]', root);
  const variantsHost = qs('[data-variants]', root);
  const compareBtn = qs('[data-compare]', root);
  const compareLabel = qs('[data-compare-label]', root);
  const ba = qs('[data-ba]', root);
  const baRange = qs('[data-ba-range]', root);
  const drawer = qs('[data-drawer]', root);
  const drawerBody = qs('[data-drawer-body]', root);
  const drawerTitle = qs('[data-drawer-title]', root);
  const dropdown = qs('[data-dropdown]', root);

  const renderer = createRenderer();
  const catalog = await loadCatalog(base);

  let config = {
    materialId: catalog.parquets[0].id,
    pattern: catalog.parquets[0].defaultPattern,
    angle: 0,
    width: null,
    scale: 1,
  };
  let variants = [];
  let roomId = null;
  let userPhoto = false;
  let pending = false;
  let refine = 0;
  let quality = 1;
  let editor = null;

  const material = () => catalog.get(config.materialId);
  const setStatus = (message) => {
    status.textContent = message || '';
    status.hidden = !message;
  };

  /* ---------------- Rendu ---------------- */

  function paint() {
    pending = false;
    if (!renderer.ready) return;
    const ok = renderer.paint(canvas, material(), config, quality);
    if (!ok) {
      setStatus('Zone de sol invalide : corrigez-la dans « Corriger le sol ».');
      return;
    }
    setStatus('');
    if (quality > 1) {
      window.clearTimeout(refine);
      refine = window.setTimeout(() => {
        quality = 1;
        schedule();
      }, 180);
    }
  }

  function schedule(draft) {
    if (draft) {
      quality = 2;
      window.clearTimeout(refine);
    }
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(paint);
      else paint();
      window.setTimeout(() => {
        if (pending) paint();
      }, 130);
    }, 0);
  }

  /* ---------------- Écran de départ ---------------- */

  ROOMS.forEach((room) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'room-card';
    card.dataset.room = room.id;
    const stem = room.file.replace(/\.jpg$/, '');
    card.innerHTML = `
      <picture>
        <source type="image/webp" srcset="${base}assets/images/${stem}-640.webp" />
        <img src="${base}assets/images/${stem}-640.jpg" alt="${room.alt}" decoding="async" width="640" height="427" />
      </picture>
      <span class="room-card__label">${room.label}</span>`;
    card.addEventListener('click', () => openRoom(room.id));
    roomsHost.appendChild(card);
  });

  on(qs('[data-import]', root), 'click', () => fileInput.click());
  on(fileInput, 'change', () => {
    if (fileInput.files && fileInput.files[0]) openPhoto(fileInput.files[0]);
    fileInput.value = '';
  });

  /* ---------------- Chargement d'une pièce ---------------- */

  function afterSource(name) {
    root.dataset.state = 'edit';
    qs('[data-project]', root).textContent = name;
    photo.src = renderer.photo.toDataURL('image/jpeg', 0.9);
    if (editor) editor.setMode('off');
    quality = 1;
    schedule();
    renderer.warm(material(), config);
  }

  async function openRoom(id) {
    const room = getRoom(id);
    setStatus('Chargement…');
    try {
      const prepared = await loadImage(`${base}assets/images/${room.file}`);
      renderer.setSource(prepared, room.room);
      renderer.setZone(await detectFloor('manual', { canvas: prepared.canvas, suggestion: room.quad }), room.mask);
      roomId = room.id;
      userPhoto = false;
      photo.alt = room.alt;
      const stem = room.file.replace(/\.jpg$/, '');
      qs('[data-room-thumb]', root).style.backgroundImage = `url(${base}assets/images/${stem}-640.jpg)`;
      afterSource(room.label);
      setStatus('');
      mountEditor();
    } catch (error) {
      setStatus('La pièce n’a pas pu être chargée.');
      void error;
    }
  }

  async function openPhoto(file) {
    setStatus('Lecture de la photo…');
    try {
      const prepared = await loadFile(file);
      renderer.setSource(prepared, { width: 4.2, depth: 4 });
      renderer.setZone(await detectFloor('manual', { canvas: prepared.canvas }));
      roomId = null;
      userPhoto = true;
      photo.alt = 'Votre pièce';
      qs('[data-room-thumb]', root).style.backgroundImage = 'none';
      afterSource('Ma photo');
      mountEditor();
      openDrawer('zone');
      setStatus('Placez les quatre coins du sol, puis fermez le panneau.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.');
    }
  }

  /* ---------------- Sélections ---------------- */

  const catalogView = qs('[data-view="parquets"]', root);
  const catalogUi = createCatalog(catalogView, catalog, {
    onSelect: (item) => selectMaterial(item.id),
    onVisible: (item) => renderer.warm(item, { ...config, materialId: item.id }),
  });

  function selectMaterial(id) {
    const next = catalog.get(id);
    if (!next) return;
    config = { ...config, materialId: id };
    if (!next.compatiblePatterns.includes(config.pattern)) config.pattern = next.defaultPattern;
    catalogUi.setActive(id);
    syncSelected();
    syncPatterns();
    schedule(true);
    save();
    // Les références voisines sont préparées pendant que l'on regarde le rendu
    catalogUi.neighbours(id).forEach((item) => renderer.warm(item, { ...config, materialId: item.id }));
  }

  function syncSelected() {
    const item = material();
    if (!item) return;
    const swatch = swatchFor(item);
    selected.innerHTML = `
      <span class="selected__swatch"></span>
      <span class="selected__text">
        <strong>${item.name}</strong>
        <span>${item.finish} · lames ${Math.round(item.boardWidth * 100)} cm</span>
      </span>`;
    const slot = selected.querySelector('.selected__swatch');
    const mini = document.createElement('canvas');
    mini.width = swatch.width;
    mini.height = swatch.height;
    mini.getContext('2d').drawImage(swatch, 0, 0);
    slot.appendChild(mini);
  }

  /* Motifs */
  const patternsView = qs('[data-view="motifs"]', root);
  function syncPatterns() {
    const item = material();
    patternsView.innerHTML = '';
    catalog.patterns.forEach((pattern) => {
      const allowed = !item || item.compatiblePatterns.includes(pattern.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tile-card';
      card.dataset.pattern = pattern.id;
      card.disabled = !allowed;
      card.setAttribute('aria-pressed', String(config.pattern === pattern.id));
      card.innerHTML = `<span class="tile-card__media"></span><span class="tile-card__label"><strong>${pattern.label}</strong><span>${pattern.waste} de chutes</span></span>`;
      if (item && !patternsView.hidden) {
        const preview = document.createElement('canvas');
        preview.width = 220;
        preview.height = 150;
        card.querySelector('.tile-card__media').appendChild(preview);
        drawPatternPreview(preview, item, pattern.id);
      }
      card.addEventListener('click', () => {
        config = { ...config, pattern: pattern.id };
        syncPatterns();
        schedule(true);
        save();
      });
      patternsView.appendChild(card);
    });
  }

  /**
   * Aperçu de motif : la tuile réelle, dessinée en 256 px au lieu de 1024.
   * Seize fois moins de pixels pour la même image : indispensable, sinon
   * chaque changement de parquet reconstruirait trois tuiles pleines.
   */
  function drawPatternPreview(target, item, pattern) {
    const draw = () => {
      const tile = buildTexture(item, { pattern, width: item.boardWidth, size: 256 });
      const ctx = target.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tile, 20, 30, 180, 124, 0, 0, target.width, target.height);
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(draw, { timeout: 700 });
    else window.setTimeout(draw, 40);
  }

  /* Orientation */
  const orientationView = qs('[data-view="orientation"]', root);
  function syncOrientation() {
    orientationView.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'orient';
    ORIENTATIONS.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'orient__item';
      button.dataset.angle = String(item.angle);
      button.setAttribute('aria-label', item.label);
      button.setAttribute('aria-pressed', String(Math.round(config.angle) === item.angle));
      button.innerHTML = icon(item.icon);
      button.addEventListener('click', () => {
        config = { ...config, angle: item.angle };
        syncOrientation();
        schedule(true);
        save();
      });
      grid.appendChild(button);
    });
    orientationView.appendChild(grid);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'panel__link';
    more.textContent = 'Angle libre et échelle · réglages avancés';
    more.addEventListener('click', () => openDrawer('advanced'));
    orientationView.appendChild(more);
  }

  /* Onglets du panneau */
  qs('[data-tabs]', root)
    .querySelectorAll('[data-tab]')
    .forEach((tab) =>
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        root.querySelectorAll('[data-tab]').forEach((el) => el.setAttribute('aria-selected', String(el === tab)));
        root.querySelectorAll('[data-view]').forEach((view) => {
          view.hidden = view.dataset.view !== name;
        });
        if (name === 'motifs') syncPatterns();
        panel.dataset.sheet = 'open';
      })
    );
  on(qs('[data-sheet-toggle]', root), 'click', () => {
    panel.dataset.sheet = panel.dataset.sheet === 'open' ? 'closed' : 'open';
  });

  /* ---------------- Avant / après ---------------- */

  const applyBa = () => media.style.setProperty('--ba', `${baRange.value}%`);
  on(baRange, 'input', applyBa);
  applyBa();
  on(qs('[data-toggle-ba]', root), 'click', (event) => {
    const next = ba.hidden;
    ba.hidden = !next;
    media.dataset.ba = String(next);
    event.currentTarget.setAttribute('aria-pressed', String(next));
    if (next) applyBa();
  });

  /* ---------------- Variantes et comparaison ---------------- */

  /**
   * Lien vers la demande de projet, prérempli avec la simulation.
   * Seuls le parquet, le motif et l'orientation partent : jamais la photo.
   */
  function projectLink(variant) {
    const source = variant ? variant.config : config;
    const item = catalog.get(source.materialId);
    const query = new URLSearchParams({
      parquet: item ? item.name : '',
      motif: source.pattern,
      orientation: String(source.angle),
    });
    return `${base}projet/?${query.toString()}`;
  }

  const compareUi = createCompare(root, {
    renderer,
    catalog,
    projectLink,
    onUse: (variant) => {
      config = { ...variant.config };
      catalogUi.setActive(config.materialId);
      syncSelected();
      syncPatterns();
      syncOrientation();
      schedule();
      compareUi.close();
      save();
    },
  });

  function syncVariants() {
    variantsHost.innerHTML = '';
    variants.forEach((variant, index) => {
      const item = catalog.get(variant.config.materialId);
      const chip = document.createElement('span');
      chip.className = 'variant';
      chip.innerHTML = `<span class="variant__dot" data-index="${index + 1}"></span><span>${item.name}</span>`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'variant__remove';
      remove.setAttribute('aria-label', `Retirer ${item.name} de la comparaison`);
      remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>';
      remove.addEventListener('click', () => {
        variants = variants.filter((entry) => entry.id !== variant.id);
        syncVariants();
        save();
      });
      chip.appendChild(remove);
      variantsHost.appendChild(chip);
    });
    compareBtn.disabled = variants.length < 2;
    compareLabel.textContent = variants.length ? `Comparer (${variants.length})` : 'Comparer';
    qs('[data-add]', root).disabled = variants.length >= 3;
  }

  on(qs('[data-add]', root), 'click', () => {
    if (variants.length >= 3) return;
    variants = [...variants, { id: `v${Date.now()}`, config: { ...config } }];
    syncVariants();
    save();
    setStatus(
      variants.length < 2
        ? 'Version enregistrée. Essayez-en une autre, puis comparez.'
        : `Comparez vos ${variants.length} versions.`
    );
    window.setTimeout(() => setStatus(''), 2600);
  });
  on(compareBtn, 'click', () => compareUi.open(variants));

  /* ---------------- Enregistrer ---------------- */

  on(qs('[data-save]', root), 'click', async (event) => {
    if (!renderer.ready) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const image = composeRender({
        primary: canvas,
        photo,
        mode: ba.hidden ? 'off' : 'photo',
        ratio: Number(baRange.value) / 100,
      });
      await downloadCanvas(image, `parquet-${material().slug}.jpg`);
      setStatus('Rendu enregistré.');
      window.setTimeout(() => setStatus(''), 2600);
    } finally {
      button.disabled = false;
    }
  });

  /* ---------------- Menu, tiroir, réglages avancés ---------------- */

  on(qs('[data-menu]', root), 'click', (event) => {
    const open = dropdown.hidden;
    dropdown.hidden = !open;
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  on(document, 'click', (event) => {
    if (!dropdown.hidden && !event.target.closest('.studio__menu')) {
      dropdown.hidden = true;
      qs('[data-menu]', root).setAttribute('aria-expanded', 'false');
    }
  });

  function mountEditor() {
    if (editor) return;
    editor = createFloorEditor(media, {
      onFrameChange(next) {
        renderer.setFrame(next);
        renderer.mask.setPolygon(next);
        editor.setPolygon(next);
        schedule(true);
      },
      onPolygonChange(next) {
        renderer.mask.setPolygon(next);
        schedule(true);
      },
      onInsertPoint(point) {
        renderer.mask.insertPointNear(point);
        editor.setPolygon(renderer.mask.getPolygon());
        schedule(true);
      },
      onRemovePoint(index) {
        const removed = renderer.mask.removePoint(index);
        if (removed) {
          editor.setPolygon(renderer.mask.getPolygon());
          schedule(true);
        }
        return removed;
      },
      onStrokeStart(mode, radius, point) {
        const ratio = renderer.size.width / (media.clientWidth || renderer.size.width);
        renderer.mask.beginStroke(mode, Math.max(2, radius * ratio), point);
        schedule(true);
      },
      onStrokeMove(point) {
        renderer.mask.extendStroke(point);
        schedule(true);
      },
      onStrokeEnd() {
        quality = 1;
        schedule();
      },
    });
    editor.setFrame(renderer.frame);
    editor.setPolygon(renderer.mask.getPolygon());
  }

  function openDrawer(kind) {
    dropdown.hidden = true;
    drawerTitle.textContent = kind === 'zone' ? 'Corriger le sol' : 'Réglages avancés';
    drawerBody.innerHTML = '';
    drawer.hidden = false;
    root.dataset.drawer = kind;
    if (kind === 'zone') buildZoneTools();
    else buildAdvanced();
  }

  function closeDrawer() {
    drawer.hidden = true;
    delete root.dataset.drawer;
    if (editor) editor.setMode('off');
    stage.dataset.editing = 'false';
  }
  on(qs('[data-drawer-close]', root), 'click', closeDrawer);
  on(qs('[data-advanced]', root), 'click', () => openDrawer('advanced'));
  on(qs('[data-fix]', root), 'click', () => openDrawer('zone'));

  function buildZoneTools() {
    if (!editor) mountEditor();
    stage.dataset.editing = 'true';
    const modes = [
      ['frame', 'Cadre', 'Quatre coins : donne la perspective.'],
      ['polygon', 'Contour', 'Ajoutez des points pour suivre un mur.'],
      ['brush', 'Pinceau', 'Effacez ce qui doit rester devant le parquet.'],
    ];
    const zone = { mode: 'frame', brush: 'remove', radius: 42 };
    const seg = document.createElement('div');
    seg.className = 'seg-tabs';
    const hint = document.createElement('p');
    hint.className = 'drawer__hint';
    const brushBox = document.createElement('div');
    brushBox.className = 'drawer__brush';
    brushBox.hidden = true;
    brushBox.innerHTML = `
      <div class="seg-tabs seg-tabs--pair">
        <button type="button" data-brush="add" aria-pressed="false">Ajouter</button>
        <button type="button" data-brush="remove" aria-pressed="true">Retirer</button>
      </div>
      <label class="drawer__range"><span class="visually-hidden">Taille du pinceau</span>
        <input type="range" min="10" max="140" step="2" value="42" data-radius /><output>42 px</output></label>`;

    const applyMode = () => {
      editor.setMode(zone.mode);
      editor.setBrush({ mode: zone.brush, radius: zone.radius });
      brushBox.hidden = zone.mode !== 'brush';
      seg.querySelectorAll('[data-mode]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.mode === zone.mode))
      );
      const found = modes.find((entry) => entry[0] === zone.mode);
      hint.textContent = found ? found[2] : '';
    };

    modes.forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = id;
      button.textContent = label;
      button.addEventListener('click', () => {
        zone.mode = id;
        applyMode();
      });
      seg.appendChild(button);
    });

    brushBox.querySelectorAll('[data-brush]').forEach((button) =>
      button.addEventListener('click', () => {
        zone.brush = button.dataset.brush;
        brushBox
          .querySelectorAll('[data-brush]')
          .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.brush === zone.brush)));
        applyMode();
      })
    );
    const radius = brushBox.querySelector('[data-radius]');
    radius.addEventListener('input', () => {
      zone.radius = Number(radius.value);
      brushBox.querySelector('output').textContent = `${zone.radius} px`;
      editor.setBrush({ radius: zone.radius });
    });

    const undo = document.createElement('div');
    undo.className = 'drawer__row';
    undo.innerHTML = `
      <button class="btn btn--ghost btn--xs" type="button" data-undo>Annuler</button>
      <button class="btn btn--ghost btn--xs" type="button" data-redo>Rétablir</button>
      <button class="btn btn--ghost btn--xs" type="button" data-clear>Effacer les retouches</button>`;
    undo.querySelector('[data-undo]').addEventListener('click', () => renderer.mask.undo() && schedule());
    undo.querySelector('[data-redo]').addEventListener('click', () => renderer.mask.redo() && schedule());
    undo.querySelector('[data-clear]').addEventListener('click', () => {
      renderer.mask.clearStrokes();
      schedule();
    });

    const done = document.createElement('button');
    done.className = 'btn btn--solid btn--sm btn--block';
    done.type = 'button';
    done.textContent = 'Terminer';
    done.addEventListener('click', closeDrawer);

    drawerBody.append(seg, hint, brushBox, undo, done);
    applyMode();
  }

  function buildAdvanced() {
    const item = material();
    const wrap = document.createElement('div');
    wrap.className = 'drawer__stack';
    const widthValue = config.width || item.boardWidth;
    wrap.innerHTML = `
      <label class="drawer__range"><span>Largeur des lames</span>
        <input type="range" min="9" max="26" step="1" value="${Math.round(widthValue * 100)}" data-width />
        <output>${Math.round(widthValue * 100)} cm</output></label>
      <label class="drawer__range"><span>Échelle du motif</span>
        <input type="range" min="60" max="160" step="5" value="${Math.round(config.scale * 100)}" data-scale />
        <output>${Math.round(config.scale * 100)} %</output></label>
      <label class="drawer__range"><span>Angle libre</span>
        <input type="range" min="-90" max="90" step="1" value="${Math.round(config.angle)}" data-angle />
        <output>${Math.round(config.angle)}°</output></label>
      <button class="btn btn--ghost btn--sm btn--block" type="button" data-defaults>Revenir aux valeurs du parquet</button>`;

    const bind = (selector, apply, format) => {
      const input = wrap.querySelector(selector);
      input.addEventListener('input', () => {
        apply(Number(input.value));
        input.parentElement.querySelector('output').textContent = format(Number(input.value));
        schedule(true);
        save();
      });
    };
    bind('[data-width]', (v) => {
      config = { ...config, width: v / 100 };
    }, (v) => `${v} cm`);
    bind('[data-scale]', (v) => {
      config = { ...config, scale: v / 100 };
    }, (v) => `${v} %`);
    bind('[data-angle]', (v) => {
      config = { ...config, angle: v };
      syncOrientation();
    }, (v) => `${v}°`);

    wrap.querySelector('[data-defaults]').addEventListener('click', () => {
      config = { ...config, width: null, scale: 1 };
      openDrawer('advanced');
      schedule();
      save();
    });
    drawerBody.appendChild(wrap);
  }

  /* ---------------- Divers ---------------- */

  on(qs('[data-change-room]', root), 'click', () => {
    root.dataset.state = 'start';
    closeDrawer();
  });
  on(qs('[data-restart]', root), 'click', () => {
    variants = [];
    config = {
      materialId: catalog.parquets[0].id,
      pattern: catalog.parquets[0].defaultPattern,
      angle: 0,
      width: null,
      scale: 1,
    };
    syncVariants();
    catalogUi.setActive(config.materialId);
    syncSelected();
    syncPatterns();
    syncOrientation();
    save();
    if (roomId) openRoom(roomId);
    else root.dataset.state = 'start';
  });
  on(qs('[data-help]', root), 'click', async () => {
    const { openHelp } = await import('./help.js');
    openHelp(root);
  });

  function save() {
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify({ config, variants, roomId }));
    } catch (error) {
      void error;
    }
  }

  function restore() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE) || '{}');
      if (stored.config && catalog.get(stored.config.materialId)) config = { ...config, ...stored.config };
      if (Array.isArray(stored.variants)) variants = stored.variants.filter((v) => catalog.get(v.config.materialId));
    } catch (error) {
      void error;
    }
  }

  /* ---------------- Démarrage ---------------- */

  restore();
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('parquet');
  if (wanted && catalog.get(wanted)) config.materialId = wanted;
  if (params.get('motif')) config.pattern = params.get('motif');

  catalogUi.setActive(config.materialId);
  syncSelected();
  syncPatterns();
  syncOrientation();
  syncVariants();

  const requested = params.get('piece');
  if (requested && ROOMS.some((room) => room.id === requested)) openRoom(requested);
  else if (params.get('demarrer') === '1') openRoom(ROOMS[0].id);

  on(window, 'resize', () => {
    if (renderer.ready) schedule();
  });

  return {
    element: root,
    openRoom,
    get config() {
      return { ...config };
    },
  };
}
