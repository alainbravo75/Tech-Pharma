<template>
  <LayoutPrincipal>
    <div class="mise-en-page-caisse">
      <!-- Colonne recherche produits -->
      <div class="colonne-recherche">
        <h1>Caisse</h1>
        <input
          ref="champRecherche"
          v-model="recherche"
          type="search"
          class="champ-recherche-produit"
          placeholder="Rechercher ou scanner un produit..."
          @input="rechercherAvecDelai"
        />

        <p v-if="produitsStore.depuisCache" class="note-cache">
          Catalogue affiché depuis la copie locale (hors ligne).
        </p>

        <div class="liste-resultats">
          <button
            v-for="p in produitsStore.liste"
            :key="p.id"
            class="carte-produit"
            @click="ajouter(p)"
          >
            <div>
              <strong>{{ p.nom }}</strong>
              <div class="sous-texte">{{ p.forme || '' }} {{ p.dosage || '' }}</div>
            </div>
            <div class="prix-produit">
              <span>{{ formaterMontant(p.prix_vente_cdf) }} CDF</span>
              <span class="sous-texte">{{ formaterMontant(p.prix_vente_usd) }} USD</span>
            </div>
            <span
              class="badge-stock"
              :class="classeBadgeStockCaisse(p)"
            >
              {{ p.quantite_totale }}
            </span>
          </button>

          <p v-if="produitsStore.liste.length === 0 && !produitsStore.chargement" class="etat-vide">
            Aucun produit trouvé.
          </p>
        </div>
      </div>

      <!-- Colonne panier -->
      <div class="colonne-panier carte">
        <div class="entete-panier">
          <h2>Panier</h2>
          <div class="bascule-devise">
            <button :class="{ actif: caisseStore.devise === 'CDF' }" @click="caisseStore.devise = 'CDF'">CDF</button>
            <button :class="{ actif: caisseStore.devise === 'USD' }" @click="caisseStore.devise = 'USD'">USD</button>
          </div>
        </div>

        <p v-if="caisseStore.erreur" class="message-erreur">{{ caisseStore.erreur }}</p>

        <div class="lignes-panier">
          <div v-for="l in caisseStore.panier" :key="l.produitId" class="ligne-panier">
            <div class="info-ligne">
              <strong>{{ l.nom }}</strong>
              <span class="sous-texte">{{ formaterMontant(prixLigne(l)) }} {{ caisseStore.devise }} / unité</span>
            </div>
            <div class="controle-quantite">
              <button @click="caisseStore.modifierQuantite(l.produitId, l.quantite - 1)">−</button>
              <span>{{ l.quantite }}</span>
              <button @click="incrementerQuantite(l)">+</button>
            </div>
            <span class="sous-total">{{ formaterMontant(prixLigne(l) * l.quantite) }}</span>
            <button class="retirer-ligne" @click="caisseStore.retirerDuPanier(l.produitId)" aria-label="Retirer">×</button>
          </div>

          <p v-if="caisseStore.panier.length === 0" class="etat-vide">Le panier est vide.</p>
        </div>

        <div class="total-panier">
          <span>Total</span>
          <strong>{{ formaterMontant(caisseStore.total) }} {{ caisseStore.devise }}</strong>
        </div>

        <button
          class="bouton bouton--primaire bouton-valider"
          :disabled="caisseStore.panier.length === 0 || envoiEnCours"
          @click="valider"
        >
          {{ envoiEnCours ? 'Enregistrement...' : 'Valider la vente' }}
        </button>

        <p class="note-offline">
          La vente est enregistrée immédiatement, même hors ligne — elle sera synchronisée automatiquement.
        </p>
      </div>
    </div>

    <!-- Confirmation de vente -->
    <div v-if="venteConfirmee" class="fond-modale" @click.self="fermerConfirmation">
      <div class="carte modale-confirmation">
        <div class="icone-succes">✓</div>
        <h2>Vente enregistrée</h2>
        <p class="sous-titre-modale">
          {{ formaterMontant(venteConfirmee.total) }} {{ venteConfirmee.devise }} — {{ venteConfirmee.lignes.length }} article(s)
        </p>
        <ul class="recap-lignes">
          <li v-for="l in venteConfirmee.lignes" :key="l.produitId">
            {{ l.quantite }} × {{ l.nom }}
          </li>
        </ul>

        <div class="bloc-recu">
          <label for="telephoneRecu">Envoyer le reçu au client (optionnel)</label>
          <input
            id="telephoneRecu"
            v-model="telephoneRecu"
            type="tel"
            placeholder="+243 900 000 000"
          />

          <p v-if="messageEnvoiRecu" class="message-envoi" :class="{ 'message-envoi--erreur': erreurEnvoiRecu }">
            {{ messageEnvoiRecu }}
          </p>

          <div class="actions-recu">
            <button
              class="bouton bouton--secondaire bouton-whatsapp"
              :disabled="!telephoneRecu"
              @click="envoyerParWhatsApp"
            >
              WhatsApp
            </button>
            <button
              class="bouton bouton--secondaire"
              :disabled="!telephoneRecu || !smsDisponible || envoiSmsEnCours"
              :title="!smsDisponible ? 'Service SMS non configuré ou hors ligne' : ''"
              @click="envoyerParSms"
            >
              {{ envoiSmsEnCours ? 'Envoi...' : 'SMS' }}
            </button>
          </div>
        </div>

        <button class="bouton bouton--primaire" @click="fermerConfirmation">Nouvelle vente</button>
      </div>
    </div>

    <!-- Historique du jour -->
    <div class="carte historique-jour">
      <h2>Ventes du jour ({{ caisseStore.ventesDuJourListe.length }})</h2>
      <table v-if="caisseStore.ventesDuJourListe.length > 0" class="tableau-carte">
        <thead>
          <tr>
            <th>Heure</th>
            <th>Produits</th>
            <th>Total</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in caisseStore.ventesDuJourListe" :key="v.id">
            <td data-label="Heure">{{ formaterHeure(v.createdAt) }}</td>
            <td data-label="Produits">{{ resumeArticles(v.lignes) }}</td>
            <td data-label="Total">{{ formaterMontant(v.total) }} {{ v.devise }}</td>
            <td data-label="Statut">
              <span
                class="badge"
                :class="v.statutSync === 'synced' ? 'badge--admin' : 'badge--caissier'"
                :title="v.statutSync === 'erreur' ? (v.derniereErreur || '') : ''"
              >
                {{ v.statutSync === 'synced' ? 'Synchronisée' : v.statutSync === 'erreur' ? 'Erreur' : 'En attente' }}
              </span>
            </td>
            <td>
              <button
                v-if="v.statutSync === 'erreur'"
                class="lien-action"
                :disabled="reessaiEnCours"
                @click="reessayerSync"
              >
                Réessayer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="etat-vide">Aucune vente enregistrée aujourd'hui.</p>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { useProduitsStore } from '../stores/produitsStore.js';
