import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { journaliser } from './journal.js';

/**
 * Crée une vente de façon idempotente : si une vente avec cet id existe
 * déjà (rejeu d'une synchronisation après coupure réseau juste après
 * l'envoi mais avant la réponse, par exemple), on ne la recrée pas.
 *
 * La déduction de stock suit la règle FEFO (First Expired, First Out) :
 * on prélève d'abord sur le lot qui expire le plus tôt. Si le stock
 * disponible est insuffisant (deux caissiers ont vendu le dernier article
 * hors ligne, par exemple), la vente est acceptée quand même — refuser une
 * vente déjà remise au client serait pire qu'un stock temporairement
 * négatif, qui déclenche une alerte pour l'admin à la place.
 */
export function creerVente({ id, pharmacyId, utilisateurId, patientId, devise, tauxChangeUtilise, total, createdAt, lignes }) {
  const existante = db.prepare('SELECT id FROM ventes WHERE id = ?').get(id);
  if (existante) {
    return { dejaExistante: true };
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `INSERT INTO ventes (id, pharmacy_id, utilisateur_id, patient_id, devise, taux_change_utilise, total, statut_sync, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`
    ).run(id, pharmacyId, utilisateurId, patientId || null, devise, tauxChangeUtilise, total, createdAt);

    for (const ligne of lignes) {
      let quantiteRestante = ligne.quantite;
      let premierLotId = null;

      const lots = db
        .prepare('SELECT * FROM lots WHERE produit_id = ? AND quantite > 0 ORDER BY date_peremption ASC')
        .all(ligne.produitId);

      for (const lot of lots) {
        if (quantiteRestante <= 0) break;
        const prise = Math.min(lot.quantite, quantiteRestante);

        db.prepare('UPDATE lots SET quantite = quantite - ? WHERE id = ?').run(prise, lot.id);
        db.prepare(
          `INSERT INTO mouvements_stock (id, pharmacy_id, produit_id, lot_id, type, quantite, utilisateur_id, reference_vente_id)
           VALUES (?, ?, ?, ?, 'vente', ?, ?, ?)`
        ).run(uuidv4(), pharmacyId, ligne.produitId, lot.id, -prise, utilisateurId, id);

        if (!premierLotId) premierLotId = lot.id;
        quantiteRestante -= prise;
      }

      // Stock insuffisant : on log le manque sans bloquer la vente
      if (quantiteRestante > 0) {
        db.prepare(
          `INSERT INTO mouvements_stock (id, pharmacy_id, produit_id, lot_id, type, quantite, utilisateur_id, reference_vente_id)
           VALUES (?, ?, ?, NULL, 'vente', ?, ?, ?)`
        ).run(uuidv4(), pharmacyId, ligne.produitId, -quantiteRestante, utilisateurId, id);

        journaliser({
          pharmacyId,
          utilisateurId,
          action: 'stock_negatif_vente',
          details: { produit_id: ligne.produitId, vente_id: id, quantite_manquante: quantiteRestante },
        });
      }

      db.prepare(
        `INSERT INTO ventes_lignes (id, vente_id, produit_id, lot_id, quantite, prix_unitaire)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, ligne.produitId, premierLotId, ligne.quantite, ligne.prixUnitaire);
    }
  });

  transaction();

  return { dejaExistante: false };
}

export function listerVentes({ pharmacyId, dateDebut, dateFin }) {
  let requete = `
    SELECT v.*, u.nom AS caissier_nom,
      (SELECT COUNT(*) FROM ventes_lignes WHERE vente_id = v.id) AS nombre_articles
    FROM ventes v
    LEFT JOIN utilisateurs u ON u.id = v.utilisateur_id
    WHERE v.pharmacy_id = ?
  `;
  const params = [pharmacyId];

  if (dateDebut) {
    requete += ' AND v.created_at >= ?';
    params.push(dateDebut);
  }
  if (dateFin) {
    requete += ' AND v.created_at <= ?';
    params.push(dateFin);
  }

  requete += ' ORDER BY v.created_at DESC LIMIT 500';

  return db.prepare(requete).all(...params);
}
