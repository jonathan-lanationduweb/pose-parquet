/**
 * Couche PRODUIT : la fiche commerciale d'une référence de parquet.
 *
 * Quatre choses sont distinctes dans ce moteur, et les confondre est
 * exactement ce qui empêche d'y brancher un vrai catalogue :
 *
 *   A. la SCÈNE         — la pièce : géométrie du sol, contour, occlusions,
 *                         éclairement        (js/scene/schema.js, data/scenes/)
 *   B. le MOTIF de pose — lames droites, point de Hongrie, bâton rompu
 *   C. le PRODUIT       — la référence vendue : essence, gamme, teinte,
 *                         finition, dimensions, motifs autorisés  (ce fichier)
 *   D. le RENDU matière — ce qui dessine la surface : famille de rendu, ou
 *                         vraies cartes      (data/render-families.json)
 *
 * Un export Premibel fournira **C**. Il ne fournira jamais **D** : personne ne
 * saisit un `grainAlpha` dans un ERP. D'où la **famille de rendu** — le
 * produit dit à quelle famille visuelle il appartient, la famille porte le
 * dessin. C'est la charnière sans laquelle chaque nouvelle référence
 * obligeait à écrire un bloc de texture à la main.
 *
 * Ce module est le **point de branchement unique** de la couche produit, au
 * même titre que `analyzer.js` pour les scènes.
 *
 * ## Deux règles qui ne se négocient pas
 *
 * **Une photo de fiche produit n'est pas une texture de sol.** L'image
 * principale d'une fiche WooCommerce est cadrée pour une vignette : perspective,
 * ombres portées, fond, recadrage. La répéter sur 30 m² de sol donne une bouillie
 * qui répète ses ombres. `visual.thumbnail` et `visual.sample` servent au
 * catalogue ; seuls `visual.albedo`, `visual.normal`, `visual.roughness` et
 * `visual.plankVariants` alimentent le rendu, et ils doivent avoir été
 * préparés pour ça — raccordables, à plat, sans ombre.
 *
 * **Les motifs autorisés ne s'inventent pas.** Un produit n'existe pas en
 * point de Hongrie parce que le moteur sait le dessiner : il existe en point de
 * Hongrie parce que le fabricant le débite. Faute d'information, on ne propose
 * que la pose droite et on le signale — jamais l'inverse.
 */

/* ------------------------------------------------------------------ */
/* Schéma                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fiche canonique. `null` signifie « non renseigné », jamais « zéro » : une
 * largeur absente doit se voir, pas se confondre avec une lame de 0 mm.
 *
 *   id                identifiant interne stable, jamais réutilisé
 *   externalId        identifiant dans le système source (ID produit WP)
 *   sku               référence commerciale
 *   name              libellé affiché
 *   slug              forme utilisable en URL, pour les liens profonds
 *   woodSpecies       chêne, frêne, noyer…
 *   range             gamme / collection
 *   tone              clair, naturel, miel, foncé…
 *   finish            huilé mat, vernis satiné, brossé…
 *   parquetType       massif, contrecollé, stratifié
 *   dimensions        { widthMm, lengthMm, thicknessMm }
 *   compatiblePatterns motifs réellement disponibles pour cette référence
 *   defaultPattern    celui proposé à l'ouverture
 *   visual            { familyId, thumbnail, sample, albedo, normal,
 *                       roughness, plankVariants }
 *   visualStatus      'ready' | 'approximate' | 'unavailable'
 *   displayOrder      tri du catalogue, croissant
 *   active            false = hors catalogue public
 *   warnings          ce qui manquait dans la fiche source
 */
export const PRODUCT_FIELDS = [
  'id', 'externalId', 'sku', 'name', 'slug',
  'woodSpecies', 'range', 'tone', 'finish', 'parquetType',
  'dimensions', 'compatiblePatterns', 'defaultPattern',
  'visual', 'visualStatus', 'displayOrder', 'active',
];

/** Motifs que le moteur sait poser. Un motif inconnu est écarté. */
export const KNOWN_PATTERNS = ['lames', 'point-de-hongrie', 'baton-rompu'];

