import db from '../db/connection.js';

export function lister(req, res) {
  const { produitId } = req.query;
  const pharmacyId = req.utilisateur.pharmacy_id;

  let mouvements;
  if (produitId) {
    mouvements = db
      .prepare(
        `SELECT m.*, p.nom AS produit_nom, u.nom AS utilisateur_nom
         FROM mouvements_stock m
         JOIN produits p ON p.id = m.produit_id
         LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
         WHERE m.pharmacy_id = ? AND m.produit_id = ?
         ORDER BY m.created_at DESC LIMIT 200`
      )
      .all(pharmacyId, produitId);
  } else {
    mouvements = db
      .prepare(
        `SELECT m.*, p.nom AS produit_nom, u.nom AS utilisateur_nom
         FROM mouvements_stock m
         JOIN produits p ON p.id = m.produit_id
         LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
         WHERE m.pharmacy_id = ?
         ORDER BY m.created_at DESC LIMIT 200`
      )
      .all(pharmacyId);
  }

  res.json({ mouvements });
}
