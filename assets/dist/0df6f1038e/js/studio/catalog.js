import { buildSwatch } from '../scene/texture.js';
import { lireJson } from '../scene/product.js';
import { createMaterial } from '../scene/material.js';
import { loadProducts, toMaterial } from '../scene/product.js';
import { echapper } from '../utils/dom.js';
import { avertir } from '../utils/diagnostic.js';
import { suivreClic } from '../commerce/premibel.js';



export async function loadCatalog(base = '') {
  const { products, rejected, families, source } = await loadProducts(base);
  if (!products.length) throw new Error('Catalogue indisponible');



  const meta = await lireJson(`${base}data/parquets.json`).catch(() => ({}));

  const parquets = products.map((fiche) => createMaterial(toMaterial(fiche)));
  const byId = new Map(parquets.map((item) => [item.id, item]));

  const incomplets = products.filter((f) => f.warnings.length);
  if (incomplets.length) {


    avertir(
      '[catalogue] fiches incomplètes :',
      incomplets.map((f) => `${f.id} (${f.warnings.join(', ')})`).join(' · ')
    );
  }



  const references = rejected
    .filter((f) => f.active && f.source === 'premibel' && f.productUrl)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return { ...meta, base, parquets, byId, get: (id) => byId.get(id), products, rejected, references, families, source };
}


const swatches = new Map();
export function swatchFor(material, options) {
  if (!swatches.has(material.id)) swatches.set(material.id, buildSwatch(material, options));
  return swatches.get(material.id);
}



