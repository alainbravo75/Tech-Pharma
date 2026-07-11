import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { useAuthStore } from './stores/authStore.js';
import { demarrerSurveillanceReseau } from './sync/syncStatus.js';
import './assets/styles.css';

const app = createApp(App);
app.use(createPinia());

// La session locale (chiffrée) doit être restaurée AVANT que le routeur
// n'évalue sa première navigation, sinon le garde d'authentification
// redirigerait à tort vers /connexion même avec une session valide en cache.
const authStore = useAuthStore();
demarrerSurveillanceReseau();

authStore.initialiser().finally(() => {
  app.use(router);
  app.mount('#app');
});
