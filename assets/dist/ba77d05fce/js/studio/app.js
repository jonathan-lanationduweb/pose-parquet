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
import { createFloorEditor } from '../scene/editor.js';
import { composeRender, downloadCanvas } from '../scene/export.js';
import { createSceneRenderer } from '../scene/renderer.js';
import { warmMaterial, enCache, quandCartesPretes, apercuAsync } from '../scene/material.js';
import { addZone, removeZone } from '../scene/schema.js';
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
  forward: 'M5 12h13m-6-7 7 7-7 7',
};

const STORAGE = 'pose-parquet:studio';

/**
 * Combien de versions on garde côte à côte.
 *
 * Exporté, et pas seulement écrit deux fois plus bas, parce que trois pages
 * l'annoncent en toutes lettres — « jusqu'à trois versions enregistrées ». Le
 * générateur lit cette constante pour écrire ces phrases : le jour où la
 * limite change, le texte change avec elle. Une promesse et son
 * implémentation ne devraient jamais être deux nombres différents.
 *
 * Trois est une contrainte d'affichage, pas de moteur : au-delà, la
 * comparaison côte à côte devient illisible sur un téléphone.
 */
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
          <!--
            Le canevas est la SORTIE de l'outil, et il n'en disait rien.

            Un canevas est opaque à l'assistance technique : il n'a ni texte, ni
            structure, ni rôle par défaut. Sans libellé, tout le travail du
            visualiseur — la pièce, le parquet, le motif — n'existait tout
            simplement pas pour qui n'utilise pas ses yeux.

            « role=img » parce que c'est ce que ce canevas EST du point de vue de
            la restitution : une image produite, pas une zone interactive (les
            commandes, elles, sont de vrais boutons à côté). Le libellé est
            réécrit quand la configuration utile change — jamais à chaque rendu,
            ce qui bavarderait sans rien apprendre.
          -->
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
        <!--
          La fiche du produit regardé.

          Ici, et non dans la barre d'actions : la barre porte ce qu'on FAIT de
          la simulation — comparer, enregistrer, décrire son projet — et ce lien
          parle de ce qu'on REGARDE. Un cinquième bouton y aurait aussi donné,
          sur un téléphone, une quatrième cible empilée sous l'image.

          Il n'apparaît que pour une référence qui a réellement une fiche. Les
          douze parquets de démonstration n'en ont pas et n'en auront pas :
          voir js/commerce/premibel.js.
        -->
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
          <!--
            « Décrire mon projet » vit ici, dans les actions principales, et
            non plus seulement dans le panneau Comparer. Comparer demande deux
            versions enregistrées — c'est sa logique et elle ne change pas —
            mais décrire son projet n'a aucune raison d'attendre : quelqu'un
            qui a essayé un seul parquet a déjà tout ce qu'il faut pour nous
            écrire. C'est un lien et non un bouton, parce que cela mène à une
            autre page : le clic milieu, l'ouverture dans un nouvel onglet et
            l'aperçu de l'adresse au survol doivent marcher.
          -->
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
    // Le motif d'ouverture passe par la regle, comme tous les autres : une
    // reference dont le `defaultPattern` mentirait ouvrirait autrement sur un
    // etat impossible des la premiere seconde.
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

  /**
   * Témoin de rendu muet.
   *
   * L'audit du 14/09/2026 a observé une fois, et une seule, une séquence où
   * aucun rendu n'arrivait pendant environ 21 secondes après une rafale de
   * changements — puis tout repartait. Six tentatives de reproduction depuis,
   * dont quatre ce jour, n'ont rien redonné : le dernier choix gagne toujours,
   * en une seconde au plus.
   *
   * On ne corrige donc rien, faute de cause établie — mais on cesse de compter
   * sur la chance. Si une demande de rendu reste sans peinture au-delà du
   * seuil, on le note, avec l'état exact qui permettrait de comprendre.
   *
   * Uniquement sous `?perf=1` : en production ce témoin n'existe pas, et il
   * n'écrit jamais rien dans la console d'un visiteur.
   */
  const SEUIL_TEMOIN_MS = 8000;
  let temoin = 0;
  const armerTemoin = () => {
    if (!perfActif) return;
    window.clearTimeout(temoin);
    const depuis = performance.now();
    temoin = window.setTimeout(() => {
      // eslint-disable-next-line no-console
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

  /*
   * Le message qui reste quand le rendu se tait.
   *
   * `paint()` termine par `setStatus('')` : tout message posé avant lui
   * disparaît dès la première image. C'est le bon comportement pour
   * « Préparation du rendu… », qui décrit un état transitoire ; c'est le
   * mauvais pour « le motif a été adapté », qui explique une décision prise
   * à la place de l'utilisateur et doit rester lisible après coup.
   *
   * On distingue donc les deux : un message transitoire, et une NOTE de
   * repos vers laquelle on revient. La note s'efface dès que l'utilisateur
   * reprend la main sur le motif — il n'a plus besoin qu'on lui explique un
   * choix qu'il vient de refaire.
   */
  let noteMotif = '';
  const poserNote = (message) => {
    noteMotif = message || '';
    setStatus(noteMotif);
  };
  const effacerNote = () => {
    if (!noteMotif) return;
    noteMotif = '';
    setStatus('');
  };

  /* ---------------- Rendu ---------------- */

  /**
   * Abonnes au rendu termine.
   *
   * Sans signal, celui qui pilote le studio de l'exterieur — le pont du
   * visualiseur de pose-parquet-ai — n'a qu'une solution : sonder le canevas
   * jusqu'a ce qu'il cesse de changer. C'est cher, c'est approximatif, et ca
   * fausse toute mesure de latence. Un abonnement coute trois lignes.
   */
  const apresRendu = new Set();

  /**
   * Ce que le canevas montre, en une phrase.
   *
   * Écrit dans `aria-label`, donc lu uniquement quand quelqu'un atteint le
   * canevas — ce n'est pas une région vivante et rien n'est annoncé
   * spontanément. Le garde-fou est l'égalité : on ne réécrit l'attribut que si
   * la phrase a changé, sinon certains lecteurs d'écran relisent l'élément à
   * chaque rendu, et un outil qui répète « Chêne fumé en point de Hongrie »
   * trente fois par minute est pire que muet.
   */
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
    // L'orientation ne se dit que si elle a été changée : « à 0 degré » sur une
    // pose que personne n'a tournée est du bruit.
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
      // Les cartes du matériau se fabriquent dans le worker : le rendu
      // précédent reste affiché, on le dit, et `quandCartesPretes` replanifiera.
      setStatus('Préparation du rendu…');
      return;
    }
    if (!ok) {
      setStatus('Zone de sol invalide : reprenez-la dans « Délimiter le sol ».');
      return;
    }
    // Retour à la note de repos, et non au vide : voir `poserNote`.
    setStatus(noteMotif);
    desarmerTemoin();
    decrireCanvas();
    mark('app:paint:fin');
    // Cet ordre n'est pas indifférent : `mesure` vide le repère de fin
    // derrière elle pour ne pas saturer le tampon du navigateur. La mesure du
    // clic au pixel — la seule qui décrive ce que ressent l'utilisateur — doit
    // donc passer avant celle de la peinture, sinon elle ne trouve plus son
    // repère et disparaît silencieusement du rapport.
    if (attente) { mesure(`interaction.${attente}`, attente, 'app:paint:fin'); attente = null; }
    mesure(`app.rendu.q${quality}`, 'app:paint:debut', 'app:paint:fin');
    // Un abonne qui casse ne doit pas arreter le rendu.
    apresRendu.forEach((cb) => { try { cb(quality); } catch { /* ignore */ } });
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
    armerTemoin();
    const mat = material();
    /*
     * Le regroupement protège une FABRICATION, pas un rendu.
     *
     * Les 70 ms d'attente existent pour qu'une rafale de clics ne lance pas
     * trois constructions de tuile dont deux seront jetées. Quand la tuile
     * demandée est déjà en cache, il n'y a rien à protéger : le travail
     * restant se mesure à 13 ms, et attendre 70 ms avant de le faire est une
     * latence pure, ajoutée à un cas qui devrait être instantané.
     *
     * Mesuré avant ce raccourci : 229 ms entre le clic et le pixel sur un
     * choix déjà connu, dont 216 d'attente. Le regroupement reste entier
     * pour tout ce qui doit être fabriqué — c'est-à-dire pour le seul cas où
     * il servait.
     */
    if (mat && enCache(mat, paintConfig())) {
      schedule(draft);
      return;
    }
    setStatus('Préparation du rendu…');
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
    if (next === 'motifs') { syncPatterns(); anticiperMotifs(); }
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
    /*
     * `aria-controls` : « ce bouton commande CE panneau ».
     *
     * `aria-pressed` disait déjà lequel est actif, mais pas ce qu'il ouvre. Le
     * panneau change de contenu sans changer de place ni de titre annoncé : la
     * relation entre le bouton et la zone qui vient de se remplir n'était donc
     * déductible que visuellement.
     */
    button.setAttribute('aria-controls', 'studio-panneau');
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
    const quoi = entry.highlight ? `<span class="room-card__quoi">${echapper(entry.highlight)}</span>` : '';
    // `label`, `highlight` et `stem` viennent du manifeste des scènes : des
    // données, donc échappées avant de devenir du HTML — y compris `stem`,
    // qui atterrit dans deux attributs d'image.
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
    /*
     * Le lien « Décrire mon projet » est remis à jour ici parce que c'est le
     * point de passage commun aux deux façons d'obtenir une pièce : ouvrir une
     * scène du catalogue, ou importer sa propre photo. Sans cette ligne, le
     * bouton gardait la pièce précédente jusqu'à ce que le visiteur touche
     * autre chose — et un clic juste après un changement de pièce partait avec
     * l'ancienne scène.
     */
    syncProjectCta();
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
      /*
       * Le libelle humain de la scene voyage avec son identifiant, et sert de
       * pense-bete a l equipe commerciale : la fiche d une demande doit dire
       * « Sejour et salle a manger » et pas « sejour ». C est un instantane —
       * si la scene est renommee demain, la demande garde ce que le visiteur
       * avait sous les yeux.
       */
      sceneLabel = scene.label;
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
      // Photo importee : il n y a pas de scene du catalogue a nommer.
      sceneLabel = null;
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

    /*
     * Changer de parquet peut rendre le motif courant impossible.
     *
     * Une reference vendue en lames droites ne se pose pas en point de
     * Hongrie : garder le motif precedent produirait un etat qui n'existe
     * pas. On bascule donc sur le motif par defaut de la nouvelle
     * reference — et on le DIT, dans la zone de statut, parce que changer
     * le choix de quelqu'un en silence est la pire des deux options.
     */
    const { config: normalise, adapte } = normaliserConfig(
      { ...config, materialId: id },
      next
    );
    config = normalise;
    catalogUi.setActive(id);
    syncSelected();
    // La grille des motifs depend du materiau : ses cartes desactivees et son
    // `aria-pressed` changent avec lui, panneau ouvert ou non.
    syncPatterns();
    if (adapte) {
      const retenu = catalog.patterns.find((entry) => entry.id === config.pattern);
      poserNote(messageAdaptation(next, retenu ? retenu.label : config.pattern));
    } else {
      // Le nouveau parquet accepte le motif courant : plus rien à expliquer.
      effacerNote();
    }
    syncProductLink();
    emettre('select_product', { productId: id, pattern: config.pattern || '' });
    /*
     * `view_product` en plus, et seulement pour une reference reelle.
     *
     * « A choisi un parquet » et « a vu un produit qui existe » ne sont pas
     * la meme chose : les douze references de demonstration ne s'achetent
     * nulle part. Compter les deux ensemble donnerait un chiffre qui ne veut
     * rien dire, exactement au moment ou l'on voudrait savoir si le
     * Visualiseur amene vers du produit.
     */
    if (estReferencePremibel(next && next.product)) {
      emettre('view_product', { productId: id, contexte: 'studio' });
    }
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
    // `productUrl` a déjà été filtrée par `lienSur()` au chargement du
    // catalogue : elle est http(s) ou nulle. Elle est malgré tout échappée
    // ici, parce qu'elle entre dans un attribut entre guillemets.
    const lien =
      fiche.source === 'premibel' && fiche.productUrl
        ? `<a class="selected__ref" href="${echapper(fiche.productUrl)}" target="_blank" rel="noopener">Voir la référence${
            fiche.sku ? ` <span>${echapper(fiche.sku)}</span>` : ''
          }</a>`
        : '';

    selectedHost.innerHTML = `
      <span class="selected__swatch"></span>
      <span class="selected__text">
        <strong>${echapper(item.name)}</strong>
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

  /* ---------------- Contexte : motifs ---------------- */

  const patternsView = qs('[data-view="motifs"]', root);
  /**
   * Ouvrir le panneau « Motifs » est déjà une décision.
   *
   * On n'y vient pas par hasard : on y vient pour changer de motif. C'est donc
   * le bon moment pour fabriquer d'avance les tuiles des motifs compatibles,
   * pendant que le visiteur regarde les aperçus — trois secondes de lecture
   * qui, jusqu'ici, ne servaient à rien.
   *
   * Le travail part dans le worker, comme tout le reste : le fil principal
   * n'en voit rien, et un clic pendant la fabrication reste instantané.
   *
   * `warmMaterial` attend une période d'inactivité pour lancer chaque tuile,
   * et n'a pas de délai de garde : si le navigateur ne trouve jamais de répit,
   * rien n'est fabriqué d'avance et le comportement redevient celui d'avant.
   * Aucune régression possible, donc — seulement une attente évitée quand la
   * machine en a les moyens.
   */
  function anticiperMotifs() {
    const item = material();
    if (!item) return;
    item.compatiblePatterns.forEach((pattern) => {
      if (pattern === config.pattern) return; // déjà à l'écran
      warmMaterial(item, { ...config, pattern });
    });
  }

  function syncPatterns() {
    const item = material();

    /*
     * Panneau fermé : on met à jour l'état, pas la grille.
     *
     * Chaque changement de motif rappelait cette fonction, qui vide la grille,
     * recrée une vignette par motif et relance un aperçu pour chacune — même
     * quand le panneau n'est pas à l'écran. Mesuré : 160 ms entre le clic et le
     * pixel sur un motif DÉJÀ en cache, dont 13 de rendu réel. Tout le reste
     * était cette reconstruction invisible.
     *
     * L'état des vignettes reste juste : `aria-pressed` est mis à jour sur
     * celles qui existent déjà, et l'ouverture du panneau reconstruit tout de
     * toute façon.
     */
    /*
     * La grille ne dépend que du MATÉRIAU ; seul `aria-pressed` dépend du motif
     * choisi. La reconstruire à chaque clic revenait donc à tout jeter pour
     * changer un attribut — et à le faire même panneau fermé.
     */
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
      /*
       * `disabled`, et pas une opacite.
       *
       * Une carte seulement attenuee reste cliquable a la souris, atteignable
       * au clavier et annoncee comme un bouton ordinaire. `disabled` la retire
       * de l'ordre de tabulation, refuse le clic et le tap, et fait dire
       * « indisponible » aux lecteurs d'ecran — sans code de notre part.
       *
       * On ne la CACHE pas pour autant : le motif existe, il n'existe pas pour
       * cette reference. Le masquer laisserait croire qu'il n'existe plus.
       */
      card.disabled = !allowed;
      card.setAttribute('aria-pressed', String(config.pattern === pattern.id));
      const raison = allowed ? '' : raisonIndisponible(item, pattern.label);
      card.innerHTML = `<span class="tile-card__media"></span><span class="tile-card__label">${echapper(pattern.label)}</span>`
        + (allowed ? '' : `<span class="tile-card__note">Non disponible pour ce parquet</span>`);
      if (!allowed) {
        // Le libelle visible dit « non disponible » ; le nom accessible nomme
        // la reference, parce qu'un lecteur d'ecran ne voit pas quel parquet
        // est selectionne au-dessus.
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
        // `disabled` suffit deja ; ce test est la ceinture. Une carte peut
        // etre reactivee par une extension, un outil de developpement ou un
        // script — la regle metier, elle, ne bouge pas.
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

    // La donnée de chutes est utile mais c'est un ordre de grandeur, pas un
    // devis : une ligne suffit, sous la grille, pour le motif retenu.
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
   *
   * Sans argument, il décrit **ce que le visiteur a sous les yeux** : la scène
   * ouverte et la configuration active. Avec une variante, il décrit cette
   * variante — c'est ce dont le panneau Comparer a besoin.
   *
   * L'identifiant du parquet est relu dans le catalogue avant de partir :
   * `catalog.get()` répond, ou l'identifiant ne part pas. On n'envoie donc
   * jamais un identifiant fabriqué à partir d'un libellé, ce qui finirait en
   * base comme s'il désignait un vrai produit. Le libellé voyage à part, pour
   * l'affichage.
   *
   * `sceneId` vaut `null` quand le visiteur a importé sa propre photo : il n'y
   * a alors pas de scène du catalogue à nommer, et le paramètre est absent.
   * La photo, elle, ne quitte pas le navigateur — voir studio-handoff.js.
   */
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
      // Le Studio sait ce que le formulaire ne peut pas savoir : si cette
      // référence a une vraie fiche produit. Voir studio-handoff.js.
      ficheProduit: estReferencePremibel(item && item.product),
    });

    return `${base}projet/?${query.toString()}`;
  }

  /**
   * Tient à jour le lien du bouton « Décrire mon projet » de la barre.
   *
   * Appelée à chaque changement de parquet, de motif, d'angle ou de pièce :
   * le bouton pointe toujours sur l'état affiché, jamais sur un état précédent
   * ni sur une version enregistrée.
   */
  function syncProjectCta() {
    if (!projectCta) return;
    projectCta.href = projectLink();
  }

  /**
   * Affiche, ou retire, le lien vers la fiche du parquet regardé.
   *
   * Retirer et non désactiver : un lien mort ou grisé laisserait croire qu'une
   * fiche existe et qu'elle est momentanément indisponible. Pour une référence
   * de démonstration, il n'y a pas de fiche du tout, et l'absence est
   * l'information juste.
   */
  function syncProductLink() {
    if (!productLink) return;
    /*
     * `material().product` et non `material()`.
     *
     * Un materiau du Studio est ce que le MOTEUR consomme : identifiant,
     * teinte, largeur de lame, cartes de texture. La fiche commerciale —
     * reference, adresse, provenance — vit a cote, sous `product`, parce que
     * le renderer n'a que faire de savoir ou s'achete un parquet. Chercher
     * `productUrl` a la racine ne trouvait rien et le lien ne s'affichait
     * jamais, y compris pour les quatorze references qui en ont une.
     */
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

  /*
   * Le depart vers le formulaire.
   *
   * `start_project` et non `submit_project` : on sait que la personne quitte
   * le Studio pour decrire son projet, pas qu'elle ira au bout. Les deux
   * evenements existent, et c'est leur ecart qui dira un jour quelque chose.
   */
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
      /*
       * Une version enregistree peut avoir vieilli : le catalogue change, une
       * reference perd un motif. On revalide au moment de la reprise plutot
       * que de faire confiance a ce qui a ete enregistre.
       */
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
    /*
     * Le lien du bouton « Decrire mon projet » est une projection du meme etat
     * que celui qu on persiste ici. Le remettre a jour au meme endroit evite
     * d avoir a le faire aux neuf endroits qui modifient la configuration —
     * et evite surtout d en oublier un, ce qui donnerait un bouton qui
     * decrit l avant-derniere simulation.
     */
    syncProjectCta();
    syncProductLink();

    try {
      window.localStorage.setItem(STORAGE, JSON.stringify({ config, variants, sceneId }));
    } catch (error) {
      void error;
    }
  }

  function restore() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE) || '{}');
      /*
       * Ce qui vient du navigateur est une donnee entrante comme une autre.
       *
       * Un etat enregistre la semaine derniere peut porter un couple devenu
       * impossible : la reference existe toujours, mais le catalogue ne lui
       * accorde plus ce motif. On normalise au lieu de restaurer tel quel.
       */
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
          }));
      }
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
  if (motif) config.pattern = motif;
  const orientation = Number(params.get('orientation'));
  if (Number.isFinite(orientation) && params.get('orientation') !== null) {
    config.angle = Math.max(-90, Math.min(90, orientation));
  }
  /*
   * Un motif inconnu ou incompatible avec la reference demandee ne s'applique
   * pas : on retombe sur le motif par defaut du parquet. Meme regle que
   * partout ailleurs, et c'est le point : une URL forgee n'ouvre pas une
   * porte que l'interface ferme.
   */
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
    /**
     * Contrat de pilotage du studio.
     *
     * Reste derriere `?perf=1` : c'est un point d'accroche d'instrumentation,
     * pas une API publique du site. Le pont du visualiseur de pose-parquet-ai
     * s'en sert pour appliquer un produit sans toucher a l'etat interne.
     *
     * `apiVersion` permet a l'appelant de refuser une version qu'il ne sait
     * pas conduire, plutot que d'echouer au premier appel manquant.
     *
     * Deux moities, a ne pas confondre :
     *
     *   CONTRAT DE PILOTAGE — apiVersion, openRoom, selectMaterial,
     *   setPattern, setAngle, setWidth, getCapabilities, onRendered, canvas.
     *   C'est la seule partie sur laquelle un appelant externe a le droit de
     *   s'appuyer. Elle est versionnee, et une garde automatique cote
     *   pose-parquet-ai refuse tout acces en dehors de cette liste.
     *
     *   DONNEES DE DIAGNOSTIC — config, renderer, catalog, setContext. Sans
     *   garantie, sans version, susceptibles de bouger avec l'interne. Elles
     *   servent a lire un etat depuis la console pendant une mesure, pas a
     *   piloter. Rien ne les retire — d'autres sessions de mesure s'en
     *   servent — mais rien ne promet non plus de les conserver.
     */
    const api = {
      apiVersion: 1,
      /* Diagnostic, hors contrat. Un appelant externe passe par les
         commandes ; lire l'etat interne, c'est en dependre. */
      get config() { return config; },
      selectMaterial,
      /**
       * Motif de pose. Refuse ce que la reference ne propose pas.
       *
       * `setWidth` validait deja ses bornes ; celui-ci acceptait n'importe
       * quelle chaine, y compris un motif inconnu, et le moteur retombait
       * ensuite sur le defaut sans le dire. Un appelant ne pouvait donc pas
       * savoir si sa demande avait ete honoree.
       *
       * @param {string} id
       * @returns {boolean} faux si le motif est inconnu ou incompatible
       */
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

      /**
       * Largeur de lame, en metres — `null` rend la main a la largeur propre
       * au motif. Meme chemin que le curseur du tiroir « Avancé » : on ecrit
       * la configuration puis on demande un rendu, sans court-circuit.
       *
       * @param {number|null} metres
       * @returns {boolean} refuse une valeur hors du plausible
       */
      setWidth: (metres) => {
        if (metres !== null && !(Number.isFinite(metres) && metres >= 0.02 && metres <= 0.5)) return false;
        interaction('largeur');
        config = { ...config, width: metres };
        demandeRendu(true);
        return true;
      },

      /**
       * Ce que le pont peut REELLEMENT piloter.
       *
       * Chaque entree est deduite de la presence d'une commande, jamais
       * declaree a la main : ajouter un setter suffit a rendre la capacite
       * vraie, et en oublier un la laisse fausse.
       *
       * `finish`, `grain` et `joints` sont a `false` pour une autre raison :
       * ces proprietes sont cuites dans la famille de texture par
       * `createMaterial()`, aucune configuration ne les change.
       */
      getCapabilities: () => ({
        pattern: typeof api.setPattern === 'function',
        width: typeof api.setWidth === 'function',
        orientation: typeof api.setAngle === 'function',
        scale: typeof api.setScale === 'function',
        finish: false,
        grain: false,
        joints: false,
      }),

      /**
       * S'abonner au rendu termine. Renvoie la fonction de desabonnement.
       * @param {(quality: number) => void} cb
       */
      onRendered: (cb) => {
        if (typeof cb !== 'function') return () => {};
        apresRendu.add(cb);
        return () => apresRendu.delete(cb);
      },

      openRoom,
      canvas,

      /* Diagnostic, hors contrat : voir l'en-tete de ce bloc. */
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
