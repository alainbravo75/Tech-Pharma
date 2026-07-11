<template>
  <div class="statut-sync" :class="classeStatut">
    <span class="pastille"></span>
    <span class="texte">{{ texteStatut }}</span>
    <span v-if="operationsEnAttente > 0" class="compteur">
      ({{ operationsEnAttente }} en attente)
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { statutReseau, operationsEnAttente } from '../../sync/syncStatus.js';

const classeStatut = computed(() => `statut-sync--${statutReseau.value}`);

const texteStatut = computed(() => {
  switch (statutReseau.value) {
    case 'en_ligne': return 'En ligne';
    case 'hors_ligne': return 'Hors ligne';
    case 'synchronisation': return 'Synchronisation...';
    case 'erreur': return 'Erreur de synchronisation';
    default: return '';
  }
});
</script>

<style scoped>
.statut-sync {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--fond-neutre, #f1f5f9);
  color: var(--texte-neutre, #334155);
}

.pastille {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.statut-sync--en_ligne .pastille { background: #16a34a; }
.statut-sync--hors_ligne .pastille { background: #94a3b8; }
.statut-sync--synchronisation .pastille {
  background: #f59e0b;
  animation: pulser 1s infinite;
}
.statut-sync--erreur .pastille { background: #dc2626; }

.compteur {
  color: #64748b;
}

@keyframes pulser {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
