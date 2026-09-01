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
        {
          name: 'zone',
          label: 'Zone',
          type: 'radio',
          required: true,
          options: [
            { value: 'idf', label: 'Île-de-France' },
            { value: 'autre', label: 'Autre région' },
          ],
        },
        {
          name: 'region',
          label: 'Région',
          type: 'select',
          required: true,
          visibleIf: { field: 'zone', equals: 'autre' },
          options: [
            'Auvergne-Rhône-Alpes',
            'Bourgogne-Franche-Comté',
            'Bretagne',
            'Centre-Val de Loire',
            'Corse',
            'Grand Est',
            'Hauts-de-France',
            'Normandie',
            'Nouvelle-Aquitaine',
            'Occitanie',
            'Pays de la Loire',
            "Provence-Alpes-Côte d'Azur",
            'Outre-mer',
          ].map((label) => ({ value: label, label })),
        },
        {
          name: 'departement',
          label: 'Département',
          type: 'text',
          required: true,
          placeholder: '75, 92, 44…',
          pattern: '^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$',
          errorMessage: 'Indiquez un numéro de département valide (ex. 75, 2A, 974).',
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
      title: 'Quand souhaitez-vous réaliser ce projet ?',
      hint: 'Une estimation suffit : elle nous aide à organiser la réponse.',
      fields: [
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
