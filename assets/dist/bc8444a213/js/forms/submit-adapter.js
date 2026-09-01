/**
 * Abstraction d'envoi des formulaires.
 *
 * Le composant de formulaire ne connaît que `submitProject(payload)`.
 * Brancher un backend (ou un formulaire partenaire) revient à changer
 * l'implémentation ici, ou à appeler `configureSubmit()` au démarrage.
 *
 *   configureSubmit({ endpoint: 'https://api.exemple.fr/leads' });
 */

const config = {
  endpoint: null, // ex. '/api/projet'
  method: 'POST',
  storageKey: 'pose-parquet:demandes',
  simulateDelay: 700,
};

export function configureSubmit(options = {}) {
  Object.assign(config, options);
}

/** Sauvegarde locale de secours, utile tant qu'aucun backend n'est branché. */
function storeLocally(payload) {
  try {
    const previous = JSON.parse(window.localStorage.getItem(config.storageKey) || '[]');
    previous.push({ ...payload, receivedAt: new Date().toISOString() });
    window.localStorage.setItem(config.storageKey, JSON.stringify(previous.slice(-20)));
  } catch (error) {
    // Stockage indisponible (navigation privée) : on ignore silencieusement.
    void error;
  }
}

export async function submitProject(payload) {
  if (!config.endpoint) {
    storeLocally(payload);
    await new Promise((resolve) => window.setTimeout(resolve, config.simulateDelay));
    return { ok: true, mode: 'local' };
  }

  const response = await fetch(config.endpoint, {
    method: config.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Envoi impossible (${response.status})`);
  return { ok: true, mode: 'remote' };
}

export default submitProject;
