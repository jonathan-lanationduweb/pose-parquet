/**
 * Visualiseur Parquet — l'application.
 *
 * Composition : **la pièce est le sujet**, tout le reste s'efface. Un seul
 * contexte est ouvert à la fois — Parquet, Motif ou Orientation — et quand on
 * le referme la photo reprend toute la largeur. L'utilisateur n'a jamais à
 * connaître un plan de perspective, une surface ni un masque.
 *
 * Le nom interne reste « studio » : fichiers, classes CSS, clé de stockage.
 * Le nom affiché est Visualiseur Parquet.
 *
 * Le parcours est déjà celui d'après :
 *
 *   aujourd'hui   importer → délimiter le sol → visualiser
 *   demain        importer → [analyse] → corriger si besoin → visualiser
 *
 * Une seule étape change de statut, aucune ne change de place. Voir
 * js/scene/analyzer.js et docs/future-ai-api-contract.md.
 *
 * Rien ne quitte le navigateur : la photo est lue localement, le rendu est
 * calculé localement, aucun envoi vers un serveur.
 */
import { qs, on } from '../utils/dom.js';
import { analyzeScene, loadSceneIndex } from '../scene/analyzer.js';
import { loadImage, loadFile } from '../scene/image-loader.js';
import { createFloorEditor } from '../scene/editor.js';
import { composeRender, downloadCanvas } from '../scene/export.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { warmMaterial } from '../scene/material.js';
import { addZone, removeZone } from '../scene/schema.js';
import { loadCatalog, createCatalog, swatchFor } from './catalog.js';
import { createCompare } from './compare.js';
import { buildTexture } from '../scene/texture.js';

const ORIENTATIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' },
  { angle: 90, label: 'Lames dans la profondeur', icon: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4' },
  { angle: 45, label: 'Diagonale vers la droite', icon: 'M6 18 18 6M18 12V6h-6' },
  { angle: -45, label: 'Diagonale vers la gauche', icon: 'M18 18 6 6M6 12V6h6' },
];

/** Un contexte = un panneau. Jamais deux ouverts, jamais trois empilés. */
const CONTEXTS = [
  { id: 'parquets', label: 'Parquet', title: 'Choisir un parquet' },
  { id: 'motifs', label: 'Motif', title: 'Choisir un motif' },
  { id: 'orientation', label: 'Orientation', title: 'Sens de pose' },
];

/** Niveaux de la feuille basse, sur téléphone. On ne cache jamais la pièce. */
const SHEET_LEVELS = ['peek', 'half', 'full'];

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
  close: 'm6 6 12 12M18 6 6 18',
};

const STORAGE = 'pose-parquet:studio';

