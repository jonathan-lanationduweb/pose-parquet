/**
 * Synchronisation du catalogue Premibel — à la construction, jamais dans le navigateur.
 *
 *   node _generator/sync-premibel.js            synchronise et écrit data/products.premibel.json
 *   node _generator/sync-premibel.js --dry-run  synchronise, rapporte, n'écrit rien
 *   node _generator/sync-premibel.js --from <dossier>
 *                                               rejoue des pages déjà téléchargées (raw-1.json…)
 *
 * SOURCE. La Store API WooCommerce de premibel.fr, publique et en lecture seule :
 * https://www.premibel.fr/wp-json/wc/store/v1/products. Elle n'envoie aucun en-tête
 * CORS : un appel depuis la page d'un visiteur est impossible, et c'est voulu.
 * Le visiteur ne lit que le fichier produit ici. Voir docs/premibel-sync-contract.md.
 *
 * GARANTIES.
 *   - Pagination complète : on lit X-WP-Total et X-WP-TotalPages, on demande chaque
 *     page, et l'on vérifie à la fin que le nombre de produits reçus vaut le total
 *     annoncé, sans doublon d'identifiant. Sinon : échec, rien n'est écrit.
 *   - Délai par requête, reprises bornées sur les erreurs transitoires (réseau, 429,
 *     5xx), User-Agent identifiable.
 *   - Aucun prix : `prices`, `price_html`, `on_sale`, les attributs de tarif et de
 *     promotion ne sont jamais lus. Le fichier écrit est contrôlé : une clé de prix
 *     fait échouer l'écriture.
 *   - Écriture atomique (fichier voisin puis renommage) : un échec laisse le dernier
 *     fichier valide en place, et le build continue de l'utiliser.
 *   - Désactivation prudente : une référence connue absente d'une synchronisation
 *     COMPLÈTE passe à `active: false` — jamais supprimée. Si plus d'un quart des
 *     références actives disparaissent d'un coup, la synchronisation refuse (export
 *     tronqué ou changement de structure : un humain doit regarder).
 *   - Doublons de SKU, de slug ou d'identifiant source, SKU vide : échec, pas d'écrasement.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ecrireAtomique } = require('./eol');
const { urlPremibel } = require('../js/commerce/premibel-hotes.js');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'data', 'products.premibel.json');
const PILOTE = path.join(RACINE, 'data', 'products.premibel-pilot.json');
const FAMILLES = path.join(RACINE, 'data', 'render-families.json');
/* Vignettes locales : publiées avec le site. L'index du cache, lui, vit dans
   _generator/, que le déploiement exclut — l'URL source n'est pas servie. */
const DOSSIER_VIGNETTES = path.join(RACINE, 'assets', 'images', 'products', 'premibel');
const CHEMIN_PUBLIC_VIGNETTES = 'assets/images/products/premibel';
const INDEX_VIGNETTES = path.join(__dirname, 'premibel-thumbs.json');
const VIGNETTE_MAX_OCTETS = 200 * 1024;
const VIGNETTE_MIN_OCTETS = 200;
const VIGNETTES_EN_PARALLELE = 6;
/* Une source plus lourde que cela n'est pas une vignette : on refuse plutôt
   que de décoder 20 Mo pour en garder 15 Ko. */
const SOURCE_MAX_OCTETS = 8 * 1024 * 1024;
const TAILLE_VIGNETTE = 324;
const CONVERTISSEUR = path.join(__dirname, 'vignette-webp.py');
const EMPREINTES = path.join(__dirname, 'vignette-empreintes.py');
const QUALITE = require('./vignettes-qualite.js');

/* Surchargeable pour éprouver les échecs réseau (PREMIBEL_ORIGIN=https://invalide.invalid). */
const ORIGINE = process.env.PREMIBEL_ORIGIN || 'https://www.premibel.fr';
const PRODUITS = `${ORIGINE}/wp-json/wc/store/v1/products`;
const CATEGORIES = `${ORIGINE}/wp-json/wc/store/v1/products/categories`;
const PAR_PAGE = 100;
const DELAI_MS = 30000;
const REPRISES = 3;
const PAUSE_ENTRE_PAGES_MS = 400;
const USER_AGENT = 'PoseParquetCatalogSync/1.0 (+https://pose-parquet.com; synchronisation hebdomadaire en lecture seule)';
const SEUIL_DISPARITION = 0.25;

/* ------------------------------------------------------------------ */
/* Règles de données — toutes ici, toutes documentées                  */
/* ------------------------------------------------------------------ */

/**
 * QU'EST-CE QU'UN PARQUET. Un produit est retenu s'il appartient au sous-arbre de
 * la catégorie « Parquet » (slug `parquet`) ET n'appartient à aucun sous-arbre
 * exclu, ET si ses attributs structurés ne le désignent pas comme autre chose.
 * Le nom n'entre jamais dans la décision.
 */
