const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');







function verifierApi(studio) {
  const resultats = [];
  const ok = (nom, condition, detail = '') =>
    resultats.push({ nom, ok: !!condition, detail: String(detail) });

  if (!studio) {
    ok('le studio est joignable', false, 'window.__studio absent — ?perf=1 manquant ?');
    return { ok: false, resultats };
  }


  ok('apiVersion vaut 1', studio.apiVersion === 1, studio.apiVersion);


  const caps = typeof studio.getCapabilities === 'function' ? studio.getCapabilities() : null;
  ok('getCapabilities répond', !!caps);
  if (caps) {
    const attendus = [
      ['pattern', true], ['width', true], ['orientation', true],


      ['scale', false],

      ['finish', false], ['grain', false], ['joints', false],
    ];
    for (const [clef, attendu] of attendus) {
      ok(`capacité ${clef} = ${attendu}`, caps[clef] === attendu, caps[clef]);
    }
  }
  ok('aucun setter d échelle, puisque personne ne l utilise',
    typeof studio.setScale === 'undefined');


  const largeurAvant = studio.config.width;
  ok('setWidth accepte une largeur plausible',
    studio.setWidth(0.19) === true && studio.config.width === 0.19, studio.config.width);
  ok('setWidth(null) rend la main au motif',
    studio.setWidth(null) === true && studio.config.width === null, studio.config.width);
  ok('les bornes sont inclusives',
    studio.setWidth(0.02) === true && studio.setWidth(0.5) === true);



  studio.setWidth(0.19);
  for (const mauvaise of [NaN, 0, -1, 5, Infinity, '0.19', undefined, {}]) {
    const refus = studio.setWidth(mauvaise);
    ok(`setWidth refuse ${String(mauvaise)}`,
      refus === false && studio.config.width === 0.19,
      `retour ${refus}, largeur ${studio.config.width}`);
  }



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


  let doubleRetraitOk = true;
  try { const o = studio.onRendered(() => {}); o(); o(); } catch { doubleRetraitOk = false; }
  ok('un désabonnement peut être appelé deux fois sans erreur', doubleRetraitOk);


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


    eprouverAbonnements: async (msMax = 20000) => {
      const rendu = () => new Promise((resolve) => {
        let fini = false;
        const fin = (obtenu) => {
          if (fini) return; fini = true;
          clearTimeout(echeance); guetteur(); resolve(obtenu);
        };
        const echeance = setTimeout(() => fin(false), msMax);
        const guetteur = studio.onRendered(() => fin(true));


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





function controlerSource() {
  const src = fs.readFileSync(path.join(RACINE, 'js', 'studio', 'app.js'), 'utf8');

  let echecs = 0;
  const ok = (nom, condition, detail = '') => {
    if (!condition) echecs += 1;
    console.log(`  ${condition ? 'OK  ' : 'KO  '} ${nom}${detail ? ` — ${detail}` : ''}`);
  };


  const affectations = src.match(/window\.__studio\s*=/g) || [];
  ok('une seule affectation de window.__studio', affectations.length === 1, affectations.length);
  const debut = src.indexOf('if (perfActif) {');
  const bloc = src.slice(debut, src.indexOf('window.__studio = api;'));
  ok('elle reste enfermée dans if (perfActif)', debut > 0 && bloc.length > 0);

  ok('apiVersion est déclarée', /apiVersion:\s*1,/.test(bloc));
  ok('setWidth existe', /setWidth:\s*\(metres\)\s*=>/.test(bloc));
  ok('getCapabilities existe', /getCapabilities:\s*\(\)\s*=>/.test(bloc));
  ok('onRendered existe', /onRendered:\s*\(cb\)\s*=>/.test(bloc));



  const mentions = (src.match(/setScale/g) || []).length;
  ok('aucun setter d échelle n a été ajouté', mentions === 1, `${mentions} mention(s)`);



  ok('les capacités pilotables sont déduites',
    (bloc.match(/typeof api\.set\w+ === 'function'/g) || []).length >= 4);



  const documentation = fs.readFileSync(path.join(RACINE, 'docs', 'code', 'README.md'), 'utf8');
  const contratDocumente = documentation.slice(documentation.lastIndexOf('## Contrat de pilotage du Studio'));
  ok('le README distingue le contrat et le diagnostic', contratDocumente.includes('CONTRAT DE PILOTAGE') && contratDocumente.includes('DONNEES DE DIAGNOSTIC'));
  for (const membre of ['config', 'setContext', 'renderer', 'catalog']) {
    ok(membre + ' documenté hors contrat', contratDocumente.includes('hors contrat') && contratDocumente.includes(membre));
  }

  for (const membre of ['get config()', 'selectMaterial,', 'setPattern:', 'setAngle:',
    'openRoom,', 'setContext,', 'canvas,', 'get renderer()', 'catalog,']) {
    ok(`${membre.trim()} conservé`, bloc.includes(membre));
  }



  const corps = bloc.slice(bloc.indexOf('setWidth:'), bloc.indexOf('getCapabilities:'));
  ok('setWidth demande un rendu au lieu de peindre lui-même',
    /demandeRendu\(true\)/.test(corps) && !/renderer\.paint/.test(corps));
  ok('setWidth valide avant d écrire',
    corps.indexOf('return false') < corps.indexOf('config = {'));



  const iPaint = src.indexOf('function paint() {');
  const paint = src.slice(iPaint, iPaint + 2000);
  ok('le rendu terminé est signalé', /apresRendu\.forEach/.test(paint));
  ok('il part après le repère de fin, pas avant',
    paint.indexOf("mark('app:paint:fin')") < paint.indexOf('apresRendu.forEach'));
  ok('les sorties anticipées passent avant le signal',
    paint.indexOf('renderer.enAttente') < paint.indexOf('apresRendu.forEach'));
  ok('un abonné qui casse n arrête pas le rendu',
    /apresRendu\.forEach\(\(cb\) => \{ try \{/.test(paint));



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
      fs.readFileSync(path.join(RACINE, require('./routes').fichierPublic('outils/studio.html')), 'utf8')
        .includes(`assets/dist/${empreintes[0]}/js/studio/main.js`));

    ok('aucun fichier de test dans le bundle',
      !fs.readdirSync(path.join(dist, empreintes[0], 'js', 'studio'))
        .some((n) => /check/.test(n)));
  }

  return echecs;
}



if (require.main === module) {
  if (process.argv.includes('--script')) {


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
