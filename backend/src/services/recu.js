import db from '../db/connection.js';

/**
 * Construit le texte du reçu à partir d'une vente déjà enregistrée. Utilisé
 * à la fois pour l'envoi SMS (backend) et peut être régénéré à l'identique
 * côté frontend pour le lien WhatsApp (voir recu.js dans le frontend).
 */
export function genererTexteRecu({ pharmacyId, venteId }) {
  const pharmacie = db.prepare('SELECT nom FROM pharmacies WHERE id = ?').get(pharmacyId);
  const vente = db.prepare('SELECT * FROM ventes WHERE id = ? AND pharmacy_id = ?').get(venteId, pharmacyId);

  if (!vente) return null;

  const lignes = db
    .prepare(
      `SELECT vl.quantite, vl.prix_unitaire, p.nom
       FROM ventes_lignes vl
       JOIN produits p ON p.id = vl.produit_id
       WHERE vl.vente_id = ?`
    )
    .all(venteId);

  const dateVente = new Date(vente.created_at).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const lignesTexte = lignes
    .map((l) => `${l.quantite} x ${l.nom} - ${formaterMontant(l.prix_unitaire * l.quantite)} ${vente.devise}`)
    .join('\n');

  return [
    `${pharmacie?.nom || 'Pharmacie'}`,
    `Reçu du ${dateVente}`,
    '',
    lignesTexte,
    '',
    `Total : ${formaterMontant(vente.total)} ${vente.devise}`,
    '',
    'Merci de votre confiance.',
  ].join('\n');
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant);
}