/**
 * Niveau de fidélité du rendu d'un produit.
 *
 * `ready`        de vraies cartes matière, préparées pour le sol.
 * `approximate`  une famille de rendu de démonstration en tient lieu.
 * `unavailable`  ni l'un ni l'autre : le produit n'est pas proposé.
 *
 * La distinction existe pour une raison simple : **il ne faut jamais laisser
 * croire qu'un rendu procédural représente fidèlement une référence réelle.**
 * Ce que l'interface en fait — masquer, ou afficher « aperçu indicatif » — se
 * décidera plus tard ; la donnée, elle, doit exister dès maintenant.
 */
export const VISUAL_STATUS = ['ready', 'approximate', 'unavailable'];

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return Number.isFinite(n) ? n : null;
};

/**
 * Une dimension, en millimètres, **à unité explicite**.
 *
 * L'unité canonique est le millimètre : celle des fiches techniques et des ERP,
 * et une largeur de lame en millimètres entiers ne souffre pas d'arrondi.
 *
 * Ce qui est accepté :
 *
 *   120          + `unit: 'mm'`   → 120
 *   "120mm"                       → 120
 *   "1,9 m"                       → 1900
 *   "12 cm"                       → 120
 *   "455 à 910mm"                 → { mm: 683, rangeMm: [455, 910] }
 *
 * Ce qui est **refusé** : un nombre nu, sans unité connue. La version
 * précédente devinait — « moins de 3, ce sont des mètres » — et c'est
 * exactement le genre de règle qui marche sur un prototype puis se retourne
 * contre vous sur un vrai catalogue. Une fiche Premibel réelle porte
 * « Longueur : 1,38mm » là où le produit mesure 1380 mm : l'heuristique aurait
 * « corrigé » la valeur en silence et personne n'aurait jamais vu la donnée
 * fausse. Avec des unités explicites, 1,38 mm reste 1,38 mm — invraisemblable,
 * donc signalé.
 *
 * @returns {{mm:number|null, rangeMm:number[]|null, probleme:string|null}}
 */
const UNITES = { mm: 1, millimetre: 1, millimètre: 1, cm: 10, centimetre: 10, centimètre: 10, m: 1000, metre: 1000, mètre: 1000 };

function dimension(valeur, unite) {
  if (valeur === undefined || valeur === null || valeur === '') {
    return { mm: null, rangeMm: null, probleme: null };
  }
  const texte = String(valeur).trim().toLowerCase().replace(/\s+/g, ' ');

  // Intervalle : « 455 à 910mm », « 455-910 mm ». Une longueur variable est une
  // information, pas un défaut : on garde les bornes et on retient la moyenne
  // pour le rendu.
  const inter = texte.match(/^([\d.,]+)\s*(?:à|a|-|–)\s*([\d.,]+)\s*([a-zà-ÿ]*)$/);
  if (inter) {
    const u = UNITES[inter[3] || String(unite || '').toLowerCase()];
    if (!u) return { mm: null, rangeMm: null, probleme: `unité inconnue dans « ${valeur} »` };
    const a = num(inter[1]) * u;
    const b = num(inter[2]) * u;
    if (a === null || b === null) return { mm: null, rangeMm: null, probleme: `intervalle illisible : « ${valeur} »` };
    return { mm: Math.round((a + b) / 2), rangeMm: [Math.round(a), Math.round(b)], probleme: null };
  }

  const simple = texte.match(/^([\d.,]+)\s*([a-zà-ÿ²]*)$/);
  if (!simple) return { mm: null, rangeMm: null, probleme: `valeur illisible : « ${valeur} »` };
  const n = num(simple[1]);
  if (n === null) return { mm: null, rangeMm: null, probleme: `valeur illisible : « ${valeur} »` };
  const suffixe = simple[2] || String(unite || '').toLowerCase();
  const u = UNITES[suffixe];
  if (!u) {
    return {
      mm: null,
      rangeMm: null,
      probleme: suffixe ? `unité inconnue : « ${suffixe} »` : `unité absente pour la valeur ${n}`,
    };
  }
  return { mm: Math.round(n * u), rangeMm: null, probleme: null };
}

/** Bornes de vraisemblance, en millimètres. Au-delà, la donnée est fausse. */
const PLAUSIBLE = {
  widthMm: [40, 1200],      // 1200 : une dalle Versailles, écartée plus loin
  lengthMm: [200, 3000],
  thicknessMm: [5, 40],
};

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Motifs réellement disponibles.
 *
 * Rien n'est déduit : si la source ne dit rien, on ne propose que la pose
 * droite. Proposer un point de Hongrie qui n'existe pas au catalogue serait
 * une promesse fausse faite à quelqu'un qui prépare un chantier.
 */
