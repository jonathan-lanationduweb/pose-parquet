export const HAUTEUR_APPAREIL = 1.4;



export const FOCALE_DEFAUT = 0.5;



export const CADRE_DEPART = [
  { x: 0.2, y: 0.6 },
  { x: 0.8, y: 0.6 },
  { x: 0.98, y: 0.69 },
  { x: 0.02, y: 0.69 },
];


export const METRES_DEFAUT = { width: 4.2, depth: 4 };

const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];



export function decouperALaPhoto(points) {
  const bords = [
    [(p) => p.x >= 0, (a, b) => ({ x: 0, y: a.y + ((b.y - a.y) * (0 - a.x)) / (b.x - a.x) })],
    [(p) => p.x <= 1, (a, b) => ({ x: 1, y: a.y + ((b.y - a.y) * (1 - a.x)) / (b.x - a.x) })],
    [(p) => p.y >= 0, (a, b) => ({ x: a.x + ((b.x - a.x) * (0 - a.y)) / (b.y - a.y), y: 0 })],
    [(p) => p.y <= 1, (a, b) => ({ x: a.x + ((b.x - a.x) * (1 - a.y)) / (b.y - a.y), y: 1 })],
  ];
  let sortie = points.map((p) => ({ x: p.x, y: p.y }));
  for (const [dedans, coupe] of bords) {
    const entree = sortie;
    sortie = [];
    entree.forEach((courant, i) => {
      const precedent = entree[(i + entree.length - 1) % entree.length];
      if (dedans(courant)) {
        if (!dedans(precedent)) sortie.push(coupe(precedent, courant));
        sortie.push(courant);
      } else if (dedans(precedent)) {
        sortie.push(coupe(precedent, courant));
      }
    });
    if (!sortie.length) return [];
  }

  const net = sortie.filter((p, i) => {
    const q = sortie[(i + sortie.length - 1) % sortie.length];
    return Math.hypot(p.x - q.x, p.y - q.y) > 1e-6;
  });
  return net.map((p) => ({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }));
}



export function contourDuCadre(cadre) {
  const [fg, fd, dd, dg] = cadre;
  const largeurFond = Math.hypot(fd.x - fg.x, fd.y - fg.y);
  const largeurDevant = Math.hypot(dd.x - dg.x, dd.y - dg.y);
  if (!(largeurDevant > largeurFond) || dd.y <= fd.y || dg.y <= fg.y) return decouperALaPhoto(cadre);
  const prolonger = (fond, devant) => {
    const dx = devant.x - fond.x;
    const dy = devant.y - fond.y;

    const t = 4 / Math.max(1e-3, Math.hypot(dx, dy));
    return { x: devant.x + dx * t, y: devant.y + dy * t };
  };
  return decouperALaPhoto([fg, fd, dd, prolonger(fd, dd), prolonger(fg, dg), dg]);
}



export function cotesParalleles(cadre, largeur = 1, hauteur = 1, seuil = 0.9) {
  const P = cadre.map((p) => [p.x * largeur, p.y * hauteur, 1]);
  const [fg, fd, dd, dg] = P;
  const fuite = croix(croix(dg, fg), croix(dd, fd));
  if (Math.abs(fuite[2]) < 1e-9 * Math.hypot(fuite[0], fuite[1])) return true;
  const yFuite = fuite[1] / fuite[2];
  const yFond = Math.min(fg[1], fd[1]);


  if (yFuite > yFond) return false;
  return (yFond - yFuite) / hauteur > seuil;
}



