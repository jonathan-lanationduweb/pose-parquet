/**
 * Couche PRODUIT : la fiche commerciale d'une référence de parquet.
 *
 * Quatre choses sont distinctes dans ce moteur, et les confondre est
 * exactement ce qui empêche d'y brancher un vrai catalogue :
 *
 *   A. la SCÈNE         — la pièce, sa géométrie, son éclairement
 *                         (js/scene/schema.js, data/scenes/)
 *   B. le MOTIF de pose — lames droites, point de Hongrie, bâton rompu
 *                         (data/parquets.json → `patterns`)
 *   C. le PRODUIT       — la référence vendue : essence, gamme, teinte,
 *                         finition, dimensions, motifs autorisés
 *                         (ce fichier)
 *   D. le RENDU matière — les paramètres visuels qui dessinent la tuile
 *                         (data/render-families.json, js/scene/texture.js)
 *
 * Un export Premibel fournira **C**. Il ne fournira jamais **D** : personne ne
 * saisit un `grainAlpha` dans un ERP. D'où la notion de **famille de rendu** —
 * le produit déclare à quelle famille visuelle il appartient, et la famille
 * porte les paramètres de dessin. C'est la charnière qui manquait : sans elle,
 * chaque nouvelle référence obligeait à écrire à la main un bloc de texture.
 *
 * Ce module est le **point de branchement unique** de la couche produit, au
 * même titre que `analyzer.js` l'est pour les scènes. Il accepte trois formes
 * d'entrée et rend toujours la même structure canonique :
 *
 *   1. la forme historique de `data/parquets.json` (`name`, `wood`, `tone`,
 *      `boardWidth`, `texture`…) — rien à migrer ;
 *   2. la forme canonique décrite ci-dessous ;
 *   3. une forme `snake_case` telle qu'un export d'ERP la produit
 *      (`largeur_lame`, `motifs_autorises`, `famille_rendu`…).
 *
 * Voir docs/premibel-integration.md pour le tableau de correspondance.
 */

/**
 * Champs de la fiche canonique.
 *
 * `null` signifie « non renseigné », jamais « zéro » : une largeur de lame
 * absente doit se voir, pas se confondre avec une lame de 0 mm.
 */
export const CHAMPS_PRODUIT = [
  'id',              // identifiant stable, jamais réutilisé  (obligatoire)
  'nom',             // libellé commercial affiché             (obligatoire)
  'essence',         // chêne, frêne, noyer…
  'gamme',           // ligne de produits du fabricant
  'teinte',          // clair / naturel / miel / foncé…
  'finition',        // huilé mat, vernis satiné, brossé…
  'largeurLame',     // en mètres
  'longueurLame',    // en mètres, null si variable
  'typeParquet',     // massif, contrecollé, stratifié
  'motifsAutorises', // identifiants de motifs de pose
  'motifParDefaut',  // celui proposé à l'ouverture
  'familleRendu',    // clé dans data/render-families.json
  'ordreAffichage',  // tri du catalogue, croissant
  'actif',           // false = masqué du catalogue public
];

/** Motifs connus du moteur. Un motif inconnu est écarté, jamais deviné. */
const MOTIFS_CONNUS = ['lames', 'point-de-hongrie', 'baton-rompu'];

const premier = (...valeurs) => valeurs.find((v) => v !== undefined && v !== null && v !== '');

const nombre = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return Number.isFinite(n) ? n : null;
};

/**
 * Largeur de lame en mètres.
 *
 * Un ERP exprime volontiers les largeurs en millimètres — « 180 » et non
 * « 0,18 ». Prendre la valeur telle quelle donnerait des lames de 180 m, et le
 * défaut serait invisible dans les données tout en crevant les yeux à l'écran.
 * Au-delà de 3, on tient la valeur pour des millimètres.
 */
const enMetres = (v) => {
  const n = nombre(v);
  if (n === null) return null;
  return n > 3 ? n / 1000 : n;
};

