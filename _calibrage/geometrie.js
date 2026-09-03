/**
 * Géométrie de calibrage — outil interne, jamais chargé par le site.
 *
 * Ce module regroupe les mesures qui transforment une photographie en plan de
 * sol. Elles vivaient dans `calibrage.js`, mêlées à son interface ; les
 * extraire permet de calibrer une scène **en script**, sans cliquer, ce qui
 * était devenu nécessaire : à la main, six nouvelles pièces représentaient
 * des centaines de relevés.
 *
 * ## Le principe
 *
 * On ne devine ni la perspective ni les dimensions. On relève dans l'image
 * deux familles de droites du sol — pieds de murs, plinthes, seuils, joints de
 * lames. Deux droites parallèles dans la pièce se croisent dans l'image en
 * leur **point de fuite** : c'est une mesure, pas une hypothèse, et elle ne
 * suppose aucun horizon.
 *
 * De là tout se déduit :
 *
 *   - la droite qui joint deux points de fuite de directions horizontales
 *     **est** l'horizon ;
 *   - deux directions perpendiculaires donnent la focale, par
 *     `focaleParOrthogonalite()` ;
 *   - focale + hauteur d'œil donnent la profondeur de chaque point du sol,
 *     donc les mètres du quadrilatère, par `mesureQuad()`.
 *
 * ## Ce qui fait preuve
 *
 * Une calibration juste se vérifie, elle ne se décrète pas. Deux contrôles
 * sont fournis et doivent tous deux passer :
 *
 *   1. **concordance des côtés opposés** — les deux largeurs mesurées du
 *      quadrilatère doivent tomber sur la même valeur, et les deux
 *      profondeurs aussi. C'est ce qui prouve que le quadrilatère est bien
 *      l'image d'un rectangle ;
 *   2. **invariance de l'étendue** — l'étendue du sol visible, en mètres, ne
 *      doit pas dépendre du rectangle de référence choisi. Deux relevés sur
 *      deux rectangles différents de la même pièce doivent s'accorder.
 *
 * Un écart de quelques pour cent sur l'un des deux veut dire que le relevé
 * est faux, pas qu'il est imprécis.
 */

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

