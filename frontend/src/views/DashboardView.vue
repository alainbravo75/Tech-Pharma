<template>
  <LayoutPrincipal>
    <h1>Tableau de bord</h1>
    <p class="texte-attenue">
      Les modules Stock et Caisse seront disponibles à l'étape suivante du développement.
    </p>

    <div class="grille-cartes">
      <div class="carte carte-info">
        <span class="etiquette">Étape actuelle</span>
        <h3>Authentification &amp; utilisateurs</h3>
        <p class="texte-attenue">Connexion sécurisée, rôles et journal d'activité opérationnels.</p>
      </div>
      <div class="carte carte-info carte-info--attente">
        <span class="etiquette">À venir</span>
        <h3>Gestion de stock</h3>
        <p class="texte-attenue">Produits, lots, alertes de péremption.</p>
      </div>
      <div class="carte carte-info carte-info--attente">
        <span class="etiquette">À venir</span>
        <h3>Point de vente offline</h3>
        <p class="texte-attenue">Caisse double devise, synchronisation automatique.</p>
      </div>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
</script>

<style scoped>
.texte-attenue {
  color: var(--texte-secondaire);
}

.grille-cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--espace-md);
  margin-top: var(--espace-lg);
}

.carte-info {
  border-left: 4px solid var(--couleur-primaire);
}

.carte-info--attente {
  border-left-color: var(--bordure);
  opacity: 0.75;
}

.etiquette {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--couleur-primaire);
}
</style>
