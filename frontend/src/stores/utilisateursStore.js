import { defineStore } from 'pinia';
import api from '../services/api.js';

export const useUtilisateursStore = defineStore('utilisateurs', {
  state: () => ({
    liste: [],
    chargement: false,
    erreur: null,
  }),

  actions: {
    async charger() {
      this.chargement = true;
      this.erreur = null;
      try {
        const { data } = await api.get('/utilisateurs');
        this.liste = data.utilisateurs;
      } catch (err) {
        this.erreur = err.response?.data?.erreur || 'Impossible de charger les utilisateurs (hors ligne ?).';
      } finally {
        this.chargement = false;
      }
    },

    async creer(payload) {
      const { data } = await api.post('/utilisateurs', payload);
      await this.charger();
      return data;
    },

    async modifier(id, payload) {
      await api.put(`/utilisateurs/${id}`, payload);
      await this.charger();
    },

    async supprimer(id) {
      await api.delete(`/utilisateurs/${id}`);
      await this.charger();
    },
  },
});
