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
import { readHandoffParams } from '../../js/forms/studio-handoff.js';
import { readPlanParams } from '../../js/forms/plan-handoff.js';
import { contexteVisite, champsQualification, ouvrirVisite } from '../../js/forms/lead-context.js';
import { estIdf, regionDe } from '../../js/forms/departements.js';
import { orientation, recapitulatif, lienVisualiseur, contexteClic, evenementClic, LIBELLES } from '../../js/forms/orientation.js';
import { echapper } from '../../js/utils/dom.js';
import { emettre } from '../../js/analytics/events.js';

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
/*
 * Les cinq réponses du champ « De quoi avez-vous besoin ? », pour la phrase
 * de reprise. Elles reprennent les libellés de la configuration, en minuscule
 * initiale : ils s'insèrent au milieu d'une phrase, pas en tête de bouton.
 */
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

/**
 * Reprise d'une simulation faite dans le Studio.
 *
 * Cinq champs courts transitent par l'URL — scène, produit, libellé, motif,
 * angle — et jamais la photo, qui ne quitte pas le navigateur. La convention
 * est celle de `js/forms/studio-handoff.js` : ce module la lit, il ne la
 * redéfinit pas. Les valeurs sont insérées comme texte, jamais comme HTML.
 *
 * Le nom du produit affiché ici vient de `libelle`. Un ancien lien qui portait
 * le nom commercial dans `parquet` ne le montrera plus — `parquet` porte
 * désormais l'identifiant — mais la reprise continue de s'afficher avec le
 * motif et l'angle : on perd un mot, pas un parcours.
 */
/**
 * Reprise de ce qui vient du Mode Plan.
 *
 * Deux champs, et deux seulement : le sens de pose et la surface. Ce sont les
 * deux que la personne vient de décider en dessinant son plan, et les deux que
 * le formulaire lui redemanderait mot pour mot.
 *
 * Aucun contexte de Visualiseur n'est écrit : le Mode Plan ne pose aucune
 * référence réelle sur aucune photographie. Y inscrire un produit ou une scène
 * ferait croire à une simulation qui n'a pas eu lieu.
 *
 * Rend vrai si quelque chose a été repris, pour que l'appelant sache s'il doit
 * annoncer la reprise.
 */
function prefillFromPlan(form) {
  const lu = readPlanParams(new URLSearchParams(window.location.search));
  if (!lu.present) return false;

  const repris = [];

  /*
   * Le besoin, quand le lien le connaît.
   *
   * Un tutoriel de pose qui propose de confier le chantier sait de quoi il
   * parle : inutile de reposer la question. Ce n'est pas répondre à la place
   * de la personne — le bouton radio est coché, visible, et se change d'un
   * clic comme n'importe quelle autre réponse pré-remplie.
   */
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
      // Même raison que pour la reprise du Studio : le navigateur restaure
      // l'état des champs après un rechargement, on repasse donc après lui.
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
  /* Un lien qui ne transmet que le besoin (accueil, tutoriels) n'apporte aucun
     calepinage : la phrase le nomme pour ce qu'il est. */
  const seulBesoin = Boolean(lu.besoin) && repris.length === 1 && !lu.pose && lu.surface === null;
  note.textContent = seulBesoin
    ? `Votre besoin : ${repris[0]}. À corriger si besoin.`
    : `Reprise de votre calepinage : ${repris.join(' · ')}. À corriger si besoin.`;
  form.prepend(note);
  return true;
}

function prefillFromStudio(form) {
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
    // Après un rechargement, le navigateur restaure lui-même l'état des champs
    // et écrase ce que l'on vient d'écrire : on repasse donc juste après lui.
    if (input) window.setTimeout(() => { input.checked = true; }, 0);
  }

  const parts = [];
  if (lu.productLabel) parts.push(lu.productLabel);
  if (motif) parts.push(MOTIF_LABELS[motif] || motif);
  if (motif === 'lames' && ANGLE_LABELS[String(angle)]) parts.push(ANGLE_LABELS[String(angle)]);

  // Ni produit reconnu ni motif : il n'y a rien à annoncer, et une phrase de
  // reprise vide serait pire que pas de phrase. On a tout de même pu cocher
  // un sens de pose : c'est une reprise, et l'appelant doit le savoir.
  if (!parts.length) return Boolean(orientation);

  const note = document.createElement('p');
  note.className = 'pf__from-studio';
  note.textContent = `Reprise de votre simulation : ${parts.join(' · ')}. Votre photo n’a pas été transmise.`;
  form.prepend(note);

  const message = form.querySelector('textarea[name="message"]');
  if (message && !message.value) message.value = `Simulation réalisée dans le Studio : ${parts.join(', ')}.`;

  return true;
}

