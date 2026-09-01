/**
 * Comparaisons.
 *
 *  - « photo » : photo d'origine à gauche, rendu à droite ;
 *  - « ab »    : configuration A à gauche, configuration B à droite.
 *
 * Un simple input range pilote la découpe : accessible au clavier par
 * construction, utilisable à la souris et au doigt.
 */
export function createCompare(host) {
  const wrap = document.createElement('div');
  wrap.className = 'vz-compare';
  wrap.hidden = true;
  wrap.innerHTML = `
    <span class="vz-compare__tag vz-compare__tag--before" data-left>Avant</span>
    <span class="vz-compare__tag vz-compare__tag--after" data-right>Après</span>
    <input class="vz-compare__range" type="range" min="0" max="100" value="50"
      aria-label="Curseur de comparaison" />
    <span class="vz-compare__handle" aria-hidden="true"></span>`;

  const range = wrap.querySelector('input');
  const left = wrap.querySelector('[data-left]');
  const right = wrap.querySelector('[data-right]');
  let mode = 'off';

  const apply = () => {
    const value = `${range.value}%`;
    host.style.setProperty('--compare', value);
    host.style.setProperty('--compare-a', mode === 'photo' ? value : '0%');
  };
  range.addEventListener('input', apply);

  host.style.setProperty('--compare', '0%');
  host.style.setProperty('--compare-a', '0%');
  host.appendChild(wrap);

  return {
    element: wrap,
    getMode: () => mode,
    setMode(next, labels) {
      mode = next;
      wrap.hidden = next === 'off';
      host.dataset.compare = next;
      if (labels) {
        left.textContent = labels[0];
        right.textContent = labels[1];
        range.setAttribute('aria-label', `Curseur de comparaison entre ${labels[0]} et ${labels[1]}`);
      }
      if (next === 'off') {
        host.style.setProperty('--compare', '0%');
        host.style.setProperty('--compare-a', '0%');
      } else {
        apply();
      }
    },
  };
}
