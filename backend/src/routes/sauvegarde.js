import { Router } from 'express';
import * as ctrl from '../controllers/sauvegardeController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';

const router = Router();
router.use(authentifier);
router.use(autoriserRoles('admin')); // données sensibles : toute la base de la pharmacie

router.get('/', ctrl.lister);
router.post('/', ctrl.creer);
router.get('/email/statut', ctrl.statutEmail);
router.get('/:nomFichier/telecharger', ctrl.telecharger);
router.post('/:nomFichier/email', ctrl.envoyerEmail);

export default router;
