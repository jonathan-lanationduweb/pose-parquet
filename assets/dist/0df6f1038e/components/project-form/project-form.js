import { projectFormConfig } from './project-form.config.js';
import { apiConfigured } from '../../js/forms/api-config.js';
import { buildProjectPayload, visualizerFromParams, frontFieldFor } from '../../js/forms/project-payload.js';
import { fetchFormToken, submitProject, SubmitError, ERREURS } from '../../js/forms/submit-adapter.js';
import { readHandoffParams } from '../../js/forms/studio-handoff.js';
import { readPlanParams } from '../../js/forms/plan-handoff.js';
import { contexteVisite, champsQualification, ouvrirVisite } from '../../js/forms/lead-context.js';
import { estIdf, regionDe } from '../../js/forms/departements.js';
import { orientation, recapitulatif, lienVisualiseur, contexteClic, evenementClic, LIBELLES } from '../../js/forms/orientation.js';
import { echapper } from '../../js/utils/dom.js';
import { emettre } from '../../js/analytics/events.js';
import { etatPartenaires } from '../../js/commerce/partenaires.js';

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

const MOTIF_LABELS = {
  lames: 'lames droites',
  'point-de-hongrie': 'Point de Hongrie',
  'baton-rompu': 'bâton rompu',
};


const BESOIN_LABELS = {
  produit: 'trouver un parquet',
  pose: 'faire poser',
  'produit-pose': 'parquet et pose',
  renovation: 'rénovation ou aménagement',
  indetermine: 'besoin à préciser',
};
const ANGLE_LABELS = {
  0: 'lames dans la largeur',
  90: 'lames dans la profondeur',
  45: 'pose en diagonale',
  '-45': 'pose en diagonale',
};





function prefillFromPlan(form) {
  const lu = readPlanParams(new URLSearchParams(window.location.search));
  if (!lu.present) return false;

  const repris = [];



  if (lu.besoin) {
    const choix = form.querySelector(`input[name="besoin"][value="${lu.besoin}"]`);
    if (choix) {
      window.setTimeout(() => { choix.checked = true; }, 0);
      repris.push(BESOIN_LABELS[lu.besoin] || lu.besoin);
    }
  }

  if (lu.pose) {
    const input = form.querySelector(`input[name="orientation"][value="${lu.pose}"]`);
    if (input) {


      window.setTimeout(() => { input.checked = true; }, 0);
      repris.push(MOTIF_LABELS[lu.pose] || lu.pose);
    }
  }

  if (lu.surface !== null) {
    const champ = form.querySelector('input[name="surface"]');
    if (champ && !champ.value) {
      window.setTimeout(() => { champ.value = String(lu.surface); }, 0);
      repris.push(`${lu.surface} m²`);
    }
  }

  if (!repris.length) return false;

  const note = document.createElement('p');
  note.className = 'pf__from-studio';


  const seulBesoin = Boolean(lu.besoin) && repris.length === 1 && !lu.pose && lu.surface === null;
  note.textContent = seulBesoin
    ? `Votre besoin : ${repris[0]}. À corriger si besoin.`
    : `Reprise de votre calepinage : ${repris.join(' · ')}. À corriger si besoin.`;
  form.prepend(note);
  return true;
}

