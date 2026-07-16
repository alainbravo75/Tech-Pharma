<template>
  <LayoutPrincipal>
    <div class="entete-vue">
      <div>
        <h1>Journal d'activité</h1>
        <p class="texte-attenue">Historique des actions sensibles (créations, modifications, suppressions, connexions).</p>
      </div>
    </div>

    <div class="barre-filtres">
      <select v-model="filtreAction" @change="rechargerDepuisDebut">
        <option value="">Toutes les actions</option>
        <option v-for="a in actionsDisponibles" :key="a" :value="a">{{ libelleAction(a) }}</option>
      </select>
      <input v-model="filtreDebut" type="date" @change="rechargerDepuisDebut" title="À partir du" />
      <input v-model="filtreFin" type="date" @change="rechargerDepuisDebut" title="Jusqu'au" />
      <button v-if="filtreAction || filtreDebut || filtreFin" class="bouton bouton--secondaire" @click="reinitialiserFiltres">
        Réinitialiser
      </button>
    </div>

    <p v-if="erreur" class="message-erreur" role="alert">{{ erreur }}</p>

    <div class="carte">
      <table class="tableau-carte">
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entrees" :key="e.id">
            <td data-label="Date" class="colonne-date">{{ formaterDate(e.created_at) }}</td>
            <td data-label="Utilisateur">{{ e.utilisateur_nom || '—' }}</td>
            <td data-label="Action"><span class="badge" :class="classeBadgeAction(e.action)">{{ libelleAction(e.action) }}</span></td>
            <td data-label="Détails" class="colonne-details">{{ resumeDetails(e.details) }}</td>
          </tr>
          <tr v-if="entrees.length === 0 && !chargement">
            <td colspan="4" class="etat-vide">Aucune entrée pour ces filtres.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="peutChargerPlus" class="zone-charger-plus">
      <button class="bouton bouton--secondaire" :disabled="chargement" @click="chargerPlus">
        {{ chargement ? 'Chargement...' : 'Charger plus' }}
      </button>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { obtenirJournal } from '../services/journalApi.js';

const LIMITE = 50;

const entrees = ref([]);
const total = ref(0);
const actionsDisponibles = ref([]);
const chargement = ref(false);
const erreur = ref('');

const filtreAction = ref('');
const filtreDebut = ref('');
const filtreFin = ref('');

const peutChargerPlus = computed(() => entrees.value.length < total.value);

const LIBELLES_ACTIONS = {
  connexion: 'Connexion',
  connexion_echouee: 'Échec de connexion',
  creation_utilisateur: 'Création utilisateur',
  modification_utilisateur: 'Modification utilisateur',
  suppression_utilisateur: 'Désactivation utilisateur',
  creation_produit: 'Création produit',
  modification_produit: 'Modification produit',
  modification_prix_produit: 'Modification prix',
  suppression_produit: 'Suppression produit',
  entree_stock: 'Entrée de stock',
  ajustement_stock: 'Ajustement de stock',
  stock_negatif_vente: '⚠ Stock négatif (vente)',
  modification_taux_change: 'Modification taux de change',
  envoi_recu_sms: 'Envoi reçu SMS',
};

function libelleAction(action) {
  return LIBELLES_ACTIONS[action] || action;
}

function classeBadgeAction(action) {
  if (action.includes('suppression') || action.includes('echouee') || action.includes('negatif')) return 'badge--inactif';
  if (action.includes('creation') || action.includes('entree')) return 'badge--admin';
  return 'badge--caissier';
}

function formaterDate(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
}

const LIBELLES_CLES_DETAILS = {
  nom: 'Nom',
  telephone: 'Téléphone',
  role: 'Rôle',
  champs: 'Champs modifiés',
  produit: 'Produit',
  numeroLot: 'N° lot',
  quantite: 'Quantité',
  quantite_manquante: 'Quantité manquante',
  type: 'Type',
  fichier: 'Fichier',
  nouveau_taux: 'Nouveau taux',
  tentative: "Tentative n°",
};

function resumeDetails(detailsJson) {
  if (!detailsJson) return '—';
  try {
    const details = JSON.parse(detailsJson);
    return Object.entries(details)
      // Les identifiants techniques (UUID en *_id) ne sont pas lisibles et
      // n'apportent rien à l'écran - le backend fournit désormais des noms
      // lisibles à la place pour les nouvelles entrées du journal.
      .filter(([cle, valeur]) => !cle.endsWith('_id') && valeur !== null && valeur !== undefined)
      .map(([cle, valeur]) => `${LIBELLES_CLES_DETAILS[cle] || cle} : ${Array.isArray(valeur) ? valeur.join(', ') : valeur}`)
      .join(' · ');
  } catch {
    return detailsJson;
  }
}

async function charger(decalage = 0) {
  chargement.value = true;
  erreur.value = '';
  try {
    const data = await obtenirJournal({
      action: filtreAction.value || undefined,
      debut: filtreDebut.value || undefined,
      fin: filtreFin.value || undefined,
      limite: LIMITE,
      decalage,
    });
    entrees.value = decalage === 0 ? data.entrees : [...entrees.value, ...data.entrees];
    total.value = data.total;
    actionsDisponibles.value = data.actionsDisponibles;
  } catch (err) {
    erreur.value = err.response?.data?.erreur || 'Impossible de charger le journal (connexion requise).';
  } finally {
    chargement.value = false;
  }
}

function rechargerDepuisDebut() {
  charger(0);
}

function chargerPlus() {
  charger(entrees.value.length);
}

function reinitialiserFiltres() {
  filtreAction.value = '';
  filtreDebut.value = '';
  filtreFin.value = '';
  charger(0);
}

onMounted(() => charger(0));
</script>

<style scoped>
.entete-vue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--espace-md);
  gap: var(--espace-md);
  flex-wrap: wrap;
}

.texte-attenue { color: var(--texte-secondaire); }

.barre-filtres {
  display: flex;
  gap: var(--espace-sm);
  margin-bottom: var(--espace-md);
  flex-wrap: wrap;
}

.barre-filtres select,
.barre-filtres input {
  padding: 0.55rem 0.8rem;
  border: 1.5px solid var(--bordure);
  border-radius: var(--rayon);
  font-size: 0.88rem;
}

.colonne-date { white-space: nowrap; font-size: 0.88rem; color: var(--texte-secondaire); }
.colonne-details {
  font-size: 0.85rem;
  color: var(--texte-secondaire);
  max-width: 320px;
}

.etat-vide { text-align: center; color: var(--texte-secondaire); padding: var(--espace-lg); }

.zone-charger-plus {
  display: flex;
  justify-content: center;
  margin-top: var(--espace-md);
}

@media (max-width: 860px) {
  .colonne-details {
    max-width: none;
    flex-direction: column;
    align-items: flex-start !important;
    text-align: left !important;
  }
}
</style>
