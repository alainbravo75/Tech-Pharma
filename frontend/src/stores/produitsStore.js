import { defineStore } from 'pinia';
import api from '../services/api.js';
import { remplacerCache, rechercherProduits } from '../db/repositories/produitsCacheRepository.js';

export const useProduitsStore = defineStore('produits', {
  state: () => ({
    liste: [],
    alertes: { stockFaible: [], peremptionProche: [], expires: [] },
    detailCourant: null, // { produit, lots }
    chargement: false,
    erreur: null,
    depuisCache: false,
  }),

  actions: {
    async charger(recherche = '') {
      this.chargement = true;
      this.erreur = null;
      try {
        const { data } = await api.get('/produits', { params: recherche ? { recherche } : {} });
        this.liste = data.produits;
        this.depuisCache = false;
        // Ne cache que la liste complète (pas les résultats filtrés), pour
        // que le cache reste une copie fidèle du catalogue entier.
        if (!recherche) {
          remplacerCache(data.produits).catch(() => {});
        }
      } catch (err) {
        // Hors ligne (ou serveur injoignable) : on retombe sur le cache
        // local plutôt que d'afficher un écran vide - la caisse doit
        // rester utilisable sans réseau.
        try {
          this.liste = await rechercherProduits(recherche);
          this.depuisCache = true;
        } catch {
          this.erreur = err.response?.data?.erreur || 'Impossible de charger le stock (hors ligne, aucun cache disponible).';
        }
      } finally {
        this.chargement = false;
      }
    },

    async chargerAlertes() {
      try {
        const { data } = await api.get('/produits/alertes');
        this.alertes = {
          stockFaible: data.stockFaible,
          peremptionProche: data.peremptionProche,
          expires: data.expires,
        };
      } catch {
        // silencieux : les alertes ne sont qu'indicatives, pas critique hors ligne
      }
    },

    async chargerDetail(id) {
      const { data } = await api.get(`/produits/${id}`);
      this.detailCourant = data;
      return data;
    },

    async creer(payload) {
      await api.post('/produits', payload);
      await Promise.all([this.charger(), this.chargerAlertes()]);
    },

    async modifier(id, payload) {
      await api.put(`/produits/${id}`, payload);
      await Promise.all([this.charger(), this.chargerAlertes()]);
    },

    async supprimer(id) {
      await api.delete(`/produits/${id}`);
      await Promise.all([this.charger(), this.chargerAlertes()]);
    },

    async ajouterEntree(produitId, payload) {
      await api.post(`/produits/${produitId}/entrees`, payload);
      await Promise.all([this.charger(), this.chargerAlertes()]);
    },

    async ajouterAjustement(produitId, payload) {
      await api.post(`/produits/${produitId}/ajustements`, payload);
      await Promise.all([this.charger(), this.chargerAlertes()]);
    },
  },
});