export function planDuCadre(cadre, largeur = 1, hauteur = 1) {
  if (!cadre || cadre.length !== 4) return null;
  const P = cadre.map((p) => [p.x * largeur, p.y * hauteur, 1]);
  const [fg, fd, dd, dg] = P;
  if (!(dd[1] > fd[1] && dg[1] > fg[1])) return null;
  const coteG = croix(dg, fg);
  const coteD = croix(dd, fd);
  const fuite = croix(coteG, coteD);
  const fond = croix(fg, fd);
  let fuiteFond;
  if (Math.abs(fuite[2]) < 1e-9 * Math.hypot(fuite[0], fuite[1])) {

    fuiteFond = [fd[0] - fg[0], fd[1] - fg[1], 0];
  } else {
    const yFuite = fuite[1] / fuite[2];

    if (!(yFuite < Math.min(fg[1], fd[1]))) return null;
    fuiteFond = croix(fond, [0, 1, -yFuite]);
  }
  const ancre = dd[1] >= dg[1] ? dd : dg;
  const devant = croix(ancre, fuiteFond);
  const coin = (cote) => {
    const q = croix(devant, cote);
    return Math.abs(q[2]) < 1e-12 ? null : { x: q[0] / q[2] / largeur, y: q[1] / q[2] / hauteur };
  };
  const pdd = coin(coteD);
  const pdg = coin(coteG);
  if (!pdd || !pdg || !Number.isFinite(pdd.x + pdd.y + pdg.x + pdg.y)) return null;

  if (pdd.y <= cadre[1].y || pdg.y <= cadre[0].y) return null;
  return [{ ...cadre[0] }, { ...cadre[1] }, pdd, pdg];
}



export function dimensionsDuCadre(cadre, largeur, hauteur, { hauteurAppareil = HAUTEUR_APPAREIL, focale = null } = {}) {
  if (!cadre || cadre.length !== 4 || !(largeur > 0) || !(hauteur > 0)) return null;
  const L = Math.max(largeur, hauteur);
  const P = cadre.map((p) => [p.x * largeur - largeur / 2, p.y * hauteur - hauteur / 2, 1]);
  const [p0, p1, p2, p3] = P;
  const fuiteProf = croix(croix(p3, p0), croix(p2, p1));
  const fuiteLarg = croix(croix(p0, p1), croix(p3, p2));
  const fini = (v) => Math.abs(v[2]) > 1e-9 && Math.hypot(v[0] / v[2], v[1] / v[2]) < 6 * L;

  const horizon = croix(fuiteProf, fuiteLarg);
  if (Math.hypot(horizon[0], horizon[1]) < 1e-9 * Math.abs(horizon[2] || 1)) return null;

  let f = focale ? focale * L : null;
  if (!f && fini(fuiteProf) && fini(fuiteLarg)) {
    const a = [fuiteProf[0] / fuiteProf[2], fuiteProf[1] / fuiteProf[2]];
    const b = [fuiteLarg[0] / fuiteLarg[2], fuiteLarg[1] / fuiteLarg[2]];
    const f2 = -(a[0] * b[0] + a[1] * b[1]);
    if (f2 > 0 && Math.sqrt(f2) >= 0.35 * L && Math.sqrt(f2) <= 2.5 * L) f = Math.sqrt(f2);
  }
  if (!f) f = FOCALE_DEFAUT * L;


  const n = [f * horizon[0], f * horizon[1], horizon[2]];
  const norme = Math.hypot(n[0], n[1], n[2]);
  const rayons = P.map((p) => [p[0] / f, p[1] / f, 1]);
  const s = rayons.map((r) => n[0] * r[0] + n[1] * r[1] + n[2] * r[2]);

  if (s.some((v) => Math.abs(v) < 1e-9) || !s.every((v) => Math.sign(v) === Math.sign(s[0]))) return null;
  const echelle = hauteurAppareil * norme;
  const X = rayons.map((r, i) => r.map((c) => (c / s[i]) * echelle));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const width = (dist(X[0], X[1]) + dist(X[3], X[2])) / 2;
  const depth = (dist(X[0], X[3]) + dist(X[1], X[2])) / 2;
  if (!(width > 0.05 && depth > 0.05 && width < 60 && depth < 60)) return null;
  return { width, depth, focale: f / L, horizon };
}
