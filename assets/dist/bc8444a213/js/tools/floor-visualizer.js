/**
 * Studio de pose — simulateur de sens de pose.
 *
 * Rendu SVG pur, sans dépendance. L'UI est construite par le composant afin
 * qu'une page n'ait qu'un point de montage à déclarer :
 *   <div data-visualizer data-mode="compact"></div>
 *
 * Les motifs proviennent de js/tools/patterns.js : en ajouter un suffit
 * à l'exposer ici (sélecteur, rendu, conseil).
 */
import { PATTERNS, getPattern, patternThumb } from './patterns.js';
import { clamp } from '../utils/dom.js';
import icons from '../utils/icons.js';
import { getState, setState, PLAN_TO_PATTERN, PATTERN_TO_PLAN } from '../visualizer/state.js';

/** Passerelle de teintes entre le visualiseur photo et le mode plan. */
const TONE_TO_PLAN = { clair: 'clair', naturel: 'naturel', miel: 'naturel', brun: 'fume', fume: 'fume', graphite: 'fume' };
const PLAN_TO_TONE = { clair: 'clair', naturel: 'naturel', fume: 'fume' };

const WALLS = [
  { id: 'top', label: 'Haut' },
  { id: 'right', label: 'Droite' },
  { id: 'bottom', label: 'Bas' },
  { id: 'left', label: 'Gauche' },
];

const DEFAULTS = {
  length: 5.4,
  width: 3.8,
  plankWidth: 14,
  pattern: 'longueur',
  window: 'right',
  door: 'left',
  tone: 'naturel',
};

const TONES = {
  clair: { hue: 38, sat: 24, light: 82 },
  naturel: { hue: 32, sat: 30, light: 72 },
  fume: { hue: 26, sat: 14, light: 52 },
};

