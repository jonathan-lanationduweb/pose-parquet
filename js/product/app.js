import { qs, on, echapper } from '../utils/dom.js';
import { analyzeScene, loadSceneIndex, scenesBibliotheque } from '../scene/analyzer.js';
import { motifParDefaut } from '../scene/motifs-regles.js';
import { ficheProduit, suivreClic } from '../commerce/premibel.js';
import { emettre } from '../analytics/events.js';
import { loadFile, loadSceneImage } from '../scene/image-loader.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { quandCartesPretes } from '../scene/material.js';
import { loadCatalog, swatchFor } from '../studio/catalog.js';
import { createViewport, ZOOM_MAX } from './viewport.js';
import { loadTours } from './tour.js';


const PILOT = ['POINF36005', 'BTRPF39009', 'CHENF39031', 'CHENF36014', 'CHENF36015'];

const PATTERNS = { lames: 'Lames', 'point-de-hongrie': 'Point de Hongrie', 'baton-rompu': 'Bâton rompu' };



const ORIENTATIONS = [
  [0, '0°', 'Dans la longueur', '<path d="M3 5h28M3 10h28M3 15h28" />'],
  [45, '45°', 'En diagonale', '<path d="M3 17L17 3M11 17L25 3M19 17L31 5" />'],
  [90, '90°', 'Dans la largeur', '<path d="M7 3v14M17 3v14M27 3v14" />'],
];

const REGROUPEMENT_MS = 70;



const NOTE_IMPORT = 'Votre pièce est prête. La pose du parquet sur vos propres photos arrivera avec l’analyse de pièce.';
const NOTE_SANS_SOL = 'Le rendu sur votre propre photo sera disponible après analyse de la pièce.';
const DEV = (() => {
  try { return new URLSearchParams(window.location.search).get('dev') === '1'; } catch { return false; }
})();



