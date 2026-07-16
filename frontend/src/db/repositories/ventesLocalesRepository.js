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
  // On retente aussi les ventes marquées "erreur" : une erreur peut être
  // transitoire (coupure réseau en plein envoi, délai dépassé sur une
  // connexion instable) plutôt que définitive. On limite quand même le
  // nombre de tentatives pour ne pas boucler indéfiniment sur une vente
  // qui échouerait pour une vraie raison durable (ex: données invalides).
  const locales = await db.ventes_locales.where('statutSync').equals('local').toArray();
  const enErreur = await db.ventes_locales.where('statutSync').equals('erreur').toArray();
  const enErreurRetentables = enErreur.filter((v) => (v.tentatives || 0) < 10);
  return [...locales, ...enErreurRetentables];
}

export async function marquerSynchronisee(id) {
  await db.ventes_locales.update(id, { statutSync: 'synced' });
}

export async function marquerErreur(id, messageErreur) {
  const vente = await db.ventes_locales.get(id);
  const tentatives = (vente?.tentatives || 0) + 1;
  await db.ventes_locales.update(id, { statutSync: 'erreur', tentatives, derniereErreur: messageErreur || null });
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