function patternsOf(raw, warnings) {
  const brut = raw.compatiblePatterns ?? raw.motifs_autorises ?? raw.motifsAutorises ?? raw.patterns;
  const nonSupporte = first(raw.unsupportedPattern, raw.motif_non_supporte);
  if (brut === undefined || brut === null) {
    if (!nonSupporte) warnings.push('motifs non déclarés : pose droite seule');
    return nonSupporte ? [] : ['lames'];
  }
  const liste = (Array.isArray(brut) ? brut : String(brut).split(/[,;|]/))
    .map((m) => String(m).trim())
    .filter((m) => KNOWN_PATTERNS.includes(m));
  if (!liste.length) {
    // Un produit dont le motif est connu mais non pris en charge par le moteur
    // n'a pas « aucun motif reconnu » : il a un motif que nous ne savons pas
    // poser. Le dire autrement serait faux.
    if (!nonSupporte) warnings.push('aucun motif reconnu : pose droite seule');
    return [];
  }
  return [...new Set(liste)];
}

/**
 * Rapproche une fiche d'une famille de rendu, et **dit par quel chemin**.
 *
 * La dernière étape garantit qu'une référence inconnue reçoive toujours une
 * apparence plausible plutôt qu'aucune. C'est un rapprochement, pas une
 * vérité : une gamme qui compte visuellement doit déclarer sa famille.
 */
export function resolveFamily(fiche, familles) {
  const cles = Object.keys(familles);
  if (!cles.length) return { id: null, reason: 'aucune famille chargée' };

  const declaree = fiche.visual && fiche.visual.familyId;
  if (declaree && familles[declaree]) return { id: declaree, reason: 'déclarée' };
  if (familles[fiche.id]) return { id: fiche.id, reason: 'famille homonyme du produit' };

  const norm = (s) => String(s || '').toLowerCase().trim();
  const parDeux = cles.find(
    (k) => norm(familles[k].essence) === norm(fiche.woodSpecies) && norm(familles[k].teinte) === norm(fiche.tone)
  );
  if (parDeux) return { id: parDeux, reason: 'essence + teinte' };

  const parTeinte = cles.find((k) => norm(familles[k].teinte) === norm(fiche.tone));
  if (parTeinte) return { id: parTeinte, reason: 'teinte' };

  const attendue = { clair: 0.85, naturel: 0.72, moyen: 0.6, miel: 0.6, fonce: 0.32, 'foncé': 0.32 }[norm(fiche.tone)];
  const cible = attendue ?? 0.65;
  const proche = cles.reduce((meilleur, k) =>
    Math.abs((familles[k].luminance ?? 0.65) - cible) < Math.abs((familles[meilleur].luminance ?? 0.65) - cible)
      ? k : meilleur
  );
  return { id: proche, reason: `luminance la plus proche de ${cible}` };
}

/**
 * Normalise une fiche, quelle que soit sa forme d'origine.
 *
 * Trois formes acceptées : la source historique de `data/parquets.json`, la
 * forme canonique, et un `snake_case` d'export d'ERP. On ne jette jamais : un
 * catalogue de production comporte toujours des fiches incomplètes, et il vaut
 * mieux les afficher signalées que faire tomber la page.
 */
