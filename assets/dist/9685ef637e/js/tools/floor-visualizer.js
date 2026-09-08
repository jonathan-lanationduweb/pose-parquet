/**
 * Mode Plan — simulateur de sens de pose.
 *
 * Rendu SVG pur, sans dépendance. L’UI est construite par le composant afin
 * qu’une page n’ait qu’un point de montage à déclarer :
 *   <div data-visualizer data-mode="compact"></div>
 *
 * Les motifs proviennent de js/tools/patterns.js : en ajouter un suffit
 * à l’exposer ici (sélecteur, rendu, conseil).
 *
 * Le calcul est inchangé : surface, taux de chutes, nombre de lames et
 * géométrie des motifs viennent des mêmes formules qu’avant. Ce fichier ne
 * traite que la présentation — disposition, libellés, échelle du dessin.
 */
import { PATTERNS, getPattern, patternThumb } from './patterns.js';
import { clamp } from '../utils/dom.js';
import icons from '../utils/icons.js';
import { getState, setState, PLAN_TO_PATTERN, PATTERN_TO_PLAN } from './plan-state.js';

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

const TONE_LABELS = [
  { id: 'clair', label: 'Clair' },
  { id: 'naturel', label: 'Naturel' },
  { id: 'fume', label: 'Fumé' },
];

const PLANK_MIN = 7;
const PLANK_MAX = 26;

/** Marge autour de la pièce, en proportion de son plus grand côté. */
const PAD_RATIO = 0.09;

