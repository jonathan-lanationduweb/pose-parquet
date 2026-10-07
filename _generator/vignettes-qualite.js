/**
 * Qualité des vignettes Premibel : placeholders, bandeaux, photos partagées.
 *
 * Partagé par la synchronisation (qui écarte ce qui ne doit pas s'afficher)
 * et par `check-catalogue-premibel.js` (qui vérifie et classe). Une seule
 * règle, deux lecteurs.
 *
 * ## Même photo
 *
 * Deux vignettes sont « la même photo » quand leur empreinte (dHash 256 bits,
 * `vignette-empreintes.py`) diffère de 10 bits au plus ET que leur couleur
 * moyenne reste à 6 niveaux près. Calé sur le catalogue du 05/10/2026 contre
 * un écart de pixels réel : les paires identiques montent à 9 bits et 4,2
 * niveaux ; la première paire NON identique (même scène, sol recoloré :
 * CHEN39271 / CHEN39374) est à 7 bits mais 9,5 niveaux. Sans la couleur,
 * deux produits de teintes différentes photographiés dans le même décor
 * passeraient pour une seule photo.
 *
 * ## Une photo partagée n'est pas un bug
 *
 * Les variantes de longueur d'un même produit partagent légitimement leur
 * photo. Le classement distingue :
 *
 *   PLACEHOLDER  visuel « image indisponible » : jamais affiché comme photo.
 *   INCORRECT    motifs incompatibles ou essences différentes sur une même
 *                photo, qui ne montre qu'un seul des deux — erreur.
 *   DOUTEUX      teintes éloignées, ou noms commerciaux différents : la photo
 *                ne représente pas sûrement chaque référence — avertissement.
 *   LÉGITIME     même produit décliné (longueurs, conditionnements).
 */

/** Visuels « image indisponible » connus, par empreinte. */
const PLACEHOLDERS = {
  '115f3ca53ee2049b0a650b2c0b2120f8188458c41a41b5335294369096938d49': 'visuel Premibel « image produit indisponible » (gescomo-no-image)',
};
/** Un nom de fichier source qui dit lui-même qu'il n'y a pas d'image. */
const NOM_PLACEHOLDER = /no[-_]?image|placeholder|image[-_]?indisponible|indisponible|default[-_]?image|woocommerce-placeholder/i;

/**
 * Photos qui affichent un prix ou une offre de lot (« PRIX POUR LE LOT DE
 * 43.36 M² ») : relevées à l'œil le 05/10/2026 — aucun prix ni promotion ne
 * s'affiche sur pose-parquet.com. Liées au FICHIER source : si Premibel change
 * la photo, l'exclusion tombe d'elle-même et la nouvelle photo est montrée.
 */
const BANDEAUX = {
  CHENF2689: { fichier: 'CHENF2689-19b130745504-324x324.jpg', raison: 'bandeau « prix pour le lot » sur la photo' },
  CHENF231: { fichier: 'CHENF231-8e3b5e8f134b-324x324.jpg', raison: 'bandeau « prix pour le lot » sur la photo' },
  517729: { fichier: '517729.jpg', raison: 'bandeau « le lot de … m² » sur la photo' },
};

/** Au-delà, une même photo sert de visuel générique. */
const REUTILISATION_MASSIVE = 8;

const bits = (hex) => BigInt(`0x${hex}`);
function distance(a, b) {
  let x = bits(a) ^ bits(b);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}
function memePhoto(a, b) {
  if (!a || !b || !a.empreinte || !b.empreinte) return false;
  const ecart = Math.max(...a.couleur.map((c, i) => Math.abs(c - b.couleur[i])));
  return distance(a.empreinte, b.empreinte) <= 10 && ecart <= 6;
}

/** La vignette d'une fiche est-elle à écarter ? Renvoie la raison, ou null. */
function vignetteEcartee(sku, entree) {
  if (!entree) return null;
  const fichier = String(entree.source || '').split('/').pop();
  if (NOM_PLACEHOLDER.test(fichier)) return { type: 'placeholder', raison: `fichier source « ${fichier} »` };
  for (const [h, raison] of Object.entries(PLACEHOLDERS)) {
    if (entree.empreinte && distance(entree.empreinte, h) <= 10) return { type: 'placeholder', raison };
  }
  const b = BANDEAUX[sku];
  if (b && b.fichier === fichier) return { type: 'bandeau-commercial', raison: b.raison };
  return null;
}

