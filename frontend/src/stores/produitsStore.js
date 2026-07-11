import { defineStore } from 'pinia';
import api from '../services/api.js';

export const useProduitsStore = defineStore('produits', {
  state: () => ({
    liste: [],
    alertes: { stockFaible: [], peremptionProche: [], expires: [] },
    detailCourant: null, // { produit, lots }
    chargement: false,
    erreur: null,
  }),

  actions: {
    async charger(recherche = '') {
      this.chargement = true;
      this.erreur = null;
      try {
        const { data } = await api.get('/produits', { params: recherche ? { recherche } : {} });
        this.liste = data.produits;
      } catch (err) {
        this.erreur = err.response?.data?.erreur || 'Impossible de charger le stock (hors ligne ?).';
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
