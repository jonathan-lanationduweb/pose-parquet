/**
 * Composant « formulaire projet » — autonome et remplaçable.
 *
 * Dépendances : uniquement son fichier de configuration et une fonction
 * d'envoi passée en option (`onSubmit`). Aucune page ne connaît sa structure
 * interne : elle déclare un point de montage `[data-project-form]` et c'est tout.
 *
 *   import { mountProjectForm } from './project-form.js';
 *   mountProjectForm(document.querySelector('[data-project-form]'), { onSubmit });
 */
import { projectFormConfig } from './project-form.config.js';

const uid = () => Math.random().toString(36).slice(2, 8);

function fieldMarkup(field, id) {
  const required = field.required ? 'required' : '';
  const describedBy = `${id}-error${field.hint ? ` ${id}-hint` : ''}`;

  switch (field.type) {
    case 'radio':
      return `
        <fieldset class="pf-field pf-field--${field.width || 'full'}" data-field="${field.name}">
          <legend class="field__label">${field.label}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</legend>
          ${field.hint ? `<p class="field__hint" id="${id}-hint">${field.hint}</p>` : ''}
          <div class="choice-grid" role="radiogroup" aria-describedby="${describedBy}">
            ${field.options
              .map(
                (option, index) => `
              <label class="choice">
                <input type="radio" name="${field.name}" value="${option.value}" ${required} ${index === 0 ? `data-first` : ''} />
                <span class="choice__dot" aria-hidden="true"></span>
                <span>${option.label}</span>
              </label>`
              )
              .join('')}
          </div>
          <p class="field__error" id="${id}-error">Choisissez une option pour continuer.</p>
        </fieldset>`;

    case 'select':
      return `
        <div class="pf-field pf-field--${field.width || 'full'} field" data-field="${field.name}">
          <label class="field__label" for="${id}">${field.label}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</label>
          ${field.hint ? `<p class="field__hint" id="${id}-hint">${field.hint}</p>` : ''}
          <select class="select" id="${id}" name="${field.name}" ${required} aria-describedby="${describedBy}">
            ${field.required ? '<option value="">Sélectionner…</option>' : ''}
            ${field.options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
          </select>
          <p class="field__error" id="${id}-error">${field.errorMessage || 'Ce choix est nécessaire.'}</p>
        </div>`;

    case 'textarea':
      return `
        <div class="pf-field pf-field--full field" data-field="${field.name}">
          <label class="field__label" for="${id}">${field.label}</label>
          <textarea class="textarea" id="${id}" name="${field.name}" ${required}
            placeholder="${field.placeholder || ''}" aria-describedby="${describedBy}"></textarea>
          <p class="field__error" id="${id}-error">${field.errorMessage || 'Ce champ est nécessaire.'}</p>
        </div>`;

    case 'consent':
      return `
        <div class="pf-field pf-field--full field" data-field="${field.name}">
          <label class="consent">
            <input type="checkbox" name="${field.name}" ${required} aria-describedby="${describedBy}" />
            <span>${field.label}</span>
          </label>
          <p class="field__error" id="${id}-error">${field.errorMessage || 'Votre accord est nécessaire.'}</p>
        </div>`;

    default:
      return `
        <div class="pf-field pf-field--${field.width || 'full'} field" data-field="${field.name}">
          <label class="field__label" for="${id}">${field.label}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</label>
          ${field.hint ? `<p class="field__hint" id="${id}-hint">${field.hint}</p>` : ''}
          <input class="input" type="${field.type}" id="${id}" name="${field.name}" ${required}
            ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
            ${field.pattern ? `pattern="${field.pattern}"` : ''}
            ${field.min !== undefined ? `min="${field.min}"` : ''}
            ${field.max !== undefined ? `max="${field.max}"` : ''}
            ${field.step !== undefined ? `step="${field.step}"` : ''}
            ${field.autocomplete ? `autocomplete="${field.autocomplete}"` : ''}
            aria-describedby="${describedBy}" />
          <p class="field__error" id="${id}-error">${field.errorMessage || 'Ce champ est nécessaire.'}</p>
        </div>`;
  }
}

