/**
 * Références citées en bas d'article.
 *
 * Règle : uniquement des sources réelles, vérifiables, et décrites pour ce
 * qu'elles sont. Les normes NF DTU sont des documents payants édités par
 * AFNOR : on renvoie vers la recherche de la boutique AFNOR, qui reste
 * valable dans le temps, plutôt que vers une URL de fiche produit susceptible
 * de changer. Aucune source n'est inventée, aucune citation n'est reconstituée.
 */
const afnor = (query) =>
  `https://www.boutique.afnor.org/fr-fr/recherche/resultat?q=${encodeURIComponent(query)}`;

const REFERENCES = {
  'dtu-51-1': {
    label: 'NF DTU 51.1 — Travaux de pose des parquets massifs à clouer',
    note: 'Norme française de mise en œuvre, éditée par AFNOR (document payant).',
    url: afnor('NF DTU 51.1'),
  },
  'dtu-51-2': {
    label: 'NF DTU 51.2 — Parquets collés',
    note: 'Conditions de mise en œuvre des parquets collés, dont les exigences relatives au support.',
    url: afnor('NF DTU 51.2'),
  },
  'dtu-51-11': {
    label: 'NF DTU 51.11 — Pose flottante des parquets et revêtements de sol contrecollés',
    note: 'Référence pour la pose flottante : support, sous-couche, joints périphériques.',
    url: afnor('NF DTU 51.11'),
  },
  cstb: {
    label: 'CSTB — Centre scientifique et technique du bâtiment',
    note: 'Organisme public de recherche et d’évaluation technique dans le bâtiment.',
    url: 'https://www.cstb.fr/',
  },
  fcba: {
    label: 'Institut technologique FCBA',
    note: 'Centre technique de la filière forêt, bois, construction et ameublement.',
    url: 'https://www.fcba.fr/',
  },
  'france-bois-foret': {
    label: 'France Bois Forêt',
    note: 'Interprofession nationale de la filière forêt-bois.',
    url: 'https://www.franceboisforet.fr/',
  },
};

/** Jeu de références par défaut, selon la rubrique de l'article. */
const BY_CATEGORY = {
  'Sens de pose': ['dtu-51-1', 'dtu-51-2', 'cstb'],
  Préparation: ['dtu-51-2', 'dtu-51-11', 'cstb'],
  Motifs: ['dtu-51-1', 'dtu-51-2'],
  Comprendre: ['fcba', 'france-bois-foret', 'dtu-51-11'],
  Finition: ['fcba', 'dtu-51-2'],
};

/** @returns {{label:string, note:string, url:string}[]} */
function resolveSources(item) {
  const keys = item.sources || BY_CATEGORY[item.category] || [];
  return keys.map((key) => REFERENCES[key]).filter(Boolean);
}

module.exports = { REFERENCES, resolveSources };
