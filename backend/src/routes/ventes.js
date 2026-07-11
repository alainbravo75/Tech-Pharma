import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/ventesController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';

const router = Router();
router.use(authentifier);

const schemaLigne = z.object({
  produitId: z.string().min(1),
  quantite: z.number().int().positive(),
  prixUnitaire: z.number().nonnegative(),
});

const schemaVente = z.object({
  // id généré côté client (UUID) : indispensable pour créer des ventes
  // hors ligne sans collision, et pour l'idempotence à la synchronisation.
  id: z.string().min(1, "L'identifiant de la vente est requis."),
  patientId: z.string().optional(),
  devise: z.enum(['CDF', 'USD']),
  tauxChangeUtilise: z.number().positive(),
  total: z.number().nonnegative(),
  createdAt: z.string().min(1, "L'horodatage de la vente est requis."),
  lignes: z.array(schemaLigne).min(1, 'Une vente doit contenir au moins un article.'),
});

const schemaSms = z.object({
  telephone: z.string().min(9, 'Numéro de téléphone invalide.'),
});

// Tous les rôles connectés peuvent créer une vente (y compris caissier)
router.post('/', valider(schemaVente), ctrl.creer);

// La liste détaillée des ventes est réservée à l'admin/pharmacien (le
// caissier voit uniquement son propre récapitulatif du jour, géré côté
// frontend via le cache local — pas besoin d'exposer tout l'historique).
router.get('/', autoriserRoles('admin', 'pharmacien'), ctrl.lister);

router.get('/sms/statut', ctrl.statutSms);
router.post('/:id/sms', valider(schemaSms), ctrl.envoyerRecuSms);

export default router;
