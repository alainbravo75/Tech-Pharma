import { Router } from 'express';
import { z } from 'zod';
import { lister, creer, modifier, supprimer } from '../controllers/utilisateursController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';

const router = Router();

router.use(authentifier);

const ROLES = ['admin', 'pharmacien', 'caissier'];

const schemaCreation = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  telephone: z.string().min(9, 'Numéro de téléphone invalide.'),
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  role: z.enum(ROLES),
});

const schemaModification = z.object({
  nom: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  actif: z.union([z.boolean(), z.number()]).optional(),
  motDePasse: z.string().min(8).optional(),
});

// Seul un admin gère les comptes utilisateurs
router.get('/', autoriserRoles('admin'), lister);
router.post('/', autoriserRoles('admin'), valider(schemaCreation), creer);
router.put('/:id', autoriserRoles('admin'), valider(schemaModification), modifier);
router.delete('/:id', autoriserRoles('admin'), supprimer);

export default router;