/** Motifs autorisés, filtrés sur ce que le moteur sait réellement poser. */
function motifs(raw) {
  const brut =
    premier(raw.motifsAutorises, raw.motifs_autorises, raw.compatiblePatterns, raw.motifs) || [];
  const liste = (Array.isArray(brut) ? brut : String(brut).split(/[,;|]/))
    .map((m) => String(m).trim())
    .filter((m) => MOTIFS_CONNUS.includes(m));
  return liste.length ? [...new Set(liste)] : ['lames'];
}

/**
 * Rapproche une fiche d'une famille de rendu.
 *
 * Ordre : la famille déclarée, puis un identifiant de famille homonyme du
 * produit (le cas des douze références actuelles), puis un rapprochement sur
 * essence + teinte, puis sur la seule teinte. En dernier recours la famille
 * dont la luminance est la plus proche de celle attendue pour la teinte — ce
 * qui garantit qu'un produit inconnu reçoive toujours une apparence plausible
 * plutôt qu'aucune.
 *
 * @returns {{id: string, raison: string}}
 */
export function resoudreFamille(fiche, familles) {
  const cles = Object.keys(familles);
  if (!cles.length) return { id: null, raison: 'aucune famille chargée' };

  const declaree = fiche.familleRendu;
  if (declaree && familles[declaree]) return { id: declaree, raison: 'déclarée' };
  if (familles[fiche.id]) return { id: fiche.id, raison: 'famille homonyme du produit' };

  const norm = (s) => String(s || '').toLowerCase().trim();
  const parEssenceTeinte = cles.find(
    (k) => norm(familles[k].essence) === norm(fiche.essence) && norm(familles[k].teinte) === norm(fiche.teinte)
  );
  if (parEssenceTeinte) return { id: parEssenceTeinte, raison: 'essence + teinte' };

  const parTeinte = cles.find((k) => norm(familles[k].teinte) === norm(fiche.teinte));
  if (parTeinte) return { id: parTeinte, raison: 'teinte' };

  // Dernier recours : la luminance attendue pour le mot de teinte.
  const attendue = { clair: 0.85, naturel: 0.72, moyen: 0.6, miel: 0.6, fonce: 0.32, foncé: 0.32 }[norm(fiche.teinte)];
  const cible = attendue ?? 0.65;
  const proche = cles.reduce((meilleur, k) =>
    Math.abs((familles[k].luminance ?? 0.65) - cible) < Math.abs((familles[meilleur].luminance ?? 0.65) - cible)
      ? k
      : meilleur
  );
  return { id: proche, raison: `luminance la plus proche de ${cible}` };
}

/**
 * Normalise une fiche, quelle que soit sa forme d'origine.
 *
 * @param {object} raw            fiche brute
 * @param {object} [familles]     data/render-families.json → `familles`
 * @returns {object} fiche canonique, avec `avertissements` non vide si des
 *   champs indispensables manquaient. On ne jette pas : un catalogue de
 *   production comporte toujours quelques fiches incomplètes, et il vaut mieux
 *   les afficher signalées que faire tomber la page.
 */