export function normalizeProduct(raw, familles = {}) {
  const warnings = [];

  const id = first(raw.id, raw.sku, raw.reference, raw.ref, raw.slug);
  if (!id) warnings.push('identifiant absent');
  const name = first(raw.name, raw.nom, raw.libelle, raw.label, id);
  if (!name) warnings.push('libellé absent');

  // Dimensions : unité explicite exigée. `dimensionUnit` permet à une source
  // qui livre des nombres nus de déclarer son unité une fois pour toutes ;
  // `data/parquets.json`, en mètres, s'en sert.
  const uniteSource = first(raw.dimensionUnit, raw.dimensions && raw.dimensions.unit, raw.unite_dimensions);
  const lire = (nom, ...candidats) => {
    const brut = first(...candidats);
    const d = dimension(brut, uniteSource);
    if (d.probleme) warnings.push(`${nom} : ${d.probleme}`);
    else if (d.mm !== null) {
      const [min, max] = PLAUSIBLE[nom];
      if (d.mm < min || d.mm > max) {
        // Rejetée, pas seulement signalée : une valeur fausse utilisée est pire
        // qu'une valeur absente. Sans longueur, le moteur en dérive une
        // plausible ; avec une longueur de 1 mm il dessinerait n'importe quoi.
        warnings.push(`${nom} rejetée, invraisemblable : ${d.mm} mm (attendu ${min}–${max})`);
        return { mm: null, rangeMm: null, probleme: null };
      }
    }
    return d;
  };

  const w = lire('widthMm', raw.dimensions && raw.dimensions.widthMm, raw.widthMm, raw.largeur_lame, raw.boardWidth, raw.largeur);
  if (w.mm === null && !w.probleme) warnings.push('largeur de lame absente');
  const l = lire('lengthMm', raw.dimensions && raw.dimensions.lengthMm, raw.lengthMm, raw.longueur_lame, raw.boardLength, raw.longueur, raw.longueur_variable);
  const t = lire('thicknessMm', raw.dimensions && raw.dimensions.thicknessMm, raw.thicknessMm, raw.epaisseur, raw.epaisseur_mm);
  const widthMm = w.mm;
  const lengthMm = l.mm;
  const thicknessMm = t.mm;

  const compatiblePatterns = patternsOf(raw, warnings);
  const demande = first(raw.defaultPattern, raw.motif_par_defaut, raw.motifParDefaut);
  const defaultPattern = compatiblePatterns.includes(demande) ? demande : compatiblePatterns[0];

  const rawVisual = raw.visual || {};
  const fiche = {
    id: id || null,
    externalId: first(raw.externalId, raw.external_id, raw.wp_id, raw.post_id) || null,
    sku: first(raw.sku, raw.reference, raw.ref) || null,
    name: name || null,
    slug: first(raw.slug, slugify(name)) || null,
    woodSpecies: first(raw.woodSpecies, raw.essence, raw.wood, raw.bois) || null,
    range: first(raw.range, raw.gamme, raw.collection) || null,
    tone: first(raw.tone, raw.teinte, raw.couleur) || null,
    // « Finition » et « Aspect » sont deux informations distinctes chez
    // Premibel, et les écraser dans un seul champ perdrait la moitié du sens :
    // « Verni » dit la brillance, « Brossé » dit le traitement de surface. Un
    // brossé n'est pas un niveau de brillance — c'est un grain ouvert, souvent
    // mat, et un « Verni brossé » existe.
    finish: first(raw.finish, raw.finition) || null,
    surfaceTreatment: first(raw.surfaceTreatment, raw.aspect, raw.traitement_surface) || null,
    parquetType: first(raw.parquetType, raw.type_parquet, raw.typeParquet, raw.type) || null,
    dimensions: { widthMm, lengthMm, thicknessMm, lengthRangeMm: l.rangeMm },
    compatiblePatterns,
    defaultPattern,
    visual: {
      familyId: first(rawVisual.familyId, raw.famille_rendu, raw.familleRendu, raw.renderFamily) || null,
      // Catalogue : ces deux-là ne touchent jamais le sol.
      thumbnail: first(rawVisual.thumbnail, raw.thumbnail, raw.image) || null,
      sample: first(rawVisual.sample, raw.sample, raw.samplePhoto) || null,
      // Rendu : préparées pour être projetées, raccordables, sans ombre.
      albedo: first(rawVisual.albedo, raw.albedo, raw.maps && raw.maps.albedo) || null,
      normal: first(rawVisual.normal, raw.normal, raw.maps && raw.maps.normal) || null,
      roughness: first(rawVisual.roughness, raw.roughness, raw.maps && raw.maps.roughness) || null,
      plankVariants: rawVisual.plankVariants || raw.plankVariants || null,
    },
    // Lien vers la fiche du fabricant. N'existe que pour une vraie référence :
    // c'est ce qui permet à l'interface de ne proposer « Voir la référence »
    // que là où la référence affichée est réellement celle-là.
    productUrl: first(raw.productUrl, raw.product_url, raw.url) || null,
    // Motif que le produit possède réellement mais que le moteur ne sait pas
    // poser — Versailles, notamment. On l'inscrit plutôt que de transformer
    // arbitrairement une dalle en pose droite.
    unsupportedPattern: first(raw.unsupportedPattern, raw.motif_non_supporte) || null,
    source: first(raw.source, raw.origine) || null,
    displayOrder: num(first(raw.displayOrder, raw.ordre_affichage, raw.ordreAffichage, raw.order)) ?? 0,
    active: first(raw.active, raw.actif, raw.enabled) !== false,
    warnings,
  };

  const famille = resolveFamily(fiche, familles);
  fiche.visual.familyId = famille.id;
  fiche.visual.familyReason = famille.reason;

  // Paramètres de dessin : ceux de la fiche s'ils existent (les douze
  // références actuelles les portent en ligne), sinon ceux de la famille.
  fiche.visual.params = raw.texture || (familles[famille.id] && familles[famille.id].texture) || null;
  fiche.patternProfiles = first(raw.patternProfiles, raw.profils_motifs, raw.profilsMotifs) || null;

  // Niveau de fidélité.
  //
  // Un motif que le moteur ne sait pas poser rend le produit indisponible, quel
  // que soit son rendu : mieux vaut ne pas le montrer que de le montrer faux.
  // C'est le cas des dalles Versailles — les transformer en pose droite serait
  // représenter autre chose que le produit.
  const declare = first(raw.visualStatus, raw.visual_status);
  if (fiche.unsupportedPattern) {
    fiche.visualStatus = 'unavailable';
    warnings.push(`motif non pris en charge par le moteur : ${fiche.unsupportedPattern}`);
  } else if (fiche.visual.albedo) fiche.visualStatus = 'ready';
  else if (fiche.visual.params) fiche.visualStatus = 'approximate';
  else {
    fiche.visualStatus = 'unavailable';
    warnings.push('aucun rendu disponible');
  }
  // Une fiche peut se déclarer plus prudente que ce que le calcul conclut,
  // jamais plus optimiste : on ne se décrète pas fidèle.
  if (declare && VISUAL_STATUS.indexOf(declare) > VISUAL_STATUS.indexOf(fiche.visualStatus)) {
    fiche.visualStatus = declare;
  }

  // Sans largeur, aucun rendu à l'échelle n'est possible : le produit ne peut
  // pas être proposé, même avec une belle famille de rendu.
  if (fiche.dimensions.widthMm === null && fiche.visualStatus !== 'unavailable') {
    fiche.visualStatus = 'unavailable';
    warnings.push('largeur inutilisable : rendu à l’échelle impossible');
  }

  return fiche;
}

