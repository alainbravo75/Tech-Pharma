import jwt from 'jsonwebtoken';

export function authentifier(req, res, next) {
  const enTete = req.headers['authorization'];
  const token = enTete && enTete.startsWith('Bearer ') ? enTete.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erreur: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = payload; // { id, pharmacy_id, role, nom }
    next();
  } catch (err) {
    return res.status(401).json({ erreur: 'Session invalide ou expirée.' });
  }
}

/**
 * Middleware de restriction par rôle.
 * Usage : autoriserRoles('admin') ou autoriserRoles('admin', 'pharmacien')
 */
export function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ erreur: "Permissions insuffisantes pour cette action." });
    }
    next();
  };
}
