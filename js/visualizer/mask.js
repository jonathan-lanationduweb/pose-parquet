/**
 * Masque de couverture du sol.
 *
 * Deux notions distinctes, volontairement séparées :
 *  - le **cadre** (4 points) définit la perspective : c'est lui qui sert au
 *    calcul de l'homographie ;
 *  - le **masque** définit où le parquet est réellement peint : polygone à
 *    N points + retouches au pinceau (ajouter / retirer).
 *
 * Retirer au pinceau, c'est aussi la gestion manuelle des occlusions :
 * les pixels retirés laissent réapparaître la photo d'origine, donc les
 * meubles, tapis et objets posés au sol.
 *
 * Le masque est un canevas hors écran de la taille de l'image ; on n'en lit
 * que le canal alpha, que le moteur de rendu échantillonne pixel à pixel.
 */

const MAX_HISTORY = 40;

export function createMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let polygon = [];
  /** @type {{mode:'add'|'remove', radius:number, points:{x:number,y:number}[]}[]} */
  let strokes = [];
  let redoStack = [];
  let alpha = new Uint8ClampedArray(width * height);
  let dirty = true;

  const paintStroke = (stroke) => {
    ctx.save();
    ctx.globalCompositeOperation = stroke.mode === 'remove' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.radius * 2;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, stroke.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const x = p.x * width;
        const y = p.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.restore();
  };

  const rebuild = () => {
    ctx.clearRect(0, 0, width, height);
    if (polygon.length >= 3) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      polygon.forEach((p, i) => {
        const x = p.x * width;
        const y = p.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
    strokes.forEach(paintStroke);
    dirty = true;
  };

  const readAlpha = () => {
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 0, p = 3; i < alpha.length; i += 1, p += 4) alpha[i] = data[p];
    dirty = false;
  };

  const pushHistory = () => {
    redoStack = [];
    if (strokes.length > MAX_HISTORY) strokes = strokes.slice(-MAX_HISTORY);
  };

  return {
    canvas,
    width,
    height,

    setPolygon(points) {
      polygon = points.map((p) => ({ ...p }));
      rebuild();
    },
    getPolygon: () => polygon.map((p) => ({ ...p })),

    /** Ajoute un point sur le segment le plus proche du clic. */
    insertPointNear(point) {
      if (polygon.length < 2) return polygon.length;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < polygon.length; i += 1) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        let t = len2 ? ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      polygon.splice(best + 1, 0, { ...point });
      rebuild();
      return best + 1;
    },

    removePoint(index) {
      if (polygon.length <= 3) return false;
      polygon.splice(index, 1);
      rebuild();
      return true;
    },

    movePoint(index, point) {
      if (!polygon[index]) return;
      polygon[index] = { ...point };
      rebuild();
    },

    /** Trace au pinceau : début, prolongement, fin. */
    beginStroke(mode, radius, point) {
      strokes.push({ mode, radius, points: [point] });
      paintStroke(strokes[strokes.length - 1]);
      dirty = true;
      pushHistory();
    },
    extendStroke(point) {
      const stroke = strokes[strokes.length - 1];
      if (!stroke) return;
      stroke.points.push(point);
      // Redessine uniquement le dernier segment : suffisant et bien plus rapide
      paintStroke({ ...stroke, points: stroke.points.slice(-2) });
      dirty = true;
    },

    undo() {
      if (!strokes.length) return false;
      redoStack.push(strokes.pop());
      rebuild();
      return true;
    },
    redo() {
      if (!redoStack.length) return false;
      strokes.push(redoStack.pop());
      rebuild();
      return true;
    },
    clearStrokes() {
      strokes = [];
      redoStack = [];
      rebuild();
    },
    hasStrokes: () => strokes.length > 0,
    canUndo: () => strokes.length > 0,
    canRedo: () => redoStack.length > 0,

    /** Canal alpha du masque, recalculé seulement si nécessaire. */
    getAlpha() {
      if (dirty) readAlpha();
      return alpha;
    },
  };
}
