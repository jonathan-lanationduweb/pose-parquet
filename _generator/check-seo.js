const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { exclusions } = require('./arborescence');
const { ORIGINE, fichierPublic, cheminPublic, reference, robot } = require('./routes');
const { metadonnees } = require('./seo');

const root = path.resolve(__dirname, '..');
const ignorer = exclusions(['assets', 'backend', 'docs', 'design', 'components']);
function fichiers(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? ignorer(e.name) ? [] : fichiers(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
}
const decode = s => s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function meta(html, attribut, valeur) {
  return [...html.matchAll(new RegExp('<meta\\s+'+attribut+'="'+valeur+'"\\s+content="([^"]*)"','gi'))].map(m=>decode(m[1]));
}
const titres = new Set(), descriptions = new Set(), pages = [];
let references = 0, schemas = 0;
for (const fichier of fichiers(root)) {
  const relatif = path.relative(root,fichier).replace(/\\/g,'/');
  const technique = ['404.html','maintenance.html'].includes(relatif);
  if (technique || fichierPublic(relatif) !== relatif) continue;
  const html = fs.readFileSync(fichier,'utf8');
  const titresPage = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map(m=>decode(m[1]));
  const descriptionsPage = meta(html,'name','description');
  const canoniques = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map(m=>m[1]);
  assert.equal(titresPage.length,1,relatif+' : title');
  assert.equal(descriptionsPage.length,1,relatif+' : description');
  assert.equal(canoniques.length,1,relatif+' : canonical');
  assert.equal(canoniques[0],ORIGINE+cheminPublic(relatif),relatif+' : URL canonique');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,relatif+' : H1');
  assert(html.includes('<html lang="fr">'),relatif+' : langue');
  assert(!titres.has(titresPage[0]),relatif+' : title dupliqué');titres.add(titresPage[0]);
  assert(!descriptions.has(descriptionsPage[0]),relatif+' : description dupliquée');descriptions.add(descriptionsPage[0]);
  assert.equal(meta(html,'property','og:url')[0],canoniques[0]);
  assert.equal(meta(html,'property','og:title')[0],titresPage[0]);
  assert.equal(meta(html,'property','og:description')[0],descriptionsPage[0]);
  if (process.env.SITE_ENVIRONMENT !== 'production') assert.equal(meta(html,'name','robots')[0],'noindex, follow');
  const attendu = metadonnees[cheminPublic(relatif)];
  if(attendu){assert.equal(titresPage[0],attendu.title);assert.equal(descriptionsPage[0],attendu.description);}
  for(const [,valeur] of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)){
    if(/^(?:[a-z]+:|#|\/\/)/i.test(valeur))continue;
    assert(!/\.html(?:[?#]|$)/i.test(valeur),relatif+' : ancien lien '+valeur);
    const u=new URL(decode(valeur),ORIGINE+'/'+relatif);
    let cible=path.join(root,decodeURIComponent(u.pathname));
    if(fs.existsSync(cible)&&fs.statSync(cible).isDirectory())cible=path.join(cible,'index.html');
    assert(fs.existsSync(cible),relatif+' : ressource absente '+valeur);references++;
  }
  for(const [,json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    const data=JSON.parse(json);assert(!/https:\/\/pose-parquet\.com\/[^"\s]*\.html/.test(json),relatif+' : ancienne URL JSON-LD');
    if(data['@type']==='FAQPage')for(const q of data.mainEntity||[]){
      assert(html.includes(q.name)||html.includes(q.name.replace(/'/g,'&#39;')),relatif+' : question FAQ absente');
      const plain = value => decode(value.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
      assert(plain(html).includes(plain(q.acceptedAnswer.text)),relatif+' : réponse FAQ absente');
    }
    schemas++;
  }
  pages.push({file:relatif,url:cheminPublic(relatif),title:titresPage[0],description:descriptionsPage[0],canonical:canoniques[0],robots:meta(html,'name','robots')[0]});
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
assert(!sitemap.includes('.html'),'Sitemap : extension HTML');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length,'Sitemap : doublons');
for(const u of urls){assert(u.startsWith(ORIGINE+'/')&&u.endsWith('/'));assert(pages.some(p=>p.canonical===u),'Sitemap : page inconnue '+u);}
assert(!urls.some(u=>/visualiseur-produit/.test(u)),'Sitemap : prototype');
assert.equal(reference('studio.html?piece=chambre&motif=lames#rendu','outils/visualiseur.html'),'../studio/?piece=chambre&amp;motif=lames#rendu');
assert.equal(reference('../assets/fonts/test.woff2','guides/test.html'),'../../assets/fonts/test.woff2');
assert.equal(reference('#section','guides/test.html'),'#section');
assert.equal(reference('../contact/','guides/test.html'),'../../contact/');
const environnement=process.env.SITE_ENVIRONMENT;
process.env.SITE_ENVIRONMENT='production';assert.equal(robot(),'index, follow');assert.equal(robot('noindex, follow'),'noindex, follow');
process.env.SITE_ENVIRONMENT='staging';assert.equal(robot(),'noindex, follow');
if(environnement===undefined)delete process.env.SITE_ENVIRONMENT;else process.env.SITE_ENVIRONMENT=environnement;
console.log(JSON.stringify({pages:pages.length,references,schemas,sitemap:urls.length,environment:process.env.SITE_ENVIRONMENT||'staging',status:'OK'},null,2));
if(process.argv.includes('--json'))fs.writeFileSync(process.argv[process.argv.indexOf('--json')+1],JSON.stringify(pages,null,2));