function prefillFromStudio(form, base = '../') {
  const params = new URLSearchParams(window.location.search);
  const lu = readHandoffParams(params);
  if (!lu.present) return false;

  const motif = lu.pattern;
  const angle = lu.angle === null ? 0 : lu.angle;
  let orientation = motif === 'point-de-hongrie' || motif === 'baton-rompu' ? motif : null;
  if (!orientation && motif === 'lames') {
    orientation = angle === 90 ? 'longueur' : Math.abs(angle) === 45 ? 'diagonale' : 'largeur';
  }
  if (orientation) {
    const input = form.querySelector(`input[name="orientation"][value="${orientation}"]`);


    if (input) window.setTimeout(() => { input.checked = true; }, 0);
  }

  const parts = [];
  if (lu.productLabel) parts.push(lu.productLabel);
  if (motif) parts.push(MOTIF_LABELS[motif] || motif);
  if (motif === 'lames' && ANGLE_LABELS[String(angle)]) parts.push(ANGLE_LABELS[String(angle)]);




  if (!parts.length) return Boolean(orientation);



  const carte = document.createElement('div');
  carte.className = 'pf-choix';
  const details = [
    motif ? MOTIF_LABELS[motif] || motif : '',
    motif === 'lames' && ANGLE_LABELS[String(angle)] ? ANGLE_LABELS[String(angle)] : '',
    lu.sceneLabel || '',
  ].filter(Boolean);
  carte.innerHTML = `
    <div class="pf-choix__visuel" data-pf-vignette hidden></div>
    <div class="pf-choix__texte">
      <p class="pf-choix__eyebrow">Votre choix dans le Visualiseur</p>
      <p class="pf-choix__nom">${echapper(lu.productLabel || MOTIF_LABELS[motif] || motif || 'Votre simulation')}</p>
      ${details.length ? `<p class="pf-choix__details">${echapper(details.join(' · '))}</p>` : ''}
      <a class="pf-choix__lien" href="${echapper(lienVisualiseur(base, lu))}">Modifier dans le Visualiseur</a>
    </div>
    <p class="pf-choix__note">Votre photo est restée dans votre navigateur.</p>`;
  form.prepend(carte);

  if (lu.productId) {
    fetch(`${base}data/products.premibel.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((catalogue) => {
        const p = catalogue && (catalogue.produits || []).find((x) => x.id === lu.productId || x.sku === lu.productId);
        const hote = carte.querySelector('[data-pf-vignette]');
        if (!p || !p.thumbnail || !hote) return;
        const img = document.createElement('img');
        img.src = `${base}${p.thumbnail}`;
        img.alt = '';
        img.decoding = 'async';
        img.addEventListener('load', () => { hote.hidden = false; });
        hote.appendChild(img);
      })
      .catch(() => {});
  }

  const message = form.querySelector('textarea[name="message"]');
  if (message && !message.value) message.value = `Simulation réalisée dans le Studio : ${parts.join(', ')}.`;

  return true;
}



function utmDeLaVisite() {
  return { ...contexteVisite().utm };
}


const MESSAGES_ECHEC = {
  not_configured:
    'Ce formulaire n’est pas encore relié à nos serveurs sur cette version du site : votre demande n’a pas été envoyée. Écrivez-nous depuis la page contact.',
  rate_limited: 'Trop de demandes ont été envoyées. Veuillez réessayer plus tard.',
  network: 'L’envoi n’a pas pu aboutir. Vérifiez votre connexion et réessayez.',
  timeout: 'L’envoi n’a pas pu aboutir. Vérifiez votre connexion et réessayez.',
  server: 'L’envoi n’a pas pu aboutir. Réessayez dans un instant.',


  submission_rejected: 'L’envoi n’a pas pu aboutir. Réessayez dans un instant.',
  form_token_invalid: 'L’envoi n’a pas pu aboutir. Rechargez la page et réessayez.',
  validation: 'Certains champs doivent être corrigés.',
};

export function mountProjectForm(root, options = {}) {
  if (!root) return null;
  const config = options.config || projectFormConfig;
  const prefix = `pf-${uid()}`;
  let current = 0;

  root.classList.add('project-form');
  root.innerHTML = `







    <form class="pf" novalidate>
      <div class="pf__head">
        <p class="pf__count" aria-live="polite">Étape <b>1</b> sur ${config.steps.length}</p>










        <p class="pf__next" aria-hidden="true"></p>
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
          <h2 class="pf__title" id="${prefix}-step-${index}">${step.title}</h2>
          ${step.hint ? `<p class="pf__hint">${step.hint}</p>` : ''}
          <div class="pf__grid">
            ${step.fields.map((field) => fieldMarkup(field, `${prefix}-${field.name}`)).join('')}
          </div>
        </section>`
        )
        .join('')}










      <div class="pf__trap" aria-hidden="true">
        <label for="${prefix}-website">Site web (ne pas remplir)</label>
        <input type="text" id="${prefix}-website" name="website" tabindex="-1"
          autocomplete="off" value="" />
      </div>

      <div class="pf__actions">
        <button type="button" class="btn btn--ghost" data-prev hidden>Retour</button>
        <button type="button" class="btn" data-next>Continuer</button>
        <button type="submit" class="btn btn--accent" data-submit hidden>${config.submitLabel}</button>
      </div>
      <p class="pf__status" role="status" aria-live="polite"></p>
      <p class="pf__failure" role="alert" hidden tabindex="-1"></p>
    </form>


    <div class="pf__result" data-result hidden tabindex="-1"></div>`;

  const form = root.querySelector('form');
  const steps = Array.from(root.querySelectorAll('.pf__step'));
  const dots = Array.from(root.querySelectorAll('.pf__dot'));
  const counter = root.querySelector('.pf__count b');
  const suite = root.querySelector('.pf__next');
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  const submitBtn = root.querySelector('[data-submit]');
  const status = root.querySelector('.pf__status');
  const failure = root.querySelector('.pf__failure');
  const resultat = root.querySelector('[data-result]');
  const base = root.dataset.base || '../';

  const fieldsByName = new Map();
  config.steps.forEach((step) => step.fields.forEach((field) => fieldsByName.set(field.name, field)));



  if (!prefillFromStudio(form, base)) prefillFromPlan(form);



  const params = new URLSearchParams(window.location.search);


  ouvrirVisite();
  const utm = utmDeLaVisite();
  const visualizer = visualizerFromParams(params);


  const ficheReelle = readHandoffParams(params).ficheProduit;



  let token = '';
  let tokenIssuedAt = 0;
  let tokenPromise = null;

  const renewToken = async () => {
    const { token: neuf, issuedAt } = await fetchFormToken();
    token = neuf;
    tokenIssuedAt = issuedAt;
  };



  if (apiConfigured()) {
    tokenPromise = renewToken().catch(() => {});
  }


  let sending = false;

  let sent = false;

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
    const suivante = config.steps[current + 1];
    suite.textContent = suivante ? `Ensuite : ${suivante.title}` : '';
    suite.hidden = !suivante;
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



  const montrerEchec = (texte, prendreFocus = true) => {
    status.textContent = '';
    failure.textContent = texte;
    failure.hidden = false;
    if (prendreFocus) failure.focus();
  };

  const effacerEchec = () => {
    failure.hidden = true;
    failure.textContent = '';
  };



  const appliquerErreursServeur = (fields) => {
    let premier = null;

    for (const [cleApi, raison] of Object.entries(fields || {})) {
      const nom = frontFieldFor(cleApi);
      if (!nom) continue;
      const container = root.querySelector(`[data-field="${nom}"]`);
      if (!container) continue;

      container.dataset.invalid = 'true';
      const message = container.querySelector('.field__error');

      if (message && typeof raison === 'string' && raison !== '') message.textContent = raison;
      if (!premier) premier = { container, nom };
    }

    if (!premier) return false;

    const etape = config.steps.findIndex((step) => step.fields.some((f) => f.name === premier.nom));
    if (etape >= 0) show(etape);
    const focusable = premier.container.querySelector('input, select, textarea');
    if (focusable) focusable.focus();

    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();



    if (sending || sent) return;

    const allValid = config.steps.every((step, index) => {
      const valid = step.fields.map(validateField).every(Boolean);
      if (!valid && index < current) show(index);
      return valid;
    });
    if (!allValid) {
      status.textContent = 'Certains champs sont incomplets.';
      return;
    }

    effacerEchec();
    sending = true;
    submitBtn.disabled = true;
    status.textContent = 'Préparation de votre orientation…';

    const donnees = new FormData(form);


    const qualification = champsQualification({
      besoin: String(donnees.get('besoin') || ''),
      produitPremibel: ficheReelle,
      timeframe: String(donnees.get('delai') || ''),
      surface: Number(donnees.get('surface') || 0),
      department: String(donnees.get('departement') || ''),
    });

    let reference = '';
    try {
      if (apiConfigured()) {

        if (tokenPromise) await tokenPromise;
        if (!token) await renewToken();
        const enregistre = await submitProject({
          buildPayload: () =>
            buildProjectPayload({
              formData: new FormData(form),
              formToken: token,

              sourcePath: window.location.pathname,
              utm,
              visualizer,
              qualification,
            }),
          renewToken,
          tokenIssuedAt: () => tokenIssuedAt,
        });
        reference = String(enregistre.reference || '');
      }
    } catch (erreur) {
      const code = erreur instanceof SubmitError ? erreur.code : ERREURS.SERVEUR;


      if (code === ERREURS.VALIDATION && appliquerErreursServeur(erreur.fields)) {
        status.textContent = '';
        montrerEchec(MESSAGES_ECHEC.validation, false);
        submitBtn.disabled = false;
        sending = false;
        return;
      }
    }

    sending = false;
    sent = true;
    emettre('submit_project', {
      reference,
      source: contexteVisite().leadSource || '',
      besoin: qualification.leadNeed,
      destination: qualification.leadDestination,
      enregistre: Boolean(reference),
    });
    status.textContent = '';
    await montrerOrientation(donnees, qualification, reference);
  });



  const titrePage = document.querySelector('.page-hero__title');
  const chapoPage = document.querySelector('.page-hero__lead');
  const colonne = root.closest('.project-intro') ? root.closest('.project-intro').querySelector(':scope > aside') : null;
  const avant = {
    titre: titrePage ? titrePage.textContent : '',
    chapo: chapoPage ? chapoPage.textContent : '',
    colonne: colonne ? colonne.innerHTML : '',
  };
  const studio = readHandoffParams(params);



  async function produitDuStudio() {
    if (!studio.productId || !studio.ficheProduit) return null;
    try {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const minuteur = ctrl ? setTimeout(() => ctrl.abort(), 5000) : null;
      const r = await fetch(`${base}data/products.premibel.json`, ctrl ? { signal: ctrl.signal } : {});
      if (minuteur) clearTimeout(minuteur);
      if (!r.ok) return null;
      const catalogue = await r.json();
      const p = (catalogue.produits || []).find((x) => x.id === studio.productId || x.sku === studio.productId);
      return p
        ? { id: p.id, sku: p.sku || p.id, nom: p.name, url: p.productUrl, motif: studio.pattern, vignette: p.thumbnail ? `${base}${p.thumbnail}` : null }
        : null;
    } catch {
      return null;
    }
  }

  async function montrerOrientation(donnees, qualification, reference) {
    const departement = String(donnees.get('departement') || '').trim().toUpperCase();
    const idf = estIdf(departement);
    const [produit, partenaires] = await Promise.all([produitDuStudio(), etatPartenaires()]);


    const liens = {
      premibelUrl: root.dataset.premibelUrl || '',
      premibelActif: root.dataset.premibelActif !== '0' && partenaires.premibel,
      allureActif: root.dataset.allureActif !== '0' && partenaires.allure,
    };
    const vue = orientation({ destination: qualification.leadDestination, besoin: qualification.leadNeed, idf, produit, liens });
    const lignes = recapitulatif({
      besoin: qualification.leadNeed,
      piece: String(donnees.get('piece') || ''),
      surface: donnees.get('surface'),
      parquet: String(donnees.get('parquet') || ''),
      orientation: String(donnees.get('orientation') || ''),
      produitNom: (produit && produit.nom) || studio.productLabel || '',
      motif: studio.pattern || '',
      angle: studio.angle,
      departement,
      region: regionDe(departement),
      idf,
      delai: String(donnees.get('delai') || ''),
    });
    const origine = contexteVisite().leadSource || '';
    const depuisStudio = studio.present && (studio.productId || studio.pattern);
    const retourStudio = lienVisualiseur(base, studio);

    const surface = Number(donnees.get('surface')) > 0 ? `${Number(donnees.get('surface'))} m²` : '';

    const ficheProduit = (pr) => {
      const details = [
        pr.sku ? `Réf. ${echapper(pr.sku)}` : '',
        pr.motif && LIBELLES.motif[pr.motif] ? LIBELLES.motif[pr.motif] : '',
        surface,
      ].filter(Boolean).join(' · ');
      return `<div class="pf-dest__produit">
          ${pr.vignette ? `<img class="pf-dest__vignette" src="${echapper(pr.vignette)}" alt="" width="64" height="64" loading="lazy" />` : ''}
          <p><strong>${echapper(pr.nom)}</strong>${details ? `<span>${details}</span>` : ''}</p>
        </div>`;
    };
    const carte = (etape) => `
      <article class="pf-dest pf-dest--${etape.cible}" data-cible="${etape.cible}">
        <p class="pf-dest__num">${String(etape.numero).padStart(2, '0')}</p>
        <p class="pf-dest__role">${echapper(etape.titre)}</p>
        <h3 class="pf-dest__nom">${echapper(etape.entreprise)}</h3>
        <p class="pf-dest__texte">${echapper(etape.texte)}</p>
        ${etape.produit ? ficheProduit(etape.produit) : ''}
        ${etape.cta ? `<a class="btn ${etape.numero === 1 || vue.etapes.length > 1 ? 'btn--accent' : 'btn--ghost'} pf-dest__cta" href="${echapper(etape.cta.url)}" target="_blank" rel="sponsored noopener" data-suivi="${etape.cible}">${echapper(etape.cta.libelle)}</a>` : ''}
      </article>`;

    const configStudio = [
      (produit && produit.nom) || studio.productLabel || '',
      produit && produit.sku ? `Réf. ${produit.sku}` : '',
      studio.pattern && LIBELLES.motif[studio.pattern] ? LIBELLES.motif[studio.pattern] : '',
      Number.isInteger(studio.angle) ? `${studio.angle}°` : '',
      studio.sceneLabel || '',
    ].filter(Boolean).map(echapper).join(' · ');

    resultat.innerHTML = `
      <header class="pf-result__head">
        <p class="eyebrow">Votre projet</p>
        <h2 class="pf-result__title">${echapper(vue.titre)}</h2>
        <p class="pf-result__intro">${echapper(vue.intro)}</p>
        ${lignes.length ? `<dl class="pf-recap">${lignes.map((l) => `<div><dt>${echapper(l.libelle)}</dt><dd>${echapper(l.valeur)}</dd></div>`).join('')}</dl>` : ''}
      </header>
      <div class="pf-result__dests" data-n="${vue.etapes.length}">${vue.etapes.map(carte).join('')}</div>
      ${vue.note ? `<p class="pf-result__note">${echapper(vue.note)}</p>` : ''}
      ${depuisStudio ? `<p class="pf-result__studio"><strong>Configuration préparée dans le Visualiseur</strong>${configStudio ? ` : ${configStudio}` : ''}. Votre photo n’a pas quitté votre navigateur.</p>` : ''}
      <div class="pf-result__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-modifier>${vue.preciser ? 'Préciser mon besoin' : 'Modifier mon projet'}</button>
        <a class="link-arrow" href="${echapper(retourStudio)}">${depuisStudio ? 'Revoir dans le Visualiseur' : 'Essayer un parquet dans le Visualiseur'}</a>
      </div>
      <p class="pf-result__orient">Pose-Parquet vous oriente : il ne transmet pas votre projet. Vous gardez la main, et aucune coordonnée ne vous a été demandée.</p>`;


    resultat.querySelectorAll('a[data-suivi]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const cible = lien.dataset.suivi;
        emettre(evenementClic(cible), contexteClic({
          cible,
          besoin: qualification.leadNeed,
          destination: vue.destination,
          produit,
          motif: studio.pattern || String(donnees.get('orientation') || ''),
          origine,
          idf: departement ? idf : undefined,
          page: window.location.pathname,
        }));
      });
    });
    resultat.querySelector('[data-modifier]').addEventListener('click', () => modifier(vue.preciser));


    if (titrePage) titrePage.textContent = 'Voici comment avancer.';
    if (chapoPage) chapoPage.textContent = 'Selon vos réponses, voici vers qui vous tourner pour la suite de votre projet.';
    if (colonne) {
      colonne.innerHTML = `<div class="aside-box pf-next"><h3>Votre prochaine étape</h3><p>${echapper(vue.prochaine)}</p></div>`;
      colonne.dataset.etat = 'orientation';
    }
    root.dataset.etat = 'orientation';

    form.hidden = true;
    resultat.hidden = false;
    emettre('view_orientation', { destination: vue.destination, besoin: qualification.leadNeed, origine, enregistre: Boolean(reference) });
    resultat.focus({ preventScroll: true });
    resultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  function modifier(preciser) {
    form.hidden = false;
    resultat.hidden = true;
    resultat.innerHTML = '';
    submitBtn.disabled = false;
    status.textContent = '';
    effacerEchec();

    sent = false;
    if (apiConfigured()) tokenPromise = renewToken().catch(() => {});
    if (titrePage) titrePage.textContent = avant.titre;
    if (chapoPage) chapoPage.textContent = avant.chapo;
    if (colonne) { colonne.innerHTML = avant.colonne; delete colonne.dataset.etat; }
    delete root.dataset.etat;

    const etapeBesoin = config.steps.findIndex((s) => s.fields.some((f) => f.name === 'besoin'));
    show(preciser && etapeBesoin >= 0 ? etapeBesoin : 0);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }



  const CHAMPS_NON_PREREMPLISSABLES = new Set(['website', 'piece', 'parquet']);
  const prefill = new URLSearchParams(window.location.search);
  prefill.forEach((value, key) => {
    if (CHAMPS_NON_PREREMPLISSABLES.has(key)) return;
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
