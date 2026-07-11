import db from '../dexie.js';

/**
 * Remplace intégralement le cache local des produits par la liste reçue
 * du serveur. Appelé après chaque chargement en ligne réussi, pour que
 * la caisse reste utilisable hors ligne avec les données les plus récentes.
 */
export async function remplacerCache(produits) {
  await db.transaction('rw', db.produits_cache, async () => {
    await db.produits_cache.clear();
    await db.produits_cache.bulkPut(produits);
  });
}

export async function tousLesProduits() {
  return db.produits_cache.toArray();
}

export async function rechercherProduits(motif) {
  const tous = await db.produits_cache.toArray();
  if (!motif) return tous;
  const motifBas = motif.toLowerCase();
  return tous.filter(
    (p) =>
      p.nom?.toLowerCase().includes(motifBas) ||
      p.code_barre?.toLowerCase().includes(motifBas) ||
      p.fabricant?.toLowerCase().includes(motifBas)
  );
}
