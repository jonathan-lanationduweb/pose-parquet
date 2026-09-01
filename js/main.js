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
    const { mountPreview } = await import('./visualizer/preview.js');
    mountAll('[data-vz-preview]', mountPreview);
  }

  if (has('[data-visualiseur]')) {
    const { mountVisualizer } = await import('./visualizer/index.js');
    mountVisualizer(qs('[data-visualiseur]'));
  }

  if (has('[data-visualizer]')) {
    const { initVisualizers } = await import('./tools/floor-visualizer.js');
    initVisualizers();
  }

  if (has('[data-project-form]')) {
    const [{ mountProjectForm }, { submitProject }] = await Promise.all([
      import('../components/project-form/project-form.js'),
      import('./forms/submit-adapter.js'),
    ]);
    mountProjectForm(qs('[data-project-form]'), { onSubmit: submitProject });
  }
}

ready(() => {
  boot().catch((error) => {
    // Une page doit rester lisible même si un module optionnel échoue.
    console.error('[pose-parquet] initialisation partielle', error);
  });
});