/** Intersection de deux droites (point + direction). `null` si parallèles. */
export function intersecte(p1, d1, p2, d2) {
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null; // parallèles à l'écran : fuite à l'infini
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

/**
 * Droite au plus près d'une série de points, en moindres carrés **totaux**.
 *
 * La régression ordinaire y = ax + b ne sait pas représenter une droite
 * verticale, et se dégrade bien avant : le pied du mur d'un couloir est
 * presque vertical dans l'image. On passe donc par l'axe principal du nuage,
 * qui n'a pas d'orientation privilégiée.
 *
 * `residuMax` est en pixels : au-delà de 2 ou 3, les points relevés ne sont
 * pas alignés et la droite ne veut rien dire. C'est le garde-fou qui a fait
 * écarter les relevés pris sur un sol réfléchissant.
 */
export function ajusteDroite(points) {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  // Axe principal du nuage : vecteur propre dominant de la matrice de covariance.
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const d = { x: Math.cos(angle), y: Math.sin(angle) };
  const ecarts = points.map((p) => Math.abs((p.x - mx) * d.y - (p.y - my) * d.x));
  return {
    p: { x: mx, y: my },
    d,
    residuMax: +Math.max(...ecarts).toFixed(2),
    residuMoyen: +(ecarts.reduce((s, e) => s + e, 0) / n).toFixed(2),
    points: n,
  };
}

/**
 * Focale, en pixels, déduite de deux directions **perpendiculaires dans la
 * pièce**.
 *
 * Pour deux points de fuite v1 et v2 de directions orthogonales, et c le
 * point principal (centre de l'image) :
 *
 *     (v1 − c) · (v2 − c) = − f²
 *
 * Le produit scalaire doit donc être négatif : les deux fuites encadrent le
 * centre de l'image. S'il est positif, les deux directions relevées ne sont
 * pas perpendiculaires — ou l'une des deux est fausse. On renvoie `null`
 * plutôt qu'une racine carrée d'un nombre négatif : une focale inventée
 * contaminerait toutes les mesures qui suivent.
 */
export function focaleParOrthogonalite(vpU, vpV, largeur, hauteur) {
  const cx = largeur / 2;
  const cy = hauteur / 2;
  const produit = (vpU.x * largeur - cx) * (vpV.x * largeur - cx)
    + (vpU.y * hauteur - cy) * (vpV.y * hauteur - cy);
  if (produit >= 0) return { focalPx: null, produit: Math.round(produit), raison: 'fuites du même côté du centre — directions non perpendiculaires' };
  const focalPx = Math.sqrt(-produit);
  return {
    focalPx: Math.round(focalPx),
    produit: Math.round(produit),
    champDeg: +((2 * Math.atan(largeur / (2 * focalPx)) * 180) / Math.PI).toFixed(1),
  };
}

/**
 * Quadrilatère de plan construit à partir de la géométrie de la pièce.
 *
 * Le quatrième coin n'est pas choisi : il est **imposé** par la perspective —
 * intersection de (alongU → vpV) et de (alongV → vpU). C'est ce qui garantit
 * que le quadrilatère est l'image d'un rectangle, donc que l'homographie a un
 * sens. Un quadrilatère dont on place les quatre coins à l'œil n'est presque
 * jamais l'image d'un rectangle, et le parquet s'y pose en biais.
 *
 * Ordre attendu par le moteur : fond-gauche, fond-droite, proche-droite,
 * proche-gauche.
 */
export function quadDepuisPiece({ vpU, vpV, corner, alongU, alongV }) {
  const dir = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const fourth = intersecte(alongU, dir(alongU, vpV), alongV, dir(alongV, vpU));
  if (!fourth) throw new Error('quatrième coin indéterminé');
  const round = (p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) });
  return [round(corner), round(alongU), round(fourth), round(alongV)];
}

/* ------------------------------------------------------------------ */
/* Mesure en mètres                                                    */
/* ------------------------------------------------------------------ */

/**
 * Point du sol, en mètres, dans le repère de la caméra.
 *
 * La profondeur se lit sur l'écart à **l'horizon**, jamais sur l'écart au
 * centre de l'image : `z = f · h / (y − y_horizon)`. La confusion des deux a
 * déjà produit une pièce de 44 m pour 6 m réels — l'erreur est silencieuse,
 * elle donne des nombres d'allure raisonnable jusqu'à ce qu'on les compare.
 *
 * Un point au-dessus de l'horizon, ou trop près, n'est pas sur le sol visible :
 * on renvoie `null`.
 */
export function pointAuSol(p, { horizonY, focalPx, hauteurM, largeur, hauteur }) {
  const y = p.y * hauteur;
  const dy = y - horizonY * hauteur;
  if (dy <= 1) return null;
  const z = (focalPx * hauteurM) / dy;
  const X = ((p.x * largeur - largeur / 2) * z) / focalPx;
  return { X, z };
}

/**
 * Dimensions réelles d'un quadrilatère de sol, et les deux preuves.
 *
 * `concordance` est l'écart relatif entre les deux côtés opposés qui devraient
 * mesurer la même chose. En dessous de 1 %, le quadrilatère est bien l'image
 * d'un rectangle. Au-delà de 3 %, le relevé est à refaire : ce n'est pas du
 * bruit de mesure, c'est une droite mal placée.
 */
