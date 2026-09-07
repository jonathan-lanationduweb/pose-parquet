/**
 * Composant « formulaire projet » — autonome et remplaçable.
 *
 * Dépendances : uniquement son fichier de configuration et une fonction
 * d'envoi. Aucune page ne connaît sa structure interne : elle déclare un point
 * de montage `[data-project-form]` et c'est tout.
 *
 *   import { mountProjectForm } from './project-form.js';
 *   mountProjectForm(document.querySelector('[data-project-form]'));
 *
 * L'envoi ne passe plus par une fonction injectée : le composant appelle
 * directement l'API du plugin WordPress, via `js/forms/`. La couche
 * d'abstraction avait un intérêt tant qu'aucun destinataire n'existait ; elle
 * n'en a plus, et elle avait un coût — c'est elle qui portait le faux succès
 * en `localStorage`. Voir `docs/backend/front-integration.md`.
 */
import { projectFormConfig } from './project-form.config.js';
import { apiConfigured } from '../../js/forms/api-config.js';
import { buildProjectPayload, visualizerFromParams, frontFieldFor } from '../../js/forms/project-payload.js';
import { fetchFormToken, submitProject, SubmitError, ERREURS } from '../../js/forms/submit-adapter.js';

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
const ANGLE_LABELS = {
  0: 'lames dans la largeur',
  90: 'lames dans la profondeur',
  45: 'pose en diagonale',
  '-45': 'pose en diagonale',
};

/**
 * Reprise d'une simulation faite dans le Studio.
 *
 * Seuls le parquet, le motif et l'orientation transitent par l'URL — jamais la
 * photo, qui ne quitte pas le navigateur. Les valeurs sont insérées comme
 * texte, jamais comme HTML.
 */
function prefillFromStudio(form) {
  const params = new URLSearchParams(window.location.search);
  const parquet = params.get('parquet');
  const motif = params.get('motif');
  if (!parquet && !motif) return;

  const angle = Number(params.get('orientation') || 0);
  let orientation = motif === 'point-de-hongrie' || motif === 'baton-rompu' ? motif : null;
  if (!orientation && motif === 'lames') {
    orientation = angle === 90 ? 'longueur' : Math.abs(angle) === 45 ? 'diagonale' : 'largeur';
  }
  if (orientation) {
    const input = form.querySelector(`input[name="orientation"][value="${orientation}"]`);
    // Après un rechargement, le navigateur restaure lui-même l'état des champs
    // et écrase ce que l'on vient d'écrire : on repasse donc juste après lui.
    if (input) window.setTimeout(() => { input.checked = true; }, 0);
  }

  const parts = [];
  if (parquet) parts.push(parquet);
  if (motif) parts.push(MOTIF_LABELS[motif] || motif);
  if (motif === 'lames' && ANGLE_LABELS[String(angle)]) parts.push(ANGLE_LABELS[String(angle)]);

  const note = document.createElement('p');
  note.className = 'pf__from-studio';
  note.textContent = `Reprise de votre simulation : ${parts.join(' · ')}. Votre photo n’a pas été transmise.`;
  form.prepend(note);

  const message = form.querySelector('textarea[name="message"]');
  if (message && !message.value) message.value = `Simulation réalisée dans le Studio : ${parts.join(', ')}.`;
}

/**
 * Paramètres d'acquisition présents dans l'URL d'arrivée.
 *
 * Trois clés, pas une de plus, et lues une seule fois au montage : elles
 * survivent ainsi aux étapes du formulaire et à un retour en arrière, sans
 * mesure d'audience maison, sans cookie et sans rien conserver après l'envoi.
 * On ne collecte pas le référent, ni l'historique, ni les autres paramètres :
 * ce qui n'est pas prévu au contrat n'est pas ramassé.
 */
function utmFromParams(params) {
  const lire = (nom) => (params.get(nom) || '').trim().slice(0, 100);

  return {
    utmSource: lire('utm_source'),
    utmMedium: lire('utm_medium'),
    utmCampaign: lire('utm_campaign'),
  };
}

