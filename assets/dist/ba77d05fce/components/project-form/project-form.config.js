/**
 * Configuration du formulaire projet.
 *
 * Ce fichier décrit 100 % des étapes et des champs : le composant
 * (project-form.js) ne connaît que ce schéma. Pour remplacer ce formulaire
 * par celui d'un partenaire, il suffit de démonter le composant du point de
 * montage `[data-project-form]` — aucune page ne dépend de sa structure interne.
 */

export const projectFormConfig = {
  id: 'projet',
  title: 'Décrire mon projet',
  submitLabel: 'Envoyer ma demande',
  steps: [
    {
      id: 'lieu',
      title: 'Où se situe le projet ?',
      hint: 'Ces informations permettent de situer le chantier et ses contraintes.',
      fields: [
        /*
         * ZONE ET RÉGION ONT DISPARU DE LA SAISIE.
         *
         * Elles demandaient trois fois la même chose : une zone, puis une
         * région, puis un département. Trois réponses possibles pour un seul
         * fait — « hors Île-de-France » avec un 75 était une combinaison
         * parfaitement saisissable — et l'orientation commerciale dépendait
         * alors de celui des trois champs qu'on décidait de croire.
         *
         * Le département suffit et ne se contredit pas : la région s'en
         * déduit, côté front pour l'orientation et côté serveur pour le
         * stockage. Voir js/forms/departements.js.
         *
         * Deux champs de moins, aucune étape de moins : cette étape en garde
         * deux, et le parcours ses cinq.
         */
        {
          name: 'departement',
          label: 'Département',
          type: 'text',
          required: true,
          placeholder: '75, 92, 44…',
          pattern: '^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$',
          errorMessage: 'Indiquez un numéro de département valide (ex. 75, 2A, 974).',
          hint: 'La région en est déduite : inutile de la saisir.',
          width: 'half',
        },
        {
          name: 'ville',
          label: 'Ville',
          type: 'text',
          placeholder: 'Facultatif',
          width: 'half',
        },
      ],
    },
    {
      id: 'lieu-type',
      title: 'Quelle pièce et quelle surface ?',
      fields: [
        {
          name: 'logement',
          label: 'Type de bien',
          type: 'radio',
          required: true,
          options: [
            { value: 'appartement', label: 'Appartement' },
            { value: 'maison', label: 'Maison' },
            { value: 'commerce', label: 'Commerce' },
            { value: 'bureaux', label: 'Bureaux' },
            { value: 'autre', label: 'Autre' },
          ],
        },
        {
          name: 'piece',
          label: 'Pièce concernée',
          type: 'radio',
          required: true,
          options: [
            { value: 'sejour', label: 'Séjour' },
            { value: 'chambre', label: 'Chambre' },
            { value: 'cuisine', label: 'Cuisine' },
            { value: 'couloir', label: 'Couloir' },
            { value: 'plusieurs', label: 'Plusieurs pièces' },
            { value: 'autre', label: 'Autre' },
          ],
        },
        {
          name: 'surface',
          label: 'Surface approximative (m²)',
          type: 'number',
          required: true,
          min: 1,
          max: 2000,
          step: 1,
          width: 'half',
          hint: 'Une estimation suffit à ce stade.',
        },
        {
          name: 'support',
          label: 'Support existant',
          type: 'radio',
          required: true,
          options: [
            { value: 'dalle', label: 'Dalle béton' },
            { value: 'chape', label: 'Chape' },
            { value: 'carrelage', label: 'Carrelage' },
            { value: 'parquet', label: 'Ancien parquet' },
            { value: 'autre', label: 'Autre' },
            { value: 'inconnu', label: 'Je ne sais pas' },
          ],
        },
      ],
    },
    {
      id: 'technique',
      title: 'Quel parquet souhaitez-vous ?',
      hint: 'Aucune inquiétude : « je ne sais pas » est une réponse valable.',
      fields: [
        {
          name: 'parquet',
          label: 'Type de parquet envisagé',
          type: 'radio',
          required: true,
          options: [
            { value: 'massif', label: 'Massif' },
            { value: 'contrecolle', label: 'Contrecollé' },
            { value: 'autre', label: 'Autre' },
            { value: 'inconnu', label: 'Je ne sais pas' },
          ],
        },
        {
          name: 'orientation',
          label: 'Motif ou orientation souhaités',
          type: 'radio',
          required: true,
          options: [
            { value: 'longueur', label: 'Dans la longueur' },
            { value: 'largeur', label: 'Dans la largeur' },
            { value: 'diagonale', label: 'Diagonale' },
            { value: 'point-de-hongrie', label: 'Point de Hongrie' },
            { value: 'baton-rompu', label: 'Bâton rompu' },
            { value: 'inconnu', label: 'Je ne sais pas' },
          ],
          hint: 'Le Studio peut vous aider à trancher.',
        },
        {
          name: 'style',
          label: 'Style recherché',
          type: 'select',
          options: [
            { value: '', label: 'Sans préférence' },
            { value: 'clair-scandinave', label: 'Clair et scandinave' },
            { value: 'naturel-chene', label: 'Chêne naturel' },
            { value: 'haussmannien', label: 'Haussmannien / patrimoine' },
            { value: 'contemporain-fume', label: 'Contemporain fumé' },
            { value: 'brut-atelier', label: 'Brut, esprit atelier' },
          ],
        },
      ],
    },
    {
      id: 'delai',
      title: 'De quoi avez-vous besoin, et pour quand ?',
      hint: 'Une estimation suffit : elle nous aide à orienter et à organiser la réponse.',
      fields: [
        /*
         * La question qui décide de l'orientation.
         *
         * Elle a sa place ICI et non dans une sixième étape. Cette étape-ci
         * n'en portait qu'une, le délai : c'était la plus maigre du parcours,
         * et une étape entière pour un seul bouton radio se traverse comme
         * une formalité. Deux questions courtes la remettent au niveau des
         * quatre autres, et le parcours compte toujours cinq étapes.
         *
         * Obligatoire, comme les autres boutons radio du formulaire. C'est un
         * seul geste, et c'est le seul champ dont dépend l'orientation : le
         * déduire du reste donnait une réponse juste environ une fois sur
         * deux — quelqu'un qui a regardé un parquet dans le Visualiseur
         * cherche parfois un poseur, pas une référence.
         *
         * L'ordre des réponses n'est pas neutre : du plus simple au plus
         * large, et « je ne sais pas encore » en dernier pour qu'il soit une
         * sortie et non le premier réflexe.
         */
        {
          name: 'besoin',
          label: 'De quoi avez-vous besoin ?',
          type: 'radio',
          required: true,
          options: [
            { value: 'produit', label: 'Trouver mon parquet' },
            { value: 'pose', label: 'Faire poser mon parquet' },
            { value: 'produit-pose', label: 'Le parquet et la pose' },
            { value: 'renovation', label: 'Rénover ou aménager mon intérieur' },
            { value: 'indetermine', label: 'Je ne sais pas encore' },
          ],
        },
        {
          name: 'delai',
          label: 'Délai envisagé',
          type: 'radio',
          required: true,
          options: [
            { value: 'urgent', label: 'Au plus vite' },
            { value: 'mois', label: 'Moins d’un mois' },
            { value: '1-3-mois', label: '1 à 3 mois' },
            { value: 'plus-tard', label: 'Plus tard' },
            { value: 'renseignement', label: 'Je me renseigne' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: 'Vos coordonnées',
      hint: 'Utilisées uniquement pour répondre à votre demande.',
      fields: [
        { name: 'prenom', label: 'Prénom', type: 'text', required: true, width: 'half', autocomplete: 'given-name' },
        { name: 'nom', label: 'Nom', type: 'text', required: true, width: 'half', autocomplete: 'family-name' },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          width: 'half',
          autocomplete: 'email',
          errorMessage: 'Indiquez une adresse email valide.',
        },
        {
          name: 'telephone',
          label: 'Téléphone',
          type: 'tel',
          required: true,
          width: 'half',
          autocomplete: 'tel',
          pattern: '^(?:\\+33|0)\\s?[1-9](?:[\\s.\\-]?\\d{2}){4}$',
          errorMessage: 'Indiquez un numéro de téléphone français valide.',
        },
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
          placeholder: 'Contraintes, chauffage au sol, état du support, délais…',
        },
        {
          name: 'consentement',
          label: 'J’accepte d’être recontacté au sujet de ce projet.',
          type: 'consent',
          required: true,
        },
      ],
    },
  ],
};

export default projectFormConfig;
