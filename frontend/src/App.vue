<template>
  <RouterView />
</template>

<script setup>
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/authStore.js';

// L'initialisation de la session (voir main.js) est terminée avant que
// ce composant ne soit monté : pas d'écran de chargement nécessaire ici.
const authStore = useAuthStore();
const router = useRouter();

// Si le serveur signale à tout moment (pas seulement au démarrage) que le
// jeton n'est plus valide - typiquement après plusieurs heures d'usage,
// le jeton expire - on renvoie immédiatement vers l'écran de connexion
// plutôt que de laisser l'utilisateur face à des erreurs qui ne
// s'expliquent pas ("sauvegarde invalide", etc.).
watch(
  () => authStore.sessionExpiree,
  (expiree) => {
    if (expiree) router.push('/connexion');
  }
);
</script>