export function createCatalog(host, catalog, { onSelect, onVisible }) {
  const base = catalog.base || '';
  const LIB_MOTIF = { lames: 'Lames droites', 'point-de-hongrie': 'Point de Hongrie', 'baton-rompu': 'Bâton rompu' };
  const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const largeurClasse = (w) => (!w ? null : w < 100 ? 'etroite' : w <= 160 ? 'moyenne' : 'large');
  const LIB_LARGEUR = { etroite: 'Étroite (< 10 cm)', moyenne: 'Moyenne (10 à 16 cm)', large: 'Large (> 16 cm)' };


  const entree = (fiche, material) => {
    const statut = material
      ? (fiche.source === 'premibel' ? (fiche.visualStatus === 'ready' ? 'ready' : 'approximate') : 'demo')
      : 'unavailable';
    const w = fiche.dimensions && fiche.dimensions.widthMm;
    const motifs = (material ? material.compatiblePatterns : fiche.compatiblePatterns) || [];
    return {
      id: fiche.id,
      material,
      fiche,
      statut,
      nom: (material && material.name) || fiche.name,
      essence: fiche.woodSpecies || (material && material.wood) || null,
      finition: fiche.finish || null,
      largeur: w || null,
      motifs,
      teinte: (material && material.tone) || fiche.tone || null,
      vignette: statut !== 'demo' && fiche.visual && fiche.visual.thumbnail ? `${base}${fiche.visual.thumbnail}` : null,
      url: fiche.productUrl || null,
      ordre: Number.isFinite(fiche.displayOrder) ? fiche.displayOrder : 1000,
    };
  };


  const entrees = [
    ...catalog.parquets.filter((m) => m.product && m.product.source === 'premibel').map((m) => entree(m.product, m)),
    ...(catalog.references || []).map((f) => entree(f, null)),
  ];
  entrees.forEach((e) => {
    e.texte = sansAccent([e.nom, e.fiche.sku, e.essence, e.finition, e.fiche.surfaceTreatment, ...e.motifs.map((m) => LIB_MOTIF[m])].filter(Boolean).join(' '));
  });
  const nbVisualisables = entrees.filter((e) => e.statut !== 'unavailable').length;
  const nbAutres = entrees.length - nbVisualisables;
  const nbFideles = entrees.filter((e) => e.statut === 'ready').length;

  const wrap = document.createElement('div');
  wrap.className = 'cat';
  wrap.innerHTML = `
    <div class="cat__head">
      <p class="cat__count" data-count aria-live="polite"></p>
      <label class="cat__search">
        <span class="visually-hidden">Rechercher un parquet</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Nom, référence, essence…" data-search />
      </label>
      <div class="cat__views" role="group" aria-label="Afficher">
        <button type="button" class="cat__view" data-vue="tous" aria-pressed="true">Tous <span>${entrees.length}</span></button>
        <button type="button" class="cat__view" data-vue="visualisables" aria-pressed="false">Visualisables <span>${nbVisualisables}</span></button>
        ${nbAutres ? `<button type="button" class="cat__view" data-vue="autres" aria-pressed="false">Autres parquets <span>${nbAutres}</span></button>` : ''}
      </div>
      <div class="cat__tools">
        <button type="button" class="cat__toggle" data-toggle aria-expanded="false" aria-controls="cat-filtres">Filtres <span data-actifs></span></button>
        <label class="cat__sort"><span class="visually-hidden">Trier</span>
          <select data-tri>
            <option value="pertinence">Pertinence</option>
            <option value="nom">A–Z</option>
            <option value="largeur">Largeur</option>
          </select>
        </label>
      </div>
      <div class="cat__panel" id="cat-filtres" data-panel hidden>
        <div class="cat__filters" role="group" aria-label="Teinte" data-filters></div>
        <div class="cat__selects" data-selects></div>
        <button type="button" class="cat__reset" data-reset hidden>Effacer les filtres</button>
      </div>
    </div>
    <div class="cat__grid" data-grid></div>
    <p class="cat__empty" data-empty hidden>Aucun parquet ne correspond.</p>`;

  const grid = wrap.querySelector('[data-grid]');
  const search = wrap.querySelector('[data-search]');
  const empty = wrap.querySelector('[data-empty]');
  const countEl = wrap.querySelector('[data-count]');
  const panel = wrap.querySelector('[data-panel]');
  const toggle = wrap.querySelector('[data-toggle]');
  const actifsEl = wrap.querySelector('[data-actifs]');
  const reset = wrap.querySelector('[data-reset]');
  const filtersEl = wrap.querySelector('[data-filters]');
  const selects = wrap.querySelector('[data-selects]');
  const tri = wrap.querySelector('[data-tri]');

  const etat = { vue: 'tous', texte: '', teinte: 'all', essence: 'all', motif: 'all', finition: 'all', largeur: 'all', tri: 'pertinence' };


  [{ id: 'all', label: 'Toutes' }, ...(catalog.tones || [])].forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat__filter';
    b.dataset.tone = item.id;
    b.setAttribute('aria-pressed', String(item.id === 'all'));
    b.textContent = item.label;
    b.addEventListener('click', () => {
      etat.teinte = item.id;
      filtersEl.querySelectorAll('[data-tone]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.tone === etat.teinte)));
      apply();
    });
    filtersEl.appendChild(b);
  });



  const DIMENSIONS = [
    { cle: 'essence', label: 'Essence', valeurs: (e) => (e.essence ? [e.essence] : []), libelle: (v) => v },
    { cle: 'motif', label: 'Motif', valeurs: (e) => e.motifs, libelle: (v) => LIB_MOTIF[v] || v },
    { cle: 'finition', label: 'Finition', valeurs: (e) => (e.finition ? [e.finition] : []), libelle: (v) => v },
    { cle: 'largeur', label: 'Largeur', valeurs: (e) => (largeurClasse(e.largeur) ? [largeurClasse(e.largeur)] : []), libelle: (v) => LIB_LARGEUR[v] },
  ];
  const ordreLargeur = { etroite: 0, moyenne: 1, large: 2 };
  DIMENSIONS.forEach((d) => {
    const renseignes = entrees.filter((e) => d.valeurs(e).length).length;
    const compte = new Map();
    entrees.forEach((e) => d.valeurs(e).forEach((v) => compte.set(v, (compte.get(v) || 0) + 1)));
    if (renseignes / entrees.length < 0.7 || compte.size < 2) return;
    const valeurs = [...compte.keys()].sort((a, b) => (ordreLargeur[a] ?? 9) - (ordreLargeur[b] ?? 9) || compte.get(b) - compte.get(a));
    const label = document.createElement('label');
    label.className = 'cat__select';
    label.innerHTML = `<span class="visually-hidden">${d.label}</span>
      <select data-dim="${d.cle}"><option value="all">${d.label} : tous</option>${valeurs
        .map((v) => `<option value="${echapper(v)}">${echapper(d.libelle(v))} (${compte.get(v)})</option>`).join('')}</select>`;
    label.querySelector('select').addEventListener('change', (ev) => { etat[d.cle] = ev.target.value; apply(); });
    selects.appendChild(label);
  });



  const ouvrir = (oui) => { panel.hidden = !oui; toggle.setAttribute('aria-expanded', String(oui)); };
  ouvrir(false);
  toggle.addEventListener('click', () => ouvrir(panel.hidden));
  reset.addEventListener('click', () => {
    Object.assign(etat, { teinte: 'all', essence: 'all', motif: 'all', finition: 'all', largeur: 'all' });
    filtersEl.querySelectorAll('[data-tone]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.tone === 'all')));
    selects.querySelectorAll('select').forEach((s) => { s.value = 'all'; });
    apply();
  });
  wrap.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => {
    etat.vue = b.dataset.vue;
    wrap.querySelectorAll('[data-vue]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  tri.addEventListener('change', () => { etat.tri = tri.value; ordonner(); apply(); });
  search.addEventListener('input', () => { etat.texte = search.value; apply(); });


  const BADGES = {
    approximate: ['approx', 'Rendu indicatif'],
    ready: ['ready', 'Rendu fidèle'],
    unavailable: ['none', 'Visualisation non disponible'],
    demo: ['demo', 'Démonstration'],
  };


  const repli = (e) => {
    const initiales = (e.essence || e.nom || '?').split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
    const motif = e.motifs.length === 1 ? LIB_MOTIF[e.motifs[0]] : '';
    return `<span class="cat__nophoto" data-teinte="${echapper(e.teinte || '')}" aria-hidden="true">
        <span class="cat__nophoto-init">${echapper(initiales)}</span>
        <span class="cat__nophoto-txt">${echapper([e.essence, motif].filter(Boolean).join(' · '))}</span>
        <span class="cat__nophoto-note">Photo non disponible</span>
      </span>`;
  };
  const resume = (e) => [e.essence, e.finition, e.largeur ? `${e.largeur} mm` : null, e.motifs.length === 1 ? LIB_MOTIF[e.motifs[0]] : null]
    .filter(Boolean).join(' · ');

  function carte(e) {
    const [cls, badge] = BADGES[e.statut];
    const media = e.vignette
      ? `<img class="cat__photo" data-src="${echapper(e.vignette)}" alt="" width="324" height="324" decoding="async" />`
      : e.statut === 'demo' ? '' : repli(e);
    const corps = `
      <span class="cat__media">${media}<span class="cat__badge cat__badge--${cls}">${badge}</span></span>
      <span class="cat__label">${echapper(e.nom)}</span>
      <span class="cat__meta">${echapper(resume(e))}</span>`;
    let el;
    if (e.material) {
      el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-pressed', 'false');
      el.setAttribute('aria-label', `${e.nom} — visualiser${e.statut === 'approximate' ? ', rendu indicatif' : ''}`);
      el.innerHTML = `${corps}<span class="cat__cta">Visualiser</span>`;
      el.addEventListener('click', () => onSelect(e.material));
      el.dataset.material = e.material.id;
    } else {
      el = document.createElement('a');
      el.href = e.url;
      el.target = '_blank';
      el.rel = 'noopener';
      el.innerHTML = `${corps}<span class="cat__cta cat__cta--out">Voir la fiche chez Premibel<span class="visually-hidden"> (nouvel onglet)</span></span>`;
      el.addEventListener('click', () => suivreClic(e.fiche, 'studio-catalogue'));
    }
    el.className = `cat__card cat__card--${e.statut}${e.vignette || e.statut !== 'demo' ? ' cat__card--photo' : ''}`;
    el.dataset.id = e.id;
    e.el = el;
    return el;
  }


  function paintSwatch(e) {
    const slot = e.el.querySelector('.cat__media');
    const swatch = swatchFor(e.material);
    const canvas = document.createElement('canvas');
    canvas.width = swatch.width;
    canvas.height = swatch.height;
    canvas.className = 'cat__swatch';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.getContext('2d').drawImage(swatch, 0, 0);
    slot.prepend(canvas);
    if (onVisible) onVisible(e.material);
  }
  const file = [];
  let planifie = false;
  function vider() {
    planifie = false;
    const e = file.shift();
    if (e && !e.el.hidden && !e.pret) { e.pret = true; paintSwatch(e); } else if (e && !e.pret && observer) observer.observe(e.el);
    if (file.length) { planifie = true; requestAnimationFrame(() => setTimeout(vider, 0)); }
  }
  function charger(e) {
    if (e.pret) return;
    if (e.vignette) {

      const img = e.el.querySelector('img[data-src]');
      if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
      img && img.addEventListener('error', () => { img.insertAdjacentHTML('afterend', repli(e)); img.remove(); }, { once: true });
      e.pret = true;
    } else if (e.statut === 'demo' && !file.includes(e)) {

      file.push(e);
      if (!planifie) { planifie = true; requestAnimationFrame(() => setTimeout(vider, 0)); }
    }
  }
  const parElement = new Map();
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((vus) => vus.forEach((v) => {
      if (!v.isIntersecting) return;
      observer.unobserve(v.target);
      charger(parElement.get(v.target));
    }), { root: null, rootMargin: '300px' })
    : null;

  entrees.forEach((e) => { const el = carte(e); parElement.set(el, e); if (observer) observer.observe(el); });


  const rang = { ready: 0, approximate: 1, demo: 2, unavailable: 3 };
  function ordonner() {
    const cmpNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
    const tris = {
      pertinence: (a, b) => rang[a.statut] - rang[b.statut] || a.ordre - b.ordre || cmpNom(a, b),
      nom: cmpNom,
      largeur: (a, b) => (a.largeur ?? 1e9) - (b.largeur ?? 1e9) || cmpNom(a, b),
    };
    const frag = document.createDocumentFragment();
    [...entrees].sort(tris[etat.tri]).forEach((e) => frag.appendChild(e.el));
    grid.appendChild(frag);
  }

  function apply() {
    const aiguille = sansAccent(etat.texte.trim());
    let visibles = 0;
    for (const e of entrees) {
      const ok =
        (etat.vue === 'tous' || (etat.vue === 'visualisables') === (e.statut !== 'unavailable')) &&
        (!aiguille || e.texte.includes(aiguille)) &&
        (etat.teinte === 'all' || e.teinte === etat.teinte) &&
        (etat.essence === 'all' || e.essence === etat.essence) &&
        (etat.motif === 'all' || e.motifs.includes(etat.motif)) &&
        (etat.finition === 'all' || e.finition === etat.finition) &&
        (etat.largeur === 'all' || largeurClasse(e.largeur) === etat.largeur);
      e.el.hidden = !ok;
      if (ok) visibles += 1;

      if (ok && !e.pret && observer) observer.observe(e.el);
    }
    const nbFiltres = ['teinte', 'essence', 'motif', 'finition', 'largeur'].filter((k) => etat[k] !== 'all').length;
    actifsEl.textContent = nbFiltres ? `(${nbFiltres})` : '';
    reset.hidden = nbFiltres === 0;
    empty.hidden = visibles > 0;
    const filtre = nbFiltres || aiguille || etat.vue !== 'tous';
    countEl.textContent = filtre
      ? `${visibles} résultat${visibles > 1 ? 's' : ''} sur ${entrees.length} parquets Premibel`
      : `${entrees.length} parquets Premibel · ${nbVisualisables} visualisables${nbFideles ? `, dont ${nbFideles} en rendu fidèle` : ', en rendu indicatif'}`;
  }

  ordonner();
  host.appendChild(wrap);
  apply();


  window.setTimeout(() => {
    entrees.filter((e) => !e.el.hidden).slice(0, 12).forEach(charger);
  }, 900);

  const cartesVisualisables = entrees.filter((e) => e.material);
  return {
    element: wrap,
    setActive(id) {
      cartesVisualisables.forEach((e) => e.el.setAttribute('aria-pressed', String(e.material.id === id)));
    },

    neighbours(id) {
      const index = catalog.parquets.findIndex((item) => item.id === id);
      return [catalog.parquets[index + 1], catalog.parquets[index - 1]].filter(Boolean);
    },
  };
}
