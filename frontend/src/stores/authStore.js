import { defineStore } from 'pinia';
import api, { definirToken, definirGestionnaireSessionExpiree } from '../services/api.js';
import { sauvegarderSession, lireSession, effacerSession } from '../db/repositories/sessionRepository.js';
import { statutReseau, verifierConnexionReelle } from '../sync/syncStatus.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    utilisateur: null, // { id, pharmacy_id, role, nom }
    token: null,
    chargement: false,
    erreur: null,
    modeOffline: false, // true si connecté via la session locale sans validation serveur
    sessionExpiree: false, // true juste après une déconnexion forcée pour cause d'expiration
  }),

  getters: {
    estConnecte: (state) => !!state.utilisateur,
    estAdmin: (state) => state.utilisateur?.role === 'admin',
  },

  actions: {
    /**
     * Au démarrage de l'app : tente de restaurer une session locale
     * (chiffrée) pour permettre l'utilisation immédiate même hors ligne,
     * puis revalide silencieusement auprès du serveur si la connexion existe.
     */
    async initialiser() {
      // Si le serveur signale un jeton invalide/expiré à n'importe quel
      // moment (pas seulement au démarrage), on déconnecte proprement
      // plutôt que de laisser chaque écran afficher sa propre erreur brute.
      definirGestionnaireSessionExpiree(() => {
        this.utilisateur = null;
        this.token = null;
        this.modeOffline = false;
        this.sessionExpiree = true;
        definirToken(null);
        effacerSession();
      });

      const session = await lireSession();
      if (session) {
        this.utilisateur = session.utilisateur;
        this.token = session.token;
        definirToken(session.token);
        this.modeOffline = true;
      }

      const enLigne = await verifierConnexionReelle();
      if (enLigne && session) {
        try {
          const { data } = await api.get('/auth/moi');
          this.utilisateur = data.utilisateur;
          this.modeOffline = false;
        } catch {
          // Token expiré/invalide côté serveur : on force une reconnexion
          await this.deconnecter();
        }
      }
    },

    async connecter(telephone, motDePasse) {
      this.chargement = true;
      this.erreur = null;

      try {
        const enLigne = await verifierConnexionReelle();

        if (!enLigne) {
          throw new Error(
            "Impossible de se connecter pour la première fois hors ligne. Une connexion internet est requise une fois, ensuite la connexion hors ligne fonctionnera."
          );
        }

        const { data } = await api.post('/auth/login', { telephone, motDePasse });
        this.utilisateur = data.utilisateur;
        this.token = data.token;
        this.modeOffline = false;
        this.sessionExpiree = false;
        definirToken(data.token);

        await sauvegarderSession({ token: data.token, utilisateur: data.utilisateur });

        return true;
      } catch (err) {
        this.erreur = err.response?.data?.erreur || err.message || 'Erreur de connexion.';
        return false;
      } finally {
        this.chargement = false;
      }
    },

    async deconnecter() {
      this.utilisateur = null;
      this.token = null;
      this.modeOffline = false;
      definirToken(null);
      await effacerSession();
    },
  },
});