/** Phrases d'échec, par code d'erreur de l'adaptateur. */
const MESSAGES_ECHEC = {
  not_configured:
    'Ce formulaire n’est pas encore relié à nos serveurs sur cette version du site : votre demande n’a pas été envoyée. Écrivez-nous depuis la page contact.',
  rate_limited: 'Trop de demandes ont été envoyées. Veuillez réessayer plus tard.',
  network: 'L’envoi n’a pas pu aboutir. Vérifiez votre connexion et réessayez.',
  timeout: 'L’envoi n’a pas pu aboutir. Vérifiez votre connexion et réessayez.',
  server: 'L’envoi n’a pas pu aboutir. Réessayez dans un instant.',
  /*
   * Pot de miel et jeton définitivement refusé : même phrase que pour une
   * erreur générale. Dire « vous avez rempli le champ piège » apprendrait à un
   * robot ce qu'il doit éviter la prochaine fois, et n'aiderait aucun humain —
   * un humain n'a pas pu le remplir.
   */
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

      <!--
        Pot de miel : le champ que seul un robot remplit. Le raisonnement et le
        choix de la technique de masquage sont dans project-form.css, sur la
        classe .pf__trap — commentaire volontairement court ICI, parce que ce
        bloc vit dans un littéral de gabarit et qu'un accent grave y refermerait
        la chaîne. C'est exactement l'erreur qui a été faite en l'écrivant :
        « display: none » entre accents graves a produit un SyntaxError et le
        formulaire ne se montait plus du tout.
      -->
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

    <div class="pf__success" hidden tabindex="-1">
      <p class="eyebrow" data-success-eyebrow>Demande enregistrée</p>
      <h2 data-success-title>Merci, votre projet est bien décrit.</h2>
      <p data-success-text>Nous avons reçu votre demande et nous vous répondrons par email ou par téléphone.</p>
      <p class="pf__reference" data-success-reference hidden></p>
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
  const failure = root.querySelector('.pf__failure');
  const success = root.querySelector('.pf__success');

  const fieldsByName = new Map();
  config.steps.forEach((step) => step.fields.forEach((field) => fieldsByName.set(field.name, field)));

  prefillFromStudio(form);

  /* ---- Contexte de la visite, lu une fois ---- */

  const params = new URLSearchParams(window.location.search);
  const utm = utmFromParams(params);
  const visualizer = visualizerFromParams(params);

  /*
   * Le jeton anti-spam.
   *
   * Demandé DÈS LE MONTAGE, et pas au moment d'envoyer. Deux raisons, et la
   * seconde est la vraie : le serveur refuse un jeton de moins de deux
   * secondes, donc un « GET puis POST » collés se ferait rejeter
   * systématiquement ; et une erreur de réseau au tout début se voit avant que
   * le visiteur ait saisi quoi que ce soit, ce qui est le bon moment pour lui
   * dire que le formulaire est indisponible.
   *
   * Il vit ici, dans cette fermeture. Nulle part ailleurs.
   */
  let token = '';
  let tokenIssuedAt = 0;
  let tokenPromise = null;

  const renewToken = async () => {
    const { token: neuf, issuedAt } = await fetchFormToken();
    token = neuf;
    tokenIssuedAt = issuedAt;
  };

  if (apiConfigured()) {
    // L'échec est avalé ici : il se manifestera à l'envoi, avec un message.
    // Prévenir au chargement d'une page qu'on vient peut-être seulement de
    // parcourir serait bruyant pour rien.
    tokenPromise = renewToken().catch(() => {});
  }

  /** Vrai tant qu'une requête d'envoi est en vol. */
  let sending = false;
  /** Vrai après un 201 : la demande est partie, on ne la renvoie pas. */
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

  /**
   * Affiche un échec et le fait annoncer.
   *
   * `prendreFocus` est faux quand un champ vient d'être désigné : c'est LUI
   * qui doit recevoir le curseur, pas le message. Le bloc porte `role="alert"`,
   * donc un lecteur d'écran l'annonce de toute façon, sans qu'on ait à y
   * déplacer le focus — et déplacer le focus vers un texte qu'on ne peut pas
   * corriger obligerait à retabuler jusqu'au champ.
   */
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

  /**
   * Reporte les refus du serveur sur les champs concernés.
   *
   * Le serveur rend `fields: { email: "…", surface: "…" }` avec les noms de
   * l'API ; le formulaire connaît les noms français. `frontFieldFor()` fait la
   * traduction inverse, et le premier champ fautif reçoit le focus après avoir
   * ramené son étape à l'écran — corriger un champ qu'on ne voit pas est
   * impossible.
   *
   * @returns {boolean} vrai si au moins un champ a été désigné
   */
  const appliquerErreursServeur = (fields) => {
    let premier = null;

    for (const [cleApi, raison] of Object.entries(fields || {})) {
      const nom = frontFieldFor(cleApi);
      if (!nom) continue;
      const container = root.querySelector(`[data-field="${nom}"]`);
      if (!container) continue;

      container.dataset.invalid = 'true';
      const message = container.querySelector('.field__error');
      // Le texte vient du serveur : il est posé comme TEXTE, jamais comme HTML.
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

    /*
     * Deux verrous, et ils ne protègent pas de la même chose.
     *
     * `sending` bloque le double clic : le backend n'a pas encore de clé
     * d'idempotence, donc deux requêtes parties ensemble créeraient deux
     * demandes identiques chez le destinataire. Le bouton est désactivé, mais
     * un `Entrée` maintenu ou un double clic très rapide peut passer avant que
     * le navigateur ne l'applique — d'où ce test en tête de fonction.
     *
     * `sent` interdit de renvoyer une demande déjà partie. L'écran de
     * confirmation remplace le formulaire, mais rien n'empêche un script ou un
     * raccourci de resoumettre.
     */
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
    status.textContent = 'Envoi en cours…';

    try {
      // Le jeton demandé au montage a pu ne pas être arrivé : on l'attend.
      if (tokenPromise) await tokenPromise;
      if (!token && apiConfigured()) await renewToken();

      const resultat = await submitProject({
        buildPayload: () => buildProjectPayload({
          formData: new FormData(form),
          formToken: token,
          // Le serveur ne garde que le chemin ; on ne lui donne que cela.
          sourcePath: window.location.pathname,
          utm,
          visualizer,
        }),
        renewToken,
        tokenIssuedAt: () => tokenIssuedAt,
      });

      sent = true;
      status.textContent = '';

      const refBloc = root.querySelector('[data-success-reference]');
      if (resultat.reference) {
        refBloc.textContent = `Référence : ${resultat.reference}. Conservez-la si vous souhaitez nous contacter à ce sujet.`;
        refBloc.hidden = false;
      } else {
        refBloc.hidden = true;
      }

      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (erreur) {
      const code = erreur instanceof SubmitError ? erreur.code : ERREURS.SERVEUR;

      /*
       * 422 de validation : on désigne les champs plutôt que d'afficher une
       * phrase générale. Si aucun champ n'a pu être rattaché — un cas qui ne
       * devrait pas arriver, le contrat étant partagé — on retombe sur le
       * message général plutôt que de laisser l'écran muet.
       */
      if (code === ERREURS.VALIDATION && appliquerErreursServeur(erreur.fields)) {
        status.textContent = '';
        // Le champ fautif garde le focus que `appliquerErreursServeur` lui a donné.
        montrerEchec(MESSAGES_ECHEC.validation, false);
      } else {
        montrerEchec(MESSAGES_ECHEC[code] || MESSAGES_ECHEC.server);
      }

      /*
       * Le formulaire reste tel quel : rien n'est vidé, aucune étape n'est
       * perdue, et le bouton redevient actif. Quelqu'un qui vient de remplir
       * cinq étapes ne doit pas les ressaisir parce que le réseau a hoqueté.
       */
      submitBtn.disabled = false;
    } finally {
      sending = false;
    }
  });

  root.querySelector('[data-restart]').addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    submitBtn.disabled = false;
    status.textContent = '';
    effacerEchec();
    root.querySelectorAll('[data-invalid]').forEach((el) => { el.dataset.invalid = 'false'; });
    // Nouvelle demande, donc nouveau jeton : celui qui a servi est consommé
    // côté limite de débit, et le suivant doit avoir son propre âge.
    sent = false;
    if (apiConfigured()) tokenPromise = renewToken().catch(() => {});
    show(0);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /**
   * Pré-remplissage depuis l'URL (ex. retour du simulateur de pose).
   *
   * `website` en est EXCLU, et c'est une faille qu'il a fallu voir venir : ce
   * pré-remplissage écrit dans tout champ dont le nom apparaît en paramètre
   * d'URL. Un lien `?website=x` aurait donc rempli le pot de miel à l'insu du
   * visiteur, et le serveur aurait refusé chacune de ses demandes avec un
   * message générique — un déni de service en un lien, indétectable pour lui
   * comme pour nous.
   */
  const CHAMPS_NON_PREREMPLISSABLES = new Set(['website']);
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