import { useCaisseStore } from '../stores/caisseStore.js';
import { genererTexteRecu, construireLienWhatsApp } from '../services/recu.js';
import { obtenirStatutSms, envoyerRecuSms } from '../services/ventesApi.js';
import { statutReseau } from '../sync/syncStatus.js';
import { synchroniserVentes } from '../sync/syncEngine.js';

const produitsStore = useProduitsStore();
const caisseStore = useCaisseStore();

const recherche = ref('');
const champRecherche = ref(null);
let delaiRecherche = null;
const envoiEnCours = ref(false);
const venteConfirmee = ref(null);
const telephoneRecu = ref('');
const smsDisponible = ref(false);
const envoiSmsEnCours = ref(false);
const messageEnvoiRecu = ref('');
const erreurEnvoiRecu = ref(false);
const reessaiEnCours = ref(false);

async function reessayerSync() {
  reessaiEnCours.value = true;
  try {
    await synchroniserVentes();
    await caisseStore.chargerVentesDuJour();
  } finally {
    reessaiEnCours.value = false;
  }
}

onMounted(async () => {
  await Promise.all([produitsStore.charger(), caisseStore.initialiser()]);
  nextTick(() => champRecherche.value?.focus());
  rafraichirStatutSms();
});

async function rafraichirStatutSms() {
  if (statutReseau.value !== 'en_ligne') {
    smsDisponible.value = false;
    return;
  }
  try {
    smsDisponible.value = await obtenirStatutSms();
  } catch {
    smsDisponible.value = false;
  }
}

function rechercherAvecDelai() {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(() => produitsStore.charger(recherche.value), 300);
}

function classeBadgeStockCaisse(p) {
  if (p.quantite_totale <= 0) return 'badge-stock--epuise';
  if (p.quantite_totale <= (p.seuil_stock_faible ?? 10)) return 'badge-stock--faible';
  return '';
}

