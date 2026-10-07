/**
 * Photo importée : du cadre posé par le visiteur à un sol crédible.
 *
 * Le 06/10/2026, le mode photo rendait un parquet « plaqué » : une nappe aux
 * lames presque toutes de la même taille, posée sur la moitié basse de la
 * photo. Trois causes, toutes géométriques, et aucune n'est réglable par des
 * coefficients de couleur :
 *
 * 1. LE CADRE SERVAIT À DEUX CHOSES. Ses quatre coins donnaient la fuite du
 *    parquet ET la zone peinte. Pour couvrir le sol jusqu'au bas de la photo,
 *    on tirait donc les coins de devant aux coins de l'image : les côtés
 *    devenaient presque parallèles (largeur du fond = 88 % de celle de devant
 *    dans le cadre par défaut) et la perspective disparaissait. Dans une vraie
 *    photo de pièce, prise debout, le fond est trois à quatre fois plus étroit
 *    que le premier plan — mesuré sur les quinze pièces calibrées à la main.
 *    Désormais les poignées ne donnent que la FUITE ; la zone peinte prolonge
 *    les côtés jusqu'au bord de la photo (`contourDuCadre`).
 *
 * 2. LES DIMENSIONS ÉTAIENT FIXES. Le plan valait 4,20 × 4 m quel que soit le
 *    cadre posé : un cadre étroit rapetissait les lames, un cadre plat les
 *    étirait en profondeur. Elles sont maintenant lues dans la photo par un
 *    modèle de caméra (`dimensionsDuCadre`) : hauteur d'appareil tenu debout,
 *    focale tirée des deux points de fuite quand ils existent, d'un objectif
 *    de téléphone sinon.
 *
 * 3. LE CADRE DE DÉPART ÉTAIT FRONTAL. Il est remplacé par un cadre en
 *    perspective, entièrement dans l'image (`CADRE_DEPART`).
 *
 * Module pur : aucune dépendance au DOM, testé par _generator/check-photo.js.
 */

/** Hauteur de l'appareil au-dessus du sol : une photo prise debout, à hauteur de poitrine. */
export const HAUTEUR_APPAREIL = 1.4;

/**
 * Focale par défaut, en fraction du grand côté (environ 90° sur la largeur).
 * Ne sert que si la photo ne donne pas deux points de fuite exploitables.
 *
 * Mesurée, pas supposée : sur les six pièces calibrées où la photo donne deux
 * points de fuite, la focale retrouvée va de 0,39 à 0,80 (médiane 0,45) — les
 * photos de pièce se prennent au grand-angle. Avec 0,72 (objectif principal
 * d'un téléphone), la profondeur des pièces en fuite centrale sortait deux
 * fois trop longue : les lames s'étiraient vers le fond.
 */
export const FOCALE_DEFAUT = 0.5;

/**
 * Cadre de départ : deux poignées au pied d'un mur du fond, deux sur le pied
 * des murs de côté, là où ils sortent de la photo. Les côtés fuient vers un
 * horizon à 45 % de la hauteur — la moyenne des pièces calibrées (0,46 à
 * 0,50). Entièrement dans l'image : une poignée hors champ ne se saisit pas
 * au doigt.
 */
export const CADRE_DEPART = [
  { x: 0.2, y: 0.6 },
  { x: 0.8, y: 0.6 },
  { x: 0.98, y: 0.69 },
  { x: 0.02, y: 0.69 },
];

/** Dimensions de repli, celles de l'ancien plan fixe. */
export const METRES_DEFAUT = { width: 4.2, depth: 4 };

const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Coupe un polygone au rectangle de la photo, [0, 1]² (Sutherland–Hodgman).
 * Le contour qu'on donne à éditer n'a ainsi que des points visibles.
 */
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
  // Points confondus (un coin posé pile sur le bord) : on les fusionne.
  const net = sortie.filter((p, i) => {
    const q = sortie[(i + sortie.length - 1) % sortie.length];
    return Math.hypot(p.x - q.x, p.y - q.y) > 1e-6;
  });
  return net.map((p) => ({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }));
}

/**
 * Zone peinte pour le sol principal d'une photo : le cadre, dont les deux
 * côtés sont prolongés au-delà des poignées de devant jusqu'à sortir de la
 * photo, puis coupé à l'image.
 *
 * Un sol photographié debout continue jusqu'au bas de l'image : on n'a donc
 * pas à poser les poignées de devant aux coins de la photo — c'est ce geste
 * qui aplatissait la perspective. Si les côtés se resserrent vers l'avant
 * (cadre retourné, couloir vu de face), rien n'est prolongé.
 */
export function contourDuCadre(cadre) {
  const [fg, fd, dd, dg] = cadre;
  const largeurFond = Math.hypot(fd.x - fg.x, fd.y - fg.y);
  const largeurDevant = Math.hypot(dd.x - dg.x, dd.y - dg.y);
  if (!(largeurDevant > largeurFond) || dd.y <= fd.y || dg.y <= fg.y) return decouperALaPhoto(cadre);
  const prolonger = (fond, devant) => {
    const dx = devant.x - fond.x;
    const dy = devant.y - fond.y;
    // Assez loin pour sortir de [0, 1]² quelle que soit la pente.
    const t = 4 / Math.max(1e-3, Math.hypot(dx, dy));
    return { x: devant.x + dx * t, y: devant.y + dy * t };
  };
  return decouperALaPhoto([fg, fd, dd, prolonger(fd, dd), prolonger(fg, dg), dg]);
}

