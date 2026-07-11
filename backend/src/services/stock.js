import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

/**
 * Nombre de jours avant péremption à partir duquel un lot est considéré
 * "proche de la péremption" (alerte orange). Au-delà de la date, il est
 * "expiré" (alerte rouge).
 */
export const SEUIL_JOURS_PEREMPTION_PROCHE = 60;

export function quantiteTotaleProduit(produitId) {
  const resultat = db
    .prepare(
      `SELECT COALESCE(SUM(quantite), 0) AS total
       FROM lots WHERE produit_id = ? AND quantite > 0`
    )
    .get(produitId);
  return resultat.total;
}

/**
 * Enregistre une entrée de stock (réception fournisseur) : crée un lot
 * et le mouvement de stock correspondant, dans une transaction.
 */
export function enregistrerEntreeStock({ pharmacyId, produitId, quantite, datePeremption, numeroLot, fournisseur, utilisateurId }) {
  const transaction = db.transaction(() => {
    const lotId = uuidv4();
    db.prepare(
      `INSERT INTO lots (id, produit_id, numero_lot, quantite, date_peremption, fournisseur)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(lotId, produitId, numeroLot || null, quantite, datePeremption, fournisseur || null);

    db.prepare(
      `INSERT INTO mouvements_stock (id, pharmacy_id, produit_id, lot_id, type, quantite, utilisateur_id)
       VALUES (?, ?, ?, ?, 'entree', ?, ?)`
    ).run(uuidv4(), pharmacyId, produitId, lotId, quantite, utilisateurId);

    return lotId;
  });

  return transaction();
}

/**
 * Enregistre un ajustement de stock (perte, casse, retour, correction
 * d'inventaire) sur un lot précis. `quantite` est signée : négative pour
 * une perte, positive pour un retour/correction à la hausse.
 */
export function enregistrerAjustement({ pharmacyId, produitId, lotId, quantite, type, utilisateurId }) {
  const transaction = db.transaction(() => {
    const lot = db.prepare('SELECT * FROM lots WHERE id = ? AND produit_id = ?').get(lotId, produitId);
    if (!lot) {
      throw new Error('Lot introuvable pour ce produit.');
    }

    const nouvelleQuantite = lot.quantite + quantite;
    db.prepare('UPDATE lots SET quantite = ? WHERE id = ?').run(nouvelleQuantite, lotId);

    db.prepare(
      `INSERT INTO mouvements_stock (id, pharmacy_id, produit_id, lot_id, type, quantite, utilisateur_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), pharmacyId, produitId, lotId, type, quantite, utilisateurId);

    return nouvelleQuantite;
  });

  return transaction();
}

/**
 * Retourne les alertes actives pour une pharmacie :
 * - stock_faible : quantité totale <= seuil défini sur le produit
 * - peremption_proche : un lot expire dans les prochains SEUIL_JOURS jours
 * - expire : un lot est déjà périmé (quantité > 0)
 */
export function obtenirAlertes(pharmacyId) {
  const produits = db
    .prepare('SELECT * FROM produits WHERE pharmacy_id = ? AND actif = 1')
    .all(pharmacyId);

  const stockFaible = [];
  const peremptionProche = [];
  const expires = [];

  const aujourdHui = new Date();
  const seuilDate = new Date(aujourdHui.getTime() + SEUIL_JOURS_PEREMPTION_PROCHE * 86400000);

  for (const produit of produits) {
    const total = quantiteTotaleProduit(produit.id);
    if (total <= produit.seuil_stock_faible) {
      stockFaible.push({ ...produit, quantite_totale: total });
    }

    const lots = db
      .prepare('SELECT * FROM lots WHERE produit_id = ? AND quantite > 0')
      .all(produit.id);

    for (const lot of lots) {
      const datePeremption = new Date(lot.date_peremption);
      if (datePeremption < aujourdHui) {
        expires.push({ produit, lot });
      } else if (datePeremption <= seuilDate) {
        peremptionProche.push({ produit, lot });
      }
    }
  }

  return { stockFaible, peremptionProche, expires };
}
