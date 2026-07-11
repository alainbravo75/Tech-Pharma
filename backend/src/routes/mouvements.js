import { Router } from 'express';
import * as ctrl from '../controllers/mouvementsController.js';
import { authentifier } from '../middlewares/auth.js';

const router = Router();
router.use(authentifier);

router.get('/', ctrl.lister);

export default router;
