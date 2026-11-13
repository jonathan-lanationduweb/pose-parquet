export function intersecte(p1, d1, p2, d2) {
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}



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



export function quadDepuisPiece({ vpU, vpV, corner, alongU, alongV }) {
  const dir = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  const fourth = intersecte(alongU, dir(alongU, vpV), alongV, dir(alongV, vpU));
  if (!fourth) throw new Error('quatrième coin indéterminé');
  const round = (p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) });
  return [round(corner), round(alongU), round(fourth), round(alongV)];
}







export function pointAuSol(p, { horizonY, focalPx, hauteurM, largeur, hauteur }) {
  const y = p.y * hauteur;
  const dy = y - horizonY * hauteur;
  if (dy <= 1) return null;
  const z = (focalPx * hauteurM) / dy;
  const X = ((p.x * largeur - largeur / 2) * z) / focalPx;
  return { X, z };
}



export function mesureQuad(quad, camera) {
  const sol = quad.map((p) => pointAuSol(p, camera));
  if (sol.some((s) => !s)) {
    return { ok: false, raison: 'un coin du quadrilatère est au-dessus de l’horizon' };
  }
  const dist = (a, b) => Math.hypot(a.X - b.X, a.z - b.z);

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

  const gAngle = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
  const angle = ((gAngle * 180) / Math.PI + 90 + 180) % 180;
  const rad = (angle * Math.PI) / 180;
  return { angle: +angle.toFixed(2), coherence: +coherence.toFixed(3), dir: { x: Math.cos(rad), y: Math.sin(rad) } };
}



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


export function releveColonnes(photo, colonnes, y0, y1) {
  return colonnes
    .map((nx) => {
      const trouve = piedDeMur(photo, nx, y0, y1);
      return trouve.ny === null ? null : { x: nx, y: trouve.ny, force: trouve.force };
    })
    .filter(Boolean);
}
