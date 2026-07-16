<template>
  <LayoutPrincipal>
    <h1>Tableau de bord</h1>
    <p class="texte-attenue">Bienvenue, {{ authStore.utilisateur?.nom }}.</p>

    <div class="grille-raccourcis">
      <RouterLink to="/caisse" class="carte carte-raccourci carte-raccourci--principal">
        <span class="icone-raccourci">🧾</span>
        <div>
          <h2>Caisse</h2>
          <p>Vendre un produit, encaisser un client</p>
        </div>
      </RouterLink>

      <RouterLink to="/stock" class="carte carte-raccourci">
        <span class="icone-raccourci">📦</span>
        <div>
          <h2>Stock</h2>
          <p>Produits, lots, alertes de péremption</p>
        </div>
      </RouterLink>

      <RouterLink
        v-if="peutVoirRapports"
        to="/rapports"
        class="carte carte-raccourci"
      >
        <span class="icone-raccourci">📊</span>
        <div>
          <h2>Rapports</h2>
          <p>Chiffre d'affaires, produits les plus vendus</p>
        </div>
      </RouterLink>

      <RouterLink v-if="authStore.estAdmin" to="/utilisateurs" class="carte carte-raccourci">
        <span class="icone-raccourci">👥</span>
        <div>
          <h2>Utilisateurs</h2>
          <p>Gérer les comptes admin, pharmacien, caissier</p>
        </div>
      </RouterLink>

      <RouterLink v-if="authStore.estAdmin" to="/journal" class="carte carte-raccourci">
        <span class="icone-raccourci">📋</span>
        <div>
          <h2>Journal d'activité</h2>
          <p>Historique des actions sensibles</p>
        </div>
      </RouterLink>

      <RouterLink v-if="authStore.estAdmin" to="/sauvegardes" class="carte carte-raccourci">
        <span class="icone-raccourci">💾</span>
        <div>
          <h2>Sauvegardes</h2>
          <p>Créer, télécharger, envoyer par email</p>
        </div>
      </RouterLink>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { computed } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { useAuthStore } from '../stores/authStore.js';

const authStore = useAuthStore();

const peutVoirRapports = computed(() =>
  authStore.utilisateur?.role === 'admin' || authStore.utilisateur?.role === 'pharmacien'
);
</script>

<style scoped>
.texte-attenue {
  color: var(--texte-secondaire);
  margin-bottom: var(--espace-lg);
}

.grille-raccourcis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--espace-md);
}

.carte-raccourci {
  display: flex;
  align-items: center;
  gap: var(--espace-md);
  text-decoration: none;
  color: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.carte-raccourci:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 35, 30, 0.12);
}

.carte-raccourci--principal {
  background: var(--couleur-primaire);
  color: #fff;
}
.carte-raccourci--principal h2,
.carte-raccourci--principal p { color: #fff; }
.carte-raccourci--principal p { opacity: 0.85; }

.icone-raccourci {
  font-size: 2rem;
  flex-shrink: 0;
}

.carte-raccourci h2 {
  font-size: 1.05rem;
  margin: 0 0 0.2rem;
}

.carte-raccourci p {
  font-size: 0.85rem;
  color: var(--texte-secondaire);
  margin: 0;
}
</style>
