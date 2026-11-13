import { qs, qsa, ready, mountAll } from './utils/dom.js';
import { initNav, markCurrentNav } from './components/nav.js';
import { initReveal } from './animations/reveal.js';
import { initContexteLead } from './forms/lead-context.js';
import { brancherLiens as brancherAllure } from './commerce/allure.js';
import { surveillerPartenaires } from './commerce/partenaires.js';

const has = (selector) => Boolean(qs(selector));

async function boot() {

  surveillerPartenaires();
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

      const nav = qs('[data-carousel-nav]', el);
      if (nav) nav.hidden = false;


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



    const { mountProjectForm } = await import('../components/project-form/project-form.js');
    mountProjectForm(qs('[data-project-form]'));
  }
}

ready(() => {


  const contexteLead = initContexteLead();



  brancherAllure({ source: contexteLead.leadSource || '' });

  boot().catch((error) => {

    console.error('[pose-parquet] initialisation partielle', error);
  });
});