const CATEGORIE_PARQUET = 'parquet';
const SOUS_ARBRES_EXCLUS = {
  'lames-de-terrasse': 'lame de terrasse (extérieur)',
  'parquet-sol-stratifie': 'sol stratifié (pas un parquet bois)',
  accessoires: 'accessoire',
  plinthe: 'plinthe ou finition',
  'panneaux-muraux': 'panneau mural',
  isolation: 'isolation ou sous-couche',
};
const EXCLUSIONS_ATTRIBUT = [
  { taxonomie: 'pa_famille', valeur: 'PLINTHE', raison: 'famille PLINTHE' },
  { taxonomie: 'pa_finition', valeur: 'Stratifié', raison: 'finition Stratifié (pas un parquet bois)' },
  { taxonomie: 'pa_essence', valeur: 'Composite', raison: 'essence Composite (pas un parquet bois)' },
];

/**
 * MOTIFS. Lus dans les catégories de motif de Premibel, et seulement là. Un
 * produit sans catégorie de motif n'est pas supposé « lames » : il reste sans
 * motif, donc sans rendu, et garde son lien vers la fiche. Le chêne ne rend pas
 * possibles tous les motifs : un point de Hongrie se fabrique coupé à l'onglet.
 */
const MOTIF_PAR_CATEGORIE = {
  'lames-droites': 'lames',
  'point-de-hongrie': 'point-de-hongrie',
  'point-de-hongrie-massif': 'point-de-hongrie',
  'parquet-flottant-point-de-hongrie': 'point-de-hongrie',
  'baton-rompu': 'baton-rompu',
  'parquet-massif-baton-rompu': 'baton-rompu',
  'parquet-flottant-baton-rompu': 'baton-rompu',
};
const VERSAILLES = new Set(['versailles', 'parquet-flottant-versailles']);

/**
 * TEINTES. Les catégories de couleur de Premibel, ramenées au vocabulaire du
 * Studio (clair, naturel, chaud, foncé) pour que le filtre existant fonctionne.
 * La valeur d'origine est conservée dans `toneSource`.
 */
const TEINTE = {
  blanc: 'clair', clair: 'clair',
  naturel: 'naturel', gris: 'naturel',
  miel: 'chaud', cuivre: 'chaud',
  brun: 'fonce', fonce: 'fonce',
};

/**
 * RENDU — la seule règle qui produit « approximate ». Explicite, et étroite :
 *   chêne + UNE catégorie de couleur + un motif posable + une largeur
 *   → la famille procédurale de même couleur, rendu INDICATIF.
 * Toute autre combinaison reste `unavailable`, avec sa raison. Aucune famille
 * n'est attribuée « à la luminance la plus proche ».
 * `ready` exige une matière capturée et validée (cartes albedo) : aucune à ce jour.
 */
const FAMILLE_PAR_COULEUR = {
  blanc: 'chene-craie',
  clair: 'chene-sable',
  naturel: 'chene-naturel',
  gris: 'chene-gris',
  miel: 'chene-miel',
  cuivre: 'chene-caramel',
  brun: 'chene-brun',
  fonce: 'chene-tabac',
};

/** Au-delà, ce n'est plus une lame mais une dalle ou un panneau (même seuil que validateCatalog). */
const LAME_MAX_MM = 400;
const largeurMm = (v) => {
  const m = String(v).match(/^([\d.]+)\s*(mm|cm|m)$/i);
  if (!m) return null;
  return Number(m[1]) * { mm: 1, cm: 10, m: 1000 }[m[2].toLowerCase()];
};

/** Ce qui n'est JAMAIS lu, quoi que l'API renvoie. */
const CLES_INTERDITES = /^(prices?|price_html|on_sale|regular_price|sale_price|tarif|prix|promo)/i;
const ATTRIBUTS_IGNORES = new Set(['pa_qualite', 'pa_nation_tarif_promo_date_fin', 'pa_codetarif', 'pa_colisage', 'pa_unity', 'pa_type_unity', 'pa_poids_brut']);

/* ------------------------------------------------------------------ */
/* Réseau                                                              */
/* ------------------------------------------------------------------ */

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function lire(url) {
  let derniere;
  for (let essai = 1; essai <= REPRISES; essai += 1) {
    const controle = new AbortController();
    const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
    try {
      const reponse = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controle.signal });
      clearTimeout(minuterie);
      if (reponse.status === 429 || reponse.status >= 500) throw new Error(`HTTP ${reponse.status}`);
      if (!reponse.ok) throw Object.assign(new Error(`HTTP ${reponse.status} sur ${url}`), { definitif: true });
      const type = reponse.headers.get('content-type') || '';
      if (!type.includes('application/json')) throw Object.assign(new Error(`réponse non JSON (${type}) sur ${url}`), { definitif: true });
      const texte = await reponse.text();
      let corps;
      try { corps = JSON.parse(texte); } catch { throw new Error(`JSON illisible sur ${url}`); }
      return { corps, total: Number(reponse.headers.get('x-wp-total')), pages: Number(reponse.headers.get('x-wp-totalpages')) };
    } catch (erreur) {
      clearTimeout(minuterie);
      derniere = erreur;
      if (erreur.definitif || essai === REPRISES) break;
      await pause(1000 * 2 ** (essai - 1));
    }
  }
  throw new Error(`échec après ${REPRISES} tentative(s) : ${derniere && derniere.message}`);
}

