<template>
  <div class="mise-en-page">
    <aside class="barre-laterale" :class="{ 'barre-laterale--ouverte': menuMobileOuvert }">
      <div class="entete-barre">
        <div class="logo-pharmacie" aria-hidden="true">+</div>
        <button class="bouton-hamburger" @click="menuMobileOuvert = !menuMobileOuvert" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <nav :class="{ 'nav--ouverte': menuMobileOuvert }">
        <RouterLink to="/" class="lien-nav" @click="menuMobileOuvert = false">Tableau de bord</RouterLink>
        <RouterLink to="/caisse" class="lien-nav" @click="menuMobileOuvert = false">Caisse</RouterLink>
        <RouterLink to="/stock" class="lien-nav" @click="menuMobileOuvert = false">Stock</RouterLink>
        <RouterLink
          to="/rapports"
          class="lien-nav"
          v-if="authStore.utilisateur?.role === 'admin' || authStore.utilisateur?.role === 'pharmacien'"
          @click="menuMobileOuvert = false"
        >
          Rapports
        </RouterLink>
        <RouterLink to="/utilisateurs" class="lien-nav" v-if="authStore.estAdmin" @click="menuMobileOuvert = false">Utilisateurs</RouterLink>
        <RouterLink to="/journal" class="lien-nav" v-if="authStore.estAdmin" @click="menuMobileOuvert = false">Journal</RouterLink>
        <RouterLink to="/sauvegardes" class="lien-nav" v-if="authStore.estAdmin" @click="menuMobileOuvert = false">Sauvegardes</RouterLink>
        <RouterLink to="/parametres" class="lien-nav" v-if="authStore.estAdmin" @click="menuMobileOuvert = false">Paramètres</RouterLink>
        <button class="bouton bouton--secondaire bouton-deconnexion-mobile" @click="deconnecter">Déconnexion</button>
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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore.js';
import StatutSync from './StatutSync.vue';

const authStore = useAuthStore();
const router = useRouter();
const menuMobileOuvert = ref(false);

const libelleRole = computed(() => {
  const roles = { admin: 'Administrateur', pharmacien: 'Pharmacien', caissier: 'Caissier' };
  return roles[authStore.utilisateur?.role] || '';
});

async function deconnecter() {
  menuMobileOuvert.value = false;
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

.entete-barre {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bouton-hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  padding: 0;
}
.bouton-hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: #fff;
  border-radius: 2px;
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

.bouton-deconnexion-mobile { display: none; }

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
    flex-direction: column;
    align-items: stretch;
    padding: var(--espace-sm) var(--espace-md);
  }
  .logo-pharmacie { margin-bottom: 0; }
  .bouton-hamburger { display: flex; }

  nav {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.2s ease;
    gap: 0.15rem;
  }
  nav.nav--ouverte {
    max-height: 400px;
    margin-top: var(--espace-sm);
    padding-top: var(--espace-sm);
    border-top: 1px solid rgba(255,255,255,0.15);
  }
  .lien-nav { padding: 0.75rem 0.8rem; }

  .bas-barre { display: none; }
  .bouton-deconnexion-mobile {
    display: block;
    margin-top: var(--espace-sm);
    width: 100%;
  }

  .contenu-principal { padding: var(--espace-md); }
  .entete { padding: var(--espace-sm) var(--espace-md); flex-wrap: wrap; gap: var(--espace-sm); }
}
</style>
