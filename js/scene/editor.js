/**
 * Correction du sol : cadre de perspective, contour précis, pinceau.
 *
 * L'éditeur travaille toujours sur **une zone** de la scène : son plan — les
 * quatre coins qui donnent la fuite — et son contour, le polygone réellement
 * peint. C'est exactement le modèle de données d'une scène précalibrée, et
 * celui qu'un service d'analyse renverra : l'écran de correction ne
 * disparaîtra donc pas ce jour-là, il deviendra facultatif.
 *
 * D'où viennent les données de départ n'est pas l'affaire de ce module ;
 * voir js/scene/analyzer.js.
 */

const clampPt = (v) => Math.max(-0.08, Math.min(1.08, v));

/** Cadre de départ pour une photo dont on ne sait rien. */
export const DEFAULT_FRAME = [
  { x: 0.18, y: 0.62 },
  { x: 0.82, y: 0.62 },
  { x: 1.0, y: 1.0 },
  { x: 0.0, y: 1.0 },
];

/** La capture de pointeur peut échouer (pointeur déjà relâché) : sans conséquence. */
const capture = (el, id) => {
  try {
    el.setPointerCapture(id);
  } catch (error) {
    void error;
  }
};
const release = (el, id) => {
  try {
    if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
  } catch (error) {
    void error;
  }
};
const FRAME_LABELS = ['fond gauche', 'fond droite', 'devant droite', 'devant gauche'];

/**
 * Éditeur de zone superposé à la photo.
 * @param {HTMLElement} host conteneur positionné (même boîte que l'image)
 * @param {object} handlers
 */
export function createFloorEditor(host, handlers) {
  const svgNS = 'http://www.w3.org/2000/svg';
  let mode = 'off'; // off | frame | polygon | brush
  let frame = DEFAULT_FRAME.map((p) => ({ ...p }));
  let polygon = frame.map((p) => ({ ...p }));
  let brush = { mode: 'remove', radius: 40 };
  let painting = false;

  const layer = document.createElement('div');
  layer.className = 'floor-mask';
  layer.hidden = true;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'floor-mask__svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const shape = document.createElementNS(svgNS, 'polygon');
  shape.setAttribute('class', 'floor-mask__shape');
  svg.appendChild(shape);
  layer.appendChild(svg);

  const cursor = document.createElement('span');
  cursor.className = 'floor-mask__cursor';
  cursor.hidden = true;
  layer.appendChild(cursor);

  const handleBox = document.createElement('div');
  handleBox.className = 'floor-mask__handles';
  layer.appendChild(handleBox);

  const activePoints = () => (mode === 'frame' ? frame : polygon);

  const paint = () => {
    const points = activePoints();
    shape.setAttribute('points', points.map((p) => `${p.x * 100},${p.y * 100}`).join(' '));
    handleBox.innerHTML = '';
    if (mode === 'brush' || mode === 'off') return;

    points.forEach((point, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'floor-mask__handle';
      button.dataset.index = String(index);
      button.style.left = `${point.x * 100}%`;
      button.style.top = `${point.y * 100}%`;
      const label =
        mode === 'frame'
          ? `Coin ${index + 1} sur 4 — ${FRAME_LABELS[index]}`
          : `Point ${index + 1} sur ${points.length} du contour`;
      button.setAttribute(
        'aria-label',
        `${label}. Flèches pour déplacer, Maj pour aller plus vite${
          mode === 'polygon' ? ', Suppr pour retirer ce point' : ''
        }.`
      );
      attachHandle(button, index);
      handleBox.appendChild(button);
    });
  };

  const emit = () => {
    paint();
    if (mode === 'frame') handlers.onFrameChange(frame.map((p) => ({ ...p })));
    else handlers.onPolygonChange(polygon.map((p) => ({ ...p })));
  };

  function pointFromEvent(event) {
    const rect = layer.getBoundingClientRect();
    return {
      x: clampPt((event.clientX - rect.left) / rect.width),
      y: clampPt((event.clientY - rect.top) / rect.height),
    };
  }

  function attachHandle(button, index) {
    let pointerId = null;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointerId = event.pointerId;
      capture(button, pointerId);
      button.dataset.active = 'true';
    });

    button.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const point = pointFromEvent(event);
      if (mode === 'frame') frame[index] = point;
      else polygon[index] = point;
      emit();
    });

    const stop = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      release(button, pointerId);
      delete button.dataset.active;
      pointerId = null;
    };
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);

    button.addEventListener('keydown', (event) => {
      const stepBase = event.shiftKey ? 0.04 : 0.008;
      const moves = {
        ArrowLeft: [-stepBase, 0],
        ArrowRight: [stepBase, 0],
        ArrowUp: [0, -stepBase],
        ArrowDown: [0, stepBase],
      };
      if (moves[event.key]) {
        event.preventDefault();
        const [dx, dy] = moves[event.key];
        const list = activePoints();
        list[index] = { x: clampPt(list[index].x + dx), y: clampPt(list[index].y + dy) };
        emit();
        return;
      }
      if (mode === 'polygon' && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        if (handlers.onRemovePoint(index)) emit();
      }
    });
  }

  /* ---- Interaction sur la zone : ajout de point ou pinceau ---- */
  layer.addEventListener('pointerdown', (event) => {
    if (mode === 'polygon') {
      const point = pointFromEvent(event);
      handlers.onInsertPoint(point);
      return;
    }
    if (mode !== 'brush') return;
    event.preventDefault();
    painting = true;
    capture(layer, event.pointerId);
    handlers.onStrokeStart(brush.mode, brush.radius, pointFromEvent(event));
  });

  layer.addEventListener('pointermove', (event) => {
    if (mode === 'brush') {
      const rect = layer.getBoundingClientRect();
      cursor.style.left = `${event.clientX - rect.left}px`;
      cursor.style.top = `${event.clientY - rect.top}px`;
      if (painting) handlers.onStrokeMove(pointFromEvent(event));
    }
  });

  const endPaint = (event) => {
    if (!painting) return;
    painting = false;
    release(layer, event.pointerId);
    handlers.onStrokeEnd();
  };
  layer.addEventListener('pointerup', endPaint);
  layer.addEventListener('pointercancel', endPaint);
  layer.addEventListener('pointerleave', () => {
    cursor.hidden = mode !== 'brush' ? true : cursor.hidden;
  });

  host.appendChild(layer);
  paint();

  return {
    element: layer,
    getFrame: () => frame.map((p) => ({ ...p })),
    getPolygon: () => polygon.map((p) => ({ ...p })),
    setFrame(next) {
      frame = next.map((p) => ({ ...p }));
      paint();
    },
    setPolygon(next) {
      polygon = next.map((p) => ({ ...p }));
      paint();
    },
    setBrush(next) {
      brush = { ...brush, ...next };
      cursor.style.setProperty('--brush', `${brush.radius * 2}px`);
      cursor.dataset.mode = brush.mode;
    },
    getBrush: () => ({ ...brush }),
    setMode(next) {
      mode = next;
      layer.hidden = next === 'off';
      layer.dataset.mode = next;
      cursor.hidden = next !== 'brush';
      paint();
      if (next === 'frame' || next === 'polygon') {
        const first = handleBox.querySelector('button');
        if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 60);
      }
    },
    getMode: () => mode,
  };
}
