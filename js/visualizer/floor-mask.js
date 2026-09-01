/**
 * Délimitation de la zone de sol.
 *
 * V1 : sélection **manuelle**. Quatre poignées déplaçables (souris, tactile,
 * clavier) définissent le quadrilatère du sol. Aucune détection automatique
 * n'est utilisée ni simulée.
 *
 * L'appel passe par une interface abstraite `detectFloor(strategy, context)`
 * afin qu'une future segmentation automatique (modèle spécialisé ou service
 * externe) puisse être branchée sans toucher au reste du visualiseur :
 *
 *   registerDetector('auto', async ({ canvas }) => quadNormalise);
 *   await detectFloor('auto', { canvas });
 */

const detectors = new Map();

/** Stratégie manuelle : renvoie la zone proposée, l'utilisateur l'ajuste. */
export function manualFloorDetection({ suggestion }) {
  return (
    suggestion || [
      { x: 0.18, y: 0.62 },
      { x: 0.82, y: 0.62 },
      { x: 1.0, y: 1.0 },
      { x: 0.0, y: 1.0 },
    ]
  );
}
detectors.set('manual', manualFloorDetection);

export function registerDetector(name, fn) {
  detectors.set(name, fn);
}

export function availableDetectors() {
  return [...detectors.keys()];
}

/**
 * @param {string} strategy 'manual' aujourd'hui, 'auto' demain
 * @param {object} context  { canvas, suggestion }
 * @returns {Promise<{x:number,y:number}[]>} quadrilatère normalisé
 */
export async function detectFloor(strategy, context) {
  const detector = detectors.get(strategy) || detectors.get('manual');
  return detector(context);
}

const clamp01 = (v) => Math.max(-0.08, Math.min(1.08, v));
const LABELS = ['fond gauche', 'fond droite', 'devant droite', 'devant gauche'];

/**
 * Superposition de sélection.
 * @param {HTMLElement} host conteneur positionné (même boîte que l'image)
 * @param {(quad:{x:number,y:number}[]) => void} onChange
 */
export function createFloorMask(host, onChange) {
  const svgNS = 'http://www.w3.org/2000/svg';
  let quad = manualFloorDetection({});
  let active = false;

  const layer = document.createElement('div');
  layer.className = 'floor-mask';
  layer.hidden = true;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'floor-mask__svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const polygon = document.createElementNS(svgNS, 'polygon');
  polygon.setAttribute('class', 'floor-mask__shape');
  svg.appendChild(polygon);
  layer.appendChild(svg);

  const handles = quad.map((point, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'floor-mask__handle';
    button.dataset.index = String(index);
    button.setAttribute(
      'aria-label',
      `Point ${index + 1} sur 4 — ${LABELS[index]}. Flèches pour déplacer, Maj pour aller plus vite.`
    );
    layer.appendChild(button);
    return button;
  });

  const paint = () => {
    polygon.setAttribute('points', quad.map((p) => `${p.x * 100},${p.y * 100}`).join(' '));
    handles.forEach((handle, index) => {
      handle.style.left = `${quad[index].x * 100}%`;
      handle.style.top = `${quad[index].y * 100}%`;
    });
  };

  const emit = () => {
    paint();
    onChange(quad.map((p) => ({ ...p })));
  };

  // --- Déplacement pointeur (souris, stylet, doigt) ---
  let dragging = null;
  handles.forEach((handle, index) => {
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dragging = { index, id: event.pointerId };
      handle.setPointerCapture(event.pointerId);
      handle.dataset.active = 'true';
    });

    handle.addEventListener('pointermove', (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      const rect = layer.getBoundingClientRect();
      quad[dragging.index] = {
        x: clamp01((event.clientX - rect.left) / rect.width),
        y: clamp01((event.clientY - rect.top) / rect.height),
      };
      emit();
    });

    const stop = (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      delete handle.dataset.active;
      dragging = null;
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);

    // --- Clavier : alternative accessible au glisser ---
    handle.addEventListener('keydown', (event) => {
      const stepBase = event.shiftKey ? 0.04 : 0.008;
      const moves = {
        ArrowLeft: [-stepBase, 0],
        ArrowRight: [stepBase, 0],
        ArrowUp: [0, -stepBase],
        ArrowDown: [0, stepBase],
      };
      if (!moves[event.key]) return;
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      quad[index] = { x: clamp01(quad[index].x + dx), y: clamp01(quad[index].y + dy) };
      emit();
    });
  });

  host.appendChild(layer);
  paint();

  return {
    element: layer,
    getQuad: () => quad.map((p) => ({ ...p })),
    setQuad(next) {
      quad = next.map((p) => ({ ...p }));
      paint();
    },
    setActive(value) {
      active = value;
      layer.hidden = !value;
      if (value) window.setTimeout(() => handles[0].focus({ preventScroll: true }), 60);
    },
    isActive: () => active,
    reset(suggestion) {
      quad = manualFloorDetection({ suggestion });
      emit();
    },
  };
}
