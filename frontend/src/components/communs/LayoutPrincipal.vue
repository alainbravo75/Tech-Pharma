<template>
  <div class="mise-en-page">
    <aside class="barre-laterale">
      <div class="logo-pharmacie" aria-hidden="true">+</div>
      <nav>
        <RouterLink to="/" class="lien-nav">Tableau de bord</RouterLink>
        <RouterLink to="/caisse" class="lien-nav">Caisse</RouterLink>
        <RouterLink to="/stock" class="lien-nav">Stock</RouterLink>
        <RouterLink to="/utilisateurs" class="lien-nav" v-if="authStore.estAdmin">Utilisateurs</RouterLink>
      </nav>
      <div class="bas-barre">
        <button class="bouton bouton--secondaire" @click="deconnecter">Déconnexion</button>
      </div>
    </aside>

    <div class="zone-contenu">
      <header class="entete">
        <div>
          <p class="bienvenue">Bonjour, {{ authStore.utilisateur?.nom }}</p>
          <span class="badge" :class="`badge--${authStore.utilisateur?.role}`">
            {{ libelleRole }}
          </span>
        </div>
        <StatutSync />
      </header>

      <main class="contenu-principal">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';
import StatutSync from './StatutSync.vue';

const authStore = useAuthStore();
const router = useRouter();

const libelleRole = computed(() => {
  const roles = { admin: 'Administrateur', pharmacien: 'Pharmacien', caissier: 'Caissier' };
  return roles[authStore.utilisateur?.role] || '';
});

async function deconnecter() {
  await authStore.deconnecter();
  router.push('/connexion');
}
</script>

<style scoped>
.mise-en-page {
  display: flex;
  min-height: 100vh;
}

.barre-laterale {
  width: 220px;
  flex-shrink: 0;
  background: var(--couleur-primaire-fonce);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: var(--espace-md);
}

.logo-pharmacie {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: var(--espace-lg);
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.lien-nav {
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  padding: 0.65rem 0.8rem;
  border-radius: var(--rayon);
  font-size: 0.95rem;
  font-weight: 500;
}

.lien-nav:hover {
  background: rgba(255,255,255,0.1);
}

.lien-nav.router-link-active {
  background: rgba(255,255,255,0.18);
  color: #fff;
  font-weight: 700;
}

.zone-contenu {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--espace-md) var(--espace-lg);
  background: var(--fond-carte);
  border-bottom: 1px solid var(--bordure);
}

.bienvenue {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.contenu-principal {
  flex: 1;
  padding: var(--espace-lg);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .mise-en-page { flex-direction: column; }
  .barre-laterale {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: var(--espace-sm) var(--espace-md);
  }
  .logo-pharmacie { margin-bottom: 0; margin-right: var(--espace-md); }
  nav { flex-direction: row; }
  .bas-barre { margin-left: auto; }
  .contenu-principal { padding: var(--espace-md); }
}
</style>
