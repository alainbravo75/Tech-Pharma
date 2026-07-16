<template>
  <LayoutPrincipal>
    <div class="entete-vue">
      <div>
        <h1>Stock</h1>
        <p class="texte-attenue">Produits, lots et alertes de péremption.</p>
      </div>
      <button
        v-if="authStore.utilisateur?.role !== 'caissier'"
        class="bouton bouton--primaire"
        @click="ouvrirCreationProduit"
      >
        + Nouveau produit
      </button>
    </div>

    <!-- Bandeau d'alertes -->
    <div v-if="totalAlertes > 0" class="bandeau-alertes">
      <button class="bascule-alertes" @click="alertesOuvertes = !alertesOuvertes">
        <span class="pastille-alerte"></span>
        {{ totalAlertes }} alerte{{ totalAlertes > 1 ? 's' : '' }} à examiner
        <span class="chevron" :class="{ 'chevron--ouvert': alertesOuvertes }">▾</span>
      </button>

      <div v-if="alertesOuvertes" class="detail-alertes">
        <div v-if="produitsStore.alertes.expires.length" class="groupe-alerte groupe-alerte--danger">
          <h3>Produits expirés</h3>
          <ul>
            <li v-for="a in produitsStore.alertes.expires" :key="a.lot.id">
              {{ a.produit.nom }} — lot {{ a.lot.numero_lot || '(sans n°)' }},
              {{ a.lot.quantite }} unités, expiré le {{ formaterDate(a.lot.date_peremption) }}
            </li>
          </ul>
        </div>
        <div v-if="produitsStore.alertes.peremptionProche.length" class="groupe-alerte groupe-alerte--avertissement">
          <h3>Péremption proche (&lt; 60 jours)</h3>
          <ul>
            <li v-for="a in produitsStore.alertes.peremptionProche" :key="a.lot.id">
              {{ a.produit.nom }} — lot {{ a.lot.numero_lot || '(sans n°)' }},
              {{ a.lot.quantite }} unités, expire le {{ formaterDate(a.lot.date_peremption) }}
            </li>
          </ul>
        </div>
        <div v-if="produitsEnStockFaible.length" class="groupe-alerte groupe-alerte--info">
          <h3>Stock faible</h3>
          <ul>
            <li v-for="p in produitsEnStockFaible" :key="p.id">
              {{ p.nom }} — {{ p.quantite_totale }} restant(s) (seuil : {{ p.seuil_stock_faible }})
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="barre-recherche">
      <input
        v-model="recherche"
        type="search"
        placeholder="Rechercher un produit (nom, code-barre, fabricant)..."
        @input="rechercherAvecDelai"
      />
    </div>

    <p v-if="produitsStore.erreur" class="message-erreur" role="alert">{{ produitsStore.erreur }}</p>

    <div class="carte">
      <table class="tableau-carte">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Forme / dosage</th>
            <th>Stock</th>
            <th>Prix vente</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in produitsStore.liste" :key="p.id">
            <td data-label="Produit">
              <button class="nom-produit-clickable" @click="ouvrirDetail(p)">{{ p.nom }}</button>
              <div class="sous-texte">{{ p.fabricant || '—' }}</div>
            </td>
            <td data-label="Forme / dosage">{{ p.forme || '—' }}<span v-if="p.dosage"> · {{ p.dosage }}</span></td>
            <td data-label="Stock">
              <span class="badge" :class="p.quantite_totale <= p.seuil_stock_faible ? 'badge--inactif' : 'badge--admin'">
                {{ p.quantite_totale }}
              </span>
            </td>
            <td data-label="Prix vente">{{ formaterMontant(p.prix_vente_cdf) }} CDF<br /><span class="sous-texte">{{ formaterMontant(p.prix_vente_usd) }} USD</span></td>
            <td class="cellule-actions">
              <button class="lien-action" @click="ouvrirDetail(p)">Détails</button>
              <button class="lien-action" @click="ouvrirEntreeStock(p)">+ Stock</button>
              <button class="lien-action" @click="ouvrirAjustement(p)">Ajuster</button>
              <button v-if="authStore.utilisateur?.role !== 'caissier'" class="lien-action" @click="ouvrirModificationProduit(p)">Modifier</button>
              <button v-if="authStore.estAdmin" class="lien-action lien-action--danger" @click="confirmerSuppression(p)">Suppr.</button>
            </td>
          </tr>
          <tr v-if="produitsStore.liste.length === 0 && !produitsStore.chargement">
            <td colspan="5" class="etat-vide">Aucun produit trouvé.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modale création/modification produit -->
    <div v-if="modaleProduitOuverte" class="fond-modale" @click.self="modaleProduitOuverte = false">
      <div class="carte modale">
        <h2>{{ produitEnEdition ? 'Modifier' : 'Nouveau' }} produit</h2>
        <p v-if="erreurFormulaire" class="message-erreur">{{ erreurFormulaire }}</p>

        <form @submit.prevent="soumettreProduit">
          <div class="champ">
            <label for="nom">Nom</label>
            <input id="nom" v-model="formProduit.nom" required />
          </div>
          <div class="ligne-champs">
            <div class="champ">
              <label for="forme">Forme</label>
              <input id="forme" v-model="formProduit.forme" placeholder="Comprimé, sirop..." />
            </div>
            <div class="champ">
              <label for="dosage">Dosage</label>
              <input id="dosage" v-model="formProduit.dosage" placeholder="500mg" />
            </div>
          </div>
          <div class="champ">
            <label for="fabricant">Fabricant</label>
            <input id="fabricant" v-model="formProduit.fabricant" />
          </div>
          <div class="champ">
            <label for="codeBarre">Code-barres</label>
            <input id="codeBarre" v-model="formProduit.codeBarre" />
          </div>

          <template v-if="authStore.estAdmin">
            <div class="ligne-champs">
              <div class="champ">
                <label for="prixAchat">Prix d'achat (CDF)</label>
                <input id="prixAchat" v-model.number="formProduit.prixAchatCdf" type="number" min="0" step="1" />
              </div>
              <div class="champ">
                <label for="prixVenteCdf">Prix de vente (CDF)</label>
                <input id="prixVenteCdf" v-model.number="formProduit.prixVenteCdf" type="number" min="0" step="1" />
              </div>
            </div>
            <div class="champ">
              <label for="prixVenteUsd">Prix de vente (USD)</label>
              <input id="prixVenteUsd" v-model.number="formProduit.prixVenteUsd" type="number" min="0" step="0.01" />
            </div>
          </template>
          <p v-else class="note-permission">Seul un administrateur peut définir les prix.</p>

          <div class="champ">
            <label for="seuil">Seuil de stock faible</label>
            <input id="seuil" v-model.number="formProduit.seuilStockFaible" type="number" min="0" step="1" />
          </div>

          <template v-if="!produitEnEdition">
            <hr class="separateur-formulaire" />
            <p class="note-permission">
              Stock initial (optionnel) — ajoute directement un premier lot à la création, sans repasser par "+ Stock" juste après.
            </p>
            <div class="champ">
              <label for="quantiteInitiale">Quantité reçue</label>
              <input id="quantiteInitiale" v-model.number="formProduit.quantiteInitiale" type="number" min="0" step="1" />
            </div>
            <div class="champ" v-if="formProduit.quantiteInitiale > 0">
              <label for="datePeremptionInitiale">Date de péremption</label>
              <input id="datePeremptionInitiale" v-model="formProduit.datePeremptionInitiale" type="date" required />
            </div>
            <div class="ligne-champs" v-if="formProduit.quantiteInitiale > 0">
              <div class="champ">
                <label for="numeroLotInitial">N° de lot (optionnel)</label>
                <input id="numeroLotInitial" v-model="formProduit.numeroLotInitial" />
              </div>
              <div class="champ">
                <label for="fournisseurInitial">Fournisseur (optionnel)</label>
                <input id="fournisseurInitial" v-model="formProduit.fournisseurInitial" />
              </div>
            </div>
          </template>

          <div class="actions-modale">
            <button type="button" class="bouton bouton--secondaire" @click="modaleProduitOuverte = false">Annuler</button>
            <button type="submit" class="bouton bouton--primaire" :disabled="envoiEnCours">
              {{ envoiEnCours ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale entrée de stock -->
    <div v-if="modaleEntreeOuverte" class="fond-modale" @click.self="modaleEntreeOuverte = false">
      <div class="carte modale">
        <h2>Réception de stock</h2>
        <p class="sous-titre-modale">{{ produitCible?.nom }}</p>
        <p v-if="erreurFormulaire" class="message-erreur">{{ erreurFormulaire }}</p>

        <form @submit.prevent="soumettreEntree">
          <div class="champ">
            <label for="quantite">Quantité reçue</label>
            <input id="quantite" v-model.number="formEntree.quantite" type="number" min="1" step="1" required />
          </div>
          <div class="champ">
            <label for="datePeremption">Date de péremption</label>
            <input id="datePeremption" v-model="formEntree.datePeremption" type="date" required />
          </div>
          <div class="champ">
            <label for="numeroLot">Numéro de lot (optionnel)</label>
            <input id="numeroLot" v-model="formEntree.numeroLot" />
          </div>
          <div class="champ">
            <label for="fournisseur">Fournisseur (optionnel)</label>
            <input id="fournisseur" v-model="formEntree.fournisseur" />
          </div>

          <div class="actions-modale">
            <button type="button" class="bouton bouton--secondaire" @click="modaleEntreeOuverte = false">Annuler</button>
            <button type="submit" class="bouton bouton--primaire" :disabled="envoiEnCours">
              {{ envoiEnCours ? 'Enregistrement...' : 'Ajouter au stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modale détail produit (fiche + historique des lots) -->
    <div v-if="modaleDetailOuverte" class="fond-modale" @click.self="modaleDetailOuverte = false">
      <div class="carte modale modale--large">
        <h2>{{ detailProduit?.produit?.nom }}</h2>
        <p class="sous-titre-modale">
          {{ detailProduit?.produit?.forme || '—' }}<span v-if="detailProduit?.produit?.dosage"> · {{ detailProduit.produit.dosage }}</span>
          <span v-if="detailProduit?.produit?.fabricant"> · {{ detailProduit.produit.fabricant }}</span>
        </p>

        <div class="grille-fiche">
          <div>
            <span class="etiquette-fiche">Stock total</span>
            <strong>{{ quantiteTotaleDetail }} unité(s)</strong>
          </div>
          <div>
            <span class="etiquette-fiche">Code-barres</span>
            <strong>{{ detailProduit?.produit?.code_barre || '—' }}</strong>
          </div>
          <div>
            <span class="etiquette-fiche">Prix vente</span>
            <strong>{{ formaterMontant(detailProduit?.produit?.prix_vente_cdf) }} CDF / {{ formaterMontant(detailProduit?.produit?.prix_vente_usd) }} USD</strong>
          </div>
          <div>
            <span class="etiquette-fiche">Seuil stock faible</span>
            <strong>{{ detailProduit?.produit?.seuil_stock_faible }}</strong>
          </div>
        </div>

        <h3 class="titre-section">Historique des lots</h3>
        <div class="tableau-scroll">
          <table class="tableau-carte">
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Date d'achat</th>
                <th>Date péremption</th>
                <th>Quantité</th>
                <th>Fournisseur</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lot in detailProduit?.lots || []" :key="lot.id">
                <td data-label="N° lot">{{ lot.numero_lot || '—' }}</td>
                <td data-label="Date d'achat">{{ formaterDate(lot.date_reception) }}</td>
                <td data-label="Date péremption">{{ formaterDate(lot.date_peremption) }}</td>
                <td data-label="Quantité">{{ lot.quantite }}</td>
                <td data-label="Fournisseur">{{ lot.fournisseur || '—' }}</td>
                <td data-label="Statut">
                  <span class="badge" :class="classeBadgeStatutLot(lot)">{{ libelleStatutLot(lot) }}</span>
                </td>
              </tr>
              <tr v-if="!detailProduit?.lots?.length">
                <td colspan="6" class="etat-vide">Aucun lot enregistré pour ce produit.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="actions-modale">
          <button type="button" class="bouton bouton--secondaire" @click="modaleDetailOuverte = false">Fermer</button>
          <button
            v-if="authStore.utilisateur?.role !== 'caissier'"
            type="button"
            class="bouton bouton--primaire"
            @click="modaleDetailOuverte = false; ouvrirEntreeStock(detailProduit.produit)"
          >
            + Ajouter un lot
          </button>
        </div>
      </div>
    </div>

    <!-- Modale ajustement -->
    <div v-if="modaleAjustementOuverte" class="fond-modale" @click.self="modaleAjustementOuverte = false">
      <div class="carte modale">
        <h2>Ajustement de stock</h2>
        <p class="sous-titre-modale">{{ produitCible?.nom }}</p>
        <p v-if="erreurFormulaire" class="message-erreur">{{ erreurFormulaire }}</p>

        <form @submit.prevent="soumettreAjustement">
          <div class="champ">
            <label for="lot">Lot concerné</label>
            <select id="lot" v-model="formAjustement.lotId" required>
              <option value="" disabled>Choisir un lot...</option>
              <option v-for="lot in lotsCible" :key="lot.id" :value="lot.id">
                {{ lot.numero_lot || '(sans n°)' }} — {{ lot.quantite }} unités — exp. {{ formaterDate(lot.date_peremption) }}
              </option>
            </select>
          </div>
          <div class="champ">
            <label for="typeAjustement">Type</label>
            <select id="typeAjustement" v-model="formAjustement.type" required>
              <option value="perte">Perte / casse</option>
              <option value="retour">Retour</option>
              <option value="ajustement">Correction d'inventaire</option>
            </select>
          </div>
          <div class="champ">
            <label for="quantiteAjustement">
              Quantité ({{ formAjustement.type === 'perte' ? 'sera soustraite' : 'peut être positive ou négative' }})
            </label>
            <input
              id="quantiteAjustement"
              v-model.number="quantiteAjustementSaisie"
              type="number"
              step="1"
              required
            />
          </div>

          <div class="actions-modale">
            <button type="button" class="bouton bouton--secondaire" @click="modaleAjustementOuverte = false">Annuler</button>
            <button type="submit" class="bouton bouton--primaire" :disabled="envoiEnCours">
              {{ envoiEnCours ? 'Enregistrement...' : 'Confirmer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </LayoutPrincipal>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { useProduitsStore } from '../stores/produitsStore.js';
import { useAuthStore } from '../stores/authStore.js';

const produitsStore = useProduitsStore();
const authStore = useAuthStore();

const recherche = ref('');
let delaiRecherche = null;
const alertesOuvertes = ref(false);

const modaleProduitOuverte = ref(false);
const modaleEntreeOuverte = ref(false);
const modaleAjustementOuverte = ref(false);
const modaleDetailOuverte = ref(false);
const detailProduit = ref(null);
const produitEnEdition = ref(null);
const produitCible = ref(null);
const lotsCible = ref([]);
const erreurFormulaire = ref('');
const envoiEnCours = ref(false);

const formProduit = reactive({
  nom: '', forme: '', dosage: '', fabricant: '', codeBarre: '',
  prixAchatCdf: 0, prixVenteCdf: 0, prixVenteUsd: 0, seuilStockFaible: 10,
  quantiteInitiale: null, datePeremptionInitiale: '', numeroLotInitial: '', fournisseurInitial: '',
});

const formEntree = reactive({ quantite: null, datePeremption: '', numeroLot: '', fournisseur: '' });
const formAjustement = reactive({ lotId: '', type: 'perte', quantite: 0 });

// Pour "perte", l'utilisateur saisit un nombre positif à l'écran mais on
// l'envoie négatif au serveur ; pour "retour"/"ajustement" la valeur peut
// déjà être négative si saisie ainsi.
const quantiteAjustementSaisie = computed({
  get: () => (formAjustement.type === 'perte' ? Math.abs(formAjustement.quantite) : formAjustement.quantite),
  set: (val) => { formAjustement.quantite = formAjustement.type === 'perte' ? -Math.abs(val) : val; },
});

const totalAlertes = computed(() =>
  produitsEnStockFaible.value.length +
  produitsStore.alertes.peremptionProche.length +
  produitsStore.alertes.expires.length
);

// Calculé directement à partir de la liste des produits déjà chargée
// (fiable, on sait qu'elle est à jour puisque la pastille de la colonne
// Stock utilise la même donnée) plutôt que via un second appel réseau
// séparé - celui-ci pouvait échouer silencieusement sur une connexion
// instable, laissant le bandeau vide sans que personne ne s'en aperçoive.
const produitsEnStockFaible = computed(() =>
  produitsStore.liste.filter((p) => p.quantite_totale <= p.seuil_stock_faible)
);

const quantiteTotaleDetail = computed(() =>
  (detailProduit.value?.lots || []).reduce((somme, lot) => somme + (lot.quantite > 0 ? lot.quantite : 0), 0)
);

const SEUIL_JOURS_PEREMPTION_PROCHE = 60;

function statutLot(lot) {
  const aujourdHui = new Date();
  const datePeremption = new Date(lot.date_peremption);
  if (lot.quantite <= 0) return 'ecoule';
  if (datePeremption < aujourdHui) return 'expire';
  const seuilDate = new Date(aujourdHui.getTime() + SEUIL_JOURS_PEREMPTION_PROCHE * 86400000);
  if (datePeremption <= seuilDate) return 'proche';
  return 'ok';
}

function libelleStatutLot(lot) {
  return { ok: 'OK', proche: 'Péremption proche', expire: 'Expiré', ecoule: 'Épuisé' }[statutLot(lot)];
}

function classeBadgeStatutLot(lot) {
  return {
    ok: 'badge--admin',
    proche: 'badge--caissier',
    expire: 'badge--inactif',
    ecoule: 'badge--inactif',
  }[statutLot(lot)];
}

async function ouvrirDetail(p) {
  detailProduit.value = await produitsStore.chargerDetail(p.id);
  modaleDetailOuverte.value = true;
}

onMounted(() => {
  produitsStore.charger();
  produitsStore.chargerAlertes();
});

function rechercherAvecDelai() {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(() => produitsStore.charger(recherche.value), 350);
}

function formaterDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'medium' });
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant || 0);
}

function ouvrirCreationProduit() {
  produitEnEdition.value = null;
  Object.assign(formProduit, {
    nom: '', forme: '', dosage: '', fabricant: '', codeBarre: '', prixAchatCdf: 0, prixVenteCdf: 0, prixVenteUsd: 0, seuilStockFaible: 10,
    quantiteInitiale: null, datePeremptionInitiale: '', numeroLotInitial: '', fournisseurInitial: '',
  });
  erreurFormulaire.value = '';
  modaleProduitOuverte.value = true;
}

function ouvrirModificationProduit(p) {
  produitEnEdition.value = p;
  Object.assign(formProduit, {
    nom: p.nom, forme: p.forme || '', dosage: p.dosage || '', fabricant: p.fabricant || '', codeBarre: p.code_barre || '',
    prixAchatCdf: p.prix_achat_cdf, prixVenteCdf: p.prix_vente_cdf, prixVenteUsd: p.prix_vente_usd, seuilStockFaible: p.seuil_stock_faible,
  });
  erreurFormulaire.value = '';
  modaleProduitOuverte.value = true;
}

async function soumettreProduit() {
  envoiEnCours.value = true;
  erreurFormulaire.value = '';
  try {
    const payload = { ...formProduit };
    if (!authStore.estAdmin) {
      delete payload.prixAchatCdf;
      delete payload.prixVenteCdf;
      delete payload.prixVenteUsd;
    }
    if (produitEnEdition.value) {
      delete payload.quantiteInitiale;
      delete payload.datePeremptionInitiale;
      delete payload.numeroLotInitial;
      delete payload.fournisseurInitial;
      await produitsStore.modifier(produitEnEdition.value.id, payload);
    } else {
      if (!payload.quantiteInitiale) {
        delete payload.quantiteInitiale;
        delete payload.datePeremptionInitiale;
        delete payload.numeroLotInitial;
        delete payload.fournisseurInitial;
      }
      await produitsStore.creer(payload);
    }
    modaleProduitOuverte.value = false;
  } catch (err) {
    erreurFormulaire.value = err.response?.data?.erreur || 'Erreur lors de l\'enregistrement (hors ligne ?).';
  } finally {
    envoiEnCours.value = false;
  }
}

async function confirmerSuppression(p) {
  if (confirm(`Supprimer "${p.nom}" ? Le produit sera retiré du catalogue.`)) {
    await produitsStore.supprimer(p.id);
  }
}

function ouvrirEntreeStock(p) {
  produitCible.value = p;
  Object.assign(formEntree, { quantite: null, datePeremption: '', numeroLot: '', fournisseur: '' });
  erreurFormulaire.value = '';
  modaleEntreeOuverte.value = true;
}

async function soumettreEntree() {
  envoiEnCours.value = true;
  erreurFormulaire.value = '';
  try {
    await produitsStore.ajouterEntree(produitCible.value.id, { ...formEntree });
    modaleEntreeOuverte.value = false;
  } catch (err) {
    erreurFormulaire.value = err.response?.data?.erreur || 'Erreur lors de l\'enregistrement (hors ligne ?).';
  } finally {
    envoiEnCours.value = false;
  }
}

async function ouvrirAjustement(p) {
  produitCible.value = p;
  Object.assign(formAjustement, { lotId: '', type: 'perte', quantite: 0 });
  erreurFormulaire.value = '';
  const detail = await produitsStore.chargerDetail(p.id);
  lotsCible.value = detail.lots.filter((l) => l.quantite > 0);
  modaleAjustementOuverte.value = true;
}

async function soumettreAjustement() {
  envoiEnCours.value = true;
  erreurFormulaire.value = '';
  try {
    await produitsStore.ajouterAjustement(produitCible.value.id, { ...formAjustement });
    modaleAjustementOuverte.value = false;
  } catch (err) {
    erreurFormulaire.value = err.response?.data?.erreur || 'Erreur lors de l\'enregistrement (hors ligne ?).';
  } finally {
    envoiEnCours.value = false;
  }
}
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
.sous-texte { font-size: 0.82rem; color: var(--texte-secondaire); }

.barre-recherche { margin-bottom: var(--espace-md); }
.barre-recherche input {
  width: 100%;
  max-width: 420px;
  padding: 0.65rem 0.9rem;
  border: 1.5px solid var(--bordure);
  border-radius: var(--rayon);
  font-size: 0.95rem;
}

.bandeau-alertes {
  background: #fff8f0;
  border: 1px solid #f4d9a8;
  border-radius: var(--rayon);
  margin-bottom: var(--espace-md);
  overflow: hidden;
}

.bascule-alertes {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: var(--espace-sm) var(--espace-md);
  font-weight: 600;
  font-size: 0.92rem;
  color: #92400e;
  text-align: left;
}

.pastille-alerte {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--couleur-avertissement);
  flex-shrink: 0;
}

.chevron { margin-left: auto; transition: transform 0.15s ease; }
.chevron--ouvert { transform: rotate(180deg); }

.detail-alertes {
  padding: 0 var(--espace-md) var(--espace-md);
  display: flex;
  flex-direction: column;
  gap: var(--espace-sm);
}

.groupe-alerte h3 { font-size: 0.85rem; margin-bottom: 0.3rem; }
.groupe-alerte ul { margin: 0; padding-left: 1.1rem; font-size: 0.87rem; }
.groupe-alerte--danger h3 { color: var(--couleur-danger); }
.groupe-alerte--avertissement h3 { color: var(--couleur-avertissement); }
.groupe-alerte--info h3 { color: var(--couleur-primaire-fonce); }

.cellule-actions { display: flex; gap: var(--espace-sm); flex-wrap: wrap; }

.lien-action {
  background: none; border: none;
  color: var(--couleur-primaire);
  font-weight: 600; font-size: 0.85rem; padding: 0;
}
.lien-action:hover { text-decoration: underline; }
.lien-action--danger { color: var(--couleur-danger); }

.etat-vide { text-align: center; color: var(--texte-secondaire); padding: var(--espace-lg); }

.fond-modale {
  position: fixed; inset: 0;
  background: rgba(15, 23, 20, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--espace-md);
  z-index: 50;
}

.modale { width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; }
.modale--large { max-width: 640px; }
.sous-titre-modale { color: var(--texte-secondaire); margin-top: -0.5rem; margin-bottom: var(--espace-md); font-size: 0.9rem; }

.nom-produit-clickable {
  background: none;
  border: none;
  padding: 0;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--texte-principal);
  text-align: left;
  cursor: pointer;
}
.nom-produit-clickable:hover { color: var(--couleur-primaire); text-decoration: underline; }

.grille-fiche {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--espace-md);
  background: var(--fond-neutre);
  border-radius: var(--rayon);
  padding: var(--espace-md);
  margin-bottom: var(--espace-lg);
}
.grille-fiche > div { display: flex; flex-direction: column; gap: 0.2rem; }
.etiquette-fiche { font-size: 0.75rem; color: var(--texte-secondaire); text-transform: uppercase; letter-spacing: 0.03em; }

.titre-section { font-size: 0.95rem; margin-bottom: var(--espace-sm); }
.tableau-scroll { overflow-x: auto; margin-bottom: var(--espace-sm); }

.ligne-champs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espace-md); }

.note-permission {
  font-size: 0.85rem;
  color: var(--texte-secondaire);
  background: var(--fond-neutre);
  padding: var(--espace-sm);
  border-radius: var(--rayon);
}

.separateur-formulaire {
  border: none;
  border-top: 1px dashed var(--bordure);
  margin: var(--espace-md) 0;
}

.actions-modale {
  display: flex; justify-content: flex-end; gap: var(--espace-sm);
  margin-top: var(--espace-md);
}

@media (max-width: 480px) {
  .ligne-champs { grid-template-columns: 1fr; }
}
</style>
