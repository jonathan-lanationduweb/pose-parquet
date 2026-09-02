/**
 * Point d'entrée du Studio.
 *
 * Volontairement séparé de js/main.js : le Studio n'a ni carrousels, ni
 * révélations au scroll, ni navigation éditoriale. Il ne charge que ce dont
 * une application a besoin.
 */
import { ready, qs } from '../utils/dom.js';
import { mountStudio } from './app.js';

ready(() => {
  const root = qs('[data-studio]');
  if (!root) return;
  mountStudio(root).catch((error) => {
    root.dataset.state = 'error';
    const message = document.createElement('p');
    message.className = 'studio__error';
    message.textContent =
      'Le Studio n’a pas pu démarrer. Rechargez la page ; si le problème persiste, le catalogue est peut-être momentanément indisponible.';
    root.appendChild(message);
    console.error('[studio]', error);
  });
});
