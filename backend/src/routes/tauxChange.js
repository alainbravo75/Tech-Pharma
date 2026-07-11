import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/tauxChangeController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';

const router = Router();
router.use(authentifier);

const schemaTaux = z.object({
  tauxCdfParUsd: z.number().positive('Le taux doit être un nombre positif.'),
});

router.get('/', ctrl.obtenir);
router.put('/', autoriserRoles('admin'), valider(schemaTaux), ctrl.definir);

export default router;
