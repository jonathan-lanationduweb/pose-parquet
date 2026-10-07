/**
 * Point d'entrée du Visualiseur Parquet.
 *
 * Volontairement séparé de js/main.js : le visualiseur n'a ni carrousels, ni
 * révélations au scroll, ni navigation éditoriale. Il ne charge que ce dont
 * une application a besoin.
 */
import { ready, qs } from '../utils/dom.js';
import { mountStudio } from './app.js';
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