const svgEl = (name, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

/** Nombres à la française : la virgule décimale, comme sur les cotes du plan. */
const fr = (value, digits = 2) => value.toFixed(digits).replace('.', ',');

const toneColor = (id) => {
  const tone = TONES[id] || TONES.naturel;
  return `hsl(${tone.hue} ${tone.sat}% ${tone.light}%)`;
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
    /** Groupes de boutons indexés par clé d’état, pour la resynchronisation. */
    this.controls = {};
    this.build();
    this.render();
  }

  /** Permet de partager une configuration via l’URL (#motif=...). */
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

    // Une liste de définitions : chaque chiffre garde son intitulé, y compris
    // pour un lecteur d’écran qui parcourt la page repère par repère.
    this.readout = document.createElement('dl');
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

  /**
   * Un groupe de réglage : son titre, et à droite du titre la valeur courante
   * quand il y en a une à lire (la largeur de lame, par exemple).
   */
  buildGroup(title, value) {
    const group = document.createElement('div');
    group.className = 'visualizer__group';
    const heading = document.createElement('p');
    heading.className = 'visualizer__group-title';
    heading.append(document.createTextNode(title));
    if (value) heading.append(value);
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
      button.innerHTML = `${patternThumb(pattern.id, { w: 72, h: 48 })}<span>${pattern.label}</span>`;
      // La vignette est décorative ici : son propre libellé doublerait celui
      // du bouton, qui annoncerait « Motif Bâton rompu, Bâton rompu ».
      const thumb = button.querySelector('svg');
      thumb.removeAttribute('role');
      thumb.removeAttribute('aria-label');
      thumb.setAttribute('aria-hidden', 'true');
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

    this.dimInputs = {};
    [
      { key: 'length', label: 'Longueur (m)' },
      { key: 'width', label: 'Largeur (m)' },
    ].forEach(({ key, label }, index) => {
      if (index === 1) {
        const times = document.createElement('span');
        times.className = 'visualizer__times';
        times.setAttribute('aria-hidden', 'true');
        times.textContent = '×';
        wrap.append(times);
      }
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
        // Un champ momentanément vide est une saisie en cours, pas une pièce
        // de un mètre : on garde la dernière valeur valide jusqu’à la suivante.
        const raw = input.value.trim();
        if (raw === '') return;
        this.set({ [key]: clamp(Number(raw) || this.state[key], 1, 25) });
      });
      // Au relâchement, le champ affiche la valeur réellement dessinée : sans
      // cela, saisir 40 laissait « 40 » à l’écran pour un plan borné à 25 m.
      input.addEventListener('change', () => {
        input.value = String(this.state[key]);
      });
      field.append(input);
      wrap.append(field);
      this.dimInputs[key] = input;
    });

    group.append(wrap);
    return group;
  }

  buildPlankWidth() {
    this.plankOutput = document.createElement('output');
    this.plankOutput.textContent = `${this.state.plankWidth} cm`;

    const group = this.buildGroup('Largeur de lame', this.plankOutput);
    const label = document.createElement('label');
    label.className = 'visualizer__range';
    const id = `viz-plank-${Math.random().toString(36).slice(2, 6)}`;
    label.htmlFor = id;
    label.innerHTML = '<span class="visually-hidden">Largeur de lame en centimètres</span>';

    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(PLANK_MIN);
    input.max = String(PLANK_MAX);
    input.step = '1';
    input.value = String(this.state.plankWidth);
    this.plankInput = input;

    const bounds = document.createElement('div');
    bounds.className = 'visualizer__bounds';
    bounds.setAttribute('aria-hidden', 'true');
    bounds.innerHTML = `<span>${PLANK_MIN} cm</span><span>${PLANK_MAX} cm</span>`;

    input.addEventListener('input', () => this.set({ plankWidth: Number(input.value) }));
    label.append(input);
    // Les bornes restent hors du <label> : dedans, le nom accessible du
    // curseur devenait « Largeur de lame en centimètres 7 cm 26 cm ».
    group.append(label, bounds);
    return group;
  }

  /**
   * Un groupe de boutons exclusifs pour une clé d’état. Les boutons sont
   * mémorisés dans `this.controls[key]` : la resynchronisation retrouve ainsi
   * son groupe par son nom, et non par sa position dans le panneau.
   */
  buildButtonGroup(key, title, options, { className, decorate, ariaLabel } = {}) {
    const group = this.buildGroup(title);
    const list = document.createElement('div');
    list.className = className || 'seg';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', ariaLabel || `${title} de la pièce`);

    const buttons = options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = option.id;
      if (decorate) decorate(button, option);
      button.append(document.createTextNode(option.label));
      button.setAttribute('aria-pressed', String(this.state[key] === option.id));
      button.addEventListener('click', () => {
        this.set({ [key]: option.id });
        this.syncGroup(key);
      });
      list.append(button);
      return button;
    });

    this.controls[key] = buttons;
    group.append(list);
    return group;
  }

  buildWallSelect(key, title, noneLabel) {
    return this.buildButtonGroup(key, title, [...WALLS, { id: 'none', label: noneLabel }]);
  }

  buildTone() {
    return this.buildButtonGroup('tone', 'Teinte', TONE_LABELS, {
      className: 'tone-swatches',
      ariaLabel: 'Teinte du parquet',
      decorate: (button, option) => {
        button.classList.add('tone-swatch');
        const dot = document.createElement('i');
        // La pastille montre la couleur qui sera réellement peinte au sol.
        dot.style.setProperty('--tone', toneColor(option.id));
        dot.setAttribute('aria-hidden', 'true');
        button.append(dot);
      },
    });
  }

  buildActions() {
    const group = document.createElement('div');
    group.className = 'visualizer__actions';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn--ghost btn--sm';
    reset.textContent = 'Réinitialiser';
    reset.addEventListener('click', () => this.reset());

    this.projectLink = document.createElement('a');
    this.projectLink.className = 'btn btn--sm';
    this.projectLink.href = `${this.base()}projet/`;
    this.projectLink.textContent = 'Utiliser dans mon projet';

    group.append(reset, this.projectLink);
    return group;
  }

  /**
   * Retour aux valeurs par défaut.
   *
   * Le retour passe par `set()`, donc l’état partagé avec le visualiseur photo
   * est remis à zéro lui aussi. Sans cela, un rechargement de page ressortait
   * le motif et la teinte que l’on venait justement d’abandonner.
   */
  reset() {
    this.set({ ...DEFAULTS });
    this.syncControls();
  }

  /** Réaligne un groupe de boutons sur l’état courant. */
  syncGroup(key) {
    (this.controls[key] || []).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === this.state[key]));
    });
  }

  /** Réaligne tous les contrôles sur l’état courant (après réinitialisation). */
  syncControls() {
    if (this.dimInputs) {
      Object.entries(this.dimInputs).forEach(([key, input]) => {
        input.value = String(this.state[key]);
      });
    }
    if (this.plankInput) this.plankInput.value = String(this.state.plankWidth);
    Object.keys(this.controls).forEach((key) => this.syncGroup(key));
    this.updatePatternButtons();
  }

  /** Géométrie : la pièce est dessinée en centimètres, longueur sur X. */
  geometry() {
    const length = this.state.length * 100;
    const width = this.state.width * 100;
    const pad = Math.max(length, width) * PAD_RATIO;
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

    const boxWidth = length + pad * 2;
    const boxHeight = width + pad * 2;
    const svg = svgEl('svg', {
      viewBox: `${-pad} ${-pad} ${boxWidth} ${boxHeight}`,
      role: 'img',
      'aria-label': `Pièce de ${fr(this.state.length)} m sur ${fr(this.state.width)} m, pose ${pattern.label}`,
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
    this.canvas.append(svg);
    // La proportion du plan sert à borner sa hauteur sans laisser de bandes
    // vides : voir la note sur --plan-ratio dans css/components/visualizer.css.
    this.canvas.style.setProperty('--plan-ratio', (boxWidth / boxHeight).toFixed(3));

    this.updateReadout(ctx, pattern);
    this.updatePatternButtons();
    if (this.plankOutput) this.plankOutput.textContent = `${plankWidth} cm`;
    if (this.projectLink) {
      this.projectLink.href = `${this.base()}projet/?orientation=${this.state.pattern}&surface=${Math.round(
        this.state.length * this.state.width
      )}`;
    }
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

  /**
   * La fenêtre : le trait de mur, le verre, et son nom.
   *
   * Le libellé était centré sur le trait à 0,045 fois le grand côté : il
   * débordait à moitié hors de la pièce sur les murs latéraux, et pesait
   * presque autant que les cotes. Il est ramené à 0,03, posé du bon côté du
   * mur, et cerné de la couleur du fond pour rester lisible sur le parquet.
   */
  buildWindow(length, width) {
    const wall = this.state.window;
    const seg = this.wallSegment(wall, length, width, 0.42);
    const base = svgEl('line', { ...seg, stroke: '#f6f4ef', 'stroke-width': 9 });
    const glass = svgEl('line', { ...seg, stroke: '#7aa7b8', 'stroke-width': 4 });
    const size = Math.max(length, width) * 0.03;
    const anchor = wall === 'left' ? 'start' : wall === 'right' ? 'end' : 'middle';
    const label = svgEl('text', {
      x: (seg.x1 + seg.x2) / 2,
      y: (seg.y1 + seg.y2) / 2,
      fill: '#4c6570',
      stroke: '#f6f4ef',
      'stroke-width': size * 0.28,
      'stroke-linejoin': 'round',
      'paint-order': 'stroke',
      'font-size': size,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': anchor,
      dx: wall === 'left' ? size * 0.5 : wall === 'right' ? -size * 0.5 : 0,
      dy: wall === 'top' ? size * 1.25 : wall === 'bottom' ? -size * 0.6 : -size * 0.45,
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

  /**
   * Les cotes.
   *
   * Les libellés passent sous le trait de cote et à sa gauche, c’est-à-dire
   * dans la marge, plutôt qu’entre le trait et le mur : la pièce récupère
   * l’espace, et la cote reste lisible à 0,033 fois le grand côté.
   */
  buildDimensionLines(length, width, pad) {
    const size = Math.max(length, width) * 0.033;
    const offset = pad * 0.55;
    const nodes = [];

    const lengthLine = svgEl('line', {
      x1: 0,
      y1: width + offset,
      x2: length,
      y2: width + offset,
      stroke: '#a5afb5',
      'stroke-width': 1.6,
    });
    const lengthLabel = svgEl('text', {
      x: length / 2,
      y: width + offset,
      dy: size * 0.95,
      fill: '#6d7b84',
      'font-size': size,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': 'middle',
    });
    lengthLabel.textContent = `${fr(this.state.length)} m`;

    const widthLine = svgEl('line', {
      x1: -offset,
      y1: 0,
      x2: -offset,
      y2: width,
      stroke: '#a5afb5',
      'stroke-width': 1.6,
    });
    const widthLabel = svgEl('text', {
      x: -offset,
      y: width / 2,
      dy: -size * 0.4,
      fill: '#6d7b84',
      'font-size': size,
      'font-family': 'ui-monospace, monospace',
      'text-anchor': 'middle',
      transform: `rotate(-90 ${-offset} ${width / 2})`,
    });
    widthLabel.textContent = `${fr(this.state.width)} m`;

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

    const cards = [
      ['Surface', `${fr(surface, 1)} m²`, true],
      ['Chutes estimées', `+${loss} %`, true],
      ['Lames', `~${planks}`, true],
      ['Motif', pattern.label, false],
    ];
    this.readout.innerHTML = cards
      .map(
        ([label, value, mono]) =>
          `<div><dt>${label}</dt><dd${mono ? '' : ' class="is-text"'}>${value}</dd></div>`
      )
      .join('');

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