/**
 * Adapte une fiche canonique à la forme attendue par `createMaterial()`.
 *
 * Le moteur continue de lire `boardWidth`, `texture`, `compatiblePatterns`… On
 * ne le réécrit pas : la couche produit s'y raccorde. Le jour où un vrai
 * catalogue arrive, c'est cette fonction — et elle seule — qui fait le pont.
 *
 * Les dimensions repassent en mètres ici, et **seulement ici** : le moteur
 * travaille en mètres de sol, la fiche en millimètres.
 */
/**
 * Profils de motif dérivés des dimensions réelles de la fiche.
 *
 * Un produit vendu en point de Hongrie 92 × 520 mm doit se rendre en
 * 92 × 520 mm. Sans ce profil, `patternProfile()` retombait sur la valeur
 * générique de 90 mm pour tous les chevrons — géométriquement proche, mais ce
 * n'était plus le produit.
 *
 * Pour un produit qui déclare plusieurs motifs (le cas existe : une lame de
 * 133 × 665 mm vendue en pose droite *et* en bâton rompu), c'est le même
 * élément physique dans les deux cas, donc le même profil.
 */
function profilsDepuisDimensions(fiche) {
  const w = fiche.dimensions.widthMm;
  const l = fiche.dimensions.lengthMm;
  if (w === null) return null;
  const profil = { width: w / 1000 };
  if (l !== null) profil.length = l / 1000;
  const out = {};
  fiche.compatiblePatterns.forEach((p) => { out[p] = { ...profil }; });
  return out;
}

