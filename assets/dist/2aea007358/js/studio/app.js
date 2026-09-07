/**
 * Visualiseur Parquet — l'application.
 *
 * Composition : **la pièce est le sujet**, tout le reste s'efface. Un seul
 * contexte est ouvert à la fois — Parquet, Motif ou Orientation — et quand on
 * le referme la photo reprend toute la largeur. L'utilisateur n'a jamais à
 * connaître un plan de perspective, une surface ni un masque.
 *
 * Le nom interne reste « studio » : fichiers, classes CSS, clé de stockage.
 * Le nom affiché est Visualiseur Parquet.
 *
 * Le parcours est déjà celui d'après :
 *
 *   aujourd'hui   importer → délimiter le sol → visualiser
 *   demain        importer → [analyse] → corriger si besoin → visualiser
 *
 * Une seule étape change de statut, aucune ne change de place. Voir
 * js/scene/analyzer.js et docs/future-ai-api-contract.md.
 *
 * Rien ne quitte le navigateur : la photo est lue localement, le rendu est
 * calculé localement, aucun envoi vers un serveur.
 */
import { qs, on } from '../utils/dom.js';
import { analyzeScene, loadSceneIndex, scenesBibliotheque, sceneOuvrable } from '../scene/analyzer.js';
import { loadImage, loadFile } from '../scene/image-loader.js';
import { createFloorEditor } from '../scene/editor.js';
import { composeRender, downloadCanvas } from '../scene/export.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { warmMaterial, enCache, quandCartesPretes, apercuAsync } from '../scene/material.js';
import { addZone, removeZone } from '../scene/schema.js';
import { loadCatalog, createCatalog, swatchFor } from './catalog.js';
import { createCompare } from './compare.js';
import { mark, mesure, perfActif } from '../utils/perf.js';