export function mountProjectForm(root, options = {}) {
  if (!root) return null;
  const config = options.config || projectFormConfig;
  const onSubmit = options.onSubmit || (async (payload) => ({ ok: true, mode: 'noop', payload }));
  const prefix = `pf-${uid()}`;
  let current = 0;

  root.classList.add('project-form');
  root.innerHTML = `
    <form class="pf" novalidate>
      <div class="pf__head">
        <p class="pf__count" aria-live="polite">Étape <b>1</b> sur ${config.steps.length}</p>
        <ol class="pf__dots">
          ${config.steps
            .map(
              (step, index) =>
                `<li><button type="button" class="pf__dot" data-goto="${index}" aria-label="Étape ${index + 1} : ${step.title}"></button></li>`
            )
            .join('')}
        </ol>
      </div>

      ${config.steps
        .map(
          (step, index) => `
        <section class="pf__step" data-step="${index}" ${index === 0 ? '' : 'hidden'}
          aria-labelledby="${prefix}-step-${index}">
          <h3 class="pf__title" id="${prefix}-step-${index}">${step.title}</h3>
          ${step.hint ? `<p class="pf__hint">${step.hint}</p>` : ''}
          <div class="pf__grid">
            ${step.fields.map((field) => fieldMarkup(field, `${prefix}-${field.name}`)).join('')}
          </div>
        </section>`
        )
        .join('')}

      <div class="pf__actions">
        <button type="button" class="btn btn--ghost" data-prev hidden>Retour</button>
        <button type="button" class="btn" data-next>Continuer</button>
        <button type="submit" class="btn btn--accent" data-submit hidden>${config.submitLabel}</button>
      </div>
      <p class="pf__status" role="status" aria-live="polite"></p>
    </form>

    <div class="pf__success" hidden tabindex="-1">
      <p class="eyebrow">Demande enregistrée</p>
      <h3>Merci, votre projet est bien décrit.</h3>
      <p>Nous revenons vers vous rapidement. En attendant, le simulateur de pose peut vous aider à visualiser les options retenues.</p>
      <button type="button" class="btn btn--ghost btn--sm" data-restart>Décrire un autre projet</button>
    </div>`;

  const form = root.querySelector('form');
  const steps = Array.from(root.querySelectorAll('.pf__step'));
  const dots = Array.from(root.querySelectorAll('.pf__dot'));
  const counter = root.querySelector('.pf__count b');
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  const submitBtn = root.querySelector('[data-submit]');
  const status = root.querySelector('.pf__status');
  const success = root.querySelector('.pf__success');

  const fieldsByName = new Map();
  config.steps.forEach((step) => step.fields.forEach((field) => fieldsByName.set(field.name, field)));

  const applyConditionalVisibility = () => {
    fieldsByName.forEach((field) => {
      if (!field.visibleIf) return;
      const container = root.querySelector(`[data-field="${field.name}"]`);
      if (!container) return;
      const source = form.elements[field.visibleIf.field];
      const value = source ? source.value : '';
      const visible = value === field.visibleIf.equals;
      container.hidden = !visible;
      container.querySelectorAll('input, select, textarea').forEach((input) => {
        input.disabled = !visible;
      });
    });
  };

  const controls = (name) => Array.from(form.elements[name] || []);

  const validateField = (field) => {
    const container = root.querySelector(`[data-field="${field.name}"]`);
    if (!container || container.hidden) return true;
    const inputs = form.elements[field.name];
    const list = inputs instanceof RadioNodeList ? Array.from(inputs) : [inputs].filter(Boolean);
    if (!list.length) return true;

    let valid = true;
    if (field.type === 'radio') valid = list.some((input) => input.checked);
    else if (field.type === 'consent') valid = list[0].checked;
    else valid = list[0].checkValidity() && (!field.required || list[0].value.trim() !== '');

    container.dataset.invalid = String(!valid);
    return valid;
  };

  const validateStep = (index) => {
    const results = config.steps[index].fields.map(validateField);
    const firstInvalid = root.querySelector(`[data-step="${index}"] [data-invalid="true"]`);
    if (firstInvalid) {
      const focusable = firstInvalid.querySelector('input, select, textarea');
      if (focusable) focusable.focus();
    }
    return results.every(Boolean);
  };

  const show = (index) => {
    current = Math.min(Math.max(index, 0), steps.length - 1);
    steps.forEach((step, i) => { step.hidden = i !== current; });
    dots.forEach((dot, i) => {
      dot.dataset.state = i < current ? 'done' : i === current ? 'current' : 'todo';
      dot.setAttribute('aria-current', String(i === current));
    });
    counter.textContent = String(current + 1);
    prevBtn.hidden = current === 0;
    nextBtn.hidden = current === steps.length - 1;
    submitBtn.hidden = current !== steps.length - 1;
    applyConditionalVisibility();
    const heading = steps[current].querySelector('.pf__title');
    if (heading) heading.setAttribute('tabindex', '-1');
    if (heading && root.dataset.mounted === 'true') heading.focus({ preventScroll: false });
    root.dataset.mounted = 'true';
  };

  nextBtn.addEventListener('click', () => {
    if (validateStep(current)) show(current + 1);
  });
  prevBtn.addEventListener('click', () => show(current - 1));
  dots.forEach((dot, index) =>
    dot.addEventListener('click', () => {
      if (index <= current || validateStep(current)) show(index);
    })
  );

  form.addEventListener('change', (event) => {
    applyConditionalVisibility();
    const field = fieldsByName.get(event.target.name);
    if (field) validateField(field);
  });
  form.addEventListener('input', (event) => {
    const container = event.target.closest('[data-field]');
    if (container && container.dataset.invalid === 'true') {
      const field = fieldsByName.get(event.target.name);
      if (field) validateField(field);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const allValid = config.steps.every((step, index) => {
      const valid = step.fields.map(validateField).every(Boolean);
      if (!valid && index < current) show(index);
      return valid;
    });
    if (!allValid) {
      status.textContent = 'Certains champs sont incomplets.';
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Envoi en cours…';
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.source = window.location.pathname;

    try {
      await onSubmit(payload);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      status.textContent = "L'envoi a échoué. Réessayez dans un instant.";
      submitBtn.disabled = false;
      void error;
    }
  });

  root.querySelector('[data-restart]').addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    submitBtn.disabled = false;
    status.textContent = '';
    root.querySelectorAll('[data-invalid]').forEach((el) => { el.dataset.invalid = 'false'; });
    show(0);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /** Pré-remplissage depuis l'URL (ex. retour du simulateur de pose). */
  const prefill = new URLSearchParams(window.location.search);
  prefill.forEach((value, key) => {
    const input = form.elements[key];
    if (!input) return;
    if (input instanceof RadioNodeList) {
      Array.from(input).forEach((radio) => { radio.checked = radio.value === value; });
    } else {
      input.value = value;
    }
  });

  show(0);
  void controls;

  return {
    element: root,
    goTo: show,
    destroy: () => { root.innerHTML = ''; },
  };
}

export default mountProjectForm;
