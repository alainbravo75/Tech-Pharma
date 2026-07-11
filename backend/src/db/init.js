import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import db from './connection.js';

dotenv.config();

/**
 * Initialise une pharmacie par défaut et un compte administrateur
 * si aucune pharmacie n'existe encore. Idempotent : peut être relancé
 * sans dupliquer les données.
 */
function initialiser() {
  const pharmacieExistante = db.prepare('SELECT id FROM pharmacies LIMIT 1').get();

  if (pharmacieExistante) {
    console.log('✔ Base de données déjà initialisée. Rien à faire.');
    return;
  }

  const pharmacyId = uuidv4();
  const nomPharmacie = process.env.PHARMACY_NOM_DEFAUT || 'Pharmacie Principale';

  db.prepare(
    `INSERT INTO pharmacies (id, nom) VALUES (?, ?)`
  ).run(pharmacyId, nomPharmacie);

  const adminId = uuidv4();
  const nomAdmin = process.env.ADMIN_NOM_DEFAUT || 'Administrateur';
  const telephoneAdmin = process.env.ADMIN_TELEPHONE_DEFAUT || '+243900000000';
  const motDePasse = process.env.ADMIN_MOT_DE_PASSE_DEFAUT || 'ChangeMoi123!';
  const hash = bcrypt.hashSync(motDePasse, 12);

  db.prepare(
    `INSERT INTO utilisateurs (id, pharmacy_id, nom, telephone, mot_de_passe_hash, role)
     VALUES (?, ?, ?, ?, ?, 'admin')`
  ).run(adminId, pharmacyId, nomAdmin, telephoneAdmin, hash);

  // Taux de change par défaut (à ajuster depuis l'interface admin)
  db.prepare(
    `INSERT INTO taux_change (id, pharmacy_id, taux_cdf_par_usd) VALUES (?, ?, ?)`
  ).run(uuidv4(), pharmacyId, 2800);

  console.log('✔ Pharmacie créée :', nomPharmacie, `(${pharmacyId})`);
  console.log('✔ Compte administrateur créé :');
  console.log('   Téléphone :', telephoneAdmin);
  console.log('   Mot de passe :', motDePasse, '(⚠ à changer immédiatement après la première connexion)');
}

initialiser();
