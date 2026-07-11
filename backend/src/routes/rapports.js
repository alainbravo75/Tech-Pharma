import { Router } from 'express';
import * as ctrl from '../controllers/rapportsController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';

const router = Router();
router.use(authentifier);

// Données financières réservées à l'admin et au pharmacien (pas au caissier)
router.use(autoriserRoles('admin', 'pharmacien'));

router.get('/', ctrl.obtenir);
router.get('/pdf', ctrl.telechargerPdf);

export default router;