const ORIENTATIONS = [
  { angle: 0, label: 'Lames dans la largeur', icon: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' },
  { angle: 90, label: 'Lames dans la profondeur', icon: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4' },
  { angle: 45, label: 'Diagonale vers la droite', icon: 'M6 18 18 6M18 12V6h-6' },
  { angle: -45, label: 'Diagonale vers la gauche', icon: 'M18 18 6 6M6 12V6h6' },
];

/** Un contexte = un panneau. Jamais deux ouverts, jamais trois empilés. */
const CONTEXTS = [
  { id: 'parquets', label: 'Parquet', title: 'Choisir un parquet' },
  { id: 'motifs', label: 'Motif', title: 'Choisir un motif' },
  { id: 'orientation', label: 'Orientation', title: 'Sens de pose' },
];

/** Niveaux de la feuille basse, sur téléphone. On ne cache jamais la pièce. */
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
};

const STORAGE = 'pose-parquet:studio';

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
      <p class="studio__project" data-project>Visualiseur Parquet</p>
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
        <h1 class="start__title">Visualisez votre parquet</h1>
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
          <canvas class="stage__canvas" data-canvas></canvas>
          <div class="stage__ba" data-ba hidden>
            <span class="stage__tag stage__tag--a">Avant</span>
            <span class="stage__tag stage__tag--b">Après</span>
            <input class="stage__range" type="range" min="0" max="100" value="50" data-ba-range aria-label="Curseur avant / après" />
            <span class="stage__handle" aria-hidden="true"></span>
          </div>
        </div>
        <p class="stage__status" data-status role="status" hidden></p>
        <button class="stage__room" type="button" data-change-room>
          <span class="stage__room-thumb" data-room-thumb></span>
          <span>Changer de pièce</span>
        </button>
      </div>

      <aside class="studio__panel">
        <button class="panel__grab" type="button" data-sheet-toggle aria-label="Agrandir ou réduire le panneau"></button>
        <div class="panel__head">
          <p class="panel__title" data-panel-title>Choisir un parquet</p>
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
          <button class="action action--primary" type="button" data-save>${icon(ICONS.save)}<span>Enregistrer</span></button>
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

  /* ---------------- Références ---------------- */
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
  /**
   * La bibliothèque proposée au visiteur : les scènes `validated` seulement.
   *
   * Une scène expérimentale reste dans le dépôt et reste ouvrable par lien
   * direct — c'est ce qui permet de garder une pièce difficile pour la
   * relecture sans l'imposer à quelqu'un qui découvre l'outil.
   */
  const bibliotheque = scenesBibliotheque(sceneIndex);

  let config = {
    materialId: catalog.parquets[0].id,
    pattern: catalog.parquets[0].defaultPattern,
    angle: 0,
    width: null,
    scale: 1,
  };
  let variants = [];
  let sceneId = null;
  let pending = false;
  let refine = 0;
  let quality = 1;
  /**
   * Interaction en cours de mesure : son repère de départ.
   *
   * Ce qui se ressent n'est pas la durée de `renderer.paint`, c'est le délai
   * entre le clic et le pixel. Entre les deux il y a un setTimeout, une frame
   * d'attente, et parfois la construction d'une texture. On nomme donc le
   * point de départ au clic et on referme à l'affichage.
   */
  let attente = null;
  let regroupement = 0;
  const interaction = (nom) => { if (perfActif) { attente = nom; mark(nom); } };
  let editor = null;
  /** Zone visée par la correction du sol : la plus proche par défaut. */
  let activeZone = null;

  const material = () => catalog.get(config.materialId);
  /** Configuration telle que le moteur l'attend : le matériau, pas son id. */
  const paintConfig = (source) => {
    const from = source || config;
    return { ...from, material: catalog.get(from.materialId) };
  };
  const setStatus = (message) => {
    status.textContent = message || '';
    status.hidden = !message;
  };

  /* ---------------- Rendu ---------------- */

  function paint() {
    pending = false;
    if (!renderer.ready) return;
    mark('app:paint:debut');
    const ok = renderer.paint(canvas, paintConfig(), null, quality);
    if (!ok && renderer.enAttente) {
      // Les cartes du matériau se fabriquent dans le worker : le rendu
      // précédent reste affiché, on le dit, et `quandCartesPretes` replanifiera.
      setStatus('Préparation du rendu…');
      return;
    }
    if (!ok) {
      setStatus('Zone de sol invalide : reprenez-la dans « Délimiter le sol ».');
      return;
    }
    setStatus('');
    mark('app:paint:fin');
    // Cet ordre n'est pas indifférent : `mesure` vide le repère de fin
    // derrière elle pour ne pas saturer le tampon du navigateur. La mesure du
    // clic au pixel — la seule qui décrive ce que ressent l'utilisateur — doit
    // donc passer avant celle de la peinture, sinon elle ne trouve plus son
    // repère et disparaît silencieusement du rapport.
    if (attente) { mesure(`interaction.${attente}`, attente, 'app:paint:fin'); attente = null; }
    mesure(`app.rendu.q${quality}`, 'app:paint:debut', 'app:paint:fin');
    if (quality > 1) {
      window.clearTimeout(refine);
      refine = window.setTimeout(() => {
        quality = 1;
        schedule();
      }, 180);
    }
  }

/**
 * Regroupe les demandes de rendu, et le dit quand ça va coûter cher.
 *
 * Construire la tuile d'un matériau prend de 0,8 à 3,0 secondes de fil
 * principal — mesuré, c'est LA cause du lag signalé. Le rendu lui-même en
 * coûte 56 ms. Or trois clics rapides — Naturel, Miel, Fumé — produisaient
 * trois constructions complètes, soit près de neuf secondes, dont deux pour
 * des choix que l'utilisateur venait d'abandonner : le fil étant bloqué, les
 * clics suivants n'arrivaient qu'après la fin du précédent rendu et
 * relançaient chacun le leur.
 *
 * Deux règles, donc. Un : on attend 70 ms avant de lancer le travail lourd,
 * et toute nouvelle demande dans cet intervalle remplace la précédente — le
 * dernier choix est le seul construit. Deux : si les cartes du matériau ne
 * sont pas déjà en cache, on l'annonce, parce qu'une interface qui ne répond
 * pas sans rien dire se lit comme une panne.
 *
 * 70 ms est en dessous du seuil où un clic cesse d'être perçu comme
 * instantané, et l'accusé de réception visuel — pastille active, panneau —
 * a déjà été peint quand le travail commence.
 */
const REGROUPEMENT_MS = 70;

  function schedule(draft) {
    // Le rendu allégé ne concerne que le moteur logiciel : sur GPU, un rendu
    // plein format coûte moins de temps qu'il n'en ferait perdre en réglages.
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

  /**
   * Demande un rendu en regroupant les clics rapprochés.
   * @param {boolean} draft rendu allégé pendant le réglage
   */
  // Quand le worker livre des cartes, on repeint. Si l'utilisateur a changé
  // d'avis entre-temps, `paint()` lira la configuration courante et demandera
  // les cartes de ce nouveau choix : le dernier choix gagne toujours.
  quandCartesPretes(() => { if (renderer.ready) schedule(); });

  function demandeRendu(draft) {
    window.clearTimeout(regroupement);
    const mat = material();
    if (mat && !enCache(mat, paintConfig())) setStatus('Préparation du rendu…');
    regroupement = window.setTimeout(() => schedule(draft), REGROUPEMENT_MS);
  }

  /* ---------------- Contextes ---------------- */

  /**
   * Ouvre un contexte, ou le referme s'il est déjà actif.
   *
   * Refermer n'est pas un détail : c'est ce qui donne l'écran calme, photo
   * plein cadre, sans un pixel de chrome à droite.
   */
  function setContext(id) {
    mark('panneau:debut');
    // Sur téléphone, re-toucher le contexte actif replie la feuille au rail au
    // lieu de la retirer : voir le commentaire de [data-panel-close].
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
    if (next === 'motifs') syncPatterns();
    if (next === 'orientation') syncOrientation();
    // La pièce change de largeur : le canevas doit se remesurer.
    window.setTimeout(() => schedule(), 300);
  }

  CONTEXTS.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-btn';
    button.dataset.context = entry.id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = entry.label;
    button.addEventListener('click', () => setContext(entry.id));
    contextsHost.appendChild(button);
  });
  /**
   * Sur téléphone, « fermer » ne ferme pas : il replie.
   *
   * La mise en page en colonne compte sur la feuille pour occuper le bas de
   * l'écran ; l'état `closed` la retirait (`display: none`) et laissait, mesuré
   * à 375 × 812, quelque 360 px de noir sous les commandes — la moitié de
   * l'écran. Le geste attendu derrière la croix, c'est « moins de catalogue,
   * plus de pièce » : c'est exactement le niveau `peek`, le rail de matières.
   * Au-dessus de 48 rem la croix garde son sens de fermeture.
   */
  const TELEPHONE = () => window.matchMedia('(max-width: 47.99rem)').matches;
  on(qs('[data-panel-close]', root), 'click', () => {
    if (TELEPHONE()) {
      root.dataset.sheet = 'peek';
      return;
    }
    setContext(root.dataset.panel);
  });

  /** Poignée de la feuille : elle fait défiler les trois niveaux. */
  on(qs('[data-sheet-toggle]', root), 'click', () => {
    const index = SHEET_LEVELS.indexOf(root.dataset.sheet);
    root.dataset.sheet = SHEET_LEVELS[(index + 1) % SHEET_LEVELS.length];
  });

  /* ---------------- Écran de départ ---------------- */

  bibliotheque.forEach((entry) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'room-card';
    card.dataset.room = entry.id;
    const stem = entry.file.replace(/\.jpg$/, '');
    /**
     * Une carte porte un nom simple et une phrase qui dit ce que la pièce
     * met à l'épreuve. `highlight` existait déjà dans le manifeste et ne
     * s'affichait nulle part : c'est pourtant la seule information qui aide
     * à choisir entre cinq pièces qui se ressemblent en vignette.
     */
    const zones = entry.zones > 1 ? `<span class="room-card__zones">${entry.zones} sols visibles</span>` : '';
    const quoi = entry.highlight ? `<span class="room-card__quoi">${entry.highlight}</span>` : '';
    card.innerHTML = `
      <picture>
        <source type="image/webp" srcset="${base}assets/images/${stem}-640.webp" />
        <img src="${base}assets/images/${stem}-640.jpg" alt="${entry.label}" decoding="async" width="640" height="427" />
      </picture>
      <span class="room-card__label">${entry.label}${quoi}${zones}</span>`;
    card.addEventListener('click', () => openRoom(entry.id));
    roomsHost.appendChild(card);
  });

  on(qs('[data-import]', root), 'click', () => fileInput.click());
  on(fileInput, 'change', () => {
    if (fileInput.files && fileInput.files[0]) openPhoto(fileInput.files[0]);
    fileInput.value = '';
  });

  /* ---------------- Chargement d'une pièce ---------------- */

  function afterScene(name) {
    root.dataset.state = 'edit';
    qs('[data-project]', root).textContent = name;
    photo.src = renderer.photo.toDataURL('image/jpeg', 0.9);
    // La zone la plus proche est celle qu'on corrige le plus souvent.
    const zones = renderer.scene.floorZones;
    activeZone = zones[zones.length - 1].id;
    if (editor) editor.setMode('off');
    quality = 1;
    schedule();
    warmMaterial(material(), config);
  }

  /**
   * Réserve la place de la scène **avant** de calculer quoi que ce soit.
   *
   * Un `<canvas>` sans attributs mesure 300 × 150, et c'est lui qui dimensionne
   * `.stage__media`. Tant que le rendu n'avait pas fixé `canvas.width`, la
   * pièce s'affichait donc en vignette minuscule au centre d'un cadre noir,
   * puis sautait à sa taille réelle : le défaut visible à l'ouverture.
   *
   * On donne donc au canvas ses dimensions définitives dès que la scène est
   * connue — le fichier JSON les déclare, aucun décodage d'image n'est
   * nécessaire — et on affiche tout de suite la photo d'origine à sa place
   * finale. Le rendu vient ensuite la remplacer sans que rien ne bouge.
   */
  function reserverScene({ width, height, file, alt }) {
    canvas.width = width;
    canvas.height = height;
    // Filet : si le moteur peint plus tard à une autre résolution, la boîte
    // garde le même rapport de forme et la scène ne bouge pas pour autant.
    media.style.setProperty('--ratio', `${width} / ${height}`);
    if (file) photo.src = `${base}assets/images/${file}`;
    if (alt) photo.alt = alt;
    root.dataset.state = 'edit';
  }

  /**
   * Ouvre la pièce demandée — CELLE-LÀ, ou aucune.
   *
   * Cette fonction retombait sur `bibliotheque[0]` quand l'identifiant n'était
   * pas résolu, et le démarrage n'appelait même pas openRoom si le manifeste
   * ignorait la scène : un lien « Essayer cette ambiance » pouvait donc ouvrir
   * le séjour à la place de la cuisine, ou ne rien faire du tout et laisser le
   * visiteur sur l'écran d'accueil. Les deux sont le même défaut que la page
   * Inspiration vient de réparer — promettre une pièce et en montrer une autre —
   * et il s'était réinstallé ici.
   *
   * Désormais :
   *
   *   - une scène que le manifeste déclare `disabled` est refusée, avec un mot ;
   *   - une scène que le manifeste IGNORE est tout de même tentée, car le
   *     fichier est adressé par son identifiant : un manifeste servi depuis un
   *     cache périmé — le cas le plus probable quand une scène vient d'être
   *     ajoutée — ne doit pas rendre le lien inopérant ;
   *   - un échec de chargement le dit et ramène à la bibliothèque, au lieu de
   *     laisser un écran d'accueil muet.
   */
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
      // Dès ici la scène a sa taille finale et montre la photo d'origine.
      reserverScene({ width: scene.image.width, height: scene.image.height, file: scene.image.file, alt: scene.image.alt });
      setStatus('Préparation du rendu…');
      // Sous 600 px de fenêtre, image-loader réduit de toute façon à 1100 px :
      // télécharger le fichier de 1600 px pour le jeter aussitôt coûtait ~200 Ko
      // par pièce sur la connexion la plus lente. La variante 1120 existe déjà.
      const petit = window.innerWidth < 600;
      const fichier = petit ? scene.image.file.replace(/\.jpg$/, '-1120.jpg') : scene.image.file;
      const prepared = await loadImage(`${base}assets/images/${fichier}`).catch(() => loadImage(`${base}assets/images/${scene.image.file}`));
      renderer.setScene(scene, prepared);
      sceneId = id;
      photo.alt = scene.image.alt;
      // Le nom du fichier vient de la scène chargée, plus du manifeste : c'est
      // ce qui permet d'ouvrir une pièce que le manifeste en cache ignore.
      const stem = scene.image.file.replace(/\.jpg$/, '');
      qs('[data-room-thumb]', root).style.backgroundImage = `url(${base}assets/images/${stem}-640.jpg)`;
      afterScene(scene.label);
      setStatus('');
      mountEditor();
      // Une pièce calibrée est prête : on ouvre directement le catalogue, qui
      // est la seule chose à faire ensuite.
      setContext('parquets');
    } catch (error) {
      // Ramener à la bibliothèque plutôt que laisser l'écran d'accueil sans
      // explication : le visiteur voit ce qui a échoué et ce qu'il peut ouvrir.
      root.dataset.state = 'start';
      setStatus('Cette pièce n’a pas pu être chargée. Choisissez-en une autre.');
      console.error('[visualiseur]', error);
    }
  }

  async function openPhoto(file) {
    setStatus('Lecture de la photo…');
    try {
      const prepared = await loadFile(file);
      // Aucune analyse : la scène de départ est un plan plausible, que
      // l'utilisateur ajuste. Le jour où un service d'analyse existe, seule
      // la stratégie demandée ici change.
      const scene = await analyzeScene({ width: prepared.width, height: prepared.height, label: 'Ma photo' });
      // Même réservation que pour une pièce d'exemple : la photo de
      // l'utilisateur est déjà décodée, on connaît donc ses dimensions.
      reserverScene({ width: prepared.width, height: prepared.height, alt: 'Votre pièce' });
      setStatus('Préparation du rendu…');
      renderer.setScene(scene, prepared);
      sceneId = null;
      photo.alt = 'Votre pièce';
      qs('[data-room-thumb]', root).style.backgroundImage = 'none';
      afterScene('Ma photo');
      mountEditor();
      root.dataset.panel = 'closed';
      openDrawer('zone');
      setStatus('Délimitez le sol : déplacez les quatre poignées jusqu’aux angles.');
    } catch (error) {
      setStatus(error.message || 'Photo illisible.');
    }
  }

  /* ---------------- Contexte : parquets ---------------- */

  const catalogView = qs('[data-view="parquets"]', root);
  const selectedHost = document.createElement('div');
  selectedHost.className = 'selected';
  catalogView.appendChild(selectedHost);
  const catalogSlot = document.createElement('div');
  catalogView.appendChild(catalogSlot);

  const catalogUi = createCatalog(catalogSlot, catalog, {
    onSelect: (item) => selectMaterial(item.id),
    /*
     * Plus de préchauffage sur apparition d'une pastille.
     *
     * Le catalogue signalait chaque référence devenue visible pour qu'on
     * prépare sa tuile pleine résolution. Mesuré au démarrage du Visualiseur :
     * SEPT constructions de tuile, dont six pour des références sur
     * lesquelles personne n'avait cliqué, soit environ 6,2 secondes de fil
     * principal — c'est ce qui rendait l'ouverture longue et le catalogue
     * poisseux au premier scroll.
     *
     * Ce dont le catalogue a besoin pour s'afficher, c'est de sa vignette
     * (`buildSwatch`, 260 x 320 px, quelques dizaines de millisecondes), pas
     * de la tuile de 1280 x 1280 du moteur. Le coût de la tuile est payé au
     * clic, et il est annoncé — voir demandeRendu().
     */
    onVisible: null,
  });

  function selectMaterial(id) {
    const next = catalog.get(id);
    if (!next) return;
    interaction('produit');
    config = { ...config, materialId: id };
    if (!next.compatiblePatterns.includes(config.pattern)) config.pattern = next.defaultPattern;
    catalogUi.setActive(id);
    syncSelected();
    demandeRendu(true);
    save();
    /*
     * On ne précharge plus les références voisines.
     *
     * L'intention était bonne : préparer pendant qu'on regarde. Mais une
     * tuile coûte de 0,8 à 3,0 secondes de fil principal, et `warmMaterial`
     * passe par `requestIdleCallback` avec un délai de garde de 1 200 ms —
     * donc au bout d'une seconde et demie le travail part, que le fil soit
     * libre ou non.
     *
     * Mesuré : trois clics rapprochés — Naturel, Miel, Fumé — déclenchaient
     * DOUZE constructions de tuile, 33 secondes de fil principal cumulées, et
     * douze tâches longues de 3 secondes chacune. Onze de ces tuiles ne
     * servaient à rien. C'était la première cause du lag ressenti, devant le
     * coût du matériau demandé lui-même.
     *
     * Précharger n'a de sens que si le travail préchargé est court, ou s'il
     * sort du fil principal. Ni l'un ni l'autre n'est vrai aujourd'hui : à
     * rétablir le jour où la tuile se construira dans un worker.
     */
  }

  function syncSelected() {
    const item = material();
    if (!item) return;
    const swatch = swatchFor(item);
    const fiche = item.product || {};
    const dims = fiche.dimensions || {};

    // Dimensions en millimètres, comme sur une fiche technique. Arrondies au
    // centimètre, elles effaçaient la différence entre un 92 et un 90 — or
    // c'est exactement ce que le visualiseur doit rendre visible.
    const cotes = dims.widthMm
      ? `${dims.widthMm} × ${dims.lengthMm || '?'} mm`
      : `lames ${Math.round(item.plank.width * 1000)} mm`;
    const surface = [fiche.finish, fiche.surfaceTreatment].filter(Boolean).join(' · ') || item.finish;

    // Lien vers la fiche du fabricant : **seulement** pour une vraie référence.
    // Une matière de démonstration n'a pas de fiche, et prétendre le contraire
    // renverrait vers un produit qui n'est pas celui affiché.
    const lien =
      fiche.source === 'premibel' && fiche.productUrl
        ? `<a class="selected__ref" href="${fiche.productUrl}" target="_blank" rel="noopener">Voir la référence${
            fiche.sku ? ` <span>${fiche.sku}</span>` : ''
          }</a>`
        : '';

    selectedHost.innerHTML = `
      <span class="selected__swatch"></span>
      <span class="selected__text">
        <strong>${item.name}</strong>
        <span>${surface} · ${cotes}</span>
        ${lien}
      </span>`;
    const slot = selectedHost.querySelector('.selected__swatch');
    const mini = document.createElement('canvas');
    mini.width = swatch.width;
    mini.height = swatch.height;
    mini.getContext('2d').drawImage(swatch, 0, 0);
    slot.appendChild(mini);
  }

  /* ---------------- Contexte : motifs ---------------- */

  const patternsView = qs('[data-view="motifs"]', root);
  function syncPatterns() {
    const item = material();
    patternsView.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    catalog.patterns.forEach((pattern) => {
      const allowed = !item || item.compatiblePatterns.includes(pattern.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tile-card';
      card.dataset.pattern = pattern.id;
      card.disabled = !allowed;
      card.setAttribute('aria-pressed', String(config.pattern === pattern.id));
      card.innerHTML = `<span class="tile-card__media"></span><span class="tile-card__label">${pattern.label}</span>`;
      if (item) {
        const preview = document.createElement('canvas');
        preview.width = 288;
        preview.height = 162;
        card.querySelector('.tile-card__media').appendChild(preview);
        drawPatternPreview(preview, item, pattern.id);
      }
      card.addEventListener('click', () => {
        interaction('motif');
        config = { ...config, pattern: pattern.id };
        syncPatterns();
        demandeRendu(true);
        save();
      });
      grid.appendChild(card);
    });
    patternsView.appendChild(grid);

    // La donnée de chutes est utile mais c'est un ordre de grandeur, pas un
    // devis : une ligne suffit, sous la grille, pour le motif retenu.
    const current = catalog.patterns.find((entry) => entry.id === config.pattern);
    if (current) {
      const note = document.createElement('p');
      note.className = 'drawer__hint';
      note.style.marginTop = '0.6rem';
      note.textContent = `Chutes ${current.waste} selon la pièce et le calepinage.`;
      patternsView.appendChild(note);
    }
  }

  /**
   * Aperçu de motif : la tuile réelle, dessinée en 320 px au lieu de 1280.
   * Seize fois moins de pixels pour la même image — indispensable, sinon
   * chaque changement de parquet reconstruirait trois tuiles pleines.
   */
  function drawPatternPreview(target, item, pattern) {
    // L'aperçu vient du worker (voir apercuAsync) : le fil principal ne fait
    // que le dessiner. Si le panneau a été reconstruit entre-temps, le canevas
    // n'est plus dans le document et on n'y touche pas.
    apercuAsync(item, pattern, 320).then((image) => {
      if (!target.isConnected) return;
      const ctx = target.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      // Cadrage identique pour les trois motifs : c'est ce qui permet de les
      // comparer d'un coup d'œil.
      ctx.drawImage(image, 40, 60, 240, 135, 0, 0, target.width, target.height);
    }).catch(() => { /* pas d'aperçu : la carte garde son libellé */ });
  }

  /* ---------------- Contexte : orientation ---------------- */

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

  /* ---------------- Avant / après ---------------- */

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

  /* ---------------- Variantes et comparaison ---------------- */

  /**
   * Lien vers la demande de projet, prérempli avec la simulation.
   * Seuls le parquet, le motif et l'orientation partent : jamais la photo.
   */
  function projectLink(variant) {
    const source = variant ? variant.config : config;
    const item = catalog.get(source.materialId);
    const query = new URLSearchParams({
      parquet: item ? item.name : '',
      motif: source.pattern,
      orientation: String(source.angle),
    });
    return `${base}projet/?${query.toString()}`;
  }

  const compareUi = createCompare(root, {
    renderer,
    catalog,
    paintConfig,
    projectLink,
    onUse: (variant) => {
      config = { ...variant.config };
      catalogUi.setActive(config.materialId);
      syncSelected();
      schedule();
      compareUi.close();
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
      chip.innerHTML = `<span class="variant__dot" data-index="${index + 1}"></span><span class="variant__name">${item.name}</span>`;
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
    addBtn.disabled = variants.length >= 3;
  }

  on(addBtn, 'click', () => {
    if (variants.length >= 3) return;
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

  /* ---------------- Enregistrer ---------------- */

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

  /* ---------------- Menu et tiroir ---------------- */

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

  function mountEditor() {
    if (editor) {
      loadZoneIntoEditor();
      return;
    }
    editor = createFloorEditor(media, {
      // Le cadre définit la perspective de la zone : on écrit directement dans
      // son plan, et le contour suit tant qu'il n'a pas été retouché.
      onFrameChange(next) {
        const target = zone();
        target.plane.quad = next.map((p) => ({ ...p }));
        if (!renderer.masks.hasStrokes()) {
          renderer.masks.setPolygon(target.id, next);
          editor.setPolygon(next);
        }
        renderer.invalidateMasks();
        schedule(true);
      },
      onPolygonChange(next) {
        renderer.masks.setPolygon(activeZone, next);
        renderer.invalidateMasks();
        schedule(true);
      },
      onInsertPoint(point) {
        renderer.masks.insertPointNear(activeZone, point);
        editor.setPolygon(renderer.masks.getPolygon(activeZone));
        renderer.invalidateMasks();
        schedule(true);
      },
      onRemovePoint(index) {
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
      // L'éclairement ne se relit qu'à la fin du geste : sa moyenne de
      // référence dépend du masque, et la recalculer à chaque pixel du
      // pinceau ferait ramer pour rien.
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
    editor.setFrame(target.plane.quad);
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

  /**
   * Outils de délimitation.
   *
   * Le vocabulaire reste celui de l'utilisateur : « le sol », « le contour »,
   * « les objets ». Nulle part il n'est question de plan de perspective, de
   * masque ni d'homographie — ce sont nos affaires, pas les siennes.
   */
  function buildZoneTools() {
    if (!editor) mountEditor();
    stage.dataset.editing = 'true';
    const modes = [
      ['frame', 'Le sol', 'Placez les quatre poignées aux angles du sol.'],
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

    const applyMode = () => {
      editor.setMode(tool.mode);
      editor.setBrush({ mode: tool.brush, radius: tool.radius });
      brushBox.hidden = tool.mode !== 'brush';
      seg.querySelectorAll('[data-mode]').forEach((el) =>
        el.setAttribute('aria-pressed', String(el.dataset.mode === tool.mode))
      );
      const found = modes.find((entry) => entry[0] === tool.mode);
      hint.textContent = found ? found[2] : '';
    };

    /**
     * Sélecteur de sol : une photo peut en contenir plusieurs — la pièce du
     * premier plan et celle qu'on aperçoit derrière une ouverture. On peut en
     * ajouter, et tous reçoivent par défaut le même parquet.
     */
    const zonesBox = document.createElement('div');
    zonesBox.className = 'drawer__stack';
    const renderZones = () => {
      zonesBox.innerHTML = '';
      const zones = renderer.scene.floorZones;
      const label = document.createElement('p');
      label.className = 'drawer__hint';
      label.textContent = zones.length > 1 ? 'Sol en cours de réglage :' : 'Un seul sol pour l’instant.';
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
      zonesBox.append(label, picker, row);
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
    done.addEventListener('click', closeDrawer);

    drawerBody.append(zonesBox, seg, hint, brushBox, undo, done);
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

  /* ---------------- Divers ---------------- */

  on(qs('[data-change-room]', root), 'click', () => {
    root.dataset.state = 'start';
    root.dataset.panel = 'closed';
    closeDrawer();
  });
  on(qs('[data-restart]', root), 'click', () => {
    variants = [];
    config = {
      materialId: catalog.parquets[0].id,
      pattern: catalog.parquets[0].defaultPattern,
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
  /**
   * Retour.
   *
   * Le lien pointe vers l'accueil, ce qui est le bon repli quand on arrive
   * directement sur l'application. Mais quand on vient d'Inspiration — le
   * parcours « Essayer ce style » — revenir à l'accueil fait perdre la galerie
   * et la position de lecture. On rend donc la main à l'historique du
   * navigateur dès qu'on vient d'une page du site.
   */
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

  function save() {
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify({ config, variants, sceneId }));
    } catch (error) {
      void error;
    }
  }

  function restore() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE) || '{}');
      if (stored.config && catalog.get(stored.config.materialId)) config = { ...config, ...stored.config };
      if (Array.isArray(stored.variants)) variants = stored.variants.filter((v) => catalog.get(v.config.materialId));
    } catch (error) {
      void error;
    }
  }

  /* ---------------- Démarrage ---------------- */

  restore();

  /**
   * Lien profond.
   *
   * Depuis la page Inspiration, « Essayer ce style » ouvre **directement** le
   * visualiseur avec la scène, le parquet, le motif et l'orientation déjà
   * appliqués. L'utilisateur a déjà choisi : il n'y a ni écran de choix de
   * pièce, ni landing, ni confirmation à traverser.
   *
   *   /outils/studio.html?piece=sejour&parquet=chene-fume
   *                      &motif=point-de-hongrie&orientation=0
   *
   * L'orientation est en degrés, cohérente avec le panneau Orientation :
   * 0 = lames dans la largeur, 90 = dans la profondeur, ±45 = diagonale.
   */
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('parquet');
  if (wanted && catalog.get(wanted)) config.materialId = wanted;
  const motif = params.get('motif');
  if (motif && catalog.patterns.some((p) => p.id === motif)) config.pattern = motif;
  const orientation = Number(params.get('orientation'));
  if (Number.isFinite(orientation) && params.get('orientation') !== null) {
    config.angle = Math.max(-90, Math.min(90, orientation));
  }
  // Un motif incompatible avec la référence demandée serait ignoré en silence :
  // on retombe alors sur le motif par défaut du parquet.
  const chosen = catalog.get(config.materialId);
  if (chosen && !chosen.compatiblePatterns.includes(config.pattern)) {
    config.pattern = chosen.defaultPattern;
  }

  catalogUi.setActive(config.materialId);
  syncSelected();
  syncVariants();

  const requested = params.get('piece');
  // Un lien direct ouvre aussi une scène expérimentale : c'est ce qui permet de
  // la relire sans la proposer. On appelle openRoom SANS filtrer sur le
  // manifeste — c'est elle qui refuse une scène fermée et qui explique un
  // échec. Filtrer ici rendait le lien silencieusement inopérant dès que le
  // manifeste ne connaissait pas encore la scène.
  if (requested) openRoom(requested);
  else if (params.get('demarrer') === '1' && bibliotheque.length) openRoom(bibliotheque[0].id);

  on(window, 'resize', () => {
    if (!renderer.ready) return;
    interaction('resize');
    schedule();
  });

  if (perfActif) {
    window.__studio = {
      get config() { return config; },
      selectMaterial,
      setPattern: (id) => { interaction('motif'); config = { ...config, pattern: id }; syncPatterns(); demandeRendu(true); },
      setAngle: (a) => { interaction('orientation'); config = { ...config, angle: a }; syncOrientation(); demandeRendu(true); },
      openRoom,
      setContext,
      canvas,
      get renderer() { return renderer; },
      catalog,
    };
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
