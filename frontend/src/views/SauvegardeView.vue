<template>
  <LayoutPrincipal>
    <div class="entete-vue">
      <div>
        <h1>Sauvegardes</h1>
        <p class="texte-attenue">Toute la pharmacie repose sur ce fichier — pense à en garder une copie ailleurs (clé USB, cloud) régulièrement.</p>
      </div>
      <button class="bouton bouton--primaire" :disabled="creationEnCours" @click="creer">
        {{ creationEnCours ? 'Création...' : '+ Créer une sauvegarde maintenant' }}
      </button>
    </div>

    <p v-if="erreur" class="message-erreur" role="alert">{{ erreur }}</p>
    <p v-if="messageSucces" class="message-succes">{{ messageSucces }}</p>

    <div class="carte carte-conseil">
      <strong>Conseil</strong>
      <p>
        Une sauvegarde automatique est conservée ici à chaque fois que tu cliques sur le bouton
        ci-dessus (les 14 plus récentes sont gardées, les plus anciennes sont supprimées
        automatiquement). Mais ce fichier reste sur ce même ordinateur : en cas de panne ou de vol,
        il serait perdu avec le reste.
        <template v-if="emailDisponible">
          Utilise <strong>"Envoyer par email"</strong> pour recevoir une copie hors site directement
          dans ta boîte mail, peu importe l'appareil (PC ou téléphone) que tu utilises pour déclencher
          l'envoi.
        </template>
        <template v-else>
          <strong>Télécharge régulièrement la dernière sauvegarde</strong> et garde une copie sur une
          clé USB ou un espace cloud. L'envoi automatique par email n'est pas configuré sur ce serveur
          (variables SMTP absentes du fichier .env) — une fois configuré, ce serait plus simple,
          surtout depuis un téléphone.
        </template>
      </p>
    </div>

    <div class="carte">
      <table class="tableau-carte">
        <thead>
          <tr>
            <th>Fichier</th>
            <th>Créée le</th>
            <th>Taille</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sauvegardes" :key="s.nomFichier">
            <td data-label="Fichier">{{ s.nomFichier }}</td>
            <td data-label="Créée le">{{ formaterDate(s.creeLe) }}</td>
            <td data-label="Taille">{{ formaterTaille(s.tailleOctets) }}</td>
            <td class="cellule-actions">
              <button class="lien-action" @click="telecharger(s.nomFichier)">Télécharger</button>
              <button
                class="lien-action"
                :disabled="!emailDisponible || envoiEmailEnCours === s.nomFichier"
                :title="!emailDisponible ? 'Service email non configuré' : ''"
                @click="envoyerEmail(s.nomFichier)"
              >
                {{ envoiEmailEnCours === s.nomFichier ? 'Envoi...' : 'Envoyer par email' }}
              </button>
            </td>
          </tr>
          <tr v-if="sauvegardes.length === 0 && !chargement">
            <td colspan="4" class="etat-vide">Aucune sauvegarde pour le moment. Crée la première ci-dessus.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import {
  listerSauvegardes,
  creerSauvegarde,
  telechargerSauvegarde,
  obtenirStatutEmailSauvegarde,
  envoyerSauvegardeParEmail,
} from '../services/sauvegardeApi.js';

const sauvegardes = ref([]);
const chargement = ref(false);
const creationEnCours = ref(false);
const erreur = ref('');
const messageSucces = ref('');
const emailDisponible = ref(false);
const envoiEmailEnCours = ref(null); // nom du fichier en cours d'envoi, ou null

async function charger() {
  chargement.value = true;
  erreur.value = '';
  try {
    sauvegardes.value = await listerSauvegardes();
  } catch (err) {
    erreur.value = err.response?.data?.erreur || 'Impossible de charger les sauvegardes (connexion requise).';
  } finally {
    chargement.value = false;
  }
}

async function rafraichirStatutEmail() {
  try {
    emailDisponible.value = await obtenirStatutEmailSauvegarde();
  } catch {
    emailDisponible.value = false;
  }
}

async function creer() {
  creationEnCours.value = true;
  erreur.value = '';
  messageSucces.value = '';
  try {
    await creerSauvegarde();
    messageSucces.value = 'Sauvegarde créée avec succès.';
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.erreur || 'Échec de la création (connexion requise).';
  } finally {
    creationEnCours.value = false;
  }
}

async function telecharger(nomFichier) {
  try {
    await telechargerSauvegarde(nomFichier);
  } catch {
    erreur.value = 'Échec du téléchargement.';
  }
}

async function envoyerEmail(nomFichier) {
  envoiEmailEnCours.value = nomFichier;
  erreur.value = '';
  messageSucces.value = '';
  try {
    await envoyerSauvegardeParEmail(nomFichier);
    messageSucces.value = `Sauvegarde envoyée par email (${nomFichier}).`;
  } catch (err) {
    erreur.value = err.response?.data?.erreur || "Échec de l'envoi par email.";
  } finally {
    envoiEmailEnCours.value = null;
  }
}

function formaterDate(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function formaterTaille(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

onMounted(() => {
  charger();
  rafraichirStatutEmail();
});
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

.texte-attenue { color: var(--texte-secondaire); max-width: 60ch; }

.message-succes {
  background: #e7f8ee;
  color: var(--couleur-succes);
  border-radius: var(--rayon);
  padding: var(--espace-sm) var(--espace-md);
  font-size: 0.9rem;
  margin-bottom: var(--espace-md);
}

.carte-conseil {
  background: #fff8f0;
  border: 1px solid #f4d9a8;
  margin-bottom: var(--espace-lg);
  font-size: 0.88rem;
}
.carte-conseil strong { color: #92400e; }
.carte-conseil p { margin: 0.4rem 0 0; color: #78500f; }

.cellule-actions {
  display: flex;
  gap: var(--espace-md);
  flex-wrap: wrap;
}

.lien-action {
  background: none;
  border: none;
  color: var(--couleur-primaire);
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0;
}
.lien-action:hover { text-decoration: underline; }
.lien-action:disabled {
  color: var(--texte-secondaire);
  cursor: not-allowed;
  text-decoration: none;
}

.etat-vide { text-align: center; color: var(--texte-secondaire); padding: var(--espace-lg); }
</style>
