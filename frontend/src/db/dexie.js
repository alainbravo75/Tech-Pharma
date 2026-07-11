import Dexie from 'dexie';

/**
 * Base de données locale (IndexedDB via Dexie).
 * Contient tout ce qui doit survivre à une coupure réseau ou une fermeture
 * inattendue du navigateur : session utilisateur, produits en cache,
 * ventes en attente de synchronisation, etc.
 *
 * NOTE : les tables produits/lots/ventes seront ajoutées aux étapes
 * suivantes (gestion de stock, caisse). Cette v1 pose les fondations
 * nécessaires à l'authentification offline.
 */
export const db = new Dexie('tech_pharma_locale');

db.version(1).stores({
  // Session utilisateur mise en cache pour permettre la connexion hors ligne.
  // Une seule ligne (id fixe 'session_courante').
  session: 'id',

  // File d'attente générique des opérations à synchroniser avec le serveur
  // dès que la connexion revient (utilisée par les futures étapes : stock, ventes...).
  sync_queue: '++idLocal, statut, type, timestamp_client',
});

export default db;
