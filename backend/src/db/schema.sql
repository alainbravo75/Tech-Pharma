-- ============================================================
-- Schéma de base de données - Gestion de pharmacie (Kinshasa)
-- SQLite
-- ============================================================

PRAGMA foreign_keys = ON;

-- Pharmacies (prévu pour multi-succursales futures)
CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  nom TEXT NOT NULL,
  telephone TEXT UNIQUE NOT NULL,
  mot_de_passe_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','pharmacien','caissier')) NOT NULL,
  actif INTEGER DEFAULT 1,
  tentatives_echouees INTEGER DEFAULT 0,
  verrouille_jusqu_a TEXT,
  derniere_connexion TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Produits
CREATE TABLE IF NOT EXISTS produits (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  nom TEXT NOT NULL,
  forme TEXT,
  dosage TEXT,
  fabricant TEXT,
  code_barre TEXT,
  prix_achat_cdf REAL DEFAULT 0,
  prix_vente_cdf REAL DEFAULT 0,
  prix_vente_usd REAL DEFAULT 0,
  seuil_stock_faible INTEGER DEFAULT 10,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Lots (traçabilité péremption)
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  produit_id TEXT NOT NULL REFERENCES produits(id),
  numero_lot TEXT,
  quantite INTEGER NOT NULL DEFAULT 0,
  date_peremption TEXT NOT NULL,
  date_reception TEXT DEFAULT CURRENT_TIMESTAMP,
  fournisseur TEXT
);

-- Mouvements de stock (journal complet)
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  produit_id TEXT NOT NULL REFERENCES produits(id),
  lot_id TEXT REFERENCES lots(id),
  type TEXT CHECK(type IN ('entree','vente','perte','retour','ajustement')) NOT NULL,
  quantite INTEGER NOT NULL,
  utilisateur_id TEXT REFERENCES utilisateurs(id),
  reference_vente_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  nom TEXT NOT NULL,
  telephone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ventes (en-tête)
CREATE TABLE IF NOT EXISTS ventes (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  utilisateur_id TEXT NOT NULL REFERENCES utilisateurs(id),
  patient_id TEXT REFERENCES patients(id),
  devise TEXT CHECK(devise IN ('CDF','USD')) NOT NULL,
  taux_change_utilise REAL,
  total REAL NOT NULL,
  statut_sync TEXT CHECK(statut_sync IN ('local','synced','erreur')) DEFAULT 'synced',
  created_at TEXT NOT NULL,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Détail des ventes
CREATE TABLE IF NOT EXISTS ventes_lignes (
  id TEXT PRIMARY KEY,
  vente_id TEXT NOT NULL REFERENCES ventes(id),
  produit_id TEXT NOT NULL REFERENCES produits(id),
  lot_id TEXT REFERENCES lots(id),
  quantite INTEGER NOT NULL,
  prix_unitaire REAL NOT NULL
);

-- Ordonnances
CREATE TABLE IF NOT EXISTS ordonnances (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  medecin TEXT,
  vente_id TEXT REFERENCES ventes(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Taux de change (historisé)
CREATE TABLE IF NOT EXISTS taux_change (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  taux_cdf_par_usd REAL NOT NULL,
  actif_depuis TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Journal d'activité (audit)
CREATE TABLE IF NOT EXISTS journal_activite (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  utilisateur_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_produits_pharmacy ON produits(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_produits_code_barre ON produits(code_barre);
CREATE INDEX IF NOT EXISTS idx_lots_produit ON lots(produit_id);
CREATE INDEX IF NOT EXISTS idx_lots_peremption ON lots(date_peremption);
CREATE INDEX IF NOT EXISTS idx_ventes_pharmacy ON ventes(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_ventes_created ON ventes(created_at);
CREATE INDEX IF NOT EXISTS idx_mouvements_produit ON mouvements_stock(produit_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_telephone ON utilisateurs(telephone);