export function normaliserProduit(raw, familles = {}) {
  const avertissements = [];

  const id = premier(raw.id, raw.reference, raw.ref, raw.slug);
  if (!id) avertissements.push('identifiant absent');
  const nom = premier(raw.nom, raw.name, raw.libelle, raw.label, id);
  if (!nom) avertissements.push('libellé absent');

  const largeurLame = enMetres(premier(raw.largeurLame, raw.largeur_lame, raw.boardWidth, raw.largeur));
  if (largeurLame === null) avertissements.push('largeur de lame absente');
  const longueurLame = enMetres(premier(raw.longueurLame, raw.longueur_lame, raw.boardLength, raw.longueur));

  const motifsAutorises = motifs(raw);
  const demande = premier(raw.motifParDefaut, raw.motif_par_defaut, raw.defaultPattern);
  const motifParDefaut = motifsAutorises.includes(demande) ? demande : motifsAutorises[0];

  const fiche = {
    id: id || null,
    nom: nom || null,
    essence: premier(raw.essence, raw.wood, raw.bois) || null,
    gamme: premier(raw.gamme, raw.range, raw.collection) || null,
    teinte: premier(raw.teinte, raw.tone, raw.couleur) || null,
    finition: premier(raw.finition, raw.finish) || null,
    largeurLame,
    longueurLame,
    typeParquet: premier(raw.typeParquet, raw.type_parquet, raw.type) || null,
    motifsAutorises,
    motifParDefaut,
    familleRendu: premier(raw.familleRendu, raw.famille_rendu, raw.renderFamily) || null,
    ordreAffichage: nombre(premier(raw.ordreAffichage, raw.ordre_affichage, raw.order)) ?? 0,
    actif: premier(raw.actif, raw.active, raw.enabled) !== false,
    avertissements,
  };

  const famille = resoudreFamille(fiche, familles);
  fiche.familleRendu = famille.id;
  fiche.familleRaison = famille.raison;
  if (!famille.id) avertissements.push('aucune famille de rendu');

  // Paramètres visuels : ceux de la fiche s'ils existent (les douze références
  // actuelles les portent en ligne), sinon ceux de la famille.
  fiche.rendu = raw.texture || (familles[famille.id] && familles[famille.id].texture) || null;
  if (!fiche.rendu) avertissements.push('aucun paramètre de rendu');

  // Profils par motif : dimensions propres à chaque pose. Absents, ils sont
  // dérivés par patternProfile() dans texture.js.
  fiche.profilsMotifs = premier(raw.profilsMotifs, raw.profils_motifs, raw.patternProfiles) || null;

  return fiche;
}

/**
 * Adapte une fiche canonique à la forme attendue par `createMaterial()`.
 *
 * Le moteur de rendu continue de lire `boardWidth`, `texture`,
 * `compatiblePatterns`… On ne le réécrit pas : la couche produit s'y raccorde.
 * Le jour où un vrai catalogue arrive, c'est cette fonction — et elle seule —
 * qui fait le pont.
 */
export function versMateriau(fiche) {
  return {
    id: fiche.id,
    name: fiche.nom,
    slug: fiche.id,
    wood: fiche.essence,
    tone: fiche.teinte,
    finish: fiche.finition,
    boardWidth: fiche.largeurLame,
    boardLength: fiche.longueurLame,
    defaultPattern: fiche.motifParDefaut,
    compatiblePatterns: fiche.motifsAutorises,
    texture: fiche.rendu,
    patternProfiles: fiche.profilsMotifs,
    maps: { albedo: null, normal: null, roughness: null },
    proceduralFallback: true,
    dimensions: { width: fiche.largeurLame, length: fiche.longueurLame },
    produit: fiche,
  };
}

/**
 * Charge le catalogue produit et les familles de rendu.
 *
 * La source du catalogue est **déclarée** dans `data/render-families.json`
 * (champ `catalogue`), pas devinée : sonder l'existence d'un
 * `data/products.json` laissait un 404 dans la console de toutes les pages.
 * Pour brancher un vrai catalogue, on dépose le fichier et on change cette
 * ligne — voir docs/premibel-integration.md.
 *
 * Les deux formes passent par la même normalisation : rien ne distingue leur
 * résultat en aval.
 */
export async function chargerProduits(base = '') {
  const manifeste = await fetch(`${base}data/render-families.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  const familles = manifeste.familles || {};
  const source = manifeste.catalogue || 'data/parquets.json';

  const data = await fetch(`${base}${source}`).then((r) => {
    if (!r.ok) throw new Error(`catalogue introuvable : ${source}`);
    return r.json();
  });
  // `produits` pour un catalogue déjà au format fiche, `parquets` pour la
  // source historique. Une seule des deux clés est présente.
  const brutes = Array.isArray(data.produits) ? data.produits : data.parquets;
  if (!Array.isArray(brutes)) throw new Error(`catalogue vide ou mal formé : ${source}`);

  const fiches = brutes
    .map((r) => normaliserProduit(r, familles))
    .filter((f) => f.actif && f.id)
    .sort((a, b) => a.ordreAffichage - b.ordreAffichage);

  return { fiches, familles, source };
}
