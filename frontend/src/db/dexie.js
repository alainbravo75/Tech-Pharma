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

db.version(2).stores({
  session: 'id',
  sync_queue: '++idLocal, statut, type, timestamp_client',

  // Copie locale du catalogue produits (mise à jour à chaque chargement en
  // ligne réussi), utilisée par la caisse pour rechercher un produit même
  // sans connexion.
  produits_cache: 'id, nom, code_barre',

  // Ventes enregistrées localement. C'est la source de vérité de la file
  // de synchronisation pour ce domaine : statutSync = 'local' tant que le
  // serveur n'a pas confirmé la réception, puis 'synced'.
  ventes_locales: 'id, statutSync, createdAt',
});

export default db;
