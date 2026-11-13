import { ready, qs } from '../utils/dom.js';
import { mountStudio } from './app.js';
import { initContexteLead } from '../forms/lead-context.js';
import { surveillerPartenaires } from '../commerce/partenaires.js';

ready(() => {


  initContexteLead();

  surveillerPartenaires();

  const root = qs('[data-studio]');
  if (!root) return;
  mountStudio(root).catch((error) => {
    root.dataset.state = 'error';
    const message = document.createElement('p');
    message.className = 'studio__error';
    message.textContent =
      'Le visualiseur n’a pas pu démarrer. Rechargez la page ; si le problème persiste, le catalogue est peut-être momentanément indisponible.';
    root.appendChild(message);
    console.error('[visualiseur]', error);
  });
});
