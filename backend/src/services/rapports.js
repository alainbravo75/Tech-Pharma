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

  // Taux de change actuel, utilisé pour les conversions d'affichage
  // (le calcul du bénéfice, lui, utilise le taux historique de chaque
  // vente - voir plus bas - pour rester exact même si le taux a bougé).
  const tauxActuel = db
    .prepare('SELECT taux_cdf_par_usd FROM taux_change WHERE pharmacy_id = ? ORDER BY actif_depuis DESC LIMIT 1')
    .get(pharmacyId)?.taux_cdf_par_usd || 1;

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

  // Chiffre d'affaires consolidé : chaque vente est convertie avec le taux
  // qui était en vigueur au moment où elle a été faite (taux_change_utilise),
  // pas le taux actuel - plus juste historiquement.
  const ventesPeriode = db
    .prepare(
      `SELECT devise, total, taux_change_utilise
       FROM ventes WHERE pharmacy_id = ? AND created_at BETWEEN ? AND ?`
    )
    .all(pharmacyId, debut, fin);

  let chiffreAffairesTotalCdf = 0;
  let chiffreAffairesTotalUsd = 0;
  for (const v of ventesPeriode) {
    const taux = v.taux_change_utilise || tauxActuel;
    if (v.devise === 'CDF') {
      chiffreAffairesTotalCdf += v.total;
      chiffreAffairesTotalUsd += v.total / taux;
    } else {
      chiffreAffairesTotalUsd += v.total;
      chiffreAffairesTotalCdf += v.total * taux;
    }
  }

  // Bénéfice estimé : recette - coût d'achat, ligne par ligne, converti
  // en CDF avec le taux de la vente concernée. Cette même requête sert
  // aussi de base au classement "produits les plus rentables" plus bas.
  const lignesPeriodeAvecProduit = db
    .prepare(
      `SELECT vl.quantite, vl.prix_unitaire, v.devise, v.taux_change_utilise,
              p.id AS produit_id, p.nom, p.prix_achat_cdf
       FROM ventes_lignes vl
       JOIN ventes v ON v.id = vl.vente_id
       JOIN produits p ON p.id = vl.produit_id
       WHERE v.pharmacy_id = ? AND v.created_at BETWEEN ? AND ?`
    )
    .all(pharmacyId, debut, fin);

  let beneficeCdf = 0;
  for (const l of lignesPeriodeAvecProduit) {
    const taux = l.taux_change_utilise || tauxActuel;
    const revenuCdf = l.devise === 'CDF' ? l.quantite * l.prix_unitaire : l.quantite * l.prix_unitaire * taux;
    const coutCdf = l.quantite * (l.prix_achat_cdf || 0);
    beneficeCdf += revenuCdf - coutCdf;
  }
  const beneficeUsd = beneficeCdf / tauxActuel;

  // Produits les plus vendus (par quantité) sur la période
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

  // Ventes par utilisateur (qui a vendu quoi) - utile pour la
  // responsabilisation et le suivi de performance par caissier.
  const ventesParUtilisateur = db
    .prepare(
      `SELECT u.id, u.nom,
         COUNT(*) AS nombre_ventes,
         COALESCE(SUM(CASE WHEN v.devise = 'CDF' THEN v.total ELSE v.total * v.taux_change_utilise END), 0) AS chiffre_affaires_cdf
       FROM ventes v
       LEFT JOIN utilisateurs u ON u.id = v.utilisateur_id
       WHERE v.pharmacy_id = ? AND v.created_at BETWEEN ? AND ?
       GROUP BY v.utilisateur_id
       ORDER BY chiffre_affaires_cdf DESC`
    )
    .all(pharmacyId, debut, fin);

  // Produits les plus rentables (par bénéfice total, pas par volume) :
  // un produit peu vendu mais à forte marge peut valoir plus qu'un
  // produit très vendu mais à marge faible - c'est l'intérêt de ce
  // classement distinct de "produits les plus vendus" ci-dessus.
  const rentabiliteParProduit = new Map();
  for (const l of lignesPeriodeAvecProduit) {
    const taux = l.taux_change_utilise || tauxActuel;
    const revenuCdf = l.devise === 'CDF' ? l.quantite * l.prix_unitaire : l.quantite * l.prix_unitaire * taux;
    const coutCdf = l.quantite * (l.prix_achat_cdf || 0);
    const profitCdf = revenuCdf - coutCdf;

    const existant = rentabiliteParProduit.get(l.produit_id) || {
      id: l.produit_id,
      nom: l.nom,
      quantite_vendue: 0,
      revenu_cdf: 0,
      benefice_cdf: 0,
    };
    existant.quantite_vendue += l.quantite;
    existant.revenu_cdf += revenuCdf;
    existant.benefice_cdf += profitCdf;
    rentabiliteParProduit.set(l.produit_id, existant);
  }

  const produitsPlusRentables = Array.from(rentabiliteParProduit.values())
    .map((p) => ({
      ...p,
      marge_pourcent: p.revenu_cdf > 0 ? (p.benefice_cdf / p.revenu_cdf) * 100 : 0,
    }))
    .sort((a, b) => b.benefice_cdf - a.benefice_cdf)
    .slice(0, 10);

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
    tauxActuel,
    chiffreAffaires,
    chiffreAffairesTotalCdf,
    chiffreAffairesTotalUsd,
    beneficeCdf,
    beneficeUsd,
    nombreVentes,
    produitsPlusVendus,
    produitsPlusRentables,
    ventesParUtilisateur,
    valeurStock,
    pertes,
  };
}