export function toMaterial(fiche) {
  return {
    id: fiche.id,
    name: fiche.name,
    slug: fiche.slug,
    wood: fiche.woodSpecies,
    tone: fiche.tone,
    // Le moteur reçoit les deux informations concaténées parce que
    // `finishProfile()` raisonne sur des mots-clés — « Verni » et « Brossé »
    // ne donnent pas le même profil, et « Verni brossé » encore un autre.
    finish: [fiche.finish, fiche.surfaceTreatment].filter(Boolean).join(' ') || null,
    boardWidth: fiche.dimensions.widthMm !== null ? fiche.dimensions.widthMm / 1000 : null,
    boardLength: fiche.dimensions.lengthMm !== null ? fiche.dimensions.lengthMm / 1000 : null,
    defaultPattern: fiche.defaultPattern,
    compatiblePatterns: fiche.compatiblePatterns,
    texture: fiche.visual.params,
    // Les dimensions du produit SONT les dimensions du motif.
    //
    // Un point de Hongrie Premibel de 92 × 520 mm, c'est un chevron de
    // 92 × 520 mm — pas la valeur générique de 90 mm que le moteur dérivait
    // faute de mieux. On fabrique donc un profil par motif autorisé à partir
    // des dimensions réelles de la fiche. Les matières de démonstration, qui
    // déclarent déjà leurs profils, gardent les leurs.
    patternProfiles: fiche.patternProfiles || profilsDepuisDimensions(fiche),
    maps: {
      albedo: fiche.visual.albedo,
      normal: fiche.visual.normal,
      roughness: fiche.visual.roughness,
    },
    proceduralFallback: !fiche.visual.albedo,
    dimensions: {
      width: fiche.dimensions.widthMm !== null ? fiche.dimensions.widthMm / 1000 : null,
      length: fiche.dimensions.lengthMm !== null ? fiche.dimensions.lengthMm / 1000 : null,
    },
    product: fiche,
  };
}

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

/**
 * Charge le catalogue produit et les familles de rendu.
 *
 * Les sources sont **déclarées** dans `data/render-families.json` (champ
 * `catalogues`), pas devinées : sonder l'existence d'un fichier laissait un 404
 * dans la console de toutes les pages.
 *
 * Plusieurs sources cohabitent, et c'est voulu pendant la phase pilote : les
 * matières de démonstration restent en place — les cartes Inspiration et
 * l'avant/après de l'accueil les citent par identifiant — et les vraies
 * références Premibel s'y ajoutent. Chaque fiche porte l'origine dont elle
 * vient, ce qui permet à l'interface de ne proposer un lien fabricant que là
 * où il existe vraiment.
 *
 * Les fiches `unavailable` sont écartées comme les inactives.
 */
/**
 * Un même fichier de catalogue n'est lu qu'une fois par session.
 *
 * `loadCatalog` relit `data/parquets.json` pour ses métadonnées de motifs
 * après que `loadProducts` l'a déjà chargé : deux requêtes pour le même
 * octet au démarrage du Studio, mesuré. La promesse est partagée par URL.
 */
const fichiers = new Map();
export function lireJson(url) {
  if (!fichiers.has(url)) {
    fichiers.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`introuvable : ${url}`);
      return r.json();
    }));
  }
  return fichiers.get(url);
}

