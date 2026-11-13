import { qs, on } from '../utils/dom.js';


export function initBeforeAfter(root) {
  const range = qs('.ba__range', root);
  if (!range) return;


  const apply = () => {
    const pos = Number(range.value);
    root.style.setProperty('--ba-pos', `${pos}%`);
    root.dataset.baSide = pos < 30 ? 'right' : pos > 70 ? 'left' : 'both';
  };
  apply();
  on(range, 'input', apply);
}
