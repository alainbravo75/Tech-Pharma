/**
 * Middleware générique de validation de req.body avec un schéma Zod.
 * Usage : router.post('/route', valider(monSchema), controleur)
 */
export function valider(schema) {
  return (req, res, next) => {
    const resultat = schema.safeParse(req.body);
    if (!resultat.success) {
      return res.status(400).json({
        erreur: 'Données invalides.',
        details: resultat.error.flatten().fieldErrors,
      });
    }
    req.body = resultat.data;
    next();
  };
}
