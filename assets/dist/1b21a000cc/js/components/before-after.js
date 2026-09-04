import { qs, on } from '../utils/dom.js';

/** Comparateur avant / apres pilote par un input range (clavier compris). */
export function initBeforeAfter(root) {
  const range = qs('.ba__range', root);
  if (!range) return;
  /**
   * Position du curseur, et côté « réduit » pour les étiquettes.
   *
   * Les deux étiquettes sont posées en absolu à gauche et à droite. Sur un
   * cadre de 340 px, dès que le curseur approche d'un bord, l'étiquette du
   * côté qui rétrécit passe SOUS l'autre : mesuré sur le guide « sens de la
   * lumière » à 390 px, « Lames… » et « Lames dans le sens des rayons »
   * superposées. On efface l'étiquette du côté qui fait moins de 30 % du
   * cadre — elle décrivait une bande trop mince pour être lue de toute façon.
   */
  const apply = () => {
    const pos = Number(range.value);
    root.style.setProperty('--ba-pos', `${pos}%`);
    root.dataset.baSide = pos < 30 ? 'right' : pos > 70 ? 'left' : 'both';
  };
  apply();
  on(range, 'input', apply);
}
