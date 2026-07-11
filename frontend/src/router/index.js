import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

const routes = [
  {
    path: '/connexion',
    name: 'connexion',
    component: () => import('../views/ConnexionView.vue'),
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { necessiteAuth: true },
  },
  {
    path: '/utilisateurs',
    name: 'utilisateurs',
    component: () => import('../views/UtilisateursView.vue'),
    meta: { necessiteAuth: true, rolesAutorises: ['admin'] },
  },
  {
    path: '/stock',
    name: 'stock',
    component: () => import('../views/StockView.vue'),
    meta: { necessiteAuth: true },
  },
  {
    path: '/caisse',
    name: 'caisse',
    component: () => import('../views/CaisseView.vue'),
    meta: { necessiteAuth: true },
  },
  {
    path: '/rapports',
    name: 'rapports',
    component: () => import('../views/RapportsView.vue'),
    meta: { necessiteAuth: true, rolesAutorises: ['admin', 'pharmacien'] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.necessiteAuth && !authStore.estConnecte) {
    return { name: 'connexion' };
  }

  if (to.meta.rolesAutorises && !to.meta.rolesAutorises.includes(authStore.utilisateur?.role)) {
    return { name: 'dashboard' };
  }

  if (to.name === 'connexion' && authStore.estConnecte) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
