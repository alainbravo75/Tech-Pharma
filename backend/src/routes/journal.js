import { Router } from 'express';
import * as ctrl from '../controllers/journalController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';

const router = Router();
router.use(authentifier);

// Réservé à l'admin : c'est un outil de contrôle interne, pas une donnée
// opérationnelle dont le pharmacien/caissier aurait besoin au quotidien.
router.get('/', autoriserRoles('admin'), ctrl.lister);

export default router;
