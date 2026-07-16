import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  // 30s plutôt que 8s : une connexion Kinshasa -> serveur (potentiellement
  // à l'étranger) peut être bien plus lente/instable qu'un test local, et
  // un délai trop court fait échouer à tort des opérations qui auraient
  // fini par aboutir.
  timeout: 30000,
});

// Le token vit en mémoire (variable de module) plutôt qu'en clair dans
// localStorage/sessionStorage : la seule copie persistante est chiffrée
// dans IndexedDB via sessionRepository. Il est réhydraté en mémoire au
// démarrage de l'app (voir authStore.initialiser).
let tokenEnMemoire = null;

// Rappelé par authStore quand une session expirée est détectée, pour
// forcer une déconnexion propre plutôt que de laisser chaque écran
// afficher sa propre erreur brute ("session invalide ou expirée").
let surSessionExpiree = null;

export function definirToken(token) {
  tokenEnMemoire = token;
}

export function definirGestionnaireSessionExpiree(fonction) {
  surSessionExpiree = fonction;
}

api.interceptors.request.use((config) => {
  if (tokenEnMemoire) {
    config.headers.Authorization = `Bearer ${tokenEnMemoire}`;
  }
  return config;
});

api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    // 401 = token absent/invalide/expiré. On ne déclenche PAS ça sur la
    // route de login elle-même (un mauvais mot de passe renvoie aussi 401,
    // mais ce n'est pas une session expirée, c'est un login qui échoue).
    const estRouteLogin = erreur.config?.url?.includes('/auth/login');
    if (erreur.response?.status === 401 && !estRouteLogin && surSessionExpiree) {
      surSessionExpiree();
    }
    return Promise.reject(erreur);
  }
);

export default api;