function ajouter(produit) {
  // Blocage strict : impossible d'ajouter plus que le stock réellement
  // disponible. Contrairement à la tolérance de stock négatif côté
  // serveur (qui concerne uniquement la réconciliation d'une vente déjà
  // faite hors ligne), ici la quantité est connue en temps réel - vendre
  // au-delà n'a pas de sens et créait de la confusion.
  if (produit.quantite_totale <= 0) {
    alert(`"${produit.nom}" n'a plus de stock disponible. Impossible de l'ajouter à la vente.`);
    return;
  }

  const ligneExistante = caisseStore.panier.find((l) => l.produitId === produit.id);
  const quantiteDejaDansPanier = ligneExistante ? ligneExistante.quantite : 0;
  if (quantiteDejaDansPanier + 1 > produit.quantite_totale) {
    alert(`Stock insuffisant : il ne reste que ${produit.quantite_totale} unité(s) de "${produit.nom}".`);
    return;
  }

  caisseStore.ajouterAuPanier(produit);
  recherche.value = '';
  produitsStore.charger();
  champRecherche.value?.focus();
}

function incrementerQuantite(ligne) {
  const stockConnu = ligne.stockDisponible;
  if (stockConnu != null && ligne.quantite + 1 > stockConnu) {
    alert(`Stock insuffisant : il ne reste que ${stockConnu} unité(s) de "${ligne.nom}".`);
    return;
  }
  caisseStore.modifierQuantite(ligne.produitId, ligne.quantite + 1);
}

function prixLigne(l) {
  return caisseStore.devise === 'CDF' ? l.prixCdf : l.prixUsd;
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(montant || 0);
}

function formaterHeure(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function resumeArticles(lignes) {
  return lignes.map((l) => `${l.quantite}× ${l.nom}`).join(', ');
}

async function valider() {
  envoiEnCours.value = true;
  caisseStore.erreur = null;
  try {
    const vente = await caisseStore.validerVente();
    if (vente) {
      venteConfirmee.value = vente;
      telephoneRecu.value = '';
      messageEnvoiRecu.value = '';
      erreurEnvoiRecu.value = false;
      rafraichirStatutSms();
    }
  } finally {
    envoiEnCours.value = false;
  }
}

function fermerConfirmation() {
  venteConfirmee.value = null;
}

function envoyerParWhatsApp() {
  const texte = genererTexteRecu(venteConfirmee.value);
  const lien = construireLienWhatsApp(telephoneRecu.value, texte);
  window.open(lien, '_blank', 'noopener');
}

async function envoyerParSms() {
  envoiSmsEnCours.value = true;
  messageEnvoiRecu.value = '';
  erreurEnvoiRecu.value = false;
  try {
    await envoyerRecuSms(venteConfirmee.value.id, telephoneRecu.value);
    messageEnvoiRecu.value = 'Reçu envoyé par SMS.';
  } catch (err) {
    erreurEnvoiRecu.value = true;
    messageEnvoiRecu.value =
      err.response?.data?.erreur || "Échec de l'envoi. La vente doit être synchronisée pour envoyer un SMS.";
  } finally {
    envoiSmsEnCours.value = false;
  }
}
</script>

<style scoped>
.mise-en-page-caisse {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: var(--espace-lg);
  align-items: start;
}

.champ-recherche-produit {
  width: 100%;
  padding: 0.9rem 1rem;
  font-size: 1.05rem;
  border: 1.5px solid var(--bordure);
  border-radius: var(--rayon);
  margin: var(--espace-sm) 0 var(--espace-md);
}

.note-cache {
  font-size: 0.82rem;
  color: var(--couleur-avertissement);
  margin-bottom: var(--espace-sm);
}

.liste-resultats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 65vh;
  overflow-y: auto;
}

.carte-produit {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--espace-md);
  background: var(--fond-carte);
  border: 1px solid var(--bordure);
  border-radius: var(--rayon);
  padding: var(--espace-sm) var(--espace-md);
  text-align: left;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.carte-produit:hover { border-color: var(--couleur-primaire); background: var(--couleur-primaire-claire); }

.sous-texte { font-size: 0.8rem; color: var(--texte-secondaire); }

.prix-produit { display: flex; flex-direction: column; align-items: flex-end; font-weight: 600; font-size: 0.9rem; }

