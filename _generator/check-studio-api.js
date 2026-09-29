/**
 * Contrôle : le contrat de pilotage `window.__studio` (apiVersion 1).
 *
 * Ce point d'accroche est le seul lien entre le Visualiseur et l'outil
 * d'analyse de photo qui vit dans un autre dépôt. Un membre renommé ou une
 * validation relâchée ne casse rien ici — ça casse là-bas, silencieusement.
 * D'où ce contrôle, qui vérifie deux choses de nature différente :
 *
 *   node _generator/check-studio-api.js
 *       la FORME, en lisant `js/studio/app.js` : membres présents, membres
 *       volontairement absents, maintien derrière `?perf=1`, endroit exact où
 *       le rendu terminé est signalé, et concordance de la copie publiée
 *       (`assets/dist/<empreinte>/`) avec la source.
 *
 *   node _generator/check-studio-api.js --script
 *       imprime le COMPORTEMENT à vérifier dans un navigateur : le code à
 *       coller dans la console d'un studio chargé avec `?perf=1`. Validation
 *       des largeurs, capacités, abonnement au rendu — tout ce qu'une lecture
 *       de source ne peut pas prouver.
 *
 * Le contrôle statique seul ne dirait rien de l'exécution ; le dynamique seul
 * ne verrait ni un setter ajouté par mégarde, ni le garde-fou `perfActif`
 * retiré, ni une copie publiée restée en arrière. Les deux, donc.
 *
 * Ce fichier vit dans `_generator/` et non dans `js/` : la chaîne d'assets
 * recopie TOUT `js/**.js` dans le bundle publié (voir assets.js). Un fichier
 * de test placé là serait servi en production.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* Comportement — à exécuter dans un studio chargé                    */
/* ------------------------------------------------------------------ */

/**
 * Éprouve le contrat sur un studio vivant.
 *
 * Écrit comme une fonction autonome — aucune dépendance, aucune fermeture sur
 * ce module — pour pouvoir être sérialisée et injectée dans une page.
 *
 * @param {object} studio l'objet `window.__studio`
 * @returns {{ok: boolean, resultats: Array<{nom: string, ok: boolean, detail: string}>}}
 */
