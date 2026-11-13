import { readHandoffParams } from './studio-handoff.js';



const CHAMPS = {
  departement: 'department',
  ville: 'city',
  logement: 'housingType',
  piece: 'roomType',
  surface: 'surface',
  support: 'supportType',
  parquet: 'parquetType',


  orientation: 'installationType',
  style: 'style',
  delai: 'timeframe',
  prenom: 'firstName',
  nom: 'lastName',
  email: 'email',
  telephone: 'phone',
  message: 'message',
};



const TRAITES_A_PART = new Set(['consentement', 'website', 'source', 'besoin']);



const RESERVES_SERVEUR = new Set([
  'id', 'status', 'reference',
  'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'consentAt', 'consent_at', 'userId',
  'internalMailStatus', 'visitorMailStatus', 'mailStatus',
]);



export function visualizerFromParams(params) {
  const lu = readHandoffParams(params);

  const v = {};
  if (lu.sceneId) v.sceneId = lu.sceneId;
  if (lu.productId) v.productId = lu.productId;
  if (lu.pattern) v.pattern = lu.pattern;
  if (lu.angle !== null) v.orientation = lu.angle;




  if (!Object.keys(v).length) return undefined;



  v.config = {
    origine: 'studio',
    ...(v.sceneId ? { scene: v.sceneId } : {}),
    ...(lu.sceneLabel ? { nomScene: lu.sceneLabel } : {}),
    ...(v.productId ? { produit: v.productId } : {}),
    ...(lu.productLabel ? { nom: lu.productLabel } : {}),
    ...(v.pattern ? { motif: v.pattern } : {}),
    ...(v.orientation !== undefined ? { angle: v.orientation } : {}),
  };

  return v;
}



export function buildProjectPayload({ formData, formToken, sourcePath, utm, visualizer, qualification }) {
  const payload = {};

  for (const [nom, valeurBrute] of formData.entries()) {
    if (TRAITES_A_PART.has(nom)) continue;
    const cle = CHAMPS[nom];


    if (!cle || RESERVES_SERVEUR.has(cle)) continue;

    const valeur = typeof valeurBrute === 'string' ? valeurBrute.trim() : valeurBrute;




    if (valeur === '') continue;

    payload[cle] = valeur;
  }


  if (payload.surface !== undefined) {
    const n = Number.parseInt(String(payload.surface), 10);
    if (Number.isFinite(n)) payload.surface = n;
  }



  if (formData.get('consentement') !== null) payload.consent = true;



  payload.website = String(formData.get('website') || '');

  payload.formToken = formToken;

  if (sourcePath) payload.sourceUrl = sourcePath;

  if (utm) {



    for (const cle of ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm']) {
      const v = (utm[cle] || '').trim();
      if (v !== '') payload[cle] = v.slice(0, 100);
    }
  }

  if (visualizer) payload.visualizer = visualizer;



  if (qualification) {
    for (const cle of ['leadSource', 'leadNeed', 'leadDestination', 'entryPage']) {
      const v = (qualification[cle] || '').trim();
      if (v !== '') payload[cle] = v;
    }
    for (const cle of ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm']) {
      const v = (qualification[cle] || '').trim();
      if (v !== '' && !payload[cle]) payload[cle] = v.slice(0, 100);
    }
  }

  return payload;
}


export function frontFieldFor(apiKey) {
  const trouve = Object.entries(CHAMPS).find(([, api]) => api === apiKey);
  if (trouve) return trouve[0];
  if (apiKey === 'consent') return 'consentement';

  return null;
}

export default buildProjectPayload;
