import db from '../db/connection.js';

/**
 * Calcule les bornes [début, fin] d'une période, ancrée sur une date de
 * référence (par défaut aujourd'hui). La semaine commence le lundi
 * (convention courante en RDC/francophonie).
 */
export function limitesPeriode(periode, dateRef) {
  const base = dateRef ? new Date(dateRef) : new Date();
  base.setHours(0, 0, 0, 0);

  let debut, fin;

  if (periode === 'jour') {
    debut = new Date(base);
    fin = new Date(base);
    fin.setHours(23, 59, 59, 999);
  } else if (periode === 'semaine') {
    const jourSemaine = base.getDay(); // 0 = dimanche
    const decalageLundi = jourSemaine === 0 ? 6 : jourSemaine - 1;
    debut = new Date(base);
    debut.setDate(base.getDate() - decalageLundi);
    fin = new Date(debut);
    fin.setDate(debut.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
  } else {
    // mois
    debut = new Date(base.getFullYear(), base.getMonth(), 1);
    fin = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    fin.setHours(23, 59, 59, 999);
  }

  return { debut: debut.toISOString(), fin: fin.toISOString() };
}

export function genererRapport({ pharmacyId, periode, date }) {
  const { debut, fin } = limitesPeriode(periode, date);

  // Chiffre d'affaires + nombre de ventes, par devise
  const parDevise = db
    .prepare(
      `SELECT devise, COUNT(*) AS nombre_ventes, COALESCE(SUM(total), 0) AS chiffre_affaires
       FROM ventes
       WHERE pharmacy_id = ? AND created_at BETWEEN ? AND ?
       GROUP BY devise`
    )
    .all(pharmacyId, debut, fin);

  const chiffreAffaires = { CDF: 0, USD: 0 };
  let nombreVentes = 0;
  for (const ligne of parDevise) {
    chiffreAffaires[ligne.devise] = ligne.chiffre_affaires;
    nombreVentes += ligne.nombre_ventes;
  }

  // Produits les plus vendus sur la période
  const produitsPlusVendus = db
    .prepare(
      `SELECT p.id, p.nom,
         SUM(vl.quantite) AS quantite_vendue,
         SUM(CASE WHEN v.devise = 'CDF' THEN vl.quantite * vl.prix_unitaire ELSE 0 END) AS montant_cdf,
         SUM(CASE WHEN v.devise = 'USD' THEN vl.quantite * vl.prix_unitaire ELSE 0 END) AS montant_usd
       FROM ventes_lignes vl
       JOIN ventes v ON v.id = vl.vente_id
       JOIN produits p ON p.id = vl.produit_id
       WHERE v.pharmacy_id = ? AND v.created_at BETWEEN ? AND ?
       GROUP BY p.id
       ORDER BY quantite_vendue DESC
       LIMIT 10`
    )
    .all(pharmacyId, debut, fin);

  // Valeur du stock actuel (à date de génération, pas seulement sur la période)
  const valeurStock = db
    .prepare(
      `SELECT
         COALESCE(SUM(l.quantite * p.prix_achat_cdf), 0) AS valeur_achat_cdf,
         COALESCE(SUM(l.quantite * p.prix_vente_cdf), 0) AS valeur_vente_cdf
       FROM lots l
       JOIN produits p ON p.id = l.produit_id
       WHERE p.pharmacy_id = ? AND p.actif = 1 AND l.quantite > 0`
    )
    .get(pharmacyId);

  // Pertes (casse, péremption) sur la période
  const pertes = db
    .prepare(
      `SELECT
         COALESCE(SUM(-m.quantite), 0) AS quantite_perdue,
         COALESCE(SUM(-m.quantite * p.prix_achat_cdf), 0) AS valeur_perte_cdf
       FROM mouvements_stock m
       JOIN produits p ON p.id = m.produit_id
       WHERE m.pharmacy_id = ? AND m.type = 'perte' AND m.created_at BETWEEN ? AND ?`
    )
    .get(pharmacyId, debut, fin);

  return {
    periode,
    debut,
    fin,
    chiffreAffaires,
    nombreVentes,
    produitsPlusVendus,
    valeurStock,
    pertes,
  };
}
