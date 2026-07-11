import { defineStore } from 'pinia';
import { useProduitsStore } from './produitsStore.js';
import { useAuthStore } from './authStore.js';
import { creerVenteLocale, ventesDuJour } from '../db/repositories/ventesLocalesRepository.js';
import { obtenirTauxChange } from '../services/ventesApi.js';
import { synchroniserVentes } from '../sync/syncEngine.js';
import { statutReseau } from '../sync/syncStatus.js';

function genererUuid() {
  // crypto.randomUUID() est disponible dans tous les navigateurs modernes
  // et fonctionne hors ligne (aucune dépendance réseau).
  return crypto.randomUUID();
}

export const useCaisseStore = defineStore('caisse', {
  state: () => ({
    panier: [], // [{ produitId, nom, prixCdf, prixUsd, quantite, stockDisponible }]
    devise: 'CDF',
    tauxChange: 2800, // valeur par défaut, écrasée par obtenirTauxChange()
    ventesDuJourListe: [],
    derniereVenteConfirmee: null,
    erreur: null,
  }),

  getters: {
    total: (state) => {
      const cle = state.devise === 'CDF' ? 'prixCdf' : 'prixUsd';
      return state.panier.reduce((somme, ligne) => somme + ligne[cle] * ligne.quantite, 0);
    },
    nombreArticles: (state) => state.panier.reduce((n, l) => n + l.quantite, 0),
  },

  actions: {
    async initialiser() {
      try {
        this.tauxChange = await obtenirTauxChange();
      } catch {
        // hors ligne au premier lancement caisse : on garde la valeur par défaut
      }
      await this.chargerVentesDuJour();
    },

    async chargerVentesDuJour() {
      this.ventesDuJourListe = await ventesDuJour();
    },

    ajouterAuPanier(produit) {
      const existant = this.panier.find((l) => l.produitId === produit.id);
      if (existant) {
        existant.quantite += 1;
      } else {
        this.panier.push({
          produitId: produit.id,
          nom: produit.nom,
          prixCdf: produit.prix_vente_cdf || 0,
          prixUsd: produit.prix_vente_usd || 0,
          quantite: 1,
          stockDisponible: produit.quantite_totale ?? null,
        });
      }
    },

    modifierQuantite(produitId, quantite) {
      const ligne = this.panier.find((l) => l.produitId === produitId);
      if (!ligne) return;
      if (quantite <= 0) {
        this.retirerDuPanier(produitId);
      } else {
        ligne.quantite = quantite;
      }
    },

    retirerDuPanier(produitId) {
      this.panier = this.panier.filter((l) => l.produitId !== produitId);
    },

    viderPanier() {
      this.panier = [];
    },

    /**
     * Enregistre la vente. Écriture locale IMMÉDIATE (avant tout appel
     * réseau) : c'est ce qui garantit qu'aucune vente n'est perdue, même
     * en cas de coupure au moment précis de la validation.
     */
    async validerVente() {
      if (this.panier.length === 0) {
        this.erreur = 'Le panier est vide.';
        return null;
      }

      const authStore = useAuthStore();
      const produitsStore = useProduitsStore();
      const cleUnitaire = this.devise === 'CDF' ? 'prixCdf' : 'prixUsd';

      const vente = {
        id: genererUuid(),
        pharmacyId: authStore.utilisateur.pharmacy_id,
        utilisateurId: authStore.utilisateur.id,
        devise: this.devise,
        tauxChangeUtilise: this.tauxChange,
        total: this.total,
        createdAt: new Date().toISOString(),
        lignes: this.panier.map((l) => ({
          produitId: l.produitId,
          quantite: l.quantite,
          prixUnitaire: l[cleUnitaire],
          nom: l.nom, // conservé localement pour l'affichage du reçu, ignoré par le backend
        })),
      };

      await creerVenteLocale(vente);

      // Mise à jour optimiste de l'affichage du stock en mémoire (le
      // serveur reste seul juge du chiffre exact à la prochaine synchro).
      for (const ligne of vente.lignes) {
        const produit = produitsStore.liste.find((p) => p.id === ligne.produitId);
        if (produit && produit.quantite_totale != null) {
          produit.quantite_totale = Math.max(0, produit.quantite_totale - ligne.quantite);
        }
      }

      this.derniereVenteConfirmee = vente;
      this.viderPanier();
      await this.chargerVentesDuJour();

      // Tentative de synchro immédiate si en ligne ; sinon la vente
      // attendra dans la file et sera envoyée à la reconnexion.
      if (statutReseau.value === 'en_ligne') {
        synchroniserVentes().then(() => this.chargerVentesDuJour());
      }

      return vente;
    },
  },
});