/**
 * Les deux côtés du cadre sont-ils presque parallèles ? C'est le signe d'un
 * cadre posé « aux coins de la photo » plutôt que sur les lignes du sol : la
 * pièce paraîtra plate.
 *
 * L'angle entre les côtés ne suffit pas (un cadre tiré aux quatre coins d'une
 * photo large garde 20° d'écart). Ce qui compte, c'est OÙ ils se rejoignent :
 * dans une photo de pièce prise debout, à l'horizon, à 0,1–0,3 hauteur de
 * photo au-dessus du fond (pièces calibrées) ; pour un cadre plat, très
 * au-dessus de la photo (3,7 hauteurs pour l'ancien cadre de départ). Calculé
 * en pixels : une photo en portrait déformerait la pente.
 */
export function cotesParalleles(cadre, largeur = 1, hauteur = 1, seuil = 0.9) {
  const P = cadre.map((p) => [p.x * largeur, p.y * hauteur, 1]);
  const [fg, fd, dd, dg] = P;
  const fuite = croix(croix(dg, fg), croix(dd, fd));
  if (Math.abs(fuite[2]) < 1e-9 * Math.hypot(fuite[0], fuite[1])) return true;
  const yFuite = fuite[1] / fuite[2];
  const yFond = Math.min(fg[1], fd[1]);
  // Côtés qui se rejoignent vers l'avant : ce n'est pas « plat », c'est un
  // cadre retourné — Terminer le signale déjà.
  if (yFuite > yFond) return false;
  return (yFond - yFuite) / hauteur > seuil;
}

/**
 * Le rectangle de sol que désignent les poignées.
 *
 * Les poignées du bas se posent n'importe où le long du pied des murs de
 * côté : seules les DROITES qu'elles dessinent avec celles du fond comptent.
 * Prises telles quelles comme quatrième et troisième coins, elles donnaient
 * un « devant » qui n'est pas parallèle au fond — un trapèze qui ne
 * représente aucun rectangle au sol : lames cisaillées, dimensions absurdes
 * (34,8 m de large mesurés sur le salon en angle, 6,42 m calibrés à la main).
 *
 * On reconstruit donc le devant : la droite qui passe par la poignée du bas la
 * plus basse et par le point de fuite du fond — sur l'horizon, que les deux
 * côtés désignent en se croisant. L'appareil est supposé tenu droit (horizon
 * horizontal) : c'est le cas de presque toutes les photos de pièce, et c'est
 * la seule hypothèse qui ne demande rien de plus au visiteur.
 *
 * @returns {{x:number,y:number}[]|null} le quadrilatère du plan, en fractions
 *          de la photo (ses coins de devant peuvent en sortir), ou `null` si
 *          les poignées ne décrivent pas un sol vu d'en haut.
 */
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
    // Côtés parallèles : pas d'horizon fini. Le devant reste parallèle au fond.
    fuiteFond = [fd[0] - fg[0], fd[1] - fg[1], 0];
  } else {
    const yFuite = fuite[1] / fuite[2];
    // Les côtés doivent se rejoindre AU-DESSUS du fond, vers l'horizon.
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
  // Un devant qui remonterait au-dessus du fond : cadre retourné, on renonce.
  if (pdd.y <= cadre[1].y || pdg.y <= cadre[0].y) return null;
  return [{ ...cadre[0] }, { ...cadre[1] }, pdd, pdg];
}

/**
 * Dimensions réelles du rectangle de sol que décrit le cadre, en mètres.
 *
 * Modèle de caméra sténopé, centre optique au centre de la photo :
 *
 *   - les deux côtés se coupent au point de fuite de la profondeur, le fond et
 *     le devant à celui de la largeur (souvent à l'infini : fond horizontal) ;
 *   - la droite qui joint ces deux points est l'horizon, d'où l'inclinaison
 *     du sol vu par l'appareil ;
 *   - la focale vient des deux points de fuite quand ils sont finis et
 *     cohérents (`f² = −v₁·v₂`), sinon d'un objectif de téléphone ;
 *   - l'échelle, de la hauteur de l'appareil.
 *
 * Renvoie `null` si le cadre ne décrit pas un sol vu d'en haut (un coin
 * au-dessus de l'horizon, côtés parallèles ET fond parallèle au devant) :
 * l'appelant garde alors les dimensions qu'il avait.
 *
 * @returns {{width:number, depth:number, focale:number, horizon:number[]}|null}
 */
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

  // Normale du sol, repère caméra : n ∝ Kᵀ · horizon.
  const n = [f * horizon[0], f * horizon[1], horizon[2]];
  const norme = Math.hypot(n[0], n[1], n[2]);
  const rayons = P.map((p) => [p[0] / f, p[1] / f, 1]);
  const s = rayons.map((r) => n[0] * r[0] + n[1] * r[1] + n[2] * r[2]);
  // Tous les coins du même côté de l'horizon, et pas sur lui.
  if (s.some((v) => Math.abs(v) < 1e-9) || !s.every((v) => Math.sign(v) === Math.sign(s[0]))) return null;
  const echelle = hauteurAppareil * norme;
  const X = rayons.map((r, i) => r.map((c) => (c / s[i]) * echelle));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const width = (dist(X[0], X[1]) + dist(X[3], X[2])) / 2;
  const depth = (dist(X[0], X[3]) + dist(X[1], X[2])) / 2;
  if (!(width > 0.05 && depth > 0.05 && width < 60 && depth < 60)) return null;
  return { width, depth, focale: f / L, horizon };
}
