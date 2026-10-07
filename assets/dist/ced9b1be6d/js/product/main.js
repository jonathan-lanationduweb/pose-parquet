/**
 * Point d'entrée du Visualiseur produit.
 *
 * Même règle que le Studio : l'application ne charge que ce dont elle a
 * besoin, et un échec de démarrage se dit à l'écran au lieu de laisser une
 * page vide.
 */
import { ready, qs } from '../utils/dom.js';
import { mountProduct } from './app.js';
import { initContexteLead } from '../forms/lead-context.js';

ready(() => {
  /*
   * Le contexte de visite, avant tout le reste.
   *
   * Il enregistre la page d'entrée et les paramètres de campagne s'ils sont
   * là, pour que la demande envoyée trois pages plus loin sache encore d'où
   * vient la personne. Rien ne part sur le réseau : voir
   * js/forms/lead-context.js.
   */
  initContexteLead();

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
