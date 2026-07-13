import { creerVente, listerVentes } from '../services/ventes.js';
import { genererTexteRecu } from '../services/recu.js';
import { envoyerSms, smsConfigure } from '../services/sms.js';
import { journaliser } from '../services/journal.js';

export function creer(req, res) {
  const { id, patientId, devise, tauxChangeUtilise, total, createdAt, lignes } = req.body;

  const resultat = creerVente({
    id,
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    patientId,
    devise,
    tauxChangeUtilise,
    total,
    createdAt,
    lignes,
  });

  res.status(201).json({ vente_id: id, deja_synchronisee: resultat.dejaExistante });
}

export function lister(req, res) {
  const { debut, fin } = req.query;
  const ventes = listerVentes({
    pharmacyId: req.utilisateur.pharmacy_id,
    dateDebut: debut,
    dateFin: fin,
  });
  res.json({ ventes });
}

export function statutSms(req, res) {
  res.json({ configure: smsConfigure() });
}

export async function envoyerRecuSms(req, res) {
  const { id } = req.params;
  const { telephone } = req.body;

  const texte = genererTexteRecu({ pharmacyId: req.utilisateur.pharmacy_id, venteId: id });
  if (!texte) {
    return res.status(404).json({ erreur: 'Vente introuvable (pas encore synchronisée ?).' });
  }

  try {
    await envoyerSms(telephone, texte);

    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'envoi_recu_sms',
      details: { telephone },
    });

    res.json({ message: 'Reçu envoyé par SMS.' });
  } catch (err) {
    res.status(err.statusCode || 502).json({ erreur: err.message || "Échec de l'envoi du SMS." });
  }
}
