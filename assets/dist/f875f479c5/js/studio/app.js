import { qs, on, echapper } from '../utils/dom.js';
import { analyzeScene, loadSceneIndex, scenesBibliotheque, sceneOuvrable } from '../scene/analyzer.js';
import {
  motifAutorise,
  motifParDefaut,
  normaliserConfig,
  raisonIndisponible,
  messageAdaptation,
} from '../scene/motifs-regles.js';
import { loadImage, loadFile } from '../scene/image-loader.js';
import { createFloorEditor, problemeCadre } from '../scene/editor.js';
import { composeRender, downloadCanvas } from '../scene/export.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { warmMaterial, enCache, quandCartesPretes, apercuAsync } from '../scene/material.js';
import { addZone, removeZone } from '../scene/schema.js';
import { contourDuCadre, decouperALaPhoto, cotesParalleles, dimensionsDuCadre, planDuCadre } from '../scene/cadre-photo.js';
import { loadCatalog, createCatalog, swatchFor } from './catalog.js';
import { createCompare } from './compare.js';
import { buildHandoffParams } from '../forms/studio-handoff.js';
import { ficheProduit, suivreClic, estReferencePremibel } from '../commerce/premibel.js';
import { emettre } from '../analytics/events.js';
import { mark, mesure, perfActif } from '../utils/perf.js';

const ORIENTATIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' },
  { angle: 90, label: 'Lames dans la profondeur', icon: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4' },
  { angle: 45, label: 'Diagonale vers la droite', icon: 'M6 18 18 6M18 12V6h-6' },
  { angle: -45, label: 'Diagonale vers la gauche', icon: 'M18 18 6 6M6 12V6h6' },
];


const CONTEXTS = [
  { id: 'parquets', label: 'Parquet', title: 'Choisir un parquet' },
  { id: 'motifs', label: 'Motif', title: 'Choisir un motif' },
  { id: 'orientation', label: 'Orientation', title: 'Sens de pose' },
];


const SHEET_LEVELS = ['peek', 'half', 'full'];

const icon = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

const ICONS = {
  before: 'M12 3v18M4 7h4M4 12h4M4 17h4M16 7h4M16 12h4M16 17h4',
  plus: 'M12 5v14M5 12h14',
  layers: 'm12 3 9 5-9 5-9-5 9-5M3 14l9 5 9-5',
  save: 'M5 4h11l3 3v13H5zM8 4v6h7V4M8 20v-6h8v6',
  help: 'M9.5 9a2.5 2.5 0 1 1 3 2.5V13M12 17h.01',
  reset: 'M4 10a8 8 0 1 1 1.6 6M4 4v6h6',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  close: 'm6 6 12 12M18 6 6 18',
  forward: 'M5 12h13m-6-7 7 7-7 7',
};

const STORAGE = 'pose-parquet:studio';



export const MAX_VERSIONS = 3;

