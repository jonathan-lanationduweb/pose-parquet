/**
 * Prise en main du visualiseur : trois écrans, affichés une seule fois.
 *
 * Le repère est stocké localement ; le bouton « ? » de la barre permet de
 * relire la présentation à tout moment.
 */
const KEY = 'pose-parquet:visualiseur:decouverte';

const STEPS = [
  {
    title: '1 · Choisissez une pièce',
    text: 'Partez d’une pièce d’exemple ou importez une photo de votre intérieur. La photo reste dans votre navigateur : rien n’est envoyé, rien n’est conservé.',
  },
  {
    title: '2 · Délimitez le sol',
    text: 'Placez les quatre coins du sol pour donner la perspective, affinez le contour si besoin, puis effacez au pinceau ce qui doit rester visible : meubles, tapis, plinthes.',
  },
  {
    title: '3 · Comparez',
    text: 'Testez les motifs, les teintes et le sens de pose. Le curseur « avant / après » et la comparaison A / B vous aident à trancher, et vous pouvez enregistrer le rendu.',
  },
];

export function createOnboarding(host) {
  let index = 0;

  const overlay = document.createElement('div');
  overlay.className = 'vz-onboarding';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'false');
  overlay.setAttribute('aria-label', 'Prise en main du visualiseur');
  overlay.innerHTML = `
    <div class="vz-onboarding__card">
      <p class="vz-onboarding__step" data-step></p>
      <p class="vz-onboarding__title" data-title></p>
      <p class="vz-onboarding__text" data-text></p>
      <div class="vz-onboarding__dots" data-dots aria-hidden="true"></div>
      <div class="vz-onboarding__actions">
        <button class="btn btn--ghost btn--sm" type="button" data-skip>Passer</button>
        <button class="btn btn--solid btn--sm" type="button" data-next>Suivant</button>
      </div>
    </div>`;

  const stepEl = overlay.querySelector('[data-step]');
  const titleEl = overlay.querySelector('[data-title]');
  const textEl = overlay.querySelector('[data-text]');
  const dots = overlay.querySelector('[data-dots]');
  const next = overlay.querySelector('[data-next]');

  const paint = () => {
    const step = STEPS[index];
    stepEl.textContent = `Étape ${index + 1} sur ${STEPS.length}`;
    titleEl.textContent = step.title;
    textEl.textContent = step.text;
    next.textContent = index === STEPS.length - 1 ? 'C’est parti' : 'Suivant';
    dots.innerHTML = STEPS.map(
      (_, i) => `<span class="vz-onboarding__dot"${i === index ? ' data-current' : ''}></span>`
    ).join('');
  };

  const close = () => {
    overlay.hidden = true;
    try {
      window.localStorage.setItem(KEY, '1');
    } catch (error) {
      void error;
    }
  };

  const open = () => {
    index = 0;
    paint();
    overlay.hidden = false;
    window.setTimeout(() => next.focus({ preventScroll: true }), 60);
  };

  next.addEventListener('click', () => {
    if (index === STEPS.length - 1) {
      close();
      return;
    }
    index += 1;
    paint();
  });
  overlay.querySelector('[data-skip]').addEventListener('click', close);
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  host.appendChild(overlay);

  let seen = false;
  try {
    seen = window.localStorage.getItem(KEY) === '1';
  } catch (error) {
    void error;
  }

  return { element: overlay, open, close, seen };
}