const svgEl = (name, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

export class FloorVisualizer {
  constructor(root, options = {}) {
    this.root = root;
    this.compact = root.dataset.mode === 'compact';
    const shared = getState();
    this.state = {
      ...DEFAULTS,
      pattern: PATTERN_TO_PLAN[shared.pattern] || DEFAULTS.pattern,
      tone: TONE_TO_PLAN[shared.tone] || DEFAULTS.tone,
      plankWidth: Math.round((shared.plankWidth || 0.14) * 100),
      ...options,
      ...this.readUrlState(),
    };
    this.build();
    this.render();
  }

  /** Permet de partager une configuration via l'URL (#pose=...). */
  readUrlState() {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const state = {};
    if (hash.has('motif') && getPattern(hash.get('motif')).id === hash.get('motif')) {
      state.pattern = hash.get('motif');
    }
    ['length', 'width'].forEach((key) => {
      const value = Number(hash.get(key === 'length' ? 'l' : 'w'));
      if (value > 0) state[key] = value;
    });
    return state;
  }

  set(patch) {
    Object.assign(this.state, patch);
    this.render();
    // On partage les choix avec le visualiseur photo (et inversement).
    const shared = {};
    if (patch.pattern) shared.pattern = PLAN_TO_PATTERN[patch.pattern] || 'lames';
    if (patch.tone) shared.tone = PLAN_TO_TONE[patch.tone] || 'naturel';
    if (patch.plankWidth) shared.plankWidth = patch.plankWidth / 100;
    if (Object.keys(shared).length) setState(shared, { silent: true });
  }

  build() {
    this.root.classList.add('visualizer');
    if (this.compact) this.root.classList.add('visualizer--compact');

    this.panel = document.createElement('div');
    this.panel.className = 'visualizer__panel';

    this.stage = document.createElement('div');
    this.stage.className = 'visualizer__stage';

    this.canvas = document.createElement('div');
    this.canvas.className = 'visualizer__canvas';

    this.readout = document.createElement('div');
    this.readout.className = 'visualizer__readout';

    this.stage.append(this.canvas, this.readout);

    if (!this.compact) {
      this.advice = document.createElement('div');
      this.advice.className = 'visualizer__advice';
      this.advice.innerHTML = `${icons.bulb}<p></p>`;
      this.stage.append(this.advice);
    }

    this.buildPanel();
    this.root.append(this.panel, this.stage);
  }

  buildPanel() {
    this.panel.append(this.buildPatternSwitch());
    this.panel.append(this.buildDimensions());
    if (!this.compact) {
      this.panel.append(this.buildPlankWidth());
      this.panel.append(this.buildWallSelect('window', 'Fenêtre', 'Aucune'));
      this.panel.append(this.buildWallSelect('door', 'Entrée', 'Aucune'));
      this.panel.append(this.buildTone());
      this.panel.append(this.buildActions());
    }
  }

  buildGroup(title) {
    const group = document.createElement('div');
    group.className = 'visualizer__group';
    const heading = document.createElement('p');
    heading.className = 'visualizer__group-title';
    heading.textContent = title;
    group.append(heading);
    return group;
  }

  buildPatternSwitch() {
    const group = this.buildGroup('Motif de pose');
    const list = document.createElement('div');
    list.className = 'pattern-switch';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Choisir un motif de pose');

    this.patternButtons = PATTERNS.map((pattern) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.pattern = pattern.id;
      button.setAttribute('aria-pressed', String(pattern.id === this.state.pattern));
      button.innerHTML = `${patternThumb(pattern.id, { w: 60, h: 44 })}<span>${pattern.label}</span>`;
      button.addEventListener('click', () => this.set({ pattern: pattern.id }));
      list.append(button);
      return button;
    });

    group.append(list);
    return group;
  }

  buildDimensions() {
    const group = this.buildGroup('Dimensions de la pièce');
    const wrap = document.createElement('div');
    wrap.className = 'visualizer__dims';

    [
      { key: 'length', label: 'Longueur (m)' },
      { key: 'width', label: 'Largeur (m)' },
    ].forEach(({ key, label }) => {
      const field = document.createElement('label');
      field.className = 'visualizer__num';
      const id = `viz-${key}-${Math.random().toString(36).slice(2, 6)}`;
      field.htmlFor = id;
      field.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.id = id;
      input.min = '1';
      input.max = '25';
      input.step = '0.1';
      input.value = String(this.state[key]);
      input.inputMode = 'decimal';
      input.addEventListener('input', () => {
        const value = clamp(Number(input.value) || 1, 1, 25);
        this.set({ [key]: value });
      });
      field.append(input);
      wrap.append(field);
    });

    group.append(wrap);
    return group;
  }

  buildPlankWidth() {
    const group = this.buildGroup('Largeur de lame');
    const label = document.createElement('label');
    label.className = 'visualizer__range';
    const id = `viz-plank-${Math.random().toString(36).slice(2, 6)}`;
    label.htmlFor = id;
    label.innerHTML = '<span class="visually-hidden">Largeur de lame en centimètres</span>';

    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = '7';
    input.max = '26';
    input.step = '1';
    input.value = String(this.state.plankWidth);

    this.plankOutput = document.createElement('output');
    this.plankOutput.textContent = `${this.state.plankWidth} cm`;

    input.addEventListener('input', () => this.set({ plankWidth: Number(input.value) }));
    label.append(input, this.plankOutput);
    group.append(label);
    return group;
  }

  buildWallSelect(key, title, noneLabel) {
    const group = this.buildGroup(title);
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', `${title} de la pièce`);

    const options = [...WALLS, { id: 'none', label: noneLabel }];
    const buttons = options.map((wall) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = wall.label;
      button.setAttribute('aria-pressed', String(this.state[key] === wall.id));
      button.addEventListener('click', () => {
        this.set({ [key]: wall.id });
        buttons.forEach((other, index) =>
          other.setAttribute('aria-pressed', String(options[index].id === this.state[key]))
        );
      });
      seg.append(button);
      return button;
    });

    group.append(seg);
    return group;
  }

  buildTone() {
    const group = this.buildGroup('Teinte');
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Teinte du parquet');

    const tones = [
      { id: 'clair', label: 'Clair' },
      { id: 'naturel', label: 'Naturel' },
      { id: 'fume', label: 'Fumé' },
    ];
    const buttons = tones.map((tone) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = tone.label;
      button.setAttribute('aria-pressed', String(this.state.tone === tone.id));
      button.addEventListener('click', () => {
        this.set({ tone: tone.id });
        buttons.forEach((other, index) =>
          other.setAttribute('aria-pressed', String(tones[index].id === this.state.tone))
        );
      });
      seg.append(button);
      return button;
    });

    group.append(seg);
    return group;
  }

  buildActions() {
    const group = document.createElement('div');
    group.className = 'visualizer__actions';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn--ghost btn--sm';
    reset.textContent = 'Réinitialiser';
    reset.addEventListener('click', () => {
      this.state = { ...DEFAULTS };
      this.syncControls();
      this.render();
    });

    this.projectLink = document.createElement('a');
    this.projectLink.className = 'btn btn--sm';
    this.projectLink.href = `${this.base()}projet/`;
    this.projectLink.textContent = 'Utiliser dans mon projet';

    group.append(reset, this.projectLink);
    return group;
  }

  /** Réaligne les contrôles sur l'état courant (après réinitialisation). */
  syncControls() {
    this.panel.querySelectorAll('input[type="number"]').forEach((input, index) => {
      input.value = String(index === 0 ? this.state.length : this.state.width);
    });
    const range = this.panel.querySelector('input[type="range"]');
    if (range) range.value = String(this.state.plankWidth);
    this.panel.querySelectorAll('.seg').forEach((seg) => {
      seg.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    });
    const segs = this.panel.querySelectorAll('.seg');
    const map = [this.state.window, this.state.door, this.state.tone];
    segs.forEach((seg, index) => {
      const buttons = Array.from(seg.querySelectorAll('button'));
      const labels = index === 2
        ? ['clair', 'naturel', 'fume']
        : [...WALLS.map((wall) => wall.id), 'none'];
      const position = labels.indexOf(map[index]);
      if (position >= 0) buttons[position].setAttribute('aria-pressed', 'true');
    });
  }

  /** Géométrie : la pièce est dessinée en centimètres, longueur sur X. */
  geometry() {
    const length = this.state.length * 100;
    const width = this.state.width * 100;
    const pad = Math.max(length, width) * 0.14;
    return { length, width, pad };
  }

  render() {
    const { length, width, pad } = this.geometry();
    const pattern = getPattern(this.state.pattern);
    const plankWidth = this.state.plankWidth;
    const plankLength = Math.max(plankWidth * 6, 90);

    const ctx = {
      length,
      width,
      plankWidth,
      plankLength,
      window: this.state.window,
      door: this.state.door,
    };

    const svg = svgEl('svg', {
      viewBox: `${-pad} ${-pad} ${length + pad * 2} ${width + pad * 2}`,
      role: 'img',
      'aria-label': `Pièce de ${this.state.length} m sur ${this.state.width} m, pose ${pattern.label}`,
    });

    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: `room-clip-${this.uid()}` });
    clip.append(svgEl('rect', { x: 0, y: 0, width: length, height: width, rx: 2 }));
    defs.append(clip);

    if (this.state.window !== 'none') defs.append(this.buildLightGradient(length, width));
    svg.append(defs);

    // Sol
    svg.append(svgEl('rect', { x: 0, y: 0, width: length, height: width, fill: '#efece5' }));

    const group = svgEl('g', { 'clip-path': `url(#${clip.id})` });
    const tone = TONES[this.state.tone] || TONES.naturel;
    pattern.build(ctx).forEach((plank) => {
      const light = tone.light + plank.shade * 9 - 4;
      group.append(
        svgEl('polygon', {
          points: plank.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
          fill: `hsl(${tone.hue} ${tone.sat}% ${light.toFixed(1)}%)`,
          stroke: 'rgba(58,44,32,.30)',
          'stroke-width': 1.1,
        })
      );
    });
    svg.append(group);

    // Nappe de lumière issue de la fenêtre
    if (this.state.window !== 'none') {
      svg.append(
        svgEl('rect', {
          x: 0,
          y: 0,
          width: length,
          height: width,
          fill: `url(#light-${this.uid()})`,
          'clip-path': `url(#${clip.id})`,
          'pointer-events': 'none',
        })
      );
    }

    // Murs
    svg.append(
      svgEl('rect', {
        x: 0,
        y: 0,
        width: length,
        height: width,
        fill: 'none',
        stroke: '#1c1e1d',
        'stroke-width': 5,
      })
    );

    if (this.state.window !== 'none') svg.append(...this.buildWindow(length, width));
    if (this.state.door !== 'none') svg.append(...this.buildDoor(length, width));
    svg.append(...this.buildDimensionLines(length, width, pad));

    this.canvas.innerHTML = '';
    const wrapper = svgEl('g');
    svg.classList.add('plank-anim');
    this.canvas.append(svg);

    this.updateReadout(ctx, pattern);
    this.updatePatternButtons();
    if (this.plankOutput) this.plankOutput.textContent = `${plankWidth} cm`;
    if (this.projectLink) {
      this.projectLink.href = `${this.base()}projet/?orientation=${this.state.pattern}&surface=${Math.round(
        this.state.length * this.state.width
      )}`;
    }
    void wrapper;
  }

  /** Préfixe de chemin fourni par la page (data-base), pour les liens internes. */
  base() {
    return this.root.dataset.base || '';
  }

  uid() {
    if (!this._uid) this._uid = Math.random().toString(36).slice(2, 8);
    return this._uid;
  }

  buildLightGradient(length, width) {
    const map = {
      top: { x1: 0, y1: 0, x2: 0, y2: 1 },
      bottom: { x1: 0, y1: 1, x2: 0, y2: 0 },
      left: { x1: 0, y1: 0, x2: 1, y2: 0 },
      right: { x1: 1, y1: 0, x2: 0, y2: 0 },
    };
    const direction = map[this.state.window] || map.right;
    const gradient = svgEl('linearGradient', {
      id: `light-${this.uid()}`,
      ...direction,
    });
    gradient.append(svgEl('stop', { offset: '0%', 'stop-color': '#fff8e6', 'stop-opacity': 0.55 }));
    gradient.append(svgEl('stop', { offset: '45%', 'stop-color': '#fff8e6', 'stop-opacity': 0.12 }));
    gradient.append(svgEl('stop', { offset: '100%', 'stop-color': '#2c3330', 'stop-opacity': 0.1 }));
    void length;
    void width;
    return gradient;
  }

  wallSegment(wall, length, width, ratio = 0.4) {
    const span = (wall === 'top' || wall === 'bottom' ? length : width) * ratio;
    switch (wall) {
      case 'top':
        return { x1: length / 2 - span / 2, y1: 0, x2: length / 2 + span / 2, y2: 0 };
      case 'bottom':
        return { x1: length / 2 - span / 2, y1: width, x2: length / 2 + span / 2, y2: width };
      case 'left':
        return { x1: 0, y1: width / 2 - span / 2, x2: 0, y2: width / 2 + span / 2 };
      default:
        return { x1: length, y1: width / 2 - span / 2, x2: length, y2: width / 2 + span / 2 };
    }
  }

  buildWindow(length, width) {
    const seg = this.wallSegment(this.state.window, length, width, 0.42);
    const base = svgEl('line', { ...seg, stroke: '#f6f4ef', 'stroke-width': 9 });
    const glass = svgEl('line', { ...seg, stroke: '#7aa7b8', 'stroke-width': 4 });
    const label = svgEl('text', {
      x: (seg.x1 + seg.x2) / 2,
      y: (seg.y1 + seg.y2) / 2,
      fill: '#4c6570',
      'font-size': Math.max(length, width) * 0.045,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': 'middle',
      dy: this.state.window === 'top' ? -14 : this.state.window === 'bottom' ? 26 : -14,
    });
    label.textContent = 'fenêtre';
    return [base, glass, label];
  }

  buildDoor(length, width) {
    const seg = this.wallSegment(this.state.door, length, width, 0.22);
    const gap = svgEl('line', { ...seg, stroke: '#f6f4ef', 'stroke-width': 9 });
    const swingRadius = Math.min(length, width) * 0.16;
    const cx = seg.x1;
    const cy = seg.y1;
    const horizontal = this.state.door === 'top' || this.state.door === 'bottom';
    const dx = horizontal ? swingRadius : this.state.door === 'left' ? swingRadius : -swingRadius;
    const dy = horizontal ? (this.state.door === 'top' ? swingRadius : -swingRadius) : swingRadius;
    const arc = svgEl('path', {
      d: `M ${cx} ${cy} L ${cx + (horizontal ? swingRadius : 0)} ${cy + (horizontal ? 0 : swingRadius)} A ${swingRadius} ${swingRadius} 0 0 1 ${cx + (horizontal ? 0 : dx)} ${cy + (horizontal ? dy : 0)}`,
      fill: 'none',
      stroke: '#6d7b84',
      'stroke-width': 2,
      'stroke-dasharray': '6 5',
    });
    return [gap, arc];
  }

  buildDimensionLines(length, width, pad) {
    const size = Math.max(length, width) * 0.05;
    const nodes = [];

    const lengthLine = svgEl('line', {
      x1: 0,
      y1: width + pad * 0.55,
      x2: length,
      y2: width + pad * 0.55,
      stroke: '#a5afb5',
      'stroke-width': 1.6,
    });
    const lengthLabel = svgEl('text', {
      x: length / 2,
      y: width + pad * 0.55,
      dy: -6,
      fill: '#6d7b84',
      'font-size': size,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': 'middle',
    });
    lengthLabel.textContent = `${this.state.length.toFixed(2).replace('.', ',')} m`;

    const widthLine = svgEl('line', {
      x1: -pad * 0.55,
      y1: 0,
      x2: -pad * 0.55,
      y2: width,
      stroke: '#a5afb5',
      'stroke-width': 1.6,
    });
    const widthLabel = svgEl('text', {
      x: -pad * 0.55,
      y: width / 2,
      dy: -8,
      fill: '#6d7b84',
      'font-size': size,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': 'middle',
      transform: `rotate(-90 ${-pad * 0.55} ${width / 2})`,
    });
    widthLabel.textContent = `${this.state.width.toFixed(2).replace('.', ',')} m`;

    nodes.push(lengthLine, lengthLabel, widthLine, widthLabel);
    return nodes;
  }

  updatePatternButtons() {
    if (!this.patternButtons) return;
    this.patternButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.pattern === this.state.pattern));
    });
  }

  updateReadout(ctx, pattern) {
    const surface = this.state.length * this.state.width;
    const loss = { longueur: 7, largeur: 8, diagonale: 14, 'point-de-hongrie': 15, 'baton-rompu': 12 }[
      this.state.pattern
    ];
    const plankArea = (ctx.plankWidth * ctx.plankLength) / 10000;
    const planks = Math.ceil((surface * (1 + loss / 100)) / plankArea);

    this.readout.innerHTML = `
      <span>Surface <b>${surface.toFixed(1).replace('.', ',')} m²</b></span>
      <span>Chutes estimées <b>+${loss} %</b></span>
      <span>Lames <b>~${planks}</b></span>
      <span>Motif <b>${pattern.label}</b></span>
    `;

    if (this.advice) {
      this.advice.querySelector('p').textContent = pattern.advice({ ...this.state });
    }
  }
}

export function initVisualizers(scope = document) {
  return Array.from(scope.querySelectorAll('[data-visualizer]')).map(
    (root) => new FloorVisualizer(root)
  );
}