.badge-stock {
  background: var(--fond-neutre);
  color: var(--texte-neutre);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  min-width: 2rem;
  text-align: center;
}
.badge-stock--faible { background: #fef3e2; color: #92400e; }
.badge-stock--epuise { background: #fdecea; color: #b3261e; font-weight: 700; }

.colonne-panier {
  position: sticky;
  top: var(--espace-lg);
  display: flex;
  flex-direction: column;
}

.entete-panier {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--espace-md);
}

.bascule-devise {
  display: flex;
  background: var(--fond-neutre);
  border-radius: 999px;
  padding: 3px;
}
.bascule-devise button {
  border: none;
  background: none;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--texte-secondaire);
}
.bascule-devise button.actif {
  background: var(--couleur-primaire);
  color: #fff;
}

.lignes-panier {
  display: flex;
  flex-direction: column;
  gap: var(--espace-sm);
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: var(--espace-md);
}

.ligne-panier {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--espace-sm);
  padding-bottom: var(--espace-sm);
  border-bottom: 1px solid var(--bordure);
}

.info-ligne { display: flex; flex-direction: column; }

.controle-quantite {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--fond-neutre);
  border-radius: var(--rayon);
  padding: 0.15rem;
}
.controle-quantite button {
  border: none;
  background: #fff;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-weight: 700;
  box-shadow: var(--ombre);
}
.controle-quantite span { min-width: 1.4rem; text-align: center; font-weight: 600; font-size: 0.9rem; }

.sous-total { font-weight: 700; font-size: 0.9rem; min-width: 4.5rem; text-align: right; }

.retirer-ligne {
  border: none;
  background: none;
  color: var(--couleur-danger);
  font-size: 1.2rem;
  line-height: 1;
  padding: 0.2rem;
}

.total-panier {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.15rem;
  padding: var(--espace-md) 0;
  border-top: 2px solid var(--bordure);
}

.bouton-valider {
  width: 100%;
  padding: 0.9rem;
  font-size: 1.05rem;
}

.note-offline {
  font-size: 0.78rem;
  color: var(--texte-secondaire);
  text-align: center;
  margin: var(--espace-sm) 0 0;
}

.etat-vide { color: var(--texte-secondaire); text-align: center; padding: var(--espace-md); }

.fond-modale {
  position: fixed; inset: 0;
  background: rgba(15, 23, 20, 0.5);
  display: flex; align-items: center; justify-content: center;
  padding: var(--espace-md);
  z-index: 60;
}

.modale-confirmation {
  width: 100%;
  max-width: 380px;
  text-align: center;
}

.icone-succes {
  width: 56px; height: 56px;
  margin: 0 auto var(--espace-sm);
  border-radius: 50%;
  background: #e6f5ea;
  color: var(--couleur-succes);
  font-size: 1.6rem;
  display: flex; align-items: center; justify-content: center;
}

.sous-titre-modale { color: var(--texte-secondaire); margin-bottom: var(--espace-md); }

.recap-lignes {
  text-align: left;
  font-size: 0.9rem;
  background: var(--fond-neutre);
  border-radius: var(--rayon);
  padding: var(--espace-sm) var(--espace-md);
  margin-bottom: var(--espace-md);
}

.bloc-recu {
  text-align: left;
  border-top: 1px solid var(--bordure);
  padding-top: var(--espace-md);
  margin-bottom: var(--espace-md);
}

.bloc-recu label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--texte-secondaire);
  margin-bottom: 0.4rem;
}

.bloc-recu input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1.5px solid var(--bordure);
  border-radius: var(--rayon);
  font-size: 0.95rem;
  margin-bottom: var(--espace-sm);
}

.actions-recu {
  display: flex;
  gap: var(--espace-sm);
}
.actions-recu .bouton { flex: 1; }

.bouton-whatsapp:not(:disabled) {
  background: #e7f8ee;
  color: #1a7d43;
}
.bouton-whatsapp:not(:disabled):hover { background: #d3f2df; }

.message-envoi {
  font-size: 0.82rem;
  color: var(--couleur-succes);
  margin-bottom: var(--espace-sm);
}
.message-envoi--erreur { color: var(--couleur-danger); }

.historique-jour { margin-top: var(--espace-lg); }
.historique-jour h2 { font-size: 1.05rem; margin-bottom: var(--espace-md); }
.historique-jour td:nth-child(2) { max-width: 320px; font-size: 0.88rem; color: var(--texte-secondaire); }

@media (max-width: 900px) {
  .mise-en-page-caisse { grid-template-columns: 1fr; }
  .colonne-panier { position: static; }
}
</style>