const svg = (path, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const ICON = {
  room: '<rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 16l4.5-4 3.5 3 3-2.5L21 16.5" />',
  floor: '<path d="M3 7.5h18M3 12h18M3 16.5h18M9 7.5v4.5M15 12v4.5" />',
  custom: '<path d="M4 8h9M17 8h3M4 16h5M13 16h7" /><circle cx="15" cy="8" r="2" /><circle cx="10" cy="16" r="2" />',
  cmp: '<path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />',
  full: '<path d="M4 9V5.5A1.5 1.5 0 015.5 4H9M15 4h3.5A1.5 1.5 0 0120 5.5V9M20 15v3.5a1.5 1.5 0 01-1.5 1.5H15M9 20H5.5A1.5 1.5 0 014 18.5V15" />',
  fit: '<circle cx="12" cy="12" r="3.4" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />',
  heart: '<path d="M12 20.5s-7.5-4.7-7.5-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 017.5 3.3c0 5.5-7.5 10.2-7.5 10.2z" />',
  menu: '<path d="M4 7h16M4 12h16M4 17h16" />',
  close: '<path d="M6 6l12 12M18 6L6 18" />',
  tick: '<path d="M20 6L9 17l-5-5" />',
  import: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6" />',
};
const heart = (on, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON.heart}</svg>`;


const nomCourt = (material) =>
  String(material.name || material.id).replace(/\s*\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\s*(?:mm)?\s*$/i, '').trim();

export async function mountProduct(root) {
  const base = root.dataset.base || '../';


  const renderer = createSceneRenderer();
  const catalog = await loadCatalog(base);
  const sceneIndex = await loadSceneIndex(base);
  const rooms = scenesBibliotheque(sceneIndex);


  const visites = await loadTours(base, rooms.map((r) => r.id));
  const products = PILOT.map((id) => catalog.get(id)).filter(Boolean);
  if (!products.length) throw new Error('Aucune référence pilote dans le catalogue');
  const productOf = (id) => catalog.get(id);
  const fiche = (material) => material.product || {};
  const widthMm = (material) => {
    const d = fiche(material).dimensions || {};
    return d.widthMm || Math.round((material.plank && material.plank.width || 0) * 1000);
  };


  const state = {


    room: null,


    scene: null,


    tour: null,
    product: products[0].id,
    rendererSettings: { angle: 0 },
    comparison: null,
    favoriteIds: new Set(),
    originalMode: 'off',
    ui: {
      panel: null,
      menu: false,
      picking: false,
      immersive: false,
      panning: false,
      split: 0.5,
      catalogueView: 'all',
      patternFilter: null,
      busy: false,
      status: '',
    },


    intent: 0,
    lastMs: null,


    renders: 0,
  };


  const importee = () => Boolean(state.room && state.room.type === 'uploaded');
  const posable = () => Boolean(state.scene);


  const txt = echapper;


  root.className = 'pv';
  root.innerHTML = `
    <header class="pv__header">
      <a class="pv__brand" href="${base}">${root.dataset.logo ? `${root.dataset.logoWebp ? `<picture><source type="image/webp" srcset="${root.dataset.logoWebp}" />` : ''}<img class="pv__logo" src="${root.dataset.logo}" alt="Pose Parquet" width="480" height="233" />${root.dataset.logoWebp ? '</picture>' : ''}` : '<span class="pv__mark">✦</span>'}<span class="pv__name"><h1 class="pv__title">Visualiseur Parquet</h1><small>Visualisez. Imaginez. Réalisez.</small></span></a>
      <button class="hbtn" type="button" data-h-rooms>${svg(ICON.room)}<span>Changer de pièce</span></button>
      <button class="hbtn" type="button" data-h-fav aria-pressed="false">${heart(false)}<span>Favoris</span><span class="cnt" data-fav-count hidden>0</span></button>
      <button class="hbtn hbtn--icon" type="button" data-h-menu aria-expanded="false" aria-label="Menu">${svg(ICON.menu)}</button>
    </header>
    <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file />

    <main class="pv__stage" data-stage role="group" aria-label="Vue de la pièce. Molette pour zoomer, glisser pour déplacer.">
      <div class="pv-scene">
        <div class="pv-layer" data-layer="photo"><canvas data-photo></canvas></div>
        <div class="pv-layer" data-layer="b" hidden><canvas data-b></canvas></div>
        <div class="pv-clip" data-clip><div class="pv-layer" data-layer="a"><canvas data-a></canvas></div></div>
      </div>
      <div class="pv-split" data-split hidden></div>
      <span class="pv-tag" data-tag-a hidden>A</span>
      <span class="pv-tag" data-tag-b hidden>B</span>

      <div class="pv-tools" data-tools>
        <div class="seg" data-seg role="group" aria-label="Avant / après">
          <button type="button" data-ba="ba" aria-pressed="false">Avant</button>
          <button type="button" data-ba="off" aria-pressed="true">Après</button>
        </div>
        <span class="sep" data-tools-sep></span>
        <button type="button" data-cmp aria-pressed="false">${svg(ICON.cmp)}<span>Comparer</span></button>
        <button type="button" class="ico" data-full aria-label="Plein écran">${svg(ICON.full)}</button>
      </div>

      <div class="pv-bar" data-bar hidden></div>

      <div class="pv-note" data-note hidden role="status">
        <p data-note-text></p>
        <button type="button" data-note-close aria-label="Fermer">${svg(ICON.close, 14)}</button>
      </div>

      <div class="pv-zoom" data-zoom>
        <button type="button" data-z-out aria-label="Zoom arrière">−</button>
        <button type="button" data-level aria-label="Niveau de zoom, cliquer pour revenir au cadrage immersif" title="Cadrage immersif (100 %)">100 %</button>
        <button type="button" data-z-in aria-label="Zoom avant">+</button>
        <span class="sep"></span>
        <button type="button" data-fit aria-label="Voir toute la photo" title="Ajuster : voir toute la photo">${svg(ICON.fit, 15)}</button>
        <button type="button" data-z-full aria-label="Plein écran">${svg(ICON.full, 15)}</button>
      </div>
      <div class="pv-toast" data-toast role="status"></div>

      <section class="pv-drawer" data-drawer hidden role="dialog" aria-label="Options">
        <div class="pv-drawer__head">
          <h2 data-drawer-title></h2>
          <span class="pv-drawer__count" data-drawer-count></span>


          <a class="pv-drawer__link" data-drawer-link hidden target="_blank" rel="noopener noreferrer"><span data-drawer-link-label></span> ${svg(ICON.arrow, 14)}</a>
          <button class="pv-drawer__close" type="button" data-close aria-label="Fermer">${svg(ICON.close)}</button>
        </div>
        <div class="pv-drawer__body" data-drawer-body></div>
      </section>
    </main>

    <div class="pv-menu" data-menu hidden>
      <button class="mi" type="button" data-menu-import>Importer une photo</button>
      <button class="mi" type="button" data-menu-rooms>Choisir une pièce</button>
      <div class="sepm"></div>
      <a class="mi" href="${base}outils/studio/">Ouvrir le Studio complet</a>
      <a class="mi" href="${base}outils/visualiseur/">À propos du visualiseur</a>
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
  const drawer = $('[data-drawer]');


  const sceneSize = () => {
    if (state.scene && renderer.size) return { w: renderer.size.width, h: renderer.size.height };
    if (importee()) return { w: state.room.width, h: state.room.height };
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


  let pending = false;
  let regroupement = 0;
  let t0 = 0;

  const paintConfig = (productId) => {
    const material = productOf(productId);






    return { material, materialId: productId, pattern: motifParDefaut(material), angle: state.rendererSettings.angle, width: null, scale: 1 };
  };



  function setStatus(text, kind) {
    state.ui.busy = kind === 'busy';
    state.ui.status = kind === 'ok' ? '' : text;
  }

  function paintAll() {
    pending = false;
    if (!state.scene || !renderer.ready) return;
    const okA = renderer.paint(canvasA, paintConfig(state.product), null, 1);
    const okB = state.comparison ? renderer.paint(canvasB, paintConfig(state.comparison.b), null, 1) : true;
    if ((!okA || !okB) && renderer.enAttente) {


      setStatus('Préparation du rendu…', 'busy');
      paintChrome();
      return;
    }
    if (!okA) { setStatus('Rendu impossible pour cette pièce', 'warn'); paintChrome(); return; }
    state.renders += 1;
    if (t0) { state.lastMs = Math.round(performance.now() - t0); t0 = 0; }
    setStatus('', 'ok');
    paintChrome();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(paintAll, 0);
  }

  function demandeRendu() {
    clearTimeout(regroupement);
    if (!t0) t0 = performance.now();
    regroupement = setTimeout(schedule, REGROUPEMENT_MS);
  }
  quandCartesPretes(() => { if (renderer.ready && state.scene) schedule(); });


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


  function barHtml() {
    const m = productOf(state.product);


    if (importee()) {
      return `
        <span class="bar__tx">
          <b>${txt(state.room.fileName || 'Votre photo')}</b>
          <span>Votre pièce · aucun parquet posé pour l'instant</span>
        </span>
        <span class="bar__acts">
          <button class="bar__btn" type="button" data-open-catalog aria-pressed="${state.ui.panel === 'catalog'}">${svg(ICON.floor, 16)}<span>Voir les parquets</span></button>
          <button class="bar__btn quiet" type="button" data-open-rooms aria-pressed="${state.ui.panel === 'rooms'}">${svg(ICON.room, 16)}<span>Changer de pièce</span></button>
        </span>`;
    }
    const p = fiche(m);
    const secondaire = state.ui.busy || state.ui.status
      ? `<span class="bar__busy">${state.ui.status || 'Préparation du rendu…'}</span>`
      : `<span>${PATTERNS[m.defaultPattern]} · ${widthMm(m)} mm</span>`;
    if (state.comparison) {
      const b = productOf(state.comparison.b);
      return `
        <span class="bar__side"><span class="bar__tag">A</span><span class="bar__sw" data-swatch="${txt(m.id)}"></span><span class="bar__tx"><b>${txt(nomCourt(m))}</b><span>${PATTERNS[m.defaultPattern]} · ${widthMm(m)} mm</span></span></span>
        <span class="bar__vs">${svg(ICON.cmp, 16)}</span>
        <span class="bar__side"><span class="bar__tag">B</span><span class="bar__sw" data-swatch="${txt(b.id)}"></span><span class="bar__tx"><b>${txt(nomCourt(b))}</b><span>${PATTERNS[b.defaultPattern]} · ${widthMm(b)} mm</span></span></span>
        <span class="bar__acts">
          <button class="bar__btn" type="button" data-pick-b>Changer B</button>
          <button class="bar__btn quiet" type="button" data-cmp-close>Fermer</button>
        </span>`;
    }
    return `
      <span class="bar__sw bar__sw--lg" data-swatch="${txt(m.id)}"></span>
      <span class="bar__tx">
        <b>${txt(nomCourt(m))}</b>
        ${secondaire}
        <span class="bar__ref">${txt(p.sku || m.id)}${ficheBarre(m)}</span>
      </span>
      <span class="bar__acts">
        <button class="bar__btn" type="button" data-open-catalog aria-pressed="${state.ui.panel === 'catalog'}">${svg(ICON.floor, 16)}<span>Choisir un parquet</span></button>
        <button class="bar__btn" type="button" data-open-custom aria-pressed="${state.ui.panel === 'custom'}">${svg(ICON.custom, 16)}<span>Personnaliser</span></button>
        <button class="bar__fav" type="button" data-fav="${txt(m.id)}" aria-pressed="${state.favoriteIds.has(m.id)}" aria-label="Favori">${heart(state.favoriteIds.has(m.id))}</button>
      </span>`;
  }

  function paintChrome() {
    const enPiece = Boolean(state.room);
    const hasRender = posable() && canvasA.width > 0;


    $('[data-tools]').hidden = !enPiece;
    $('[data-seg]').hidden = !hasRender;
    $('[data-tools-sep]').hidden = !hasRender;
    $('[data-cmp]').hidden = !hasRender;

    const cut = hasRender && (state.originalMode === 'ba' || Boolean(state.comparison));
    clip.style.clipPath = cut ? `inset(0 ${((1 - state.ui.split) * 100).toFixed(2)}% 0 0)` : 'none';
    split.hidden = !cut;
    if (cut) split.style.left = `${state.ui.split * 100}%`;
    layerB.hidden = !(hasRender && state.comparison);
    $('[data-tag-a]').hidden = !(hasRender && state.comparison);
    $('[data-tag-b]').hidden = !(hasRender && state.comparison);
    if (state.comparison) {
      $('[data-tag-a]').style.left = `calc(${state.ui.split * 100}% - 40px)`;
      $('[data-tag-b]').style.left = `calc(${state.ui.split * 100}% + 14px)`;
    }
    root.querySelectorAll('[data-ba]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.ba === 'ba') === (state.originalMode === 'ba'))));
    $('[data-cmp]').setAttribute('aria-pressed', String(Boolean(state.comparison)));


    const bar = $('[data-bar]');
    bar.hidden = !enPiece;
    bar.classList.toggle('pv-bar--cmp', Boolean(state.comparison));
    if (!bar.hidden) { bar.innerHTML = barHtml(); poserSwatch(bar); }


    const n = state.favoriteIds.size;
    $('[data-fav-count]').textContent = String(n);
    $('[data-fav-count]').hidden = n === 0;
    $('[data-h-fav]').setAttribute('aria-pressed', String(n > 0));


    drawer.hidden = !state.ui.panel;
    document.body.classList.toggle('drawer-open', Boolean(state.ui.panel));
    document.body.classList.toggle('panning', state.ui.panning);
    $('[data-menu]').hidden = !state.ui.menu;
    $('[data-h-menu]').setAttribute('aria-expanded', String(state.ui.menu));
    if (state.ui.panel === 'rooms') paintRooms();
    if (state.ui.panel === 'catalog') paintCatalogue();
    if (state.ui.panel === 'custom') paintCustom();
  }





  function ficheBarre(m) {
    const f = ficheProduit(fiche(m));
    if (!f) return '';
    return ` · <a href="${txt(f.url)}" target="_blank" rel="noopener noreferrer" data-fiche>${txt(f.libelle)} →</a>`;
  }

  function drawerHead(title, count, material) {
    $('[data-drawer-title]').textContent = title;
    $('[data-drawer-count]').textContent = count || '';
    const a = $('[data-drawer-link]');


    const fiche = ficheProduit(material);
    a.hidden = !fiche;
    if (fiche) {
      a.href = fiche.url;
      $('[data-drawer-link-label]').textContent = fiche.libelle;
    }
  }


  function paintRooms() {
    drawerHead('Changer de pièce', '', null);
    $('[data-drawer-body]').innerHTML = `<div class="gal">
      <button class="gal__card gal__card--import" type="button" data-import>${svg(ICON.import, 22)}<b>${importee() ? 'Importer une autre photo' : 'Importer ma photo'}</b><span>Rien ne quitte votre ordinateur</span></button>
      ${rooms.map((r) => {
        const stem = r.file.replace(/\.jpg$/, '');
        const on = !importee() && state.room && r.id === state.room.id;
        return `<button class="gal__card" type="button" data-room="${r.id}" aria-pressed="${on}">
          <span class="gal__ph"><picture><source type="image/webp" srcset="${base}assets/images/${stem}-640.webp" /><img alt="" src="${base}assets/images/${stem}-640.jpg" decoding="async" /></picture>${on ? `<span class="gal__tick">${svg(ICON.tick, 12)}</span>` : ''}</span>
          <b>${txt(r.label)}</b><span>${txt(r.highlight || '')}</span></button>`;
      }).join('')}
    </div>`;
  }

  async function openRoom(id) {
    const entry = rooms.find((r) => r.id === id);
    if (!entry) return;
    const intent = ++state.intent;
    t0 = performance.now();
    closeAll();
    fermerNote();
    setStatus('Chargement…', 'busy');
    paintChrome();
    try {
      const scene = await analyzeScene({ sceneId: id, base });
      const prepared = await loadSceneImage(base, scene.image.file, window.innerWidth < 600);
      if (intent !== state.intent) return;
      renderer.setScene(scene, prepared);
      libererPhoto();
      state.scene = scene;
      state.room = { type: 'demo', id, label: scene.label || entry.label };
      state.tour = visites.pourScene(id);
      canvasPhoto.width = prepared.width; canvasPhoto.height = prepared.height;
      canvasPhoto.getContext('2d').drawImage(prepared.canvas, 0, 0);


      canvasA.width = prepared.width; canvasA.height = prepared.height;
      viewport.scheduleFit();
      toast(state.room.label);
      schedule();
      paintChrome();
    } catch (error) {
      if (intent !== state.intent) return;
      setStatus('Cette pièce n’a pas pu être chargée', 'warn');
      toast('Cette pièce n’a pas pu être chargée');
      paintChrome();
      console.error('[visualiseur produit]', error);
    }
  }



  function libererPhoto() {
    if (state.room && state.room.type === 'uploaded' && state.room.url) {
      try { URL.revokeObjectURL(state.room.url); } catch {   }
    }
  }



  async function importPhoto(file) {
    if (!file) return;
    const intent = ++state.intent;
    closeAll();
    try {
      const prepared = await loadFile(file);
      if (intent !== state.intent) return;

      const url = URL.createObjectURL(file);
      libererPhoto();
      state.scene = null;


      state.tour = null;
      state.room = { type: 'uploaded', url, fileName: prepared.name, width: prepared.width, height: prepared.height };
      state.comparison = null;
      state.originalMode = 'off';
      state.ui.split = 0.5;
      setStatus('', 'ok');
      canvasPhoto.width = prepared.width; canvasPhoto.height = prepared.height;
      canvasPhoto.getContext('2d').drawImage(prepared.canvas, 0, 0);


      canvasA.width = 0; canvasA.height = 0; canvasB.width = 0; canvasB.height = 0;
      viewport.scheduleFit();
      paintChrome();
      note(NOTE_IMPORT);
    } catch (error) {
      if (intent !== state.intent) return;
      toast(error.message || 'Cette image n’a pas pu être lue');
    }
  }


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
    const list = visibleProducts();
    const m = productOf(state.product);
    drawerHead(
      state.ui.picking ? 'Choisir la version B' : favs ? 'Vos favoris' : 'Choisir un parquet',
      favs ? `${list.length} référence${list.length > 1 ? 's' : ''}` : '',
      fiche(m)
    );
    const filtres = favs ? '' : `<div class="chips" data-cat-filters>
        <button class="chip" type="button" data-filter="" aria-pressed="${!state.ui.patternFilter}">Tous</button>
        ${presentPatterns().map((k) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${state.ui.patternFilter === k}">${PATTERNS[k]}</button>`).join('')}
      </div>`;


    const avis = posable() ? '' : `<p class="grid__note">${NOTE_SANS_SOL}</p>`;
    $('[data-drawer-body]').innerHTML = `${filtres}${avis}<div class="grid" data-prods>${list.map((p) => {
      const on = p.id === state.product && !state.ui.picking;
      return `<button class="pcard" type="button" data-id="${txt(p.id)}" aria-pressed="${on}">
        <span class="pcard__tex" data-swatch="${txt(p.id)}"></span>
        ${on ? `<span class="pcard__tick">${svg(ICON.tick, 12)}</span>` : ''}
        <span class="pcard__hh" data-fav="${txt(p.id)}" role="button" aria-pressed="${state.favoriteIds.has(p.id)}" aria-label="Favori">${heart(state.favoriteIds.has(p.id), 16)}</span>
        <b>${txt(nomCourt(p))}</b>
        <span>${PATTERNS[p.defaultPattern]} · ${widthMm(p)} mm</span></button>`;
    }).join('')}</div>`;
    poserSwatch($('[data-prods]'));
  }

  function select(id) {
    const material = productOf(id);
    if (!material) return;
    emettre('select_product', { productId: id, contexte: 'visualiseur-produit' });

    if (!posable()) {
      state.product = id;
      state.ui.picking = false;
      paintChrome();
      note(NOTE_SANS_SOL);
      return;
    }
    if (state.ui.picking) {

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
  }


  const otherWith = (pred) => products.find((p) => p.id !== state.product && pred(p));
  function paintCustom() {
    const m = productOf(state.product);
    const p = fiche(m);
    const widths = [...new Set(products.map(widthMm))].sort((a, b) => a - b);
    drawerHead('Personnaliser votre parquet', `${nomCourt(m)} · ${p.sku || m.id}`, p);
    $('[data-drawer-body]').innerHTML = `<div class="cus">
      <section class="cus__sect">
        <h3>Sens de pose</h3>
        <div class="orient" data-orient>${ORIENTATIONS.map(([deg, court, label, icon]) =>
          `<button class="or" type="button" data-deg="${deg}" aria-pressed="${deg === state.rendererSettings.angle}" aria-label="${label}"><svg width="34" height="20" viewBox="0 0 34 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${icon}</svg><b>${court}</b><span>${label}</span></button>`).join('')}</div>
        <p class="cus__note">Le moteur tourne le motif dans le plan du sol : un réglage du rendu, pas une autre référence.</p>
      </section>
      <section class="cus__sect">
        <h3>Motif</h3>
        <div class="chips">${presentPatterns().map((k) => {
          const t = k === m.defaultPattern ? m : otherWith((x) => x.defaultPattern === k);
          return `<button class="chip" type="button" data-variant="${t ? t.id : ''}" aria-pressed="${k === m.defaultPattern}" ${t ? '' : 'disabled'}>${PATTERNS[k]}</button>`; }).join('')}</div>
        <h3>Largeur de lame</h3>
        <div class="chips">${widths.map((w) => {
          const t = w === widthMm(m) ? m : otherWith((x) => widthMm(x) === w);
          return `<button class="chip" type="button" data-variant="${t ? t.id : ''}" aria-pressed="${w === widthMm(m)}" ${t ? '' : 'disabled'}>${w} mm</button>`; }).join('')}</div>
        <p class="cus__note"><strong>${txt(nomCourt(m))}</strong> est une référence définie — ${PATTERNS[m.defaultPattern].toLowerCase()}, ${widthMm(m)} mm. Changer de motif ou de largeur, c'est choisir une autre référence du catalogue.</p>
      </section>
      <section class="cus__sect cus__sect--soft">
        <h3>Finition, veinage, joints</h3>
        <p class="cus__note">${p.surfaceTreatment ? `Fiche : ${txt(p.surfaceTreatment)}${p.finish ? `, ${txt(String(p.finish).toLowerCase())}` : ''}. ` : ''}Ils appartiennent à la matière et ne se règlent pas ici. La matière affichée est une famille de démonstration : motif et largeur exacts, teinte approchée.</p>
      </section>
    </div>`;
  }


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
    if (!posable()) { note(NOTE_SANS_SOL); return; }
    state.originalMode = 'off';
    state.ui.menu = false;
    state.ui.catalogueView = 'all';
    state.ui.panel = 'catalog';
    state.ui.picking = true;
    paintChrome();
    toast('Choisissez la seconde référence');
  }
  function setBa(on) {
    if (!posable()) { note(NOTE_SANS_SOL); return; }
    if (state.comparison) { state.intent += 1; state.comparison = null; }
    state.originalMode = on ? 'ba' : 'off';
    state.ui.split = 0.5;
    paintChrome();
  }

  let dragging = false;
  on(split, 'pointerdown', (e) => {
    dragging = true;
    try { if (split.setPointerCapture) split.setPointerCapture(e.pointerId); } catch {   }
  });
  const lacher = () => { dragging = false; };
  ['pointerup', 'pointercancel'].forEach((t) => { on(split, t, lacher); on(stage, t, lacher); });
  on(stage, 'pointermove', (e) => {
    if (!dragging) return;
    const b = stage.getBoundingClientRect();
    state.ui.split = Math.max(0.02, Math.min(0.98, (e.clientX - b.left) / b.width));
    paintChrome();
  });



  let panTimer = 0;
  on(stage, 'pointerdown', (e) => {
    if (e.target.closest('.pv-tools, .pv-bar, .pv-zoom, .pv-drawer, .pv-note, .pv-split')) return;
    clearTimeout(panTimer);
    state.ui.panning = true;
    document.body.classList.add('panning');
  });
  const finPan = () => {
    clearTimeout(panTimer);
    panTimer = setTimeout(() => { state.ui.panning = false; document.body.classList.remove('panning'); }, 350);
  };
  on(stage, 'pointerup', finPan);
  on(stage, 'pointercancel', finPan);


  function toggleFav(id) {
    if (state.favoriteIds.has(id)) state.favoriteIds.delete(id); else state.favoriteIds.add(id);
    paintChrome();
  }


  function closeAll() {
    state.ui.panel = null;
    state.ui.menu = false;


    state.ui.picking = false;
    paintChrome();
  }
  function openPanel(which) {
    state.ui.menu = false;
    state.ui.picking = false;
    if (which === 'catalog') state.ui.catalogueView = 'all';

    state.ui.panel = state.ui.panel === which ? null : which;
    paintChrome();
  }


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


  let toastTimer = 0;
  function toast(message) {
    const el = $('[data-toast]');
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
  }


  let noteTimer = 0;


  function note(message) {
    const el = $('[data-note]');
    $('[data-note-text]').textContent = message;
    el.hidden = false;

    setTimeout(() => el.classList.add('on'), 0);
    clearTimeout(noteTimer);
    noteTimer = setTimeout(fermerNote, 9000);
  }
  function fermerNote() {
    clearTimeout(noteTimer);
    const el = $('[data-note]');
    el.classList.remove('on');
    el.hidden = true;
  }
  on($('[data-note-close]'), 'click', fermerNote);


  on($('[data-menu-import]'), 'click', () => { closeAll(); fileInput.click(); });
  on(fileInput, 'change', () => { importPhoto(fileInput.files && fileInput.files[0]); fileInput.value = ''; });
  ['dragover', 'dragenter'].forEach((t) => on(document, t, (e) => e.preventDefault()));
  on(document, 'drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    const externe = dt && dt.types && [...dt.types].includes('Files');
    if (externe && dt.files && dt.files[0]) importPhoto(dt.files[0]);
  });

  ['[data-h-rooms]', '[data-menu-rooms]'].forEach((sel) => on($(sel), 'click', () => openPanel('rooms')));
  on($('[data-close]'), 'click', closeAll);

  on($('[data-h-fav]'), 'click', () => {
    if (!state.favoriteIds.size) { toast('Touchez un cœur pour garder une référence'); return; }
    if (state.ui.panel === 'catalog' && state.ui.catalogueView === 'favourites') { closeAll(); return; }
    state.ui.menu = false;
    state.ui.picking = false;
    state.ui.panel = 'catalog';
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


    if (t.closest('[data-fiche], [data-drawer-link]')) {
      suivreClic(fiche(productOf(state.product)), 'visualiseur-produit');
    }
    if (t.closest('[data-import]')) { fileInput.click(); return; }
    const room = t.closest('[data-room]'); if (room) { openRoom(room.dataset.room); return; }
    const fav = t.closest('[data-fav]'); if (fav) { e.stopPropagation(); toggleFav(fav.dataset.fav); return; }
    const filtre = t.closest('[data-filter]'); if (filtre) { state.ui.patternFilter = filtre.dataset.filter || null; paintChrome(); return; }
    const prod = t.closest('[data-prods] [data-id]'); if (prod) { select(prod.dataset.id); return; }
    const variant = t.closest('[data-variant]'); if (variant) { if (variant.dataset.variant && variant.dataset.variant !== state.product) { select(variant.dataset.variant); paintChrome(); } return; }
    const deg = t.closest('[data-deg]'); if (deg) { const d = Number(deg.dataset.deg); if (d !== state.rendererSettings.angle) { state.intent += 1; state.rendererSettings.angle = d; demandeRendu(); paintChrome(); } return; }
    if (t.closest('[data-open-catalog]')) { openPanel('catalog'); return; }
    if (t.closest('[data-open-custom]')) { openPanel('custom'); return; }
    if (t.closest('[data-open-rooms]')) { openPanel('rooms'); return; }
    if (t.closest('[data-pick-b]')) { pickB(); return; }
    if (t.closest('[data-cmp-close]')) { startCompare(); return; }
    const ba = t.closest('[data-ba]'); if (ba) { setBa(ba.dataset.ba === 'ba'); return; }
  });

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
    if (e.key === 'Escape') { if (state.ui.panel || state.ui.menu) closeAll(); else if (state.ui.immersive) setImmersive(false); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); viewport.zoomAt(1.5, null, null, true); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); viewport.zoomAt(1 / 1.5, null, null, true); }
    else if (e.key === '0') { e.preventDefault(); viewport.fitToView(true); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setImmersive(!state.ui.immersive); }
  });



  if (DEV) {
    (async () => {
      const signature = { page: location.pathname, bundle: null, ui: 'v2' };
      try {
        const script = [...document.scripts].map((s) => s.src).find((s) => /js\/product\/main\.js/.test(s));
        const trouve = script && script.match(/assets\/dist\/([0-9a-f]+)\//);
        signature.bundle = trouve ? trouve[1] : 'inconnu';
        const rep = await fetch(`${base}assets/dev-build.json`, { cache: 'no-store' });
        if (rep.ok) Object.assign(signature, await rep.json());
      } catch {   }
      window.__pvBuild = signature;
      console.info('[visualiseur produit] build', signature);
    })();
  }

  paintChrome();



  if (rooms.length) openRoom(rooms[0].id);


  if (DEV) {
    window.__pv = {
      state, renderer, catalog, products: products.map((p) => p.id), viewport,
      pieces: () => rooms.map((r) => ({ id: r.id, label: r.label })),
      get build() { return window.__pvBuild || null; },
      visites,
      openRoom, select, importPhoto, startCompare, pickB, setBa, toggleBa: () => setBa(state.originalMode !== 'ba'), toggleFav, setImmersive, closeAll, openPanel, paintChrome,
      canvases: { photo: canvasPhoto, a: canvasA, b: canvasB },
    };
  }
  return { state };
}
