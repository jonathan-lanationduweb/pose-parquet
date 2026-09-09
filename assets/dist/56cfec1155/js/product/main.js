/**
 * Point d'entrée du Visualiseur produit.
 *
 * Même règle que le Studio : l'application ne charge que ce dont elle a
 * besoin, et un échec de démarrage se dit à l'écran au lieu de laisser une
 * page vide.
 */
import { ready, qs } from '../utils/dom.js';
import { mountProduct } from './app.js';

ready(() => {
  const root = qs('[data-product]');
  if (!root) return;
  mountProduct(root).catch((error) => {
    root.dataset.state = 'error';
    const message = document.createElement('p');
    message.className = 'studio__error';
    message.style.cssText = 'margin:40px auto;max-width:36rem;color:#f4f2ec;font:14px/1.5 sans-serif;text-align:center';
    message.textContent =
      'Le visualiseur n’a pas pu démarrer. Rechargez la page ; si le problème persiste, le catalogue est peut-être momentanément indisponible.';
    root.appendChild(message);
    console.error('[visualiseur produit]', error);
  });
});
