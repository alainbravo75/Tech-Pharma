import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { journaliser } from '../services/journal.js';

export function obtenir(req, res) {
  const taux = db
    .prepare('SELECT * FROM taux_change WHERE pharmacy_id = ? ORDER BY actif_depuis DESC LIMIT 1')
    .get(req.utilisateur.pharmacy_id);

  if (!taux) {
    return res.status(404).json({ erreur: 'Aucun taux de change configuré.' });
  }

  res.json({ taux_cdf_par_usd: taux.taux_cdf_par_usd, actif_depuis: taux.actif_depuis });
}

export function definir(req, res) {
  const { tauxCdfParUsd } = req.body;
  const id = uuidv4();

  db.prepare(
    'INSERT INTO taux_change (id, pharmacy_id, taux_cdf_par_usd) VALUES (?, ?, ?)'
  ).run(id, req.utilisateur.pharmacy_id, tauxCdfParUsd);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'modification_taux_change',
    details: { nouveau_taux: tauxCdfParUsd },
  });

  res.status(201).json({ taux_cdf_par_usd: tauxCdfParUsd });
}
