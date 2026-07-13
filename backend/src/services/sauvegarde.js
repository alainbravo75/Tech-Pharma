import fs from 'fs';
import path from 'path';
import db from '../db/connection.js';

const DOSSIER_SAUVEGARDES = path.join(process.cwd(), 'data', 'sauvegardes');
const NOMBRE_MAX_SAUVEGARDES_CONSERVEES = 14; // ~2 semaines si une sauvegarde/jour

function assurerDossier() {
  if (!fs.existsSync(DOSSIER_SAUVEGARDES)) {
    fs.mkdirSync(DOSSIER_SAUVEGARDES, { recursive: true });
  }
}

function nomFichierHorodate() {
  const maintenant = new Date();
  const horodatage = maintenant.toISOString().replace(/[:.]/g, '-');
  return `pharmacie-${horodatage}.db`;
}

/**
 * Crée une sauvegarde cohérente de la base, même si des écritures sont en
 * cours (l'API backup() de better-sqlite3 gère ça correctement, contrairement
 * à une simple copie du fichier .db qui risquerait de capturer un état
 * incomplet en cas d'écriture concurrente).
 */
export async function creerSauvegarde() {
  assurerDossier();
  const nomFichier = nomFichierHorodate();
  const cheminDestination = path.join(DOSSIER_SAUVEGARDES, nomFichier);

  await db.backup(cheminDestination);

  nettoyerAnciennesSauvegardes();

  const stats = fs.statSync(cheminDestination);
  return { nomFichier, tailleOctets: stats.size, creeLe: stats.mtime.toISOString() };
}

/**
 * Ne garde que les N sauvegardes les plus récentes, pour éviter de remplir
 * le disque d'un vieux PC au fil du temps (une par jour suffit largement
 * pour 3 utilisateurs / une pharmacie).
 */
function nettoyerAnciennesSauvegardes() {
  const fichiers = listerFichiersSauvegarde();
  if (fichiers.length <= NOMBRE_MAX_SAUVEGARDES_CONSERVEES) return;

  const aSupprimer = fichiers
    .sort((a, b) => new Date(a.creeLe) - new Date(b.creeLe))
    .slice(0, fichiers.length - NOMBRE_MAX_SAUVEGARDES_CONSERVEES);

  for (const f of aSupprimer) {
    fs.unlinkSync(path.join(DOSSIER_SAUVEGARDES, f.nomFichier));
  }
}

function listerFichiersSauvegarde() {
  assurerDossier();
  return fs
    .readdirSync(DOSSIER_SAUVEGARDES)
    .filter((f) => f.endsWith('.db'))
    .map((nomFichier) => {
      const stats = fs.statSync(path.join(DOSSIER_SAUVEGARDES, nomFichier));
      return { nomFichier, tailleOctets: stats.size, creeLe: stats.mtime.toISOString() };
    });
}

export function listerSauvegardes() {
  return listerFichiersSauvegarde().sort((a, b) => new Date(b.creeLe) - new Date(a.creeLe));
}

/**
 * Résout le chemin d'un fichier de sauvegarde à télécharger, en validant
 * strictement le nom (pas de traversée de répertoire type "../../etc/passwd").
 */
export function cheminSauvegardeValide(nomFichier) {
  if (!/^pharmacie-[\w-]+\.db$/.test(nomFichier)) {
    return null;
  }
  const chemin = path.join(DOSSIER_SAUVEGARDES, nomFichier);
  if (!fs.existsSync(chemin)) return null;
  return chemin;
}