export async function loadProducts(base = '') {
  const manifeste = await fetch(`${base}data/render-families.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  const families = manifeste.familles || {};
  const sources = Array.isArray(manifeste.catalogues)
    ? manifeste.catalogues
    : [{ fichier: manifeste.catalogue || 'data/parquets.json', source: 'demonstration' }];

  const toutes = [];
  for (const s of sources) {
    const data = await lireJson(`${base}${s.fichier}`);
    const brutes = Array.isArray(data.produits) ? data.produits : data.parquets;
    if (!Array.isArray(brutes)) throw new Error(`catalogue vide ou mal formé : ${s.fichier}`);
    brutes.forEach((r) => toutes.push(normalizeProduct({ source: s.source, ...r }, families)));
  }
  const source = sources.map((s) => s.fichier).join(' + ');
  const products = toutes
    .filter((f) => f.active && f.id && f.visualStatus !== 'unavailable')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return { products, rejected: toutes.filter((f) => !products.includes(f)), families, source };
}

/* ------------------------------------------------------------------ */
/* Contrôle du catalogue                                               */
/* ------------------------------------------------------------------ */

/**
 * Valide un catalogue et rend un rapport.
 *
 * Le but n'est pas de refuser des fiches : c'est de **savoir** ce qui manque
 * avant que ça se voie à l'écran. Un produit invalide ne doit jamais casser le
 * visualiseur — il est écarté, et il apparaît ici.
 *
 * @returns {{ok:boolean, total:number, problemes:object[], parStatut:object}}
 */
export function validateCatalog(fiches, families = {}) {
  const problemes = [];
  const vus = new Set();
  const parStatut = { ready: 0, approximate: 0, unavailable: 0 };

  fiches.forEach((f) => {
    const dire = (gravite, quoi) => problemes.push({ id: f.id || '(sans id)', gravite, quoi });

    if (!f.id) dire('bloquant', 'identifiant absent');
    else if (vus.has(f.id)) dire('bloquant', 'identifiant en doublon');
    else vus.add(f.id);

    if (!f.name) dire('bloquant', 'libellé absent');
    if (f.dimensions.widthMm === null) dire('bloquant', 'largeur de lame absente');
    else if (f.dimensions.widthMm < PLAUSIBLE.widthMm[0] || f.dimensions.widthMm > PLAUSIBLE.widthMm[1]) {
      dire('bloquant', `largeur invraisemblable : ${f.dimensions.widthMm} mm`);
    } else if (f.dimensions.widthMm > 400 && !f.unsupportedPattern) {
      // Au-delà de 400 mm ce n'est plus une lame, c'est un panneau. Légitime
      // pour une dalle Versailles — mais le motif doit alors être déclaré non
      // supporté, sinon la fiche et le moteur ne parlent pas du même objet.
      dire('bloquant', `largeur de ${f.dimensions.widthMm} mm sans motif non supporté déclaré`);
    }
    if (f.dimensions.lengthMm !== null && f.dimensions.lengthMm < f.dimensions.widthMm) {
      dire('bloquant', 'longueur inférieure à la largeur');
    }

    if (!f.visual.familyId && !f.visual.albedo) dire('bloquant', 'ni famille de rendu ni carte matière');
    else if (f.visual.familyId && !families[f.visual.familyId] && !f.visual.albedo) {
      dire('bloquant', `famille de rendu inconnue : ${f.visual.familyId}`);
    }

    const inconnus = f.compatiblePatterns.filter((p) => !KNOWN_PATTERNS.includes(p));
    if (inconnus.length) dire('bloquant', `motifs inconnus : ${inconnus.join(', ')}`);
    if (f.compatiblePatterns.length && !f.compatiblePatterns.includes(f.defaultPattern)) {
      dire('bloquant', 'motif par défaut hors des motifs autorisés');
    }
    if (!f.compatiblePatterns.length && !f.unsupportedPattern) {
      dire('bloquant', 'aucun motif posable, et aucun motif non supporté déclaré');
    }
    if (f.unsupportedPattern) dire('signalement', `motif « ${f.unsupportedPattern} » non pris en charge — produit écarté`);

    if (!VISUAL_STATUS.includes(f.visualStatus)) dire('bloquant', `statut visuel inconnu : ${f.visualStatus}`);
    parStatut[f.visualStatus] = (parStatut[f.visualStatus] || 0) + 1;

    // Signalements, sans gravité : la fiche fonctionne, elle est incomplète.
    if (!f.sku) dire('signalement', 'référence commerciale absente');
    if (!f.externalId) dire('signalement', 'identifiant source absent');
    if (!f.range) dire('signalement', 'gamme absente');
    if (!f.finish) dire('signalement', 'finition absente : la brillance sera devinée');
    if (!f.parquetType) dire('signalement', 'type de parquet absent');
    if (f.dimensions.thicknessMm === null) dire('signalement', 'épaisseur absente');
    if (f.visualStatus === 'approximate') {
      dire('signalement', `rendu approché (famille « ${f.visual.familyId} », ${f.visual.familyReason})`);
    }
    if (!f.visual.thumbnail) dire('signalement', 'vignette catalogue absente');
    f.warnings.forEach((w) => dire('signalement', w));
  });

  return {
    ok: !problemes.some((p) => p.gravite === 'bloquant'),
    total: fiches.length,
    parStatut,
    problemes,
  };
}
