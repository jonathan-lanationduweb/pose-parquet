/**
 * Visualiseur produit — l'UX validée, branchée directement sur le moteur.
 *
 * Ce module remplace le prototype `tools/product-concept.html` de
 * pose-parquet-ai comme base technique. Le prototype pilotait le Studio dans
 * une iframe par un pont `window.__studio`, avec des captures statiques en
 * amorce : deux applications, deux viewports à synchroniser, un cache de
 * captures, une renégociation au rechargement. Ici il n'y a qu'UNE page :
 *
 *   catalogue Premibel  →  matériau  →  renderer.paint(canvas)  →  écran
 *
 * Les modules de scène (`js/scene/*`) sont importés tels quels ; aucun n'est
 * dupliqué, aucun faux parquet n'est dessiné ici. Le viewport transforme un
 * seul conteneur dont la photo, le rendu et la version B sont les enfants :
 * ils ne peuvent pas se désynchroniser.
 *
 * Une seule source de vérité : `state`. Chaque geste modifie `state`, puis
 * `paintChrome()` et `schedule()` en déduisent l'écran. Aucun état n'est lu
 * dans le DOM.
 */
import { qs, on } from '../utils/dom.js';
import { analyzeScene, loadSceneIndex, scenesBibliotheque } from '../scene/analyzer.js';
import { loadImage, loadFile } from '../scene/image-loader.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { quandCartesPretes } from '../scene/material.js';
import { loadCatalog, swatchFor } from '../studio/catalog.js';
import { createViewport, ZOOM_MAX } from './viewport.js';

/** Les cinq références pilote Premibel, dans l'ordre du catalogue. */
const PILOT = ['POINF36005', 'BTRPF39009', 'CHENF39031', 'CHENF36014', 'CHENF36015'];

const PATTERNS = { lames: 'Lames', 'point-de-hongrie': 'Point de Hongrie', 'baton-rompu': 'Bâton rompu' };

/* Le moteur tourne le motif dans le plan du sol (`config.angle`) : ces trois
   valeurs ont un effet réel, vérifié à l'écran. */
const ORIENTATIONS = [
  [0, 'Dans la longueur', '<path d="M3 5h28M3 10h28M3 15h28" />'],
  [90, 'Dans la largeur', '<path d="M7 3v14M17 3v14M27 3v14" />'],
  [45, 'En diagonale', '<path d="M3 17L17 3M11 17L25 3M19 17L31 5" />'],
];

const REGROUPEMENT_MS = 70;
const DEV = (() => {
  try { return new URLSearchParams(window.location.search).get('dev') === '1'; } catch { return false; }
})();