/** Groupes de SKU partageant la même photo (union des paires). */
function groupesPhotos(skus, index) {
  const parent = new Map(skus.map((s) => [s, s]));
  const racine = (s) => { while (parent.get(s) !== s) { parent.set(s, parent.get(parent.get(s))); s = parent.get(s); } return s; };
  for (let i = 0; i < skus.length; i += 1) {
    for (let j = i + 1; j < skus.length; j += 1) {
      if (memePhoto(index[skus[i]], index[skus[j]])) parent.set(racine(skus[i]), racine(skus[j]));
    }
  }
  const g = new Map();
  skus.forEach((s) => { const r = racine(s); g.set(r, [...(g.get(r) || []), s]); });
  return [...g.values()].filter((x) => x.length > 1).map((x) => x.sort()).sort((a, b) => b.length - a.length);
}

const TEINTES = { clair: 0, naturel: 1, chaud: 2, fonce: 3 };
/** Le nom commercial sans dimensions ni finition : ce qui désigne le PRODUIT. */
function nomBase(nom) {
  return String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'´`]/g, ' ').split(/[^a-z0-9]+/)
    .filter((m) => m && !/\d/.test(m) && !['verni', 'vernis', 'huile', 'mat', 'brosse', 'satine', 'l', 'mm', 'x', 'fixe', 'chanfreins', 'chene', 'massif', 'go', 'pr', 'bis', 'certifie', 'fsc'].includes(m))
    .join(' ');
}

/**
 * Classe un groupe de fiches qui partagent une photo.
 * @returns {{classe: string, gravite: 'error'|'warning'|'info', raisons: string[]}}
 */
function classerGroupe(fiches, ecartees = new Set()) {
  const raisons = [];
  if (fiches.some((f) => ecartees.has(f.sku))) return { classe: 'PLACEHOLDER', gravite: 'info', raisons: ['visuel « image indisponible » : écarté, repli graphique'] };

  const essences = new Set(fiches.map((f) => (f.species || '').toLowerCase()).filter(Boolean));
  if (essences.size > 1) raisons.push(`essences différentes : ${[...essences].join(' / ')}`);
  const posables = fiches.filter((f) => (f.compatiblePatterns || []).length);
  const incompatibles = posables.some((a) => posables.some((b) => !a.compatiblePatterns.some((m) => b.compatiblePatterns.includes(m))));
  if (incompatibles) raisons.push(`motifs incompatibles : ${[...new Set(posables.map((f) => f.defaultPattern))].join(' / ')}`);
  if (raisons.length) return { classe: 'INCORRECT', gravite: 'error', raisons };

  const t = fiches.map((f) => TEINTES[f.tone]).filter((x) => x !== undefined);
  if (t.length > 1 && Math.max(...t) - Math.min(...t) >= 2) raisons.push(`teintes éloignées : ${[...new Set(fiches.map((f) => f.tone).filter(Boolean))].join(' / ')}`);
  const bases = [...new Set(fiches.map((f) => nomBase(f.name)))];
  const memeProduit = bases.every((a) => bases.every((b) => a.includes(b) || b.includes(a)));
  if (!memeProduit) raisons.push(`noms commerciaux différents : ${bases.slice(0, 4).join(' | ')}`);
  if (fiches.length >= REUTILISATION_MASSIVE) raisons.push(`photo réutilisée sur ${fiches.length} références`);
  if (raisons.length) return { classe: 'DOUTEUX', gravite: 'warning', raisons };

  const tonsVoisins = new Set(fiches.map((f) => f.tone).filter(Boolean));
  return { classe: 'LÉGITIME', gravite: 'info', raisons: [tonsVoisins.size > 1 ? `variantes d'un même produit (teintes voisines au catalogue : ${[...tonsVoisins].join(' / ')})` : "variantes d'un même produit"] };
}

module.exports = { PLACEHOLDERS, BANDEAUX, NOM_PLACEHOLDER, REUTILISATION_MASSIVE, memePhoto, distance, vignetteEcartee, groupesPhotos, classerGroupe, nomBase };
