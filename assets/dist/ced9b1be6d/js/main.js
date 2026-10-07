/**
 * Point d'entrée unique du site.
 *
 * Stratégie : n'importer un module que si la page contient réellement le
 * composant correspondant. Les pages restent lisibles (aucun script inline)
 * et le JavaScript envoyé reste minimal.
 */
import { qs, qsa, ready, mountAll } from './utils/dom.js';
import { initNav, markCurrentNav } from './components/nav.js';
import { initReveal } from './animations/reveal.js';
import { initContexteLead } from './forms/lead-context.js';
import { brancherLiens as brancherAllure } from './commerce/allure.js';

const has = (selector) => Boolean(qs(selector));

async function boot() {
  initNav();
  markCurrentNav();
  initReveal();

  if (has('[data-hero-media]')) {
    const { initHeroMedia } = await import('./components/hero-media.js');
    initHeroMedia();
  }

  if (has('.accordion')) {
    const { initAccordion } = await import('./components/accordion.js');
    mountAll('.accordion', initAccordion);
  }

  if (has('[data-tabs]')) {
    const { initTabs } = await import('./components/tabs.js');
    mountAll('[data-tabs]', initTabs);
  }

  if (has('[data-carousel]')) {
    const { initCarousel } = await import('./components/carousel.js');
    const instances = qsa('[data-carousel]').map((el) => ({ el, api: initCarousel(el) }));

    instances.forEach(({ el, api }) => {
      if (!api) return;
      // Les commandes n'existent visuellement qu'une fois le carrousel vivant.
      const nav = qs('[data-carousel-nav]', el);
      if (nav) nav.hidden = false;
      // Un filtre vient de masquer des diapositives : on revient au début et
      // on recompte, sinon le curseur pointe une ambiance qui n'est plus là.
      el.addEventListener('filtres:appliques', () => {
        api.viewport.scrollLeft = 0;
        api.update();
      });
    });

    const scrollDriven = instances.filter(({ el }) => el.hasAttribute('data-scroll-carousel'));
    if (scrollDriven.length) {
      const { initScrollCarousel } = await import('./components/scroll-carousel.js');
      scrollDriven.forEach(({ el, api }) => initScrollCarousel(el, api));
    }
  }

  if (has('[data-modal]')) {
    const { initModals, initLightbox } = await import('./components/modal.js');
    initModals();
    initLightbox();
  }

  if (has('[data-tip]')) {
    const { initTooltips } = await import('./components/tooltip.js');
    initTooltips();
  }

  if (has('[data-toc]') || has('[data-reading-progress]')) {
    const { initToc, initReadingProgress } = await import('./components/toc.js');
    mountAll('[data-toc]', initToc);
    initReadingProgress();
  }

  if (has('.ba')) {
    const { initBeforeAfter } = await import('./components/before-after.js');
    mountAll('.ba', initBeforeAfter);
  }

  if (has('[data-filters]')) {
    const { initFilters } = await import('./components/filters.js');
    mountAll('[data-filters]', initFilters);
  }

  if (has('[data-pattern-thumb]')) {
    const { patternThumb } = await import('./tools/patterns.js');
    qsa('[data-pattern-thumb]').forEach((slot) => {
      slot.innerHTML = patternThumb(slot.dataset.patternThumb, { w: 160, h: 120 });
    });
  }

  if (has('[data-vz-preview]')) {
    /*
     * Le moteur ne descend qu'à l'approche de la section.
     *
     * `preview.js` porte bien un IntersectionObserver, mais il ne sert à rien
     * tant que l'import, lui, part tout de suite : importer le module tire
     * tout son graphe — analyzer, renderer GL et Canvas, material, texture,
     * product, catalog. Mesuré sur l'accueil : 16 modules, 191 Ko, à partir de
     * la 210e milliseconde, pour une démonstration que beaucoup de visiteurs
     * n'atteignent jamais.
     *
     * L'observateur est donc remonté d'un cran, devant l'import. Deux
     * déclencheurs, comme pour toute section différée : l'approche à l'écran,
     * et l'arrivée du focus — quelqu'un qui tabule jusqu'aux commandes doit
     * les trouver vivantes avant que le défilement ne les amène.
     */
    const demarrer = (() => {
      let fait = false;
      return async () => {
        if (fait) return;
        fait = true;
        const { mountPreview } = await import('./scene/preview.js');
        mountAll('[data-vz-preview]', mountPreview);
      };
    })();

    const cibles = qsa('[data-vz-preview]');
    if (typeof IntersectionObserver === 'function') {
      const observateur = new IntersectionObserver(
        (entrees) => {
          if (entrees.some((e) => e.isIntersecting)) {
            observateur.disconnect();
            demarrer();
          }
        },
        { rootMargin: '400px' }
      );
      cibles.forEach((el) => observateur.observe(el));
      cibles.forEach((el) => el.addEventListener('focusin', () => { observateur.disconnect(); demarrer(); }, { once: true }));
    } else {
      demarrer();
    }
  }

  if (has('[data-visualizer]')) {
    const { initVisualizers } = await import('./tools/floor-visualizer.js');
    initVisualizers();
  }

  if (has('[data-project-form]')) {
    // Le composant importe lui-même sa couche d'envoi : il n'y a plus de
    // fonction à injecter, donc plus de risque d'en injecter une qui fasse
    // semblant. Voir components/project-form/project-form.js.
    const { mountProjectForm } = await import('../components/project-form/project-form.js');
    mountProjectForm(qs('[data-project-form]'));
  }
}

ready(() => {
  /*
   * Le contexte de visite, avant `boot()` et hors de son `catch`.
   *
   * Hors du `catch` volontairement : ces deux lignes ne font que lire l'URL
   * et écrire dans `sessionStorage`, et si elles échouaient c'est que le
   * stockage est bloqué — cas déjà traité à l'intérieur du module. Les
   * mettre dans `boot()` les aurait rendues tributaires du chargement d'un
   * carrousel.
   */
  const contexteLead = initContexteLead();

  /*
   * Les departs vers Allure Design, sur toutes les pages editoriales.
   *
   * Un seul ecouteur delegue plutot qu'un par lien : la page A propos en
   * porte un, un tutoriel peut en porter un autre demain, et personne
   * n'aura a penser a le brancher.
   */
  brancherAllure({ source: contexteLead.leadSource || '' });

  boot().catch((error) => {
    // Une page doit rester lisible même si un module optionnel échoue.
    console.error('[pose-parquet] initialisation partielle', error);
  });
});