async function telecharger() {
  const categories = (await lire(`${CATEGORIES}?per_page=100`)).corps;
  if (!Array.isArray(categories) || !categories.length) throw new Error('liste de catégories vide ou mal formée');
  const premiere = await lire(`${PRODUITS}?per_page=${PAR_PAGE}&page=1`);
  const { total, pages } = premiere;
  if (!Number.isInteger(total) || !Number.isInteger(pages) || total <= 0 || pages <= 0) {
    throw new Error('en-têtes X-WP-Total / X-WP-TotalPages absents ou invalides : pagination non vérifiable');
  }
  const produits = [...premiere.corps];
  for (let page = 2; page <= pages; page += 1) {
    await pause(PAUSE_ENTRE_PAGES_MS);
    const { corps } = await lire(`${PRODUITS}?per_page=${PAR_PAGE}&page=${page}`);
    if (!Array.isArray(corps)) throw new Error(`page ${page} : tableau attendu`);
    if (page < pages && corps.length !== PAR_PAGE) throw new Error(`page ${page} incomplète : ${corps.length} produits sur ${PAR_PAGE}`);
    produits.push(...corps);
  }
  return { produits, categories, total, pages };
}

function rejouer(dossier) {
  const fichiers = fs.readdirSync(dossier).filter((f) => /^raw-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));
  const produits = fichiers.flatMap((f) => JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')));
  const categories = JSON.parse(fs.readFileSync(path.join(dossier, 'cats.json'), 'utf8'));
  return { produits, categories, total: produits.length, pages: fichiers.length, rejoue: true };
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const decoder = (s) => String(s == null ? '' : s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

function arbre(categories) {
  const parId = new Map(categories.map((c) => [c.id, c]));
  return (id) => {
    const slugs = new Set();
    for (let c = parId.get(id); c; c = parId.get(c.parent)) slugs.add(c.slug);
    return slugs;
  };
}

function attribut(produit, taxonomie) {
  const a = (produit.attributes || []).find((x) => x.taxonomy === taxonomie);
  if (!a || !Array.isArray(a.terms) || !a.terms.length) return null;
  return a.terms.map((t) => decoder(t.name)).join(', ');
}

/**
 * Casse des noms. Une bonne partie des titres Premibel sont en capitales
 * (« POINT DE HONGRIE ZEUS NATUREL 92X12X520 ») : affichés tels quels dans le
 * Studio, ils crient. Un titre majoritairement en capitales passe en casse de
 * phrase ; le nom d'origine est conservé dans `nameSource`. Les dimensions
 * gardent leur « x » minuscule, et le nom du motif sa majuscule.
 */
function casse(nom) {
  const lettres = nom.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const majuscules = lettres.replace(/[^A-ZÀ-Þ]/g, '');
  let n = lettres.length && majuscules.length / lettres.length > 0.6 ? nom.toLocaleLowerCase('fr') : nom;
  n = n.replace(/(\d)\s*[xX]\s*(\d)/g, '$1x$2').replace(/point de hongrie/gi, 'Point de Hongrie');
  return n.charAt(0).toLocaleUpperCase('fr') + n.slice(1);
}

/** « 14,20mm » → « 14.2mm » ; « 600 à 1820 mm » → « 600 à 1820mm ». L'unité reste celle de la source. */
const dimension = (v) => (v ? v.replace(/(\d),(\d)/g, '$1.$2').replace(/\s+(mm|cm|m)\b/gi, '$1').trim() : null);

function classer(produit, ancetres) {
  const slugs = new Set();
  (produit.categories || []).forEach((c) => ancetres(c.id).forEach((s) => slugs.add(s)));
  const directes = new Set((produit.categories || []).map((c) => c.slug));
  if (!slugs.has(CATEGORIE_PARQUET)) return { garde: false, raison: 'hors catégorie Parquet' };
  const exclu = Object.keys(SOUS_ARBRES_EXCLUS).find((s) => slugs.has(s));
  if (exclu) return { garde: false, raison: SOUS_ARBRES_EXCLUS[exclu] };
  const attr = EXCLUSIONS_ATTRIBUT.find((r) => (attribut(produit, r.taxonomie) || '').split(', ').includes(r.valeur));
  if (attr) return { garde: false, raison: attr.raison };
  return { garde: true, slugs: new Set([...slugs, ...directes]) };
}

function normaliser(produit, slugs, familles) {
  const sku = decoder(produit.sku) || null;
  const motifs = [...new Set([...slugs].filter((s) => MOTIF_PAR_CATEGORIE[s]).map((s) => MOTIF_PAR_CATEGORIE[s]))];
  const versailles = [...slugs].some((s) => VERSAILLES.has(s));
  const couleurs = [...new Set([...slugs].filter((s) => TEINTE[s]))];
  const essence = attribut(produit, 'pa_essence');
  const largeur = dimension(attribut(produit, 'pa_largeur'));
  const longueur = dimension(attribut(produit, 'pa_longueur') || attribut(produit, 'pa_longueur_variable'));
  const epaisseur = dimension(attribut(produit, 'pa_epaisseur'));
  const type = slugs.has('parquet-massif') ? 'Massif' : slugs.has('parquet-flottant') ? 'Flottant' : null;

  const compatiblePatterns = versailles ? [] : ['lames', 'point-de-hongrie', 'baton-rompu'].filter((m) => motifs.includes(m));
  let visualStatus = 'unavailable';
  let visualReason = null;
  let visualFamily = null;
  if (versailles) visualReason = 'motif Versailles, non pris en charge par le moteur';
  else if (!compatiblePatterns.length) visualReason = 'aucune catégorie de motif chez Premibel';
  else if (!largeur) visualReason = 'largeur de lame absente';
  else if (largeurMm(largeur) > LAME_MAX_MM) visualReason = `largeur de ${largeur} : une dalle, pas une lame`;
  else if (essence !== 'Chêne') visualReason = `essence sans famille de rendu (${essence || 'non renseignée'})`;
  else if (couleurs.length !== 1) visualReason = couleurs.length ? `plusieurs couleurs déclarées (${couleurs.join(', ')})` : 'aucune catégorie de couleur chez Premibel';
  else {
    visualFamily = FAMILLE_PAR_COULEUR[couleurs[0]];
    if (!familles[visualFamily]) throw new Error(`famille de rendu ${visualFamily} absente de render-families.json`);
    visualStatus = 'approximate';
  }

  const image = (produit.images || [])[0] || null;
  return {
    id: sku,
    externalId: produit.id ?? null,
    sku,
    name: casse(decoder(produit.name)) || null,
    nameSource: decoder(produit.name) || null,
    slug: decoder(produit.slug) || null,
    species: essence,
    range: attribut(produit, 'pa_famille'),
    tone: couleurs.length === 1 ? TEINTE[couleurs[0]] : null,
    toneSource: couleurs.length === 1 ? couleurs[0] : null,
    finish: attribut(produit, 'pa_finition'),
    treatment: attribut(produit, 'pa_aspect'),
    type,
    pose: attribut(produit, 'pa_pose'),
    dimensions: { widthMm: largeur, lengthMm: longueur, thicknessMm: epaisseur },
    compatiblePatterns,
    defaultPattern: compatiblePatterns[0] || null,
    unsupportedPattern: versailles ? 'versailles' : null,
    visualStatus,
    visualReason,
    visualFamily,
    /* URL source, interne : remplacée par la vignette locale avant écriture,
       jamais publiée. L'image pleine taille n'est pas retenue. */
    sourceThumbnail: image ? urlPremibel(image.thumbnail || image.src) : null,
    thumbnail: null,
    sample: null,
    maps: { albedo: null, normal: null, roughness: null },
    plankVariants: [],
    displayOrder: 1000,
    active: true,
    productUrl: urlPremibel(produit.permalink),
  };
}

/* ------------------------------------------------------------------ */
/* Vignettes                                                           */
/* ------------------------------------------------------------------ */

/**
 * Dimensions d'un WebP, lues dans son en-tête — sans dépendance.
 * Rend `null` si le fichier n'est pas un WebP valide (RIFF … WEBP + VP8/VP8L/VP8X).
 */
function dimensionsWebp(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  if (buf.readUInt32LE(4) + 8 !== buf.length) return null;
  const morceau = buf.toString('ascii', 12, 16);
  if (morceau === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (morceau === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (morceau === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  return null;
}

/** Le format réel, lu dans le contenu — jamais dans l'extension ni le Content-Type. */
function formatReel(buf) {
  if (!buf || buf.length < 12) return 'vide';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'PNG';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'WEBP';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'GIF';
  if (/<(!doctype|html)/i.test(buf.toString('utf8', 0, 512))) return 'HTML';
  return 'inconnu';
}

/**
 * JPEG, PNG (ou GIF) → WebP carré, par `vignette-webp.py` (Pillow).
 * Seule dépendance de la synchronisation, et seulement pour ces sources : le
 * build n'en a pas besoin. Sans Pillow, l'erreur le dit et la fiche garde son
 * repli graphique.
 */
function convertir(buf) {
  const { spawnSync } = require('child_process');
  for (const python of ['python', 'python3', 'py']) {
    const r = spawnSync(python, [CONVERTISSEUR, String(TAILLE_VIGNETTE)], { input: buf, maxBuffer: 4 * 1024 * 1024, timeout: 30000 });
    if (r.error && r.error.code === 'ENOENT') continue;
    if (r.status === 0) return r.stdout;
    const message = String(r.stderr || '').trim() || `code ${r.status}`;
    throw Object.assign(new Error(`conversion : ${message}`), { definitif: true, etape: r.status === 3 ? 'encode' : 'decode' });
  }
  throw Object.assign(new Error('conversion : Python introuvable'), { definitif: true, etape: 'encode' });
}

/** Nom de fichier stable : le SKU, réduit aux caractères sûrs. Jamais le titre. */
const nomVignette = (sku) => `${String(sku).replace(/[^A-Za-z0-9_-]/g, '_')}.webp`;

async function telechargerVignette(url) {
  let derniere;
  for (let essai = 1; essai <= REPRISES; essai += 1) {
    const controle = new AbortController();
    const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
    try {
      /* Premibel négocie le format : demander du WebP le fait servir tel quel,
         sans réencodage de notre côté (le générateur n'a aucune dépendance). */
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'image/webp' }, signal: controle.signal });
      clearTimeout(minuterie);
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { definitif: true });
      const recu = Buffer.from(await r.arrayBuffer());
      const format = formatReel(recu);
      const source = { status: r.status, type: r.headers.get('content-type'), octets: recu.length, format };
      if (recu.length > SOURCE_MAX_OCTETS) throw Object.assign(new Error(`source trop lourde : ${recu.length} octets`), { definitif: true, etape: 'download', source });
      let buf;
      let converti = false;
      if (format === 'WEBP' && dimensionsWebp(recu)) {
        buf = recu;
      } else if (['JPEG', 'PNG', 'GIF'].includes(format)) {
        /* Original téléversé sans déclinaison WebP : on le convertit nous-mêmes. */
        buf = convertir(recu);
        converti = true;
      } else {
        throw Object.assign(new Error(`contenu non image (${format}, ${source.type})`), { definitif: true, etape: 'decode', source });
      }
      const dims = dimensionsWebp(buf);
      if (!dims) throw Object.assign(new Error('sortie WebP invalide'), { definitif: true, etape: 'encode', source });
      if (buf.length < VIGNETTE_MIN_OCTETS || buf.length > VIGNETTE_MAX_OCTETS) throw Object.assign(new Error(`vignette hors bornes : ${buf.length} octets`), { definitif: true, etape: 'encode', source });
      return { buf, dims, converti, source };
    } catch (erreur) {
      clearTimeout(minuterie);
      derniere = erreur;
      if (erreur.definitif || essai === REPRISES) break;
      await pause(800 * essai);
    }
  }
  throw derniere;
}

/**
 * Rend chaque fiche active maîtresse d'une vignette LOCALE, ou de `null`.
 *
 * Cache : une entrée par SKU, `{ source, octets, w, h }`. Si l'URL source n'a
 * pas changé et que le fichier local est un WebP valide, rien n'est téléchargé.
 * Une vignette qui échoue ne fait perdre que sa vignette : la fiche reste, avec
 * `thumbnail: null`, et l'échec est rapporté.
 */
async function vignettes(fiches, sec) {
  fs.mkdirSync(DOSSIER_VIGNETTES, { recursive: true });
  const index = fs.existsSync(INDEX_VIGNETTES) ? JSON.parse(fs.readFileSync(INDEX_VIGNETTES, 'utf8')) : {};
  const stats = { avecSource: 0, cache: 0, telechargees: 0, converties: 0, echecs: [], ecartees: [], octets: 0 };
  const nouvelIndex = {};
  const aTraiter = fiches.filter((f) => f.active);
  let i = 0;
  async function ouvrier() {
    while (i < aTraiter.length) {
      const f = aTraiter[i++];
      const source = f.sourceThumbnail;
      delete f.sourceThumbnail;
      if (!source) { f.thumbnail = null; continue; }
      stats.avecSource += 1;
      const nom = nomVignette(f.sku);
      const local = path.join(DOSSIER_VIGNETTES, nom);
      const connu = index[f.sku];
      /* Écartée à une passe précédente (placeholder, bandeau) et source inchangée :
         ni fichier ni téléchargement, la fiche garde son repli graphique. */
      if (connu && connu.source === source && connu.ecartee) {
        nouvelIndex[f.sku] = connu;
        f.thumbnail = null;
        f.thumbnailIssue = connu.ecartee.type;
        stats.ecartees.push({ sku: f.sku, ...connu.ecartee });
        continue;
      }
      if (connu && connu.source === source && fs.existsSync(local)) {
        const buf = fs.readFileSync(local);
        const dims = dimensionsWebp(buf);
        if (dims && buf.length === connu.octets) {
          stats.cache += 1; stats.octets += buf.length;
          nouvelIndex[f.sku] = connu;
          f.thumbnail = `${CHEMIN_PUBLIC_VIGNETTES}/${nom}`;
          continue;
        }
      }
      if (sec) { f.thumbnail = null; continue; }
      try {
        const { buf, dims, converti, source: recu } = await telechargerVignette(source);
        ecrireAtomique(local, buf);
        stats.telechargees += 1; stats.octets += buf.length;
        if (converti) stats.converties += 1;
        nouvelIndex[f.sku] = { source, octets: buf.length, w: dims.w, h: dims.h, formatSource: recu.format, octetsSource: recu.octets, converti };
        f.thumbnail = `${CHEMIN_PUBLIC_VIGNETTES}/${nom}`;
      } catch (erreur) {
        stats.echecs.push({ sku: f.sku, etape: erreur.etape || 'download', raison: erreur.message, ...(erreur.source || {}) });
        f.thumbnail = null;
      }
    }
  }
  await Promise.all(Array.from({ length: VIGNETTES_EN_PARALLELE }, ouvrier));
  if (!sec) ecarter(aTraiter, nouvelIndex, stats);
  /* Les fiches inactives gardent leur vignette locale si elle existe déjà. */
  for (const f of fiches.filter((x) => !x.active)) {
    delete f.sourceThumbnail;
    if (index[f.sku] && fs.existsSync(path.join(DOSSIER_VIGNETTES, nomVignette(f.sku)))) {
      nouvelIndex[f.sku] = index[f.sku];
      f.thumbnail = `${CHEMIN_PUBLIC_VIGNETTES}/${nomVignette(f.sku)}`;
    } else f.thumbnail = null;
  }
  return { stats, nouvelIndex };
}

/**
 * Empreintes des vignettes locales qui n'en ont pas encore (une passe Python
 * pour toutes), puis mise à l'écart de ce qui ne doit pas s'afficher comme
 * photo produit : visuel « image indisponible », photo à bandeau de prix.
 *
 * La fiche reste au catalogue avec `thumbnail: null` — le Studio montre son
 * repli graphique — et `thumbnailIssue` dit pourquoi. Le fichier local est
 * supprimé : il ne serait plus publié pour rien. L'entrée de cache, elle,
 * reste, marquée `ecartee` : la passe suivante ne retélécharge pas.
 */
function ecarter(fiches, index, stats) {
  const sansEmpreinte = fiches.filter((f) => f.thumbnail && index[f.sku] && !index[f.sku].empreinte);
  if (sansEmpreinte.length) {
    const { spawnSync } = require('child_process');
    const chemins = sansEmpreinte.map((f) => path.join(RACINE, f.thumbnail));
    let lu = null;
    for (const python of ['python', 'python3', 'py']) {
      const r = spawnSync(python, [EMPREINTES], { input: chemins.join('\n'), maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
      if (r.error && r.error.code === 'ENOENT') continue;
      if (r.status === 0) lu = JSON.parse(String(r.stdout));
      else console.warn(`Empreintes non calculées : ${String(r.stderr || '').trim() || `code ${r.status}`}`);
      break;
    }
    if (lu) sansEmpreinte.forEach((f, k) => { const e = lu[chemins[k]]; if (e) Object.assign(index[f.sku], e); });
  }
  for (const f of fiches) {
    if (!f.thumbnail) continue;
    const motif = QUALITE.vignetteEcartee(f.sku, index[f.sku]);
    if (!motif) continue;
    const local = path.join(RACINE, f.thumbnail);
    if (fs.existsSync(local)) fs.unlinkSync(local);
    index[f.sku] = { ...index[f.sku], ecartee: motif };
    f.thumbnail = null;
    f.thumbnailIssue = motif.type;
    stats.ecartees.push({ sku: f.sku, ...motif });
  }
}

/* ------------------------------------------------------------------ */
/* Contrôles avant écriture                                            */
/* ------------------------------------------------------------------ */

function doublons(fiches) {
  const erreurs = [];
  for (const cle of ['sku', 'slug', 'externalId']) {
    const vus = new Map();
    for (const f of fiches) {
      const v = f[cle];
      if (v === null || v === '' || v === undefined) { erreurs.push(`${cle} vide : « ${f.name} »`); continue; }
      if (vus.has(v)) erreurs.push(`${cle} en doublon : ${v} (« ${vus.get(v)} » et « ${f.name} »)`);
      else vus.set(v, f.name);
    }
  }
  return erreurs;
}

function sansPrix(objet, chemin = '') {
  const trouves = [];
  if (objet && typeof objet === 'object') {
    for (const [k, v] of Object.entries(objet)) {
      if (CLES_INTERDITES.test(k)) trouves.push(`${chemin}${k}`);
      trouves.push(...sansPrix(v, `${chemin}${k}.`));
    }
  }
  return trouves;
}

/* ------------------------------------------------------------------ */
/* Programme                                                           */
/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const sec = args.includes('--dry-run');
  const iFrom = args.indexOf('--from');
  const debut = Date.now();

  const familles = JSON.parse(fs.readFileSync(FAMILLES, 'utf8')).familles || {};
  const source = iFrom >= 0 ? rejouer(args[iFrom + 1]) : await telecharger();
  const { produits, categories, total, pages } = source;

  /* Complétude : tout ce qui a été annoncé a été reçu, une fois. */
  const ids = new Set(produits.map((p) => p.id));
  if (produits.length !== total) throw new Error(`réponse incomplète : ${produits.length} produits reçus pour ${total} annoncés`);
  if (ids.size !== produits.length) throw new Error(`identifiants en double dans la réponse (${produits.length - ids.size})`);

  const ancetres = arbre(categories);
  const exclus = {};
  const fiches = [];
  for (const p of produits) {
    const c = classer(p, ancetres);
    if (!c.garde) { exclus[c.raison] = (exclus[c.raison] || 0) + 1; continue; }
    fiches.push(normaliser(p, c.slugs, familles));
  }

  const erreurs = doublons(fiches);
  if (erreurs.length) throw new Error(`doublons ou identités vides — synchronisation refusée :\n  - ${erreurs.slice(0, 20).join('\n  - ')}`);

  /* Couche manuelle : le pilote apporte les familles de rendu choisies à l'œil
     sur les photos produit, et l'ordre d'affichage. Il ne crée aucune fiche. */
  const pilote = fs.existsSync(PILOTE) ? JSON.parse(fs.readFileSync(PILOTE, 'utf8')).produits || [] : [];
  const parSku = new Map(fiches.map((f) => [f.sku, f]));
  const dansApi = new Map(produits.map((p) => [decoder(p.sku), p]));
  const reprises = [];
  const piloteDisparus = [];
  for (const m of pilote) {
    const sku = m.sku || m.id;
    const f = parSku.get(sku);
    if (!f) {
      if (dansApi.has(sku)) {
        reprises.push(`${m.id} : présent chez Premibel mais exclu (${classer(dansApi.get(sku), ancetres).raison}) — non repris`);
      } else {
        /* Connu du pilote, absent d'une réponse COMPLÈTE : retiré chez Premibel.
           On garde la ligne, inactive, pour que ses anciens liens profonds se
           résolvent en « retiré » plutôt qu'en inconnu. */
        piloteDisparus.push(sku);
        reprises.push(`${m.id} : absent de l'API Premibel — conservé inactif`);
      }
      continue;
    }
    /* Motif : la donnée Premibel prime. Le motif saisi au pilote ne sert que si
       Premibel n'en déclare aucun (fiche rangée seulement en « fin de série »). */
    if (!f.compatiblePatterns.length && !f.unsupportedPattern && Array.isArray(m.compatiblePatterns) && m.compatiblePatterns.length) {
      f.compatiblePatterns = m.compatiblePatterns.filter((x) => ['lames', 'point-de-hongrie', 'baton-rompu'].includes(x));
      f.defaultPattern = f.compatiblePatterns.includes(m.defaultPattern) ? m.defaultPattern : f.compatiblePatterns[0] || null;
      f.patternSource = 'pilote (relevé du 03/09/2026)';
    }
    const famille = m.visual && m.visual.familyId;
    if (famille && familles[famille] && f.compatiblePatterns.length && f.dimensions.widthMm && !f.unsupportedPattern) {
      f.visualFamily = famille;
      f.visualStatus = 'approximate';
      f.visualReason = null;
      f.visualOverride = 'famille choisie sur la photo produit (pilote du 09/09/2026)';
    }
    if (Number.isFinite(m.displayOrder)) f.displayOrder = m.displayOrder;
    /* Le nom relu à la main au pilote, quand il existe, prime sur la casse automatique. */
    if (m.name) f.name = m.name;
    reprises.push(`${m.id} : repris (famille ${f.visualFamily || '—'}, ordre ${f.displayOrder})`);
  }

  /* Disparitions : seulement après une synchronisation complète et contrôlée. */
  const precedent = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, 'utf8')) : null;
  const maintenant = new Date().toISOString();
  const inactives = [];
  if (precedent && Array.isArray(precedent.produits)) {
    const actuels = new Set(fiches.map((f) => f.sku));
    const disparus = precedent.produits.filter((p) => !actuels.has(p.sku));
    const activesAvant = precedent.produits.filter((p) => p.active).length;
    const disparusActifs = disparus.filter((p) => p.active).length;
    if (activesAvant && disparusActifs / activesAvant > SEUIL_DISPARITION && !args.includes('--accepter-disparitions')) {
      throw new Error(`${disparusActifs} références actives sur ${activesAvant} disparaîtraient (> ${SEUIL_DISPARITION * 100} %) : export suspect, synchronisation refusée. Vérifier, puis relancer avec --accepter-disparitions.`);
    }
    for (const p of disparus) {
      /* Un rejeu de pages locales ne prouve pas sa complétude (pas d'en-tête
         X-WP-Total) : il ne désactive rien, il recopie l'état précédent. */
      if (source.rejoue) inactives.push(p);
      else inactives.push({ ...p, active: false, deactivatedAt: p.deactivatedAt || maintenant });
    }
  }
  /* Première synchronisation : le pilote tient lieu de fichier précédent pour
     les références qu'il connaissait et que Premibel ne publie plus. */
  for (const sku of piloteDisparus) {
    if (inactives.some((p) => p.sku === sku)) continue;
    const m = pilote.find((x) => (x.sku || x.id) === sku);
    inactives.push({
      id: m.id, externalId: m.externalId ?? null, sku, name: m.name, slug: m.slug,
      species: m.woodSpecies ?? null, range: m.range ?? null, tone: m.tone ?? null, toneSource: null,
      finish: m.finish ?? null, treatment: m.surfaceTreatment ?? null, type: m.parquetType ?? null, pose: null,
      dimensions: m.dimensions || { widthMm: null, lengthMm: null, thicknessMm: null },
      compatiblePatterns: m.compatiblePatterns || [], defaultPattern: m.defaultPattern || null, unsupportedPattern: m.unsupportedPattern || null,
      visualStatus: 'unavailable', visualReason: 'référence retirée par Premibel', visualFamily: null,
      thumbnail: null, sample: null, maps: { albedo: null, normal: null, roughness: null }, plankVariants: [],
      displayOrder: m.displayOrder ?? 1000, active: false, deactivatedAt: maintenant, productUrl: null,
    });
  }

  fiches.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'fr'));
  for (const p of inactives) delete p.image;
  const tous = [...fiches, ...inactives];
  const { stats: statsVignettes, nouvelIndex } = await vignettes(tous, sec);
  const compte = (pred) => tous.filter(pred).length;
  const rapport = {
    produitsApi: produits.length,
    pages,
    parquets: fiches.length,
    exclus,
    actifs: compte((f) => f.active),
    inactifs: compte((f) => !f.active),
    vignettes: {
      avecSource: statsVignettes.avecSource,
      enCache: statsVignettes.cache,
      telechargees: statsVignettes.telechargees,
      converties: statsVignettes.converties,
      echecs: statsVignettes.echecs.length,
      /* Détail des échecs, sans URL : la source reste dans le cache, hors du site. */
      detailEchecs: statsVignettes.echecs.map((e) => ({ sku: e.sku, etape: e.etape, raison: e.raison, format: e.format || null })),
      locales: compte((f) => f.active && f.thumbnail),
      /* Écartées : la fiche reste, la photo ne s'affiche pas (repli graphique). */
      ecartees: statsVignettes.ecartees.map((e) => ({ sku: e.sku, type: e.type, raison: e.raison })),
      poidsKo: Math.round(statsVignettes.octets / 1024),
    },
    visualStatus: {
      ready: compte((f) => f.active && f.visualStatus === 'ready'),
      approximate: compte((f) => f.active && f.visualStatus === 'approximate'),
      unavailable: compte((f) => f.active && f.visualStatus === 'unavailable'),
    },
  };

  const document = {
    version: 1,
    source: 'premibel',
    generatedAt: maintenant,
    endpoint: PRODUITS,
    note: 'Fichier PRODUIT par _generator/sync-premibel.js — ne pas éditer à la main. Les choix manuels vivent dans data/products.premibel-pilot.json (familles de rendu) ; les règles sont dans le script et dans docs/premibel-sync-contract.md. Aucun prix.',
    rapport,
    produits: tous,
  };
  const prix = sansPrix(document);
  if (prix.length) throw new Error(`clé de prix dans le fichier produit : ${prix.slice(0, 5).join(', ')}`);

  console.log(JSON.stringify({ ...rapport, rejoue: Boolean(source.rejoue), dureeMs: Date.now() - debut }, null, 2));
  console.log(`Pilote : ${reprises.length} ligne(s)\n  ${reprises.join('\n  ')}`);
  if (statsVignettes.echecs.length) console.warn(`Vignettes en échec (fiches conservées, repli graphique) :\n  ${statsVignettes.echecs.map((e) => `${e.sku} [${e.etape}] ${e.raison}${e.format ? ` — reçu ${e.format}, ${e.octets} o, ${e.type}` : ''}`).join('\n  ')}`);
  if (sec) { console.log('\n--dry-run : rien n’est écrit.'); return; }
  ecrireAtomique(SORTIE, Buffer.from(`${JSON.stringify(document)}\n`, 'utf8'));
  ecrireAtomique(INDEX_VIGNETTES, Buffer.from(`${JSON.stringify(nouvelIndex, null, 1)}\n`, 'utf8'));
  console.log(`\nÉcrit : ${path.relative(RACINE, SORTIE)} (${(fs.statSync(SORTIE).size / 1024).toFixed(0)} Ko)`);
}

if (require.main === module) {
  main().catch((erreur) => {
    console.error(`\nSynchronisation Premibel ÉCHOUÉE — le dernier fichier valide reste en place.\n${erreur.message}`);
    process.exit(1);
  });
}

module.exports = { formatReel, dimensionsWebp, nomVignette, CHEMIN_PUBLIC_VIGNETTES, classer, normaliser, doublons, sansPrix, MOTIF_PAR_CATEGORIE, FAMILLE_PAR_COULEUR, TEINTE, SOUS_ARBRES_EXCLUS };
