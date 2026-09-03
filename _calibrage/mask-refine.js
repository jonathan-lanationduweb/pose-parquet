/**
 * Affinage d'un contour de sol sur l'image — outil de calibrage.
 *
 * **Le plan de perspective et le contour du sol sont deux choses
 * indépendantes.** Le plan a besoin de quatre points ; le contour doit suivre
 * les plinthes, les seuils, les huisseries, les grilles et les décrochés. Les
 * confondre donne une frontière en corde droite qui passe devant la plinthe —
 * et c'est le défaut qui trahit le plus sûrement un sol remplacé : la
 * perspective peut être juste, l'échelle juste, la lumière juste, on voit
 * quand même un polygone posé sur la photo.
 *
 * Un contour relevé à la main compte une dizaine de points. Ce module en
 * produit trente à quarante, placés sur les vraies arêtes de l'image, à partir
 * du même relevé grossier.
 *
 * Méthode, en quatre temps :
 *
 * 1. **densification** — un point tous les 5 px le long du contour ;
 * 2. **recalage** — chaque point glisse le long de sa normale vers le maximum
 *    de gradient de l'image, dans une fenêtre de ±14 px pondérée vers
 *    l'origine (sans cette pondération, un point saute volontiers sur un bord
 *    voisin plus contrasté) ;
 * 3. **filtrage** — médiane pour écarter les points qui ont accroché autre
 *    chose, puis moyenne glissante pour supprimer le feston du suivi de bord,
 *    qui se voit comme une ondulation le long d'une plinthe droite ;
 * 4. **simplification** — Douglas–Peucker à 0,9 px, pour ne garder que les
 *    points qui portent la forme.
 *
 * Les côtés du cadre de l'image sont **figés** : le bas et les bords ne sont
 * pas des frontières du sol, seulement la limite de la photo. Les déplacer
 * ferait rentrer le parquet dans le cadre.
 *
 * ## Mesurer, pas deviner
 *
 * `qualiteContour()` donne le gradient médian de l'image le long d'un contour.
 * C'est la mesure qui a permis de trier : un contour posé sur du sol nu tombe
 * au niveau du bruit (18 sur la chambre avant reprise), un contour posé sur
 * l'architecture monte à 200. C'est ce chiffre, et non l'œil seul, qui a
 * désigné les scènes à reprendre — la chambre à ×11, la pièce claire à ×4,4,
 * le séjour déjà bon à ×1,1.
 */

/** Carte de gradient (Sobel) de la luminance, calculée une fois. */
function carteGradient(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data;
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < lum.length; i += 1, p += 4) {
    lum[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  const grad = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = -lum[i - width - 1] - 2 * lum[i - 1] - lum[i + width - 1]
        + lum[i - width + 1] + 2 * lum[i + 1] + lum[i + width + 1];
      const gy = -lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1]
        + lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1];
      grad[i] = Math.hypot(gx, gy);
    }
  }
  return { grad, width, height };
}

