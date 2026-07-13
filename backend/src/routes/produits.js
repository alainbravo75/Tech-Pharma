import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/produitsController.js';
import { authentifier, autoriserRoles } from '../middlewares/auth.js';
import { valider } from '../middlewares/valider.js';

const router = Router();
router.use(authentifier);

const champsProduit = z.object({
  nom: z.string().min(2, 'Le nom est requis.'),
  forme: z.string().optional(),
  dosage: z.string().optional(),
  fabricant: z.string().optional(),
  codeBarre: z.string().optional(),
  prixAchatCdf: z.number().nonnegative().optional(),
  prixVenteCdf: z.number().nonnegative().optional(),
  prixVenteUsd: z.number().nonnegative().optional(),
  seuilStockFaible: z.number().int().nonnegative().optional(),
  // Stock initial optionnel : évite d'avoir à repasser par "+ Stock" juste
  // après la création d'un nouveau produit.
  quantiteInitiale: z.number().int().nonnegative().optional(),
  datePeremptionInitiale: z.string().optional(),
  numeroLotInitial: z.string().optional(),
  fournisseurInitial: z.string().optional(),
});

const schemaCreationProduit = champsProduit.refine(
  (data) => !data.quantiteInitiale || data.datePeremptionInitiale,
  { message: 'La date de péremption est requise si une quantité initiale est indiquée.', path: ['datePeremptionInitiale'] }
);

const schemaModificationProduit = champsProduit.partial();


const schemaEntreeStock = z.object({
  quantite: z.number().int().positive('La quantité doit être positive.'),
  datePeremption: z.string().min(1, 'La date de péremption est requise.'),
  numeroLot: z.string().optional(),
  fournisseur: z.string().optional(),
});

const schemaAjustement = z.object({
  lotId: z.string().min(1),
  quantite: z.number().int().refine((v) => v !== 0, 'La quantité ne peut pas être nulle.'),
  type: z.enum(['perte', 'retour', 'ajustement']),
});

// Lecture : tous les rôles connectés
router.get('/', ctrl.lister);
router.get('/alertes', ctrl.alertes);
router.get('/:id', ctrl.obtenir);

// Écriture : admin et pharmacien (le caissier ne gère pas le stock)
router.post('/', autoriserRoles('admin', 'pharmacien'), valider(schemaCreationProduit), ctrl.creer);
router.put('/:id', autoriserRoles('admin', 'pharmacien'), valider(schemaModificationProduit), ctrl.modifier);
router.delete('/:id', autoriserRoles('admin'), ctrl.supprimer);

router.post('/:id/entrees', autoriserRoles('admin', 'pharmacien'), valider(schemaEntreeStock), ctrl.ajouterEntree);
router.post('/:id/ajustements', autoriserRoles('admin', 'pharmacien'), valider(schemaAjustement), ctrl.ajouterAjustement);

export default router;
