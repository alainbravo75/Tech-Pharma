import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 8000,
});

// Le token vit en mémoire (variable de module) plutôt qu'en clair dans
// localStorage/sessionStorage : la seule copie persistante est chiffrée
// dans IndexedDB via sessionRepository. Il est réhydraté en mémoire au
// démarrage de l'app (voir authStore.initialiser).
let tokenEnMemoire = null;

export function definirToken(token) {
  tokenEnMemoire = token;
}

api.interceptors.request.use((config) => {
  if (tokenEnMemoire) {
    config.headers.Authorization = `Bearer ${tokenEnMemoire}`;
  }
  return config;
});

export default api;
