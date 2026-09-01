/**
 * Panneau de réglages du visualiseur.
 *
 * Construit en JavaScript pour rester synchronisé avec le catalogue de
 * textures et l'état partagé ; ne contient que des contrôles natifs
 * (boutons, range, input file) afin de rester accessible au clavier.
 */
import { PATTERNS, TONES } from './patterns.js';
import { ROOMS } from './rooms.js';

const icons = {
  horizontal:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/></svg>',
  vertical:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/></svg>',
  diagRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 18 18 6"/><path d="M18 12V6h-6"/></svg>',
  diagLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 18 6 6"/><path d="M6 12V6h6"/></svg>',
};

const DIRECTIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: icons.horizontal },
  { angle: 90, label: 'Lames dans la profondeur', icon: icons.vertical },
  { angle: 45, label: 'Diagonale vers la droite', icon: icons.diagRight },
  { angle: -45, label: 'Diagonale vers la gauche', icon: icons.diagLeft },
];

const ZONE_MODES = [
  { id: 'frame', label: 'Cadre', hint: 'Quatre coins : donne la perspective du sol.' },
  { id: 'polygon', label: 'Contour', hint: 'Ajoutez des points pour suivre un mur biscornu.' },
  { id: 'brush', label: 'Pinceau', hint: 'Retirez les meubles, rattrapez les bords.' },
];

const group = (title, extra = '', attrs = '') =>
  `<div class="vz-group" ${attrs}><p class="vz-group__title">${title}${extra}</p><div class="vz-group__body"></div></div>`;

