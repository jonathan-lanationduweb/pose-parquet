/**
 * Validation de l'export WordPress, AVANT qu'il ne devienne l'instantané du
 * build (`node _generator/wordpress.js pull`).
 *
 * Deux niveaux :
 *   ERREUR        structurante : l'instantané n'est pas écrit, la commande
 *                 échoue, le site publié ne change pas. Ex. un titre vide, un
 *                 slug invalide, une adresse de lien qui n'est pas http(s),
 *                 un texte plus long que ce que son champ admet.
 *   AVERTISSEMENT la page sait s'en passer : une image manquante (la carte
 *                 s'affiche sans photo), un SEO plus long que conseillé, un
 *                 champ vidé (la valeur par défaut reprend).
 *
 * Les champs structurés (pages, Mon site) sont contrôlés contre le schéma du
 * DÉPÔT (content-pages.js, content-site.js), pas contre celui que WordPress a
 * reçu : c'est le front qui sait ce qu'il peut afficher.
 */
const { PAGES } = require('./content-pages');
const { SITE_CHAMPS } = require('./content-site');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_SURE = /^https?:\/\/[^\s"'<>]+$/i;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;
/* Bornes : celles des champs WordPress (Champs.php) ; conseillées : celles du compteur. */
const SEO = { titre: { max: 160, conseil: 60 }, description: { max: 320, conseil: 160 } };

function validerChamps(lieu, schema, valeurs, erreurs, avertir) {
  if (valeurs == null) return;
  if (typeof valeurs !== 'object' || Array.isArray(valeurs)) {
    erreurs.push(`${lieu} : champs illisibles.`);
    return;
  }
  for (const def of schema) {
    const v = valeurs[def.cle];
    if (v === undefined || v === null) continue;
    const nom = `${lieu} → ${def.libelle}`;
    if (def.type === 'oui-non') {
      if (typeof v !== 'boolean') erreurs.push(`${nom} : oui/non attendu.`);
      continue;
    }
    if (def.type === 'image') {
      if (v !== false && (typeof v !== 'object' || !Number.isInteger(v.id) || !URL_SURE.test(String(v.url || '')))) erreurs.push(`${nom} : image illisible.`);
      continue;
    }
    if (typeof v !== 'string') {
      erreurs.push(`${nom} : texte attendu.`);
      continue;
    }
    if (!v.trim()) {
      avertir(`${nom} : vide, la valeur par défaut est conservée.`);
      continue;
    }
    if (def.max && v.length > def.max) erreurs.push(`${nom} : ${v.length} caractères pour ${def.max} au plus.`);
    if (/<[a-z/!]/i.test(v)) erreurs.push(`${nom} : pas de HTML dans un champ structuré.`);
    if (def.type === 'url' && !URL_SURE.test(v)) erreurs.push(`${nom} : adresse non sûre ou invalide (http/https attendu) : ${v}`);
    if (def.type === 'email' && !EMAIL.test(v)) erreurs.push(`${nom} : adresse email invalide : ${v}`);
    if (def.type === 'lien' && !/\[[^\]]+\]/.test(v)) avertir(`${nom} : aucun [libellé] entre crochets, le lien n'apparaîtra pas.`);
  }
}

function validerSeo(lieu, titre, description, avertir, erreurs) {
  for (const [cle, v] of [['titre', titre], ['description', description]]) {
    const s = String(v || '');
    if (!s.trim()) avertir(`${lieu} : ${cle} SEO vide.`);
    else if (s.length > SEO[cle].max) erreurs.push(`${lieu} : ${cle} SEO de ${s.length} caractères (${SEO[cle].max} au plus).`);
    else if (s.length > SEO[cle].conseil + 10) avertir(`${lieu} : ${cle} SEO de ${s.length} caractères (${SEO[cle].conseil} conseillés).`);
  }
}

function valider(d) {
  const erreurs = [];
  const avertissements = [];
  const avertir = (m) => avertissements.push(m);

  for (const [liste, nom] of [['guides', 'guide'], ['tutoriels', 'tutoriel']]) {
    const vus = new Set();
    for (const a of d[liste] || []) {
      const lieu = `${nom} « ${a.slug || '?'} »`;
      if (!SLUG.test(String(a.slug || ''))) erreurs.push(`${lieu} : slug invalide (minuscules, chiffres et tirets).`);
      if (vus.has(a.slug)) erreurs.push(`${lieu} : slug en double.`);
      vus.add(a.slug);
      if (!String(a.h1 || '').trim()) erreurs.push(`${lieu} : titre requis.`);
      if (!String(a.corps || '').trim()) erreurs.push(`${lieu} : contenu vide.`);
      if (/<script|\son[a-z]+=|javascript:/i.test(String(a.corps || ''))) erreurs.push(`${lieu} : script ou lien javascript dans le contenu.`);
      if (!a.image) avertir(`${lieu} : image manquante (la carte s'affiche sans photo).`);
      validerSeo(lieu, a.titre, a.description, avertir, erreurs);
    }
  }
  for (const i of d.inspirations || []) {
    if (!String(i.titre || '').trim()) erreurs.push(`inspiration « ${i.cle || '?'} » : titre requis.`);
    if (!i.image) avertir(`inspiration « ${i.titre || i.cle} » : sans image, elle ne sera pas publiée.`);
  }
  for (const p of d.pages || []) {
    const page = PAGES[p.cle];
    const lieu = `page « ${p.cle} »`;
    if (!page) continue;
    if (page.h1 !== null && p.h1 !== null && p.h1 !== undefined && !String(p.h1).trim()) avertir(`${lieu} : titre affiché vide, celui du dépôt est conservé.`);
    validerSeo(lieu, p.titre, p.description, avertir, erreurs);
    if (page.champs) validerChamps(lieu, page.champs, p.champs, erreurs, avertir);
  }
  if (d.site) validerChamps('Mon site', SITE_CHAMPS, d.site, erreurs, avertir);
  const m = d.maintenance;
  if (m && m.actif && !String(m.titre || '').trim()) erreurs.push('maintenance active sans titre.');
  return { erreurs, avertissements };
}

module.exports = { valider };