export function mesureQuad(quad, camera) {
  const sol = quad.map((p) => pointAuSol(p, camera));
  if (sol.some((s) => !s)) {
    return { ok: false, raison: 'un coin du quadrilatère est au-dessus de l’horizon' };
  }
  const dist = (a, b) => Math.hypot(a.X - b.X, a.z - b.z);
  // fond-gauche(0) fond-droite(1) proche-droite(2) proche-gauche(3)
  const largeurFond = dist(sol[0], sol[1]);
  const largeurProche = dist(sol[3], sol[2]);
  const profondeurDroite = dist(sol[1], sol[2]);
  const profondeurGauche = dist(sol[0], sol[3]);
  const ecart = (a, b) => +((Math.abs(a - b) / ((a + b) / 2)) * 100).toFixed(2);
  return {
    ok: true,
    width: +((largeurFond + largeurProche) / 2).toFixed(2),
    depth: +((profondeurDroite + profondeurGauche) / 2).toFixed(2),
    concordance: {
      largeurPct: ecart(largeurFond, largeurProche),
      profondeurPct: ecart(profondeurDroite, profondeurGauche),
    },
    detail: {
      largeurFond: +largeurFond.toFixed(3),
      largeurProche: +largeurProche.toFixed(3),
      profondeurDroite: +profondeurDroite.toFixed(3),
      profondeurGauche: +profondeurGauche.toFixed(3),
    },
    sol: sol.map((s) => ({ X: +s.X.toFixed(2), z: +s.z.toFixed(2) })),
  };
}

/**
 * Étendue du sol réellement visible, en mètres — la seconde preuve.
 *
 * Elle se calcule sur le contour du masque, pas sur le quadrilatère : c'est
 * elle qui doit rester la même quel que soit le rectangle de référence, et
 * c'est elle qu'on recoupe en comptant les lames dans l'image.
 */
export function etendueVisible(polygon, camera) {
  const pts = polygon.map((p) => pointAuSol(p, camera)).filter(Boolean);
  if (pts.length < 3) return null;
  const xs = pts.map((p) => p.X);
  const zs = pts.map((p) => p.z);
  return {
    largeurM: +(Math.max(...xs) - Math.min(...xs)).toFixed(2),
    profondeurM: +(Math.max(...zs) - Math.min(...zs)).toFixed(2),
    procheM: +Math.min(...zs).toFixed(2),
    loinM: +Math.max(...zs).toFixed(2),
    pointsRetenus: pts.length,
    pointsIgnores: polygon.length - pts.length,
  };
}

/* ------------------------------------------------------------------ */
/* Relevés sur l'image                                                 */
/* ------------------------------------------------------------------ */

/**
 * Direction locale des lames (ou de toute texture orientée), par le tenseur de
 * structure d'une fenêtre de l'image.
 *
 * `coherence` (rapport des valeurs propres) dit si la mesure vaut quelque
 * chose : sur une zone lisse ou bruitée elle tombe vers zéro, et il faut
 * choisir un autre point. En dessous de 0,3, ne pas s'en servir.
 */
export function orientationLocale(photo, nx, ny, radiusPx = 60) {
  const w = photo.width;
  const h = photo.height;
  const ctx = photo.getContext('2d', { willReadFrequently: true });
  const cx = Math.round(nx * w);
  const cy = Math.round(ny * h);
  const x0 = Math.max(1, cx - radiusPx);
  const y0 = Math.max(1, cy - radiusPx);
  const x1 = Math.min(w - 1, cx + radiusPx);
  const y1 = Math.min(h - 1, cy + radiusPx);
  const img = ctx.getImageData(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2).data;
  const stride = x1 - x0 + 2;
  const lum = (x, y) => {
    const p = ((y + 1) * stride + (x + 1)) * 4;
    return 0.2126 * img[p] + 0.7152 * img[p + 1] + 0.0722 * img[p + 2];
  };

  let jxx = 0;
  let jxy = 0;
  let jyy = 0;
  for (let y = 0; y < y1 - y0; y += 1) {
    for (let x = 0; x < x1 - x0; x += 1) {
      const gx = lum(x + 1, y) - lum(x - 1, y);
      const gy = lum(x, y + 1) - lum(x, y - 1);
      jxx += gx * gx;
      jxy += gx * gy;
      jyy += gy * gy;
    }
  }
  const tr = jxx + jyy;
  const det = jxx * jyy - jxy * jxy;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const coherence = l1 > 1e-6 ? (l1 - l2) / (l1 + l2) : 0;
  // Vecteur propre dominant = direction du gradient ; les joints sont à 90°.
  const gAngle = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
  const angle = ((gAngle * 180) / Math.PI + 90 + 180) % 180;
  const rad = (angle * Math.PI) / 180;
  return { angle: +angle.toFixed(2), coherence: +coherence.toFixed(3), dir: { x: Math.cos(rad), y: Math.sin(rad) } };
}

