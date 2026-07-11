import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

/**
 * Enregistre une action dans le journal d'activité (audit trail).
 * @param {object} params
 * @param {string} params.pharmacyId
 * @param {string|null} params.utilisateurId
 * @param {string} params.action - ex: 'connexion', 'creation_utilisateur', 'modif_prix'
 * @param {object} [params.details] - contexte additionnel, sérialisé en JSON
 */
export function journaliser({ pharmacyId, utilisateurId, action, details }) {
  db.prepare(
    `INSERT INTO journal_activite (id, pharmacy_id, utilisateur_id, action, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuidv4(), pharmacyId, utilisateurId ?? null, action, details ? JSON.stringify(details) : null);
}
