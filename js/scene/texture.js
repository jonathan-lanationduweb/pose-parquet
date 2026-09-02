/**
 * Albedo du bois : la tuile de parquet, dessinée.
 *
 * Une référence de parquet n'est pas « une teinte » : c'est un matériau
 * complet, décrit dans data/parquets.json. Chaque entrée pilote son propre
 * veinage, ses nœuds, ses fentes, son contraste, sa largeur de lame et sa
 * finition — deux parquets ne sont donc jamais la même image recolorée.
 *
 * La tuile produite est répétable (raccord invisible) et **mesurée en mètres
 * de sol** : c'est ce qui permet au moteur de la projeter comme une surface
 * réelle, où une lame de 18 cm mesure 18 cm au premier plan comme au fond.
 *
 * Elle tient le rôle de carte d'albedo. Voir js/scene/material.js pour le
 * relief et la rugosité qui en sont dérivés, et pour la place réservée à de
 * vraies cartes photographiques.
 */
import { seeded } from '../utils/dom.js';

export const TILE = 1280;
/**
 * Côté de la tuile, en mètres de sol.
 *
 * 4,80 m et non 2,40 : c'est ce qui permet à la tuile de contenir **plusieurs
 * longueurs de lame** — trois lames de 1,60 m par rangée, vingt-cinq rangées
 * décalées. Avec une tuile de 2,40 m, une lame de 1,80 m était étirée à la
 * taille de la tuile faute de place : les joints de bout s'alignaient tous les
 * 2,40 m en une grille parfaite et le sol prenait l'aspect de grandes dalles.
 * C'était l'un des défauts les plus visibles de l'ancien rendu.
 *
 * 1280 px pour 4,80 m, soit 3,75 mm par pixel de texture : l'ordre de grandeur
 * d'un pixel d'image au premier plan d'une photo d'intérieur.
 */
export const TILE_METERS = 4.8;

/**
 * Profil d'un motif : largeur de lame, longueur, et angle pour les motifs en
 * chevron.
 *
 * Une seule largeur de lame pour les trois motifs n'a pas de sens. On ne pose
 * pas un point de Hongrie ni un bâton rompu avec des lames de 18 ou 22 cm : la
 * pose traditionnelle emploie des éléments bien plus étroits, de l'ordre de
 * 9 cm, et c'est cette finesse qui fait le motif. Utiliser la largeur des lames
 * droites produisait des chevrons de 60 cm — géométriquement corrects, mais ce
 * n'était plus ce motif-là.
 *
 * **L'angle du point de Hongrie n'est pas figé à 45°.** C'est le plus répandu,
 * mais 30° et 60° existent et changent nettement le rendu : la pointe s'allonge
 * ou s'écrase. L'angle est donc un paramètre du motif, pas une constante du
 * moteur.
 *
 * Un matériau peut décrire ses propres profils dans data/parquets.json
 * (`patternProfiles`) ; sinon on dérive des valeurs par défaut raisonnables de
 * ses dimensions de lame droite.
 */
export const DEFAULT_PROFILES = {
  lames: { width: null, length: null },
  'point-de-hongrie': { width: 0.09, length: 0.6, angleDeg: 45 },
  'baton-rompu': { width: 0.09, length: 0.45 },
};

export function patternProfile(material, pattern, widthOverride) {
  const declared = (material.patternProfiles && material.patternProfiles[pattern]) || {};
  const fallback = DEFAULT_PROFILES[pattern] || DEFAULT_PROFILES.lames;
  const width =
    widthOverride ||
    declared.width ||
    (pattern === 'lames' ? material.boardWidth : Math.min(material.boardWidth, fallback.width));
  const length =
    declared.length ||
    (pattern === 'lames' ? material.boardLength || width * 9 : fallback.length || width * 5);
  return {
    width,
    length,
    angleDeg: declared.angleDeg || fallback.angleDeg || 45,
  };
}

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c, shift = 0, warm = 0) =>
  `rgb(${clampByte(c[0] + shift + warm)},${clampByte(c[1] + shift)},${clampByte(c[2] + shift - warm)})`;

