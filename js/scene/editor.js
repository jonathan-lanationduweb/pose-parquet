import { CADRE_DEPART } from './cadre-photo.js';

export const clampPt = (v) => Math.max(0, Math.min(1, v));


export function versImage(clientX, clientY, rect) {
  return {
    x: clampPt((clientX - rect.left) / rect.width),
    y: clampPt((clientY - rect.top) / rect.height),
  };
}


export function versEcran(point, rect) {
  return { x: rect.left + point.x * rect.width, y: rect.top + point.y * rect.height };
}



export function deplacerPoint(depart, dx, dy) {
  const borne = (v, v0) => Math.max(Math.min(0, v0), Math.min(Math.max(1, v0), v));
  return { x: borne(depart.x + dx, depart.x), y: borne(depart.y + dy, depart.y) };
}



export function projeterPoignee(point, zone) {
  if (!zone) return { x: point.x, y: point.y, hors: null };
  const x = Math.max(zone.x0, Math.min(zone.x1, point.x));
  const y = Math.max(zone.y0, Math.min(zone.y1, point.y));
  const cotes = [];
  if (point.y < zone.y0 - 1e-9) cotes.push('haut');
  if (point.y > zone.y1 + 1e-9) cotes.push('bas');
  if (point.x < zone.x0 - 1e-9) cotes.push('gauche');
  if (point.x > zone.x1 + 1e-9) cotes.push('droite');
  return { x, y, hors: cotes.length ? cotes.join('-') : null };
}



export function deconflire(pos, seuil, bornes = null, fixe = -1) {
  const out = pos.map((p) => ({ x: p.x, y: p.y }));
  const borner = (p) => {
    if (!bornes) return;
    p.x = Math.max(bornes.x0, Math.min(bornes.x1, p.x));
    p.y = Math.max(bornes.y0, Math.min(bornes.y1, p.y));
  };
  for (let passe = 0; passe < 40; passe += 1) {
    let conflit = false;
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        let dx = out[i].x - out[j].x;
        let dy = out[i].y - out[j].y;
        let d = Math.hypot(dx, dy);
        if (d >= seuil - 0.01) continue;
        conflit = true;
        if (d < 1e-6) {



          dx = pos[i].x - pos[j].x;
          dy = pos[i].y - pos[j].y;
          d = Math.hypot(dx, dy);
          if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
        }
        const ux = dx / d;
        const uy = dy / d;
        const manque = seuil - Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y);
        const partI = i === fixe ? 0 : j === fixe ? 1 : 0.5;
        const partJ = 1 - partI;
        out[i].x += ux * manque * partI;
        out[i].y += uy * manque * partI;
        out[j].x -= ux * manque * partJ;
        out[j].y -= uy * manque * partJ;
        if (i !== fixe) borner(out[i]);
        if (j !== fixe) borner(out[j]);
      }
    }
    if (!conflit) break;
  }
  return out;
}



export const DEFAULT_FRAME = CADRE_DEPART.map((p) => ({ ...p }));



export function problemeCadre(points, aireMin = 0.02) {
  if (!points || points.length !== 4) return 'Placez les quatre poignées aux angles du sol.';
  const cross = (o, a, c) => (a.x - o.x) * (c.y - o.y) - (a.y - o.y) * (c.x - o.x);
  const signes = points.map((p, i) => Math.sign(cross(p, points[(i + 1) % 4], points[(i + 2) % 4])));
  if (signes.some((s) => s === 0) || !signes.every((s) => s === signes[0])) {
    return 'Le cadre se croise : les deux poignées du fond en haut, les deux de devant en bas, sans chevauchement.';
  }
  let aire = 0;
  points.forEach((p, i) => { const q = points[(i + 1) % 4]; aire += p.x * q.y - q.x * p.y; });
  if (Math.abs(aire) / 2 < aireMin) return 'Le cadre est trop petit : écartez les poignées jusqu’aux angles du sol.';
  return null;
}


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



