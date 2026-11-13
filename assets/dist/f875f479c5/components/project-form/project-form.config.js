export const projectFormConfig = {
  id: 'projet',
  title: 'Décrire mon projet',


  submitLabel: 'Voir comment avancer',
  steps: [
    {
      id: 'lieu',
      title: 'Où se situe le projet ?',
      hint: 'Le département suffit : il dit qui peut intervenir.',
      fields: [


        {
          name: 'departement',
          label: 'Département',
          type: 'text',
          required: true,
          placeholder: '75, 92, 44…',
          pattern: '^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$',
          errorMessage: 'Indiquez un numéro de département valide (ex. 75, 2A, 974).',
          hint: 'La région en est déduite : l’orientation dépend de la zone (Île-de-France ou non).',
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
      hint: 'Une estimation suffit : elle sert à vous orienter vers la bonne entreprise.',
      fields: [


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


  ],
};

export default projectFormConfig;
