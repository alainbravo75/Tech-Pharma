import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from '../db/connection.js';
import { journaliser } from '../services/journal.js';

const CHAMPS_PUBLICS = 'id, nom, telephone, role, actif, derniere_connexion, created_at';

export function lister(req, res) {
  const utilisateurs = db
    .prepare(`SELECT ${CHAMPS_PUBLICS} FROM utilisateurs WHERE pharmacy_id = ? ORDER BY created_at DESC`)
    .all(req.utilisateur.pharmacy_id);
  res.json({ utilisateurs });
}

export async function creer(req, res) {
  const { nom, telephone, motDePasse, role } = req.body;

  const existe = db.prepare('SELECT id FROM utilisateurs WHERE telephone = ?').get(telephone);
  if (existe) {
    return res.status(409).json({ erreur: 'Ce numéro de téléphone est déjà utilisé.' });
  }

  const id = uuidv4();
  const hash = await bcrypt.hash(motDePasse, 12);

  db.prepare(
    `INSERT INTO utilisateurs (id, pharmacy_id, nom, telephone, mot_de_passe_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.utilisateur.pharmacy_id, nom, telephone, hash, role);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'creation_utilisateur',
    details: { utilisateur_cree: id, role },
  });

  res.status(201).json({
    utilisateur: { id, nom, telephone, role, actif: 1 },
  });
}

export async function modifier(req, res) {
  const { id } = req.params;
  const { nom, role, actif, motDePasse } = req.body;

  const cible = db
    .prepare('SELECT * FROM utilisateurs WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!cible) {
    return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
  }

  // Un admin ne peut pas se désactiver lui-même (évite un verrouillage total)
  if (id === req.utilisateur.id && actif === 0) {
    return res.status(400).json({ erreur: 'Vous ne pouvez pas désactiver votre propre compte.' });
  }

  const updates = [];
  const valeurs = [];

  if (nom !== undefined) { updates.push('nom = ?'); valeurs.push(nom); }
  if (role !== undefined) { updates.push('role = ?'); valeurs.push(role); }
  if (actif !== undefined) { updates.push('actif = ?'); valeurs.push(actif ? 1 : 0); }

  if (motDePasse) {
    const hash = await bcrypt.hash(motDePasse, 12);
    updates.push('mot_de_passe_hash = ?');
    valeurs.push(hash);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  if (updates.length > 1) {
    valeurs.push(id);
    db.prepare(`UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`).run(...valeurs);
  }

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'modification_utilisateur',
    details: { utilisateur_modifie: id, champs: Object.keys(req.body) },
  });

  res.json({ message: 'Utilisateur mis à jour.' });
}

export function supprimer(req, res) {
  const { id } = req.params;

  if (id === req.utilisateur.id) {
    return res.status(400).json({ erreur: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }

  const cible = db
    .prepare('SELECT id FROM utilisateurs WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!cible) {
    return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
  }

  // Désactivation plutôt que suppression physique : préserve l'intégrité
  // de l'historique des ventes/mouvements liés à cet utilisateur.
  db.prepare('UPDATE utilisateurs SET actif = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'suppression_utilisateur',
    details: { utilisateur_supprime: id },
  });

  res.json({ message: 'Utilisateur désactivé.' });
}
