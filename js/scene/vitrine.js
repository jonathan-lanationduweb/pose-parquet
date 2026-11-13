export const VITRINE = [
  { pattern: 'lames', candidats: ['CHENF39031', 'CHENF36014', 'CHENF36015', 'CHEN29198', 'CHENF39003'] },
  { pattern: 'point-de-hongrie', candidats: ['POINF39026', 'POINF36005', 'POINF39009', 'POIN39262'] },
  { pattern: 'baton-rompu', candidats: ['BTRPF39009', 'BTRPF39001', 'BTRP39001', 'BTRP26000'] },
];


export const convient = (fiche, pattern) =>
  Boolean(
    fiche &&
      fiche.active !== false &&
      fiche.visualStatus !== 'unavailable' &&
      Array.isArray(fiche.compatiblePatterns) &&
      fiche.compatiblePatterns.includes(pattern)
  );



export function choisirVitrine(ficheDe) {
  return VITRINE.map(({ pattern, candidats }) => {
    const id = candidats.find((c) => convient(ficheDe(c), pattern));
    return id ? { material: id, pattern } : null;
  }).filter(Boolean);
}
