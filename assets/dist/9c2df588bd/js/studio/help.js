/**
 * Aide du visualiseur : trois phrases, pas un manuel.
 * Chargée à la demande — elle ne pèse rien tant qu'on ne l'ouvre pas.
 */
const STEPS = [
  ['Choisissez une pièce', 'Une pièce d’exemple, ou votre propre photo. Elle reste dans votre navigateur.'],
  ['Essayez les parquets', 'Un clic sur une référence et tout le sol change. Motif et orientation suivent.'],
  ['Comparez', 'Ajoutez jusqu’à trois versions, comparez-les, gardez celle qui vous plaît.'],
];

export function openHelp(root) {
  const existing = root.querySelector('.studio__help');
  if (existing) {
    existing.hidden = false;
    return;
  }
  const dialog = document.createElement('div');
  dialog.className = 'studio__help';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Comment ça marche');
  dialog.innerHTML = `
    <div class="help__card">
      <p class="help__title">Comment ça marche</p>
      <ol class="help__list">
        ${STEPS.map(([title, text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join('')}
      </ol>
      <p class="help__note">Aucune photo n’est envoyée sur un serveur. Les rendus sont des simulations : ils donnent une direction, pas l’aspect exact d’une référence commerciale.</p>
      <button class="btn btn--solid btn--sm" type="button" data-close>J’ai compris</button>
    </div>`;
  dialog.querySelector('[data-close]').addEventListener('click', () => {
    dialog.hidden = true;
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dialog.hidden = true;
  });
  root.appendChild(dialog);
  window.setTimeout(() => dialog.querySelector('[data-close]').focus({ preventScroll: true }), 40);
}
