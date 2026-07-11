<template>
  <div class="page-connexion">
    <div class="carte carte-connexion">
      <div class="entete-connexion">
        <div class="logo-pharmacie" aria-hidden="true">+</div>
        <h1>Pharmacie</h1>
        <p class="sous-titre">Connectez-vous pour accéder à la caisse et au stock</p>
      </div>

      <p v-if="authStore.erreur" class="message-erreur" role="alert">
        {{ authStore.erreur }}
      </p>

      <form @submit.prevent="soumettre">
        <div class="champ">
          <label for="telephone">Numéro de téléphone</label>
          <input
            id="telephone"
            v-model="telephone"
            type="tel"
            autocomplete="username"
            placeholder="+243 900 000 000"
            required
          />
        </div>

        <div class="champ">
          <label for="motDePasse">Mot de passe</label>
          <input
            id="motDePasse"
            v-model="motDePasse"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="bouton bouton--primaire bouton-pleine-largeur" :disabled="authStore.chargement">
          {{ authStore.chargement ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <p class="note-offline">
        Une fois connecté(e) au moins une fois, la connexion reste possible hors ligne.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

const telephone = ref('');
const motDePasse = ref('');
const authStore = useAuthStore();
const router = useRouter();

async function soumettre() {
  const succes = await authStore.connecter(telephone.value, motDePasse.value);
  if (succes) {
    router.push('/');
  }
}
</script>

<style scoped>
.page-connexion {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--couleur-primaire-claire), var(--fond-page) 55%);
  padding: var(--espace-md);
}

.carte-connexion {
  width: 100%;
  max-width: 400px;
}

.entete-connexion {
  text-align: center;
  margin-bottom: var(--espace-lg);
}

.logo-pharmacie {
  width: 52px;
  height: 52px;
  margin: 0 auto var(--espace-sm);
  border-radius: 14px;
  background: var(--couleur-primaire);
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sous-titre {
  color: var(--texte-secondaire);
  font-size: 0.9rem;
  margin: 0;
}

.bouton-pleine-largeur {
  width: 100%;
}

.note-offline {
  text-align: center;
  font-size: 0.8rem;
  color: var(--texte-secondaire);
  margin: var(--espace-md) 0 0;
}
</style>