/** Divise TILE en un nombre entier de pas proche de la valeur souhaitée. */
const fit = (target) => TILE / Math.max(1, Math.round(TILE / target));

/** Somme des caractères : deux matériaux différents tirent des veinages différents. */
const seedOf = (id) => {
  let n = 17;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) % 100003;
  return n;
};

/* ------------------------------------------------------------------ */
/* Éléments de bois                                                    */
/* ------------------------------------------------------------------ */

/** Trace une strie dans la longueur de la lame, avec une légère ondulation. */
function streak(ctx, x, y, w, h, horizontal, t, wobble, random) {
  const long = horizontal ? w : h;
  const across = horizontal ? h : w;
  const a = across * t;
  const w1 = across * wobble * (random() - 0.5);
  const w2 = across * wobble * (random() - 0.5);
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x - 4, y + a);
    ctx.bezierCurveTo(x + long * 0.28, y + a + w1, x + long * 0.66, y + a + w2, x + long + 4, y + a);
  } else {
    ctx.moveTo(x + a, y - 4);
    ctx.bezierCurveTo(x + a + w1, y + long * 0.28, x + a + w2, y + long * 0.66, x + a, y + long + 4);
  }
  ctx.stroke();
}

/**
 * Veinage : fibre de fond, cernes marqués, nœuds, fentes.
 *
 * Le fond fibreux compte autant que les cernes. Une dizaine de traits nets
 * donne le *dessin* d'un bois ; c'est la densité de stries très pâles qui en
 * donne la *matière*. Sans elle, chaque lame reste un aplat dégradé — et une
 * fois projetée au sol, la surface se lit comme une image plaquée.
 */