/**
 * Point de fuite de la direction des lames.
 * Trois points ou plus : médiane des intersections deux à deux, bien plus
 * robuste qu'une seule paire.
 */
export function fuiteDesLames(photo, points, radiusPx = 60) {
  const w = photo.width;
  const h = photo.height;
  const samples = points.map(([nx, ny]) => {
    const o = orientationLocale(photo, nx, ny, radiusPx);
    return { p: { x: nx * w, y: ny * h }, d: o.dir, angle: o.angle, coherence: o.coherence, at: [nx, ny] };
  });
  const hits = [];
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const q = intersecte(samples[i].p, samples[i].d, samples[j].p, samples[j].d);
      if (q) hits.push(q);
    }
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const vp = hits.length ? { x: median(hits.map((q) => q.x)), y: median(hits.map((q) => q.y)) } : null;
  return {
    samples: samples.map((s) => ({ at: s.at, angle: s.angle, coherence: s.coherence })),
    vp: vp ? { x: +(vp.x / w).toFixed(4), y: +(vp.y / h).toFixed(4) } : null,
    intersections: hits.length,
  };
}

/**
 * Pied de mur sur une colonne de l'image.
 *
 * On cherche la ligne où la couleur bascule du mur vers le sol, sur la teinte
 * (les sols en bois sont plus chauds que les murs) autant que sur la
 * luminance. Puis on remonte jusqu'au pied de la pente, car le contour doit
 * passer **sous** la plinthe : posé sur son milieu, il laisse apparaître
 * l'ancien sol dessous, ce qui saute aux yeux.
 *
 * `force` est l'amplitude du basculement. Faible, le relevé n'est pas fiable —
 * c'est le cas sur un parquet foncé très réfléchissant, où les reflets créent
 * des gradients plus forts que la jonction mur/sol.
 */
export function piedDeMur(photo, nx, y0n, y1n) {
  const width = photo.width;
  const height = photo.height;
  const data = photo.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data;
  const x = Math.round(nx * width);
  const rows = [];
  for (let y = Math.round(y0n * height); y < Math.round(y1n * height); y += 1) {
    let warm = 0;
    let luma = 0;
    for (let dx = -4; dx <= 4; dx += 1) {
      const p = (y * width + Math.min(width - 1, Math.max(0, x + dx))) * 4;
      warm += data[p] - data[p + 2];
      luma += 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
    rows.push({ y, warm: warm / 9, luma: luma / 9 });
  }
  if (rows.length < 6) return { ny: null, force: 0 };
  const score = rows.map((r, i) => {
    const a = rows[Math.max(0, i - 2)];
    const b = rows[Math.min(rows.length - 1, i + 2)];
    return (b.warm - a.warm) + (b.luma - a.luma) * 0.3;
  });
  let peak = 0;
  for (let i = 2; i < score.length - 2; i += 1) if (score[i] > score[peak]) peak = i;
  const floorLevel = score[peak] * 0.22;
  let start = peak;
  while (start > 1 && score[start - 1] > floorLevel) start -= 1;
  return { ny: +(rows[start].y / height).toFixed(4), force: +score[peak].toFixed(1) };
}

/** Relevé d'une série de colonnes, prêt à ajuster en droite. */
export function releveColonnes(photo, colonnes, y0, y1) {
  return colonnes
    .map((nx) => {
      const trouve = piedDeMur(photo, nx, y0, y1);
      return trouve.ny === null ? null : { x: nx, y: trouve.ny, force: trouve.force };
    })
    .filter(Boolean);
}