export async function mountStudio(root) {
  const base = root.dataset.base || '../';

  root.className = 'studio';
  root.dataset.state = 'start';
  root.dataset.panel = 'closed';
  root.dataset.sheet = 'peek';
  root.innerHTML = `
    <header class="studio__bar">
      <a class="studio__back" href="${base}index.html" data-back>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        <span><strong>Pose</strong> Parquet</span>
      </a>
      <h1 class="studio__project">Visualiseur Parquet<span data-project></span></h1>
      <div class="studio__tools">
        <button class="studio__tool" type="button" data-help aria-label="Aide">${icon(ICONS.help)}</button>
        <button class="studio__tool" type="button" data-restart aria-label="Réinitialiser">${icon(ICONS.reset)}</button>
        <div class="studio__menu">
          <button class="studio__tool" type="button" data-menu aria-expanded="false" aria-label="Autres options">${icon(ICONS.more)}</button>
          <div class="studio__dropdown" data-dropdown hidden>
            <button type="button" data-fix>Délimiter le sol</button>
            <button type="button" data-advanced>Réglages avancés</button>
            <a href="${base}outils/simulateur-pose.html">Passer au Mode Plan</a>
            <a href="${base}outils/visualiseur.html">À propos du visualiseur</a>
          </div>
        </div>
      </div>
    </header>

    <section class="studio__start" data-start>
      <div class="start__inner">
        <h2 class="start__title">Visualisez votre parquet</h2>
        <p class="start__lead">Choisissez une pièce, essayez les parquets, comparez. Votre photo reste dans votre navigateur.</p>
        <div class="start__actions">
          <button class="btn btn--solid btn--lg" type="button" data-import>Essayer dans ma pièce</button>
          <span class="start__or">ou choisissez une pièce d’exemple</span>
        </div>
        <div class="start__rooms" data-rooms></div>
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file />
      </div>
    </section>

    <main class="studio__main" data-main>
      <div class="studio__stage" data-stage>
        <div class="stage__media" data-media>
          <img class="stage__photo" alt="" data-photo />














          <canvas class="stage__canvas" data-canvas role="img"
            aria-label="Aperçu du parquet : aucune pièce ouverte pour l’instant."></canvas>
          <div class="stage__ba" data-ba hidden>
            <span class="stage__tag stage__tag--a">Avant</span>
            <span class="stage__tag stage__tag--b">Après</span>
            <input class="stage__range" type="range" min="0" max="100" value="50" data-ba-range aria-label="Curseur avant / après" />
            <span class="stage__handle" aria-hidden="true"></span>
          </div>
        </div>
        <p class="stage__status" data-status role="status" hidden></p>












        <a class="stage__product" data-product-link hidden target="_blank" rel="noopener"></a>
        <button class="stage__room" type="button" data-change-room>
          <span class="stage__room-thumb" data-room-thumb></span>
          <span>Changer de pièce</span>
        </button>
      </div>

      <aside class="studio__panel" id="studio-panneau">
        <button class="panel__grab" type="button" data-sheet-toggle aria-label="Agrandir ou réduire le panneau"></button>
        <div class="panel__head">
          <p class="panel__title" data-panel-title>Choisir un parquet</p>
          <button class="panel__more" type="button" data-sheet-more>Tout voir · rechercher</button>
          <button class="panel__close" type="button" data-panel-close aria-label="Fermer le panneau">${icon(ICONS.close)}</button>
        </div>
        <div class="panel__body">
          <div class="panel__view" data-view="parquets"></div>
          <div class="panel__view" data-view="motifs" hidden></div>
          <div class="panel__view" data-view="orientation" hidden></div>
        </div>
      </aside>

      <footer class="studio__actions">
        <div class="actions__contexts" role="group" aria-label="Que voulez-vous changer ?" data-contexts></div>
        <div class="actions__variants" data-variants></div>
        <button class="variant-add" type="button" data-add aria-label="Ajouter cette version à la comparaison">${icon(ICONS.plus)}</button>
        <div class="actions__buttons">
          <button class="action" type="button" data-toggle-ba aria-pressed="false" aria-label="Avant / après">${icon(ICONS.before)}<span>Avant / après</span></button>
          <button class="action" type="button" data-compare disabled aria-label="Comparer">${icon(ICONS.layers)}<span data-compare-label>Comparer</span></button>
          <button class="action" type="button" data-save aria-label="Enregistrer l’image">${icon(ICONS.save)}<span>Enregistrer</span></button>










          <a class="action action--primary" data-project-cta href="${base}projet/">${icon(ICONS.forward)}<span>Décrire mon projet</span></a>
        </div>
      </footer>
    </main>

    <div class="studio__drawer" data-drawer hidden>
      <div class="drawer__head">
        <p data-drawer-title>Réglages avancés</p>
        <button class="studio__tool" type="button" data-drawer-close aria-label="Fermer">${icon(ICONS.close)}</button>
      </div>
      <div class="drawer__body" data-drawer-body></div>
    </div>`;


  const stage = qs('[data-stage]', root);
  const media = qs('[data-media]', root);
  const photo = qs('[data-photo]', root);
  const canvas = qs('[data-canvas]', root);
  const status = qs('[data-status]', root);
  const roomsHost = qs('[data-rooms]', root);
  const fileInput = qs('[data-file]', root);
  const contextsHost = qs('[data-contexts]', root);
  const variantsHost = qs('[data-variants]', root);
  const addBtn = qs('[data-add]', root);
  const projectCta = qs('[data-project-cta]', root);
  const productLink = qs('[data-product-link]', root);
  const compareBtn = qs('[data-compare]', root);
  const compareLabel = qs('[data-compare-label]', root);
  const panelTitle = qs('[data-panel-title]', root);
  const ba = qs('[data-ba]', root);
  const baRange = qs('[data-ba-range]', root);
  const drawer = qs('[data-drawer]', root);
  const drawerBody = qs('[data-drawer-body]', root);
  const drawerTitle = qs('[data-drawer-title]', root);
  const dropdown = qs('[data-dropdown]', root);

  const renderer = createSceneRenderer();
  const catalog = await loadCatalog(base);
  const sceneIndex = await loadSceneIndex(base);


  const bibliotheque = scenesBibliotheque(sceneIndex);

  let config = {
    materialId: catalog.parquets[0].id,



    pattern: motifParDefaut(catalog.parquets[0]),
    angle: 0,
    width: null,
    scale: 1,
  };
  let variants = [];
  let sceneId = null;
  let sceneLabel = null;
  let pending = false;
  let refine = 0;
  let quality = 1;


  let attente = null;
  let regroupement = 0;
  const interaction = (nom) => { if (perfActif) { attente = nom; mark(nom); } };



  const SEUIL_TEMOIN_MS = 8000;
  let temoin = 0;
  const armerTemoin = () => {
    if (!perfActif) return;
    window.clearTimeout(temoin);
    const depuis = performance.now();
    temoin = window.setTimeout(() => {

      console.warn('[studio] aucun rendu depuis %d ms', Math.round(performance.now() - depuis), {
        pending,
        moteurPret: renderer.ready,
        enAttenteDeCartes: renderer.enAttente,
        config: { ...config, material: undefined },
      });
    }, SEUIL_TEMOIN_MS);
  };
  const desarmerTemoin = () => { if (perfActif) window.clearTimeout(temoin); };
  let editor = null;

  let activeZone = null;

  const material = () => catalog.get(config.materialId);

  const paintConfig = (source) => {
    const from = source || config;
    return { ...from, material: catalog.get(from.materialId) };
  };
  const setStatus = (message) => {
    status.textContent = message || '';
    status.hidden = !message;
  };



  let noteMotif = '';


  const DUREE_NOTE_MS = 6000;
  let minuteurNote = 0;
  const poserNote = (message) => {
    noteMotif = message || '';
    setStatus(noteMotif);
    window.clearTimeout(minuteurNote);
    if (noteMotif) minuteurNote = window.setTimeout(effacerNote, DUREE_NOTE_MS);
  };
  const effacerNote = () => {
    window.clearTimeout(minuteurNote);
    if (!noteMotif) return;
    noteMotif = '';
    setStatus('');
  };





  const apresRendu = new Set();



  let derniereDescription = '';
  function decrireCanvas() {
    const item = material();
    if (!item) return;
    const motif = catalog.patterns.find((p) => p.id === config.pattern);
    const parties = [
      `Aperçu du parquet ${item.name}`,
      motif ? `en ${motif.label}` : null,
      sceneLabel ? `dans ${sceneLabel}` : null,
    ].filter(Boolean);


    const phrase = config.angle
      ? `${parties.join(' ')}, lames orientées à ${config.angle} degrés.`
      : `${parties.join(' ')}.`;
    if (phrase === derniereDescription) return;
    derniereDescription = phrase;
    canvas.setAttribute('aria-label', phrase);
  }

  function paint() {
    pending = false;
    if (!renderer.ready) return;
    mark('app:paint:debut');
    const ok = renderer.paint(canvas, paintConfig(), null, quality);
    if (!ok && renderer.enAttente) {


      setStatus('Préparation du rendu…');
      return;
    }
    if (!ok) {
      setStatus('Zone de sol invalide : reprenez-la dans « Délimiter le sol ».');
      return;
    }

    setStatus(noteMotif);
    desarmerTemoin();
    decrireCanvas();
    mark('app:paint:fin');





    if (attente) { mesure(`interaction.${attente}`, attente, 'app:paint:fin'); attente = null; }
    mesure(`app.rendu.q${quality}`, 'app:paint:debut', 'app:paint:fin');

    apresRendu.forEach((cb) => { try { cb(quality); } catch {   } });
    if (quality > 1) {
      window.clearTimeout(refine);
      refine = window.setTimeout(() => {
        quality = 1;
        schedule();
      }, 180);
    }
  }



const REGROUPEMENT_MS = 70;

  function schedule(draft) {


    if (draft && renderer.backend !== 'webgl2') {
      quality = 2;
      window.clearTimeout(refine);
    }
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(paint);
      else paint();
      window.setTimeout(() => {
        if (pending) paint();
      }, 130);
    }, 0);
  }






  quandCartesPretes(() => { if (renderer.ready) schedule(); });

  function demandeRendu(draft) {
    window.clearTimeout(regroupement);
    armerTemoin();
    const mat = material();


    if (mat && enCache(mat, paintConfig())) {
      schedule(draft);
      return;
    }
    setStatus('Préparation du rendu…');
    regroupement = window.setTimeout(() => schedule(draft), REGROUPEMENT_MS);
  }





  function setContext(id) {
    mark('panneau:debut');


    if (root.dataset.panel === id && window.matchMedia('(max-width: 47.99rem)').matches) {
      root.dataset.sheet = 'peek';
      return;
    }
    const next = root.dataset.panel === id ? 'closed' : id;
    root.dataset.panel = next;
    contextsHost.querySelectorAll('[data-context]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.context === next));
    });
    root.querySelectorAll('[data-view]').forEach((view) => {
      view.hidden = view.dataset.view !== next;
    });
    const found = CONTEXTS.find((entry) => entry.id === next);
    if (found) panelTitle.textContent = found.title;
    if (next === 'motifs') { syncPatterns(); anticiperMotifs(); }
    if (next === 'orientation') syncOrientation();

    window.setTimeout(() => schedule(), 300);
  }

  CONTEXTS.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-btn';
    button.dataset.context = entry.id;
    button.setAttribute('aria-pressed', 'false');


    button.setAttribute('aria-controls', 'studio-panneau');
    button.textContent = entry.label;
    button.addEventListener('click', () => setContext(entry.id));
    contextsHost.appendChild(button);
  });


  const TELEPHONE = () => window.matchMedia('(max-width: 47.99rem)').matches;
  on(qs('[data-panel-close]', root), 'click', () => {
    if (TELEPHONE()) {
      root.dataset.sheet = 'peek';
      return;
    }
    setContext(root.dataset.panel);
  });



  on(qs('[data-sheet-more]', root), 'click', () => {

    root.dataset.sheet = 'full';
  });


  on(qs('[data-sheet-toggle]', root), 'click', () => {
    const index = SHEET_LEVELS.indexOf(root.dataset.sheet);
    root.dataset.sheet = SHEET_LEVELS[(index + 1) % SHEET_LEVELS.length];
  });



  bibliotheque.forEach((entry) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'room-card';
    card.dataset.room = entry.id;
    const stem = entry.file.replace(/\.jpg$/, '');


    const zones = entry.zones > 1 ? `<span class="room-card__zones">${entry.zones} sols visibles</span>` : '';
    const quoi = entry.highlight ? `<span class="room-card__quoi">${echapper(entry.highlight)}</span>` : '';



    const nom = echapper(entry.label);
    const fichier = encodeURIComponent(stem);
    card.innerHTML = `
      <picture>
        <source type="image/webp" srcset="${base}assets/images/${fichier}-640.webp" />
        <img src="${base}assets/images/${fichier}-640.jpg" alt="${nom}" decoding="async" width="640" height="427" />
      </picture>
      <span class="room-card__label">${nom}${quoi}${zones}</span>`;
    card.addEventListener('click', () => openRoom(entry.id));
    roomsHost.appendChild(card);
  });

  on(qs('[data-import]', root), 'click', () => fileInput.click());
  on(fileInput, 'change', () => {
    if (fileInput.files && fileInput.files[0]) openPhoto(fileInput.files[0]);
    fileInput.value = '';
  });



  function afterScene(name) {
    root.dataset.state = 'edit';


    root.dataset.source = renderer.scene.source === 'manual' ? 'photo' : 'exemple';
    qs('[data-project]', root).textContent = ` · ${name}`;
    photo.src = renderer.photo.toDataURL('image/jpeg', 0.9);

    const zones = renderer.scene.floorZones;
    activeZone = zones[zones.length - 1].id;
    if (editor) editor.setMode('off');
    quality = 1;
    schedule();
    warmMaterial(material(), config);


    syncProjectCta();
  }



  function reserverScene({ width, height, file, alt }) {
    canvas.width = width;
    canvas.height = height;


    media.style.setProperty('--ratio', `${width} / ${height}`);
    if (file) photo.src = `${base}assets/images/${file}`;
    if (alt) photo.alt = alt;
    root.dataset.state = 'edit';
  }



  async function openRoom(id) {
    const connue = (sceneIndex.scenes || []).find((e) => e.id === id);
    if (connue && !sceneOuvrable(sceneIndex, id)) {
      root.dataset.state = 'start';
      setStatus('Cette pièce n’est plus proposée.');
      return;
    }
    interaction('ouverture');
    setStatus('Chargement…');
    try {
      const scene = await analyzeScene({ sceneId: id, base });

      reserverScene({ width: scene.image.width, height: scene.image.height, file: scene.image.file, alt: scene.image.alt });
      setStatus('Préparation du rendu…');



      const petit = window.innerWidth < 600;
      const fichier = petit ? scene.image.file.replace(/\.jpg$/, '-1120.jpg') : scene.image.file;
      const prepared = await loadImage(`${base}assets/images/${fichier}`).catch(() => loadImage(`${base}assets/images/${scene.image.file}`));
      renderer.setScene(scene, prepared);
      sceneId = id;


      sceneLabel = scene.label;
      photo.alt = scene.image.alt;


      const stem = scene.image.file.replace(/\.jpg$/, '');
      qs('[data-room-thumb]', root).style.backgroundImage = `url(${base}assets/images/${stem}-640.jpg)`;
      afterScene(scene.label);
      setStatus('');
      mountEditor();


      setContext('parquets');
    } catch (error) {


      root.dataset.state = 'start';
      setStatus('Cette pièce n’a pas pu être chargée. Choisissez-en une autre.');
      console.error('[visualiseur]', error);
    }
  }

  async function openPhoto(file) {
    setStatus('Lecture de la photo…');
    try {
      const prepared = await loadFile(file);



      const scene = await analyzeScene({ width: prepared.width, height: prepared.height, label: 'Ma photo' });


      reserverScene({ width: prepared.width, height: prepared.height, alt: 'Votre pièce' });
      setStatus('Préparation du rendu…');
      renderer.setScene(scene, prepared);
      sceneId = null;

      sceneLabel = null;
      photo.alt = 'Votre pièce';
      qs('[data-room-thumb]', root).style.backgroundImage = 'none';
      afterScene('Ma photo');
      mountEditor();
      root.dataset.panel = 'closed';
      openDrawer('zone');
      setStatus('Délimitez le sol : alignez les poignées sur le pied des murs.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.');
    }
  }



  const catalogView = qs('[data-view="parquets"]', root);
  const selectedHost = document.createElement('div');
  selectedHost.className = 'selected';
  catalogView.appendChild(selectedHost);
  const catalogSlot = document.createElement('div');
  catalogView.appendChild(catalogSlot);

  const catalogUi = createCatalog(catalogSlot, catalog, {
    onSelect: (item) => selectMaterial(item.id),


    onVisible: null,
  });

  function selectMaterial(id) {
    const next = catalog.get(id);
    if (!next) return;
    interaction('produit');



    const { config: normalise, adapte } = normaliserConfig(
      { ...config, materialId: id },
      next
    );
    config = normalise;
    catalogUi.setActive(id);
    syncSelected();


    syncPatterns();
    if (adapte) {
      const retenu = catalog.patterns.find((entry) => entry.id === config.pattern);
      poserNote(messageAdaptation(next, retenu ? retenu.label : config.pattern));
    } else {

      effacerNote();
    }
    syncProductLink();
    emettre('select_product', { productId: id, pattern: config.pattern || '' });


    if (estReferencePremibel(next && next.product)) {
      emettre('view_product', { productId: id, contexte: 'studio' });
    }
    demandeRendu(true);
    save();


  }

  function syncSelected() {
    const item = material();
    if (!item) return;
    const swatch = swatchFor(item);
    const fiche = item.product || {};
    const dims = fiche.dimensions || {};




    const cotes = dims.widthMm
      ? `${dims.widthMm} × ${dims.lengthMm || '?'} mm`
      : `lames ${Math.round(item.plank.width * 1000)} mm`;
    const surface = [fiche.finish, fiche.surfaceTreatment].filter(Boolean).join(' · ') || item.finish;







    const lien =
      fiche.source === 'premibel' && fiche.productUrl
        ? `<a class="selected__ref" href="${echapper(fiche.productUrl)}" target="_blank" rel="sponsored noopener">Voir la référence${
            fiche.sku ? ` <span>${echapper(fiche.sku)}</span>` : ''
          }</a>`
        : '';



    const statut = fiche.source === 'premibel'
      ? `<span class="selected__status">${fiche.visualStatus === 'ready' ? 'Rendu fidèle' : 'Rendu indicatif'} · référence Premibel</span>`
      : '<span class="selected__status selected__status--demo">Démonstration · parquet calculé par le moteur, pas une référence en vente</span>';



    const demo = fiche.source !== 'premibel';
    selectedHost.dataset.demo = String(demo);
    if (demo) {
      selectedHost.innerHTML = `
        <p class="selected__eyebrow">Configuration de démonstration</p>
        <p class="selected__demo">« ${echapper(item.name)} » est un parquet calculé par le moteur pour cet exemple : aucune référence en vente ne lui correspond.</p>
        <button type="button" class="btn btn--sm selected__choose" data-choisir-premibel>Choisir une référence Premibel</button>`;
      selectedHost.querySelector('[data-choisir-premibel]').addEventListener('click', () => {

        if (root.dataset.sheet === 'peek') root.dataset.sheet = 'full';
        catalogSlot.scrollIntoView({ block: 'start', behavior: 'smooth' });
        const champ = catalogSlot.querySelector('input[type="search"], .cat__search input');
        if (champ) champ.focus({ preventScroll: true });
      });
      return;
    }
    selectedHost.innerHTML = `
      <p class="selected__eyebrow">Sur le sol</p>
      <span class="selected__swatch"></span>
      <span class="selected__text">
        <strong>${echapper(item.name)}</strong>
        ${statut}
        <span>${echapper(surface)} · ${echapper(cotes)}</span>
        ${lien}
      </span>`;
    const slot = selectedHost.querySelector('.selected__swatch');
    const mini = document.createElement('canvas');
    mini.width = swatch.width;
    mini.height = swatch.height;
    mini.getContext('2d').drawImage(swatch, 0, 0);
    slot.appendChild(mini);
  }



  const patternsView = qs('[data-view="motifs"]', root);


  function anticiperMotifs() {
    const item = material();
    if (!item) return;
    item.compatiblePatterns.forEach((pattern) => {
      if (pattern === config.pattern) return;
      warmMaterial(item, { ...config, pattern });
    });
  }

  function syncPatterns() {
    const item = material();





    const grilleAJour = patternsView.dataset.pour === (item ? item.id : '') && patternsView.querySelector('[data-pattern]');
    if (grilleAJour || root.dataset.panel !== 'motifs') {
      patternsView.querySelectorAll('[data-pattern]').forEach((carte) => {
        carte.setAttribute('aria-pressed', String(carte.dataset.pattern === config.pattern));
      });
      const note = patternsView.querySelector('[data-waste]');
      const motif = catalog.patterns.find((entry) => entry.id === config.pattern);
      if (note && motif) note.textContent = `Chutes ${motif.waste} selon la pièce et le calepinage.`;
      return;
    }

    patternsView.dataset.pour = item ? item.id : '';
    patternsView.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    catalog.patterns.forEach((pattern) => {
      const allowed = motifAutorise(item, pattern.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tile-card';
      card.dataset.pattern = pattern.id;


      card.disabled = !allowed;
      card.setAttribute('aria-pressed', String(config.pattern === pattern.id));
      const raison = allowed ? '' : raisonIndisponible(item, pattern.label);
      card.innerHTML = `<span class="tile-card__media"></span><span class="tile-card__label">${echapper(pattern.label)}</span>`
        + (allowed ? '' : `<span class="tile-card__note">Pas pour ce parquet</span>`);
      if (!allowed) {



        card.setAttribute('aria-label', raison);
        card.title = raison;
      }
      if (item) {
        const preview = document.createElement('canvas');
        preview.width = 288;
        preview.height = 162;
        card.querySelector('.tile-card__media').appendChild(preview);
        drawPatternPreview(preview, item, pattern.id);
      }
      card.addEventListener('click', () => {



        if (!motifAutorise(material(), pattern.id)) return;
        interaction('motif');
        emettre('select_pattern', { pattern: pattern.id, productId: config.materialId || '' });
        effacerNote();
        config = { ...config, pattern: pattern.id };
        syncPatterns();
        demandeRendu(true);
        save();
      });
      grid.appendChild(card);
    });
    patternsView.appendChild(grid);



    const current = catalog.patterns.find((entry) => entry.id === config.pattern);
    if (current) {
      const note = document.createElement('p');
      note.className = 'drawer__hint';
      note.dataset.waste = '';
      note.style.marginTop = '0.6rem';
      note.textContent = `Chutes ${current.waste} selon la pièce et le calepinage.`;
      patternsView.appendChild(note);
    }
  }



  function drawPatternPreview(target, item, pattern) {



    apercuAsync(item, pattern, 320).then((image) => {
      if (!target.isConnected) return;
      const ctx = target.getContext('2d');
      ctx.imageSmoothingQuality = 'high';


      ctx.drawImage(image, 40, 60, 240, 135, 0, 0, target.width, target.height);
    }).catch(() => {   });
  }



  const orientationView = qs('[data-view="orientation"]', root);
  function syncOrientation() {
    orientationView.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'orient';
    ORIENTATIONS.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'orient__item';
      button.dataset.angle = String(item.angle);
      button.setAttribute('aria-label', item.label);
      button.setAttribute('aria-pressed', String(Math.round(config.angle) === item.angle));
      button.innerHTML = icon(item.icon);
      button.addEventListener('click', () => {
        interaction('orientation');
        config = { ...config, angle: item.angle };
        syncOrientation();
        demandeRendu(true);
        save();
      });
      grid.appendChild(button);
    });
    orientationView.appendChild(grid);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'panel__link';
    more.textContent = 'Angle libre et échelle';
    more.addEventListener('click', () => openDrawer('advanced'));
    orientationView.appendChild(more);
  }



  const applyBa = () => media.style.setProperty('--ba', `${baRange.value}%`);
  on(baRange, 'input', applyBa);
  applyBa();
  on(qs('[data-toggle-ba]', root), 'click', (event) => {
    const next = ba.hidden;
    ba.hidden = !next;
    media.dataset.ba = String(next);
    event.currentTarget.setAttribute('aria-pressed', String(next));
    if (next) applyBa();
  });





  function projectLink(variant) {
    const source = variant ? variant.config : config;
    const item = catalog.get(source.materialId);

    const query = buildHandoffParams({
      sceneId,
      sceneLabel,
      productId: item ? item.id : null,
      productLabel: item ? item.name : null,
      pattern: source.pattern,
      angle: source.angle,


      ficheProduit: estReferencePremibel(item && item.product),
    });

    return `${base}projet/?${query.toString()}`;
  }



  function syncProjectCta() {
    if (!projectCta) return;
    projectCta.href = projectLink();
  }



  function syncProductLink() {
    if (!productLink) return;


    const fiche = ficheProduit(material() && material().product);
    if (!fiche) {
      productLink.hidden = true;
      productLink.removeAttribute('href');
      return;
    }
    productLink.href = fiche.url;
    productLink.textContent = fiche.libelle;
    productLink.hidden = false;
  }

  on(productLink, 'click', () => suivreClic(material() && material().product, 'studio'));



  on(projectCta, 'click', () => {
    emettre('start_project', {
      contexte: 'studio',
      productId: config.materialId || '',
      pattern: config.pattern || '',
    });
  });

  const compareUi = createCompare(root, {
    renderer,
    catalog,
    paintConfig,
    projectLink,
    onUse: (variant) => {


      const vise = catalog.get(variant.config.materialId);
      const { config: normalise, adapte } = normaliserConfig({ ...variant.config }, vise);
      config = normalise;
      catalogUi.setActive(config.materialId);
      syncSelected();
      syncPatterns();
      schedule();
      compareUi.close();
      if (adapte) {
        const retenu = catalog.patterns.find((entry) => entry.id === config.pattern);
        poserNote(messageAdaptation(vise, retenu ? retenu.label : config.pattern));
      } else {
        effacerNote();
      }
      save();
    },
  });

  function syncVariants() {
    variantsHost.innerHTML = '';
    variants.forEach((variant, index) => {
      const item = catalog.get(variant.config.materialId);
      const chip = document.createElement('span');
      chip.className = 'variant';
      chip.title = item.name;
      chip.innerHTML = `<span class="variant__dot" data-index="${index + 1}"></span><span class="variant__name">${echapper(item.name)}</span>`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'variant__remove';
      remove.setAttribute('aria-label', `Retirer ${item.name} de la comparaison`);
      remove.innerHTML = icon('m6 6 12 12M18 6 6 18');
      remove.addEventListener('click', () => {
        variants = variants.filter((entry) => entry.id !== variant.id);
        syncVariants();
        save();
      });
      chip.appendChild(remove);
      variantsHost.appendChild(chip);
    });
    compareBtn.disabled = variants.length < 2;
    compareLabel.textContent = variants.length ? `Comparer (${variants.length})` : 'Comparer';
    addBtn.disabled = variants.length >= MAX_VERSIONS;
  }

  on(addBtn, 'click', () => {
    if (variants.length >= MAX_VERSIONS) return;
    variants = [...variants, { id: `v${Date.now()}`, config: { ...config } }];
    syncVariants();
    save();
    setStatus(
      variants.length < 2
        ? 'Version retenue. Essayez-en une autre, puis comparez.'
        : `Comparez vos ${variants.length} versions.`
    );
    window.setTimeout(() => setStatus(''), 2600);
  });
  on(compareBtn, 'click', () => compareUi.open(variants));



  on(qs('[data-save]', root), 'click', async (event) => {
    if (!renderer.ready) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const image = composeRender({
        primary: canvas,
        photo,
        mode: ba.hidden ? 'off' : 'photo',
        ratio: Number(baRange.value) / 100,
      });
      await downloadCanvas(image, `parquet-${material().slug}.jpg`);
      setStatus('Rendu enregistré.');
      window.setTimeout(() => setStatus(''), 2600);
    } finally {
      button.disabled = false;
    }
  });



  on(qs('[data-menu]', root), 'click', (event) => {
    const open = dropdown.hidden;
    dropdown.hidden = !open;
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  on(document, 'click', (event) => {
    if (!dropdown.hidden && !event.target.closest('.studio__menu')) {
      dropdown.hidden = true;
      qs('[data-menu]', root).setAttribute('aria-expanded', 'false');
    }
  });

  const zone = () => renderer.scene.floorZones.find((item) => item.id === activeZone);



  const contoursRetouches = new Set();

  let majConseilCadre = null;

  function mountEditor() {
    if (editor) {
      loadZoneIntoEditor();
      return;
    }
    editor = createFloorEditor(media, {


      zoneVisible() {
        const s = stage.getBoundingClientRect();
        let left = Math.max(0, s.left);
        let top = Math.max(0, s.top);
        let right = Math.min(window.innerWidth, s.right);
        let bottom = Math.min(window.innerHeight, s.bottom);
        [drawer, qs('.studio__actions', root)].forEach((el) => {
          if (!el || el.hidden) return;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || r.right <= left || r.left >= right || r.bottom <= top || r.top >= bottom) return;


          if (r.top > (top + bottom) / 2) bottom = Math.min(bottom, r.top);
          else if (r.left > (left + right) / 2) right = Math.min(right, r.left);
        });
        const prise = 24;
        return { left: left + prise, top: top + prise, right: right - prise, bottom: bottom - prise };
      },








      onFrameChange(next) {
        const target = zone();
        const photoImportee = renderer.scene.source === 'manual';
        let plan = next;
        if (photoImportee) {



          target.cadre = next.map((p) => ({ ...p }));
          plan = planDuCadre(next, renderer.size.width, renderer.size.height) || next;
          const lues = dimensionsDuCadre(plan, renderer.size.width, renderer.size.height);



          if (lues) target.plane.meters = { width: lues.width, depth: lues.depth };
        }
        target.plane.quad = plan.map((p) => ({ ...p }));
        if (!contoursRetouches.has(target.id) && !renderer.masks.hasStrokes()) {
          const principal = target === renderer.scene.floorZones[0];
          const contour = !photoImportee ? next : principal ? contourDuCadre(plan) : decouperALaPhoto(next);
          renderer.masks.setPolygon(target.id, contour);
          editor.setPolygon(contour);
        }
        if (majConseilCadre) majConseilCadre();
        renderer.invalidateMasks();
        schedule(true);
      },






      onGestureEnd() {
        renderer.refreshLighting();
        quality = 1;
        schedule();
      },
      onPolygonChange(next) {
        contoursRetouches.add(activeZone);
        renderer.masks.setPolygon(activeZone, next);
        renderer.invalidateMasks();
        schedule(true);
      },
      onInsertPoint(point) {
        contoursRetouches.add(activeZone);
        renderer.masks.insertPointNear(activeZone, point);
        editor.setPolygon(renderer.masks.getPolygon(activeZone));
        renderer.invalidateMasks();
        schedule(true);
      },
      onRemovePoint(index) {
        contoursRetouches.add(activeZone);
        const removed = renderer.masks.removePoint(activeZone, index);
        if (removed) {
          editor.setPolygon(renderer.masks.getPolygon(activeZone));
          renderer.invalidateMasks();
          schedule(true);
        }
        return removed;
      },
      onStrokeStart(mode, radius, point) {
        const ratio = renderer.size.width / (media.clientWidth || renderer.size.width);
        renderer.masks.beginStroke(activeZone, mode, Math.max(2, radius * ratio), point);
        renderer.invalidateMasks();
        schedule(true);
      },
      onStrokeMove(point) {
        renderer.masks.extendStroke(point);
        renderer.invalidateMasks();
        schedule(true);
      },



      onStrokeEnd() {
        renderer.refreshLighting();
        quality = 1;
        schedule();
      },
    });
    loadZoneIntoEditor();
  }

  function loadZoneIntoEditor() {
    const target = zone();
    if (!editor || !target) return;

    editor.setFrame(target.cadre || target.plane.quad);
    editor.setPolygon(renderer.masks.getPolygon(target.id));
  }

  function openDrawer(kind) {
    dropdown.hidden = true;
    drawerTitle.textContent = kind === 'zone' ? 'Délimiter le sol' : 'Réglages avancés';
    drawerBody.innerHTML = '';
    drawer.hidden = false;
    root.dataset.drawer = kind;
    if (kind === 'zone') buildZoneTools();
    else buildAdvanced();
  }

  function closeDrawer() {
    const wasEditing = stage.dataset.editing === 'true';
    drawer.hidden = true;
    delete root.dataset.drawer;
    if (editor) editor.setMode('off');
    stage.dataset.editing = 'false';
    if (wasEditing && renderer.ready) {
      renderer.refreshLighting();
      schedule();
    }
  }
  on(qs('[data-drawer-close]', root), 'click', closeDrawer);
  on(qs('[data-advanced]', root), 'click', () => openDrawer('advanced'));
  on(qs('[data-fix]', root), 'click', () => openDrawer('zone'));



  function buildZoneTools() {
    if (!editor) mountEditor();
    stage.dataset.editing = 'true';
    const photoImportee = renderer.scene.source === 'manual';
    const modes = [
      [
        'frame',
        'Le sol',


        photoImportee
          ? 'Posez les poignées du haut au pied du mur du fond, celles du bas sur le pied des murs de côté. Le parquet suit ces lignes jusqu’au bas de la photo ; un tapis ou un meuble se retire ensuite dans « Les objets ».'
          : 'Placez les quatre poignées aux angles du sol.',
      ],
      ['polygon', 'Le contour', 'Ajoutez des points pour suivre un mur ou une plinthe.'],
      ['brush', 'Les objets', 'Effacez ce qui doit rester devant : meubles, tapis, plinthes.'],
    ];
    const tool = { mode: 'frame', brush: 'remove', radius: 42 };
    const seg = document.createElement('div');
    seg.className = 'seg-tabs';
    const hint = document.createElement('p');
    hint.className = 'drawer__hint';
    const brushBox = document.createElement('div');
    brushBox.className = 'drawer__brush';
    brushBox.hidden = true;
    brushBox.innerHTML = `
      <div class="seg-tabs seg-tabs--pair">
        <button type="button" data-brush="add" aria-pressed="false">Ajouter</button>
        <button type="button" data-brush="remove" aria-pressed="true">Retirer</button>
      </div>
      <label class="drawer__range"><span class="visually-hidden">Taille du pinceau</span>
        <input type="range" min="10" max="140" step="2" value="42" data-radius /><output>42 px</output></label>`;



    const conseil = document.createElement('p');
    conseil.className = 'drawer__conseil';
    conseil.hidden = true;
    conseil.textContent = 'Côtés presque parallèles : la pièce paraîtra plate. Faites suivre aux poignées du bas le pied des murs, qui se rapprochent vers le fond.';
    majConseilCadre = () => {
      const cible = zone();
      conseil.hidden = !(
        photoImportee &&
        tool.mode === 'frame' &&
        cible &&
        cotesParalleles(cible.cadre || cible.plane.quad, renderer.size.width, renderer.size.height)
      );
    };

    const applyMode = () => {
      editor.setMode(tool.mode);
      editor.setBrush({ mode: tool.brush, radius: tool.radius });
      brushBox.hidden = tool.mode !== 'brush';
      seg.querySelectorAll('[data-mode]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.mode === tool.mode))
      );
      const found = modes.find((entry) => entry[0] === tool.mode);
      hint.textContent = found ? found[2] : '';
      majConseilCadre();
    };



    const zonesBox = document.createElement('div');
    zonesBox.className = 'drawer__stack';
    const renderZones = () => {
      zonesBox.innerHTML = '';
      const zones = renderer.scene.floorZones;
      const label = document.createElement('p');
      label.className = 'drawer__hint';




      label.textContent = zones.length > 1
        ? 'Sol en cours de réglage :'
        : 'Votre photo montre un second sol (pièce voisine, couloir) ? Ajoutez-le, il recevra le même parquet.';
      const picker = document.createElement('div');
      picker.className = 'seg-tabs';
      picker.style.gridTemplateColumns = `repeat(${Math.min(3, zones.length)}, minmax(0, 1fr))`;
      zones.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.zone = item.id;
        button.textContent = item.label;
        button.setAttribute('aria-pressed', String(item.id === activeZone));
        button.addEventListener('click', () => {
          activeZone = item.id;
          renderZones();
          loadZoneIntoEditor();
          applyMode();
        });
        picker.appendChild(button);
      });

      const row = document.createElement('div');
      row.className = 'drawer__row';
      const add = document.createElement('button');
      add.className = 'btn btn--ghost btn--xs';
      add.type = 'button';
      add.textContent = 'Ajouter un sol';
      add.addEventListener('click', () => {
        const created = addZone(renderer.scene, { label: `Sol ${renderer.scene.floorZones.length + 1}` });
        renderer.masks.registerZone(created);
        activeZone = created.id;
        renderZones();
        loadZoneIntoEditor();
        applyMode();
        renderer.refreshLighting();
        schedule();
        setStatus('Nouveau sol ajouté : placez ses quatre poignées.');
        window.setTimeout(() => setStatus(''), 3200);
      });
      row.appendChild(add);
      if (renderer.scene.floorZones.length > 1) {
        const drop = document.createElement('button');
        drop.className = 'btn btn--ghost btn--xs';
        drop.type = 'button';
        drop.textContent = 'Retirer ce sol';
        drop.addEventListener('click', () => {
          const target = activeZone;
          if (!removeZone(renderer.scene, target)) return;
          renderer.masks.removeZone(target);
          activeZone = renderer.scene.floorZones[renderer.scene.floorZones.length - 1].id;
          renderZones();
          loadZoneIntoEditor();
          applyMode();
          renderer.refreshLighting();
          schedule();
        });
        row.appendChild(drop);
      }
      if (zones.length > 1) zonesBox.append(label, picker, row);
      else zonesBox.append(label, row);
    };
    renderZones();

    modes.forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = id;
      button.textContent = label;
      button.addEventListener('click', () => {
        tool.mode = id;
        applyMode();
      });
      seg.appendChild(button);
    });

    brushBox.querySelectorAll('[data-brush]').forEach((button) =>
      button.addEventListener('click', () => {
        tool.brush = button.dataset.brush;
        brushBox
          .querySelectorAll('[data-brush]')
          .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.brush === tool.brush)));
        applyMode();
      })
    );
    const radius = brushBox.querySelector('[data-radius]');
    radius.addEventListener('input', () => {
      tool.radius = Number(radius.value);
      brushBox.querySelector('output').textContent = `${tool.radius} px`;
      editor.setBrush({ radius: tool.radius });
    });

    const undo = document.createElement('div');
    undo.className = 'drawer__row';
    undo.innerHTML = `
      <button class="btn btn--ghost btn--xs" type="button" data-undo>Annuler</button>
      <button class="btn btn--ghost btn--xs" type="button" data-redo>Rétablir</button>
      <button class="btn btn--ghost btn--xs" type="button" data-clear>Tout effacer</button>`;
    const afterEdit = () => {
      renderer.refreshLighting();
      schedule();
    };
    undo.querySelector('[data-undo]').addEventListener('click', () => renderer.masks.undo() && afterEdit());
    undo.querySelector('[data-redo]').addEventListener('click', () => renderer.masks.redo() && afterEdit());
    undo.querySelector('[data-clear]').addEventListener('click', () => {
      renderer.masks.clearStrokes();
      afterEdit();
    });

    const done = document.createElement('button');
    done.className = 'btn btn--solid btn--sm btn--block';
    done.type = 'button';
    done.textContent = 'Terminer';
    const alerte = document.createElement('p');
    alerte.className = 'drawer__alert';
    alerte.setAttribute('role', 'alert');
    alerte.hidden = true;


    done.addEventListener('click', () => {
      const problemes = renderer.scene.floorZones.map((item) => {
        const cadre = problemeCadre(item.cadre || item.plane.quad);
        if (cadre) return { item, mode: 'frame', texte: cadre };
        const boite = renderer.masks.box(item.id);
        const aire = boite ? ((boite.x1 - boite.x0) * (boite.y1 - boite.y0)) / (renderer.size.width * renderer.size.height) : 0;
        if (!boite || aire < 0.01) return { item, mode: 'polygon', texte: 'Le contour ne couvre presque rien : reprenez « Le contour » pour suivre le sol.' };
        return null;
      }).filter(Boolean);
      if (!problemes.length) {
        alerte.hidden = true;
        closeDrawer();
        return;
      }
      const premier = problemes[0];
      activeZone = premier.item.id;
      tool.mode = premier.mode;
      loadZoneIntoEditor();
      applyMode();
      alerte.textContent = renderer.scene.floorZones.length > 1 ? `${premier.item.label} : ${premier.texte}` : premier.texte;
      alerte.hidden = false;
    });


    drawerBody.append(seg, hint, conseil, brushBox, undo, alerte, done, zonesBox);
    applyMode();
  }

  function buildAdvanced() {
    const item = material();
    const wrap = document.createElement('div');
    wrap.className = 'drawer__stack';
    const widthValue = config.width || item.plank.width;
    wrap.innerHTML = `
      <label class="drawer__range"><span>Largeur des lames</span>
        <input type="range" min="9" max="26" step="1" value="${Math.round(widthValue * 100)}" data-width />
        <output>${Math.round(widthValue * 100)} cm</output></label>
      <label class="drawer__range"><span>Échelle du motif</span>
        <input type="range" min="60" max="160" step="5" value="${Math.round(config.scale * 100)}" data-scale />
        <output>${Math.round(config.scale * 100)} %</output></label>
      <label class="drawer__range"><span>Angle libre</span>
        <input type="range" min="-90" max="90" step="1" value="${Math.round(config.angle)}" data-angle />
        <output>${Math.round(config.angle)}°</output></label>
      <button class="btn btn--ghost btn--sm btn--block" type="button" data-defaults>Revenir aux valeurs du parquet</button>`;

    const bind = (selector, apply, format) => {
      const input = wrap.querySelector(selector);
      input.addEventListener('input', () => {
        apply(Number(input.value));
        input.parentElement.querySelector('output').textContent = format(Number(input.value));
        schedule(true);
        save();
      });
    };
    bind('[data-width]', (v) => {
      config = { ...config, width: v / 100 };
    }, (v) => `${v} cm`);
    bind('[data-scale]', (v) => {
      config = { ...config, scale: v / 100 };
    }, (v) => `${v} %`);
    bind('[data-angle]', (v) => {
      config = { ...config, angle: v };
      syncOrientation();
    }, (v) => `${v}°`);

    wrap.querySelector('[data-defaults]').addEventListener('click', () => {
      config = { ...config, width: null, scale: 1 };
      openDrawer('advanced');
      schedule();
      save();
    });
    drawerBody.appendChild(wrap);
  }



  on(qs('[data-change-room]', root), 'click', () => {
    root.dataset.state = 'start';
    root.dataset.panel = 'closed';
    closeDrawer();
  });
  on(qs('[data-restart]', root), 'click', () => {
    variants = [];
    effacerNote();
    config = {
      materialId: catalog.parquets[0].id,
      pattern: motifParDefaut(catalog.parquets[0]),
      angle: 0,
      width: null,
      scale: 1,
    };
    syncVariants();
    catalogUi.setActive(config.materialId);
    syncSelected();
    save();
    if (sceneId) openRoom(sceneId);
    else root.dataset.state = 'start';
  });


  on(qs('[data-back]', root), 'click', (event) => {
    const from = document.referrer;
    const sameSite = from && new URL(from, window.location.href).origin === window.location.origin;
    if (sameSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });

  on(qs('[data-help]', root), 'click', async () => {
    const { openHelp } = await import('./help.js');
    openHelp(root);
  });



  function syncUrl() {
    try {
      const url = new URL(window.location.href);
      if (config.materialId) url.searchParams.set('parquet', config.materialId);
      if (config.pattern) url.searchParams.set('motif', config.pattern);
      if (sceneId) url.searchParams.set('piece', sceneId);
      else url.searchParams.delete('piece');
      if (url.searchParams.has('orientation')) url.searchParams.set('orientation', String(Math.round(config.angle || 0)));
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
    } catch (error) {
      void error;
    }
  }

  function save() {


    syncProjectCta();
    syncProductLink();
    syncUrl();

    try {
      window.localStorage.setItem(STORAGE, JSON.stringify({ config, variants, sceneId }));
    } catch (error) {
      void error;
    }
  }

  function restore() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE) || '{}');


      if (stored.config && catalog.get(stored.config.materialId)) {
        const fusion = { ...config, ...stored.config };
        config = normaliserConfig(fusion, catalog.get(fusion.materialId)).config;
      }
      if (Array.isArray(stored.variants)) {
        variants = stored.variants
          .filter((v) => v && v.config && catalog.get(v.config.materialId))
          .map((v) => ({
            ...v,
            config: normaliserConfig(v.config, catalog.get(v.config.materialId)).config,
          })).slice(0, MAX_VERSIONS);
      }
    } catch (error) {
      void error;
    }
  }



  restore();



  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('parquet');
  if (wanted && catalog.get(wanted)) config.materialId = wanted;
  const motif = params.get('motif');
  if (motif) config.pattern = motif;
  const orientation = Number(params.get('orientation'));
  if (Number.isFinite(orientation) && params.get('orientation') !== null) {
    config.angle = Math.max(-90, Math.min(90, orientation));
  }


  const chosen = catalog.get(config.materialId);
  const lien = normaliserConfig(config, chosen);
  config = lien.config;
  if (lien.adapte && motif) {
    const retenu = catalog.patterns.find((entry) => entry.id === config.pattern);
    poserNote(messageAdaptation(chosen, retenu ? retenu.label : config.pattern));
  }

  catalogUi.setActive(config.materialId);
  syncSelected();
  syncVariants();
  syncProjectCta();
  syncProductLink();

  const requested = params.get('piece');





  if (requested) openRoom(requested);
  else if (params.get('demarrer') === '1' && bibliotheque.length) openRoom(bibliotheque[0].id);

  on(window, 'resize', () => {
    if (!renderer.ready) return;
    interaction('resize');
    schedule();
  });

  if (perfActif) {


    const api = {
      apiVersion: 1,


      get config() { return config; },
      selectMaterial,


      setPattern: (id) => {
        if (!motifAutorise(material(), id)) return false;
        interaction('motif');
        effacerNote();
        config = { ...config, pattern: id };
        syncPatterns();
        demandeRendu(true);
        return true;
      },
      setAngle: (a) => { interaction('orientation'); config = { ...config, angle: a }; syncOrientation(); demandeRendu(true); },



      setWidth: (metres) => {
        if (metres !== null && !(Number.isFinite(metres) && metres >= 0.02 && metres <= 0.5)) return false;
        interaction('largeur');
        config = { ...config, width: metres };
        demandeRendu(true);
        return true;
      },



      getCapabilities: () => ({
        pattern: typeof api.setPattern === 'function',
        width: typeof api.setWidth === 'function',
        orientation: typeof api.setAngle === 'function',
        scale: typeof api.setScale === 'function',
        finish: false,
        grain: false,
        joints: false,
      }),



      onRendered: (cb) => {
        if (typeof cb !== 'function') return () => {};
        apresRendu.add(cb);
        return () => apresRendu.delete(cb);
      },

      openRoom,
      canvas,


      setContext,
      get renderer() { return renderer; },
      catalog,
    };
    window.__studio = api;
  }

  return {
    element: root,
    openRoom,
    setContext,
    backend: renderer.backend,
    get config() {
      return { ...config };
    },
  };
}