export function createControls(host, app) {
  const panel = document.createElement('div');
  panel.className = 'vz-panel';
  panel.innerHTML = `
    <div class="vz-panel__scroll">
      ${group('Zone du sol', '', 'data-zone-group hidden')}
      ${group('Vous modifiez', '', 'data-variant-group hidden')}
      ${group('Pièce')}
      ${group('Parquet')}
      ${group('Motif')}
      ${group('Sens de pose')}
      ${group('Largeur des lames', ' <output data-plank></output>')}
      ${group('Échelle du motif', ' <output data-scale></output>')}
    </div>
    <div class="vz-panel__actions">
      <button class="btn btn--ghost btn--sm" type="button" data-action="edit-floor" aria-pressed="false">Modifier la zone du sol</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="compare" aria-pressed="false">Avant / après</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="compare-ab" aria-pressed="false">Comparer A / B</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="fullscreen">Voir en grand</button>
      <button class="btn btn--solid btn--sm" type="button" data-action="export">Enregistrer mon rendu</button>
    </div>`;

  const bodies = panel.querySelectorAll('.vz-group__body');
  const [zoneBody, variantBody, roomBody, toneBody, patternBody, dirBody, plankBody, scaleBody] = bodies;
  const zoneGroup = panel.querySelector('[data-zone-group]');
  const variantGroup = panel.querySelector('[data-variant-group]');

  /* ---- Outils de zone ---- */
  const zoneModes = document.createElement('div');
  zoneModes.className = 'vz-seg';
  ZONE_MODES.forEach((mode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-seg__item';
    button.dataset.zoneMode = mode.id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = mode.label;
    button.addEventListener('click', () => app.zone('mode', mode.id));
    zoneModes.appendChild(button);
  });
  zoneBody.appendChild(zoneModes);

  const zoneHint = document.createElement('p');
  zoneHint.className = 'vz-hint';
  zoneHint.dataset.zoneHint = '';
  zoneBody.appendChild(zoneHint);

  const brush = document.createElement('div');
  brush.className = 'vz-brush';
  brush.hidden = true;
  brush.innerHTML = `
    <div class="vz-seg vz-seg--pair">
      <button class="vz-seg__item" type="button" data-brush-mode="add" aria-pressed="false">Ajouter du sol</button>
      <button class="vz-seg__item" type="button" data-brush-mode="remove" aria-pressed="false">Retirer</button>
    </div>
    <label class="vz-range">
      <span class="visually-hidden">Taille du pinceau, en pixels</span>
      <input type="range" min="10" max="140" step="2" data-input="brush" />
      <output data-brush-size></output>
    </label>`;
  brush.querySelectorAll('[data-brush-mode]').forEach((button) =>
    button.addEventListener('click', () => app.zone('brush-mode', button.dataset.brushMode))
  );
  brush
    .querySelector('[data-input="brush"]')
    .addEventListener('input', (event) => app.zone('brush-size', Number(event.target.value)));
  zoneBody.appendChild(brush);

  const zoneActions = document.createElement('div');
  zoneActions.className = 'vz-zone-actions';
  zoneActions.innerHTML = `
    <button class="btn btn--ghost btn--xs" type="button" data-zone="undo">Annuler</button>
    <button class="btn btn--ghost btn--xs" type="button" data-zone="redo">Rétablir</button>
    <button class="btn btn--ghost btn--xs" type="button" data-zone="reset">Tout réinitialiser</button>
    <button class="btn btn--solid btn--xs" type="button" data-zone="done">Valider la zone</button>`;
  zoneActions
    .querySelectorAll('[data-zone]')
    .forEach((button) => button.addEventListener('click', () => app.zone(button.dataset.zone)));
  zoneBody.appendChild(zoneActions);

  /* ---- Sélecteur A / B ---- */
  const variants = document.createElement('div');
  variants.className = 'vz-seg vz-seg--pair';
  ['A', 'B'].forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-seg__item';
    button.dataset.variant = id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = `Version ${id}`;
    button.addEventListener('click', () => app.action('variant', button));
    variants.appendChild(button);
  });
  variantBody.appendChild(variants);

  /* ---- Pièces d'exemple + import ---- */
  const rooms = document.createElement('div');
  rooms.className = 'vz-rooms';
  ROOMS.forEach((room) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-room';
    button.dataset.room = room.id;
    button.setAttribute('aria-pressed', 'false');
    // Vignette : on charge la déclinaison la plus petite, pas la photo complète.
    const stem = room.file.replace(/\.jpg$/, '');
    button.innerHTML = `<picture>
        <source type="image/webp" srcset="../assets/images/${stem}-640.webp" />
        <img src="../assets/images/${stem}-640.jpg" alt="" loading="lazy" decoding="async" width="640" height="427" />
      </picture><span>${room.label}</span>`;
    button.addEventListener('click', () => app.loadRoom(room.id));
    rooms.appendChild(button);
  });
  roomBody.appendChild(rooms);

  const importLabel = document.createElement('label');
  importLabel.className = 'vz-import';
  importLabel.innerHTML = `
    <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
    <span class="btn btn--ghost btn--sm btn--block" data-import-label>Importer ma photo</span>`;
  const fileInput = importLabel.querySelector('input');
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) app.loadUserFile(fileInput.files[0]);
    fileInput.value = '';
  });
  roomBody.appendChild(importLabel);

  const privacy = document.createElement('p');
  privacy.className = 'vz-hint vz-hint--privacy';
  privacy.textContent = 'Votre photo est lue dans le navigateur : elle n’est ni envoyée ni conservée.';
  roomBody.appendChild(privacy);

  /* ---- Teintes ---- */
  const tones = document.createElement('div');
  tones.className = 'vz-tones';
  TONES.forEach((tone) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-tone';
    button.dataset.tone = tone.id;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="vz-tone__swatch" data-swatch="${tone.id}"></span><span>${tone.label}</span>`;
    button.querySelector('.vz-tone__swatch').style.background = `rgb(${tone.base.join(',')})`;
    button.addEventListener('click', () => app.set({ tone: tone.id }));
    tones.appendChild(button);
  });
  toneBody.appendChild(tones);

  /* ---- Motifs ---- */
  const patterns = document.createElement('div');
  patterns.className = 'vz-patterns';
  PATTERNS.forEach((pattern) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-pattern';
    button.dataset.pattern = pattern.id;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<strong>${pattern.label}</strong><span>${pattern.hint}</span>`;
    button.addEventListener('click', () => app.set({ pattern: pattern.id }));
    patterns.appendChild(button);
  });
  patternBody.appendChild(patterns);

  /* ---- Sens de pose ---- */
  const dirs = document.createElement('div');
  dirs.className = 'vz-dirs';
  DIRECTIONS.forEach((dir) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-dir';
    button.dataset.angle = String(dir.angle);
    button.setAttribute('aria-label', dir.label);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = dir.icon;
    button.addEventListener('click', () => app.set({ angle: dir.angle }));
    dirs.appendChild(button);
  });
  dirBody.appendChild(dirs);

  const rotate = document.createElement('label');
  rotate.className = 'vz-range';
  rotate.innerHTML = `
    <span class="visually-hidden">Rotation libre du motif, en degrés</span>
    <input type="range" min="-90" max="90" step="1" data-input="angle" />
    <output data-angle></output>`;
  rotate
    .querySelector('input')
    .addEventListener('input', (event) => app.set({ angle: Number(event.target.value) }, { live: true }));
  dirBody.appendChild(rotate);

  /* ---- Largeur de lame ---- */
  const plank = document.createElement('label');
  plank.className = 'vz-range';
  plank.innerHTML = `
    <span class="visually-hidden">Largeur des lames, en centimètres</span>
    <input type="range" min="9" max="26" step="1" data-input="plank" />`;
  plank
    .querySelector('input')
    .addEventListener('input', (event) =>
      app.set({ plankWidth: Number(event.target.value) / 100 }, { live: true })
    );
  plankBody.appendChild(plank);

  /* ---- Échelle ---- */
  const scale = document.createElement('label');
  scale.className = 'vz-range';
  scale.innerHTML = `
    <span class="visually-hidden">Échelle du motif</span>
    <input type="range" min="60" max="160" step="5" data-input="scale" />`;
  scale
    .querySelector('input')
    .addEventListener('input', (event) => app.set({ scale: Number(event.target.value) / 100 }, { live: true }));
  scaleBody.appendChild(scale);

  /* ---- Actions ---- */
  panel.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => app.action(button.dataset.action, button));
  });

  host.appendChild(panel);

  const pressed = (selector, attribute, value) =>
    panel
      .querySelectorAll(selector)
      .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset[attribute] === value)));

  return {
    element: panel,
    /** Ouvre le sélecteur de fichier (utilisé aussi par les boutons du hero). */
    openFileDialog() {
      fileInput.click();
    },
    /** Reflète l'état de l'éditeur de zone. */
    syncZone(zone) {
      zoneGroup.hidden = !zone.editing;
      panel.querySelector('[data-action="edit-floor"]').setAttribute('aria-pressed', String(zone.editing));
      panel.querySelector('[data-action="edit-floor"]').textContent = zone.editing
        ? 'Terminer la zone'
        : 'Modifier la zone du sol';
      if (!zone.editing) return;
      pressed('[data-zone-mode]', 'zoneMode', zone.mode);
      pressed('[data-brush-mode]', 'brushMode', zone.brushMode);
      brush.hidden = zone.mode !== 'brush';
      const current = ZONE_MODES.find((m) => m.id === zone.mode);
      zoneHint.textContent = current ? current.hint : '';
      panel.querySelector('[data-input="brush"]').value = String(zone.brushSize);
      panel.querySelector('[data-brush-size]').textContent = `${zone.brushSize} px`;
      panel.querySelector('[data-zone="undo"]').disabled = !zone.canUndo;
      panel.querySelector('[data-zone="redo"]').disabled = !zone.canRedo;
    },
    /** Reflète le mode de comparaison et la version en cours d'édition. */
    syncCompare(mode, variant) {
      panel.querySelector('[data-action="compare"]').setAttribute('aria-pressed', String(mode === 'photo'));
      panel.querySelector('[data-action="compare-ab"]').setAttribute('aria-pressed', String(mode === 'ab'));
      variantGroup.hidden = mode !== 'ab';
      pressed('[data-variant]', 'variant', variant);
    },
    sync(state, context = {}) {
      pressed('[data-tone]', 'tone', state.tone);
      pressed('[data-pattern]', 'pattern', state.pattern);
      panel
        .querySelectorAll('[data-angle]')
        .forEach((el) =>
          el.setAttribute('aria-pressed', String(Number(el.dataset.angle) === Math.round(state.angle)))
        );
      pressed('[data-room]', 'room', context.roomId);
      panel.querySelector('[data-input="angle"]').value = String(Math.round(state.angle));
      panel.querySelector('[data-input="plank"]').value = String(Math.round(state.plankWidth * 100));
      panel.querySelector('[data-input="scale"]').value = String(Math.round(state.scale * 100));
      panel.querySelector('output[data-angle]').textContent = `${Math.round(state.angle)}°`;
      panel.querySelector('[data-plank]').textContent = `${Math.round(state.plankWidth * 100)} cm`;
      panel.querySelector('[data-scale]').textContent = `${Math.round(state.scale * 100)} %`;
      const label = panel.querySelector('[data-import-label]');
      label.textContent = context.userPhoto ? 'Changer de photo' : 'Importer ma photo';
    },
  };
}