const svg = (path, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const ICON = {
  room: '<rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 16l4.5-4 3.5 3 3-2.5L21 17" />',
  floor: '<path d="M3 7h18M3 12h18M3 17h18M9 7v5M15 12v5" />',
  custom: '<path d="M4 8h10M18 8h2M4 16h4M12 16h8" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" />',
  ba: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14" />',
  cmp: '<path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />',
  full: '<path d="M4 9V5.5A1.5 1.5 0 015.5 4H9M15 4h3.5A1.5 1.5 0 0120 5.5V9M20 15v3.5a1.5 1.5 0 01-1.5 1.5H15M9 20H5.5A1.5 1.5 0 014 18.5V15" />',
  fit: '<circle cx="12" cy="12" r="3.4" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />',
  heart: '<path d="M12 20.5s-7.5-4.7-7.5-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 017.5 3.3c0 5.5-7.5 10.2-7.5 10.2z" />',
  menu: '<path d="M4 7h16M4 12h16M4 17h16" />',
  arrow: '<path d="M9 6l6 6-6 6" />',
  close: '<path d="M6 6l12 12M18 6L6 18" />',
  tick: '<path d="M20 6L9 17l-5-5" />',
  import: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />',
};
const heart = (on, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON.heart}</svg>`;

/** « Point de Hongrie Zeus Naturel 92x12x520 » → « Point de Hongrie Zeus Naturel ». */
const nomCourt = (material) =>
  String(material.name || material.id).replace(/\s*\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\s*(?:mm)?\s*$/i, '').trim();

export async function mountProduct(root) {
  const base = root.dataset.base || '../';

  /* ---------------- Données ---------------- */
  const renderer = createSceneRenderer();
  const catalog = await loadCatalog(base);
  const sceneIndex = await loadSceneIndex(base);
  const rooms = scenesBibliotheque(sceneIndex);
  const products = PILOT.map((id) => catalog.get(id)).filter(Boolean);
  if (!products.length) throw new Error('Aucune référence pilote dans le catalogue');
  const productOf = (id) => catalog.get(id);
  const fiche = (material) => material.product || {};
  const widthMm = (material) => {
    const d = fiche(material).dimensions || {};
    return d.widthMm || Math.round((material.plank && material.plank.width || 0) * 1000);
  };

  /* ---------------- L'état : une seule source de vérité ---------------- */
  const state = {
    room: null,
    roomLabel: '',
    scene: null,                 /* SceneData de la pièce ouverte, ou null */
    photo: null,                 /* photo importée : { name, width, height } */
    product: products[0].id,
    rendererSettings: { angle: 0 },
    comparison: null,            /* { b: productId } */
    favoriteIds: new Set(),
    originalMode: 'off',         /* 'off' | 'ba' : avant / après */
    ui: {
      screen: 'start',           /* 'start' | 'room' | 'photo' */
      panel: null,               /* 'rooms' | 'catalog' | 'custom' */
      menu: false,
      picking: false,            /* le prochain choix de produit devient B */
      immersive: false,
      split: 0.5,
      catalogueView: 'all',      /* 'all' | 'favourites' */
      patternFilter: null,
    },
    /* Numéro de la dernière intention : un chargement asynchrone qui revient
       avec un autre numéro est périmé et ne s'applique pas. */
    intent: 0,
    lastMs: null,
    /* Nombre de rendus aboutis : sert aux parcours de test pour attendre un
       VRAI rendu, pas un statut qui n'a pas encore bougé. */
    renders: 0,
  };

  /* ---------------- DOM ---------------- */
  root.className = 'pv';
  root.innerHTML = `
    <header class="pv__header">
      <a class="pv__brand" href="${base}index.html"><span class="pv__mark">✦</span><span><b>Pose Parquet</b><small>Visualisez. Imaginez. Réalisez.</small></span></a>
      <button class="hbtn" type="button" data-h-rooms hidden>${svg(ICON.room, 15)}Changer de pièce</button>
      <button class="hbtn" type="button" data-h-fav aria-pressed="false">${heart(false, 16)}Favoris <span class="cnt" data-fav-count hidden>0</span></button>
      <button class="hbtn" type="button" data-h-menu aria-expanded="false" aria-label="Menu">${svg(ICON.menu, 17)}</button>
    </header>

    <section class="pv__start" data-start>
      <div class="start__inner">
        <h1>Visualisez votre parquet chez vous</h1>
        <p class="start__lead">Importez votre intérieur ou essayez immédiatement avec une pièce.</p>
        <div class="start__doors">
          <button class="door" type="button" data-import>${svg(ICON.import, 20)}<b>Importer ma photo</b><span>Votre pièce, telle qu'elle est. Rien ne quitte votre ordinateur.</span></button>
          <button class="door" type="button" data-open-rooms>${svg(ICON.room, 20)}<b>Choisir une pièce</b><span>${rooms.length} intérieurs prêts à essayer.</span></button>
        </div>
        <p class="start__label">Ou essayez directement</p>
        <div class="rooms" data-quick-rooms></div>
      </div>
    </section>
    <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file />

    <main class="pv__stage" data-stage hidden role="group" aria-label="Vue de la pièce. Molette pour zoomer, glisser pour déplacer.">
      <div class="pv-scene">
        <div class="pv-layer" data-layer="photo"><canvas data-photo></canvas></div>
        <div class="pv-layer" data-layer="b" hidden><canvas data-b></canvas></div>
        <div class="pv-clip" data-clip><div class="pv-layer" data-layer="a"><canvas data-a></canvas></div></div>
      </div>
      <div class="pv-split" data-split hidden></div>
      <span class="pv-tag" data-tag-a hidden>version A</span>
      <span class="pv-tag" data-tag-b hidden>version B</span>

      <nav class="pv-nav" data-nav>
        <button type="button" data-nav-rooms><span class="ic">${svg(ICON.room)}</span><span class="tx"><b>Changer de pièce</b><span data-nav-room>—</span></span><span class="ar">${svg(ICON.arrow, 12)}</span></button>
        <button type="button" data-nav-catalog><span class="ic">${svg(ICON.floor)}</span><span class="tx"><b>Choisir un parquet</b><span data-nav-product>—</span></span><span class="ar">${svg(ICON.arrow, 12)}</span></button>
        <button type="button" data-nav-custom><span class="ic">${svg(ICON.custom)}</span><span class="tx"><b>Personnaliser</b><span data-nav-custom-val>—</span></span><span class="ar">${svg(ICON.arrow, 12)}</span></button>
      </nav>

      <div class="pv-tools" data-tools>
        <button type="button" data-ba aria-pressed="false">${svg(ICON.ba, 15)}<span>Avant / après</span></button>
        <button type="button" data-cmp aria-pressed="false">${svg(ICON.cmp, 15)}<span>Comparer</span></button>
        <button type="button" data-full aria-label="Plein écran">${svg(ICON.full, 15)}</button>
      </div>

      <aside class="pv-card" data-card hidden></aside>
      <aside class="pv-card pv-card--b" data-card-b hidden></aside>

      <div class="pv-veil" data-veil hidden>
        <div class="box">
          <h2>Votre photo est affichée. Le parquet, pas encore.</h2>
          <p>Poser un parquet sur une photo demande de connaître son sol : où il commence, où il s'arrête, comment il fuit. Cette analyse n'est pas connectée à cette version — et un sol deviné serait un sol faux.</p>
          <div class="acts">
            <button class="btn warm" type="button" data-veil-rooms>Tester avec une pièce d'exemple</button>
            <button class="btn" type="button" data-veil-import>Essayer une autre photo</button>
            <button class="btn quiet" type="button" data-veil-explore>Explorer ma photo quand même</button>
          </div>
        </div>
      </div>

      <div class="pv-status" data-status data-kind="ok" hidden><span class="dot">${svg(ICON.tick, 10)}</span><span data-status-text>Pièce prête</span></div>

      <div class="pv-zoom" data-zoom>
        <button type="button" data-z-out aria-label="Zoom arrière">−</button>
        <button type="button" data-level aria-label="Niveau de zoom, cliquer pour revenir au cadrage immersif" title="Cadrage immersif (100 %)">100 %</button>
        <button type="button" data-z-in aria-label="Zoom avant">+</button>
        <span class="sep"></span>
        <button type="button" data-fit aria-label="Voir toute la photo" title="Ajuster : voir toute la photo">${svg(ICON.fit, 14)}</button>
        <button type="button" data-z-full aria-label="Plein écran">${svg(ICON.full, 14)}</button>
      </div>
      <div class="pv-toast" data-toast role="status"></div>
    </main>

    <div class="pv-scrim" data-scrim hidden></div>
    <aside class="pv-sheet" data-sheet="rooms" hidden role="dialog" aria-label="Choisir une pièce">
      <div class="pv-sheet__head"><h2>Choisir une pièce</h2><span class="count">(${rooms.length})</span><button class="close" type="button" data-close aria-label="Fermer">${svg(ICON.close)}</button></div>
      <div class="pv-sheet__body"><div class="rooms" data-room-grid></div></div>
    </aside>
    <aside class="pv-sheet" data-sheet="catalog" hidden role="dialog" aria-label="Choisir un parquet">
      <div class="pv-sheet__head"><h2>Choisir un parquet</h2><span class="count" data-cat-count></span><button class="close" type="button" data-close aria-label="Fermer">${svg(ICON.close)}</button></div>
      <div class="pv-sheet__body"><div class="chips" data-cat-filters></div><div class="prods" data-prods></div></div>
    </aside>
    <aside class="pv-sheet" data-sheet="custom" hidden role="dialog" aria-label="Personnaliser">
      <div class="pv-sheet__head"><h2>Personnaliser</h2><button class="close" type="button" data-close aria-label="Fermer">${svg(ICON.close)}</button></div>
      <div class="pv-sheet__body" data-custom></div>
    </aside>
    <div class="pv-menu" data-menu hidden>
      <button class="mi" type="button" data-menu-import>Importer une photo</button>
      <button class="mi" type="button" data-menu-rooms>Choisir une pièce</button>
      <div class="sepm"></div>
      <a class="mi" href="${base}outils/studio.html">Ouvrir le Studio complet</a>
      <a class="mi" href="${base}outils/visualiseur.html">À propos du visualiseur</a>
    </div>`;

  const $ = (sel) => qs(sel, root);
  const stage = $('[data-stage]');
  const canvasPhoto = $('[data-photo]');
  const canvasA = $('[data-a]');
  const canvasB = $('[data-b]');
  const layerB = $('[data-layer="b"]');
  const clip = $('[data-clip]');
  const split = $('[data-split]');
  const fileInput = $('[data-file]');

  /* ---------------- Viewport ---------------- */
  const sceneSize = () => {
    if (state.scene && renderer.size) return { w: renderer.size.width, h: renderer.size.height };
    if (state.photo) return { w: state.photo.width, h: state.photo.height };
    return { w: 1600, h: 1067 };
  };
  const viewport = createViewport({
    stage,
    layers: () => [...root.querySelectorAll('.pv-layer')],
    sceneSize,
    onChange: (vp) => {
      $('[data-level]').textContent = `${Math.round(vp.z * 100)} %`;
      $('[data-z-out]').disabled = vp.z <= viewport.zoomFloor + 1e-4;
      $('[data-z-in]').disabled = vp.z >= ZOOM_MAX - 1e-4;
      $('[data-fit]').disabled = vp.z <= viewport.zContain + 1e-4;
    },
  });

  /* ---------------- Rendu ---------------- */
  let pending = false;
  let regroupement = 0;
  let t0 = 0;

  const paintConfig = (productId) => {
    const material = productOf(productId);
    /* `width: null` : la largeur vient du produit lui-même — `toMaterial()`
       a fait de ses dimensions réelles le profil de son motif. Un Zeus de
       92 × 520 mm est un chevron de 92 × 520 mm, pas un réglage. */
    return { material, materialId: productId, pattern: material.defaultPattern, angle: state.rendererSettings.angle, width: null, scale: 1 };
  };

  function setStatus(text, kind) {
    const el = $('[data-status]');
    el.hidden = state.ui.screen !== 'room';
    el.dataset.kind = kind || 'ok';
    $('[data-status-text]').textContent = text;
  }

  function paintAll() {
    pending = false;
    if (!state.scene || !renderer.ready) return;
    const okA = renderer.paint(canvasA, paintConfig(state.product), null, 1);
    const okB = state.comparison ? renderer.paint(canvasB, paintConfig(state.comparison.b), null, 1) : true;
    if ((!okA || !okB) && renderer.enAttente) {
      /* Les cartes se fabriquent dans le worker : `quandCartesPretes`
         repeindra, en relisant l'état courant — le dernier choix gagne. */
      setStatus('Préparation du rendu…', 'busy');
      return;
    }
    if (!okA) { setStatus('Rendu impossible pour cette pièce', 'warn'); return; }
    state.renders += 1;
    if (t0) { state.lastMs = Math.round(performance.now() - t0); t0 = 0; }
    setStatus(DEV && state.lastMs != null ? `Pièce prête · ${state.lastMs} ms` : 'Pièce prête', 'ok');
    paintChrome();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(paintAll, 0);
  }
  /** Regroupe les demandes rapprochées : trois clics rapides = un rendu. */
  function demandeRendu() {
    clearTimeout(regroupement);
    if (!t0) t0 = performance.now();
    regroupement = setTimeout(schedule, REGROUPEMENT_MS);
  }
  quandCartesPretes(() => { if (renderer.ready && state.scene) schedule(); });

  /* ---------------- Chrome : tout se déduit de l'état ---------------- */
  function cardHtml(material, side) {
    const p = fiche(material);
    const fav = state.favoriteIds.has(material.id);
    const lien = p.productUrl
      ? `<a class="fiche" href="${p.productUrl}" target="_blank" rel="noopener noreferrer">VOIR LA FICHE PREMIBEL</a>` : '';
    return `<span class="sw" data-swatch="${material.id}"></span>
      <b>${nomCourt(material)}</b>
      <span class="dim">${PATTERNS[material.defaultPattern] || material.defaultPattern} · ${widthMm(material)} mm</span>
      <span class="ref">Réf. ${p.sku || material.id}</span>
      ${lien}
      <span class="row">
        <button type="button" data-open-custom>Personnaliser</button>
        <span class="sep"></span>
        <button class="fav" type="button" data-fav="${material.id}" aria-pressed="${fav}" aria-label="Favori">${heart(fav)}</button>
        <span class="sep"></span>
        <button type="button" data-cmp-side="${side}">${side === 'B' ? 'Changer' : 'Comparer'}</button>
      </span>`;
  }
  function poserSwatch(host) {
    host.querySelectorAll('[data-swatch]').forEach((slot) => {
      const material = productOf(slot.dataset.swatch);
      if (!material) return;
      const sw = swatchFor(material);
      const c = document.createElement('canvas');
      c.width = sw.width; c.height = sw.height;
      c.getContext('2d').drawImage(sw, 0, 0);
      slot.innerHTML = ''; slot.appendChild(c);
    });
  }

  function paintChrome() {
    const inRoom = state.ui.screen === 'room';
    const inPhoto = state.ui.screen === 'photo';
    const hasRender = inRoom && canvasA.width > 0;
    $('[data-start]').hidden = state.ui.screen !== 'start';
    stage.hidden = state.ui.screen === 'start';
    $('[data-h-rooms]').hidden = state.ui.screen === 'start';
    $('[data-nav]').hidden = !inRoom;
    $('[data-tools]').hidden = !hasRender;
    $('[data-status]').hidden = !inRoom;
    $('[data-veil]').hidden = !(inPhoto && state.ui.veil);

    const cut = hasRender && (state.originalMode === 'ba' || Boolean(state.comparison));
    clip.style.clipPath = cut ? `inset(0 ${((1 - state.ui.split) * 100).toFixed(2)}% 0 0)` : 'none';
    split.hidden = !cut;
    if (cut) split.style.left = `${state.ui.split * 100}%`;
    layerB.hidden = !(hasRender && state.comparison);
    $('[data-tag-a]').hidden = !(hasRender && state.comparison);
    $('[data-tag-b]').hidden = !(hasRender && state.comparison);
    if (state.comparison) {
      $('[data-tag-a]').style.left = `calc(${state.ui.split * 100}% - 84px)`;
      $('[data-tag-b]').style.left = `calc(${state.ui.split * 100}% + 12px)`;
    }
    $('[data-ba]').setAttribute('aria-pressed', String(state.originalMode === 'ba'));
    $('[data-cmp]').setAttribute('aria-pressed', String(Boolean(state.comparison)));

    /* cartes */
    const card = $('[data-card]');
    const cardB = $('[data-card-b]');
    card.hidden = !hasRender;
    if (hasRender) { card.innerHTML = cardHtml(productOf(state.product), 'A'); poserSwatch(card); }
    cardB.hidden = !(hasRender && state.comparison);
    if (hasRender && state.comparison) { cardB.innerHTML = cardHtml(productOf(state.comparison.b), 'B'); poserSwatch(cardB); }
    $('[data-nav]').hidden = !inRoom || Boolean(state.comparison);

    /* navigation */
    const m = productOf(state.product);
    $('[data-nav-room]').textContent = state.roomLabel || '—';
    $('[data-nav-product]').textContent = nomCourt(m);
    const o = ORIENTATIONS.find(([d]) => d === state.rendererSettings.angle);
    $('[data-nav-custom-val]').textContent = `${PATTERNS[m.defaultPattern]} · ${widthMm(m)} mm${o ? ` · ${o[1].toLowerCase()}` : ''}`;

    /* favoris */
    const n = state.favoriteIds.size;
    $('[data-fav-count]').textContent = String(n);
    $('[data-fav-count]').hidden = n === 0;
    $('[data-h-fav]').setAttribute('aria-pressed', String(n > 0));

    /* panneaux */
    root.querySelectorAll('[data-sheet]').forEach((s) => { s.hidden = s.dataset.sheet !== state.ui.panel; });
    $('[data-scrim]').hidden = !state.ui.panel;
    $('[data-menu]').hidden = !state.ui.menu;
    $('[data-h-menu]').setAttribute('aria-expanded', String(state.ui.menu));
    if (state.ui.panel === 'rooms') paintRooms();
    if (state.ui.panel === 'catalog') paintCatalogue();
    if (state.ui.panel === 'custom') paintCustom();
  }

  /* ---------------- Pièces ---------------- */
  const roomCard = (r, current) => {
    const stem = r.file.replace(/\.jpg$/, '');
    return `<button class="rcard" type="button" data-room="${r.id}" aria-pressed="${r.id === current}">
      <span class="ph"><img alt="" src="${base}assets/images/${stem}-640.jpg" decoding="async" />${r.id === current ? `<span class="tick">${svg(ICON.tick, 12)}</span>` : ''}</span>
      <span class="nm">${r.label}</span><span class="cat">${r.highlight || ''}</span></button>`;
  };
  function paintRooms() { $('[data-room-grid]').innerHTML = rooms.map((r) => roomCard(r, state.room)).join(''); }
  $('[data-quick-rooms]').innerHTML = rooms.slice(0, 3).map((r) => roomCard(r, null)).join('');

  async function openRoom(id) {
    const entry = rooms.find((r) => r.id === id);
    if (!entry) return;
    const intent = ++state.intent;
    t0 = performance.now();
    closeAll();
    state.ui.screen = 'room';
    setStatus('Chargement…', 'busy');
    paintChrome();
    try {
      const scene = await analyzeScene({ sceneId: id, base });
      const prepared = await loadImage(`${base}assets/images/${scene.image.file}`);
      if (intent !== state.intent) return;          /* une autre intention est passée */
      renderer.setScene(scene, prepared);
      state.scene = scene;
      state.room = id;
      state.roomLabel = scene.label || entry.label;
      state.photo = null;
      canvasPhoto.width = prepared.width; canvasPhoto.height = prepared.height;
      canvasPhoto.getContext('2d').drawImage(prepared.canvas, 0, 0);
      /* La couche A prend ses dimensions dès maintenant : la photo d'origine
         s'affiche à sa place finale, le rendu vient la remplacer sans saut. */
      canvasA.width = prepared.width; canvasA.height = prepared.height;
      viewport.scheduleFit();
      toast(state.roomLabel);
      schedule();
      paintChrome();
    } catch (error) {
      if (intent !== state.intent) return;
      setStatus('Cette pièce n’a pas pu être chargée', 'warn');
      toast('Cette pièce n’a pas pu être chargée');
      console.error('[visualiseur produit]', error);
    }
  }

  /* ---------------- Photo importée ---------------- */
  async function importPhoto(file) {
    if (!file) return;
    const intent = ++state.intent;
    closeAll();
    try {
      const prepared = await loadFile(file);
      if (intent !== state.intent) return;
      state.scene = null;
      state.room = null;
      state.roomLabel = '';
      state.photo = { name: prepared.name, width: prepared.width, height: prepared.height };
      state.comparison = null;
      state.originalMode = 'off';
      state.ui.screen = 'photo';
      state.ui.veil = true;
      canvasPhoto.width = prepared.width; canvasPhoto.height = prepared.height;
      canvasPhoto.getContext('2d').drawImage(prepared.canvas, 0, 0);
      /* Aucun parquet sur une photo dont on ne connaît pas le sol : on le dit. */
      canvasA.width = 0; canvasA.height = 0; canvasB.width = 0; canvasB.height = 0;
      viewport.scheduleFit();
      paintChrome();
    } catch (error) {
      if (intent !== state.intent) return;
      toast(error.message || 'Cette image n’a pas pu être lue');
    }
  }

  /* ---------------- Catalogue ---------------- */
  const presentPatterns = () => [...new Set(products.map((p) => p.defaultPattern))];
  function visibleProducts() {
    const favs = state.ui.catalogueView === 'favourites';
    let list = favs ? products.filter((p) => state.favoriteIds.has(p.id)) : products;
    if (!favs && state.ui.patternFilter) list = list.filter((p) => p.defaultPattern === state.ui.patternFilter);
    return list;
  }
  function paintCatalogue() {
    if (state.ui.catalogueView === 'favourites' && !state.favoriteIds.size) state.ui.catalogueView = 'all';
    const favs = state.ui.catalogueView === 'favourites';
    $('[data-cat-filters]').innerHTML = favs ? '' : presentPatterns().map((k) =>
      `<button class="chip" type="button" data-filter="${k}" aria-pressed="${state.ui.patternFilter === k}">${PATTERNS[k]}</button>`).join('');
    const list = visibleProducts();
    $('[data-cat-count]').textContent = state.ui.picking
      ? '(choisissez la version B)' : favs ? `(${list.length} en favoris)` : `(${list.length})`;
    $('[data-prods]').innerHTML = list.map((p) => `<button class="pd" type="button" data-id="${p.id}" aria-pressed="${p.id === state.product}">
        <span class="tex" data-swatch="${p.id}"></span>
        <span class="hh" data-fav="${p.id}" role="button" aria-pressed="${state.favoriteIds.has(p.id)}" aria-label="Favori">${heart(state.favoriteIds.has(p.id), 13)}</span>
        <span class="nm">${nomCourt(p)}</span>
        <span class="rf">${PATTERNS[p.defaultPattern]} · ${widthMm(p)} mm — Réf. ${fiche(p).sku || p.id}</span></button>`).join('');
    poserSwatch($('[data-prods]'));
  }

  function select(id) {
    const material = productOf(id);
    if (!material) return;
    if (state.ui.picking) {
      /* Comparer une référence à elle-même n'a aucun sens. */
      if (id === state.product) { toast('Choisissez une autre référence que celle déjà posée'); return; }
      state.intent += 1;
      state.comparison = { b: id };
      state.ui.picking = false;
      state.ui.split = 0.5;
      state.originalMode = 'off';
      closeAll();
      demandeRendu();
      paintChrome();
      toast('Faites glisser le séparateur');
      return;
    }
    state.intent += 1;
    state.product = id;
    demandeRendu();
    paintChrome();
    toast(`${nomCourt(material)} · ${PATTERNS[material.defaultPattern]}`);
  }

  /* ---------------- Personnaliser ---------------- */
  const otherWith = (pred) => products.find((p) => p.id !== state.product && pred(p));
  function paintCustom() {
    const m = productOf(state.product);
    const p = fiche(m);
    const widths = [...new Set(products.map(widthMm))].sort((a, b) => a - b);
    $('[data-custom]').innerHTML = `
      <div class="sect"><p class="intro"><strong>${nomCourt(m)}</strong> est une référence définie : ${PATTERNS[m.defaultPattern].toLowerCase()}, ${widthMm(m)} mm${p.finish ? `, ${String(p.finish).toLowerCase()}` : ''}. La changer en ferait un produit qui n'existe pas. Modifier un critère cherche donc une <em>autre référence</em> — le sens de pose excepté, qui est un réglage du rendu.</p></div>
      <div class="sect"><h3>Sens de pose</h3><div class="orient" data-orient>${ORIENTATIONS.map(([deg, label, icon]) =>
        `<button class="or" type="button" data-deg="${deg}" aria-pressed="${deg === state.rendererSettings.angle}"><svg width="32" height="18" viewBox="0 0 34 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="color:#7a7f7c">${icon}</svg><span>${label}</span></button>`).join('')}</div>
        <p class="note">Le moteur tourne le motif dans le plan du sol : un réglage du rendu, pas une autre référence.</p></div>
      <div class="sect"><h3>Motif</h3><div class="chips">${presentPatterns().map((k) => {
        const t = k === m.defaultPattern ? m : otherWith((x) => x.defaultPattern === k);
        return `<button class="chip" type="button" data-variant="${t ? t.id : ''}" aria-pressed="${k === m.defaultPattern}" ${t ? '' : 'disabled'}>${PATTERNS[k]}</button>`; }).join('')}</div>
        <p class="note">Changer de motif change de référence.</p></div>
      <div class="sect"><h3>Largeur de lame</h3><div class="chips">${widths.map((w) => {
        const t = w === widthMm(m) ? m : otherWith((x) => widthMm(x) === w);
        return `<button class="chip" type="button" data-variant="${t ? t.id : ''}" aria-pressed="${w === widthMm(m)}" ${t ? '' : 'disabled'}>${w} mm</button>`; }).join('')}</div>
        <p class="note">${nomCourt(m)} n'existe qu'en ${widthMm(m)} mm ; une autre largeur est une autre référence.</p></div>
      <div class="sect"><h3>Finition, veinage, joints</h3>
        <p class="note">${p.surfaceTreatment ? `Aspect relevé sur la fiche : ${p.surfaceTreatment}${p.finish ? `, finition ${String(p.finish).toLowerCase()}` : ''}. ` : ''}Le moteur ne les règle pas : ils appartiennent à la famille de texture. Il n'y a donc pas de curseur ici — un réglage sans effet vaut moins que son absence. La matière affichée est une famille de démonstration : le motif et la largeur sont exacts, la teinte est approchée.</p></div>`;
  }

  /* ---------------- Comparaison, avant / après ---------------- */
  function startCompare() {
    if (state.comparison) {
      state.intent += 1;
      state.comparison = null;
      paintChrome();
      toast('Comparaison fermée');
      return;
    }
    pickB();
  }
  function pickB() {
    state.originalMode = 'off';
    openPanel('catalog');
    state.ui.picking = true;         /* APRÈS openPanel : closeAll() annule un choix en cours */
    paintChrome();
    toast('Choisissez la seconde référence');
  }
  function toggleBa() {
    if (state.comparison) { state.intent += 1; state.comparison = null; }
    state.originalMode = state.originalMode === 'ba' ? 'off' : 'ba';
    state.ui.split = 0.5;
    paintChrome();
  }

  let dragging = false;
  on(split, 'pointerdown', (e) => {
    dragging = true;
    try { if (split.setPointerCapture) split.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
  });
  const lacher = () => { dragging = false; };
  ['pointerup', 'pointercancel'].forEach((t) => { on(split, t, lacher); on(stage, t, lacher); });
  on(stage, 'pointermove', (e) => {
    if (!dragging) return;
    const b = stage.getBoundingClientRect();
    state.ui.split = Math.max(0.02, Math.min(0.98, (e.clientX - b.left) / b.width));
    paintChrome();
  });

  /* ---------------- Favoris ---------------- */
  function toggleFav(id) {
    if (state.favoriteIds.has(id)) state.favoriteIds.delete(id); else state.favoriteIds.add(id);
    paintChrome();
  }

  /* ---------------- Panneaux et menu ---------------- */
  function closeAll() {
    state.ui.panel = null;
    state.ui.menu = false;
    /* Fermer le catalogue sans choisir B annule le choix de B : sinon le
       clic suivant poserait une comparaison au lieu de changer de sol. */
    state.ui.picking = false;
    paintChrome();
  }
  function openPanel(which) {
    state.ui.menu = false;
    state.ui.picking = false;
    if (which === 'catalog') state.ui.catalogueView = 'all';
    state.ui.panel = which;
    paintChrome();
  }

  /* ---------------- Plein écran ---------------- */
  let calmTimer = 0;
  const wake = () => {
    document.body.classList.remove('calm');
    clearTimeout(calmTimer);
    if (state.ui.immersive) calmTimer = setTimeout(() => document.body.classList.add('calm'), 3200);
  };
  function setImmersive(on) {
    state.ui.immersive = on;
    document.body.classList.toggle('immersive', on);
    if (!on) document.body.classList.remove('calm');
    const nop = () => {};
    try {
      if (on && root.requestFullscreen && !document.fullscreenElement) Promise.resolve(root.requestFullscreen()).catch(nop);
      else if (!on && document.fullscreenElement && document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(nop);
    } catch { nop(); }
    wake();
    setTimeout(viewport.reclamp, 0);
  }
  on(document, 'fullscreenchange', () => {
    if (!document.fullscreenElement && state.ui.immersive) { state.ui.immersive = false; document.body.classList.remove('immersive', 'calm'); }
    setTimeout(viewport.reclamp, 0);
  });
  on(stage, 'pointermove', wake);

  /* ---------------- Toast ---------------- */
  let toastTimer = 0;
  function toast(message) {
    const el = $('[data-toast]');
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
  }

  /* ---------------- Câblage ---------------- */
  on($('[data-import]'), 'click', () => fileInput.click());
  on($('[data-menu-import]'), 'click', () => { closeAll(); fileInput.click(); });
  on($('[data-veil-import]'), 'click', () => fileInput.click());
  on(fileInput, 'change', () => { importPhoto(fileInput.files && fileInput.files[0]); fileInput.value = ''; });
  ['dragover', 'dragenter'].forEach((t) => on(document, t, (e) => e.preventDefault()));
  on(document, 'drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    const externe = dt && dt.types && [...dt.types].includes('Files');
    if (externe && dt.files && dt.files[0]) importPhoto(dt.files[0]);
  });

  ['[data-open-rooms]', '[data-h-rooms]', '[data-nav-rooms]', '[data-menu-rooms]', '[data-veil-rooms]']
    .forEach((sel) => on($(sel), 'click', () => openPanel('rooms')));
  on($('[data-nav-catalog]'), 'click', () => openPanel('catalog'));
  on($('[data-nav-custom]'), 'click', () => openPanel('custom'));
  on($('[data-veil-explore]'), 'click', () => { state.ui.veil = false; paintChrome(); toast('Molette pour zoomer, glisser pour déplacer'); });
  root.querySelectorAll('[data-close]').forEach((b) => on(b, 'click', closeAll));
  on($('[data-scrim]'), 'click', closeAll);

  on($('[data-h-fav]'), 'click', () => {
    if (!state.favoriteIds.size) { toast('Touchez un cœur pour garder une référence'); return; }
    openPanel('catalog');
    state.ui.catalogueView = 'favourites';
    paintChrome();
  });
  on($('[data-h-menu]'), 'click', () => { state.ui.menu = !state.ui.menu; state.ui.panel = null; state.ui.picking = false; paintChrome(); });
  on(document, 'pointerdown', (e) => {
    if (!state.ui.menu) return;
    if (e.target.closest && (e.target.closest('[data-menu]') || e.target.closest('[data-h-menu]'))) return;
    state.ui.menu = false; paintChrome();
  });

  on(root, 'click', (e) => {
    const t = e.target;
    const room = t.closest('[data-room]'); if (room) { openRoom(room.dataset.room); return; }
    const fav = t.closest('[data-fav]'); if (fav) { e.stopPropagation(); toggleFav(fav.dataset.fav); return; }
    const filtre = t.closest('[data-filter]'); if (filtre) { state.ui.patternFilter = state.ui.patternFilter === filtre.dataset.filter ? null : filtre.dataset.filter; paintChrome(); return; }
    const prod = t.closest('[data-prods] [data-id]'); if (prod) { const wasPicking = state.ui.picking; select(prod.dataset.id); if (!wasPicking) closeAll(); return; }
    const variant = t.closest('[data-variant]'); if (variant) { if (variant.dataset.variant && variant.dataset.variant !== state.product) { select(variant.dataset.variant); paintChrome(); } return; }
    const deg = t.closest('[data-deg]'); if (deg) { const d = Number(deg.dataset.deg); if (d !== state.rendererSettings.angle) { state.intent += 1; state.rendererSettings.angle = d; demandeRendu(); paintChrome(); toast(ORIENTATIONS.find(([x]) => x === d)[1]); } return; }
    const side = t.closest('[data-cmp-side]'); if (side) { if (side.dataset.cmpSide === 'B') pickB(); else startCompare(); return; }
    if (t.closest('[data-open-custom]')) { openPanel('custom'); return; }
    if (t.closest('.fiche')) { toast('Fiche Premibel dans un nouvel onglet'); }
  });

  on($('[data-ba]'), 'click', toggleBa);
  on($('[data-cmp]'), 'click', startCompare);
  on($('[data-full]'), 'click', () => setImmersive(!state.ui.immersive));
  on($('[data-z-full]'), 'click', () => setImmersive(!state.ui.immersive));
  on($('[data-z-in]'), 'click', () => viewport.zoomAt(1.5, null, null, true));
  on($('[data-z-out]'), 'click', () => viewport.zoomAt(1 / 1.5, null, null, true));
  on($('[data-level]'), 'click', () => viewport.fitToView(true));
  on($('[data-fit]'), 'click', () => viewport.fitAll(true));

  on(document, 'keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { if (state.ui.immersive) setImmersive(false); else closeAll(); return; }
    if (state.ui.screen === 'start') return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); viewport.zoomAt(1.5, null, null, true); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); viewport.zoomAt(1 / 1.5, null, null, true); }
    else if (e.key === '0') { e.preventDefault(); viewport.fitToView(true); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setImmersive(!state.ui.immersive); }
  });

  paintChrome();

  /* Poignée de diagnostic : seulement en `?dev=1`, pour les parcours Chrome. */
  if (DEV) {
    window.__pv = {
      state, renderer, catalog, products: products.map((p) => p.id), viewport,
      openRoom, select, importPhoto, startCompare, pickB, toggleBa, toggleFav, setImmersive, closeAll, openPanel, paintChrome,
      canvases: { photo: canvasPhoto, a: canvasA, b: canvasB },
    };
  }
  return { state };
}
