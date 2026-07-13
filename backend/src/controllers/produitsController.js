import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { journaliser } from '../services/journal.js';
import { quantiteTotaleProduit, enregistrerEntreeStock, enregistrerAjustement, obtenirAlertes } from '../services/stock.js';

export function lister(req, res) {
  const { recherche } = req.query;
  const pharmacyId = req.utilisateur.pharmacy_id;

  let produits;
  if (recherche) {
    const motif = `%${recherche}%`;
    produits = db
      .prepare(
        `SELECT * FROM produits WHERE pharmacy_id = ? AND actif = 1
         AND (nom LIKE ? OR code_barre LIKE ? OR fabricant LIKE ?)
         ORDER BY nom ASC`
      )
      .all(pharmacyId, motif, motif, motif);
  } else {
    produits = db
      .prepare('SELECT * FROM produits WHERE pharmacy_id = ? AND actif = 1 ORDER BY nom ASC')
      .all(pharmacyId);
  }

  const avecQuantite = produits.map((p) => ({
    ...p,
    quantite_totale: quantiteTotaleProduit(p.id),
  }));

  res.json({ produits: avecQuantite });
}

export function obtenir(req, res) {
  const produit = db
    .prepare('SELECT * FROM produits WHERE id = ? AND pharmacy_id = ?')
    .get(req.params.id, req.utilisateur.pharmacy_id);

  if (!produit) return res.status(404).json({ erreur: 'Produit introuvable.' });

  const lots = db
    .prepare('SELECT * FROM lots WHERE produit_id = ? ORDER BY date_peremption ASC')
    .all(produit.id);

  res.json({
    produit: { ...produit, quantite_totale: quantiteTotaleProduit(produit.id) },
    lots,
  });
}