export function createFloorEditor(host, handlers) {
  const svgNS = 'http://www.w3.org/2000/svg';
  let mode = 'off';
  let frame = DEFAULT_FRAME.map((p) => ({ ...p }));
  let polygon = frame.map((p) => ({ ...p }));
  let brush = { mode: 'remove', radius: 40 };
  let painting = false;

  const layer = document.createElement('div');
  layer.className = 'floor-mask';
  layer.hidden = true;



  const marge = document.createElement('div');
  marge.className = 'floor-mask__marge';
  layer.appendChild(marge);

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
  let construits = '';

  let tenue = null;



  const paint = () => {
    const points = activePoints();
    shape.setAttribute('points', points.map((p) => `${p.x * 100},${p.y * 100}`).join(' '));
    if (mode === 'brush' || mode === 'off') {
      handleBox.innerHTML = '';
      construits = '';
      return;
    }
    const cle = `${mode}:${points.length}`;
    if (cle !== construits) {
      construits = cle;
      handleBox.innerHTML = '';
      points.forEach((point, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'floor-mask__handle';
        button.dataset.index = String(index);
        const fleche = document.createElement('span');
        fleche.className = 'floor-mask__fleche';
        fleche.setAttribute('aria-hidden', 'true');
        button.appendChild(fleche);

        const lien = document.createElement('span');
        lien.className = 'floor-mask__lien';
        lien.setAttribute('aria-hidden', 'true');
        button.appendChild(lien);
        attachHandle(button, index);
        handleBox.appendChild(button);
      });
    }
    placerPoignees(points);
  };



  function zoneEnFractions() {
    const vis = handlers.zoneVisible ? handlers.zoneVisible() : null;
    const r = layer.getBoundingClientRect();
    if (!vis || !r.width || !r.height) return null;



    return {
      x0: Math.min(0, (vis.left - r.left) / r.width),
      x1: Math.max(1, (vis.right - r.left) / r.width),
      y0: Math.min(0, (vis.top - r.top) / r.height),
      y1: Math.max(1, (vis.bottom - r.top) / r.height),
    };
  }



  function diametrePrise(button) {
    const avant = window.getComputedStyle(button, '::before');
    const marge = -parseFloat(avant.left || '0') || 0;
    return (button.offsetWidth || 30) + 2 * marge;
  }


  function placerPoignees(points) {
    const zone = zoneEnFractions();
    const r = layer.getBoundingClientRect();
    const boutons = [...handleBox.children];
    const uis = boutons.map((button, index) => projeterPoignee(points[index], zone));

    let affiche = uis.map((ui) => ({ x: ui.x, y: ui.y }));
    if (r.width && r.height && boutons.length > 1) {
      const px = uis.map((ui) => ({ x: ui.x * r.width, y: ui.y * r.height }));
      const fixe = tenue && tenue.index < px.length ? tenue.index : -1;
      if (fixe >= 0) {
        px[fixe] = { x: px[fixe].x + tenue.dx, y: px[fixe].y + tenue.dy };
      }
      const bornes = zone
        ? { x0: zone.x0 * r.width, x1: zone.x1 * r.width, y0: zone.y0 * r.height, y1: zone.y1 * r.height }
        : null;
      const ecartes = deconflire(px, diametrePrise(boutons[0]), bornes, fixe);
      affiche = ecartes.map((p) => ({ x: p.x / r.width, y: p.y / r.height }));
    }
    boutons.forEach((button, index) => {
      const point = points[index];
      const ui = uis[index];
      const vu = affiche[index];
      button.style.left = `${vu.x * 100}%`;
      button.style.top = `${vu.y * 100}%`;

      const lx = (ui.x - vu.x) * r.width;
      const ly = (ui.y - vu.y) * r.height;
      const longueur = Math.hypot(lx, ly);
      if (longueur > 0.5) {
        button.dataset.decale = 'true';
        button.style.setProperty('--lien', `${longueur}px`);
        button.style.setProperty('--angle-lien', `${Math.atan2(ly, lx)}rad`);
      } else {
        delete button.dataset.decale;
      }
      if (ui.hors) {
        const angle = Math.atan2((point.y - ui.y) * r.height, (point.x - ui.x) * r.width);
        button.dataset.hors = ui.hors;
        button.style.setProperty('--angle', `${angle}rad`);
      } else {
        delete button.dataset.hors;
      }
      const index1 = index + 1;
      const label =
        mode === 'frame'
          ? `Coin ${index1} sur 4 — ${FRAME_LABELS[index]}`
          : `Point ${index1} sur ${points.length} du contour`;
      const COTES = { haut: 'le haut', bas: 'le bas', gauche: 'la gauche', droite: 'la droite' };
      const loin = ui.hors ? ` — point réel hors de l’écran, vers ${ui.hors.split('-').map((c) => COTES[c]).join(' et ')}` : '';
      button.setAttribute(
        'aria-label',
        `${label}${loin}. Flèches pour déplacer, Maj pour aller plus vite${
          mode === 'polygon' ? ', Suppr pour retirer ce point' : ''
        }.`
      );
    });
  }


  let finClavier = 0;
  const finDeGeste = () => {
    if (handlers.onGestureEnd) handlers.onGestureEnd();
  };

  const emit = () => {
    paint();
    if (mode === 'frame') handlers.onFrameChange(frame.map((p) => ({ ...p })));
    else handlers.onPolygonChange(polygon.map((p) => ({ ...p })));
  };

  function pointFromEvent(event) {
    return versImage(event.clientX, event.clientY, layer.getBoundingClientRect());
  }

  function attachHandle(button, index) {
    let pointerId = null;


    let prise = null;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointerId = event.pointerId;
      const r = layer.getBoundingClientRect();
      prise = { x: event.clientX, y: event.clientY, w: r.width, h: r.height, point: { ...activePoints()[index] } };


      const ui = projeterPoignee(activePoints()[index], zoneEnFractions());
      const b = button.getBoundingClientRect();
      tenue = {
        index,
        dx: b.left + b.width / 2 - (r.left + ui.x * r.width),
        dy: b.top + b.height / 2 - (r.top + ui.y * r.height),
      };
      capture(button, pointerId);
      button.dataset.active = 'true';
    });

    button.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId || !prise) return;
      const point = deplacerPoint(prise.point, (event.clientX - prise.x) / prise.w, (event.clientY - prise.y) / prise.h);
      if (mode === 'frame') frame[index] = point;
      else polygon[index] = point;
      emit();
    });

    const stop = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      release(button, pointerId);
      delete button.dataset.active;
      pointerId = null;
      prise = null;

      tenue = null;
      placerPoignees(activePoints());
      finDeGeste();
    };
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);

    button.addEventListener('lostpointercapture', stop);

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
        list[index] = deplacerPoint(list[index], dx, dy);
        emit();

        window.clearTimeout(finClavier);
        finClavier = window.setTimeout(finDeGeste, 280);
        return;
      }
      if (mode === 'polygon' && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        if (handlers.onRemovePoint(index)) emit();
      }
    });
  }


  layer.addEventListener('pointerdown', (event) => {
    if (mode === 'polygon') {
      const point = pointFromEvent(event);
      handlers.onInsertPoint(point);
      finDeGeste();
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


  const replacer = () => { if (mode === 'frame' || mode === 'polygon') placerPoignees(activePoints()); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(replacer).observe(layer);
  window.addEventListener('resize', replacer);

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


      window.requestAnimationFrame(() => { if (mode === next) paint(); });
      if (next === 'frame' || next === 'polygon') {
        const first = handleBox.querySelector('button');
        if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 60);
      }
    },
    getMode: () => mode,
  };
}
