import { connecter, ErreurAuth } from '../services/auth.js';

export async function login(req, res) {
  try {
    const { telephone, motDePasse } = req.body;
    const resultat = await connecter({ telephone, motDePasse });
    res.json(resultat);
  } catch (err) {
    if (err instanceof ErreurAuth) {
      return res.status(err.statusCode).json({ erreur: err.message });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
}

/**
 * Retourne les infos de l'utilisateur connecté à partir du token
 * (permet au frontend de revalider une session mise en cache offline).
 */
export function moi(req, res) {
  res.json({ utilisateur: req.utilisateur });
}
