import db from '../db/connection.js';

const LIMITE_MAX = 100;

export function lister(req, res) {
  const pharmacyId = req.utilisateur.pharmacy_id;
  const { action, utilisateurId, debut, fin } = req.query;

  const limite = Math.min(parseInt(req.query.limite, 10) || 50, LIMITE_MAX);
  const decalage = Math.max(parseInt(req.query.decalage, 10) || 0, 0);

  let requete = `
    SELECT j.*, u.nom AS utilisateur_nom
    FROM journal_activite j
    LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id
    WHERE j.pharmacy_id = ?
  `;
  const params = [pharmacyId];

  if (action) {
    requete += ' AND j.action = ?';
    params.push(action);
  }
  if (utilisateurId) {
    requete += ' AND j.utilisateur_id = ?';
    params.push(utilisateurId);
  }
  if (debut) {
    requete += ' AND j.created_at >= ?';
    params.push(debut);
  }
  if (fin) {
    requete += ' AND j.created_at <= ?';
    params.push(fin);
  }

  // Compte total (pour savoir s'il reste des entrées à charger), avant pagination
  const requeteCompte = requete.replace(
    'SELECT j.*, u.nom AS utilisateur_nom',
    'SELECT COUNT(*) AS total'
  );
  const { total } = db.prepare(requeteCompte).get(...params);

  requete += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
  params.push(limite, decalage);

  const entrees = db.prepare(requete).all(...params);

  // Liste des types d'action distincts, pour peupler le filtre côté frontend
  const actionsDisponibles = db
    .prepare('SELECT DISTINCT action FROM journal_activite WHERE pharmacy_id = ? ORDER BY action')
    .all(pharmacyId)
    .map((r) => r.action);

  res.json({ entrees, total, actionsDisponibles });
}
