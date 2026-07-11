import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { login, moi } from '../controllers/authController.js';
import { valider } from '../middlewares/valider.js';
import { authentifier } from '../middlewares/auth.js';

const router = Router();

// Limite les tentatives de connexion par IP (protection brute-force additionnelle)
const limiteurConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erreur: 'Trop de tentatives. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const schemaLogin = z.object({
  telephone: z.string().min(1, 'Le téléphone est requis.'),
  motDePasse: z.string().min(1, 'Le mot de passe est requis.'),
});

router.post('/login', limiteurConnexion, valider(schemaLogin), login);
router.get('/moi', authentifier, moi);

export default router;
