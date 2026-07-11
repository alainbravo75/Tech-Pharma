import db from '../dexie.js';

/**
 * Enregistre une vente localement, immédiatement, avant toute tentative
 * réseau (optimistic write). C'est cette écriture qui garantit qu'aucune
 * vente n'est perdue même en cas de coupure ou de fermeture du navigateur.
 */
export async function creerVenteLocale(vente) {
  await db.ventes_locales.put({ ...vente, statutSync: 'local' });
}

export async function listerNonSynchronisees() {
  return db.ventes_locales.where('statutSync').equals('local').toArray();
}

export async function marquerSynchronisee(id) {
  await db.ventes_locales.update(id, { statutSync: 'synced' });
}

export async function marquerErreur(id) {
  await db.ventes_locales.update(id, { statutSync: 'erreur' });
}

export async function compterEnAttente() {
  return db.ventes_locales.where('statutSync').equals('local').count();
}

/**
 * Ventes du jour (toutes, quel que soit leur statut de synchro) — pour
 * l'affichage du récapitulatif de caisse.
 */
export async function ventesDuJour() {
  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);
  const toutes = await db.ventes_locales.toArray();
  return toutes
    .filter((v) => new Date(v.createdAt) >= debutJournee)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
