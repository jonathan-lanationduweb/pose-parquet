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
  horizontal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/></svg>',
  vertical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/></svg>',
  diagRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 18 18 6"/><path d="M18 12V6h-6"/></svg>',
  diagLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 18 6 6"/><path d="M6 12V6h6"/></svg>',
};

const DIRECTIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: icons.horizontal },
  { angle: 90, label: 'Lames dans la profondeur', icon: icons.vertical },
  { angle: 45, label: 'Diagonale vers la droite', icon: icons.diagRight },
  { angle: -45, label: 'Diagonale vers la gauche', icon: icons.diagLeft },
];

const group = (title, extra = '') =>
  `<div class="vz-group"><p class="vz-group__title">${title}${extra}</p><div class="vz-group__body"></div></div>`;

export function createControls(host, app) {
  const panel = document.createElement('div');
  panel.className = 'vz-panel';
  panel.innerHTML = `
    <div class="vz-panel__scroll">
      ${group('Pièce')}
      ${group('Parquet')}
      ${group('Motif')}
      ${group('Sens de pose')}
      ${group('Largeur des lames', ' <output data-plank></output>')}
      ${group('Échelle du motif', ' <output data-scale></output>')}
    </div>
    <div class="vz-panel__actions">
      <button class="btn btn--ghost btn--sm" type="button" data-action="edit-floor">Modifier la zone du sol</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="compare" aria-pressed="false">Avant / après</button>
      <button class="btn btn--ghost btn--sm" type="button" data-action="fullscreen">Voir en grand</button>
    </div>`;

  const bodies = panel.querySelectorAll('.vz-group__body');
  const [roomBody, toneBody, patternBody, dirBody, plankBody, scaleBody] = bodies;

  /* ---- Pièces d'exemple + import ---- */
  const rooms = document.createElement('div');
  rooms.className = 'vz-rooms';
  ROOMS.forEach((room) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vz-room';
    button.dataset.room = room.id;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<img src="../assets/images/${room.file}" alt="" loading="lazy" decoding="async" width="1600" height="1067" /><span>${room.label}</span>`;
    button.addEventListener('click', () => app.loadRoom(room.id));
    rooms.appendChild(button);
  });
  roomBody.appendChild(rooms);

  const importLabel = document.createElement('label');
  importLabel.className = 'vz-import';
  importLabel.innerHTML = `
    <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
    <span class="btn btn--ghost btn--sm btn--block">Importer ma photo</span>`;
  const fileInput = importLabel.querySelector('input');
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) app.loadUserFile(fileInput.files[0]);
    fileInput.value = '';
  });
  roomBody.appendChild(importLabel);

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
  rotate.querySelector('input').addEventListener('input', (event) =>
    app.set({ angle: Number(event.target.value) }, { live: true })
  );
  dirBody.appendChild(rotate);

  /* ---- Largeur de lame ---- */
  const plank = document.createElement('label');
  plank.className = 'vz-range';
  plank.innerHTML = `
    <span class="visually-hidden">Largeur des lames, en centimètres</span>
    <input type="range" min="9" max="26" step="1" data-input="plank" />`;
  plank.querySelector('input').addEventListener('input', (event) =>
    app.set({ plankWidth: Number(event.target.value) / 100 }, { live: true })
  );
  plankBody.appendChild(plank);

  /* ---- Échelle ---- */
  const scale = document.createElement('label');
  scale.className = 'vz-range';
  scale.innerHTML = `
    <span class="visually-hidden">Échelle du motif</span>
    <input type="range" min="60" max="160" step="5" data-input="scale" />`;
  scale.querySelector('input').addEventListener('input', (event) =>
    app.set({ scale: Number(event.target.value) / 100 }, { live: true })
  );
  scaleBody.appendChild(scale);

  /* ---- Actions ---- */
  panel.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => app.action(button.dataset.action, button));
  });

  host.appendChild(panel);

  return {
    element: panel,
    /** Ouvre le sélecteur de fichier (utilisé aussi par les boutons du hero). */
    openFileDialog() { fileInput.click(); },
    sync(state, context = {}) {
      panel.querySelectorAll('[data-tone]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.tone === state.tone))
      );
      panel.querySelectorAll('[data-pattern]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.pattern === state.pattern))
      );
      panel.querySelectorAll('[data-angle]').forEach((el) =>
        el.setAttribute('aria-pressed', String(Number(el.dataset.angle) === Math.round(state.angle)))
      );
      panel.querySelectorAll('[data-room]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.room === context.roomId))
      );
      panel.querySelector('[data-input="angle"]').value = String(Math.round(state.angle));
      panel.querySelector('[data-input="plank"]').value = String(Math.round(state.plankWidth * 100));
      panel.querySelector('[data-input="scale"]').value = String(Math.round(state.scale * 100));
      panel.querySelector('[data-angle]').textContent = `${Math.round(state.angle)}°`;
      panel.querySelector('[data-plank]').textContent = `${Math.round(state.plankWidth * 100)} cm`;
      panel.querySelector('[data-scale]').textContent = `${Math.round(state.scale * 100)} %`;
    },
  };
}
