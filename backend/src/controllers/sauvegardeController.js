import { creerSauvegarde, listerSauvegardes, cheminSauvegardeValide } from '../services/sauvegarde.js';
import { journaliser } from '../services/journal.js';
import { emailConfigure, envoyerSauvegardeParEmail } from '../services/email.js';

export async function creer(req, res) {
  try {
    const sauvegarde = await creerSauvegarde();

    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'creation_sauvegarde',
      details: { fichier: sauvegarde.nomFichier },
    });

    res.status(201).json(sauvegarde);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Échec de la création de la sauvegarde.' });
  }
}

export function lister(req, res) {
  res.json({ sauvegardes: listerSauvegardes() });
}

export function telecharger(req, res) {
  const chemin = cheminSauvegardeValide(req.params.nomFichier);
  if (!chemin) {
    return res.status(404).json({ erreur: 'Sauvegarde introuvable.' });
  }

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'telechargement_sauvegarde',
    details: { fichier: req.params.nomFichier },
  });

  res.download(chemin, req.params.nomFichier);
}

export function statutEmail(req, res) {
  res.json({ configure: emailConfigure() });
}

export async function envoyerEmail(req, res) {
  const chemin = cheminSauvegardeValide(req.params.nomFichier);
  if (!chemin) {
    return res.status(404).json({ erreur: 'Sauvegarde introuvable.' });
  }

  try {
    await envoyerSauvegardeParEmail({ cheminFichier: chemin, nomFichier: req.params.nomFichier });

    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'envoi_sauvegarde_email',
      details: { fichier: req.params.nomFichier },
    });

    res.json({ message: 'Sauvegarde envoyée par email.' });
  } catch (err) {
    res.status(err.statusCode || 502).json({ erreur: err.message || "Échec de l'envoi de l'email." });
  }
}
