/**
 * Comparaison avant / après.
 *
 * Un simple input range pilote la découpe du calque « après » : accessible au
 * clavier par construction, utilisable à la souris et au doigt.
 */
export function createCompare(host, onToggle) {
  const wrap = document.createElement('div');
  wrap.className = 'vz-compare';
  wrap.hidden = true;
  wrap.innerHTML = `
    <span class="vz-compare__tag vz-compare__tag--before">Avant</span>
    <span class="vz-compare__tag vz-compare__tag--after">Après</span>
    <input class="vz-compare__range" type="range" min="0" max="100" value="50"
      aria-label="Comparer la photo d'origine et le rendu du parquet" />
    <span class="vz-compare__handle" aria-hidden="true"></span>`;

  const range = wrap.querySelector('input');
  const apply = () => {
    host.style.setProperty('--compare', `${range.value}%`);
  };
  range.addEventListener('input', apply);
  host.style.setProperty('--compare', '0%');

  host.appendChild(wrap);

  return {
    element: wrap,
    setActive(value) {
      wrap.hidden = !value;
      host.dataset.compare = String(value);
      if (!value) host.style.setProperty('--compare', '0%');
      else apply();
      if (onToggle) onToggle(value);
    },
    isActive: () => !wrap.hidden,
  };
}