export function creer(req, res) {
  const {
    nom, forme, dosage, fabricant, codeBarre, prixAchatCdf, prixVenteCdf, prixVenteUsd, seuilStockFaible,
    quantiteInitiale, datePeremptionInitiale, numeroLotInitial, fournisseurInitial,
  } = req.body;

  const id = uuidv4();
  db.prepare(
    `INSERT INTO produits
      (id, pharmacy_id, nom, forme, dosage, fabricant, code_barre, prix_achat_cdf, prix_vente_cdf, prix_vente_usd, seuil_stock_faible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.utilisateur.pharmacy_id,
    nom,
    forme || null,
    dosage || null,
    fabricant || null,
    codeBarre || null,
    prixAchatCdf ?? 0,
    prixVenteCdf ?? 0,
    prixVenteUsd ?? 0,
    seuilStockFaible ?? 10
  );

  const stockInitialFourni = quantiteInitiale && quantiteInitiale > 0;

  // Si un stock initial est fourni, on ne garde qu'une seule ligne dans le
  // journal ("Entrée de stock", qui montre déjà le produit et la quantité)
  // plutôt que deux lignes redondantes ("Création produit" + "Entrée de
  // stock" côte à côte, qui répètent la même information).
  if (!stockInitialFourni) {
    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'creation_produit',
      details: { produit: nom },
    });
  }

  if (stockInitialFourni) {
    enregistrerEntreeStock({
      pharmacyId: req.utilisateur.pharmacy_id,
      produitId: id,
      quantite: quantiteInitiale,
      datePeremption: datePeremptionInitiale,
      numeroLot: numeroLotInitial,
      fournisseur: fournisseurInitial,
      utilisateurId: req.utilisateur.id,
    });

    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'entree_stock',
      details: { produit: nom, numeroLot: numeroLotInitial || null, quantite: quantiteInitiale },
    });
  }

  res.status(201).json({ produit: { id, nom } });
}

export function modifier(req, res) {
  const { id } = req.params;
  const produit = db
    .prepare('SELECT * FROM produits WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!produit) return res.status(404).json({ erreur: 'Produit introuvable.' });

  const champsPrix = ['prixAchatCdf', 'prixVenteCdf', 'prixVenteUsd'];
  const modifiePrix = champsPrix.some((c) => req.body[c] !== undefined);

  // Seul l'admin peut modifier les prix (exigence de sécurité du cahier des charges)
  if (modifiePrix && req.utilisateur.role !== 'admin') {
    return res.status(403).json({ erreur: 'Seul un administrateur peut modifier les prix.' });
  }

  const correspondance = {
    nom: 'nom', forme: 'forme', dosage: 'dosage', fabricant: 'fabricant', codeBarre: 'code_barre',
    prixAchatCdf: 'prix_achat_cdf', prixVenteCdf: 'prix_vente_cdf', prixVenteUsd: 'prix_vente_usd',
    seuilStockFaible: 'seuil_stock_faible',
  };

  const updates = [];
  const valeurs = [];
  for (const [cle, colonne] of Object.entries(correspondance)) {
    if (req.body[cle] !== undefined) {
      updates.push(`${colonne} = ?`);
      valeurs.push(req.body[cle]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ erreur: 'Aucune donnée à mettre à jour.' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  valeurs.push(id);
  db.prepare(`UPDATE produits SET ${updates.join(', ')} WHERE id = ?`).run(...valeurs);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: modifiePrix ? 'modification_prix_produit' : 'modification_produit',
    details: { produit: produit.nom, champs: Object.keys(req.body) },
  });

  res.json({ message: 'Produit mis à jour.' });
}

export function supprimer(req, res) {
  const { id } = req.params;
  const produit = db
    .prepare('SELECT id, nom FROM produits WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!produit) return res.status(404).json({ erreur: 'Produit introuvable.' });

  // Désactivation (soft delete) : préserve l'historique des ventes/mouvements liés
  db.prepare('UPDATE produits SET actif = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'suppression_produit',
    details: { produit_id: id, nom: produit.nom },
  });

  res.json({ message: 'Produit supprimé.' });
}

export function ajouterEntree(req, res) {
  const { id } = req.params;
  const { quantite, datePeremption, numeroLot, fournisseur } = req.body;

  const produit = db
    .prepare('SELECT id FROM produits WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!produit) return res.status(404).json({ erreur: 'Produit introuvable.' });

  const lotId = enregistrerEntreeStock({
    pharmacyId: req.utilisateur.pharmacy_id,
    produitId: id,
    quantite,
    datePeremption,
    numeroLot,
    fournisseur,
    utilisateurId: req.utilisateur.id,
  });

  const produitInfo = db.prepare('SELECT nom FROM produits WHERE id = ?').get(id);

  journaliser({
    pharmacyId: req.utilisateur.pharmacy_id,
    utilisateurId: req.utilisateur.id,
    action: 'entree_stock',
    details: { produit: produitInfo?.nom, numeroLot: numeroLot || null, quantite },
  });

  res.status(201).json({ lot_id: lotId });
}

export function ajouterAjustement(req, res) {
  const { id } = req.params;
  const { lotId, quantite, type } = req.body;

  const produit = db
    .prepare('SELECT id FROM produits WHERE id = ? AND pharmacy_id = ?')
    .get(id, req.utilisateur.pharmacy_id);

  if (!produit) return res.status(404).json({ erreur: 'Produit introuvable.' });

  try {
    const nouvelleQuantite = enregistrerAjustement({
      pharmacyId: req.utilisateur.pharmacy_id,
      produitId: id,
      lotId,
      quantite,
      type,
      utilisateurId: req.utilisateur.id,
    });

    const produitInfo = db.prepare('SELECT nom FROM produits WHERE id = ?').get(id);

    journaliser({
      pharmacyId: req.utilisateur.pharmacy_id,
      utilisateurId: req.utilisateur.id,
      action: 'ajustement_stock',
      details: { produit: produitInfo?.nom, quantite, type },
    });

    res.json({ nouvelle_quantite: nouvelleQuantite });
  } catch (err) {
    res.status(400).json({ erreur: err.message });
  }
}

export function alertes(req, res) {
  res.json(obtenirAlertes(req.utilisateur.pharmacy_id));
}