export async function mountStudio(root) {
  const base = root.dataset.base || '../';

  root.className = 'studio';
  root.dataset.state = 'start';
  root.dataset.panel = 'closed';
  root.dataset.sheet = 'peek';
  root.innerHTML = `
    <header class="studio__bar">
      <a class="studio__back" href="${base}index.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        <span><strong>Pose</strong> Parquet</span>
      </a>
      <p class="studio__project" data-project>Visualiseur Parquet</p>
      <div class="studio__tools">
        <button class="studio__tool" type="button" data-help aria-label="Aide">${icon(ICONS.help)}</button>
        <button class="studio__tool" type="button" data-restart aria-label="Réinitialiser">${icon(ICONS.reset)}</button>
        <div class="studio__menu">
          <button class="studio__tool" type="button" data-menu aria-expanded="false" aria-label="Autres options">${icon(ICONS.more)}</button>
          <div class="studio__dropdown" data-dropdown hidden>
            <button type="button" data-fix>Délimiter le sol</button>
            <button type="button" data-advanced>Réglages avancés</button>
            <a href="${base}outils/simulateur-pose.html">Passer au Mode Plan</a>
            <a href="${base}outils/visualiseur.html">À propos du visualiseur</a>
          </div>
        </div>
      </div>
    </header>

    <section class="studio__start" data-start>
      <div class="start__inner">
        <h1 class="start__title">Visualisez votre parquet</h1>
        <p class="start__lead">Choisissez une pièce, essayez les parquets, comparez. Votre photo reste dans votre navigateur.</p>
        <div class="start__actions">
          <button class="btn btn--solid btn--lg" type="button" data-import>Essayer dans ma pièce</button>
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

      <aside class="studio__panel">
        <button class="panel__grab" type="button" data-sheet-toggle aria-label="Agrandir ou réduire le panneau"></button>
        <div class="panel__head">
          <p class="panel__title" data-panel-title>Choisir un parquet</p>
          <button class="panel__close" type="button" data-panel-close aria-label="Fermer le panneau">${icon(ICONS.close)}</button>
        </div>
        <div class="panel__body">
          <div class="panel__view" data-view="parquets"></div>
          <div class="panel__view" data-view="motifs" hidden></div>
          <div class="panel__view" data-view="orientation" hidden></div>
        </div>
      </aside>

      <footer class="studio__actions">
        <div class="actions__contexts" role="group" aria-label="Que voulez-vous changer ?" data-contexts></div>
        <div class="actions__variants" data-variants></div>
        <button class="variant-add" type="button" data-add aria-label="Ajouter cette version à la comparaison">${icon(ICONS.plus)}</button>
        <div class="actions__buttons">
          <button class="action" type="button" data-toggle-ba aria-pressed="false" aria-label="Avant / après">${icon(ICONS.before)}<span>Avant / après</span></button>
          <button class="action" type="button" data-compare disabled aria-label="Comparer">${icon(ICONS.layers)}<span data-compare-label>Comparer</span></button>
          <button class="action action--primary" type="button" data-save>${icon(ICONS.save)}<span>Enregistrer</span></button>
        </div>
      </footer>
    </main>

    <div class="studio__drawer" data-drawer hidden>
      <div class="drawer__head">
        <p data-drawer-title>Réglages avancés</p>
        <button class="studio__tool" type="button" data-drawer-close aria-label="Fermer">${icon(ICONS.close)}</button>
      </div>
      <div class="drawer__body" data-drawer-body></div>
    </div>`;

  /* ---------------- Références ---------------- */
  const stage = qs('[data-stage]', root);
  const media = qs('[data-media]', root);
  const photo = qs('[data-photo]', root);
  const canvas = qs('[data-canvas]', root);
  const status = qs('[data-status]', root);
  const roomsHost = qs('[data-rooms]', root);
  const fileInput = qs('[data-file]', root);
  const contextsHost = qs('[data-contexts]', root);
  const variantsHost = qs('[data-variants]', root);
  const addBtn = qs('[data-add]', root);
  const compareBtn = qs('[data-compare]', root);
  const compareLabel = qs('[data-compare-label]', root);
  const panelTitle = qs('[data-panel-title]', root);
  const ba = qs('[data-ba]', root);
  const baRange = qs('[data-ba-range]', root);
  const drawer = qs('[data-drawer]', root);
  const drawerBody = qs('[data-drawer-body]', root);
  const drawerTitle = qs('[data-drawer-title]', root);
  const dropdown = qs('[data-dropdown]', root);

  const renderer = createSceneRenderer();
  const catalog = await loadCatalog(base);
  const sceneIndex = await loadSceneIndex(base);

  let config = {
    materialId: catalog.parquets[0].id,
    pattern: catalog.parquets[0].defaultPattern,
    angle: 0,
    width: null,
    scale: 1,
  };
  let variants = [];
  let sceneId = null;
  let pending = false;
  let refine = 0;
  let quality = 1;
  let editor = null;
  /** Zone visée par la correction du sol : la plus proche par défaut. */
  let activeZone = null;

  const material = () => catalog.get(config.materialId);
  /** Configuration telle que le moteur l'attend : le matériau, pas son id. */
  const paintConfig = (source) => {
    const from = source || config;
    return { ...from, material: catalog.get(from.materialId) };
  };
  const setStatus = (message) => {
    status.textContent = message || '';
    status.hidden = !message;
  };

  /* ---------------- Rendu ---------------- */

  function paint() {
    pending = false;
    if (!renderer.ready) return;
    const ok = renderer.paint(canvas, paintConfig(), null, quality);
    if (!ok) {
      setStatus('Zone de sol invalide : reprenez-la dans « Délimiter le sol ».');
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
    // Le rendu allégé ne concerne que le moteur logiciel : sur GPU, un rendu
    // plein format coûte moins de temps qu'il n'en ferait perdre en réglages.
    if (draft && renderer.backend !== 'webgl2') {
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

  /* ---------------- Contextes ---------------- */

  /**
   * Ouvre un contexte, ou le referme s'il est déjà actif.
   *
   * Refermer n'est pas un détail : c'est ce qui donne l'écran calme, photo
   * plein cadre, sans un pixel de chrome à droite.
   */
  function setContext(id) {
    const next = root.dataset.panel === id ? 'closed' : id;
    root.dataset.panel = next;
    contextsHost.querySelectorAll('[data-context]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.context === next));
    });
    root.querySelectorAll('[data-view]').forEach((view) => {
      view.hidden = view.dataset.view !== next;
    });
    const found = CONTEXTS.find((entry) => entry.id === next);
    if (found) panelTitle.textContent = found.title;
    if (next === 'motifs') syncPatterns();
    if (next === 'orientation') syncOrientation();
    // La pièce change de largeur : le canevas doit se remesurer.
    window.setTimeout(() => schedule(), 300);
  }

  CONTEXTS.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-btn';
    button.dataset.context = entry.id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = entry.label;
    button.addEventListener('click', () => setContext(entry.id));
    contextsHost.appendChild(button);
  });
  on(qs('[data-panel-close]', root), 'click', () => setContext(root.dataset.panel));

  /** Poignée de la feuille : elle fait défiler les trois niveaux. */
  on(qs('[data-sheet-toggle]', root), 'click', () => {
    const index = SHEET_LEVELS.indexOf(root.dataset.sheet);
    root.dataset.sheet = SHEET_LEVELS[(index + 1) % SHEET_LEVELS.length];
  });

  /* ---------------- Écran de départ ---------------- */

  sceneIndex.scenes.forEach((entry) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'room-card';
    card.dataset.room = entry.id;
    const stem = entry.file.replace(/\.jpg$/, '');
    const zones = entry.zones > 1 ? `<span class="room-card__zones">${entry.zones} sols visibles</span>` : '';
    card.innerHTML = `
      <picture>
        <source type="image/webp" srcset="${base}assets/images/${stem}-640.webp" />
        <img src="${base}assets/images/${stem}-640.jpg" alt="${entry.label}" decoding="async" width="640" height="427" />
      </picture>
      <span class="room-card__label">${entry.label}${zones}</span>`;
    card.addEventListener('click', () => openRoom(entry.id));
    roomsHost.appendChild(card);
  });

  on(qs('[data-import]', root), 'click', () => fileInput.click());
  on(fileInput, 'change', () => {
    if (fileInput.files && fileInput.files[0]) openPhoto(fileInput.files[0]);
    fileInput.value = '';
  });

  /* ---------------- Chargement d'une pièce ---------------- */

  function afterScene(name) {
    root.dataset.state = 'edit';
    qs('[data-project]', root).textContent = name;
    photo.src = renderer.photo.toDataURL('image/jpeg', 0.9);
    // La zone la plus proche est celle qu'on corrige le plus souvent.
    const zones = renderer.scene.floorZones;
    activeZone = zones[zones.length - 1].id;
    if (editor) editor.setMode('off');
    quality = 1;
    schedule();
    warmMaterial(material(), config);
  }

  async function openRoom(id) {
    const entry = sceneIndex.scenes.find((item) => item.id === id) || sceneIndex.scenes[0];
    setStatus('Chargement…');
    try {
      const scene = await analyzeScene({ sceneId: entry.id, base });
      const prepared = await loadImage(`${base}assets/images/${scene.image.file}`);
      renderer.setScene(scene, prepared);
      sceneId = entry.id;
      photo.alt = scene.image.alt;
      const stem = entry.file.replace(/\.jpg$/, '');
      qs('[data-room-thumb]', root).style.backgroundImage = `url(${base}assets/images/${stem}-640.jpg)`;
      afterScene(scene.label);
      setStatus('');
      mountEditor();
      // Une pièce calibrée est prête : on ouvre directement le catalogue, qui
      // est la seule chose à faire ensuite.
      setContext('parquets');
    } catch (error) {
      setStatus('La pièce n’a pas pu être chargée.');
      console.error('[visualiseur]', error);
    }
  }

  async function openPhoto(file) {
    setStatus('Lecture de la photo…');
    try {
      const prepared = await loadFile(file);
      // Aucune analyse : la scène de départ est un plan plausible, que
      // l'utilisateur ajuste. Le jour où un service d'analyse existe, seule
      // la stratégie demandée ici change.
      const scene = await analyzeScene({ width: prepared.width, height: prepared.height, label: 'Ma photo' });
      renderer.setScene(scene, prepared);
      sceneId = null;
      photo.alt = 'Votre pièce';
      qs('[data-room-thumb]', root).style.backgroundImage = 'none';
      afterScene('Ma photo');
      mountEditor();
      root.dataset.panel = 'closed';
      openDrawer('zone');
      setStatus('Délimitez le sol : déplacez les quatre poignées jusqu’aux angles.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.');
    }
  }

  /* ---------------- Contexte : parquets ---------------- */

  const catalogView = qs('[data-view="parquets"]', root);
  const selectedHost = document.createElement('div');
  selectedHost.className = 'selected';
  catalogView.appendChild(selectedHost);
  const catalogSlot = document.createElement('div');
  catalogView.appendChild(catalogSlot);

  const catalogUi = createCatalog(catalogSlot, catalog, {
    onSelect: (item) => selectMaterial(item.id),
    onVisible: (item) => warmMaterial(item, config),
  });

  function selectMaterial(id) {
    const next = catalog.get(id);
    if (!next) return;
    config = { ...config, materialId: id };
    if (!next.compatiblePatterns.includes(config.pattern)) config.pattern = next.defaultPattern;
    catalogUi.setActive(id);
    syncSelected();
    schedule(true);
    save();
    // Les références voisines sont préparées pendant que l'on regarde le rendu
    catalogUi.neighbours(id).forEach((item) => warmMaterial(item, config));
  }

  function syncSelected() {
    const item = material();
    if (!item) return;
    const swatch = swatchFor(item);
    selectedHost.innerHTML = `
      <span class="selected__swatch"></span>
      <span class="selected__text">
        <strong>${item.name}</strong>
        <span>${item.finish} · lames ${Math.round(item.plank.width * 100)} cm</span>
      </span>`;
    const slot = selectedHost.querySelector('.selected__swatch');
    const mini = document.createElement('canvas');
    mini.width = swatch.width;
    mini.height = swatch.height;
    mini.getContext('2d').drawImage(swatch, 0, 0);
    slot.appendChild(mini);
  }

  /* ---------------- Contexte : motifs ---------------- */

  const patternsView = qs('[data-view="motifs"]', root);
  function syncPatterns() {
    const item = material();
    patternsView.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    catalog.patterns.forEach((pattern) => {
      const allowed = !item || item.compatiblePatterns.includes(pattern.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tile-card';
      card.dataset.pattern = pattern.id;
      card.disabled = !allowed;
      card.setAttribute('aria-pressed', String(config.pattern === pattern.id));
      card.innerHTML = `<span class="tile-card__media"></span><span class="tile-card__label">${pattern.label}</span>`;
      if (item) {
        const preview = document.createElement('canvas');
        preview.width = 288;
        preview.height = 162;
        card.querySelector('.tile-card__media').appendChild(preview);
        drawPatternPreview(preview, item, pattern.id);
      }
      card.addEventListener('click', () => {
        config = { ...config, pattern: pattern.id };
        syncPatterns();
        schedule(true);
        save();
      });
      grid.appendChild(card);
    });
    patternsView.appendChild(grid);

    // La donnée de chutes est utile mais c'est un ordre de grandeur, pas un
    // devis : une ligne suffit, sous la grille, pour le motif retenu.
    const current = catalog.patterns.find((entry) => entry.id === config.pattern);
    if (current) {
      const note = document.createElement('p');
      note.className = 'drawer__hint';
      note.style.marginTop = '0.6rem';
      note.textContent = `Chutes ${current.waste} selon la pièce et le calepinage.`;
      patternsView.appendChild(note);
    }
  }

  /**
   * Aperçu de motif : la tuile réelle, dessinée en 320 px au lieu de 1280.
   * Seize fois moins de pixels pour la même image — indispensable, sinon
   * chaque changement de parquet reconstruirait trois tuiles pleines.
   */
  function drawPatternPreview(target, item, pattern) {
    const draw = () => {
      const tile = buildTexture(item, { pattern, size: 320 });
      const ctx = target.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      // Cadrage identique pour les trois motifs : c'est ce qui permet de les
      // comparer d'un coup d'œil.
      ctx.drawImage(tile, 40, 60, 240, 135, 0, 0, target.width, target.height);
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(draw, { timeout: 700 });
    else window.setTimeout(draw, 40);
  }

  /* ---------------- Contexte : orientation ---------------- */

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
    more.textContent = 'Angle libre et échelle';
    more.addEventListener('click', () => openDrawer('advanced'));
    orientationView.appendChild(more);
  }

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
    paintConfig,
    projectLink,
    onUse: (variant) => {
      config = { ...variant.config };
      catalogUi.setActive(config.materialId);
      syncSelected();
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
      chip.title = item.name;
      chip.innerHTML = `<span class="variant__dot" data-index="${index + 1}"></span><span class="variant__name">${item.name}</span>`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'variant__remove';
      remove.setAttribute('aria-label', `Retirer ${item.name} de la comparaison`);
      remove.innerHTML = icon('m6 6 12 12M18 6 6 18');
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
    addBtn.disabled = variants.length >= 3;
  }

  on(addBtn, 'click', () => {
    if (variants.length >= 3) return;
    variants = [...variants, { id: `v${Date.now()}`, config: { ...config } }];
    syncVariants();
    save();
    setStatus(
      variants.length < 2
        ? 'Version retenue. Essayez-en une autre, puis comparez.'
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

  /* ---------------- Menu et tiroir ---------------- */

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

  const zone = () => renderer.scene.floorZones.find((item) => item.id === activeZone);

  function mountEditor() {
    if (editor) {
      loadZoneIntoEditor();
      return;
    }
    editor = createFloorEditor(media, {
      // Le cadre définit la perspective de la zone : on écrit directement dans
      // son plan, et le contour suit tant qu'il n'a pas été retouché.
      onFrameChange(next) {
        const target = zone();
        target.plane.quad = next.map((p) => ({ ...p }));
        if (!renderer.masks.hasStrokes()) {
          renderer.masks.setPolygon(target.id, next);
          editor.setPolygon(next);
        }
        renderer.invalidateMasks();
        schedule(true);
      },
      onPolygonChange(next) {
        renderer.masks.setPolygon(activeZone, next);
        renderer.invalidateMasks();
        schedule(true);
      },
      onInsertPoint(point) {
        renderer.masks.insertPointNear(activeZone, point);
        editor.setPolygon(renderer.masks.getPolygon(activeZone));
        renderer.invalidateMasks();
        schedule(true);
      },
      onRemovePoint(index) {
        const removed = renderer.masks.removePoint(activeZone, index);
        if (removed) {
          editor.setPolygon(renderer.masks.getPolygon(activeZone));
          renderer.invalidateMasks();
          schedule(true);
        }
        return removed;
      },
      onStrokeStart(mode, radius, point) {
        const ratio = renderer.size.width / (media.clientWidth || renderer.size.width);
        renderer.masks.beginStroke(activeZone, mode, Math.max(2, radius * ratio), point);
        renderer.invalidateMasks();
        schedule(true);
      },
      onStrokeMove(point) {
        renderer.masks.extendStroke(point);
        renderer.invalidateMasks();
        schedule(true);
      },
      // L'éclairement ne se relit qu'à la fin du geste : sa moyenne de
      // référence dépend du masque, et la recalculer à chaque pixel du
      // pinceau ferait ramer pour rien.
      onStrokeEnd() {
        renderer.refreshLighting();
        quality = 1;
        schedule();
      },
    });
    loadZoneIntoEditor();
  }

  function loadZoneIntoEditor() {
    const target = zone();
    if (!editor || !target) return;
    editor.setFrame(target.plane.quad);
    editor.setPolygon(renderer.masks.getPolygon(target.id));
  }

  function openDrawer(kind) {
    dropdown.hidden = true;
    drawerTitle.textContent = kind === 'zone' ? 'Délimiter le sol' : 'Réglages avancés';
    drawerBody.innerHTML = '';
    drawer.hidden = false;
    root.dataset.drawer = kind;
    if (kind === 'zone') buildZoneTools();
    else buildAdvanced();
  }

  function closeDrawer() {
    const wasEditing = stage.dataset.editing === 'true';
    drawer.hidden = true;
    delete root.dataset.drawer;
    if (editor) editor.setMode('off');
    stage.dataset.editing = 'false';
    if (wasEditing && renderer.ready) {
      renderer.refreshLighting();
      schedule();
    }
  }
  on(qs('[data-drawer-close]', root), 'click', closeDrawer);
  on(qs('[data-advanced]', root), 'click', () => openDrawer('advanced'));
  on(qs('[data-fix]', root), 'click', () => openDrawer('zone'));

  /**
   * Outils de délimitation.
   *
   * Le vocabulaire reste celui de l'utilisateur : « le sol », « le contour »,
   * « les objets ». Nulle part il n'est question de plan de perspective, de
   * masque ni d'homographie — ce sont nos affaires, pas les siennes.
   */
  function buildZoneTools() {
    if (!editor) mountEditor();
    stage.dataset.editing = 'true';
    const modes = [
      ['frame', 'Le sol', 'Placez les quatre poignées aux angles du sol.'],
      ['polygon', 'Le contour', 'Ajoutez des points pour suivre un mur ou une plinthe.'],
      ['brush', 'Les objets', 'Effacez ce qui doit rester devant : meubles, tapis, plinthes.'],
    ];
    const tool = { mode: 'frame', brush: 'remove', radius: 42 };
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
      editor.setMode(tool.mode);
      editor.setBrush({ mode: tool.brush, radius: tool.radius });
      brushBox.hidden = tool.mode !== 'brush';
      seg.querySelectorAll('[data-mode]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.mode === tool.mode))
      );
      const found = modes.find((entry) => entry[0] === tool.mode);
      hint.textContent = found ? found[2] : '';
    };

    /**
     * Sélecteur de sol : une photo peut en contenir plusieurs — la pièce du
     * premier plan et celle qu'on aperçoit derrière une ouverture. On peut en
     * ajouter, et tous reçoivent par défaut le même parquet.
     */
    const zonesBox = document.createElement('div');
    zonesBox.className = 'drawer__stack';
    const renderZones = () => {
      zonesBox.innerHTML = '';
      const zones = renderer.scene.floorZones;
      const label = document.createElement('p');
      label.className = 'drawer__hint';
      label.textContent = zones.length > 1 ? 'Sol en cours de réglage :' : 'Un seul sol pour l’instant.';
      const picker = document.createElement('div');
      picker.className = 'seg-tabs';
      picker.style.gridTemplateColumns = `repeat(${Math.min(3, zones.length)}, minmax(0, 1fr))`;
      zones.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.zone = item.id;
        button.textContent = item.label;
        button.setAttribute('aria-pressed', String(item.id === activeZone));
        button.addEventListener('click', () => {
          activeZone = item.id;
          renderZones();
          loadZoneIntoEditor();
          applyMode();
        });
        picker.appendChild(button);
      });

      const row = document.createElement('div');
      row.className = 'drawer__row';
      const add = document.createElement('button');
      add.className = 'btn btn--ghost btn--xs';
      add.type = 'button';
      add.textContent = 'Ajouter un sol';
      add.addEventListener('click', () => {
        const created = addZone(renderer.scene, { label: `Sol ${renderer.scene.floorZones.length + 1}` });
        renderer.masks.registerZone(created);
        activeZone = created.id;
        renderZones();
        loadZoneIntoEditor();
        applyMode();
        renderer.refreshLighting();
        schedule();
        setStatus('Nouveau sol ajouté : placez ses quatre poignées.');
        window.setTimeout(() => setStatus(''), 3200);
      });
      row.appendChild(add);
      if (renderer.scene.floorZones.length > 1) {
        const drop = document.createElement('button');
        drop.className = 'btn btn--ghost btn--xs';
        drop.type = 'button';
        drop.textContent = 'Retirer ce sol';
        drop.addEventListener('click', () => {
          const target = activeZone;
          if (!removeZone(renderer.scene, target)) return;
          renderer.masks.removeZone(target);
          activeZone = renderer.scene.floorZones[renderer.scene.floorZones.length - 1].id;
          renderZones();
          loadZoneIntoEditor();
          applyMode();
          renderer.refreshLighting();
          schedule();
        });
        row.appendChild(drop);
      }
      zonesBox.append(label, picker, row);
    };
    renderZones();

    modes.forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = id;
      button.textContent = label;
      button.addEventListener('click', () => {
        tool.mode = id;
        applyMode();
      });
      seg.appendChild(button);
    });

    brushBox.querySelectorAll('[data-brush]').forEach((button) =>
      button.addEventListener('click', () => {
        tool.brush = button.dataset.brush;
        brushBox
          .querySelectorAll('[data-brush]')
          .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.brush === tool.brush)));
        applyMode();
      })
    );
    const radius = brushBox.querySelector('[data-radius]');
    radius.addEventListener('input', () => {
      tool.radius = Number(radius.value);
      brushBox.querySelector('output').textContent = `${tool.radius} px`;
      editor.setBrush({ radius: tool.radius });
    });

    const undo = document.createElement('div');
    undo.className = 'drawer__row';
    undo.innerHTML = `
      <button class="btn btn--ghost btn--xs" type="button" data-undo>Annuler</button>
      <button class="btn btn--ghost btn--xs" type="button" data-redo>Rétablir</button>
      <button class="btn btn--ghost btn--xs" type="button" data-clear>Tout effacer</button>`;
    const afterEdit = () => {
      renderer.refreshLighting();
      schedule();
    };
    undo.querySelector('[data-undo]').addEventListener('click', () => renderer.masks.undo() && afterEdit());
    undo.querySelector('[data-redo]').addEventListener('click', () => renderer.masks.redo() && afterEdit());
    undo.querySelector('[data-clear]').addEventListener('click', () => {
      renderer.masks.clearStrokes();
      afterEdit();
    });

    const done = document.createElement('button');
    done.className = 'btn btn--solid btn--sm btn--block';
    done.type = 'button';
    done.textContent = 'Terminer';
    done.addEventListener('click', closeDrawer);

    drawerBody.append(zonesBox, seg, hint, brushBox, undo, done);
    applyMode();
  }

  function buildAdvanced() {
    const item = material();
    const wrap = document.createElement('div');
    wrap.className = 'drawer__stack';
    const widthValue = config.width || item.plank.width;
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
    root.dataset.panel = 'closed';
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
    save();
    if (sceneId) openRoom(sceneId);
    else root.dataset.state = 'start';
  });
  on(qs('[data-help]', root), 'click', async () => {
    const { openHelp } = await import('./help.js');
    openHelp(root);
  });

  function save() {
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify({ config, variants, sceneId }));
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
  syncVariants();

  const requested = params.get('piece');
  if (requested && sceneIndex.scenes.some((entry) => entry.id === requested)) openRoom(requested);
  else if (params.get('demarrer') === '1') openRoom(sceneIndex.scenes[0].id);

  on(window, 'resize', () => {
    if (renderer.ready) schedule();
  });

  return {
    element: root,
    openRoom,
    setContext,
    backend: renderer.backend,
    get config() {
      return { ...config };
    },
  };
}