/**
 * Paramètres d'acquisition, repris de la mémoire de visite.
 *
 * Ils étaient lus dans l'URL de CETTE page, et cela suffisait tant qu'on
 * arrivait sur le formulaire directement depuis une campagne. Un parcours
 * réel ne ressemble pas à cela : annonce → guide → Studio → formulaire, et à
 * la quatrième page les `utm_*` de la première ont disparu de l'adresse
 * depuis longtemps. La demande partait alors sans origine.
 *
 * `lead-context.js` les retient pour la durée de la visite, dans
 * `sessionStorage` : pas de cookie, rien qui survive à la fermeture de
 * l'onglet, rien qui suive quelqu'un d'un jour à l'autre. Cinq clés, celles
 * que le contrat prévoit, et rien d'autre — ni référent, ni historique.
 *
 * L'URL de la page reste lue par `ouvrirVisite()` : quelqu'un qui arrive
 * directement ici avec des `utm_*` est toujours servi.
 */
function utmDeLaVisite() {
  return { ...contexteVisite().utm };
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
    <!--
      Plus de bandeau d'indisponibilité de l'envoi : il n'y a plus de
      demande à envoyer. L'orientation se calcule
      dans le navigateur ; l'enregistrement du parcours (statistiques) est un
      plus, jamais une condition. Une API absente ou en panne ne bloque donc
      plus personne.
    -->
    <form class="pf" novalidate>
      <div class="pf__head">
        <p class="pf__count" aria-live="polite">Étape <b>1</b> sur ${config.steps.length}</p>
        <!--
          Ce qui vient après, nommé.
          Savoir qu'il reste quatre étapes ne dit pas si elles sont longues.
          Annoncer la suivante par son titre lève la seule question qui retient
          vraiment avant de commencer : « qu'est-ce qu'on va encore me
          demander ? ». L'attribut aria-hidden est voulu : les pastilles
          portent déjà le titre de chaque étape dans leur aria-label, et le
          compteur est aria-live —
          répéter ici ferait un doublon à chaque changement d'étape.
        -->
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

    <!-- La conclusion du parcours : une orientation (js/forms/orientation.js). -->
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

  /*
   * Deux reprises possibles, jamais les deux à la fois en pratique : on
   * arrive du Studio ou du Mode Plan, pas des deux. L'ordre donne malgré tout
   * la priorité au Studio, qui porte l'information la plus riche.
   */
  if (!prefillFromStudio(form)) prefillFromPlan(form);

  /* ---- Contexte de la visite, lu une fois ---- */

  const params = new URLSearchParams(window.location.search);
  // Si la visite commence ici — lien direct, favori, courriel — c'est le seul
  // moment où l'on peut encore enregistrer la page d'entrée et les UTM.
  ouvrirVisite();
  const utm = utmDeLaVisite();
  const visualizer = visualizerFromParams(params);
  /*
   * Le Studio a-t-il annoncé une référence à fiche réelle ?
   *
   * Lu ici et pas dans `visualizer` : cet objet-là est la charge envoyée à
   * l'API, et son contenu est fixé par le contrat du serveur. Le drapeau sert
   * à recommander une destination, il n'a rien à faire dans la demande.
   */
  const ficheReelle = readHandoffParams(params).ficheProduit;

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

  /*
   * L'API ne sert qu'à ENREGISTRER le parcours (statistiques, administration).
   * Si elle manque ou ne répond pas, le visiteur obtient quand même son
   * orientation : rien, dans ce qu'il voit, ne dépend du serveur ni d'un email.
   */
  if (apiConfigured()) {
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
    status.textContent = 'Préparation de votre orientation…';

    const donnees = new FormData(form);
    /*
     * La qualification est CALCULÉE au moment de l'envoi : elle dépend de ce
     * que le visiteur vient de répondre — son délai, sa surface — autant que
     * d'où il vient. `produitPremibel` se lit dans le contexte du Studio : une
     * référence identifiée qui porte une fiche réelle.
     */
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
        // Le jeton demandé au montage a pu ne pas être arrivé : on l'attend.
        if (tokenPromise) await tokenPromise;
        if (!token) await renewToken();
        const enregistre = await submitProject({
          buildPayload: () =>
            buildProjectPayload({
              formData: new FormData(form),
              formToken: token,
              // Le serveur ne garde que le chemin ; on ne lui donne que cela.
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
      /*
       * Seul un refus de VALIDATION arrête le parcours : une réponse est
       * réellement à corriger, et le serveur dit laquelle. Toute autre panne
       * (réseau, serveur, limite de débit) ne touche que nos statistiques —
       * l'orientation, elle, ne dépend pas du serveur.
       */
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

  /* ---- Conclusion : l'orientation ---- */

  const titrePage = document.querySelector('.page-hero__title');
  const chapoPage = document.querySelector('.page-hero__lead');
  const colonne = root.closest('.project-intro') ? root.closest('.project-intro').querySelector(':scope > aside') : null;
  const avant = {
    titre: titrePage ? titrePage.textContent : '',
    chapo: chapoPage ? chapoPage.textContent : '',
    colonne: colonne ? colonne.innerHTML : '',
  };
  const studio = readHandoffParams(params);

  /**
   * Le parquet essayé dans le Visualiseur, avec sa vraie fiche Premibel.
   * Lu dans le catalogue publié (le lien vient de là, jamais de l'URL de la
   * page) ; si le catalogue ne répond pas, on renvoie au catalogue Premibel.
   */
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
    const produit = await produitDuStudio();
    // Les liens commerciaux réglés dans WordPress (Mon site), écrits sur la page par le build.
    const liens = {
      premibelUrl: root.dataset.premibelUrl || '',
      premibelActif: root.dataset.premibelActif !== '0',
      allureActif: root.dataset.allureActif !== '0',
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
    // La référence choisie : vignette, nom, SKU, motif, surface — seulement ce qui est connu.
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
        ${etape.cta ? `<a class="btn ${etape.numero === 1 || vue.etapes.length > 1 ? 'btn--accent' : 'btn--ghost'} pf-dest__cta" href="${echapper(etape.cta.url)}" target="_blank" rel="noopener" data-suivi="${etape.cible}">${echapper(etape.cta.libelle)}</a>` : ''}
      </article>`;
    // Ce que le Visualiseur a préparé : référence, SKU, motif, orientation, pièce. Jamais la photo.
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

    // Mesure des clics sortants : contexte non personnel uniquement.
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

    // La page entière change de propos : le titre, le chapô, la colonne.
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

  /** Retour au formulaire, réponses conservées. */
  function modifier(preciser) {
    form.hidden = false;
    resultat.hidden = true;
    resultat.innerHTML = '';
    submitBtn.disabled = false;
    status.textContent = '';
    effacerEchec();
    // Un parcours modifié est un nouveau parcours : nouveau jeton.
    sent = false;
    if (apiConfigured()) tokenPromise = renewToken().catch(() => {});
    if (titrePage) titrePage.textContent = avant.titre;
    if (chapoPage) chapoPage.textContent = avant.chapo;
    if (colonne) { colonne.innerHTML = avant.colonne; delete colonne.dataset.etat; }
    delete root.dataset.etat;
    // « Préciser mon besoin » ramène à la question du besoin.
    const etapeBesoin = config.steps.findIndex((s) => s.fields.some((f) => f.name === 'besoin'));
    show(preciser && etapeBesoin >= 0 ? etapeBesoin : 0);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Pré-remplissage depuis l'URL (ex. retour du simulateur de pose).
   *
   * `website` en est EXCLU, et c'est une faille qu'il a fallu voir venir : ce
   * pré-remplissage écrit dans tout champ dont le nom apparaît en paramètre
   * d'URL. Un lien `?website=x` aurait donc rempli le pot de miel à l'insu du
   * visiteur, et le serveur aurait refusé chacune de ses demandes avec un
   * message générique — un déni de service en un lien, indétectable pour lui
   * comme pour nous.
   *
   * `piece` en est exclu aussi, pour une raison différente. Depuis le Studio,
   * `piece` porte un identifiant de SCÈNE (`sejour`, `chambre-parisienne`,
   * `salon-angle`), et le formulaire a un champ `piece` qui est le TYPE de
   * pièce déclaré par le visiteur. Les deux se ressemblent assez pour que
   * `sejour` tombe juste par accident, et pas assez pour que ce soit une
   * règle : `salon-angle` est un séjour, `bureau-vide` n'est pas une chambre.
   * Deviner le type de pièce à partir du nom d'une photo, c'est le genre de
   * coïncidence qui marche jusqu'au jour où elle décide à la place du visiteur.
   * Le type de pièce reste donc une réponse, pas une déduction.
   *
   * `parquet` pour la même raison : le Studio y met l'identifiant d'une
   * référence du catalogue (`chene-fume`), le formulaire y attend une famille
   * (`massif`, `contrecolle`…). Aucune valeur ne coïncide, si bien que le
   * pré-remplissage ne fait aujourd'hui que décocher le groupe — sans
   * conséquence puisque rien n'y est coché d'avance. Le jour où une valeur par
   * défaut y serait ajoutée, un lien venu du Studio l'effacerait en silence.
   */
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