function verifierApi(studio) {
  const resultats = [];
  const ok = (nom, condition, detail = '') =>
    resultats.push({ nom, ok: !!condition, detail: String(detail) });

  if (!studio) {
    ok('le studio est joignable', false, 'window.__studio absent — ?perf=1 manquant ?');
    return { ok: false, resultats };
  }

  /* --- version --- */
  ok('apiVersion vaut 1', studio.apiVersion === 1, studio.apiVersion);

  /* --- capacités --- */
  const caps = typeof studio.getCapabilities === 'function' ? studio.getCapabilities() : null;
  ok('getCapabilities répond', !!caps);
  if (caps) {
    const attendus = [
      ['pattern', true], ['width', true], ['orientation', true],
      /* `scale` est faux parce qu'aucun setter n'existe : la capacité est
         déduite, pas déclarée. Ajouter `setScale` la rendrait vraie sans
         toucher à cette liste — et ce test verrait le changement. */
      ['scale', false],
      /* Cuites dans la famille de texture : aucun réglage ne les change. */
      ['finish', false], ['grain', false], ['joints', false],
    ];
    for (const [clef, attendu] of attendus) {
      ok(`capacité ${clef} = ${attendu}`, caps[clef] === attendu, caps[clef]);
    }
  }
  ok('aucun setter d échelle, puisque personne ne l utilise',
    typeof studio.setScale === 'undefined');

  /* --- largeur : valeurs acceptées --- */
  const largeurAvant = studio.config.width;
  ok('setWidth accepte une largeur plausible',
    studio.setWidth(0.19) === true && studio.config.width === 0.19, studio.config.width);
  ok('setWidth(null) rend la main au motif',
    studio.setWidth(null) === true && studio.config.width === null, studio.config.width);
  ok('les bornes sont inclusives',
    studio.setWidth(0.02) === true && studio.setWidth(0.5) === true);

  /* --- largeur : valeurs refusées ---
     Un refus doit être total : renvoyer `false` ET ne rien écrire. Une valeur
     aberrante qui passerait quand même casserait le rendu sans que l'appelant
     l'apprenne jamais. */
  studio.setWidth(0.19);
  for (const mauvaise of [NaN, 0, -1, 5, Infinity, '0.19', undefined, {}]) {
    const refus = studio.setWidth(mauvaise);
    ok(`setWidth refuse ${String(mauvaise)}`,
      refus === false && studio.config.width === 0.19,
      `retour ${refus}, largeur ${studio.config.width}`);
  }

  /* --- abonnement au rendu ---
     Trois abonnés, pour éprouver ce qui compte vraiment : que le
     désabonnement fonctionne, qu'un abonné n'écrase pas l'autre, et qu'un
     abonné qui lève une exception ne prive pas les suivants de leur appel.
     Sans désabonnement, le pont laisserait un écouteur fantôme à chaque
     changement de pièce, reconnexion ou comparaison. */
  const compte = { garde: 0, retire: 0, casse: 0 };
  const desabonner = studio.onRendered(() => { compte.garde += 1; });
  const desabonnerCasse = studio.onRendered(() => {
    compte.casse += 1;
    throw new Error('exprès : cet abonné casse');
  });
  const desabonnerRetire = studio.onRendered(() => { compte.retire += 1; });
  ok('onRendered rend un désabonnement', typeof desabonner === 'function'
    && typeof desabonnerCasse === 'function' && typeof desabonnerRetire === 'function');
  ok('onRendered ignore ce qui n est pas une fonction',
    typeof studio.onRendered('nope') === 'function');
  /* Désabonner deux fois ne doit pas jeter : le pont le fait dans un `finally`
     qu'un chemin d'erreur peut traverser deux fois. */
  let doubleRetraitOk = true;
  try { const o = studio.onRendered(() => {}); o(); o(); } catch { doubleRetraitOk = false; }
  ok('un désabonnement peut être appelé deux fois sans erreur', doubleRetraitOk);

  /* --- pas de régression sur ce qui existait avant --- */
  for (const membre of ['selectMaterial', 'setPattern', 'setAngle', 'openRoom', 'setContext']) {
    ok(`${membre} est toujours là`, typeof studio[membre] === 'function');
  }
  ok('le canevas est toujours là', !!studio.canvas);
  ok('le renderer est toujours là', !!studio.renderer);
  ok('le catalogue est toujours là', !!studio.catalog);

  studio.setWidth(largeurAvant === undefined ? null : largeurAvant);

  return {
    ok: resultats.every((r) => r.ok),
    resultats,
    /**
     * Éprouve les abonnements sur deux rendus successifs.
     *
     * Deux rendus, parce qu'un seul ne prouverait que la moitié : le premier
     * montre que les abonnés sont prévenus, le second — après retrait de l'un
     * d'eux — montre que le retrait est réel. Un `onRendered` sans
     * désabonnement effectif laisse un écouteur fantôme par changement de
     * pièce, et personne ne s'en aperçoit avant que ça compte.
     *
     * On attend le signal lui-même, jamais un délai fixe : la tuile de texture
     * se refabrique dans un worker, et trois secondes de retard sont normales
     * à froid.
     *
     * @param {number} msMax échéance par rendu
     */
    eprouverAbonnements: async (msMax = 20000) => {
      const rendu = () => new Promise((resolve) => {
        let fini = false;
        const fin = (obtenu) => {
          if (fini) return; fini = true;
          clearTimeout(echeance); guetteur(); resolve(obtenu);
        };
        const echeance = setTimeout(() => fin(false), msMax);
        const guetteur = studio.onRendered(() => fin(true));
        /* Une largeur différente de la courante, sinon le moteur peut
           n'avoir rien à repeindre. */
        studio.setWidth(studio.config.width === 0.16 ? 0.13 : 0.16);
      });

      const r = [];
      const premier = await rendu();
      const apres1 = { ...compte };
      r.push({ nom: 'un rendu prévient les abonnés', ok: premier && apres1.garde > 0,
        detail: `garde ${apres1.garde}, retiré ${apres1.retire}, cassé ${apres1.casse}` });
      r.push({ nom: 'plusieurs abonnés sont tous prévenus',
        ok: apres1.garde > 0 && apres1.retire > 0 && apres1.casse > 0,
        detail: `${apres1.garde}/${apres1.retire}/${apres1.casse}` });
      r.push({ nom: 'un abonné qui lève une exception ne prive pas les autres',
        ok: apres1.casse > 0 && apres1.retire > 0,
        detail: `l abonné cassé a été appelé ${apres1.casse} fois, le suivant ${apres1.retire}` });

      desabonnerRetire();
      const second = await rendu();
      const apres2 = { ...compte };
      r.push({ nom: 'un abonné retiré n est plus appelé',
        ok: second && apres2.retire === apres1.retire,
        detail: `${apres1.retire} avant, ${apres2.retire} après` });
      r.push({ nom: 'les abonnés restants le sont toujours',
        ok: apres2.garde > apres1.garde,
        detail: `${apres1.garde} puis ${apres2.garde}` });

      desabonner(); desabonnerCasse();
      const troisieme = await rendu();
      const apres3 = { ...compte };
      r.push({ nom: 'tout retirer laisse le rendu fonctionner',
        ok: troisieme && apres3.garde === apres2.garde && apres3.casse === apres2.casse,
        detail: `garde ${apres3.garde}, cassé ${apres3.casse}` });
      return r;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Forme — en lisant la source et la copie publiée                    */
/* ------------------------------------------------------------------ */

function controlerSource() {
  const src = fs.readFileSync(path.join(RACINE, 'js', 'studio', 'app.js'), 'utf8');

  let echecs = 0;
  const ok = (nom, condition, detail = '') => {
    if (!condition) echecs += 1;
    console.log(`  ${condition ? 'OK  ' : 'KO  '} ${nom}${detail ? ` — ${detail}` : ''}`);
  };

  /* Le contrat reste un outil de mesure, pas une API publique du site. */
  const affectations = src.match(/window\.__studio\s*=/g) || [];
  ok('une seule affectation de window.__studio', affectations.length === 1, affectations.length);
  const debut = src.indexOf('if (perfActif) {');
  const bloc = src.slice(debut, src.indexOf('window.__studio = api;'));
  ok('elle reste enfermée dans if (perfActif)', debut > 0 && bloc.length > 0);

  ok('apiVersion est déclarée', /apiVersion:\s*1,/.test(bloc));
  ok('setWidth existe', /setWidth:\s*\(metres\)\s*=>/.test(bloc));
  ok('getCapabilities existe', /getCapabilities:\s*\(\)\s*=>/.test(bloc));
  ok('onRendered existe', /onRendered:\s*\(cb\)\s*=>/.test(bloc));

  /* Aucun setter gratuit : la seule mention de `setScale` autorisée est la
     sonde de capacité, qui constate justement son absence. */
  const mentions = (src.match(/setScale/g) || []).length;
  ok('aucun setter d échelle n a été ajouté', mentions === 1, `${mentions} mention(s)`);

  /* Les capacités sont déduites des commandes présentes, jamais écrites en
     dur : un setter oublié laisse sa capacité fausse au lieu de mentir. */
  ok('les capacités pilotables sont déduites',
    (bloc.match(/typeof api\.set\w+ === 'function'/g) || []).length >= 4);

  /* Les deux moitiés du point d'accroche sont nommées : ce sur quoi un
     appelant externe peut s'appuyer, et ce qui n'est là que pour lire un état
     pendant une mesure. Sans cette distinction écrite, `renderer` et `config`
     finissent par être traités comme des promesses. */
  ok('le contrat et le diagnostic sont distingués',
    /CONTRAT DE PILOTAGE/.test(bloc) && /DONNEES DE DIAGNOSTIC/.test(bloc));
  /* On regarde les DEFINITIONS, pas l'en-tete qui les enumere : sans quoi le
     controle se contenterait de relire le commentaire qu'il est censé
     verifier. */
  const definitions = bloc.slice(bloc.indexOf('const api = {'));
  for (const [membre, jeton] of [['config', 'get config()'], ['setContext', 'setContext,'],
    ['renderer', 'get renderer()'], ['catalog', 'catalog,']]) {
    const i = definitions.indexOf(jeton);
    const avant = i < 0 ? '' : definitions.slice(Math.max(0, i - 260), i);
    ok(`${membre} est marqué hors contrat`, i > 0 && /hors contrat/.test(avant));
  }

  /* Rien n a disparu du point d accroche qui existait avant. */
  for (const membre of ['get config()', 'selectMaterial,', 'setPattern:', 'setAngle:',
    'openRoom,', 'setContext,', 'canvas,', 'get renderer()', 'catalog,']) {
    ok(`${membre.trim()} conservé`, bloc.includes(membre));
  }

  /* setWidth doit emprunter le chemin de rendu normal, celui du curseur du
     tiroir « Avancé » — pas peindre lui-même. */
  const corps = bloc.slice(bloc.indexOf('setWidth:'), bloc.indexOf('getCapabilities:'));
  ok('setWidth demande un rendu au lieu de peindre lui-même',
    /demandeRendu\(true\)/.test(corps) && !/renderer\.paint/.test(corps));
  ok('setWidth valide avant d écrire',
    corps.indexOf('return false') < corps.indexOf('config = {'));

  /* Le signal ne doit partir que sur un rendu RÉUSSI : après le repère de
     fin, donc après les sorties anticipées de `paint()`. Signalé trop tôt, il
     annoncerait comme fini un rendu que le worker n a pas encore fourni. */
  const iPaint = src.indexOf('function paint() {');
  const paint = src.slice(iPaint, iPaint + 2000);
  ok('le rendu terminé est signalé', /apresRendu\.forEach/.test(paint));
  ok('il part après le repère de fin, pas avant',
    paint.indexOf("mark('app:paint:fin')") < paint.indexOf('apresRendu.forEach'));
  ok('les sorties anticipées passent avant le signal',
    paint.indexOf('renderer.enAttente') < paint.indexOf('apresRendu.forEach'));
  ok('un abonné qui casse n arrête pas le rendu',
    /apresRendu\.forEach\(\(cb\) => \{ try \{/.test(paint));

  /* Personne d autre dans le front ne dépend du point d accroche : le faire
     évoluer ne peut donc pas casser une page publique.

     DEPENDRE, PAS MENTIONNER. Ce contrôle cherchait la chaîne dans le fichier
     entier, commentaires compris : expliquer pourquoi `__studio` existe
     suffisait à le faire échouer. Un contrôle qui punit la documentation
     finit par obtenir du code non documenté, ce qui n est pas le but. On
     retire donc les commentaires avant de chercher — le même durcissement
     que pour « un seul appel à wp_mail » côté backend. */
  const sansCommentaires = (code) =>
    code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

  const dependants = [];
  for (const d of ['js', 'js/studio', 'js/scene', 'js/utils', 'js/tools', 'outils', 'components']) {
    let entrees = [];
    try { entrees = fs.readdirSync(path.join(RACINE, d)); } catch { continue; }
    for (const f of entrees) {
      if (!/\.(js|html)$/.test(f) || f === 'app.js') continue;
      const t = sansCommentaires(fs.readFileSync(path.join(RACINE, d, f), 'utf8'));
      if (t.includes('__studio')) dependants.push(`${d}/${f}`);
    }
  }
  ok('aucun autre fichier du front ne dépend de __studio',
    dependants.length === 0, dependants.join(' '));

  /* La copie publiée doit porter le même contrat que la source. C est le
     défaut qui a coûté le plus de temps : la source exposait l API, le studio
     servi chargeait l ancien bundle, et rien ne le disait. */
  const dist = path.join(RACINE, 'assets', 'dist');
  const empreintes = fs.existsSync(dist)
    ? fs.readdirSync(dist).filter((n) => fs.statSync(path.join(dist, n)).isDirectory())
    : [];
  ok('un seul arbre JS publié', empreintes.length === 1, empreintes.join(' '));
  if (empreintes.length === 1) {
    const publie = path.join(dist, empreintes[0], 'js', 'studio', 'app.js');
    const memeContenu = fs.existsSync(publie)
      && fs.readFileSync(publie, 'utf8').replace(/\r\n/g, '\n') === src.replace(/\r\n/g, '\n');
    ok('la copie publiée est à jour', memeContenu,
      memeContenu ? '' : 'relancer node _generator/build.js');
    ok('la page du studio charge cet arbre',
      fs.readFileSync(path.join(RACINE, 'outils', 'studio.html'), 'utf8')
        .includes(`assets/dist/${empreintes[0]}/js/studio/main.js`));
    /* Et le test lui-même ne doit pas se retrouver publié. */
    ok('aucun fichier de test dans le bundle',
      !fs.readdirSync(path.join(dist, empreintes[0], 'js', 'studio'))
        .some((n) => /check/.test(n)));
  }

  return echecs;
}

/* ------------------------------------------------------------------ */

if (require.main === module) {
  if (process.argv.includes('--script')) {
    /* Le corps de la fonction est imprimé tel quel : ce qui tourne dans le
       navigateur est exactement ce qui est écrit ici, pas une paraphrase. */
    console.log(`(${verifierApi.toString()})(window.__studio)`);
    process.exit(0);
  }
  console.log('Contrat de pilotage du studio (apiVersion 1)');
  const echecs = controlerSource();
  console.log(echecs === 0
    ? '\nContrat conforme. Comportement : --script, à exécuter dans un studio ?perf=1.'
    : `\n${echecs} échec(s).`);
  process.exit(echecs === 0 ? 0 : 1);
}

module.exports = { verifierApi, controlerSource };
