import { ref } from 'vue';

// Statuts possibles : 'en_ligne' | 'hors_ligne' | 'synchronisation' | 'erreur'
export const statutReseau = ref(navigator.onLine ? 'en_ligne' : 'hors_ligne');
export const operationsEnAttente = ref(0);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let intervalleId = null;

/**
 * navigator.onLine n'est pas toujours fiable (il indique juste qu'une
 * interface réseau existe, pas que le serveur est réellement joignable).
 * On confirme donc avec un ping léger périodique vers /api/health.
 */
async function verifierConnexionReelle() {
  if (!navigator.onLine) {
    statutReseau.value = 'hors_ligne';
    return false;
  }

  try {
    const controleur = new AbortController();
    const timeout = setTimeout(() => controleur.abort(), 4000);
    const reponse = await fetch(`${API_BASE}/api/health`, { signal: controleur.signal });
    clearTimeout(timeout);

    if (reponse.ok) {
      statutReseau.value = 'en_ligne';
      return true;
    }
    statutReseau.value = 'hors_ligne';
    return false;
  } catch {
    statutReseau.value = 'hors_ligne';
    return false;
  }
}

export function demarrerSurveillanceReseau() {
  window.addEventListener('online', verifierConnexionReelle);
  window.addEventListener('offline', () => {
    statutReseau.value = 'hors_ligne';
  });

  verifierConnexionReelle();
  // Vérification périodique : couvre les cas de coupure "silencieuse"
  intervalleId = setInterval(verifierConnexionReelle, 15000);
}

export function arreterSurveillanceReseau() {
  if (intervalleId) clearInterval(intervalleId);
}

export { verifierConnexionReelle };
