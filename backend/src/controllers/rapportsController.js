import db from '../db/connection.js';
import { genererRapport } from '../services/rapports.js';
import { genererPdfRapport } from '../services/rapportPdf.js';

function analyserParametres(req) {
  const periode = ['jour', 'semaine', 'mois'].includes(req.query.periode) ? req.query.periode : 'jour';
  const date = req.query.date || new Date().toISOString();
  return { periode, date };
}

export function obtenir(req, res) {
  const { periode, date } = analyserParametres(req);
  const rapport = genererRapport({ pharmacyId: req.utilisateur.pharmacy_id, periode, date });
  res.json(rapport);
}

export function telechargerPdf(req, res) {
  const { periode, date } = analyserParametres(req);
  const rapport = genererRapport({ pharmacyId: req.utilisateur.pharmacy_id, periode, date });

  const pharmacie = db.prepare('SELECT nom FROM pharmacies WHERE id = ?').get(req.utilisateur.pharmacy_id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-${periode}-${date.slice(0, 10)}.pdf"`);

  genererPdfRapport({ rapport, nomPharmacie: pharmacie?.nom, res });
}
