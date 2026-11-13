export const MOTIFS_CONNUS = ['lames', 'point-de-hongrie', 'baton-rompu'];


export const motifConnu = (motif) => typeof motif === 'string' && MOTIFS_CONNUS.includes(motif);



export function motifsDe(material) {
  const liste = material && material.compatiblePatterns;
  return Array.isArray(liste) ? liste.filter(motifConnu) : [];
}



export function motifAutorise(material, motif) {
  if (!motifConnu(motif)) return false;
  if (!material) return true;
  return motifsDe(material).includes(motif);
}



export function motifParDefaut(material) {
  const disponibles = motifsDe(material);
  if (!disponibles.length) return null;
  const demande = material && material.defaultPattern;
  return disponibles.includes(demande) ? demande : disponibles[0];
}



export function motifEffectif(material, motif) {
  return motifAutorise(material, motif) ? motif : motifParDefaut(material);
}



export function normaliserConfig(config, material) {
  const demande = config && config.pattern;
  const retenu = motifEffectif(material, demande);
  const adapte = Boolean(material) && retenu !== demande;
  return {
    config: adapte ? { ...config, pattern: retenu } : config,
    adapte,
    demande: demande || null,
  };
}



export function raisonIndisponible(material, nomDuMotif) {
  const nom = (material && material.name) || 'ce parquet';
  if (!motifsDe(material).length) {
    return `${nomDuMotif} : ce motif n’est pas disponible pour ${nom}.`;
  }
  return `${nomDuMotif} : non disponible pour ${nom}.`;
}



export function messageAdaptation(material, nomDuMotifRetenu) {


  const seul = motifsDe(material).length === 1;
  const motif = enMinusculeInitiale(nomDuMotifRetenu);
  return seul
    ? `Motif adapté : ce parquet se pose uniquement en ${motif}.`
    : `Motif adapté : passé en ${motif}, l’autre n’existe pas pour ce parquet.`;
}



function enMinusculeInitiale(libelle) {
  const texte = String(libelle || '');
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}