/** Douglas–Peucker, en pixels image. */
function simplifier(points, tolerance) {
  if (points.length < 3) return points;
  const garder = new Uint8Array(points.length);
  garder[0] = 1;
  garder[points.length - 1] = 1;
  const pile = [[0, points.length - 1]];
  while (pile.length) {
    const [i0, i1] = pile.pop();
    const a = points[i0];
    const b = points[i1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const den = Math.hypot(dx, dy) || 1;
    let pire = -1;
    let dmax = 0;
    for (let k = i0 + 1; k < i1; k += 1) {
      const dist = Math.abs(dy * (points[k].x - a.x) - dx * (points[k].y - a.y)) / den;
      if (dist > dmax) {
        dmax = dist;
        pire = k;
      }
    }
    if (dmax > tolerance && pire > 0) {
      garder[pire] = 1;
      pile.push([i0, pire], [pire, i1]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

/** Un point du cadre de l'image : à ne pas déplacer. */
export const surLeCadre = (p) => p.y > 0.965 || p.x < 0.004 || p.x > 0.996;

/**
 * @param {HTMLCanvasElement} canvas  la photo de la scène
 * @returns {(polygone: {x,y}[], options?: object) => {x,y}[]}
 */
export function affineurDeContour(canvas) {
  const { grad, width, height } = carteGradient(canvas);
  const gradAt = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 1 || yi < 1 || xi >= width - 1 || yi >= height - 1) return 0;
    return grad[yi * width + xi];
  };

  return (polygone, { pas = 5, rayon = 14, tolerance = 0.9, lissage = 5, figer = surLeCadre } = {}) => {
    const bruts = polygone.map((p) => ({ x: p.x * width, y: p.y * height, fige: figer(p) }));

    const dense = [];
    for (let i = 0; i < bruts.length; i += 1) {
      const a = bruts[i];
      const b = bruts[(i + 1) % bruts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(len / pas));
      for (let k = 0; k < n; k += 1) {
        const t = k / n;
        dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, fige: a.fige && b.fige });
      }
    }

    // Sens de parcours, pour orienter la normale vers l'extérieur du contour.
    let aire = 0;
    for (let i = 0; i < dense.length; i += 1) {
      const a = dense[i];
      const b = dense[(i + 1) % dense.length];
      aire += a.x * b.y - b.x * a.y;
    }
    const sens = aire > 0 ? 1 : -1;

    const sigma = rayon / 2;
    const offsets = dense.map((p, i) => {
      if (p.fige) return 0;
      const avant = dense[(i - 1 + dense.length) % dense.length];
      const apres = dense[(i + 1) % dense.length];
      const tx = apres.x - avant.x;
      const ty = apres.y - avant.y;
      const norme = Math.hypot(tx, ty) || 1;
      p.nx = (ty / norme) * sens;
      p.ny = (-tx / norme) * sens;
      let meilleur = 0;
      let score = -1;
      for (let t = -rayon; t <= rayon; t += 1) {
        const s = gradAt(p.x + p.nx * t, p.y + p.ny * t) * Math.exp(-(t * t) / (2 * sigma * sigma));
        if (s > score) {
          score = s;
          meilleur = t;
        }
      }
      return meilleur;
    });

    const median = offsets.map((_, i) => {
      const f = [];
      for (let k = -3; k <= 3; k += 1) f.push(offsets[(i + k + offsets.length) % offsets.length]);
      f.sort((a, b) => a - b);
      return f[3];
    });
    const lisse = median.map((_, i) => {
      let somme = 0;
      let n = 0;
      for (let k = -lissage; k <= lissage; k += 1) {
        somme += median[(i + k + median.length) % median.length];
        n += 1;
      }
      return somme / n;
    });

    const bouges = dense.map((p, i) => ({ x: p.x + (p.nx || 0) * lisse[i], y: p.y + (p.ny || 0) * lisse[i] }));
    return simplifier(bouges, tolerance).map((p) => ({
      x: +Math.max(0, Math.min(1, p.x / width)).toFixed(4),
      y: +Math.max(0, Math.min(1, p.y / height)).toFixed(4),
    }));
  };
}

/**
 * Gradient médian de l'image le long d'un contour : mesure de placement.
 *
 * Les côtés du cadre sont ignorés — ce ne sont pas des frontières réelles et
 * ils fausseraient la moyenne.
 */
export function qualiteContour(canvas) {
  const { grad, width, height } = carteGradient(canvas);
  return (polygone) => {
    const valeurs = [];
    for (let i = 0; i < polygone.length; i += 1) {
      const a = polygone[i];
      const b = polygone[(i + 1) % polygone.length];
      if (surLeCadre(a) && surLeCadre(b)) continue;
      const len = Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
      const n = Math.max(1, Math.round(len / 3));
      for (let k = 0; k < n; k += 1) {
        const t = k / n;
        const x = Math.round((a.x + (b.x - a.x) * t) * width);
        const y = Math.round((a.y + (b.y - a.y) * t) * height);
        if (x > 0 && y > 0 && x < width - 1 && y < height - 1) valeurs.push(grad[y * width + x]);
      }
    }
    if (!valeurs.length) return 0;
    valeurs.sort((u, v) => u - v);
    return +valeurs[Math.floor(valeurs.length / 2)].toFixed(1);
  };
}