function grain(ctx, x, y, w, h, tex, random) {
  const long = Math.max(w, h);
  const across = Math.min(w, h);
  const horizontal = w >= h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // 1. Figure : quelques bandes larges et floues. C’est l’échelle qui manque
  //    le plus à un veinage synthétique — un chêne montre des zones sombres
  //    de plusieurs centimètres, pas seulement des cheveux d’un pixel, et ce
  //    sont elles qui survivent à la réduction quand la lame s’éloigne.
  const bandes = 2 + Math.round(random() * 2);
  for (let i = 0; i < bandes; i += 1) {
    const tint = Math.round((random() - 0.5) * 10);
    const alpha = tex.grainAlpha * (0.55 + random() * 0.55);
    ctx.strokeStyle = `rgba(${clampByte(tex.grain[0] + tint)},${clampByte(tex.grain[1] + tint)},${clampByte(
      tex.grain[2] + tint
    )},${alpha.toFixed(3)})`;
    ctx.lineWidth = across * (0.14 + random() * 0.2);
    streak(ctx, x, y, w, h, horizontal, 0.1 + random() * 0.8, 0.3, random);
  }

  // 2. Fibre de fond : une strie tous les pixels environ, presque invisible
  //    une à une. C'est ce qui casse l'aplat.
  const fibres = Math.max(26, Math.round(across * 1.15));
  for (let i = 0; i < fibres; i += 1) {
    const tint = Math.round((random() - 0.5) * 11);
    const alpha = tex.grainAlpha * 0.5 * (0.3 + random());
    ctx.strokeStyle = `rgba(${clampByte(tex.grain[0] + tint)},${clampByte(tex.grain[1] + tint)},${clampByte(
      tex.grain[2] + tint
    )},${alpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(0.5, across * 0.0065 * (0.6 + random()));
    streak(ctx, x, y, w, h, horizontal, 0.015 + random() * 0.97, 0.05, random);
  }

  // 3. Cernes marqués : le dessin propre au matériau, peu nombreux.
  const lines = Math.max(2, Math.round(tex.grainLines * (0.7 + random() * 0.6)));
  for (let i = 0; i < lines; i += 1) {
    const tint = Math.round((random() - 0.5) * 16);
    const alpha = tex.grainAlpha * (0.45 + random() * 0.65);
    ctx.strokeStyle = `rgba(${clampByte(tex.grain[0] + tint)},${clampByte(tex.grain[1] + tint)},${clampByte(
      tex.grain[2] + tint
    )},${alpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, across * tex.grainWidth * (0.5 + random()));
    streak(ctx, x, y, w, h, horizontal, 0.05 + random() * 0.9, 0.14, random);
  }

  // Nœuds : cercles sombres cernés d'un halo, fréquence propre au matériau
  if (random() < tex.knots) {
    const kx = x + w * (0.15 + random() * 0.7);
    const ky = y + h * (0.2 + random() * 0.6);
    const kr = across * tex.knotSize * (0.7 + random() * 0.7);
    const halo = ctx.createRadialGradient(kx, ky, kr * 0.2, kx, ky, kr * 2.4);
    halo.addColorStop(0, `rgba(${tex.grain[0]},${tex.grain[1]},${tex.grain[2]},0.45)`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(kx, ky, kr * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${clampByte(tex.grain[0] - 26)},${clampByte(tex.grain[1] - 24)},${clampByte(
      tex.grain[2] - 20
    )},0.7)`;
    ctx.beginPath();
    ctx.ellipse(kx, ky, kr, kr * 0.72, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fentes et gerces : la signature des bois rustiques
  if (tex.cracks && random() < tex.cracks) {
    const cx = x + w * (0.1 + random() * 0.8);
    const cy = y + h * (0.15 + random() * 0.7);
    const len = long * (0.08 + random() * 0.22);
    ctx.strokeStyle = `rgba(${clampByte(tex.grain[0] - 40)},${clampByte(tex.grain[1] - 38)},${clampByte(
      tex.grain[2] - 34
    )},0.5)`;
    ctx.lineWidth = Math.max(0.6, across * 0.012);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + len, cy + across * 0.04 * (random() - 0.5));
    } else {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + across * 0.04 * (random() - 0.5), cy + len);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Une lame : teinte propre, dégradé longitudinal, veinage, chanfrein, joints.
 *
 * Deux réglages comptent plus que les autres pour l'aspect final :
 *
 * - la **dispersion de teinte** entre lames voisines. Trop forte, le sol se
 *   lit en patchwork : on voit des cases claires et sombres avant de voir un
 *   parquet. Un vrai lot de pose est bien plus homogène que ça.
 * - la **différence entre joint latéral et joint de bout**. Les traiter à
 *   égalité dessine une grille régulière, et c'est le défaut qui trahit le
 *   plus sûrement une texture synthétique : sur un parquet posé, les joints
 *   de bout se remarquent à peine.
 */
function board(ctx, x, y, w, h, tex, random) {
  const shift = Math.round((random() - 0.5) * tex.spread);
  const warm = Math.round((random() - 0.5) * tex.warm);
  const horizontal = w >= h;

  ctx.save();
  const gradient = horizontal
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  const amp = 5 * tex.contrast;
  gradient.addColorStop(0, rgb(tex.base, shift - amp, warm));
  gradient.addColorStop(0.45, rgb(tex.base, shift + amp * 0.55, warm));
  gradient.addColorStop(1, rgb(tex.base, shift - amp * 0.7, warm));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  grain(ctx, x, y, w, h, tex, random);

  // Reflet de finition : léger, dans la longueur de la lame
  if (tex.sheen > 0.01) {
    const sheen = horizontal
      ? ctx.createLinearGradient(x, y, x, y + h)
      : ctx.createLinearGradient(x, y, x + w, y);
    sheen.addColorStop(0, `rgba(255,255,255,${(tex.sheen * 0.9).toFixed(3)})`);
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, `rgba(0,0,0,${(tex.sheen * 0.35).toFixed(3)})`);
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);
  }

  // Chanfrein : seulement sur les longs côtés, là où il existe vraiment
  const bevel = Math.max(0.7, Math.min(w, h) * tex.bevel);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  if (horizontal) ctx.fillRect(x, y, w, bevel);
  else ctx.fillRect(x, y, bevel, h);
  ctx.fillStyle = 'rgba(34,23,14,0.17)';
  if (horizontal) ctx.fillRect(x, y + h - bevel, w, bevel);
  else ctx.fillRect(x + w - bevel, y, bevel, h);

  // Joints : les longs côtés se voient, les joints de bout beaucoup moins.
  // Le facteur 0,6 vient de la comparaison avec les photos : un joint de
  // parquet posé est une ombre fine, pas un trait dessiné.
  const lw = Math.max(0.7, Math.min(w, h) * 0.016);
  ctx.lineWidth = lw;
  const longSides = () => {
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x, y + 0.4); ctx.lineTo(x + w, y + 0.4);
      ctx.moveTo(x, y + h - 0.4); ctx.lineTo(x + w, y + h - 0.4);
    } else {
      ctx.moveTo(x + 0.4, y); ctx.lineTo(x + 0.4, y + h);
      ctx.moveTo(x + w - 0.4, y); ctx.lineTo(x + w - 0.4, y + h);
    }
    ctx.stroke();
  };
  const buttSides = () => {
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x + 0.4, y); ctx.lineTo(x + 0.4, y + h);
      ctx.moveTo(x + w - 0.4, y); ctx.lineTo(x + w - 0.4, y + h);
    } else {
      ctx.moveTo(x, y + 0.4); ctx.lineTo(x + w, y + 0.4);
      ctx.moveTo(x, y + h - 0.4); ctx.lineTo(x + w, y + h - 0.4);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = `rgba(38,26,16,${(tex.joint * 0.6).toFixed(3)})`;
  longSides();
  ctx.strokeStyle = `rgba(38,26,16,${(tex.joint * 0.17).toFixed(3)})`;
  buttSides();
  ctx.restore();
}

/**
 * Dessine une forme et ses répliques décalées d'une tuile (raccord).
 * La boîte englobante permet d'ignorer les huit copies invisibles : seules
 * les formes qui touchent un bord en ont réellement besoin.
 */
function wrapped(ctx, draw, box) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (box) {
        const x = box.x + dx * TILE;
        const y = box.y + dy * TILE;
        if (x + box.w <= 0 || x >= TILE || y + box.h <= 0 || y >= TILE) continue;
      }
      ctx.save();
      ctx.translate(dx * TILE, dy * TILE);
      draw();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Motifs                                                              */
/* ------------------------------------------------------------------ */

function drawStraight(ctx, tex, profile, random) {
  const h = fit((profile.width / TILE_METERS) * TILE);
  const w = fit(Math.min(TILE, (profile.length / TILE_METERS) * TILE));
  const rows = Math.round(TILE / h);
  const cols = Math.round(TILE / w);

  for (let r = 0; r < rows; r += 1) {
    // Décalage variable : évite l'effet d'escalier trop régulier
    const offset = (((r % 3) + (r % 5) * 0.13) * w) / 3;
    for (let c = -1; c <= cols; c += 1) {
      const x = c * w + offset;
      const y = r * h;
      wrapped(ctx, () => board(ctx, x, y, w, h, tex, random), { x, y, w, h });
    }
  }
}

function drawHerringbone(ctx, tex, profile, random) {
  const w = fit((profile.width / TILE_METERS) * TILE);
  // Longueur réelle de l'élément, arrondie à un multiple de la largeur : c'est
  // la condition pour que le motif se referme sur lui-même.
  const l = w * Math.max(2, Math.round(profile.length / profile.width));
  const steps = Math.ceil((TILE * 1.6) / w) + 2;

  ctx.save();
  ctx.translate(TILE / 2, TILE / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-TILE / 2, -TILE / 2);
  for (let i = -steps; i <= steps; i += 1) {
    for (let j = -steps; j <= steps; j += 1) {
      const ox = TILE / 2 + i * l + j * w;
      const oy = TILE / 2 + i * l - j * w;
      // Le repère est tourné de 45° : on écarte largement, mais pas tout le plan
      if (ox < -l * 1.5 || ox > TILE + l * 1.5 || oy < -l * 1.5 || oy > TILE + l * 1.5) continue;
      board(ctx, ox, oy, l, w, tex, random);
      board(ctx, ox + l, oy, w, l, tex, random);
    }
  }
  ctx.restore();
}

/**
 * Point de Hongrie : deux arêtes de lames coupées en biais qui se rejoignent en
 * pointe, colonne après colonne.
 *
 * L'angle est un **paramètre**, pas une constante. Il se mesure entre la lame
 * et l'axe de la pose : 45° donne la pointe droite classique, 30° une pointe
 * allongée et nervurée, 60° une pointe écrasée et large. Les trois existent
 * dans le commerce, et le rendu n'a rien à voir.
 *
 * Géométrie : pour une lame de longueur L inclinée de θ par rapport à l'axe
 * vertical, son emprise vaut L·sin θ en largeur et L·cos θ en hauteur ; deux
 * lames voisines d'une même arête sont décalées de w / sin θ le long de l'axe.
 * On arrondit ensuite le pas à un diviseur entier de la tuile, sans quoi le
 * motif ne se refermerait pas sur lui-même.
 */
function drawChevron(ctx, tex, profile, random) {
  const w = fit((profile.width / TILE_METERS) * TILE);
  const rad = (Math.min(75, Math.max(15, profile.angleDeg)) * Math.PI) / 180;
  const length = (profile.length / TILE_METERS) * TILE;
  const armX = length * Math.sin(rad);
  const armY = length * Math.cos(rad);
  // Décalage vertical entre deux lames d'une même arête, ajusté pour que la
  // tuile se referme.
  const step = fit(w / Math.sin(rad));
  const cols = Math.ceil(TILE / (armX * 2)) + 2;
  const rows = Math.ceil((TILE + armY) / step) + 2;

  /** Une lame, en parallélogramme : le biais est porté par armX / armY. */
  const plank = (x0, y0, dir) => {
    const shift = Math.round((random() - 0.5) * tex.spread);
    const warm = Math.round((random() - 0.5) * tex.warm);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dir * armX, y0 + armY);
    ctx.lineTo(x0 + dir * armX, y0 + armY + step);
    ctx.lineTo(x0, y0 + step);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(x0, y0, x0 + dir * armX, y0 + armY);
    const amp = 5 * tex.contrast;
    gradient.addColorStop(0, rgb(tex.base, shift - amp, warm));
    gradient.addColorStop(0.5, rgb(tex.base, shift + amp * 0.5, warm));
    gradient.addColorStop(1, rgb(tex.base, shift - amp * 0.6, warm));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Le veinage suit la lame : on l'étale le long de l'arête, pas de l'écran.
    grain(ctx, x0 - armX, y0, armX * 2.2, step, tex, random);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x0 - armX, y0, armX * 2.2, Math.max(0.8, w * tex.bevel * 1.5));
    ctx.restore();
    ctx.strokeStyle = `rgba(38,26,16,${tex.joint})`;
    ctx.lineWidth = Math.max(0.7, w * 0.022);
    ctx.stroke();
    ctx.restore();
  };

  for (let c = -1; c <= cols; c += 1) {
    for (let r = -2; r <= rows; r += 1) {
      const x0 = c * armX * 2;
      const y0 = r * step - armY;
      wrapped(
        ctx,
        () => {
          plank(x0, y0, 1);
          plank(x0 + armX * 2, y0, -1);
        },
        { x: x0 - armX, y: y0, w: armX * 3, h: armY + step }
      );
    }
  }
}

/**
 * Grain fin appliqué à toute la tuile : casse l'aspect « image de synthèse ».
 * On dessine une petite nappe de bruit fabriquée une seule fois, répétée en
 * mosaïque — cent fois plus rapide qu'un parcours pixel par pixel, pour un
 * résultat visuellement identique à cette échelle.
 */
let noiseTile = null;
function noise() {
  if (noiseTile) return noiseTile;
  const size = 128;
  noiseTile = document.createElement('canvas');
  noiseTile.width = size;
  noiseTile.height = size;
  const ctx = noiseTile.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const random = seeded(9173);
  for (let i = 0; i < data.length; i += 4) {
    const value = random() < 0.5 ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = Math.round(random() * 26);
  }
  ctx.putImageData(image, 0, 0);
  return noiseTile;
}

function filmGrain(ctx, w, h, amount) {
  const tile = noise();
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, amount / 12);
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Tuile répétable pour un matériau et un motif donnés.
 * @param {object} material entrée de data/parquets.json
 * @param {object} o
 * @param {string} o.pattern    lames | point-de-hongrie | baton-rompu
 * @param {number} [o.width]    largeur de lame en m (défaut : celle du matériau)
 * @returns {HTMLCanvasElement}
 */
export function buildTexture(material, { pattern = 'lames', width, size = TILE } = {}) {
  const tex = material.texture;
  const profile = patternProfile(material, pattern, width);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const random = seeded(seedOf(material.id) + Math.round(profile.width * 1000));

  // Tout est dessiné dans le repère de la tuile pleine : une taille réduite
  // sert aux aperçus (16 fois moins de pixels, même dessin).
  if (size !== TILE) ctx.scale(size / TILE, size / TILE);
  ctx.fillStyle = rgb(tex.grain, -14);
  ctx.fillRect(0, 0, TILE, TILE);

  if (pattern === 'point-de-hongrie') drawChevron(ctx, tex, profile, random);
  else if (pattern === 'baton-rompu') drawHerringbone(ctx, tex, profile, random);
  else drawStraight(ctx, tex, profile, random);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  filmGrain(ctx, size, size, 6);
  return canvas;
}

/**
 * Pyramide de réductions : supprime le moirage sur les lames lointaines.
 *
 * Un seul getImageData (le niveau 0), puis des moyennes de quatre pixels en
 * tableaux typés. Lire le canevas est de loin l'opération la plus coûteuse :
 * on ne la fait qu'une fois.
 */
export function buildMips(base, levels = 5) {
  const size0 = base.width;
  const data0 = base.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, size0, size0).data;
  const mips = [{ size: size0, data: data0 }];

  let previous = data0;
  let previousSize = size0;
  for (let level = 1; level < levels; level += 1) {
    const size = previousSize >> 1;
    if (size < 8) break;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      const row0 = (y * 2) * previousSize;
      const row1 = (y * 2 + 1) * previousSize;
      for (let x = 0; x < size; x += 1) {
        const a = (row0 + x * 2) * 4;
        const b = a + 4;
        const c = (row1 + x * 2) * 4;
        const d = c + 4;
        const out = (y * size + x) * 4;
        data[out] = (previous[a] + previous[b] + previous[c] + previous[d]) >> 2;
        data[out + 1] = (previous[a + 1] + previous[b + 1] + previous[c + 1] + previous[d + 1]) >> 2;
        data[out + 2] = (previous[a + 2] + previous[b + 2] + previous[c + 2] + previous[d + 2]) >> 2;
        data[out + 3] = 255;
      }
    }
    mips.push({ size, data });
    previous = data;
    previousSize = size;
  }
  return mips;
}

/**
 * Échantillon de catalogue : quelques lames vues de dessus, à l'échelle d'une
 * vignette. C'est le même moteur que le rendu, donc ce que l'on voit dans la
 * carte est bien ce que l'on obtient au sol.
 */
export function buildSwatch(material, { width = 260, height = 320, boards = 4 } = {}) {
  const tex = material.texture;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const random = seeded(seedOf(material.id) + 7);

  ctx.fillStyle = rgb(tex.grain, -14);
  ctx.fillRect(0, 0, width, height);

  // La largeur de lame réelle se lit dans la vignette : une lame de 22 cm
  // occupe visiblement plus de place qu'une lame de 14 cm.
  const reference = 0.18;
  const count = Math.max(2, Math.round(boards * (reference / material.boardWidth)));
  const bw = width / count;
  // Deux lames et demie dans la hauteur : assez pour lire le veinage, les
  // joints et les têtes de lame sans que la vignette devienne une mosaïque.
  const bh = height / 2.4;

  for (let c = -1; c <= count; c += 1) {
    const offset = ((c % 3) * bh) / 2.6;
    for (let r = -1; r * bh < height + bh; r += 1) {
      board(ctx, c * bw, r * bh + offset, bw, bh, tex, random);
    }
  }
  filmGrain(ctx, width, height, 5);
  return canvas;
}
