/**
 * La vitrine de l'accueil : un parquet Premibel réel par motif.
 *
 * Chaque motif a une LISTE de références, par ordre de préférence. On montre
 * la première qui est encore en vente chez Premibel, visualisable, et qui
 * accepte ce motif. Quand Premibel retire une référence, la synchronisation
 * nocturne la désactive et la vitrine passe à la suivante au build suivant —
 * sans retoucher le code. (Le 06/11/2026, « Chêne naturel Houston »,
 * CHENF39031, a ainsi disparu de Premibel.)
 *
 * Module pur, partagé par le navigateur (js/scene/preview.js) et par le
 * générateur (_generator/home.js, légende écrite dans la page) : les deux
 * choisissent donc toujours la même référence.
 */
export const VITRINE = [
  { pattern: 'lames', candidats: ['CHENF39031', 'CHENF36014', 'CHENF36015', 'CHEN29198', 'CHENF39003'] },
  { pattern: 'point-de-hongrie', candidats: ['POINF39026', 'POINF36005', 'POINF39009', 'POIN39262'] },
  { pattern: 'baton-rompu', candidats: ['BTRPF39009', 'BTRPF39001', 'BTRP39001', 'BTRP26000'] },
];

/** Une fiche peut-elle tenir la vitrine pour ce motif ? */
export const convient = (fiche, pattern) =>
  Boolean(
    fiche &&
      fiche.active !== false &&
      fiche.visualStatus !== 'unavailable' &&
      Array.isArray(fiche.compatiblePatterns) &&
      fiche.compatiblePatterns.includes(pattern)
  );

/**
 * Les puces de l'accueil, dans l'ordre : [{ material, pattern }].
 * @param {(id: string) => object|null} ficheDe la fiche Premibel d'une référence
 */
export function choisirVitrine(ficheDe) {
  return VITRINE.map(({ pattern, candidats }) => {
    const id = candidats.find((c) => convient(ficheDe(c), pattern));
    return id ? { material: id, pattern } : null;
  }).filter(Boolean);
}
