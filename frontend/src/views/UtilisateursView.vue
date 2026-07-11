<template>
  <LayoutPrincipal>
    <div class="entete-vue">
      <div>
        <h1>Utilisateurs</h1>
        <p class="texte-attenue">Gérez les comptes admin, pharmacien et caissier.</p>
      </div>
      <button class="bouton bouton--primaire" @click="ouvrirCreation">+ Nouvel utilisateur</button>
    </div>

    <p v-if="store.erreur" class="message-erreur" role="alert">{{ store.erreur }}</p>

    <div class="carte">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Dernière connexion</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.liste" :key="u.id">
            <td>{{ u.nom }}</td>
            <td>{{ u.telephone }}</td>
            <td><span class="badge" :class="`badge--${u.role}`">{{ libelleRole(u.role) }}</span></td>
            <td>
              <span class="badge" :class="u.actif ? `badge--${u.role}` : 'badge--inactif'">
                {{ u.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>{{ formaterDate(u.derniere_connexion) }}</td>
            <td class="cellule-actions">
              <button class="lien-action" @click="ouvrirModification(u)">Modifier</button>
              <button
                v-if="u.id !== authStore.utilisateur?.id"
                class="lien-action lien-action--danger"
                @click="confirmerSuppression(u)"
              >
                Désactiver
              </button>
            </td>
          </tr>
          <tr v-if="store.liste.length === 0 && !store.chargement">
            <td colspan="6" class="etat-vide">Aucun utilisateur pour le moment.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modale création / modification -->
    <div v-if="modaleOuverte" class="fond-modale" @click.self="fermerModale">
      <div class="carte modale">
        <h2>{{ utilisateurEnEdition ? 'Modifier' : 'Nouvel' }} utilisateur</h2>

        <p v-if="erreurFormulaire" class="message-erreur">{{ erreurFormulaire }}</p>

        <form @submit.prevent="soumettre">
          <div class="champ">
            <label for="nom">Nom complet</label>
            <input id="nom" v-model="formulaire.nom" required />
          </div>

          <div class="champ">
            <label for="telephone">Téléphone</label>
            <input
              id="telephone"
              v-model="formulaire.telephone"
              required
              :disabled="!!utilisateurEnEdition"
              placeholder="+243 900 000 000"
            />
          </div>

          <div class="champ">
            <label for="role">Rôle</label>
            <select id="role" v-model="formulaire.role" required>
              <option value="caissier">Caissier</option>
              <option value="pharmacien">Pharmacien</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          <div class="champ">
            <label for="motDePasse">
              {{ utilisateurEnEdition ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe' }}
            </label>
            <input
              id="motDePasse"
              v-model="formulaire.motDePasse"
              type="password"
              :required="!utilisateurEnEdition"
              minlength="8"
            />
          </div>

          <div v-if="utilisateurEnEdition" class="champ champ--case">
            <label>
              <input type="checkbox" v-model="formulaire.actif" />
              Compte actif
            </label>
          </div>

          <div class="actions-modale">
            <button type="button" class="bouton bouton--secondaire" @click="fermerModale">Annuler</button>
            <button type="submit" class="bouton bouton--primaire" :disabled="envoiEnCours">
              {{ envoiEnCours ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { useUtilisateursStore } from '../stores/utilisateursStore.js';
import { useAuthStore } from '../stores/authStore.js';

const store = useUtilisateursStore();
const authStore = useAuthStore();

const modaleOuverte = ref(false);
const utilisateurEnEdition = ref(null);
const erreurFormulaire = ref('');
const envoiEnCours = ref(false);

const formulaire = reactive({
  nom: '',
  telephone: '',
  role: 'caissier',
  motDePasse: '',
  actif: true,
});

onMounted(() => store.charger());

function libelleRole(role) {
  return { admin: 'Administrateur', pharmacien: 'Pharmacien', caissier: 'Caissier' }[role] || role;
}

function formaterDate(date) {
  if (!date) return 'Jamais';
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ouvrirCreation() {
  utilisateurEnEdition.value = null;
  Object.assign(formulaire, { nom: '', telephone: '', role: 'caissier', motDePasse: '', actif: true });
  erreurFormulaire.value = '';
  modaleOuverte.value = true;
}

function ouvrirModification(u) {
  utilisateurEnEdition.value = u;
  Object.assign(formulaire, { nom: u.nom, telephone: u.telephone, role: u.role, motDePasse: '', actif: !!u.actif });
  erreurFormulaire.value = '';
  modaleOuverte.value = true;
}

function fermerModale() {
  modaleOuverte.value = false;
}

async function soumettre() {
  envoiEnCours.value = true;
  erreurFormulaire.value = '';

  try {
    if (utilisateurEnEdition.value) {
      const payload = { nom: formulaire.nom, role: formulaire.role, actif: formulaire.actif };
      if (formulaire.motDePasse) payload.motDePasse = formulaire.motDePasse;
      await store.modifier(utilisateurEnEdition.value.id, payload);
    } else {
      await store.creer({
        nom: formulaire.nom,
        telephone: formulaire.telephone,
        role: formulaire.role,
        motDePasse: formulaire.motDePasse,
      });
    }
    modaleOuverte.value = false;
  } catch (err) {
    erreurFormulaire.value = err.response?.data?.erreur || "Une erreur est survenue. Vérifiez votre connexion.";
  } finally {
    envoiEnCours.value = false;
  }
}

async function confirmerSuppression(u) {
  if (confirm(`Désactiver le compte de ${u.nom} ? Il ne pourra plus se connecter.`)) {
    await store.supprimer(u.id);
  }
}
</script>

<style scoped>
.entete-vue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--espace-lg);
  gap: var(--espace-md);
  flex-wrap: wrap;
}

.texte-attenue { color: var(--texte-secondaire); }

.cellule-actions {
  display: flex;
  gap: var(--espace-sm);
}

.lien-action {
  background: none;
  border: none;
  color: var(--couleur-primaire);
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0;
}
.lien-action:hover { text-decoration: underline; }
.lien-action--danger { color: var(--couleur-danger); }

.etat-vide {
  text-align: center;
  color: var(--texte-secondaire);
  padding: var(--espace-lg);
}

.fond-modale {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 20, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--espace-md);
  z-index: 50;
}

.modale {
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}

.champ--case label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--texte-principal);
}

.actions-modale {
  display: flex;
  justify-content: flex-end;
  gap: var(--espace-sm);
  margin-top: var(--espace-md);
}
</style>
