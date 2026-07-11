import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/connection.js';
import { journaliser } from './journal.js';

const MAX_TENTATIVES = parseInt(process.env.MAX_TENTATIVES_ECHOUEES || '5', 10);
const DUREE_VERROUILLAGE_MIN = parseInt(process.env.DUREE_VERROUILLAGE_MINUTES || '15', 10);

class ErreurAuth extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export { ErreurAuth };

export async function connecter({ telephone, motDePasse }) {
  const utilisateur = db
    .prepare('SELECT * FROM utilisateurs WHERE telephone = ?')
    .get(telephone);

  if (!utilisateur || !utilisateur.actif) {
    throw new ErreurAuth('Identifiants incorrects.');
  }

  // Vérifie le verrouillage du compte
  if (utilisateur.verrouille_jusqu_a) {
    const verrouilleJusqua = new Date(utilisateur.verrouille_jusqu_a);
    if (verrouilleJusqua > new Date()) {
      const minutesRestantes = Math.ceil((verrouilleJusqua - new Date()) / 60000);
      throw new ErreurAuth(
        `Compte temporairement verrouillé suite à plusieurs échecs. Réessayez dans ${minutesRestantes} min.`,
        423
      );
    }
  }

  const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hash);

  if (!motDePasseValide) {
    const nouvellesTentatives = utilisateur.tentatives_echouees + 1;
    let verrouilleJusqua = null;

    if (nouvellesTentatives >= MAX_TENTATIVES) {
      verrouilleJusqua = new Date(Date.now() + DUREE_VERROUILLAGE_MIN * 60000).toISOString();
    }

    db.prepare(
      'UPDATE utilisateurs SET tentatives_echouees = ?, verrouille_jusqu_a = ? WHERE id = ?'
    ).run(nouvellesTentatives, verrouilleJusqua, utilisateur.id);

    journaliser({
      pharmacyId: utilisateur.pharmacy_id,
      utilisateurId: utilisateur.id,
      action: 'connexion_echouee',
      details: { tentative: nouvellesTentatives },
    });

    throw new ErreurAuth('Identifiants incorrects.');
  }

  // Connexion réussie : réinitialise le compteur d'échecs
  db.prepare(
    `UPDATE utilisateurs
     SET tentatives_echouees = 0, verrouille_jusqu_a = NULL, derniere_connexion = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(utilisateur.id);

  journaliser({
    pharmacyId: utilisateur.pharmacy_id,
    utilisateurId: utilisateur.id,
    action: 'connexion',
  });

  const payload = {
    id: utilisateur.id,
    pharmacy_id: utilisateur.pharmacy_id,
    role: utilisateur.role,
    nom: utilisateur.nom,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    utilisateur: payload,
  };
}
